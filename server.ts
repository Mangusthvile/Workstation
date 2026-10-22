import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// Gemini client initialization
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({
  apiKey: apiKey || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Models: gemini-3.1-flash-lite has maximal RPM/RPD quotas, lowest latency, minimal reasoning overhead,
// and virtually eliminates "quota exceeded" or "too busy" errors for text tasks.
const PRIMARY_MODEL = 'gemini-3.1-flash-lite';
const FALLBACK_MODEL = 'gemini-flash-latest';

export interface EditConfig {
  proofread?: {
    enabled: boolean;
    mode: 'basic' | 'flow';
  };
  revisionDepth?: {
    enabled: boolean;
    level: 'light' | 'heavy';
  };
  preserveStructure?: {
    enabled: boolean;
    keepParagraphsTogether: boolean;
    protectSystemBoxes: boolean;
    standardDialogueFormat: boolean;
  };
  smoothTransitions?: {
    enabled: boolean;
  };
  compressRepetition?: {
    enabled: boolean;
  };
  sectionSplitter?: {
    enabled: boolean;
    charLimit: number;
    keepSystemBoxesIntact: boolean;
    includeFullUnsplitCopy: boolean;
  };
  loreRules?: {
    enabled: boolean;
    baselinerGenderless: boolean;
    baselinerBodyLanguage: boolean;
    protagonistCapitalized: boolean;
    preserveCreativeLore: boolean;
  };
  sensoryImmersion?: {
    enabled: boolean;
    enhanceSensory: boolean;
    useOnomatopoeia: boolean;
    speechEnhancer: boolean;
  };
  strictGuardrails?: {
    enabled: boolean;
    noUnnecessaryAdditions: boolean;
    preserveNarratorVoice: boolean;
    academicCleanup: boolean;
  };
}

function buildPromptInstructions(config: EditConfig): { instructions: string[]; ruleNames: string[] } {
  const instructions: string[] = [];
  const ruleNames: string[] = [];

  // Button 1: Proofread
  if (config.proofread?.enabled) {
    if (config.proofread.mode === 'basic') {
      ruleNames.push('Basic Proofreading');
      instructions.push(
        'BASIC PROOFREADING: Fix spelling, grammar, punctuation, and capitalization. Correct obvious typos without substantially rewriting anything.'
      );
    } else {
      ruleNames.push('Spelling + Grammar + Flow');
      instructions.push(
        'SPELLING, GRAMMAR & FLOW: Correct mistakes while also making sentences connect more naturally. Smooth awkward wording and transitions without changing the actual meaning.'
      );
    }
  }

  // Button 2: Revision Depth
  if (config.revisionDepth?.enabled) {
    if (config.revisionDepth.level === 'light') {
      ruleNames.push('Light Revision');
      instructions.push(
        'LIGHT REVISION: Keep sentence meaning as close as possible. Move words or clauses around when necessary. Avoid adding new information. Preserve personal writing style instead of sounding overly polished or artificial.'
      );
    } else {
      ruleNames.push('Heavier Revision');
      instructions.push(
        'HEAVIER REVISION: Improve word choice, restructure awkward sentences, improve paragraph organization, and make ideas clearer or stronger while retaining the core concept.'
      );
    }
  }

  // Button 3: Structure & Boxes
  if (config.preserveStructure?.enabled) {
    ruleNames.push('Preserve Structure & Boxes');
    const subRules: string[] = [];
    if (config.preserveStructure.keepParagraphsTogether) {
      subRules.push('Keep paragraphs together unless there is a major structural problem. Avoid turning prose into lots of tiny paragraphs.');
    }
    if (config.preserveStructure.protectSystemBoxes) {
      subRules.push('CRITICAL: Preserve system boxes, stat blocks, rolls, dialogue, headings, and dividers intact. NEVER split or mangle notification boxes (such as ════════════ lines).');
    }
    if (config.preserveStructure.standardDialogueFormat) {
      subRules.push('NORMAL DIALOGUE FORMATTING: Keep uninterrupted dialogue inside one pair of quotation marks. Only close quotation marks when narration, an action, an observation, or another speaker interrupts. Do not use multi-paragraph quote conventions where every paragraph starts with an open quote.');
    }
    instructions.push(`PRESERVE FORMAT: ${subRules.join(' ')}`);
  }

  // Button 4: Transitions
  if (config.smoothTransitions?.enabled) {
    ruleNames.push('Smooth Transitions');
    instructions.push(
      'SMOOTH TRANSITIONS: Make one sentence naturally lead into the next. Make paragraphs transition cleanly instead of feeling like disconnected thoughts. Avoid suddenly jumping between ideas.'
    );
  }

  // Button 5: Compress Repetition
  if (config.compressRepetition?.enabled) {
    ruleNames.push('Compress Repetitive Writing');
    instructions.push(
      'COMPRESS REPETITIVE WRITING: Combine several short or repetitive lines into fuller paragraphs. Remove unnecessary repetition. Keep the same information while making the prose more concise. Eliminate repetitive constructions like several one-line fragments repeating essentially the same point.'
    );
  }

  // Button 6: Section Splitter
  if (config.sectionSplitter?.enabled) {
    const limit = config.sectionSplitter.charLimit || 1000;
    ruleNames.push(`Section Splitter (~${limit} chars)`);
    instructions.push(
      `SECTION SPLITTING: Split long passages into copy-friendly sections of approximately ${limit} characters. Try to keep related scenes or ideas together rather than cutting arbitrarily. ${
        config.sectionSplitter.keepSystemBoxesIntact
          ? 'NEVER split a ════════════ notification or mechanics box across two sections; shorten or extend the preceding section if necessary so the whole box stays together in one section.'
          : ''
      } Format sections with explicit headers: "=== SECTION 1 ===", "=== SECTION 2 ===", etc. ${
        config.sectionSplitter.includeFullUnsplitCopy
          ? 'After all split sections, provide one complete unsplit copy labeled exactly: "=== FULL UNSPLIT COPY ===".'
          : ''
      }`
    );
  }

  // Button 7: Lore & Character Rules
  if (config.loreRules?.enabled) {
    ruleNames.push('Lore & Character Rules');
    const loreSub: string[] = [];
    if (config.loreRules.baselinerGenderless) {
      loreSub.push('BASELINER PRONOUN RULES: Baseliners have no gender. Refer to them by name/number or they/them/their. NEVER automatically assign he/she based on a masculine- or feminine-sounding name.');
    }
    if (config.loreRules.baselinerBodyLanguage) {
      loreSub.push('BODY-LANGUAGE DIALOGUE: For Baseliners, describe the gesture, expression, or posture first, then translate or interpret approximately what they are communicating (they communicate primarily through body language).');
    }
    if (config.loreRules.protagonistCapitalized) {
      loreSub.push('SPECIAL PROTAGONIST PRONOUN FORMATTING: During perspective-shift scenes, capitalize references to the protagonist as HE, HIM, HIS, etc.');
    }
    if (config.loreRules.preserveCreativeLore) {
      loreSub.push('CREATIVE-WRITING CLEANUP: Preserve lore terms, mechanics, custom capitalization, character personalities, and established worldbuilding. Improve readability without altering lore.');
    }
    instructions.push(loreSub.join(' '));
  }

  // Button 8: Sensory Immersion
  if (config.sensoryImmersion?.enabled) {
    ruleNames.push('Sensory & Immersion');
    const sensorySub: string[] = [];
    if (config.sensoryImmersion.enhanceSensory) {
      sensorySub.push('MORE IMMERSIVE PROSE: Strengthen sensory imagery such as heat, texture, light, movement, sound, and physical sensations. Help the reader mentally picture the scene rather than just telling.');
    }
    if (config.sensoryImmersion.useOnomatopoeia) {
      sensorySub.push('USE ONOMATOPOEIA: Incorporate words like Crunch, Slap, Crack, Thud, etc. naturally to reinforce immersion without overusing.');
    }
    if (config.sensoryImmersion.speechEnhancer) {
      sensorySub.push('IMPROVE SPEECHES: Rewrite speeches so they sound more powerful, memorable, and natural. Improve rhythm, escalation, imagery, repetition, and emotional payoff (inspired by impactful speech techniques).');
    }
    instructions.push(sensorySub.join(' '));
  }

  // Button 9: Strict Guardrails
  if (config.strictGuardrails?.enabled) {
    ruleNames.push('Strict Guardrails & Voice');
    const guardSub: string[] = [];
    if (config.strictGuardrails.noUnnecessaryAdditions) {
      guardSub.push('NO UNNECESSARY ADDITIONS: Do NOT add summaries, day recaps, extra mechanics, meta commentary, conclusions, or new story details unless specifically requested.');
    }
    if (config.strictGuardrails.preserveNarratorVoice) {
      guardSub.push('PRESERVE NARRATOR VOICE: Keep casual lines, jokes, sarcasm, or blunt wording where intentional. Do not turn everything into stiff or corporate prose.');
    }
    if (config.strictGuardrails.academicCleanup) {
      guardSub.push('ACADEMIC-WRITING CLEANUP: Correct school responses, reflections, reports, and essays while maintaining author opinions and core wording. Make them clearer and academically appropriate without sounding unnaturally sophisticated.');
    }
    instructions.push(guardSub.join(' '));
  }

  return { instructions, ruleNames };
}

function removeEmDashes(text: string): string {
  if (!text) return '';
  return text
    .replace(/&mdash;|&#8212;/gi, ' - ')
    .replace(/&ndash;|&#8211;/gi, '-')
    .replace(/(^|[\n"'“‘\[\(])\s*[\u2014\u2015]\s*/g, '$1- ')
    .replace(/\s*[\u2014\u2015]\s*([,\.!\?;:])/g, '$1')
    .replace(/\s*[\u2014\u2015]\s*/g, ' - ')
    .replace(/\s*[\u2013]\s*/g, ' - ')
    .replace(/(\S)\s*--+\s*(\S)/g, '$1 - $2')
    .replace(/\s*--+\s*/g, ' - ')
    .replace(/[^\S\r\n]{2,}/g, ' ');
}

// API Routes
app.post('/api/edit', async (req, res) => {
  try {
    const { text, config } = req.body as { text: string; config: EditConfig };

    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Text input is required' });
      return;
    }

    const { instructions, ruleNames } = buildPromptInstructions(config || {});

    if (instructions.length === 0) {
      res.status(400).json({ error: 'Please select at least one edit button or rule.' });
      return;
    }

    const systemInstruction = `You are a precision text editor and revision engine. 
Follow the user's selected editing rules strictly.
Do not add conversational commentary, meta-analysis, or preamble like "Here is your edited text:".
Output ONLY the edited text according to the specifications.

CORE ENGRAVED RULE (ABSOLUTE REQUIREMENT):
NEVER USE EM DASHES (—) OR EN DASHES (–) ANYWHERE IN THE TEXT.
This rule is permanently engraved into all text editor operations and functions. Under NO circumstance should an em-dash (—), en-dash (–), or typed double-hyphen (--) be generated. If the original text contains em dashes or you need breaks, interruptions, pauses, or parentheticals, rephrase the sentence or use natural standard punctuation such as commas, single hyphens (-), colons, semicolons, or parentheses instead.

Selected Rules:
${instructions.map((inst, i) => `${i + 1}. ${inst}`).join('\n')}`;

    const prompt = `Original Text to edit:
---
${removeEmDashes(text)}
---

Apply all active rules and return the revised text now (REMEMBER: NEVER use em-dashes —):`;

    // Call gemini-3.1-flash-lite with resilient quota-handling & fallback
    const modelsToTry = [PRIMARY_MODEL, FALLBACK_MODEL];
    let response: any = null;
    let modelUsed = PRIMARY_MODEL;
    let lastError: any = null;

    for (const model of modelsToTry) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          response = await ai.models.generateContent({
            model,
            contents: [
              {
                role: 'user',
                parts: [{ text: prompt }],
              },
            ],
            config: {
              systemInstruction,
              temperature: 0.3,
            },
          });
          modelUsed = model;
          lastError = null;
          break;
        } catch (err: any) {
          lastError = err;
          const msg = String(err?.message || err);
          const isBusyOrQuota =
            msg.includes('429') ||
            msg.includes('503') ||
            msg.includes('RESOURCE_EXHAUSTED') ||
            msg.includes('quota') ||
            msg.includes('busy') ||
            msg.includes('overloaded') ||
            msg.includes('rate limit');

          if (isBusyOrQuota && attempt === 1) {
            // Brief backoff before retry
            await new Promise((resolve) => setTimeout(resolve, 1000));
            continue;
          }
          break;
        }
      }

      if (response && response.text) {
        break;
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error('The AI engine could not complete the revision.');
    }

    const resultText = removeEmDashes(response.text || '');

    // Parse sections if section splitter was requested
    let sections: { id: string; title: string; content: string; charCount: number }[] = [];
    let fullUnsplitCopy = '';

    if (config?.sectionSplitter?.enabled && resultText.includes('=== SECTION')) {
      const parts = resultText.split(/=== (SECTION \d+|FULL UNSPLIT COPY) ===/g);
      // parts alternate: [preamble, title1, content1, title2, content2, ...]
      for (let i = 1; i < parts.length; i += 2) {
        const title = parts[i]?.trim();
        const content = removeEmDashes((parts[i + 1] || '').trim());
        if (title === 'FULL UNSPLIT COPY') {
          fullUnsplitCopy = content;
        } else if (title && content) {
          sections.push({
            id: `sec-${sections.length + 1}`,
            title,
            content,
            charCount: content.length,
          });
        }
      }
    }

    if (fullUnsplitCopy) {
      fullUnsplitCopy = removeEmDashes(fullUnsplitCopy);
    }

    res.json({
      resultText,
      sections: sections.length > 0 ? sections : undefined,
      fullUnsplitCopy: fullUnsplitCopy || undefined,
      appliedRules: ruleNames,
      model: modelUsed,
      stats: {
        originalCharCount: text.length,
        originalWordCount: text.trim().split(/\s+/).filter(Boolean).length,
        resultCharCount: (fullUnsplitCopy || resultText).length,
        resultWordCount: (fullUnsplitCopy || resultText).trim().split(/\s+/).filter(Boolean).length,
      },
    });
  } catch (error: any) {
    console.error('Error generating revision:', error);
    res.status(500).json({
      error: error.message || 'An error occurred while revising the text.',
    });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Mount Vite or static files
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
