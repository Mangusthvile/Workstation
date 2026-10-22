import express from 'express';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { removeEmDashes } from './src/textSanitizer';
import type { EditResponse } from './src/types';
import {
  MAX_INPUT_CHARS,
  buildPromptInstructions,
  buildSystemInstruction,
  buildUserPrompt,
  countWords,
  isTransientError,
  parseSections,
  type PartialEditConfig,
} from './server/editEngine';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

// gemini-3.1-flash-lite has generous quotas and low latency for text tasks; fall back if it is busy.
const MODELS = ['gemini-3.1-flash-lite', 'gemini-flash-latest'];
const RETRY_DELAY_MS = 1000;

// Created on first use (and re-created if the key changes), since hosts like
// AI Studio can inject GEMINI_API_KEY after the process starts.
let client: GoogleGenAI | null = null;
let clientKey = '';
function getClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  if (!client || key !== clientKey) {
    client = new GoogleGenAI({ apiKey: key, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
    clientKey = key;
  }
  return client;
}

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));

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
    res.status(503).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
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
    console.error('Error generating revision:', error);
    const status = isTransientError(error) ? 503 : 500;
    const message =
      status === 503
        ? 'The AI service is busy or over quota right now. Please try again in a moment.'
        : (error as Error)?.message || 'An error occurred while revising the text.';
    res.status(status).json({ error: message });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

async function startServer() {
  if (!isProd) {
    // Vite is only needed in development, so it is not loaded in production.
    const { createServer } = await import('vite');
    const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const dist = path.resolve(__dirname, 'dist');
    // Hashed build assets never change, so let browsers cache them for a year.
    app.use('/assets', express.static(path.join(dist, 'assets'), { immutable: true, maxAge: '1y' }));
    app.use(express.static(dist, { index: false }));
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(dist, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
    if (!process.env.GEMINI_API_KEY) console.warn('GEMINI_API_KEY is not set: /api/edit will return 503 until it is configured.');
  });
}

startServer();
