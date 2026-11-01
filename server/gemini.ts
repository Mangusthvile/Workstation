/**
 * Talking to Gemini: model fallback, quota tracking, and readable errors.
 *
 * Each Gemini model has its own free-tier allowance per project (requests per
 * minute and per day; the daily one resets at midnight Pacific time). When one
 * model's allowance runs out, Workstation moves on to the next model instead of
 * failing, and remembers which models are used up so it does not waste requests
 * on them. If every model is out, the error says exactly that and when it resets.
 */
import type { GoogleGenAI } from '@google/genai';

/** Free-tier text models, tried in this order. Override with GEMINI_MODELS (comma-separated). */
export const DEFAULT_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-3.8-flash'];

/** Wait and retry the same model only when Google asks for a short pause. */
const MAX_INLINE_WAIT_S = 12;
const OVERLOAD_RETRY_MS = 1500;
const DEFAULT_MINUTE_WAIT_S = 60;
const MISSING_MODEL_BLOCK_MS = 24 * 3600_000;
/** Wait a little past the reset before trying a used-up model again. */
const RESET_MARGIN_MS = 60_000;

export type FailureKind = 'quota-day' | 'quota-minute' | 'overloaded' | 'model-missing' | 'key' | 'fatal' | 'empty' | 'other';

export interface GeminiFailure {
  kind: FailureKind;
  status?: number;
  /** Google's own message, for the log and for errors we do not explain ourselves. */
  googleMessage: string;
  retryAfterS?: number;
  quotaLimit?: string;
}

const asRecord = (v: unknown): Record<string, unknown> | undefined =>
  typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : undefined;

/** Reads the google.rpc error the SDK wraps in its message and classifies it. */
export function classifyGeminiError(err: unknown): GeminiFailure {
  const raw = (err as Error)?.message ?? String(err ?? '');
  let body: Record<string, unknown> | undefined;
  try {
    body = asRecord(asRecord(JSON.parse(raw.slice(raw.indexOf('{'))))?.error);
  } catch {
    /* not JSON */
  }

  const status = Number((err as { status?: unknown })?.status ?? body?.code) || undefined;
  const statusText = String(body?.status ?? '');
  const googleMessage = String(body?.message ?? raw).trim() || 'Unknown error';
  const text = `${statusText} ${googleMessage}`;

  let retryAfterS: number | undefined;
  const quotaIds: string[] = [];
  let quotaLimit: string | undefined;
  for (const detail of Array.isArray(body?.details) ? body.details : []) {
    const d = asRecord(detail);
    const type = String(d?.['@type'] ?? '');
    if (type.endsWith('RetryInfo')) {
      const seconds = parseFloat(String(d?.retryDelay ?? ''));
      if (Number.isFinite(seconds)) retryAfterS = Math.ceil(seconds);
    }
    if (type.endsWith('QuotaFailure') && Array.isArray(d?.violations)) {
      for (const v of d.violations) {
        const vr = asRecord(v);
        quotaIds.push(String(vr?.quotaId ?? vr?.quotaMetric ?? ''));
        if (vr?.quotaValue !== undefined) quotaLimit = String(vr.quotaValue);
      }
    }
  }
  if (retryAfterS === undefined) {
    const m = googleMessage.match(/retry in ([\d.]+)\s*s/i);
    if (m) retryAfterS = Math.ceil(parseFloat(m[1]));
  }

  const base = { status, googleMessage, retryAfterS, quotaLimit };

  if (status === 429 || /RESOURCE_EXHAUSTED/i.test(text)) {
    const ids = quotaIds.join(' ');
    // "limit: 0" means this model has no free allowance for the project at all.
    const noAllowance = quotaLimit === '0' || /limit:\s*0\b/.test(googleMessage);
    const perDay = /PerDay/i.test(ids) || /per day|daily/i.test(googleMessage);
    const perMinute = /PerMinute/i.test(ids) || /per minute/i.test(googleMessage);
    if (noAllowance || (perDay && !perMinute)) return { kind: 'quota-day', ...base };
    return { kind: 'quota-minute', ...base };
  }
  if (status === 401 || status === 403 || /API_KEY_INVALID|API key not valid|PERMISSION_DENIED|API key expired/i.test(text)) {
    return { kind: 'key', ...base };
  }
  if (status === 404 || /NOT_FOUND|is not found|not supported for generateContent/i.test(text)) {
    return { kind: 'model-missing', ...base };
  }
  if ((status !== undefined && status >= 500) || /UNAVAILABLE|overloaded|DEADLINE_EXCEEDED|INTERNAL/i.test(text)) {
    return { kind: 'overloaded', ...base };
  }
  if (/FAILED_PRECONDITION|location is not supported|billing/i.test(text)) return { kind: 'fatal', ...base };
  return { kind: 'other', ...base };
}

/** Milliseconds timestamp of the next midnight in Pacific time (when daily quotas reset). */
export function nextPacificMidnight(now = Date.now()): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      hourCycle: 'h23',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(new Date(now));
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
    const intoDay = get('hour') * 3600 + get('minute') * 60 + get('second');
    return now - (now % 1000) + (86400 - intoDay) * 1000;
  } catch {
    return now + 3600_000;
  }
}

/** Error thrown to the API route: a message for the person, plus HTTP status and reset time. */
export class GeminiUnavailableError extends Error {
  constructor(
    message: string,
    readonly httpStatus: number,
    readonly resetAt?: number
  ) {
    super(message);
  }
}

type Sleep = (ms: number, signal: AbortSignal) => Promise<void>;
const defaultSleep: Sleep = (ms, signal) =>
  new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      resolve();
    });
  });

export interface RouterOptions {
  now?: () => number;
  sleep?: Sleep;
  log?: (line: string) => void;
}

