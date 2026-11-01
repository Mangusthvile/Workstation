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
  parseSections,
  type PartialEditConfig,
} from './editEngine';
import { GeminiRouter, GeminiUnavailableError, parseModelList } from './gemini';

export interface AppOptions {
  /** Where to read the Gemini key from. Read per request so edits take effect without a restart. */
  getApiKey?: () => string | undefined;
  /** Optional comma-separated model list (GEMINI_MODELS). Read per request. */
  getModels?: () => string | undefined;
  /** Error shown in the editor when no key is configured. */
  missingKeyMessage?: string;
}

export function createApp(options: AppOptions = {}): express.Express {
  const getApiKey = options.getApiKey ?? (() => process.env.GEMINI_API_KEY);
  const getModels = options.getModels ?? (() => process.env.GEMINI_MODELS);
  const router = new GeminiRouter();
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
      router.reset(); // quotas belong to the key's project
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
      const { text: rawResult, model } = await router.generate(
        ai,
        parseModelList(getModels()),
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
      if (error instanceof GeminiUnavailableError) {
        console.error(`Edit failed: ${error.message}`);
        res.status(error.httpStatus).json({
          error: error.message,
          resetAt: error.resetAt ? new Date(error.resetAt).toISOString() : undefined,
        });
        return;
      }
      console.error('Error generating revision:', error);
      res.status(500).json({ error: (error as Error)?.message || 'An error occurred while revising the text.' });
    }
  });

  app.get('/api/health', (_req, res) => {
    // "app" lets a second desktop launch recognize that Workstation is already running.
    res.json({ status: 'ok', app: 'workstation', time: new Date().toISOString() });
  });

  return app;
}
