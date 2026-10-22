/**
 * Prompt construction and response parsing for /api/edit.
 * Kept free of Express and Gemini so it can be unit tested.
 */
import type { EditConfig, SectionBlock } from '../src/types';
import { removeEmDashes } from '../src/textSanitizer';

/** Requests may omit any rule group. */
export type PartialEditConfig = { [K in keyof EditConfig]?: Partial<EditConfig[K]> };

export const MAX_INPUT_CHARS = 200_000;

export function buildPromptInstructions(config: PartialEditConfig): { instructions: string[]; ruleNames: string[] } {
  const instructions: string[] = [];
  const ruleNames: string[] = [];

  /** Adds a rule only if it produced at least one instruction (no empty lines in the prompt). */
  const add = (name: string, parts: (string | false | undefined)[], prefix = '') => {
    const text = parts.filter(Boolean).join(' ');
    if (!text) return;
    ruleNames.push(name);
    instructions.push(prefix + text);
  };

  const { proofread, revisionDepth, preserveStructure, smoothTransitions, compressRepetition } = config;
  const { sectionSplitter, loreRules, sensoryImmersion, strictGuardrails } = config;

  if (proofread?.enabled) {
    if (proofread.mode === 'basic') {
      add('Basic Proofreading', [
        'BASIC PROOFREADING: Fix spelling, grammar, punctuation, and capitalization. Correct obvious typos without substantially rewriting anything.',
      ]);
    } else {
      add('Spelling + Grammar + Flow', [
        'SPELLING, GRAMMAR & FLOW: Correct mistakes while also making sentences connect more naturally. Smooth awkward wording and transitions without changing the actual meaning.',
      ]);
    }
  }

  if (revisionDepth?.enabled) {
    if (revisionDepth.level === 'heavy') {
      add('Heavier Revision', [
        'HEAVIER REVISION: Improve word choice, restructure awkward sentences, improve paragraph organization, and make ideas clearer or stronger while retaining the core concept.',
      ]);
    } else {
      add('Light Revision', [
        'LIGHT REVISION: Keep sentence meaning as close as possible. Move words or clauses around when necessary. Avoid adding new information. Preserve personal writing style instead of sounding overly polished or artificial.',
      ]);
    }
  }

  if (preserveStructure?.enabled) {
    add(
      'Preserve Structure & Boxes',
      [
        preserveStructure.keepParagraphsTogether &&
          'Keep paragraphs together unless there is a major structural problem. Avoid turning prose into lots of tiny paragraphs.',
        preserveStructure.protectSystemBoxes &&
          'CRITICAL: Preserve system boxes, stat blocks, rolls, dialogue, headings, and dividers intact. NEVER split or mangle notification boxes (such as ════════════ lines).',
        preserveStructure.standardDialogueFormat &&
          'NORMAL DIALOGUE FORMATTING: Keep uninterrupted dialogue inside one pair of quotation marks. Only close quotation marks when narration, an action, an observation, or another speaker interrupts. Do not use multi-paragraph quote conventions where every paragraph starts with an open quote.',
      ],
      'PRESERVE FORMAT: '
    );
  }

  if (smoothTransitions?.enabled) {
    add('Smooth Transitions', [
      'SMOOTH TRANSITIONS: Make one sentence naturally lead into the next. Make paragraphs transition cleanly instead of feeling like disconnected thoughts. Avoid suddenly jumping between ideas.',
    ]);
  }

  if (compressRepetition?.enabled) {
    add('Compress Repetitive Writing', [
      'COMPRESS REPETITIVE WRITING: Combine several short or repetitive lines into fuller paragraphs. Remove unnecessary repetition. Keep the same information while making the prose more concise. Eliminate repetitive constructions like several one-line fragments repeating essentially the same point.',
    ]);
  }

  if (sectionSplitter?.enabled) {
    const limit = clampLimit(sectionSplitter.charLimit);
    add(`Section Splitter (~${limit} chars)`, [
      `SECTION SPLITTING: Split long passages into copy-friendly sections of approximately ${limit} characters. Try to keep related scenes or ideas together rather than cutting arbitrarily.`,
      sectionSplitter.keepSystemBoxesIntact &&
        'NEVER split a ════════════ notification or mechanics box across two sections; shorten or extend the preceding section if necessary so the whole box stays together in one section.',
      'Format sections with explicit headers: "=== SECTION 1 ===", "=== SECTION 2 ===", etc.',
      sectionSplitter.includeFullUnsplitCopy &&
        'After all split sections, provide one complete unsplit copy labeled exactly: "=== FULL UNSPLIT COPY ===".',
    ]);
  }

  if (loreRules?.enabled) {
    add('Lore & Character Rules', [
      loreRules.baselinerGenderless &&
        'BASELINER PRONOUN RULES: Baseliners have no gender. Refer to them by name/number or they/them/their. NEVER automatically assign he/she based on a masculine- or feminine-sounding name.',
      loreRules.baselinerBodyLanguage &&
        'BODY-LANGUAGE DIALOGUE: For Baseliners, describe the gesture, expression, or posture first, then translate or interpret approximately what they are communicating (they communicate primarily through body language).',
      loreRules.protagonistCapitalized &&
        'SPECIAL PROTAGONIST PRONOUN FORMATTING: During perspective-shift scenes, capitalize references to the protagonist as HE, HIM, HIS, etc.',
      loreRules.preserveCreativeLore &&
        'CREATIVE-WRITING CLEANUP: Preserve lore terms, mechanics, custom capitalization, character personalities, and established worldbuilding. Improve readability without altering lore.',
    ]);
  }

  if (sensoryImmersion?.enabled) {
    add('Sensory & Immersion', [
      sensoryImmersion.enhanceSensory &&
        'MORE IMMERSIVE PROSE: Strengthen sensory imagery such as heat, texture, light, movement, sound, and physical sensations. Help the reader mentally picture the scene rather than just telling.',
      sensoryImmersion.useOnomatopoeia &&
        'USE ONOMATOPOEIA: Incorporate words like Crunch, Slap, Crack, Thud, etc. naturally to reinforce immersion without overusing.',
      sensoryImmersion.speechEnhancer &&
        'IMPROVE SPEECHES: Rewrite speeches so they sound more powerful, memorable, and natural. Improve rhythm, escalation, imagery, repetition, and emotional payoff (inspired by impactful speech techniques).',
    ]);
  }

  if (strictGuardrails?.enabled) {
    add('Strict Guardrails & Voice', [
      strictGuardrails.noUnnecessaryAdditions &&
        'NO UNNECESSARY ADDITIONS: Do NOT add summaries, day recaps, extra mechanics, meta commentary, conclusions, or new story details unless specifically requested.',
      strictGuardrails.preserveNarratorVoice &&
        'PRESERVE NARRATOR VOICE: Keep casual lines, jokes, sarcasm, or blunt wording where intentional. Do not turn everything into stiff or corporate prose.',
      strictGuardrails.academicCleanup &&
        'ACADEMIC-WRITING CLEANUP: Correct school responses, reflections, reports, and essays while maintaining author opinions and core wording. Make them clearer and academically appropriate without sounding unnaturally sophisticated.',
    ]);
  }

  return { instructions, ruleNames };
}

