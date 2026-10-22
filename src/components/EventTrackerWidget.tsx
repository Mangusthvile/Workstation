import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  X,
  Minus,
  Maximize2,
  CalendarCheck2,
  Plus,
  RotateCcw,
  Check,
  Repeat,
  Trash2,
  Edit3,
  Search,
  Tag,
  Award,
  Target,
  Flame,
  Star,
  Trophy,
  BookOpen,
  Shield,
  Zap,
  Flag,
  CheckCircle2,
  Dumbbell,
  Heart,
  Bookmark,
  Compass,
  Crown,
  Copy,
  ChevronRight,
  Sliders,
  CheckSquare,
  Square,
  BellRing,
  Lock,
  ChevronDown,
  ChevronUp,
  Clock,
  Sparkles,
  History,
  Archive,
  Undo2,
  FileText,
  CheckCheck,
  Globe,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';

type ResizeDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export type ProgressBarStyle =
  | 'segmented-blocks'
  | 'smooth-linear'
  | 'segmented-pips'
  | 'circular-ring'
  | 'milestone-nodes';

export type EventBgTheme =
  | 'white'
  | 'slate'
  | 'sage'
  | 'indigo'
  | 'amber'
  | 'rose'
  | 'noir';

export type EventIconName =
  | 'target'
  | 'flame'
  | 'star'
  | 'trophy'
  | 'book'
  | 'shield'
  | 'zap'
  | 'flag'
  | 'check'
  | 'dumbbell'
  | 'heart'
  | 'bookmark'
  | 'compass'
  | 'crown'
  | 'clock';

export interface EventThreshold {
  id: string;
  step: number;
  title?: string;
  message: string;
}

export interface TimelineMarker {
  id: string;
  cycle: number;
  label: string; // e.g. "Completed 1x Day 6"
  timestamp?: string;
}

export interface TrackedEvent {
  id: string;
  title: string;
  subtitle?: string;
  statusEmoji?: string;
  statusLabel?: string;
  startedDate?: string;
  endedDate?: string;
  currentStep: number;
  totalSteps: number;
  progressUnit: string; // e.g. 'Days', 'Steps', 'Points', 'Hours', 'Words'
  isRepeatable: boolean;
  completionCount: number;
  lastCompletedText?: string; // e.g. "Completed Day 3"
  selected: boolean;
  notes?: string;
  specialNote?: string;
  icon: EventIconName;
  iconColor: string;
  bgTheme: EventBgTheme;
  progressStyle: ProgressBarStyle;
  tags: string[];
  thresholds: EventThreshold[];
  timelineMarkers?: TimelineMarker[];
  isTimelineCompressed?: boolean;
  isBaseEvent?: boolean;
  isUserCreated?: boolean;
}

export interface CompletedEventRecord {
  id: string;
  originalEventId: string;
  title: string;
  subtitle?: string;
  statusEmoji?: string;
  statusLabel?: string;
  startedDate?: string;
  endedDate?: string;
  completedAt: string; // e.g. "Completed Day 3"
  totalSteps: number;
  finalSteps: number;
  progressUnit: string;
  isRepeatable: boolean;
  cycleNumber?: number;
  completionCountAtArchive: number;
  icon: EventIconName;
  iconColor: string;
  bgTheme: EventBgTheme;
  progressStyle: ProgressBarStyle;
  tags: string[];
  notes?: string;
  specialNote?: string;
  thresholds: EventThreshold[];
  timelineMarkers?: TimelineMarker[];
  isBaseEvent?: boolean;
  isUserCreated?: boolean;
}

interface EventTrackerWidgetProps {
  isMinimized: boolean;
  zIndex: number;
  onFocus: () => void;
  onMinimize: () => void;
  onClose: () => void;
}

const AVAILABLE_ICONS: {
  name: EventIconName;
  label: string;
  component: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}[] = [
  { name: 'target', label: 'Target', component: Target },
  { name: 'flame', label: 'Flame', component: Flame },
  { name: 'star', label: 'Star', component: Star },
  { name: 'trophy', label: 'Trophy', component: Trophy },
  { name: 'book', label: 'Book', component: BookOpen },
  { name: 'shield', label: 'Shield', component: Shield },
  { name: 'zap', label: 'Energy', component: Zap },
  { name: 'flag', label: 'Milestone', component: Flag },
  { name: 'check', label: 'Verified', component: CheckCircle2 },
  { name: 'dumbbell', label: 'Power', component: Dumbbell },
  { name: 'heart', label: 'Life', component: Heart },
  { name: 'bookmark', label: 'Lore', component: Bookmark },
  { name: 'compass', label: 'Quest', component: Compass },
  { name: 'crown', label: 'Mastery', component: Crown },
  { name: 'clock', label: 'Clock', component: Clock },
];

const COLOR_PALETTE = [
  { label: 'Obsidian', value: '#171717' },
  { label: 'Crimson', value: '#E11D48' },
  { label: 'Amber', value: '#D97706' },
  { label: 'Emerald', value: '#059669' },
  { label: 'Sky', value: '#0284C7' },
  { label: 'Violet', value: '#7C3AED' },
  { label: 'Rose', value: '#DB2777' },
];

const BG_THEMES: { id: EventBgTheme; label: string; cardClass: string; isDark?: boolean }[] = [
  { id: 'white', label: 'Clean White', cardClass: 'bg-white border-neutral-200/90 text-neutral-900 shadow-sm' },
  { id: 'slate', label: 'Cool Slate', cardClass: 'bg-slate-50 border-slate-200/90 text-slate-900 shadow-sm' },
  { id: 'sage', label: 'Mint Sage', cardClass: 'bg-emerald-50/70 border-emerald-200/80 text-emerald-950 shadow-sm' },
  { id: 'indigo', label: 'Soft Indigo', cardClass: 'bg-indigo-50/70 border-indigo-200/80 text-indigo-950 shadow-sm' },
  { id: 'amber', label: 'Warm Amber', cardClass: 'bg-amber-50/75 border-amber-200/80 text-amber-950 shadow-sm' },
  { id: 'rose', label: 'Blush Rose', cardClass: 'bg-rose-50/70 border-rose-200/80 text-rose-950 shadow-sm' },
  { id: 'noir', label: 'Cyber Noir', cardClass: 'bg-neutral-900 border-neutral-700/80 text-white shadow-md', isDark: true },
];

const PROGRESS_STYLES: {
  id: ProgressBarStyle;
  label: string;
  desc: string;
}[] = [
  {
    id: 'segmented-blocks',
    label: 'Segmented Checkpoint Blocks',
    desc: 'Numbered step boxes / grid matrix with active fill (e.g. 10 per row)',
  },
  {
    id: 'smooth-linear',
    label: 'Continuous Smooth Bar',
    desc: 'Sleek rounded progress bar with real-time percentage fill',
  },
  {
    id: 'segmented-pips',
    label: 'Segmented Pips',
    desc: 'Battery-style multi charge pips (discrete pills)',
  },
  {
    id: 'circular-ring',
    label: 'Radial Ring Gauge',
    desc: 'Circular SVG donut meter with progress in the center',
  },
  {
    id: 'milestone-nodes',
    label: 'Milestone Nodes',
    desc: 'Connected timeline stepper with linked checkpoints',
  },
];

const STATUS_OPTIONS = [
  { emoji: '🟩', label: 'Active' },
  { emoji: '🟨', label: 'Frozen / Paused' },
  { emoji: '🟥', label: 'Critical / Urgent' },
  { emoji: '🟦', label: 'Complete / Sealed' },
];

const UNIT_PRESETS = [
  'Days',
  'Steps',
  'Points',
  'Hours',
  'Words',
  'Pages',
  'Sessions',
  'Charges',
];

const formatProgressUnitLabel = (count: number, unit: string) => {
  const clean = (unit || 'Steps').trim();
  if (count === 1 && clean.endsWith('s') && clean.length > 2) {
    return clean.slice(0, -1);
  }
  return clean;
};

// Format marker label for repeated events (e.g. "Completed 1x Day 6", "Completed 2x Day 9")
export const getRepeatableMarkerLabel = (
  event: { progressUnit?: string; startedDate?: string; totalSteps: number },
  cycleIndex: number
) => {
  const unit = (event.progressUnit || 'Days').trim();
  const unitLower = unit.toLowerCase();
  const match = (event.startedDate || '').match(/\d+/);

  if (unitLower.includes('day')) {
    const startDay = match ? parseInt(match[0], 10) : 1;
    // e.g. Started Day 3, totalSteps 3 (or cycle): Day 3 + 1*totalSteps
    // User requested: Started Day 3 - Completed 1x Day 6 - Completed 2x Day 9
    // If totalSteps is 3: 3 + 1*3 = 6, 3 + 2*3 = 9.
    // If totalSteps is not 3, use totalSteps (or at least 3)
    const stepInterval = Math.max(1, event.totalSteps);
    const completedDay = startDay + cycleIndex * stepInterval;
    return `Completed ${cycleIndex}x Day ${completedDay}`;
  }

  if (unitLower.includes('step')) {
    return `Completed ${cycleIndex}x (${cycleIndex * event.totalSteps} Steps)`;
  }

  if (unitLower.includes('point')) {
    return `Completed ${cycleIndex}x (${cycleIndex * event.totalSteps} Points)`;
  }

  if (unitLower.includes('hour')) {
    const startHr = match ? parseInt(match[0], 10) : 0;
    return `Completed ${cycleIndex}x Hour ${startHr + cycleIndex * event.totalSteps}`;
  }

  if (unitLower.includes('session')) {
    const startSess = match ? parseInt(match[0], 10) : 1;
    return `Completed ${cycleIndex}x Session ${startSess + (cycleIndex - 1)}`;
  }

  return `Completed ${cycleIndex}x (${cycleIndex * event.totalSteps} ${unit})`;
};

const getRepeatableCompletionStamp = (
  event: { progressUnit?: string; startedDate?: string; totalSteps: number },
  cycleIndex: number
) => {
  return getRepeatableMarkerLabel(event, cycleIndex);
};

// Retrieve or synthesize effective timeline markers for repeatable events
export const getEffectiveTimelineMarkers = (
  event: TrackedEvent | CompletedEventRecord
): TimelineMarker[] => {
  if (event.timelineMarkers && event.timelineMarkers.length > 0) {
    return event.timelineMarkers;
  }
  if (event.isRepeatable) {
    const count =
      'completionCount' in event
        ? event.completionCount
        : 'completionCountAtArchive' in event
        ? event.completionCountAtArchive
        : 0;
    if (count > 0) {
      return Array.from({ length: count }).map((_, idx) => {
        const cycle = idx + 1;
        return {
          id: `auto-m-${event.id}-${cycle}`,
          cycle,
          label: getRepeatableMarkerLabel(event, cycle),
        };
      });
    }
  }
  return [];
};

export const getNextCycleMarkers = (
  event: TrackedEvent,
  nextCycle: number
): TimelineMarker[] => {
  const existing = getEffectiveTimelineMarkers(event);
  const newMarker: TimelineMarker = {
    id: `marker-${Date.now()}-${nextCycle}`,
    cycle: nextCycle,
    label: getRepeatableMarkerLabel(event, nextCycle),
    timestamp: new Date().toLocaleDateString(),
  };
  return [...existing.filter((m) => m.cycle !== nextCycle), newMarker].sort(
    (a, b) => a.cycle - b.cycle
  );
};

const INITIAL_EVENTS: TrackedEvent[] = [
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

const INITIAL_HISTORY: CompletedEventRecord[] = [
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

export const loadInitialEvents = (): TrackedEvent[] => {
  try {
    const isBasePurged = localStorage.getItem('WORLD_CLOCK_BASE_EVENTS_PURGED') === 'true';

    // 1. Authoritative active events key
    const saved = localStorage.getItem('WORLD_CLOCK_EVENTS_V1');
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        if (isBasePurged) {
          return parsed.filter((e) => !BASE_EVENT_IDS.has(e.id) && !e.isBaseEvent);
        }
        return parsed;
      }
    }

    // 2. Permanent custom backup key
    const permanent = localStorage.getItem('WORLD_CLOCK_USER_CUSTOM_EVENTS_PERMANENT');
    if (permanent) {
      const parsed = JSON.parse(permanent);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }

    if (isBasePurged) {
      return [];
    }
  } catch (e) {
    console.warn('Failed to load events from storage:', e);
  }
  return INITIAL_EVENTS;
};

export const loadInitialHistory = (): CompletedEventRecord[] => {
  try {
    const isBasePurged = localStorage.getItem('WORLD_CLOCK_BASE_EVENTS_PURGED') === 'true';
    const saved = localStorage.getItem('WORLD_CLOCK_HISTORY_V1');
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        if (isBasePurged) {
          return parsed.filter((h) => !BASE_EVENT_IDS.has(h.id) && !h.isBaseEvent);
        }
        return parsed;
      }
    }
    if (isBasePurged) {
      return [];
    }
  } catch (e) {
    console.warn('Failed to load history from storage:', e);
  }
  return INITIAL_HISTORY;
};

