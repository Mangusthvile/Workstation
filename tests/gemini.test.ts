import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GeminiRouter, GeminiUnavailableError, classifyGeminiError, nextPacificMidnight, parseModelList } from '../server/gemini';

/** Builds an error shaped exactly like the @google/genai SDK's ApiError. */
function apiError(status: number, error: Record<string, unknown>) {
  return Object.assign(new Error(JSON.stringify({ error })), { name: 'ApiError', status });
}

const dailyQuota = (model: string) =>
  apiError(429, {
    code: 429,
    status: 'RESOURCE_EXHAUSTED',
    message: `You exceeded your current quota, please check your plan and billing details.\n* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 20, model: ${model}\nPlease retry in 41.2s.`,
    details: [
      {
        '@type': 'type.googleapis.com/google.rpc.QuotaFailure',
        violations: [
          {
            quotaMetric: 'generativelanguage.googleapis.com/generate_content_free_tier_requests',
            quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier',
            quotaDimensions: { location: 'global', model },
            quotaValue: '20',
          },
        ],
      },
      { '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '41s' },
    ],
  });

const minuteQuota = (retry: string) =>
  apiError(429, {
    code: 429,
    status: 'RESOURCE_EXHAUSTED',
    message: 'You exceeded your current quota.',
    details: [
      {
        '@type': 'type.googleapis.com/google.rpc.QuotaFailure',
        violations: [{ quotaId: 'GenerateRequestsPerMinutePerProjectPerModel-FreeTier', quotaValue: '15' }],
      },
      { '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: retry },
    ],
  });

const badKey = () =>
  apiError(400, {
    code: 400,
    status: 'INVALID_ARGUMENT',
    message: 'API key not valid. Please pass a valid API key.',
    details: [{ '@type': 'type.googleapis.com/google.rpc.ErrorInfo', reason: 'API_KEY_INVALID' }],
  });

const overloaded = () => apiError(503, { code: 503, status: 'UNAVAILABLE', message: 'The model is overloaded. Please try again later.' });

/** Fake Gemini client: each model gets a queue of outcomes (Error to throw, or text to return). */
function fakeAi(script: Record<string, (Error | string)[]>) {
  const calls: string[] = [];
  return {
    calls,
    models: {
      generateContent: async ({ model }: { model: string }) => {
        calls.push(model);
        const next = script[model]?.shift();
        if (next === undefined) throw new Error(`unexpected call to ${model}`);
        if (next instanceof Error) throw next;
        return { text: next };
      },
    },
  } as unknown as { calls: string[]; models: never };
}

const MODELS = ['m1', 'm2', 'm3'];
const noSleep = { sleep: async () => {}, log: () => {} };
const run = (router: GeminiRouter, ai: ReturnType<typeof fakeAi>, models = MODELS) =>
  router.generate(ai as never, models, 'prompt', 'system', new AbortController().signal);

test('classifies Google error bodies', () => {
  assert.equal(classifyGeminiError(dailyQuota('m1')).kind, 'quota-day');
  const minute = classifyGeminiError(minuteQuota('7s'));
  assert.equal(minute.kind, 'quota-minute');
  assert.equal(minute.retryAfterS, 7);
  assert.equal(classifyGeminiError(badKey()).kind, 'key');
  assert.equal(classifyGeminiError(overloaded()).kind, 'overloaded');
  assert.equal(classifyGeminiError(apiError(404, { code: 404, status: 'NOT_FOUND', message: 'models/x is not found' })).kind, 'model-missing');
  // A model with no free allowance at all ("limit: 0") is treated as used up for the day.
  assert.equal(
    classifyGeminiError(apiError(429, { code: 429, status: 'RESOURCE_EXHAUSTED', message: 'Quota exceeded for metric: x, limit: 0, model: m1' })).kind,
    'quota-day'
  );
});

test('when one model is out for the day, the next model answers', async () => {
  const router = new GeminiRouter(noSleep);
  const ai = fakeAi({ m1: [dailyQuota('m1')], m2: ['edited text'] });
  const result = await run(router, ai);
  assert.deepEqual(result, { text: 'edited text', model: 'm2' });
  assert.deepEqual(ai.calls, ['m1', 'm2']);
});

test('a used-up model is skipped on later edits (no wasted requests)', async () => {
  const router = new GeminiRouter(noSleep);
  await run(router, fakeAi({ m1: [dailyQuota('m1')], m2: ['first'] }));
  const ai = fakeAi({ m2: ['second'] });
  assert.equal((await run(router, ai)).text, 'second');
  assert.deepEqual(ai.calls, ['m2']);
});

test('when every model is out for the day, the message says so and when it resets', async () => {
  let now = Date.UTC(2026, 10, 1, 1, 45); // 9:45 PM Eastern / 6:45 PM Pacific
  const router = new GeminiRouter({ ...noSleep, now: () => now });
  const ai = fakeAi({ m1: [dailyQuota('m1')], m2: [dailyQuota('m2')], m3: [dailyQuota('m3')] });
  await assert.rejects(run(router, ai), (err: GeminiUnavailableError) => {
    assert.match(err.message, /used up on all 3 AI models/);
    assert.match(err.message, /midnight Pacific/);
    assert.equal(err.httpStatus, 429);
    assert.equal(new Date(err.resetAt!).toISOString(), '2026-11-01T07:00:00.000Z'); // midnight PDT, no margin shown
    return true;
  });
  // A second click before the reset does not call Gemini at all.
  const idle = fakeAi({});
  await assert.rejects(run(router, idle), /used up on all 3 AI models/);
  assert.deepEqual(idle.calls, []);
  // After the reset, models are tried again.
  now += 24 * 3600_000;
  const fresh = fakeAi({ m1: ['back'] });
  assert.equal((await run(router, fresh)).text, 'back');
});

test('a short per-minute wait is retried on the same model; a long one moves on', async () => {
  const router = new GeminiRouter(noSleep);
  const short = fakeAi({ m1: [minuteQuota('5s'), 'after wait'] });
  assert.deepEqual(await run(router, short), { text: 'after wait', model: 'm1' });

  const router2 = new GeminiRouter(noSleep);
  const long = fakeAi({ m1: [minuteQuota('50s')], m2: ['next model'] });
  assert.deepEqual(await run(router2, long), { text: 'next model', model: 'm2' });
});

test('per-minute limits on every model give a "wait N seconds" message', async () => {
  const now = 1_000_000;
  const router = new GeminiRouter({ ...noSleep, now: () => now });
  const ai = fakeAi({ m1: [minuteQuota('40s')], m2: [minuteQuota('25s')], m3: [dailyQuota('m3')] });
  await assert.rejects(run(router, ai), /per-minute limit.*about 25 seconds/);
});

test('a bad API key stops immediately with a clear message', async () => {
  const router = new GeminiRouter(noSleep);
  const ai = fakeAi({ m1: [badKey()] });
  await assert.rejects(run(router, ai), /rejected the Gemini API key/);
  assert.deepEqual(ai.calls, ['m1']);
});

test('an overloaded model is retried once, then the next model is used', async () => {
  const router = new GeminiRouter(noSleep);
  const ai = fakeAi({ m1: [overloaded(), overloaded()], m2: ['ok'] });
  assert.equal((await run(router, ai)).model, 'm2');
  assert.deepEqual(ai.calls, ['m1', 'm1', 'm2']);
});

test('model list setting and Pacific reset time', () => {
  assert.deepEqual(parseModelList(' a, b ,,c '), ['a', 'b', 'c']);
  assert.equal(parseModelList('').length > 0, true);
  // 6:45 PM Pacific (PDT, UTC-7) -> next reset is midnight PDT = 7:00 UTC.
  const now = Date.UTC(2026, 9, 31, 1, 45);
  assert.equal(new Date(nextPacificMidnight(now)).toISOString(), '2026-10-31T07:00:00.000Z');
  // In winter (PST, UTC-8) midnight is 8:00 UTC.
  assert.equal(new Date(nextPacificMidnight(Date.UTC(2026, 11, 15, 20))).toISOString(), '2026-12-16T08:00:00.000Z');
});