/**
 * Remembers, per API key, which models are temporarily used up.
 * One instance lives as long as the server and is reset when the key changes.
 */
export class GeminiRouter {
  private blockedUntil = new Map<string, { until: number; kind: FailureKind; resetAt?: number }>();
  private now: () => number;
  private sleep: Sleep;
  private log: (line: string) => void;

  constructor(options: RouterOptions = {}) {
    this.now = options.now ?? Date.now;
    this.sleep = options.sleep ?? defaultSleep;
    this.log = options.log ?? ((line) => console.warn(line));
  }

  reset() {
    this.blockedUntil.clear();
  }

  private block(model: string, until: number, kind: FailureKind, resetAt?: number) {
    this.blockedUntil.set(model, { until, kind, resetAt });
  }

  async generate(
    ai: Pick<GoogleGenAI, 'models'>,
    models: string[],
    prompt: string,
    systemInstruction: string,
    signal: AbortSignal
  ): Promise<{ text: string; model: string }> {
    const failures: { model: string; failure: GeminiFailure }[] = [];

    for (const model of models) {
      const blocked = this.blockedUntil.get(model);
      if (blocked && blocked.until > this.now()) continue; // known to be used up; do not spend a request
      this.blockedUntil.delete(model);

      for (let attempt = 1; attempt <= 2; attempt++) {
        if (signal.aborted) throw new Error('Request cancelled');
        try {
          const response = await ai.models.generateContent({
            model,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { systemInstruction, temperature: 0.3, abortSignal: signal },
          });
          const text = response.text;
          if (text) return { text, model };
          failures.push({ model, failure: { kind: 'empty', googleMessage: 'Gemini returned an empty response.' } });
          break;
        } catch (err) {
          if (signal.aborted) throw err;
          const failure = classifyGeminiError(err);
          failures.push({ model, failure });
          this.log(`Gemini ${model}: ${failure.kind} (${failure.status ?? '-'}) ${failure.googleMessage.split('\n')[0].slice(0, 300)}`);

          if (failure.kind === 'key' || failure.kind === 'fatal') throw this.explain(failures, models);

          if (failure.kind === 'quota-day') {
            const resetAt = nextPacificMidnight(this.now());
            this.block(model, resetAt + RESET_MARGIN_MS, 'quota-day', resetAt);
            break;
          }
          if (failure.kind === 'quota-minute') {
            const waitS = failure.retryAfterS ?? DEFAULT_MINUTE_WAIT_S;
            this.block(model, this.now() + waitS * 1000, 'quota-minute');
            if (attempt === 1 && waitS <= MAX_INLINE_WAIT_S) {
              await this.sleep(waitS * 1000, signal);
              this.blockedUntil.delete(model);
              continue;
            }
            break;
          }
          if (failure.kind === 'model-missing') {
            this.block(model, this.now() + MISSING_MODEL_BLOCK_MS, 'model-missing');
            break;
          }
          if (failure.kind === 'overloaded' && attempt === 1) {
            await this.sleep(OVERLOAD_RETRY_MS, signal);
            continue;
          }
          break;
        }
      }
    }

    throw this.explain(failures, models);
  }

  /** Turns what happened into one clear message. */
  private explain(failures: { model: string; failure: GeminiFailure }[], models: string[]): GeminiUnavailableError {
    const last = failures[failures.length - 1]?.failure;

    if (last?.kind === 'key') {
      return new GeminiUnavailableError(
        `Google rejected the Gemini API key (${last.googleMessage.split('\n')[0]}). Check the key, or create a new one at aistudio.google.com/app/apikey.`,
        401
      );
    }
    if (last?.kind === 'fatal') return new GeminiUnavailableError(`Gemini: ${last.googleMessage}`, 502);

    const now = this.now();
    const states = models
      .map((m) => this.blockedUntil.get(m))
      .filter((b): b is { until: number; kind: FailureKind; resetAt?: number } => !!b && b.until > now);
    const dailyOut = states.filter((s) => s.kind === 'quota-day' || s.kind === 'model-missing').length;
    const minuteBlocks = states.filter((s) => s.kind === 'quota-minute');

    if (states.length === models.length && dailyOut === models.length) {
      const resetAt = Math.min(...states.map((s) => s.resetAt ?? Infinity));
      return new GeminiUnavailableError(
        `Today's free Gemini allowance is used up on all ${models.length} AI models Workstation can use. ` +
          'It resets at midnight Pacific time. To keep editing before then, turn on billing for your API key\'s project in Google AI Studio (aistudio.google.com).',
        429,
        Number.isFinite(resetAt) ? resetAt : undefined
      );
    }
    if (minuteBlocks.length > 0 && states.length === models.length) {
      const soonest = Math.min(...minuteBlocks.map((s) => s.until));
      const seconds = Math.max(5, Math.ceil((soonest - now) / 1000));
      return new GeminiUnavailableError(
        `Gemini's per-minute limit was reached. Wait about ${seconds} seconds, then run the edit again.`,
        429,
        soonest
      );
    }
    if (last?.kind === 'overloaded') {
      return new GeminiUnavailableError("Google's AI service is overloaded right now. Wait a minute and try again.", 503);
    }
    if (last) return new GeminiUnavailableError(`Gemini: ${last.googleMessage}`, 502);
    return new GeminiUnavailableError('No Gemini model is available right now. Try again in a minute.', 503);
  }
}

/** Parses a GEMINI_MODELS setting ("a, b, c"), falling back to the defaults. */
export function parseModelList(setting: string | undefined): string[] {
  const list = (setting ?? '')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);
  return list.length > 0 ? list : DEFAULT_MODELS;
}