export const EventTrackerWidget: React.FC<EventTrackerWidgetProps> = ({
  isMinimized,
  zIndex,
  onFocus,
  onMinimize,
  onClose,
}) => {
  // Widget Window Frame State
  const [position, setPosition] = useState({ x: 280, y: 55 });
  const [size, setSize] = useState({ width: 700, height: 620 });
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Primary View Navigation: 'active' World Clock vs 'history' Chronicle
  const [activeViewTab, setActiveViewTab] = useState<'active' | 'history'>('active');

  // Dragging & Resizing Refs
  const isDraggingRef = useRef(false);
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const initialPosRef = useRef({ x: 0, y: 0 });

  const isResizingRef = useRef(false);
  const resizeDirRef = useRef<ResizeDir | null>(null);
  const resizeStartPosRef = useRef({ x: 0, y: 0 });
  const initialSizeRef = useRef({ width: 0, height: 0 });
  const initialWindowPosRef = useRef({ x: 0, y: 0 });

  // Main Event State & History Records (Persisted to localStorage so updates maintain user events)
  const [events, setEvents] = useState<TrackedEvent[]>(loadInitialEvents);
  const [historyEvents, setHistoryEvents] = useState<CompletedEventRecord[]>(loadInitialHistory);

  // Timeline Compression per Event (e.g. compress intermediate markers to save space)
  const [compressedTimelines, setCompressedTimelines] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('WORLD_CLOCK_COMPRESSED_TIMELINES_V1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed === 'object' && parsed !== null) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load compressed timeline states:', e);
    }
    return { 'scene-word-count': true };
  });

  // Threshold alert toast and popped-to-top event tracking
  const [recentlyTriggeredEventId, setRecentlyTriggeredEventId] = useState<string | null>(null);
  const [thresholdAlertToast, setThresholdAlertToast] = useState<{
    eventId: string;
    title: string;
    threshTitle?: string;
    step: number;
    totalSteps: number;
    unit: string;
  } | null>(null);

  useEffect(() => {
    if (!thresholdAlertToast) return;
    const timer = setTimeout(() => {
      setThresholdAlertToast(null);
    }, 8000);
    return () => clearTimeout(timer);
  }, [thresholdAlertToast]);

  // Automatically sync to localStorage whenever events change
  // Automatically sync to localStorage whenever events change
  useEffect(() => {
    try {
      localStorage.setItem('WORLD_CLOCK_EVENTS_V1', JSON.stringify(events));
      localStorage.setItem(
        'WORLD_CLOCK_USER_CUSTOM_EVENTS_PERMANENT',
        JSON.stringify(events)
      );
    } catch (e) {
      console.warn('Failed to save events to storage:', e);
    }
  }, [events]);

  // Automatically sync to localStorage whenever history records change
  useEffect(() => {
    try {
      localStorage.setItem('WORLD_CLOCK_HISTORY_V1', JSON.stringify(historyEvents));
    } catch (e) {
      console.warn('Failed to save history to storage:', e);
    }
  }, [historyEvents]);

  // Automatically sync timeline compression states
  useEffect(() => {
    try {
      localStorage.setItem('WORLD_CLOCK_COMPRESSED_TIMELINES_V1', JSON.stringify(compressedTimelines));
    } catch (e) {
      console.warn('Failed to save compressed timeline states:', e);
    }
  }, [compressedTimelines]);

  // Listen for workstation-wide load progress events
  useEffect(() => {
    const handleReload = () => {
      setEvents(loadInitialEvents());
      setHistoryEvents(loadInitialHistory());
    };
    window.addEventListener('workstation-progress-loaded', handleReload);
    return () => window.removeEventListener('workstation-progress-loaded', handleReload);
  }, []);

  const toggleCompressTimeline = (id: string) => {
    setCompressedTimelines((prev) => {
      const targetEvent = events.find((e) => e.id === id);
      const markersCount = targetEvent ? getEffectiveTimelineMarkers(targetEvent).length : 0;
      const currentVal = prev[id] !== undefined ? prev[id] : markersCount >= 2;
      return {
        ...prev,
        [id]: !currentVal,
      };
    });
  };

  const areAllTimelinesCompressed = useMemo(() => {
    const eventsWithMarkers = events.filter((e) => getEffectiveTimelineMarkers(e).length > 0);
    if (eventsWithMarkers.length === 0) return true;
    return eventsWithMarkers.every((e) => compressedTimelines[e.id] !== false);
  }, [events, compressedTimelines]);

  const toggleAllTimelinesCompression = () => {
    const targetState = !areAllTimelinesCompressed;
    const updated: Record<string, boolean> = {};
    events.forEach((e) => {
      updated[e.id] = targetState;
    });
    setCompressedTimelines(updated);
  };

  const hasBaseEvents = useMemo(() => {
    return events.some((e) => BASE_EVENT_IDS.has(e.id) || e.isBaseEvent);
  }, [events]);

  const purgeBaseEvents = () => {
    setEvents((prev) => {
      const filtered = prev.filter((e) => !BASE_EVENT_IDS.has(e.id) && !e.isBaseEvent);
      try {
        localStorage.setItem('WORLD_CLOCK_BASE_EVENTS_PURGED', 'true');
        localStorage.setItem('WORLD_CLOCK_EVENTS_V1', JSON.stringify(filtered));
        localStorage.setItem('WORLD_CLOCK_USER_CUSTOM_EVENTS_PERMANENT', JSON.stringify(filtered));
      } catch (e) {
        console.warn('Storage save failed:', e);
      }
      return filtered;
    });
  };

  const [expandedThresholdAccordions, setExpandedThresholdAccordions] = useState<Record<string, boolean>>({
    'dark-gate': true,
    'hist-ancient-seal': true,
  });

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('all');
  const [filterMode, setFilterMode] = useState<'all' | 'repeatable' | 'single'>('all');

  // History Specific Search & Filter
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyTagFilter, setHistoryTagFilter] = useState<string>('all');

  // Modal State for New/Edit Event
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formSubtitle, setFormSubtitle] = useState('');
  const [formStatusEmoji, setFormStatusEmoji] = useState('🟩');
  const [formStatusLabel, setFormStatusLabel] = useState('Active');
  const [formStartedDate, setFormStartedDate] = useState('Day 3');
  const [formEndedDate, setFormEndedDate] = useState('Day ?');
  const [formTotalSteps, setFormTotalSteps] = useState(30);
  const [formProgressUnit, setFormProgressUnit] = useState('Days');
  const [formIsRepeatable, setFormIsRepeatable] = useState(false);
  const [formNotes, setFormNotes] = useState('');
  const [formSpecialNote, setFormSpecialNote] = useState('');
  const [formIcon, setFormIcon] = useState<EventIconName>('crown');
  const [formIconColor, setFormIconColor] = useState('#7C3AED');
  const [formBgTheme, setFormBgTheme] = useState<EventBgTheme>('noir');
  const [formProgressStyle, setFormProgressStyle] = useState<ProgressBarStyle>('segmented-blocks');
  const [formTagsString, setFormTagsString] = useState('dark-world, portal');
  const [formThresholds, setFormThresholds] = useState<EventThreshold[]>([]);

  // Dragging Handlers
  const handleDragDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isFullScreen) return;
    if ((e.target as HTMLElement).closest('button, input, select, textarea')) return;
    isDraggingRef.current = true;
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    initialPosRef.current = { ...position };
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    onFocus();
  };

  const handleDragMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartPosRef.current.x;
    const dy = e.clientY - dragStartPosRef.current.y;
    setPosition({
      x: Math.max(10, initialPosRef.current.x + dx),
      y: Math.max(10, initialPosRef.current.y + dy),
    });
  };

  const handleDragUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    } catch {
      // safe fallback
    }
  };

  // Resize Handlers
  const handleResizeDown = (dir: ResizeDir, e: React.PointerEvent) => {
    if (isFullScreen) return;
    e.stopPropagation();
    isResizingRef.current = true;
    resizeDirRef.current = dir;
    resizeStartPosRef.current = { x: e.clientX, y: e.clientY };
    initialSizeRef.current = { ...size };
    initialWindowPosRef.current = { ...position };
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    onFocus();
  };

  const handleResizeMove = (e: React.PointerEvent) => {
    if (!isResizingRef.current || !resizeDirRef.current) return;
    const dx = e.clientX - resizeStartPosRef.current.x;
    const dy = e.clientY - resizeStartPosRef.current.y;
    const dir = resizeDirRef.current;

    let newWidth = initialSizeRef.current.width;
    let newHeight = initialSizeRef.current.height;
    let newX = initialWindowPosRef.current.x;
    let newY = initialWindowPosRef.current.y;

    if (dir.includes('e')) newWidth = Math.max(420, initialSizeRef.current.width + dx);
    if (dir.includes('s')) newHeight = Math.max(380, initialSizeRef.current.height + dy);
    if (dir.includes('w')) {
      const calculatedWidth = initialSizeRef.current.width - dx;
      if (calculatedWidth >= 420) {
        newWidth = calculatedWidth;
        newX = initialWindowPosRef.current.x + dx;
      }
    }
    if (dir.includes('n')) {
      const calculatedHeight = initialSizeRef.current.height - dy;
      if (calculatedHeight >= 380) {
        newHeight = calculatedHeight;
        newY = initialWindowPosRef.current.y + dy;
      }
    }

    setSize({ width: newWidth, height: newHeight });
    setPosition({ x: newX, y: newY });
  };

  const handleResizeUp = (e: React.PointerEvent) => {
    if (!isResizingRef.current) return;
    isResizingRef.current = false;
    resizeDirRef.current = null;
    try {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    } catch {
      // safe fallback
    }
  };

  // Collect ALL existing tags across active events AND history records for auto-input
  const allExistingTags = useMemo(() => {
    const tagSet = new Set<string>();
    events.forEach((e) => e.tags.forEach((t) => tagSet.add(t.toLowerCase().trim())));
    historyEvents.forEach((h) => h.tags.forEach((t) => tagSet.add(t.toLowerCase().trim())));
    return Array.from(tagSet).filter(Boolean).sort();
  }, [events, historyEvents]);

  // Current tags array in the form
  const activeFormTagsList = useMemo(() => {
    return formTagsString
      .split(',')
      .map((t) => t.trim().toLowerCase().replace(/^#/, ''))
      .filter(Boolean);
  }, [formTagsString]);

  // Toggle/auto-input existing tag in form
  const toggleFormTag = (tag: string) => {
    const normalized = tag.toLowerCase().trim().replace(/^#/, '');
    if (activeFormTagsList.includes(normalized)) {
      // Remove
      const filtered = activeFormTagsList.filter((t) => t !== normalized);
      setFormTagsString(filtered.join(', '));
    } else {
      // Add / auto-input
      const updated = [...activeFormTagsList, normalized];
      setFormTagsString(updated.join(', '));
    }
  };

  // Unique Tags for Active Filter Strip
  const allUniqueTags = useMemo(() => {
    const tagSet = new Set<string>();
    events.forEach((e) => e.tags.forEach((t) => tagSet.add(t.toLowerCase().trim())));
    return Array.from(tagSet).sort();
  }, [events]);

  // Unique Tags for History Filter Strip
  const allHistoryTags = useMemo(() => {
    const tagSet = new Set<string>();
    historyEvents.forEach((e) => e.tags.forEach((t) => tagSet.add(t.toLowerCase().trim())));
    return Array.from(tagSet).sort();
  }, [historyEvents]);

  const selectedCount = events.filter((e) => e.selected).length;
  const allSelected = events.length > 0 && selectedCount === events.length;

  // Archive an event into History
  const archiveEvent = (id: string, options?: { isManual?: boolean }) => {
    const target = events.find((e) => e.id === id);
    if (!target) return;

    const completionStamp = target.isRepeatable
      ? getRepeatableCompletionStamp(target, target.completionCount || 1)
      : target.endedDate && target.endedDate !== 'Day ?'
      ? `Completed ${target.endedDate}`
      : `Completed (${target.currentStep} ${target.progressUnit || 'Days'})`;

    const historyRecord: CompletedEventRecord = {
      id: `hist-${Date.now()}-${target.id}`,
      originalEventId: target.id,
      title: target.title,
      subtitle: target.subtitle,
      statusEmoji: '🟦',
      statusLabel: 'Completed & Archived',
      startedDate: target.startedDate,
      endedDate: target.endedDate,
      completedAt: completionStamp,
      totalSteps: target.totalSteps,
      finalSteps: target.currentStep,
      progressUnit: target.progressUnit || 'Days',
      isRepeatable: target.isRepeatable,
      cycleNumber: target.isRepeatable ? target.completionCount + 1 : undefined,
      completionCountAtArchive: target.completionCount + (target.isRepeatable ? 1 : 0),
      icon: target.icon,
      iconColor: target.iconColor,
      bgTheme: target.bgTheme,
      progressStyle: target.progressStyle,
      tags: [...target.tags],
      notes: target.notes,
      specialNote: target.specialNote,
      thresholds: [...target.thresholds],
      timelineMarkers: target.timelineMarkers
        ? [...target.timelineMarkers]
        : getEffectiveTimelineMarkers(target),
    };

    setHistoryEvents((prev) => [historyRecord, ...prev]);

    // If it's a non-repeatable event or manually requested to remove, remove from active tracker
    if (!target.isRepeatable || options?.isManual) {
      setEvents((prev) => prev.filter((e) => e.id !== id));
    }
  };

  // Unified Progression Action: Advances all if all selected, or advances selected if some selected
  const handleUnifiedProgress = () => {
    if (selectedCount === 0) return;

    let firstTriggeredThresh: { event: TrackedEvent; thresh: EventThreshold } | null = null;
    const triggeredIds: string[] = [];

    setEvents((prev) => {
      const updatedList = prev.map((event) => {
        if (!event.selected) return event;

        const nextStep = event.currentStep + 1;
        const hitThresh = event.thresholds.find(
          (t) => (event.currentStep < t.step && nextStep >= t.step) || nextStep === t.step
        );

        let processed: TrackedEvent;
        if (nextStep >= event.totalSteps) {
          if (event.isRepeatable) {
            const cycleIndex = event.completionCount + 1;
            const updatedMarkers = getNextCycleMarkers(event, cycleIndex);
            const completionStamp = getRepeatableMarkerLabel(event, cycleIndex);

            // Also archive this completed cycle into history
            const historyRecord: CompletedEventRecord = {
              id: `hist-${Date.now()}-${event.id}-cycle-${cycleIndex}`,
              originalEventId: event.id,
              title: `${event.title} (Cycle #${cycleIndex})`,
              subtitle: event.subtitle,
              statusEmoji: '🟦',
              statusLabel: `Cycle #${cycleIndex} Complete`,
              startedDate: event.startedDate,
              endedDate: event.endedDate || completionStamp,
              completedAt: completionStamp,
              totalSteps: event.totalSteps,
              finalSteps: event.totalSteps,
              progressUnit: event.progressUnit || 'Days',
              isRepeatable: true,
              cycleNumber: cycleIndex,
              completionCountAtArchive: cycleIndex,
              icon: event.icon,
              iconColor: event.iconColor,
              bgTheme: event.bgTheme,
              progressStyle: event.progressStyle,
              tags: [...event.tags],
              notes: event.notes,
              specialNote: event.specialNote,
              thresholds: [...event.thresholds],
              timelineMarkers: updatedMarkers,
            };
            setHistoryEvents((hPrev) => [historyRecord, ...hPrev]);

            processed = {
              ...event,
              currentStep: 0,
              completionCount: cycleIndex,
              lastCompletedText: completionStamp,
              timelineMarkers: updatedMarkers,
            };
          } else {
            processed = {
              ...event,
              currentStep: event.totalSteps,
              completionCount: Math.max(1, event.completionCount),
            };
          }
        } else {
          processed = { ...event, currentStep: nextStep };
        }

        if (hitThresh) {
          triggeredIds.push(processed.id);
          if (!firstTriggeredThresh) {
            firstTriggeredThresh = { event: processed, thresh: hitThresh };
          }
        }

        return processed;
      });

      // If any events triggered thresholds, pop them to top of list!
      if (triggeredIds.length > 0) {
        const topEvents = updatedList.filter((e) => triggeredIds.includes(e.id));
        const restEvents = updatedList.filter((e) => !triggeredIds.includes(e.id));
        return [...topEvents, ...restEvents];
      }

      return updatedList;
    });

    if (firstTriggeredThresh) {
      const item = firstTriggeredThresh as { event: TrackedEvent; thresh: EventThreshold };
      setRecentlyTriggeredEventId(item.event.id);
      setExpandedThresholdAccordions((prev) => {
        const acc = { ...prev };
        triggeredIds.forEach((tid) => {
          acc[tid] = true;
        });
        return acc;
      });
      setThresholdAlertToast({
        eventId: item.event.id,
        title: item.event.title,
        threshTitle: item.thresh.title || item.thresh.message.slice(0, 50),
        step: item.thresh.step,
        totalSteps: item.event.totalSteps,
        unit: item.event.progressUnit || 'Days',
      });
    }
  };

  // Advance single event - pops to top when threshold is reached
  const progressSingleEvent = (id: string) => {
    let triggeredThreshold: EventThreshold | null = null;
    let updatedTarget: TrackedEvent | null = null;

    setEvents((prev) => {
      const target = prev.find((e) => e.id === id);
      if (!target) return prev;

      const nextStep = target.currentStep + 1;

      // Check if advancing hit a threshold
      triggeredThreshold =
        target.thresholds.find(
          (t) => (target.currentStep < t.step && nextStep >= t.step) || nextStep === t.step
        ) || null;

      let processedEvent: TrackedEvent;

      if (nextStep >= target.totalSteps) {
        if (target.isRepeatable) {
          const cycleIndex = target.completionCount + 1;
          const updatedMarkers = getNextCycleMarkers(target, cycleIndex);
          const completionStamp = getRepeatableMarkerLabel(target, cycleIndex);

          const historyRecord: CompletedEventRecord = {
            id: `hist-${Date.now()}-${target.id}-cycle-${cycleIndex}`,
            originalEventId: target.id,
            title: `${target.title} (Cycle #${cycleIndex})`,
            subtitle: target.subtitle,
            statusEmoji: '🟦',
            statusLabel: `Cycle #${cycleIndex} Complete`,
            startedDate: target.startedDate,
            endedDate: target.endedDate || completionStamp,
            completedAt: completionStamp,
            totalSteps: target.totalSteps,
            finalSteps: target.totalSteps,
            progressUnit: target.progressUnit || 'Days',
            isRepeatable: true,
            cycleNumber: cycleIndex,
            completionCountAtArchive: cycleIndex,
            icon: target.icon,
            iconColor: target.iconColor,
            bgTheme: target.bgTheme,
            progressStyle: target.progressStyle,
            tags: [...target.tags],
            notes: target.notes,
            specialNote: target.specialNote,
            thresholds: [...target.thresholds],
            timelineMarkers: updatedMarkers,
          };
          setHistoryEvents((hPrev) => [historyRecord, ...hPrev]);

          processedEvent = {
            ...target,
            currentStep: 0,
            completionCount: cycleIndex,
            lastCompletedText: completionStamp,
            timelineMarkers: updatedMarkers,
          };
        } else {
          processedEvent = {
            ...target,
            currentStep: target.totalSteps,
            completionCount: Math.max(1, target.completionCount),
          };
        }
      } else {
        processedEvent = { ...target, currentStep: nextStep };
      }

      updatedTarget = processedEvent;

      // If a threshold is reached (or has any reached threshold), POP TO TOP OF THE LIST!
      const hasReachedThreshold = processedEvent.thresholds.some((t) => processedEvent.currentStep >= t.step);
      if (triggeredThreshold || hasReachedThreshold) {
        return [processedEvent, ...prev.filter((e) => e.id !== id)];
      }

      return prev.map((e) => (e.id === id ? processedEvent : e));
    });

    if (triggeredThreshold && updatedTarget) {
      const th = triggeredThreshold as EventThreshold;
      const ev = updatedTarget as TrackedEvent;
      setRecentlyTriggeredEventId(id);
      setExpandedThresholdAccordions((prev) => ({ ...prev, [id]: true }));
      setThresholdAlertToast({
        eventId: id,
        title: ev.title,
        threshTitle: th.title || th.message.slice(0, 50),
        step: th.step,
        totalSteps: ev.totalSteps,
        unit: ev.progressUnit || 'Days',
      });
    }
  };

  // Direct step selection - pops to top when threshold is reached
  const setEventStep = (id: string, stepIndex: number) => {
    let triggeredThreshold: EventThreshold | null = null;
    let updatedTarget: TrackedEvent | null = null;

    setEvents((prev) => {
      const target = prev.find((e) => e.id === id);
      if (!target) return prev;

      let targetStep = stepIndex + 1;
      if (target.currentStep === targetStep) {
        targetStep = stepIndex; // step backward
      }

      triggeredThreshold =
        target.thresholds.find(
          (t) => (target.currentStep < t.step && targetStep >= t.step) || targetStep === t.step
        ) || null;

      let processedEvent: TrackedEvent;

      if (targetStep >= target.totalSteps) {
        if (target.isRepeatable) {
          const cycleIndex = target.completionCount + 1;
          const updatedMarkers = getNextCycleMarkers(target, cycleIndex);
          const completionStamp = getRepeatableMarkerLabel(target, cycleIndex);

          processedEvent = {
            ...target,
            currentStep: 0,
            completionCount: cycleIndex,
            lastCompletedText: completionStamp,
            timelineMarkers: updatedMarkers,
          };
        } else {
          processedEvent = {
            ...target,
            currentStep: target.totalSteps,
            completionCount: Math.max(1, target.completionCount),
          };
        }
      } else {
        processedEvent = { ...target, currentStep: targetStep };
      }

      updatedTarget = processedEvent;

      // If a threshold is reached, POP TO TOP OF THE LIST!
      const hasReachedThreshold = processedEvent.thresholds.some((t) => processedEvent.currentStep >= t.step);
      if (triggeredThreshold || hasReachedThreshold) {
        return [processedEvent, ...prev.filter((e) => e.id !== id)];
      }

      return prev.map((e) => (e.id === id ? processedEvent : e));
    });

    if (triggeredThreshold && updatedTarget) {
      const th = triggeredThreshold as EventThreshold;
      const ev = updatedTarget as TrackedEvent;
      setRecentlyTriggeredEventId(id);
      setExpandedThresholdAccordions((prev) => ({ ...prev, [id]: true }));
      setThresholdAlertToast({
        eventId: id,
        title: ev.title,
        threshTitle: th.title || th.message.slice(0, 50),
        step: th.step,
        totalSteps: ev.totalSteps,
        unit: ev.progressUnit || 'Days',
      });
    }
  };

  // Selection toggles
  const toggleSelectEvent = (id: string) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, selected: !e.selected } : e))
    );
  };

  const toggleSelectAll = () => {
    const shouldSelect = !allSelected;
    setEvents((prev) => prev.map((e) => ({ ...e, selected: shouldSelect })));
  };

  const resetEvent = (id: string) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === id
          ? { ...e, currentStep: 0, completionCount: 0, timelineMarkers: [] }
          : e
      )
    );
  };

  const deleteEvent = (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  // Restore completed event from History back into Active Tracker
  const restoreFromHistory = (histItem: CompletedEventRecord) => {
    const restoredEvent: TrackedEvent = {
      id: `restored-${Date.now()}-${histItem.originalEventId}`,
      title: histItem.title.replace(/\s\(Cycle\s#\d+\)$/, ''),
      subtitle: histItem.subtitle,
      statusEmoji: '🟩',
      statusLabel: 'Active (Restored)',
      startedDate: histItem.startedDate,
      endedDate: 'Day ?',
      currentStep: 0,
      totalSteps: histItem.totalSteps,
      progressUnit: histItem.progressUnit || 'Days',
      isRepeatable: histItem.isRepeatable,
      completionCount: histItem.completionCountAtArchive || 0,
      lastCompletedText: histItem.completedAt,
      selected: true,
      notes: histItem.notes,
      specialNote: histItem.specialNote,
      icon: histItem.icon,
      iconColor: histItem.iconColor,
      bgTheme: histItem.bgTheme,
      progressStyle: histItem.progressStyle,
      tags: [...histItem.tags],
      thresholds: [...histItem.thresholds],
      timelineMarkers: histItem.timelineMarkers
        ? [...histItem.timelineMarkers]
        : getEffectiveTimelineMarkers(histItem),
    };

    setEvents((prev) => [restoredEvent, ...prev]);
    // Remove from history
    setHistoryEvents((prev) => prev.filter((h) => h.id !== histItem.id));
    setActiveViewTab('active');
  };

  const deleteFromHistory = (histId: string) => {
    setHistoryEvents((prev) => prev.filter((h) => h.id !== histId));
  };

  const clearAllHistory = () => {
    if (window.confirm('Are you sure you want to clear all completed event records from history?')) {
      setHistoryEvents([]);
    }
  };

  // Open Form to Create
  const handleOpenCreateForm = () => {
    setEditingEventId(null);
    setFormTitle('');
    setFormSubtitle('');
    setFormStatusEmoji('🟩');
    setFormStatusLabel('Active');
    setFormStartedDate('Day 1');
    setFormEndedDate('Ongoing');
    setFormTotalSteps(5);
    setFormProgressUnit('Days');
    setFormIsRepeatable(false);
    setFormNotes('');
    setFormSpecialNote('');
    setFormIcon('clock');
    setFormIconColor('#10B981');
    setFormBgTheme('white');
    setFormProgressStyle('segmented-blocks');
    setFormTagsString('');
    setFormThresholds([]);
    setIsFormOpen(true);
  };

  // Clone from history into new event form
  const cloneFromHistory = (histItem: CompletedEventRecord) => {
    setEditingEventId(null);
    setFormTitle(`${histItem.title.replace(/\s\(Cycle\s#\d+\)$/, '')} (Copy)`);
    setFormSubtitle(histItem.subtitle || '');
    setFormStatusEmoji('🟩');
    setFormStatusLabel('Active');
    setFormStartedDate('Day 1');
    setFormEndedDate('Day ?');
    setFormTotalSteps(histItem.totalSteps);
    setFormProgressUnit(histItem.progressUnit || 'Days');
    setFormIsRepeatable(histItem.isRepeatable);
    setFormNotes(histItem.notes || '');
    setFormSpecialNote(histItem.specialNote || '');
    setFormIcon(histItem.icon);
    setFormIconColor(histItem.iconColor);
    setFormBgTheme(histItem.bgTheme);
    setFormProgressStyle(histItem.progressStyle);
    setFormTagsString(histItem.tags.join(', '));
    setFormThresholds(
      histItem.thresholds.map((t, i) => ({
        ...t,
        id: `t-clone-${Date.now()}-${i}`,
      }))
    );
    setIsFormOpen(true);
  };

  // Open Form to Edit
  const handleOpenEditForm = (event: TrackedEvent) => {
    setEditingEventId(event.id);
    setFormTitle(event.title);
    setFormSubtitle(event.subtitle || '');
    setFormStatusEmoji(event.statusEmoji || '🟩');
    setFormStatusLabel(event.statusLabel || 'Active');
    setFormStartedDate(event.startedDate || '');
    setFormEndedDate(event.endedDate || '');
    setFormTotalSteps(event.totalSteps);
    setFormProgressUnit(event.progressUnit || 'Days');
    setFormIsRepeatable(event.isRepeatable);
    setFormNotes(event.notes || '');
    setFormSpecialNote(event.specialNote || '');
    setFormIcon(event.icon);
    setFormIconColor(event.iconColor);
    setFormBgTheme(event.bgTheme);
    setFormProgressStyle(event.progressStyle);
    setFormTagsString(event.tags.join(', '));
    setFormThresholds([...event.thresholds]);
    setIsFormOpen(true);
  };

  // Save Event from Form
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const parsedTags = formTagsString
      .split(',')
      .map((t) => t.trim().toLowerCase().replace(/^#/, ''))
      .filter(Boolean);

    const validThresholds = formThresholds
      .filter((t) => t.message.trim().length > 0)
      .sort((a, b) => a.step - b.step);

    const cleanUnit = formProgressUnit.trim() || 'Days';

    if (editingEventId) {
      setEvents((prev) =>
        prev.map((ev) => {
          if (ev.id !== editingEventId) return ev;
          return {
            ...ev,
            title: formTitle.trim(),
            subtitle: formSubtitle.trim() || undefined,
            statusEmoji: formStatusEmoji,
            statusLabel: formStatusLabel.trim() || undefined,
            startedDate: formStartedDate.trim() || undefined,
            endedDate: formEndedDate.trim() || undefined,
            totalSteps: Math.max(1, formTotalSteps),
            currentStep: Math.min(ev.currentStep, formTotalSteps),
            progressUnit: cleanUnit,
            isRepeatable: formIsRepeatable,
            notes: formNotes.trim() || undefined,
            specialNote: formSpecialNote.trim() || undefined,
            icon: formIcon,
            iconColor: formIconColor,
            bgTheme: formBgTheme,
            progressStyle: formProgressStyle,
            tags: parsedTags,
            thresholds: validThresholds,
            timelineMarkers: ev.timelineMarkers,
            isUserCreated: ev.isUserCreated || true,
          };
        })
      );
    } else {
      const newEvent: TrackedEvent = {
        id: `ev-${Date.now()}`,
        title: formTitle.trim(),
        subtitle: formSubtitle.trim() || undefined,
        statusEmoji: formStatusEmoji,
        statusLabel: formStatusLabel.trim() || undefined,
        startedDate: formStartedDate.trim() || undefined,
        endedDate: formEndedDate.trim() || undefined,
        totalSteps: Math.max(1, formTotalSteps),
        currentStep: 0,
        progressUnit: cleanUnit,
        isRepeatable: formIsRepeatable,
        completionCount: 0,
        selected: true,
        notes: formNotes.trim() || undefined,
        specialNote: formSpecialNote.trim() || undefined,
        icon: formIcon,
        iconColor: formIconColor,
        bgTheme: formBgTheme,
        progressStyle: formProgressStyle,
        tags: parsedTags,
        thresholds: validThresholds,
        isUserCreated: true,
      };
      setEvents((prev) => [newEvent, ...prev]);
    }

    setIsFormOpen(false);
    setEditingEventId(null);
  };

  // Add a threshold entry inside form
  const addThresholdToForm = () => {
    const nextStep = Math.min(
      formTotalSteps,
      formThresholds.length > 0
        ? Math.min(formTotalSteps, formThresholds[formThresholds.length - 1].step + 5)
        : Math.round(formTotalSteps / 2)
    );
    setFormThresholds((prev) => [
      ...prev,
      {
        id: `thresh-${Date.now()}-${prev.length}`,
        step: nextStep,
        title: '',
        message: '',
      },
    ]);
  };

  const removeThresholdFromForm = (index: number) => {
    setFormThresholds((prev) => prev.filter((_, i) => i !== index));
  };

  const updateThresholdField = (
    index: number,
    field: 'step' | 'title' | 'message',
    value: string | number
  ) => {
    setFormThresholds((prev) =>
      prev.map((t, i) => {
        if (i !== index) return t;
        if (field === 'step') {
          return { ...t, step: Math.max(1, Math.min(formTotalSteps, Number(value) || 1)) };
        }
        return { ...t, [field]: value };
      })
    );
  };

  // Filtered Events for Active World Clock View - events with reached thresholds pop to the top
  const filteredEvents = useMemo(() => {
    const list = events.filter((event) => {
      if (filterMode === 'repeatable' && !event.isRepeatable) return false;
      if (filterMode === 'single' && event.isRepeatable) return false;

      if (selectedTagFilter !== 'all') {
        const hasTag = event.tags.some(
          (t) => t.toLowerCase().trim() === selectedTagFilter.toLowerCase().trim()
        );
        if (!hasTag) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = event.title.toLowerCase().includes(q);
        const matchesSubtitle = event.subtitle?.toLowerCase().includes(q);
        const matchesNotes = event.notes?.toLowerCase().includes(q);
        const matchesSpecialNote = event.specialNote?.toLowerCase().includes(q);
        const matchesTag = event.tags.some((t) => t.toLowerCase().includes(q));
        const matchesThreshold = event.thresholds.some(
          (t) =>
            t.title?.toLowerCase().includes(q) ||
            t.message.toLowerCase().includes(q)
        );
        if (
          !matchesTitle &&
          !matchesSubtitle &&
          !matchesNotes &&
          !matchesSpecialNote &&
          !matchesTag &&
          !matchesThreshold
        ) {
          return false;
        }
      }

      return true;
    });

    // Pop event with reached threshold to the top of the list
    return [...list].sort((a, b) => {
      // 1. If an event was just triggered, pin it at the very top
      if (recentlyTriggeredEventId === a.id) return -1;
      if (recentlyTriggeredEventId === b.id) return 1;

      // 2. Check if a threshold was reached at current step / today
      const aHitToday = a.thresholds.some((t) => a.currentStep === t.step);
      const bHitToday = b.thresholds.some((t) => b.currentStep === t.step);
      if (aHitToday && !bHitToday) return -1;
      if (!aHitToday && bHitToday) return 1;

      // 3. Check if any threshold is reached
      const aReachedCount = a.thresholds.filter((t) => a.currentStep >= t.step).length;
      const bReachedCount = b.thresholds.filter((t) => b.currentStep >= t.step).length;
      if (aReachedCount > 0 && bReachedCount === 0) return -1;
      if (aReachedCount === 0 && bReachedCount > 0) return 1;

      return 0;
    });
  }, [events, filterMode, selectedTagFilter, searchQuery, recentlyTriggeredEventId]);

  // Filtered History Records
  const filteredHistoryEvents = useMemo(() => {
    return historyEvents.filter((item) => {
      if (historyTagFilter !== 'all') {
        const hasTag = item.tags.some(
          (t) => t.toLowerCase().trim() === historyTagFilter.toLowerCase().trim()
        );
        if (!hasTag) return false;
      }

      if (historySearchQuery.trim()) {
        const q = historySearchQuery.toLowerCase().trim();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesSubtitle = item.subtitle?.toLowerCase().includes(q);
        const matchesNotes = item.notes?.toLowerCase().includes(q);
        const matchesSpecialNote = item.specialNote?.toLowerCase().includes(q);
        const matchesTag = item.tags.some((t) => t.toLowerCase().includes(q));
        const matchesThreshold = item.thresholds.some(
          (t) =>
            t.title?.toLowerCase().includes(q) ||
            t.message.toLowerCase().includes(q)
        );
        if (
          !matchesTitle &&
          !matchesSubtitle &&
          !matchesNotes &&
          !matchesSpecialNote &&
          !matchesTag &&
          !matchesThreshold
        ) {
          return false;
        }
      }

      return true;
    });
  }, [historyEvents, historyTagFilter, historySearchQuery]);

  // Copy Summary to Clipboard
  const copySummary = () => {
    const text = events
      .map((e) => {
        const percent = Math.round((e.currentStep / e.totalSteps) * 100);
        const unit = e.progressUnit || 'Days';
        const thresholdText =
          e.thresholds.length > 0
            ? '\nThresholds:\n' +
              e.thresholds
                .map(
                  (t) =>
                    ` - ${t.step}/${e.totalSteps} ${unit}${t.title ? ` [${t.title}]` : ''}: ${t.message} (${
                      e.currentStep >= t.step ? 'REACHED' : 'PENDING'
                    })`
                )
                .join('\n')
            : '';
        const noteText = e.notes ? `\nNotes: ${e.notes}` : '';
        const specialText = e.specialNote ? `\nSpecial Note: ${e.specialNote}` : '';
        const tagsText = e.tags.length > 0 ? `\nTags: #${e.tags.join(' #')}` : '';

        return `${e.title}${e.subtitle ? ` - ${e.subtitle}` : ''}\nStatus: ${e.statusEmoji || '🟩'} ${
          e.statusLabel || ''
        }\nStarted: ${e.startedDate || 'N/A'} | Ended: ${e.endedDate || 'N/A'}\nProgress: ${
          e.currentStep
        }/${e.totalSteps} ${unit} (${percent}%)${thresholdText}${noteText}${specialText}${tagsText}\n`;
      })
      .join('\n---\n\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Copy History Log to Clipboard
  const copyHistorySummary = () => {
    if (historyEvents.length === 0) return;
    const text = historyEvents
      .map((h) => {
        const unit = h.progressUnit || 'Days';
        const thresholdText =
          h.thresholds.length > 0
            ? '\nConquered Thresholds:\n' +
              h.thresholds
                .map((t) => ` - [${t.step}/${h.totalSteps} ${unit}] ${t.title || 'Checkpoint'}: ${t.message}`)
                .join('\n')
            : '';
        return `📜 [COMPLETED] ${h.title}${h.subtitle ? ` - ${h.subtitle}` : ''}\nTimeline: ${
          h.startedDate || 'N/A'
        } → ${h.endedDate || 'Completed'}\nFinished at: ${h.finalSteps}/${h.totalSteps} ${unit} (${h.completedAt})\nTags: #${h.tags.join(
          ' #'
        )}${h.notes ? `\nNotes: ${h.notes}` : ''}${
          h.specialNote ? `\nSpecial Note: ${h.specialNote}` : ''
        }${thresholdText}\n`;
      })
      .join('\n=========================\n\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Render Icon Helper
  const renderIcon = (name: EventIconName, color: string, className = 'w-4 h-4') => {
    const iconObj = AVAILABLE_ICONS.find((i) => i.name === name) || AVAILABLE_ICONS[0];
    const IconComp = iconObj.component;
    return <IconComp className={className} style={{ color }} />;
  };

  // Toggle Threshold Accordion
  const toggleThresholdsAccordion = (eventId: string) => {
    setExpandedThresholdAccordions((prev) => ({
      ...prev,
      [eventId]: !prev[eventId],
    }));
  };

  if (isMinimized) return null;

  return (
    <div
      style={{
        zIndex,
        left: isFullScreen ? 0 : `${position.x}px`,
        top: isFullScreen ? 0 : `${position.y}px`,
        width: isFullScreen ? '100vw' : `${size.width}px`,
        height: isFullScreen ? '100vh' : `${size.height}px`,
      }}
      onClick={onFocus}
      className={`fixed flex flex-col bg-white border border-neutral-300 shadow-2xl select-none transition-[width,height] duration-75 overflow-hidden ${
        isFullScreen ? 'rounded-none' : 'rounded-2xl'
      }`}
    >
      {/* Invisible Resizing Borders */}
      {!isFullScreen && (
        <>
          <div onPointerDown={(e) => handleResizeDown('n', e)} onPointerMove={handleResizeMove} onPointerUp={handleResizeUp} className="absolute top-0 left-2 right-2 h-1.5 cursor-ns-resize z-50" />
          <div onPointerDown={(e) => handleResizeDown('s', e)} onPointerMove={handleResizeMove} onPointerUp={handleResizeUp} className="absolute bottom-0 left-2 right-2 h-1.5 cursor-ns-resize z-50" />
          <div onPointerDown={(e) => handleResizeDown('w', e)} onPointerMove={handleResizeMove} onPointerUp={handleResizeUp} className="absolute left-0 top-2 bottom-2 w-1.5 cursor-ew-resize z-50" />
          <div onPointerDown={(e) => handleResizeDown('e', e)} onPointerMove={handleResizeMove} onPointerUp={handleResizeUp} className="absolute right-0 top-2 bottom-2 w-1.5 cursor-ew-resize z-50" />
          <div onPointerDown={(e) => handleResizeDown('nw', e)} onPointerMove={handleResizeMove} onPointerUp={handleResizeUp} className="absolute -top-1.5 -left-1.5 w-3 h-3 cursor-nwse-resize z-50" />
          <div onPointerDown={(e) => handleResizeDown('ne', e)} onPointerMove={handleResizeMove} onPointerUp={handleResizeUp} className="absolute -top-1.5 -right-1.5 w-3 h-3 cursor-nesw-resize z-50" />
          <div onPointerDown={(e) => handleResizeDown('sw', e)} onPointerMove={handleResizeMove} onPointerUp={handleResizeUp} className="absolute -bottom-1.5 -left-1.5 w-3 h-3 cursor-nesw-resize z-50" />
          <div onPointerDown={(e) => handleResizeDown('se', e)} onPointerMove={handleResizeMove} onPointerUp={handleResizeUp} className="absolute -bottom-1.5 -right-1.5 w-3 h-3 cursor-nwse-resize z-50" />
        </>
      )}

      {/* Titlebar with Traffic Lights */}
      <div
        onPointerDown={handleDragDown}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragUp}
        className={`h-10 px-3 bg-neutral-100/90 border-b border-neutral-200/90 ${
          isFullScreen ? 'rounded-none' : 'rounded-t-2xl'
        } flex items-center justify-between cursor-grab active:cursor-grabbing shrink-0`}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="w-3 h-3 rounded-full bg-rose-500 hover:bg-rose-600 border border-rose-600/30 flex items-center justify-center text-rose-950 group"
            title="Close"
          >
            <X className="w-2 h-2 opacity-0 group-hover:opacity-100 font-bold" />
          </button>
          <button
            onClick={onMinimize}
            className="w-3 h-3 rounded-full bg-amber-400 hover:bg-amber-500 border border-amber-500/30 flex items-center justify-center text-amber-950 group"
            title="Minimize"
          >
            <Minus className="w-2 h-2 opacity-0 group-hover:opacity-100 font-bold" />
          </button>
          <button
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="w-3 h-3 rounded-full bg-emerald-500 hover:bg-emerald-600 border border-emerald-600/30 flex items-center justify-center text-emerald-950 group"
            title={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
          >
            <Maximize2 className="w-2 h-2 opacity-0 group-hover:opacity-100 font-bold" />
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-800">
          <Globe className="w-3.5 h-3.5 text-emerald-600" />
          <span>World Clock</span>
          {isFullScreen && (
            <span className="px-1.5 py-0.2 rounded bg-neutral-900 text-white text-[10px] font-normal">
              Full Screen
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span
            className="text-[10px] text-emerald-600 flex items-center gap-1 font-mono font-medium"
            title="All created events and progress are permanently saved in your browser"
          >
            <Check className="w-2.5 h-2.5 stroke-[3]" />
            <span className="hidden sm:inline">Saved</span>
          </span>
          <button
            onClick={activeViewTab === 'active' ? copySummary : copyHistorySummary}
            className="p-1 rounded-md hover:bg-neutral-200 text-neutral-500 hover:text-black text-[11px] flex items-center gap-1 transition-colors"
            title={activeViewTab === 'active' ? 'Copy World Clock summary to clipboard' : 'Copy Chronicle log to clipboard'}
          >
            {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Primary Navigation Tabs: World Clock vs Chronicle History */}
      <div className="flex items-center justify-between px-3 pt-2 pb-1.5 bg-neutral-100/70 border-b border-neutral-200 shrink-0">
        <div className="flex items-center gap-1 p-0.5 bg-neutral-200/80 rounded-xl">
          <button
            onClick={() => setActiveViewTab('active')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeViewTab === 'active'
                ? 'bg-white text-black shadow-xs'
                : 'text-neutral-600 hover:text-black'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            <span>World Clock</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeViewTab === 'active' ? 'bg-neutral-900 text-white' : 'bg-neutral-300 text-neutral-700'
              }`}
            >
              {events.length}
            </span>
          </button>

          <button
            onClick={() => setActiveViewTab('history')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeViewTab === 'history'
                ? 'bg-white text-black shadow-xs'
                : 'text-neutral-600 hover:text-black'
            }`}
          >
            <History className="w-3.5 h-3.5 text-amber-600" />
            <span>Chronicle & History</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                activeViewTab === 'history' ? 'bg-amber-500 text-black' : 'bg-neutral-300 text-neutral-700'
              }`}
            >
              {historyEvents.length}
            </span>
          </button>
        </div>

        {/* Action Buttons on the Right */}
        {activeViewTab === 'active' ? (
          <div className="flex items-center gap-1.5">
            {hasBaseEvents && (
              <button
                type="button"
                onClick={purgeBaseEvents}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all shadow-2xs"
                title="Remove base template events (Dark Gate, etc.) and maintain only your events"
              >
                <Trash2 className="w-3 h-3 text-rose-600" />
                <span className="hidden sm:inline">Remove Base Events</span>
                <span className="sm:hidden">Clear Base</span>
              </button>
            )}
            <button
              onClick={handleOpenCreateForm}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition-all shadow-xs ${
                isFormOpen && !editingEventId
                  ? 'bg-black text-white'
                  : 'bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-200'
              }`}
            >
              <Plus className="w-3 h-3" />
              <span>New Event</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            {historyEvents.length > 0 && (
              <button
                onClick={clearAllHistory}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
                title="Clear all completed records"
              >
                <Trash2 className="w-3 h-3" />
                <span className="hidden sm:inline">Clear Chronicle</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* VIEW 1: ACTIVE WORLD CLOCK TRACKER */}
      {activeViewTab === 'active' && (
        <>
          {/* Active Toolbar: Unified Progress, Search, and Filters */}
          <div className="p-3 bg-neutral-50/80 border-b border-neutral-200 space-y-2.5 shrink-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Unified Progress Button */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleUnifiedProgress}
                  disabled={selectedCount === 0}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition-all ${
                    selectedCount === 0
                      ? 'bg-neutral-200/80 text-neutral-400 border border-neutral-200 cursor-not-allowed opacity-70'
                      : 'bg-black hover:bg-neutral-800 text-white active:scale-95 cursor-pointer ring-1 ring-black/10'
                  }`}
                  title={
                    selectedCount === 0
                      ? 'Select at least one event to advance'
                      : allSelected
                      ? `Advance all ${events.length} events`
                      : `Advance ${selectedCount} selected events`
                  }
                >
                  <ChevronRight className={`w-3.5 h-3.5 ${selectedCount > 0 ? 'text-emerald-400' : ''}`} />
                  <span>
                    {selectedCount === 0
                      ? 'Advance (Select items)'
                      : allSelected
                      ? `Advance All (${events.length})`
                      : `Advance Selected (${selectedCount})`}
                  </span>
                </button>

                {/* Select All Toggle Checkbox */}
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-100 text-[11px] font-medium text-neutral-700 transition-all"
                  title={allSelected ? 'Deselect all events' : 'Select all events'}
                >
                  {allSelected ? (
                    <CheckSquare className="w-3.5 h-3.5 text-black" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-neutral-400" />
                  )}
                  <span>{allSelected ? 'All Selected' : 'Select All'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Lifecycle Mode Filter Tabs */}
                <div className="flex items-center gap-1 p-0.5 bg-neutral-200/60 rounded-xl text-[11px] shrink-0">
                  <button
                    onClick={() => setFilterMode('all')}
                    className={`px-2 py-1 rounded-lg font-medium transition-all ${
                      filterMode === 'all' ? 'bg-white text-black shadow-xs font-semibold' : 'text-neutral-600 hover:text-black'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilterMode('repeatable')}
                    className={`px-2 py-1 rounded-lg font-medium transition-all ${
                      filterMode === 'repeatable'
                        ? 'bg-white text-black shadow-xs font-semibold'
                        : 'text-neutral-600 hover:text-black'
                    }`}
                  >
                    Repeatable
                  </button>
                  <button
                    onClick={() => setFilterMode('single')}
                    className={`px-2 py-1 rounded-lg font-medium transition-all ${
                      filterMode === 'single'
                        ? 'bg-white text-black shadow-xs font-semibold'
                        : 'text-neutral-600 hover:text-black'
                    }`}
                  >
                    Single
                  </button>
                </div>

                {/* Compress / Expand Timelines Toggle */}
                <button
                  onClick={toggleAllTimelinesCompression}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-100 text-[11px] font-medium text-neutral-700 transition-all shadow-2xs"
                  title="Toggle space-saving compression of timeline milestone markers across all events"
                >
                  <Clock className="w-3 h-3 text-neutral-500" />
                  <span>{areAllTimelinesCompressed ? 'Expand Timelines' : 'Compress Timelines'}</span>
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search World Clock by name, unit, lore, or #tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs bg-white pl-8 pr-7 py-1.5 rounded-xl border border-neutral-200 outline-none focus:border-black transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black text-xs p-0.5"
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Tag Filter Strip */}
            {allUniqueTags.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[11px] text-neutral-500 scrollbar-none">
                <Tag className="w-3 h-3 text-neutral-400 shrink-0" />
                <button
                  onClick={() => setSelectedTagFilter('all')}
                  className={`px-2 py-0.5 rounded-md transition-colors shrink-0 ${
                    selectedTagFilter === 'all'
                      ? 'bg-neutral-900 text-white font-semibold'
                      : 'bg-neutral-200/60 hover:bg-neutral-200 text-neutral-700'
                  }`}
                >
                  All Tags
                </button>
                {allUniqueTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTagFilter(selectedTagFilter === tag ? 'all' : tag)}
                    className={`px-2 py-0.5 rounded-md transition-colors shrink-0 ${
                      selectedTagFilter === tag
                        ? 'bg-neutral-900 text-white font-semibold'
                        : 'bg-white border border-neutral-200 hover:border-neutral-300 text-neutral-700'
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* VIEW 2: COMPLETED WORLD CHRONICLE ARCHIVE */}
      {activeViewTab === 'history' && (
        <div className="p-3 bg-neutral-50/80 border-b border-neutral-200 space-y-2.5 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-neutral-900 flex items-center gap-1.5">
                <Archive className="w-3.5 h-3.5 text-amber-600" />
                <span>World Chronicle Log</span>
              </span>
              <span className="text-[11px] text-neutral-500">
                Log of all conquered events and repeatable cycle milestones
              </span>
            </div>

            <button
              onClick={copyHistorySummary}
              disabled={historyEvents.length === 0}
              className="flex items-center gap-1 px-3 py-1 rounded-xl bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-200 text-xs font-semibold shadow-2xs transition-all disabled:opacity-50"
            >
              <FileText className="w-3 h-3" />
              <span>Copy Chronicle Log</span>
            </button>
          </div>

          {/* History Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Chronicle by title, unit, lore, or tags..."
              value={historySearchQuery}
              onChange={(e) => setHistorySearchQuery(e.target.value)}
              className="w-full text-xs bg-white pl-8 pr-7 py-1.5 rounded-xl border border-neutral-200 outline-none focus:border-black transition-colors"
            />
            {historySearchQuery && (
              <button
                onClick={() => setHistorySearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black text-xs p-0.5"
              >
                ✕
              </button>
            )}
          </div>

          {/* History Tags */}
          {allHistoryTags.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[11px] text-neutral-500 scrollbar-none">
              <Tag className="w-3 h-3 text-neutral-400 shrink-0" />
              <button
                onClick={() => setHistoryTagFilter('all')}
                className={`px-2 py-0.5 rounded-md transition-colors shrink-0 ${
                  historyTagFilter === 'all'
                    ? 'bg-neutral-900 text-white font-semibold'
                    : 'bg-neutral-200/60 hover:bg-neutral-200 text-neutral-700'
                }`}
              >
                All Chronicle Tags
              </button>
              {allHistoryTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setHistoryTagFilter(historyTagFilter === tag ? 'all' : tag)}
                  className={`px-2 py-0.5 rounded-md transition-colors shrink-0 ${
                    historyTagFilter === tag
                      ? 'bg-neutral-900 text-white font-semibold'
                      : 'bg-white border border-neutral-200 hover:border-neutral-300 text-neutral-700'
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Content Area (Form Modal OR List) */}
      <div className="flex-1 overflow-y-auto p-3 bg-neutral-100/50">
        {/* EVENT CREATION / EDITING MODAL */}
        {isFormOpen && (
          <form
            onSubmit={handleSaveForm}
            className="mb-4 p-4 bg-white rounded-2xl border border-neutral-300 shadow-md space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-neutral-700" />
                <span className="font-bold text-sm text-neutral-900">
                  {editingEventId ? 'Customize Event' : 'Create New Event'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsFormOpen(false);
                  setEditingEventId(null);
                }}
                className="p-1 rounded-lg text-neutral-400 hover:text-black hover:bg-neutral-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Title & Subtitle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                  Event Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dark Gate, Scene Drafting, Raid"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full text-xs bg-white px-3 py-2 rounded-xl border border-neutral-300 outline-none focus:border-black font-semibold shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                  Subtitle / Context
                </label>
                <input
                  type="text"
                  placeholder="e.g. Formation of the Gate to the Dark World"
                  value={formSubtitle}
                  onChange={(e) => setFormSubtitle(e.target.value)}
                  className="w-full text-xs bg-white px-3 py-2 rounded-xl border border-neutral-300 outline-none focus:border-black shadow-2xs"
                />
              </div>
            </div>

            {/* Status & Timeline Days */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                  Status Indicator
                </label>
                <div className="flex items-center gap-1.5">
                  <select
                    value={formStatusEmoji}
                    onChange={(e) => {
                      setFormStatusEmoji(e.target.value);
                      const opt = STATUS_OPTIONS.find((s) => s.emoji === e.target.value);
                      if (opt) setFormStatusLabel(opt.label);
                    }}
                    className="text-xs bg-white px-2.5 py-1.5 rounded-xl border border-neutral-300"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.emoji} value={opt.emoji}>
                        {opt.emoji} {opt.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Status label (e.g. Active)"
                    value={formStatusLabel}
                    onChange={(e) => setFormStatusLabel(e.target.value)}
                    className="flex-1 text-xs bg-white px-2.5 py-1.5 rounded-xl border border-neutral-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                  Started Timeline
                </label>
                <input
                  type="text"
                  placeholder="e.g. Started Day 3, Session 12"
                  value={formStartedDate}
                  onChange={(e) => setFormStartedDate(e.target.value)}
                  className="w-full text-xs bg-white px-2.5 py-1.5 rounded-xl border border-neutral-300"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                  Ended Timeline
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ended Day ?, Ongoing"
                  value={formEndedDate}
                  onChange={(e) => setFormEndedDate(e.target.value)}
                  className="w-full text-xs bg-white px-2.5 py-1.5 rounded-xl border border-neutral-300"
                />
              </div>
            </div>

            {/* PROGRESSION UNIT SELECTOR (Requested by User) */}
            <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-bold text-neutral-900">
                    Progression Unit
                  </label>
                  <p className="text-[10px] text-neutral-500">
                    Decide what unit this event advances by (e.g., Days, Steps, Points, Words, Hours).
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded-lg bg-black text-white font-mono text-[10px] font-bold">
                  {formProgressUnit || 'Days'}
                </span>
              </div>

              {/* Preset buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                {UNIT_PRESETS.map((unit) => {
                  const isSelected = formProgressUnit.toLowerCase() === unit.toLowerCase();
                  return (
                    <button
                      key={unit}
                      type="button"
                      onClick={() => setFormProgressUnit(unit)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-black text-white shadow-2xs font-bold ring-1 ring-black'
                          : 'bg-white hover:bg-neutral-200 text-neutral-700 border border-neutral-300'
                      }`}
                    >
                      {unit}
                    </button>
                  );
                })}
              </div>

              {/* Custom unit input */}
              <div className="flex items-center gap-2 pt-0.5">
                <span className="text-[11px] font-semibold text-neutral-600">Custom Unit:</span>
                <input
                  type="text"
                  placeholder="Type any unit (e.g. Days, Mana, Miles, Rounds)"
                  value={formProgressUnit}
                  onChange={(e) => setFormProgressUnit(e.target.value)}
                  className="flex-1 text-xs bg-white px-3 py-1.5 rounded-xl border border-neutral-300 outline-none focus:border-black font-medium"
                />
              </div>
            </div>

            {/* Total Steps & Repeatable mode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                  Total Progression Target ({formProgressUnit || 'Days'})
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={formTotalSteps}
                    onChange={(e) => setFormTotalSteps(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-20 text-center font-mono font-bold text-xs bg-white px-2 py-1.5 rounded-xl border border-neutral-300"
                  />
                  <span className="text-[11px] text-neutral-600 font-mono">
                    total {formProgressUnit || 'Days'} (e.g. 30 in 5/30 {formProgressUnit || 'Days'})
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                  Lifecycle
                </label>
                <label className="flex items-center gap-2 mt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsRepeatable}
                    onChange={(e) => setFormIsRepeatable(e.target.checked)}
                    className="accent-black rounded"
                  />
                  <span className="text-xs text-neutral-800 font-medium">
                    Repeatable Loop (tracks completion based on {formProgressUnit || 'Days'})
                  </span>
                </label>
              </div>
            </div>

            {/* VISUAL EXAMPLES OF PROGRESS BAR STYLES */}
            <div>
              <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                Choose Progress Bar Style (with Live Visual Previews)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PROGRESS_STYLES.map((style) => {
                  const isSelected = formProgressStyle === style.id;
                  return (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => setFormProgressStyle(style.id)}
                      className={`p-3 rounded-2xl text-left border transition-all ${
                        isSelected
                          ? 'bg-white border-black ring-2 ring-black shadow-xs'
                          : 'bg-white/80 border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-neutral-900">{style.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-black stroke-[2.5]" />}
                      </div>

                      {/* Live Mini Visual Preview */}
                      <div className="p-2 bg-neutral-100/80 rounded-xl mb-1.5">
                        {style.id === 'segmented-blocks' && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              <span className="w-4 h-4 rounded bg-black text-white text-[9px] flex items-center justify-center font-mono font-bold">1</span>
                              <span className="w-4 h-4 rounded bg-black text-white text-[9px] flex items-center justify-center font-mono font-bold">2</span>
                              <span className="w-4 h-4 rounded bg-black text-white text-[9px] flex items-center justify-center font-mono font-bold">3</span>
                              <span className="w-4 h-4 rounded bg-white text-neutral-400 border border-neutral-300 text-[9px] flex items-center justify-center font-mono">4</span>
                              <span className="w-4 h-4 rounded bg-white text-neutral-400 border border-neutral-300 text-[9px] flex items-center justify-center font-mono">5</span>
                              <span className="text-[10px] text-neutral-400 ml-1 font-mono">...10</span>
                            </div>
                            <div className="text-[9px] text-neutral-400 font-mono">
                              ⬜⬜⬜⬜⬜⬛⬛⬛⬛⬛ (Grid Matrix)
                            </div>
                          </div>
                        )}

                        {style.id === 'smooth-linear' && (
                          <div className="space-y-1">
                            <div className="w-full h-2.5 rounded-full bg-neutral-200 overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ width: '60%', backgroundColor: formIconColor }}
                              />
                            </div>
                            <div className="flex justify-between text-[9px] font-mono text-neutral-500">
                              <span>0 {formProgressUnit}</span>
                              <span>60%</span>
                              <span>{formTotalSteps} {formProgressUnit}</span>
                            </div>
                          </div>
                        )}

                        {style.id === 'segmented-pips' && (
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 8 }).map((_, idx) => (
                              <div
                                key={idx}
                                className={`h-2.5 flex-1 rounded-xs ${
                                  idx < 5 ? 'shadow-2xs' : 'bg-neutral-300'
                                }`}
                                style={{ backgroundColor: idx < 5 ? formIconColor : undefined }}
                              />
                            ))}
                          </div>
                        )}

                        {style.id === 'circular-ring' && (
                          <div className="flex items-center gap-2">
                            <div className="relative w-7 h-7 flex items-center justify-center">
                              <svg className="w-7 h-7 -rotate-90" viewBox="0 0 36 36">
                                <circle cx="18" cy="18" r="14" fill="none" stroke="#D4D4D8" strokeWidth="4" />
                                <circle
                                  cx="18"
                                  cy="18"
                                  r="14"
                                  fill="none"
                                  stroke={formIconColor}
                                  strokeWidth="4"
                                  strokeDasharray="88"
                                  strokeDashoffset="35"
                                  strokeLinecap="round"
                                />
                              </svg>
                              <span className="absolute font-mono text-[8px] font-bold">60%</span>
                            </div>
                            <span className="text-[10px] text-neutral-500">Radial gauge with center percent</span>
                          </div>
                        )}

                        {style.id === 'milestone-nodes' && (
                          <div className="flex items-center justify-between relative px-2 py-1">
                            <div className="absolute left-2 right-2 top-1/2 -translate-y-1/2 h-0.5 bg-neutral-300 -z-0" />
                            {[1, 2, 3, 4].map((node) => (
                              <div
                                key={node}
                                className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold z-10 ${
                                  node <= 2 ? 'bg-black text-white' : 'bg-white border border-neutral-300 text-neutral-400'
                                }`}
                              >
                                {node}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="text-[10px] text-neutral-500">{style.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Icon & Color Palette */}
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                  Event Icon
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {AVAILABLE_ICONS.map((ic) => {
                    const isSelected = formIcon === ic.name;
                    return (
                      <button
                        key={ic.name}
                        type="button"
                        onClick={() => setFormIcon(ic.name)}
                        className={`p-2 rounded-xl border flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-black text-white border-black scale-105 shadow-xs'
                            : 'bg-white border-neutral-200 hover:border-neutral-300 text-neutral-700'
                        }`}
                        title={ic.label}
                      >
                        {renderIcon(ic.name, isSelected ? '#FFFFFF' : formIconColor, 'w-4 h-4')}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                  Accent Color
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setFormIconColor(c.value)}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${
                        formIconColor === c.value ? 'scale-115 border-black shadow-sm' : 'border-white hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.label}
                    />
                  ))}
                  <input
                    type="color"
                    value={formIconColor}
                    onChange={(e) => setFormIconColor(e.target.value)}
                    className="w-7 h-7 rounded cursor-pointer border-0 p-0"
                    title="Custom color hex"
                  />
                </div>
              </div>

              {/* Background Theme Selector */}
              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                  Event Background Theme
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {BG_THEMES.map((theme) => {
                    const isSelected = formBgTheme === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => setFormBgTheme(theme.id)}
                        className={`p-2 rounded-xl text-xs font-medium border flex items-center justify-between transition-all ${
                          theme.cardClass
                        } ${
                          isSelected
                            ? 'ring-2 ring-black border-transparent shadow-xs font-bold'
                            : 'opacity-80 hover:opacity-100'
                        }`}
                      >
                        <span>{theme.label}</span>
                        {isSelected && <Check className="w-3 h-3 text-current" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* MULTIPLE THRESHOLDS BUILDER */}
            <div className="p-3.5 bg-white rounded-2xl border border-neutral-300 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                    <BellRing className="w-3.5 h-3.5 text-amber-600" />
                    <span>Multiple Milestone Thresholds ({formThresholds.length})</span>
                  </div>
                  <div className="text-[10px] text-neutral-500">
                    Define stage milestones based on {formProgressUnit || 'Days'} (e.g. 15/30, 20/30, 30/30) with custom lore
                  </div>
                </div>

                <button
                  type="button"
                  onClick={addThresholdToForm}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-black text-white hover:bg-neutral-800 text-xs font-medium transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Threshold</span>
                </button>
              </div>

              {formThresholds.length === 0 ? (
                <div className="p-4 text-center text-xs text-neutral-400 border border-dashed border-neutral-200 rounded-xl">
                  No thresholds added yet. Click "+ Add Threshold" to set milestones.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {formThresholds.map((thresh, idx) => (
                    <div
                      key={thresh.id}
                      className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2 relative group/thresh"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-neutral-900 text-white text-[10px] font-mono flex items-center justify-center font-bold">
                            {idx + 1}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-semibold text-neutral-700">Trigger at:</span>
                            <input
                              type="number"
                              min={1}
                              max={formTotalSteps}
                              value={thresh.step}
                              onChange={(e) => updateThresholdField(idx, 'step', e.target.value)}
                              className="w-16 text-center font-mono font-bold text-xs bg-white px-2 py-1 rounded-lg border border-neutral-300"
                            />
                            <span className="text-[11px] font-mono text-neutral-500">
                              / {formTotalSteps} {formProgressUnit || 'Days'}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeThresholdFromForm(idx)}
                          className="p-1 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Remove threshold"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div>
                        <input
                          type="text"
                          placeholder="Milestone Title (e.g. Early Winter Sets In, Herald Crosses)"
                          value={thresh.title}
                          onChange={(e) => updateThresholdField(idx, 'title', e.target.value)}
                          className="w-full text-xs bg-white px-2.5 py-1.5 rounded-lg border border-neutral-300 outline-none focus:border-black font-semibold"
                        />
                      </div>

                      <div>
                        <textarea
                          rows={2}
                          placeholder={`Event description / Custom alert lore (e.g. Snow begins to fall when ${thresh.step} ${formProgressUnit || 'Days'} are reached...)`}
                          value={thresh.message}
                          onChange={(e) => updateThresholdField(idx, 'message', e.target.value)}
                          className="w-full text-xs bg-white px-2.5 py-1.5 rounded-lg border border-neutral-300 outline-none focus:border-black resize-y"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Special Note (e.g. Sid's Array freeze rule) */}
            <div>
              <label className="block text-[11px] font-semibold text-neutral-700 mb-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Special Note / Narrative Override Rules (Optional)</span>
              </label>
              <textarea
                rows={2}
                placeholder="e.g. If Sid is able to complete his array around the dark gate, he'll freeze it at 15/30 until he is ready for it to progress in which it will progress to 30/30 in 5 days."
                value={formSpecialNote}
                onChange={(e) => setFormSpecialNote(e.target.value)}
                className="w-full text-xs bg-white px-3 py-2 rounded-xl border border-neutral-300 outline-none focus:border-black"
              />
            </div>

            {/* General Notes & TAGS SECTION WITH AUTO-INPUT (Requested by User) */}
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                  General Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Hook, Confrontation, Climax, Lore"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full text-xs bg-white px-3 py-1.5 rounded-xl border border-neutral-300 outline-none focus:border-black"
                />
              </div>

              {/* Tag Input + Auto-Input Chips */}
              <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-neutral-900">
                    Event Tags
                  </label>
                  <span className="text-[10px] text-neutral-500">
                    Type below or click created tags to auto-input
                  </span>
                </div>

                <input
                  type="text"
                  placeholder="e.g. dark-world, sid, portal, winter"
                  value={formTagsString}
                  onChange={(e) => setFormTagsString(e.target.value)}
                  className="w-full text-xs bg-white px-3 py-1.5 rounded-xl border border-neutral-300 outline-none focus:border-black font-medium"
                />

                {/* Auto-input chips from already created tags */}
                {allExistingTags.length > 0 && (
                  <div className="pt-1">
                    <div className="text-[10px] font-semibold text-neutral-600 mb-1.5 flex items-center gap-1">
                      <Tag className="w-3 h-3 text-neutral-500" />
                      <span>Click to auto-input already created tags:</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                      {allExistingTags.map((tag) => {
                        const isSelected = activeFormTagsList.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => toggleFormTag(tag)}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-medium transition-all flex items-center gap-1 ${
                              isSelected
                                ? 'bg-black text-white shadow-2xs font-bold ring-1 ring-black'
                                : 'bg-white hover:bg-neutral-200 text-neutral-700 border border-neutral-300'
                            }`}
                            title={isSelected ? `Remove #${tag}` : `Auto-input #${tag}`}
                          >
                            {isSelected ? (
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            ) : (
                              <Plus className="w-2.5 h-2.5 text-neutral-400" />
                            )}
                            <span>#{tag}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200">
              <button
                type="button"
                onClick={() => {
                  setIsFormOpen(false);
                  setEditingEventId(null);
                }}
                className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-neutral-600 hover:bg-neutral-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-black hover:bg-neutral-800 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                {editingEventId ? 'Update Event' : 'Save Event'}
              </button>
            </div>
          </form>
        )}

        {/* SECTION A: ACTIVE WORLD CLOCK CARDS LIST */}
        {activeViewTab === 'active' && (
          <div className="space-y-3.5">
            {/* THRESHOLD REACHED ALERT TOAST NOTIFICATION */}
            {thresholdAlertToast && (
              <div className="p-3 bg-red-600 text-white rounded-2xl shadow-lg flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-white text-red-600 flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                    !
                  </div>
                  <div className="min-w-0">
                    <div className="font-extrabold text-xs tracking-tight flex items-center gap-1.5 flex-wrap">
                      <span>Event Happening Today: {thresholdAlertToast.title}!</span>
                      <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-black/30 text-white font-bold">
                        Threshold {thresholdAlertToast.step}/{thresholdAlertToast.totalSteps} {thresholdAlertToast.unit}
                      </span>
                    </div>
                    <div className="text-[11px] text-red-100 truncate mt-0.5">
                      {thresholdAlertToast.threshTitle} — Event popped to top of list! Check out what it is below.
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => {
                      setExpandedThresholdAccordions((prev) => ({ ...prev, [thresholdAlertToast.eventId]: true }));
                      setThresholdAlertToast(null);
                    }}
                    className="px-2.5 py-1 rounded-xl bg-white text-red-600 hover:bg-red-50 text-[11px] font-bold shadow-xs transition-colors"
                  >
                    Check Event
                  </button>
                  <button
                    onClick={() => setThresholdAlertToast(null)}
                    className="p-1 hover:bg-white/20 rounded-lg text-white transition-colors"
                    title="Dismiss alert"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {filteredEvents.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-neutral-200 space-y-3">
                <Clock className="w-8 h-8 text-neutral-300 mx-auto" />
                <div className="text-sm font-bold text-neutral-800">
                  {events.length === 0 ? 'No events currently in World Clock' : 'No matching events found'}
                </div>
                <div className="text-xs text-neutral-500 max-w-sm mx-auto">
                  {events.length === 0
                    ? 'Click "+ New Event" to create and track events.'
                    : 'Try clearing filters or search query.'}
                </div>
                {events.length === 0 && (
                  <button
                    type="button"
                    onClick={handleOpenCreateForm}
                    className="px-3.5 py-1.5 rounded-xl bg-black hover:bg-neutral-800 text-white text-xs font-semibold shadow-xs transition-all inline-block"
                  >
                    + New Event
                  </button>
                )}
                {(searchQuery || selectedTagFilter !== 'all' || filterMode !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedTagFilter('all');
                      setFilterMode('all');
                    }}
                    className="mt-2 text-xs text-black font-semibold underline block mx-auto"
                  >
                    Reset all filters
                  </button>
                )}
              </div>
            ) : (
              filteredEvents.map((event) => {
                const percent = Math.round((event.currentStep / event.totalSteps) * 100);
                const isCompleted = event.currentStep >= event.totalSteps;
                const themeObj = BG_THEMES.find((t) => t.id === event.bgTheme) || BG_THEMES[0];
                const isDark = themeObj.isDark;
                const unit = event.progressUnit || 'Days';

                // Thresholds reached
                const reachedThresholds = event.thresholds.filter(
                  (t) => event.currentStep >= t.step
                );
                const hasAnyThresholdReached = reachedThresholds.length > 0;
                const latestReachedThreshold =
                  reachedThresholds.length > 0
                    ? reachedThresholds[reachedThresholds.length - 1]
                    : null;
                const isRecentlyTriggered = recentlyTriggeredEventId === event.id;

                const isAccordionExpanded = !!expandedThresholdAccordions[event.id];

                return (
                  <div
                    key={event.id}
                    className={`p-4 rounded-2xl border transition-all ${themeObj.cardClass} ${
                      hasAnyThresholdReached
                        ? isDark
                          ? 'ring-2 ring-red-500/70 shadow-lg'
                          : 'ring-2 ring-red-500/50 shadow-md'
                        : ''
                    } ${isRecentlyTriggered ? 'animate-pulse' : ''}`}
                  >
                    {/* EVENT HAPPENING TODAY / THRESHOLD REACHED BANNER */}
                    {hasAnyThresholdReached && (
                      <div
                        className={`mb-3 p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                          isDark
                            ? 'bg-red-950/40 border-red-800/60 text-red-200'
                            : 'bg-red-50/90 border-red-200 text-red-950 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center font-black text-xs shadow-xs animate-bounce shrink-0">
                            !
                          </div>
                          <div className="min-w-0">
                            <div className="font-extrabold text-xs flex items-center gap-1.5 flex-wrap">
                              <span>Event Happening Today!</span>
                              {latestReachedThreshold && (
                                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-red-600 text-white font-bold">
                                  Threshold {latestReachedThreshold.step}/{event.totalSteps} {unit}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] truncate opacity-90 mt-0.5">
                              {latestReachedThreshold?.title
                                ? `"${latestReachedThreshold.title}" — check out what it is below.`
                                : 'Milestone threshold reached today — check out what it is below.'}
                            </div>
                          </div>
                        </div>
                        {!isAccordionExpanded && (
                          <button
                            type="button"
                            onClick={() => toggleThresholdsAccordion(event.id)}
                            className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold shadow-2xs transition-colors shrink-0 flex items-center gap-1"
                          >
                            <span>Check it out</span>
                            <ChevronDown className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}

                    {/* Header Row: Checkbox, Icon, Title, Status, Quick Actions */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        {/* Select Checkbox */}
                        <input
                          type="checkbox"
                          checked={event.selected}
                          onChange={() => toggleSelectEvent(event.id)}
                          className="mt-1 accent-black rounded cursor-pointer shrink-0"
                          title="Select for unified progression"
                        />

                        {/* Event Icon */}
                        <div
                          className="p-1.5 rounded-xl shrink-0 mt-0.5"
                          style={{
                            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                          }}
                        >
                          {renderIcon(event.icon, event.iconColor, 'w-4 h-4')}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm sm:text-base tracking-tight truncate">
                              {event.title}
                            </span>

                            {/* EXCLAMATION POINT BADGE NEXT TO TITLE */}
                            {hasAnyThresholdReached && (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-extrabold shadow-xs animate-pulse shrink-0"
                                title="Threshold reached! Event happening today - check out what it is below"
                              >
                                <span className="w-3.5 h-3.5 rounded-full bg-white text-red-600 flex items-center justify-center font-black text-[10px] leading-none">
                                  !
                                </span>
                                <span className="hidden sm:inline">Event Happening Today</span>
                                <span className="sm:hidden">Event Today</span>
                              </span>
                            )}

                            {/* Status Badge */}
                            {event.statusEmoji && (
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                  isDark
                                    ? 'bg-neutral-800 border-neutral-700 text-neutral-200'
                                    : 'bg-white border-neutral-200 text-neutral-800 shadow-2xs'
                                }`}
                              >
                                <span>{event.statusEmoji}</span>
                                <span>{event.statusLabel || 'Status'}</span>
                              </span>
                            )}

                            {/* Unit Badge */}
                            <span
                              className={`px-1.5 py-0.2 rounded-md font-mono text-[9px] uppercase tracking-wider font-semibold border ${
                                isDark
                                  ? 'bg-neutral-800 border-neutral-700 text-neutral-300'
                                  : 'bg-neutral-100 border-neutral-200 text-neutral-700'
                              }`}
                            >
                              {unit}
                            </span>
                          </div>

                          {event.subtitle && (
                            <div
                              className={`text-xs font-medium mt-0.5 ${
                                isDark ? 'text-neutral-300' : 'text-neutral-700'
                              }`}
                            >
                              {event.subtitle}
                            </div>
                          )}

                          {/* Interactive Timeline with Started, Intermediate Cycle Markers, and Ended */}
                          {(() => {
                            const markers = getEffectiveTimelineMarkers(event);
                            const hasMarkers = markers.length > 0;
                            const isCompressed =
                              compressedTimelines[event.id] !== undefined
                                ? compressedTimelines[event.id]
                                : markers.length >= 2;

                            if (!event.startedDate && !event.endedDate && !hasMarkers) return null;

                            return (
                              <div
                                className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-mono mt-1 ${
                                  isDark ? 'text-neutral-400' : 'text-neutral-500'
                                }`}
                              >
                                {/* Started Marker */}
                                {event.startedDate && (
                                  <span className="flex items-center gap-1 shrink-0 font-medium">
                                    <Clock className="w-3 h-3 opacity-70" />
                                    <span>Started {event.startedDate}</span>
                                  </span>
                                )}

                                {/* Compressed Mode: Compact badge for intermediate markers */}
                                {hasMarkers && isCompressed && (
                                  <>
                                    <span className="opacity-40">-</span>
                                    <button
                                      type="button"
                                      onClick={() => toggleCompressTimeline(event.id)}
                                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border transition-all ${
                                        isDark
                                          ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-neutral-700'
                                          : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border-neutral-300 shadow-2xs'
                                      }`}
                                      title="Expand all milestone cycle markers on timeline"
                                    >
                                      <span>•••</span>
                                      <span>
                                        {markers.length} {markers.length === 1 ? 'cycle' : 'cycles'} ({markers[markers.length - 1]?.label})
                                      </span>
                                      <ChevronDown className="w-2.5 h-2.5 opacity-70" />
                                    </button>
                                  </>
                                )}

                                {/* Expanded Mode: All intermediate markers separated by '-' */}
                                {hasMarkers && !isCompressed && (
                                  <>
                                    {markers.map((marker) => (
                                      <React.Fragment key={marker.id}>
                                        <span className="opacity-40">-</span>
                                        <span
                                          className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border ${
                                            isDark
                                              ? 'bg-neutral-800 border-neutral-700 text-emerald-400'
                                              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                          }`}
                                          title={`Completed cycle ${marker.cycle}`}
                                        >
                                          {marker.label}
                                        </span>
                                      </React.Fragment>
                                    ))}

                                    <button
                                      type="button"
                                      onClick={() => toggleCompressTimeline(event.id)}
                                      className={`inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] uppercase tracking-wider font-bold transition-all ml-0.5 ${
                                        isDark
                                          ? 'text-neutral-400 hover:text-white bg-neutral-800/60'
                                          : 'text-neutral-500 hover:text-black bg-neutral-100 hover:bg-neutral-200'
                                      }`}
                                      title="Compress intermediate markers for space"
                                    >
                                      <span>Compress</span>
                                      <ChevronUp className="w-2.5 h-2.5" />
                                    </button>
                                  </>
                                )}

                                {/* Ended Marker */}
                                {event.endedDate && (
                                  <>
                                    <span className="opacity-40">-</span>
                                    <span className="shrink-0 font-medium">Ended {event.endedDate}</span>
                                  </>
                                )}
                              </div>
                            );
                          })()}

                          {event.notes && (
                            <div
                              className={`text-[11px] mt-1 ${
                                isDark ? 'text-neutral-400' : 'text-neutral-600'
                              }`}
                            >
                              {event.notes}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Quick Actions: Step, Archive to History, Edit, Reset, Delete */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => progressSingleEvent(event.id)}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold shadow-2xs transition-all active:scale-95 ${
                            isDark
                              ? 'bg-white text-black hover:bg-neutral-200'
                              : 'bg-black text-white hover:bg-neutral-800'
                          }`}
                          title={`Advance (+1 ${unit})`}
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                          <span>Advance</span>
                        </button>

                        <button
                          onClick={() => archiveEvent(event.id, { isManual: true })}
                          className={`p-1.5 rounded-lg transition-colors ${
                            isDark
                              ? 'text-neutral-400 hover:text-amber-300 hover:bg-neutral-800'
                              : 'text-neutral-500 hover:text-amber-700 hover:bg-amber-50'
                          }`}
                          title="Archive event to World Chronicle History"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleOpenEditForm(event)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            isDark
                              ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                              : 'text-neutral-500 hover:text-black hover:bg-black/5'
                          }`}
                          title="Edit event and multiple thresholds"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => resetEvent(event.id)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            isDark
                              ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                              : 'text-neutral-500 hover:text-black hover:bg-black/5'
                          }`}
                          title="Reset progress to 0"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => deleteEvent(event.id)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            isDark
                              ? 'text-neutral-400 hover:text-rose-400 hover:bg-neutral-800'
                              : 'text-neutral-500 hover:text-rose-600 hover:bg-rose-50'
                          }`}
                          title="Delete event"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* EVENT COMPLETED BANNER (If at 100%) */}
                    {isCompleted && (
                      <div className="mt-2.5 p-2 bg-emerald-500/15 border border-emerald-500/30 rounded-xl flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                          <CheckCheck className="w-4 h-4 text-emerald-600" />
                          <span>Event Complete ({event.currentStep}/{event.totalSteps} {unit})!</span>
                        </div>
                        <button
                          onClick={() => archiveEvent(event.id, { isManual: true })}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold transition-colors shadow-2xs"
                        >
                          <Archive className="w-3 h-3" />
                          <span>Archive to Chronicle</span>
                        </button>
                      </div>
                    )}

                    {/* PROGRESS BAR SECTION */}
                    <div className="py-2.5">
                      <div className="flex items-center justify-between text-xs font-mono mb-1.5 font-bold">
                        <span className={isDark ? 'text-neutral-300' : 'text-neutral-800'}>
                          Progress: {event.currentStep}/{event.totalSteps} {unit}
                        </span>
                        <span className="opacity-70">({percent}%)</span>
                      </div>

                      {/* STYLE 1: SEGMENTED BLOCKS GRID / MATRIX (e.g. 10 per row like 5/30) */}
                      {event.progressStyle === 'segmented-blocks' && (
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-1">
                            {Array.from({ length: event.totalSteps }).map((_, stepIdx) => {
                              const isChecked = stepIdx < event.currentStep;
                              const isThresholdStep = event.thresholds.some((t) => t.step === stepIdx + 1);
                              return (
                                <button
                                  key={stepIdx}
                                  onClick={() => setEventStep(event.id, stepIdx)}
                                  className={`relative w-5 sm:w-6 h-5 sm:h-6 rounded-md flex items-center justify-center font-mono text-[9px] sm:text-[10px] font-bold transition-all shadow-2xs ${
                                    isChecked
                                      ? 'bg-black text-white ring-1 ring-black/40'
                                      : isDark
                                      ? 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 border border-neutral-700'
                                      : 'bg-white text-neutral-400 hover:bg-neutral-100 border border-neutral-300'
                                  }`}
                                  style={{
                                    backgroundColor: isChecked
                                      ? event.iconColor || (isDark ? '#FFFFFF' : '#171717')
                                      : undefined,
                                    color: isChecked ? '#FFFFFF' : undefined,
                                  }}
                                  title={`${formatProgressUnitLabel(stepIdx + 1, unit)} ${stepIdx + 1} of ${event.totalSteps} ${unit} (Click to set)${
                                    isThresholdStep ? ' [Threshold Milestone]' : ''
                                  }`}
                                >
                                  {stepIdx + 1}
                                  {isThresholdStep && isChecked && (
                                    <span
                                      className="absolute -top-1.5 -right-1 w-3.5 h-3.5 rounded-full bg-red-600 text-white text-[8px] font-black flex items-center justify-center shadow-xs z-10"
                                      title="Threshold reached today!"
                                    >
                                      !
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                          {/* Visual text representation helper */}
                          <div
                            className={`text-[10px] font-mono tracking-wider pt-0.5 opacity-60 ${
                              isDark ? 'text-neutral-400' : 'text-neutral-500'
                            }`}
                          >
                            Matrix: {event.currentStep} {unit} filled / {event.totalSteps - event.currentStep} remaining
                          </div>
                        </div>
                      )}

                      {/* STYLE 2: SMOOTH CONTINUOUS PROGRESS BAR */}
                      {event.progressStyle === 'smooth-linear' && (
                        <div className="space-y-1.5">
                          <div
                            className={`w-full h-3.5 rounded-full overflow-hidden p-0.5 border ${
                              isDark ? 'bg-neutral-800 border-neutral-700' : 'bg-neutral-200/90 border-neutral-300'
                            }`}
                          >
                            <div
                              className="h-full rounded-full transition-all duration-300 shadow-xs"
                              style={{
                                width: `${percent}%`,
                                backgroundColor: event.iconColor || (isDark ? '#FFFFFF' : '#171717'),
                              }}
                            />
                          </div>
                          <div
                            className={`flex justify-between text-[10px] font-mono ${
                              isDark ? 'text-neutral-400' : 'text-neutral-500'
                            }`}
                          >
                            <span>0 {unit}</span>
                            <span>{percent}% Completed</span>
                            <span>{event.totalSteps} {unit}</span>
                          </div>
                        </div>
                      )}

                      {/* STYLE 3: SEGMENTED PIPS (BATTERY CELLS) */}
                      {event.progressStyle === 'segmented-pips' && (
                        <div className="flex items-center gap-1.5 py-1">
                          {Array.from({ length: event.totalSteps }).map((_, stepIdx) => {
                            const isChecked = stepIdx < event.currentStep;
                            return (
                              <button
                                key={stepIdx}
                                onClick={() => setEventStep(event.id, stepIdx)}
                                className={`h-3.5 flex-1 rounded-sm transition-all ${
                                  isChecked
                                    ? 'shadow-xs scale-102'
                                    : isDark
                                    ? 'bg-neutral-800 border border-neutral-700 hover:bg-neutral-700'
                                    : 'bg-neutral-200/80 hover:bg-neutral-300'
                                }`}
                                style={{
                                  backgroundColor: isChecked
                                    ? event.iconColor || (isDark ? '#FFFFFF' : '#171717')
                                    : undefined,
                                }}
                                title={`${formatProgressUnitLabel(stepIdx + 1, unit)} ${stepIdx + 1}/${event.totalSteps} ${unit}`}
                              />
                            );
                          })}
                        </div>
                      )}

                      {/* STYLE 4: CIRCULAR RING GAUGE */}
                      {event.progressStyle === 'circular-ring' && (
                        <div className="flex items-center gap-4 py-1">
                          <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
                            <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
                              <circle
                                cx="18"
                                cy="18"
                                r="14"
                                fill="none"
                                stroke={isDark ? '#404040' : '#E5E7EB'}
                                strokeWidth="3.5"
                              />
                              <circle
                                cx="18"
                                cy="18"
                                r="14"
                                fill="none"
                                stroke={event.iconColor || (isDark ? '#FFFFFF' : '#171717')}
                                strokeWidth="3.5"
                                strokeDasharray="88"
                                strokeDashoffset={88 - (88 * percent) / 100}
                                strokeLinecap="round"
                                className="transition-all duration-300"
                              />
                            </svg>
                            <span className="absolute font-mono text-xs font-bold">{percent}%</span>
                          </div>

                          <div className="flex-1 text-xs">
                            <div className="font-semibold">
                              {event.currentStep} of {event.totalSteps} {unit} logged
                            </div>
                            <div
                              className={`text-[11px] mt-0.5 ${
                                isDark ? 'text-neutral-400' : 'text-neutral-500'
                              }`}
                            >
                              Radial progress gauge meter
                            </div>
                          </div>
                        </div>
                      )}

                      {/* STYLE 5: MILESTONE NODES STEPPER */}
                      {event.progressStyle === 'milestone-nodes' && (
                        <div className="flex items-center justify-between relative px-2 py-2">
                          <div
                            className={`absolute left-3 right-3 top-1/2 -translate-y-1/2 h-1 -z-0 rounded ${
                              isDark ? 'bg-neutral-800' : 'bg-neutral-200'
                            }`}
                          >
                            <div
                              className="h-full rounded transition-all duration-300"
                              style={{
                                width: `${percent}%`,
                                backgroundColor: event.iconColor || (isDark ? '#FFFFFF' : '#171717'),
                              }}
                            />
                          </div>

                          {Array.from({ length: event.totalSteps }).map((_, stepIdx) => {
                            const isReached = stepIdx < event.currentStep;
                            const isCurrent = stepIdx === event.currentStep;
                            return (
                              <button
                                key={stepIdx}
                                onClick={() => setEventStep(event.id, stepIdx)}
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold z-10 transition-transform ${
                                  isReached
                                    ? 'bg-black text-white shadow-xs scale-105'
                                    : isCurrent
                                    ? 'ring-2 ring-black bg-white text-black font-extrabold'
                                    : isDark
                                    ? 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                                    : 'bg-white text-neutral-400 border border-neutral-300'
                                }`}
                                style={{
                                  backgroundColor: isReached
                                    ? event.iconColor || (isDark ? '#FFFFFF' : '#171717')
                                    : undefined,
                                }}
                                title={`Milestone ${stepIdx + 1} ${unit}`}
                              >
                                {isReached ? <Check className="w-3 h-3 stroke-[3]" /> : stepIdx + 1}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* MULTIPLE THRESHOLDS SECTION ON THE CARD */}
                    {event.thresholds.length > 0 && (
                      <div
                        className={`my-2.5 rounded-xl border overflow-hidden ${
                          isDark ? 'bg-neutral-950/70 border-neutral-800' : 'bg-white/80 border-neutral-200/90'
                        }`}
                      >
                        {/* Accordion header */}
                        <button
                          type="button"
                          onClick={() => toggleThresholdsAccordion(event.id)}
                          className={`w-full px-3 py-2 flex items-center justify-between text-xs font-semibold transition-colors ${
                            isDark ? 'hover:bg-neutral-800/50' : 'hover:bg-neutral-100/70'
                          }`}
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <BellRing className="w-3.5 h-3.5 text-amber-500" />
                            <span>Thresholds</span>
                            <span
                              className={`px-1.5 py-0.5 rounded-full font-mono text-[10px] ${
                                reachedThresholds.length > 0
                                  ? 'bg-amber-500 text-black font-bold'
                                  : 'bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                              }`}
                            >
                              {reachedThresholds.length}/{event.thresholds.length} Reached
                            </span>
                            {reachedThresholds.length > 0 && (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600 text-white font-extrabold text-[10px] shadow-xs animate-pulse"
                                title="Event happening today - check out what it is below!"
                              >
                                <span className="font-black text-xs leading-none">!</span>
                                <span>Event Happening Today</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 text-[11px] text-neutral-400">
                            <span>{isAccordionExpanded ? 'Hide' : 'Show details'}</span>
                            {isAccordionExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </div>
                        </button>

                        {/* Threshold Items */}
                        {isAccordionExpanded && (
                          <div className="p-2.5 space-y-2 border-t border-neutral-200/50 dark:border-neutral-800">
                            {event.thresholds.map((thresh) => {
                              const isReached = event.currentStep >= thresh.step;

                              return (
                                <div
                                  key={thresh.id}
                                  className={`p-2.5 rounded-xl border text-xs transition-all ${
                                    isReached
                                      ? isDark
                                      : 'bg-amber-50/90 border-amber-300 text-amber-950 shadow-2xs'
                                  } ${
                                    isReached && isDark
                                      ? 'bg-amber-950/40 border-amber-600/50 text-amber-100'
                                      : ''
                                  } ${
                                    !isReached && isDark
                                      ? 'bg-neutral-900/60 border-neutral-800 text-neutral-400'
                                      : ''
                                  } ${
                                    !isReached && !isDark
                                      ? 'bg-neutral-50/70 border-neutral-200 text-neutral-600'
                                      : ''
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span
                                        className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold border ${
                                          isReached
                                            ? 'bg-amber-500 text-black border-amber-600 shadow-2xs'
                                            : 'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700'
                                        }`}
                                      >
                                        {thresh.step}/{event.totalSteps} {unit}
                                      </span>

                                      {/* EXCLAMATION POINT NEXT TO THRESHOLD */}
                                      {isReached && (
                                        <span
                                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-red-600 text-white font-extrabold text-[10px] shadow-sm animate-pulse ring-1 ring-red-400"
                                          title="Threshold reached! Event happening today - check out what it is below."
                                        >
                                          <span className="w-3.5 h-3.5 rounded-full bg-white text-red-600 flex items-center justify-center font-black text-[11px] leading-none shrink-0">
                                            !
                                          </span>
                                          <span className="tracking-tight uppercase font-mono text-[9px] font-black">
                                            Happening Today
                                          </span>
                                        </span>
                                      )}

                                      {thresh.title && (
                                        <span className="font-bold tracking-tight">{thresh.title}</span>
                                      )}
                                    </div>

                                    <span className="flex items-center gap-1 text-[10px] font-semibold">
                                      {isReached ? (
                                        <span className="text-emerald-500 flex items-center gap-1">
                                          <Check className="w-3 h-3 stroke-[3]" /> Reached
                                        </span>
                                      ) : (
                                        <span className="opacity-60 flex items-center gap-1">
                                          <Lock className="w-2.5 h-2.5" /> Locked
                                        </span>
                                      )}
                                    </span>
                                  </div>

                                  <div className="text-[11px] leading-relaxed pl-0.5 opacity-90">
                                    {thresh.message}
                                  </div>

                                  {isReached && (
                                    <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-500/10 px-2 py-1 rounded-lg border border-red-500/20">
                                      <span className="w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center font-black text-[10px] leading-none shrink-0">!</span>
                                      <span>Event happening today — check out what it is!</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* SPECIAL NOTE CALLOUT (e.g. Sid's Array Rule) */}
                    {event.specialNote && (
                      <div
                        className={`my-2 p-2.5 rounded-xl text-xs border ${
                          isDark
                            ? 'bg-purple-950/40 border-purple-800/60 text-purple-200'
                            : 'bg-purple-50/90 border-purple-200 text-purple-950'
                        }`}
                      >
                        <div className="font-bold flex items-center gap-1.5 mb-1 text-[11px]">
                          <Sparkles className="w-3 h-3 text-purple-400" />
                          <span>Special Note</span>
                        </div>
                        <div className="text-[11px] leading-relaxed opacity-90">
                          {event.specialNote}
                        </div>
                      </div>
                    )}

                    {/* CARD BOTTOM: Tags, Repeatable Tag, Unit Stamp, and Quick Filters */}
                    <div
                      className={`mt-2 pt-2 border-t flex flex-wrap items-center justify-between gap-2 text-[11px] ${
                        isDark ? 'border-neutral-800 text-neutral-400' : 'border-neutral-200/60 text-neutral-600'
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-1.5">
                        {event.isRepeatable ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[10px] font-semibold border ${
                              isDark
                                ? 'bg-neutral-800 text-neutral-200 border-neutral-700'
                                : 'bg-neutral-100 text-neutral-800 border-neutral-200'
                            }`}
                            title={`Repeatable loop. Completed ${event.completionCount} full cycles`}
                          >
                            <Repeat className="w-2.5 h-2.5" />
                            <span>Repeatable · {event.completionCount}x</span>
                            {event.lastCompletedText && (
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold ml-0.5">
                                ({event.lastCompletedText})
                              </span>
                            )}
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[10px] font-semibold border ${
                              isCompleted
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : isDark
                                ? 'bg-neutral-800 text-neutral-300 border-neutral-700'
                                : 'bg-neutral-100 text-neutral-600 border-neutral-200'
                            }`}
                          >
                            <Award className="w-2.5 h-2.5" />
                            <span>{isCompleted ? 'Completed' : 'Single Run'}</span>
                          </span>
                        )}

                        {event.tags.map((tag) => (
                          <button
                            key={tag}
                            onClick={() => setSelectedTagFilter(selectedTagFilter === tag ? 'all' : tag)}
                            className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium transition-colors border ${
                              selectedTagFilter === tag
                                ? 'bg-black text-white border-black'
                                : isDark
                                ? 'bg-neutral-800/80 text-neutral-300 border-neutral-700 hover:bg-neutral-700'
                                : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300 hover:text-black'
                            }`}
                            title={`Filter events by tag #${tag}`}
                          >
                            #{tag}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-2 font-mono text-[11px] font-semibold">
                        <span>
                          {event.currentStep}/{event.totalSteps} {unit}
                        </span>
                        <span className="opacity-60">({percent}%)</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* SECTION B: WORLD CHRONICLE SECTION FOR COMPLETED EVENTS */}
        {activeViewTab === 'history' && (
          <div className="space-y-3.5">
            {filteredHistoryEvents.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-neutral-200 space-y-2">
                <History className="w-8 h-8 text-neutral-300 mx-auto" />
                <div className="text-sm font-bold text-neutral-700">No completed events in Chronicle yet</div>
                <div className="text-xs text-neutral-400 max-w-sm mx-auto">
                  {historySearchQuery || historyTagFilter !== 'all'
                    ? 'No completed records match the search filter.'
                    : 'When events finish their targets or complete repeatable cycles, they will be preserved in this Chronicle.'}
                </div>
                {(historySearchQuery || historyTagFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setHistorySearchQuery('');
                      setHistoryTagFilter('all');
                    }}
                    className="mt-2 text-xs text-black font-semibold underline"
                  >
                    Clear chronicle filters
                  </button>
                )}
              </div>
            ) : (
              filteredHistoryEvents.map((hist) => {
                const themeObj = BG_THEMES.find((t) => t.id === hist.bgTheme) || BG_THEMES[0];
                const isDark = themeObj.isDark;
                const isAccordionExpanded = !!expandedThresholdAccordions[hist.id];
                const unit = hist.progressUnit || 'Days';

                return (
                  <div
                    key={hist.id}
                    className={`p-4 rounded-2xl border transition-all ${themeObj.cardClass}`}
                  >
                    {/* Header Row: Completed Icon, Title, Status, and History Actions */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        {/* Event Icon */}
                        <div
                          className="p-1.5 rounded-xl shrink-0 mt-0.5"
                          style={{
                            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                          }}
                        >
                          {renderIcon(hist.icon, hist.iconColor, 'w-4 h-4')}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm sm:text-base tracking-tight truncate">
                              {hist.title}
                            </span>

                            {/* Completed Status Badge */}
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                isDark
                                  ? 'bg-emerald-950 border-emerald-700 text-emerald-200'
                                  : 'bg-emerald-50 border-emerald-200 text-emerald-900 shadow-2xs'
                              }`}
                            >
                              <span>{hist.statusEmoji || '🟦'}</span>
                              <span>{hist.statusLabel || 'Completed'}</span>
                            </span>

                            {/* Unit tag */}
                            <span
                              className={`px-1.5 py-0.2 rounded-md font-mono text-[9px] uppercase tracking-wider font-semibold border ${
                                isDark
                                  ? 'bg-neutral-800 border-neutral-700 text-neutral-300'
                                  : 'bg-neutral-100 border-neutral-200 text-neutral-700'
                              }`}
                            >
                              {unit}
                            </span>
                          </div>

                          {hist.subtitle && (
                            <div
                              className={`text-xs font-medium mt-0.5 ${
                                isDark ? 'text-neutral-300' : 'text-neutral-700'
                              }`}
                            >
                              {hist.subtitle}
                            </div>
                          )}

                          {/* Completed Timeline with unit timestamp and markers */}
                          {(() => {
                            const markers = getEffectiveTimelineMarkers(hist);
                            const hasMarkers = markers.length > 0;
                            const isCompressed =
                              compressedTimelines[hist.id] !== undefined
                                ? compressedTimelines[hist.id]
                                : markers.length >= 2;

                            return (
                              <div
                                className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-mono mt-1 ${
                                  isDark ? 'text-neutral-400' : 'text-neutral-500'
                                }`}
                              >
                                {hist.startedDate && (
                                  <span className="flex items-center gap-1 font-medium">
                                    <Clock className="w-3 h-3 opacity-70" />
                                    <span>Started {hist.startedDate}</span>
                                  </span>
                                )}

                                {hasMarkers && isCompressed && (
                                  <>
                                    <span className="opacity-40">-</span>
                                    <button
                                      type="button"
                                      onClick={() => toggleCompressTimeline(hist.id)}
                                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border transition-all ${
                                        isDark
                                          ? 'bg-neutral-800 text-neutral-300 border-neutral-700'
                                          : 'bg-neutral-100 text-neutral-700 border-neutral-300'
                                      }`}
                                      title="Expand cycle markers"
                                    >
                                      <span>•••</span>
                                      <span>{markers.length} {markers.length === 1 ? 'cycle' : 'cycles'}</span>
                                      <ChevronDown className="w-2.5 h-2.5 opacity-70" />
                                    </button>
                                  </>
                                )}

                                {hasMarkers && !isCompressed && (
                                  <>
                                    {markers.map((m) => (
                                      <React.Fragment key={m.id}>
                                        <span className="opacity-40">-</span>
                                        <span
                                          className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border ${
                                            isDark
                                              ? 'bg-neutral-800 border-neutral-700 text-emerald-400'
                                              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                          }`}
                                        >
                                          {m.label}
                                        </span>
                                      </React.Fragment>
                                    ))}
                                    <button
                                      type="button"
                                      onClick={() => toggleCompressTimeline(hist.id)}
                                      className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] uppercase tracking-wider font-bold opacity-70 hover:opacity-100"
                                      title="Compress"
                                    >
                                      <span>Compress</span>
                                      <ChevronUp className="w-2.5 h-2.5" />
                                    </button>
                                  </>
                                )}

                                {hist.endedDate && (
                                  <>
                                    <span className="opacity-40">-</span>
                                    <span>Ended {hist.endedDate}</span>
                                  </>
                                )}

                                <span className="font-semibold text-emerald-600 dark:text-emerald-400 ml-1">
                                  ✓ {hist.completedAt}
                                </span>
                              </div>
                            );
                          })()}

                          {hist.notes && (
                            <div
                              className={`text-[11px] mt-1 ${
                                isDark ? 'text-neutral-400' : 'text-neutral-600'
                              }`}
                            >
                              {hist.notes}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* History Actions: Restore, Clone, Delete */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => restoreFromHistory(hist)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-white text-black hover:bg-neutral-100 border border-neutral-300 shadow-2xs transition-all active:scale-95"
                          title="Restore event back to World Clock"
                        >
                          <Undo2 className="w-3 h-3" />
                          <span>Restore</span>
                        </button>

                        <button
                          onClick={() => cloneFromHistory(hist)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            isDark
                              ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                              : 'text-neutral-500 hover:text-black hover:bg-black/5'
                          }`}
                          title="Clone as new template"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => deleteFromHistory(hist.id)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            isDark
                              ? 'text-neutral-400 hover:text-rose-400 hover:bg-neutral-800'
                              : 'text-neutral-500 hover:text-rose-600 hover:bg-rose-50'
                          }`}
                          title="Delete record from history"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Full Progress Completed Stamp */}
                    <div className="my-2 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between text-xs font-mono">
                      <span className="flex items-center gap-1 font-bold text-emerald-800 dark:text-emerald-300">
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>Completed All Checkpoints</span>
                      </span>
                      <span className="font-bold">
                        {hist.finalSteps}/{hist.totalSteps} {unit} (100%)
                      </span>
                    </div>

                    {/* CONQUERED THRESHOLDS ACCORDION */}
                    {hist.thresholds.length > 0 && (
                      <div
                        className={`my-2 rounded-xl border overflow-hidden ${
                          isDark ? 'bg-neutral-950/70 border-neutral-800' : 'bg-white/80 border-neutral-200/90'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleThresholdsAccordion(hist.id)}
                          className={`w-full px-3 py-2 flex items-center justify-between text-xs font-semibold transition-colors ${
                            isDark ? 'hover:bg-neutral-800/50' : 'hover:bg-neutral-100/70'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <BellRing className="w-3.5 h-3.5 text-amber-500" />
                            <span>Conquered Thresholds ({hist.thresholds.length})</span>
                          </div>

                          <div className="flex items-center gap-1 text-[11px] text-neutral-400">
                            <span>{isAccordionExpanded ? 'Hide' : 'Show details'}</span>
                            {isAccordionExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </div>
                        </button>

                        {isAccordionExpanded && (
                          <div className="p-2.5 space-y-2 border-t border-neutral-200/50 dark:border-neutral-800">
                            {hist.thresholds.map((thresh) => (
                              <div
                                key={thresh.id}
                                className={`p-2 rounded-lg border text-xs ${
                                  isDark
                                    ? 'bg-amber-950/20 border-amber-800/50 text-amber-100'
                                    : 'bg-amber-50/60 border-amber-200 text-amber-950'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <div className="flex items-center gap-2">
                                    <span className="px-1.5 py-0.5 rounded font-mono text-[10px] font-bold bg-amber-500 text-black">
                                      {thresh.step}/{hist.totalSteps} {unit}
                                    </span>
                                    {thresh.title && (
                                      <span className="font-bold">{thresh.title}</span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-emerald-500 flex items-center gap-1 font-semibold">
                                    <Check className="w-3 h-3 stroke-[3]" /> Conquered
                                  </span>
                                </div>
                                <div className="text-[11px] opacity-90 pl-0.5">
                                  {thresh.message}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* SPECIAL NOTE CALLOUT */}
                    {hist.specialNote && (
                      <div
                        className={`my-2 p-2.5 rounded-xl text-xs border ${
                          isDark
                            ? 'bg-purple-950/40 border-purple-800/60 text-purple-200'
                            : 'bg-purple-50/90 border-purple-200 text-purple-950'
                        }`}
                      >
                        <div className="font-bold flex items-center gap-1.5 mb-1 text-[11px]">
                          <Sparkles className="w-3 h-3 text-purple-400" />
                          <span>Special Note</span>
                        </div>
                        <div className="text-[11px] leading-relaxed opacity-90">
                          {hist.specialNote}
                        </div>
                      </div>
                    )}

                    {/* CARD BOTTOM: Tags and Completed Flag */}
                    <div
                      className={`mt-2 pt-2 border-t flex flex-wrap items-center justify-between gap-2 text-[11px] ${
                        isDark ? 'border-neutral-800 text-neutral-400' : 'border-neutral-200/60 text-neutral-600'
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[10px] font-semibold border ${
                            isDark
                              ? 'bg-neutral-800 text-neutral-200 border-neutral-700'
                              : 'bg-neutral-100 text-neutral-800 border-neutral-200'
                          }`}
                        >
                          <Award className="w-2.5 h-2.5 text-amber-500" />
                          <span>
                            {hist.isRepeatable
                              ? `Completed Loop #${hist.cycleNumber || 1}`
                              : 'Conquered Event'}
                          </span>
                        </span>

                        {hist.tags.map((tag) => (
                          <button
                            key={tag}
                            onClick={() => setHistoryTagFilter(historyTagFilter === tag ? 'all' : tag)}
                            className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium transition-colors border ${
                              historyTagFilter === tag
                                ? 'bg-black text-white border-black'
                                : isDark
                                ? 'bg-neutral-800/80 text-neutral-300 border-neutral-700 hover:bg-neutral-700'
                                : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300 hover:text-black'
                            }`}
                          >
                            #{tag}
                          </button>
                        ))}
                      </div>

                      <div className="font-mono text-[10px] opacity-70">
                        {hist.totalSteps} {unit} completed
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Visible Bottom-Right Resize Grip */}
      {!isFullScreen && (
        <div
          onPointerDown={(e) => handleResizeDown('se', e)}
          onPointerMove={handleResizeMove}
          onPointerUp={handleResizeUp}
          className="absolute bottom-1 right-1 w-3.5 h-3.5 cursor-nwse-resize flex items-end justify-end p-0.5 text-neutral-400"
        >
          <svg width="6" height="6" viewBox="0 0 6 6" fill="currentColor">
            <circle cx="5" cy="5" r="0.8" />
            <circle cx="5" cy="2" r="0.8" />
            <circle cx="2" cy="5" r="0.8" />
          </svg>
        </div>
      )}
    </div>
  );
};
