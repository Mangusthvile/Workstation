export type ProgressBarStyle =
  | 'segmented-blocks'
  | 'smooth-linear'
  | 'segmented-pips'
  | 'circular-ring'
  | 'milestone-nodes';

export type EventBgTheme = 'white' | 'slate' | 'sage' | 'indigo' | 'amber' | 'rose' | 'noir';

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

/** Everything the create/edit form collects. */
export interface EventDraft {
  title: string;
  subtitle: string;
  statusEmoji: string;
  statusLabel: string;
  startedDate: string;
  endedDate: string;
  totalSteps: number;
  progressUnit: string;
  isRepeatable: boolean;
  notes: string;
  specialNote: string;
  icon: EventIconName;
  iconColor: string;
  bgTheme: EventBgTheme;
  progressStyle: ProgressBarStyle;
  tagsString: string;
  thresholds: EventThreshold[];
}

export interface ThresholdAlert {
  eventId: string;
  title: string;
  threshTitle?: string;
  step: number;
  totalSteps: number;
  unit: string;
}
