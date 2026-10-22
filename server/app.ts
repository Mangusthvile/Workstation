/**
 * The Workstation API as a reusable Express app.
 * Used by server.ts (web hosting / development) and desktop/launcher.ts (the .exe).
 */
import express from 'express';
import { GoogleGenAI } from '@google/genai';
import { removeEmDashes } from '../src/textSanitizer';
import type { EditResponse } from '../src/types';
import {
  MAX_INPUT_CHARS,
  buildPromptInstructions,
  buildSystemInstruction,
  buildUserPrompt,
  countWords,
  isTransientError,
  parseSections,
  type PartialEditConfig,
} from './editEngine';

// gemini-3.1-flash-lite has generous quotas and low latency for text tasks; fall back if it is busy.
const MODELS = ['gemini-3.1-flash-lite', 'gemini-flash-latest'];
const RETRY_DELAY_MS = 1000;

export interface AppOptions {
  /** Where to read the Gemini key from. Read per request so edits take effect without a restart. */
  getApiKey?: () => string | undefined;
  /** Error shown in the editor when no key is configured. */
  missingKeyMessage?: string;
}

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      resolve();
    });
  });

/** Tries each model, retrying once on rate-limit/overload errors. */
async function generateWithFallback(ai: GoogleGenAI, prompt: string, systemInstruction: string, signal: AbortSignal) {
  let lastError: unknown = null;
  for (const model of MODELS) {
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
        lastError = new Error('The AI engine returned an empty response.');
        break; // empty (e.g. blocked) responses will not improve on retry; try the next model
      } catch (err) {
        lastError = err;
        if (attempt === 1 && isTransientError(err)) {
          await sleep(RETRY_DELAY_MS, signal);
          continue;
        }
        break;
      }
    }
  }
  throw lastError ?? new Error('The AI engine could not complete the revision.');
}

/** Gemini errors often carry a JSON body as their message; pull out the human-readable part. */
function readableError(error: unknown): string {
  const raw = (error as Error)?.message || String(error || '') || 'An error occurred while revising the text.';
  try {
    const parsed = JSON.parse(raw.slice(raw.indexOf('{')));
    const inner = parsed?.error?.message;
    if (typeof inner === 'string' && inner) return `Gemini: ${inner}`;
  } catch {
    /* not JSON */
  }
  return raw;
}

export function createApp(options: AppOptions = {}): express.Express {
  const getApiKey = options.getApiKey ?? (() => process.env.GEMINI_API_KEY);
  const missingKeyMessage = options.missingKeyMessage ?? 'GEMINI_API_KEY is not configured on the server.';

  // Created on first use and re-created if the key changes (hosts like AI Studio
  // inject the key after start; desktop users can edit their settings file).
  let client: GoogleGenAI | null = null;
  let clientKey = '';
  const getClient = (): GoogleGenAI | null => {
    const key = getApiKey()?.trim();
    if (!key) return null;
    if (!client || key !== clientKey) {
      client = new GoogleGenAI({ apiKey: key, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
      clientKey = key;
    }
    return client;
  };

  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '2mb' }));

  app.post('/api/edit', async (req, res) => {
    const { text, config } = (req.body ?? {}) as { text?: unknown; config?: unknown };

    if (typeof text !== 'string' || !text.trim()) {
      res.status(400).json({ error: 'Text input is required' });
      return;
    }
    if (text.length > MAX_INPUT_CHARS) {
      res.status(413).json({ error: `Text is too long (max ${MAX_INPUT_CHARS.toLocaleString()} characters). Try splitting it.` });
      return;
    }
    if (config !== undefined && (typeof config !== 'object' || config === null || Array.isArray(config))) {
      res.status(400).json({ error: 'Invalid editing configuration.' });
      return;
    }

    const editConfig = (config ?? {}) as PartialEditConfig;
    const { instructions, ruleNames } = buildPromptInstructions(editConfig);
    if (instructions.length === 0) {
      res.status(400).json({ error: 'Please select at least one edit button or rule.' });
      return;
    }

    const ai = getClient();
    if (!ai) {
      res.status(503).json({ error: missingKeyMessage });
      return;
    }

    // Stop paying for generation if the browser goes away (tab closed, request aborted).
    const controller = new AbortController();
    res.on('close', () => {
      if (!res.writableFinished) controller.abort();
    });

    try {
      const { text: rawResult, model } = await generateWithFallback(
        ai,
        buildUserPrompt(text),
        buildSystemInstruction(instructions),
        controller.signal
      );

      const resultText = removeEmDashes(rawResult);
      const { sections, fullUnsplitCopy } = editConfig.sectionSplitter?.enabled
        ? parseSections(resultText)
        : { sections: [], fullUnsplitCopy: '' };
      const finalText = fullUnsplitCopy || resultText;

      const body: EditResponse = {
        resultText,
        sections: sections.length > 0 ? sections : undefined,
        fullUnsplitCopy: fullUnsplitCopy || undefined,
        appliedRules: ruleNames,
        model,
        stats: {
          originalCharCount: text.length,
          originalWordCount: countWords(text),
          resultCharCount: finalText.length,
          resultWordCount: countWords(finalText),
        },
      };
      res.json(body);
    } catch (error) {
      if (controller.signal.aborted) return;
      const detail = readableError(error);
      console.error('Error generating revision:', detail);
      const status = isTransientError(error) ? 503 : 500;
      const message =
        status === 503 ? 'The AI service is busy or over quota right now. Please try again in a moment.' : detail;
      res.status(status).json({ error: message });
    }
  });

  app.get('/api/health', (_req, res) => {
    // "app" lets a second desktop launch recognize that Workstation is already running.
    res.json({ status: 'ok', app: 'workstation', time: new Date().toISOString() });
  });

  return app;
}
