export interface EditConfig {
  proofread: {
    enabled: boolean;
    mode: 'basic' | 'flow'; // 'basic' = spelling/typos/punct only; 'flow' = spelling + grammar + natural flow
  };
  revisionDepth: {
    enabled: boolean;
    level: 'light' | 'heavy'; // 'light' = sentence meaning close, keep voice; 'heavy' = restructure, stronger clarity
  };
  preserveStructure: {
    enabled: boolean;
    keepParagraphsTogether: boolean;
    protectSystemBoxes: boolean; // Protect ═════ boxes, stat blocks, rolls
    standardDialogueFormat: boolean; // Single quote pair per uninterrupted dialogue
  };
  smoothTransitions: {
    enabled: boolean;
  };
  compressRepetition: {
    enabled: boolean; // Combine redundant short lines, eliminate repeat fragments
  };
  sectionSplitter: {
    enabled: boolean;
    charLimit: number; // default 1000
    keepSystemBoxesIntact: boolean; // Never break ═════ across sections
    includeFullUnsplitCopy: boolean; // Full unsplit copy labeled for record
  };
  loreRules: {
    enabled: boolean;
    baselinerGenderless: boolean; // Baseliners have no gender (they/them/name/number)
    baselinerBodyLanguage: boolean; // Gesture/posture first before translating communication
    protagonistCapitalized: boolean; // Capitalize HE, HIM, HIS during perspective shifts
    preserveCreativeLore: boolean; // Preserve lore terms, mechanics, custom capitalization
  };
  sensoryImmersion: {
    enabled: boolean;
    enhanceSensory: boolean; // Heat, texture, light, physical sensations
    useOnomatopoeia: boolean; // Crunch, Slap, Crack, Thud
    speechEnhancer: boolean; // Improve rhythm, escalation, anime-style speeches
  };
  strictGuardrails: {
    enabled: boolean;
    noUnnecessaryAdditions: boolean; // No summaries, day recaps, commentary, new details
    preserveNarratorVoice: boolean; // Preserve casual lines, jokes, sarcasm, blunt wording
    academicCleanup: boolean; // Academic clarity for school essays/reflections
  };
}

export interface SectionBlock {
  id: string;
  title: string;
  content: string;
  charCount: number;
}

export interface EditResponse {
  resultText: string;
  sections?: SectionBlock[];
  fullUnsplitCopy?: string;
  appliedRules: string[];
  model?: string;
  stats: {
    originalCharCount: number;
    originalWordCount: number;
    resultCharCount: number;
    resultWordCount: number;
  };
}

export const DEFAULT_CONFIG: EditConfig = {
  proofread: {
    enabled: true,
    mode: 'flow',
  },
  revisionDepth: {
    enabled: false,
    level: 'light',
  },
  preserveStructure: {
    enabled: true,
    keepParagraphsTogether: true,
    protectSystemBoxes: true,
    standardDialogueFormat: true,
  },
  smoothTransitions: {
    enabled: true,
  },
  compressRepetition: {
    enabled: false,
  },
  sectionSplitter: {
    enabled: false,
    charLimit: 1000,
    keepSystemBoxesIntact: true,
    includeFullUnsplitCopy: true,
  },
  loreRules: {
    enabled: false,
    baselinerGenderless: true,
    baselinerBodyLanguage: true,
    protagonistCapitalized: false,
    preserveCreativeLore: true,
  },
  sensoryImmersion: {
    enabled: false,
    enhanceSensory: true,
    useOnomatopoeia: true,
    speechEnhancer: false,
  },
  strictGuardrails: {
    enabled: true,
    noUnnecessaryAdditions: true,
    preserveNarratorVoice: true,
    academicCleanup: false,
  },
};
