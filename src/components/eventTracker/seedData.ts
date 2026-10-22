import type { CompletedEventRecord, TrackedEvent } from './types';

/** Example events shown on first launch. They can be removed with "Remove Base Events". */
export const INITIAL_EVENTS: TrackedEvent[] = [
  {
    id: 'dark-gate',
    title: 'Dark Gate',
    subtitle: 'Formation of the Gate to the Dark World',
    statusEmoji: '🟩',
    statusLabel: 'Active',
    startedDate: 'Day 3',
    endedDate: 'Day ?',
    currentStep: 5,
    totalSteps: 30,
    progressUnit: 'Days',
    isRepeatable: false,
    completionCount: 0,
    selected: true,
    isBaseEvent: true,
    notes: 'Dimensional rift widening along the ancient ley lines.',
    specialNote:
      "If Sid is able to complete his array around the dark gate, he'll freeze it at 15/30 until he is ready for it to progress, in which case it will progress to 30/30 in just 5 days.",
    icon: 'crown',
    iconColor: '#7C3AED',
    bgTheme: 'noir',
    progressStyle: 'segmented-blocks',
    tags: ['dark-world', 'sid', 'portal', 'winter', 'world-event'],
    thresholds: [
      {
        id: 't1',
        step: 15,
        title: 'Early Winter Descent',
        message:
          'An Event will happen, where snow begins to fall as an early winter sets in. Days will be shorter and the entire world will slowly get colder.',
      },
      {
        id: 't2',
        step: 20,
        title: 'Thickened Sky & Herald Awakening',
        message:
          'The Sky around the central planes stretching out for miles in all directions will grow dark and thick making it hard to breathe. Herald will be able to fully cross through the Gate swimming in the air as if it was water.',
      },
      {
        id: 't3',
        step: 30,
        title: 'Pillar of Darkness & Forever Winter',
        message:
          "The Gate is completed. A pillar of darkness will pierce the sky and the sun will disappear for 3 days. After it returns it'll be mostly hidden behind dark clouds and the world will be engulfed in a forever winter.",
      },
    ],
  },
  {
    id: 'scene-word-count',
    title: 'Scene Word Count Goal (1,000 words)',
    subtitle: 'Chapter 4 Manuscript Drafting',
    statusEmoji: '🟩',
    statusLabel: 'In Progress',
    startedDate: 'Day 3',
    endedDate: 'Ongoing',
    currentStep: 3,
    totalSteps: 3,
    progressUnit: 'Days',
    isRepeatable: true,
    completionCount: 4,
    lastCompletedText: 'Completed 4x Day 15',
    timelineMarkers: [
      { id: 'm1', cycle: 1, label: 'Completed 1x Day 6' },
      { id: 'm2', cycle: 2, label: 'Completed 2x Day 9' },
      { id: 'm3', cycle: 3, label: 'Completed 3x Day 12' },
      { id: 'm4', cycle: 4, label: 'Completed 4x Day 15' },
    ],
    selected: true,
    isBaseEvent: true,
    notes: 'Cycles every 1k word chunk for pacing and narrative cadence',
    icon: 'book',
    iconColor: '#0284C7',
    bgTheme: 'white',
    progressStyle: 'smooth-linear',
    tags: ['writing', 'scene', 'quota'],
    thresholds: [
      {
        id: 'sc-1',
        step: 2,
        title: 'Halfway Momentum',
        message: 'Drafting pace optimal! Halfway milestone reached.',
      },
      {
        id: 'sc-2',
        step: 3,
        title: 'Chunk Completion',
        message: 'Goal logged! Ready to cycle counter or review flow.',
      },
    ],
  },
  {
    id: 'campaign-quest',
    title: 'Campaign Quest Milestones',
    subtitle: 'Citadel Infiltration Operation',
    statusEmoji: '🟩',
    statusLabel: 'Active',
    startedDate: 'Act II',
    endedDate: 'Act III',
    currentStep: 2,
    totalSteps: 4,
    progressUnit: 'Points',
    isRepeatable: false,
    completionCount: 0,
    selected: false,
    isBaseEvent: true,
    notes: 'Stealth approach across the moat prior to dawn bells',
    specialNote: 'Alarm rings if detected before threshold 2 is secured.',
    icon: 'shield',
    iconColor: '#059669',
    bgTheme: 'sage',
    progressStyle: 'milestone-nodes',
    tags: ['quest', 'stealth', 'dnd', 'citadel'],
    thresholds: [
      {
        id: 'cq-1',
        step: 2,
        title: 'Inner Courtyard Reached',
        message: 'The outer guards have been bypassed. The inner courtyard is now accessible.',
      },
      {
        id: 'cq-2',
        step: 4,
        title: 'Vault Breached',
        message: 'The archives are opened and the relic secured.',
      },
    ],
  },
];

export const INITIAL_HISTORY: CompletedEventRecord[] = [
  {
    id: 'hist-ancient-seal',
    originalEventId: 'ancient-seal',
    title: 'The Ancient Seal Inscription',
    subtitle: 'Deciphering the Runic Glyphs of Mount Morath',
    statusEmoji: '🟦',
    statusLabel: 'Sealed & Conquered',
    startedDate: 'Day 1',
    endedDate: 'Day 2',
    completedAt: 'Completed Day 2',
    totalSteps: 10,
    finalSteps: 10,
    progressUnit: 'Days',
    isRepeatable: false,
    completionCountAtArchive: 1,
    icon: 'shield',
    iconColor: '#059669',
    bgTheme: 'sage',
    progressStyle: 'segmented-blocks',
    isBaseEvent: true,
    tags: ['quest', 'ancient-seal', 'runes', 'world-event'],
    notes: 'Ancient glyphs successfully deciphered before the second eclipse.',
    specialNote:
      'The deciphered runes unlocked the hidden passageway into the catacombs beneath Mount Morath.',
    thresholds: [
      {
        id: 'hist-t1',
        step: 5,
        title: 'Outer Glyphs Resonance',
        message:
          'The outer inscription began to glow with cerulean light as the incantation took hold.',
      },
      {
        id: 'hist-t2',
        step: 10,
        title: 'Seal Shattered & Passage Opened',
        message:
          'The central ward dissolved with a low resonant hum, opening the descent into the deep ruins.',
      },
    ],
  },
];

export const BASE_EVENT_IDS = new Set([
  'dark-gate',
  'scene-word-count',
  'campaign-quest',
  'hist-ancient-seal',
]);