function clampLimit(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.min(5000, Math.max(200, Math.round(n))) : 1000;
}

export function buildSystemInstruction(instructions: string[]): string {
  return `You are a precision text editor and revision engine.
Follow the user's selected editing rules strictly.
Do not add conversational commentary, meta-analysis, or preamble like "Here is your edited text:".
Output ONLY the edited text according to the specifications.

CORE ENGRAVED RULE (ABSOLUTE REQUIREMENT):
NEVER USE EM DASHES (\u2014) OR EN DASHES (\u2013) ANYWHERE IN THE TEXT.
This rule is permanently engraved into all text editor operations and functions. Under NO circumstance should an em-dash (\u2014), en-dash (\u2013), or typed double-hyphen (--) be generated. If the original text contains em dashes or you need breaks, interruptions, pauses, or parentheticals, rephrase the sentence or use natural standard punctuation such as commas, single hyphens (-), colons, semicolons, or parentheses instead.

Selected Rules:
${instructions.map((inst, i) => `${i + 1}. ${inst}`).join('\n')}`;
}

export function buildUserPrompt(text: string): string {
  return `Original Text to edit:
---
${removeEmDashes(text)}
---

Apply all active rules and return the revised text now (REMEMBER: NEVER use em-dashes \u2014):`;
}

// Tolerates extra "=" signs, spacing, and case drift in model output.
const SECTION_HEADER = /={2,}[ \t]*(SECTION[ \t]+\d+|FULL[ \t]+UNSPLIT[ \t]+COPY)[ \t]*={2,}/gi;

export function parseSections(resultText: string): { sections: SectionBlock[]; fullUnsplitCopy: string } {
  const sections: SectionBlock[] = [];
  let fullUnsplitCopy = '';
  const headers = [...resultText.matchAll(SECTION_HEADER)];

  headers.forEach((match, i) => {
    const start = match.index! + match[0].length;
    const end = i + 1 < headers.length ? headers[i + 1].index! : resultText.length;
    const content = resultText.slice(start, end).trim();
    const title = match[1].toUpperCase().replace(/[ \t]+/g, ' ');
    if (title === 'FULL UNSPLIT COPY') fullUnsplitCopy = content;
    else if (content) sections.push({ id: `sec-${sections.length + 1}`, title, content, charCount: content.length });
  });

  return { sections, fullUnsplitCopy };
}

export const countWords = (text: string) => {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
};

/** True for errors worth retrying after a short pause (rate limits, overload). */
export function isTransientError(err: unknown): boolean {
  const status = (err as { status?: unknown })?.status;
  if (status === 429 || status === 500 || status === 502 || status === 503 || status === 504) return true;
  const msg = String((err as Error)?.message ?? err);
  return /\b(429|503)\b|RESOURCE_EXHAUSTED|UNAVAILABLE|quota|busy|overloaded|rate limit/i.test(msg);
}
