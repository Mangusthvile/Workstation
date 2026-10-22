import { DEFAULT_CONFIG, type EditConfig } from './types';

type RuleKey = keyof EditConfig;
const ALL_KEYS = Object.keys(DEFAULT_CONFIG) as RuleKey[];

/** Each preset lists the rules to turn on plus any sub-setting overrides; everything else is off. */
export type PresetOverrides = { [K in RuleKey]?: Partial<EditConfig[K]> };

const STRICT_VOICE: PresetOverrides['strictGuardrails'] = {
  noUnnecessaryAdditions: true,
  preserveNarratorVoice: true,
  academicCleanup: false,
};

export const PRESETS: Record<string, { label: string; title?: string; overrides: PresetOverrides | 'all' | 'none' }> = {
  'spelling-flow': {
    label: 'Flow ★',
    title: 'Spelling + Grammar + Flow',
    overrides: {
      proofread: { mode: 'flow' },
      preserveStructure: {},
      smoothTransitions: {},
      strictGuardrails: STRICT_VOICE,
    },
  },
  'story-split': {
    label: 'Story (1k)',
    overrides: {
      proofread: { mode: 'flow' },
      revisionDepth: { level: 'light' },
      preserveStructure: { keepParagraphsTogether: true, protectSystemBoxes: true, standardDialogueFormat: true },
      smoothTransitions: {},
      compressRepetition: {},
      sectionSplitter: { charLimit: 1000, keepSystemBoxesIntact: true, includeFullUnsplitCopy: true },
      loreRules: {
        baselinerGenderless: true,
        baselinerBodyLanguage: true,
        protagonistCapitalized: true,
        preserveCreativeLore: true,
      },
      sensoryImmersion: { enhanceSensory: true, useOnomatopoeia: true, speechEnhancer: false },
      strictGuardrails: STRICT_VOICE,
    },
  },
  compress: {
    label: 'Compress',
    overrides: {
      proofread: { mode: 'flow' },
      revisionDepth: { level: 'heavy' },
      preserveStructure: {},
      smoothTransitions: {},
      compressRepetition: {},
      strictGuardrails: STRICT_VOICE,
    },
  },
  academic: {
    label: 'Academic',
    overrides: {
      proofread: { mode: 'basic' },
      revisionDepth: { level: 'light' },
      preserveStructure: {},
      smoothTransitions: {},
      strictGuardrails: { noUnnecessaryAdditions: true, preserveNarratorVoice: false, academicCleanup: true },
    },
  },
  all: { label: 'All', overrides: 'all' },
  clear: { label: 'Clear', overrides: 'none' },
};

export function buildPreset(overrides: PresetOverrides | 'all' | 'none'): EditConfig {
  const fresh = structuredClone(DEFAULT_CONFIG) as Record<RuleKey, Record<string, unknown>>;
  for (const key of ALL_KEYS) {
    if (overrides === 'all') fresh[key].enabled = true;
    else if (overrides === 'none') fresh[key].enabled = false;
    else {
      const o = overrides[key];
      fresh[key] = o ? { ...fresh[key], ...o, enabled: true } : { ...fresh[key], enabled: false };
    }
  }
  return fresh as unknown as EditConfig;
}

