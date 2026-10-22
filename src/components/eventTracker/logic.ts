/**
 * Pure World Clock logic: progression, cycle archiving, filtering, summaries.
 * Nothing here touches React or storage, which keeps the rules in one place
 * (the original repeated the "advance an event" logic three times) and makes
 * them easy to test.
 */
import { MAX_TOTAL_STEPS } from './constants';
import { BASE_EVENT_IDS } from './seedData';
import type {
  CompletedEventRecord,
  EventDraft,
  EventThreshold,
  TimelineMarker,
  TrackedEvent,
} from './types';

export const DEFAULT_UNIT = 'Days';
const CYCLE_SUFFIX = /\s\(Cycle\s#\d+\)$/;

export const unitOf = (item: { progressUnit?: string }) => item.progressUnit || DEFAULT_UNIT;

export const percentOf = (e: { currentStep: number; totalSteps: number }) =>
  e.totalSteps > 0 ? Math.round((e.currentStep / e.totalSteps) * 100) : 0;

export const isBaseItem = (item: { id: string; isBaseEvent?: boolean }) => BASE_EVENT_IDS.has(item.id) || !!item.isBaseEvent;

export const clampSteps = (n: number) => Math.max(1, Math.min(MAX_TOTAL_STEPS, Math.floor(n) || 1));

export const formatProgressUnitLabel = (count: number, unit: string) => {
  const clean = (unit || 'Steps').trim();
  if (count === 1 && clean.endsWith('s') && clean.length > 2) return clean.slice(0, -1);
  return clean;
};

// ---------------------------------------------------------------------------
// Repeatable cycles and timeline markers
// ---------------------------------------------------------------------------

/** Marker label for repeated events, e.g. "Completed 1x Day 6", "Completed 2x Day 9". */
export const getRepeatableMarkerLabel = (
  event: { progressUnit?: string; startedDate?: string; totalSteps: number },
  cycleIndex: number
) => {
  const unit = (event.progressUnit || DEFAULT_UNIT).trim();
  const unitLower = unit.toLowerCase();
  const match = (event.startedDate || '').match(/\d+/);
  const startNumber = (fallback: number) => (match ? parseInt(match[0], 10) : fallback);

  if (unitLower.includes('day')) {
    // Started Day 3 with 3-day cycles: Completed 1x Day 6, Completed 2x Day 9, ...
    return `Completed ${cycleIndex}x Day ${startNumber(1) + cycleIndex * Math.max(1, event.totalSteps)}`;
  }
  if (unitLower.includes('step')) return `Completed ${cycleIndex}x (${cycleIndex * event.totalSteps} Steps)`;
  if (unitLower.includes('point')) return `Completed ${cycleIndex}x (${cycleIndex * event.totalSteps} Points)`;
  if (unitLower.includes('hour')) return `Completed ${cycleIndex}x Hour ${startNumber(0) + cycleIndex * event.totalSteps}`;
  if (unitLower.includes('session')) return `Completed ${cycleIndex}x Session ${startNumber(1) + (cycleIndex - 1)}`;
  return `Completed ${cycleIndex}x (${cycleIndex * event.totalSteps} ${unit})`;
};

/** Stored markers, or synthesized ones for repeatable events saved before markers existed. */
export const getEffectiveTimelineMarkers = (event: TrackedEvent | CompletedEventRecord): TimelineMarker[] => {
  if (event.timelineMarkers && event.timelineMarkers.length > 0) return event.timelineMarkers;
  if (!event.isRepeatable) return [];
  const count = 'completionCount' in event ? event.completionCount : event.completionCountAtArchive;
  return Array.from({ length: count || 0 }, (_, idx) => ({
    id: `auto-m-${event.id}-${idx + 1}`,
    cycle: idx + 1,
    label: getRepeatableMarkerLabel(event, idx + 1),
  }));
};

const getNextCycleMarkers = (event: TrackedEvent, nextCycle: number, now: number): TimelineMarker[] => {
  const marker: TimelineMarker = {
    id: `marker-${now}-${nextCycle}`,
    cycle: nextCycle,
    label: getRepeatableMarkerLabel(event, nextCycle),
    timestamp: new Date(now).toLocaleDateString(),
  };
  return [...getEffectiveTimelineMarkers(event).filter((m) => m.cycle !== nextCycle), marker].sort(
    (a, b) => a.cycle - b.cycle
  );
};

/** Whether the compact "N cycles" view is used when the user has not chosen. */
export const isTimelineCompressed = (
  item: TrackedEvent | CompletedEventRecord,
  compressed: Record<string, boolean>
) => compressed[item.id] ?? getEffectiveTimelineMarkers(item).length >= 2;

// ---------------------------------------------------------------------------
// Progression
// ---------------------------------------------------------------------------

export const findTriggeredThreshold = (event: TrackedEvent, targetStep: number): EventThreshold | undefined =>
  event.thresholds.find((t) => (event.currentStep < t.step && targetStep >= t.step) || targetStep === t.step);

export const hasReachedAnyThreshold = (event: TrackedEvent) => event.thresholds.some((t) => event.currentStep >= t.step);

function buildCycleRecord(
  event: TrackedEvent,
  cycleIndex: number,
  markers: TimelineMarker[],
  stamp: string,
  now: number
): CompletedEventRecord {
  return {
    id: `hist-${now}-${event.id}-cycle-${cycleIndex}`,
    originalEventId: event.id,
    title: `${event.title} (Cycle #${cycleIndex})`,
    subtitle: event.subtitle,
    statusEmoji: '🟦',
    statusLabel: `Cycle #${cycleIndex} Complete`,
    startedDate: event.startedDate,
    endedDate: event.endedDate || stamp,
    completedAt: stamp,
    totalSteps: event.totalSteps,
    finalSteps: event.totalSteps,
    progressUnit: unitOf(event),
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
    timelineMarkers: markers,
  };
}

export interface StepOutcome {
  event: TrackedEvent;
  /** Set when a repeatable event finished a cycle; goes into the Chronicle. */
  cycleRecord?: CompletedEventRecord;
  triggered?: EventThreshold;
}

/**
 * Moves an event to `targetStep`. Reaching the end either completes a
 * single-run event or rolls a repeatable event over into its next cycle.
 */
export function moveToStep(event: TrackedEvent, targetStep: number, now: number): StepOutcome {
  const triggered = findTriggeredThreshold(event, targetStep);

  if (targetStep < event.totalSteps) {
    return { event: { ...event, currentStep: Math.max(0, targetStep) }, triggered };
  }

  if (!event.isRepeatable) {
    return {
      event: { ...event, currentStep: event.totalSteps, completionCount: Math.max(1, event.completionCount) },
      triggered,
    };
  }

  const cycleIndex = event.completionCount + 1;
  const markers = getNextCycleMarkers(event, cycleIndex, now);
  const stamp = getRepeatableMarkerLabel(event, cycleIndex);
  return {
    event: { ...event, currentStep: 0, completionCount: cycleIndex, lastCompletedText: stamp, timelineMarkers: markers },
    cycleRecord: buildCycleRecord(event, cycleIndex, markers, stamp, now),
    triggered,
  };
}

/** Clicking a step block sets progress to that block, or steps back one if it is already the current step. */
export const stepFromBlockClick = (event: TrackedEvent, stepIndex: number) =>
  event.currentStep === stepIndex + 1 ? stepIndex : stepIndex + 1;

// ---------------------------------------------------------------------------
// Archive / restore
// ---------------------------------------------------------------------------

export function archiveRecordFor(event: TrackedEvent, now: number): CompletedEventRecord {
  const completedAt = event.isRepeatable
    ? getRepeatableMarkerLabel(event, event.completionCount || 1)
    : event.endedDate && event.endedDate !== 'Day ?'
    ? `Completed ${event.endedDate}`
    : `Completed (${event.currentStep} ${unitOf(event)})`;

  return {
    id: `hist-${now}-${event.id}`,
    originalEventId: event.id,
    title: event.title,
    subtitle: event.subtitle,
    statusEmoji: '🟦',
    statusLabel: 'Completed & Archived',
    startedDate: event.startedDate,
    endedDate: event.endedDate,
    completedAt,
    totalSteps: event.totalSteps,
    finalSteps: event.currentStep,
    progressUnit: unitOf(event),
    isRepeatable: event.isRepeatable,
    cycleNumber: event.isRepeatable ? event.completionCount + 1 : undefined,
    completionCountAtArchive: event.completionCount + (event.isRepeatable ? 1 : 0),
    icon: event.icon,
    iconColor: event.iconColor,
    bgTheme: event.bgTheme,
    progressStyle: event.progressStyle,
    tags: [...event.tags],
    notes: event.notes,
    specialNote: event.specialNote,
    thresholds: [...event.thresholds],
    timelineMarkers: event.timelineMarkers ? [...event.timelineMarkers] : getEffectiveTimelineMarkers(event),
  };
}

export function eventFromRecord(record: CompletedEventRecord, now: number): TrackedEvent {
  return {
    id: `restored-${now}-${record.originalEventId}`,
    title: record.title.replace(CYCLE_SUFFIX, ''),
    subtitle: record.subtitle,
    statusEmoji: '🟩',
    statusLabel: 'Active (Restored)',
    startedDate: record.startedDate,
    endedDate: 'Day ?',
    currentStep: 0,
    totalSteps: record.totalSteps,
    progressUnit: unitOf(record),
    isRepeatable: record.isRepeatable,
    completionCount: record.completionCountAtArchive || 0,
    lastCompletedText: record.completedAt,
    selected: true,
    notes: record.notes,
    specialNote: record.specialNote,
    icon: record.icon,
    iconColor: record.iconColor,
    bgTheme: record.bgTheme,
    progressStyle: record.progressStyle,
    tags: [...record.tags],
    thresholds: [...record.thresholds],
    timelineMarkers: record.timelineMarkers ? [...record.timelineMarkers] : getEffectiveTimelineMarkers(record),
  };
}

// ---------------------------------------------------------------------------
// Form drafts
// ---------------------------------------------------------------------------

export const parseTags = (tagsString: string) =>
  tagsString
    .split(',')
    .map((t) => t.trim().toLowerCase().replace(/^#/, ''))
    .filter(Boolean);

export const emptyDraft = (): EventDraft => ({
  title: '',
  subtitle: '',
  statusEmoji: '🟩',
  statusLabel: 'Active',
  startedDate: 'Day 1',
  endedDate: 'Ongoing',
  totalSteps: 5,
  progressUnit: DEFAULT_UNIT,
  isRepeatable: false,
  notes: '',
  specialNote: '',
  icon: 'clock',
  iconColor: '#10B981',
  bgTheme: 'white',
  progressStyle: 'segmented-blocks',
  tagsString: '',
  thresholds: [],
});

export const draftFromEvent = (e: TrackedEvent): EventDraft => ({
  title: e.title,
  subtitle: e.subtitle || '',
  statusEmoji: e.statusEmoji || '🟩',
  statusLabel: e.statusLabel || 'Active',
  startedDate: e.startedDate || '',
  endedDate: e.endedDate || '',
  totalSteps: e.totalSteps,
  progressUnit: unitOf(e),
  isRepeatable: e.isRepeatable,
  notes: e.notes || '',
  specialNote: e.specialNote || '',
  icon: e.icon,
  iconColor: e.iconColor,
  bgTheme: e.bgTheme,
  progressStyle: e.progressStyle,
  tagsString: e.tags.join(', '),
  thresholds: [...e.thresholds],
});

export const draftFromRecord = (r: CompletedEventRecord, now: number): EventDraft => ({
  ...emptyDraft(),
  title: `${r.title.replace(CYCLE_SUFFIX, '')} (Copy)`,
  subtitle: r.subtitle || '',
  endedDate: 'Day ?',
  totalSteps: r.totalSteps,
  progressUnit: unitOf(r),
  isRepeatable: r.isRepeatable,
  notes: r.notes || '',
  specialNote: r.specialNote || '',
  icon: r.icon,
  iconColor: r.iconColor,
  bgTheme: r.bgTheme,
  progressStyle: r.progressStyle,
  tagsString: r.tags.join(', '),
  thresholds: r.thresholds.map((t, i) => ({ ...t, id: `t-clone-${now}-${i}` })),
});

/** Applies a submitted form to an existing event, or creates a new one. */
export function eventFromDraft(draft: EventDraft, existing: TrackedEvent | undefined, now: number): TrackedEvent {
  const totalSteps = clampSteps(draft.totalSteps);
  const fields = {
    title: draft.title.trim(),
    subtitle: draft.subtitle.trim() || undefined,
    statusEmoji: draft.statusEmoji,
    statusLabel: draft.statusLabel.trim() || undefined,
    startedDate: draft.startedDate.trim() || undefined,
    endedDate: draft.endedDate.trim() || undefined,
    totalSteps,
    progressUnit: draft.progressUnit.trim() || DEFAULT_UNIT,
    isRepeatable: draft.isRepeatable,
    notes: draft.notes.trim() || undefined,
    specialNote: draft.specialNote.trim() || undefined,
    icon: draft.icon,
    iconColor: draft.iconColor,
    bgTheme: draft.bgTheme,
    progressStyle: draft.progressStyle,
    tags: parseTags(draft.tagsString),
    thresholds: draft.thresholds.filter((t) => t.message.trim().length > 0).sort((a, b) => a.step - b.step),
    isUserCreated: true,
  };

  if (existing) {
    return { ...existing, ...fields, currentStep: Math.min(existing.currentStep, totalSteps) };
  }
  return { id: `ev-${now}`, ...fields, currentStep: 0, completionCount: 0, selected: true };
}

// ---------------------------------------------------------------------------
// Search, filters, ordering
// ---------------------------------------------------------------------------

type Searchable = Pick<TrackedEvent, 'title' | 'subtitle' | 'notes' | 'specialNote' | 'tags' | 'thresholds'>;

const matchesQuery = (item: Searchable, q: string) =>
  item.title.toLowerCase().includes(q) ||
  !!item.subtitle?.toLowerCase().includes(q) ||
  !!item.notes?.toLowerCase().includes(q) ||
  !!item.specialNote?.toLowerCase().includes(q) ||
  item.tags.some((t) => t.toLowerCase().includes(q)) ||
  item.thresholds.some((t) => !!t.title?.toLowerCase().includes(q) || t.message.toLowerCase().includes(q));

const hasTag = (item: { tags: string[] }, tag: string) => {
  const wanted = tag.toLowerCase().trim();
  return item.tags.some((t) => t.toLowerCase().trim() === wanted);
};

export interface ItemFilter {
  query: string;
  tag: string; // 'all' or a tag
}

export function filterItems<T extends Searchable>(items: T[], { query, tag }: ItemFilter): T[] {
  const q = query.toLowerCase().trim();
  if (!q && tag === 'all') return items;
  return items.filter((item) => (tag === 'all' || hasTag(item, tag)) && (!q || matchesQuery(item, q)));
}

export function filterEvents(
  events: TrackedEvent[],
  filter: ItemFilter & { mode: 'all' | 'repeatable' | 'single' }
): TrackedEvent[] {
  const byMode =
    filter.mode === 'all'
      ? events
      : events.filter((e) => (filter.mode === 'repeatable' ? e.isRepeatable : !e.isRepeatable));
  return filterItems(byMode, filter);
}

/**
 * Display order: the event that just triggered a threshold, then events sitting
 * exactly on a threshold step, then events with any threshold reached, then the rest.
 * The sort is stable, so ties keep their stored order.
 */
export function sortForDisplay(events: TrackedEvent[], recentlyTriggeredId: string | null): TrackedEvent[] {
  const rank = (e: TrackedEvent) => {
    if (e.id === recentlyTriggeredId) return 0;
    if (e.thresholds.some((t) => e.currentStep === t.step)) return 1;
    if (hasReachedAnyThreshold(e)) return 2;
    return 3;
  };
  return events
    .map((event, index) => ({ event, index, rank: rank(event) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((x) => x.event);
}

export const collectTags = (...lists: { tags: string[] }[][]) => {
  const set = new Set<string>();
  for (const list of lists) for (const item of list) for (const t of item.tags) set.add(t.toLowerCase().trim());
  return Array.from(set).filter(Boolean).sort();
};

// ---------------------------------------------------------------------------
// Clipboard summaries
// ---------------------------------------------------------------------------

export function eventsSummaryText(events: TrackedEvent[]): string {
  return events
    .map((e) => {
      const unit = unitOf(e);
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
      }\nStarted: ${e.startedDate || 'N/A'} | Ended: ${e.endedDate || 'N/A'}\nProgress: ${e.currentStep}/${
        e.totalSteps
      } ${unit} (${percentOf(e)}%)${thresholdText}${noteText}${specialText}${tagsText}\n`;
    })
    .join('\n---\n\n');
}

export function historySummaryText(history: CompletedEventRecord[]): string {
  return history
    .map((h) => {
      const unit = unitOf(h);
      const thresholdText =
        h.thresholds.length > 0
          ? '\nConquered Thresholds:\n' +
            h.thresholds.map((t) => ` - [${t.step}/${h.totalSteps} ${unit}] ${t.title || 'Checkpoint'}: ${t.message}`).join('\n')
          : '';
      return `📜 [COMPLETED] ${h.title}${h.subtitle ? ` - ${h.subtitle}` : ''}\nTimeline: ${h.startedDate || 'N/A'} → ${
        h.endedDate || 'Completed'
      }\nFinished at: ${h.finalSteps}/${h.totalSteps} ${unit} (${h.completedAt})\nTags: #${h.tags.join(' #')}${
        h.notes ? `\nNotes: ${h.notes}` : ''
      }${h.specialNote ? `\nSpecial Note: ${h.specialNote}` : ''}${thresholdText}\n`;
    })
    .join('\n=========================\n\n');
}

// ---------------------------------------------------------------------------
// Loading saved data defensively (older saves or hand-edited backups may miss fields)
// ---------------------------------------------------------------------------

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const strArray = (v: unknown) => (Array.isArray(v) ? v.filter((t): t is string => typeof t === 'string') : []);
const thresholds = (v: unknown): EventThreshold[] =>
  Array.isArray(v)
    ? v
        .filter(isObj)
        .map((t, i) => ({
          id: typeof t.id === 'string' ? t.id : `t-${i}`,
          step: num(t.step, 1),
          title: typeof t.title === 'string' ? t.title : undefined,
          message: typeof t.message === 'string' ? t.message : '',
        }))
    : [];

export function normalizeEvent(raw: unknown): TrackedEvent | null {
  if (!isObj(raw) || typeof raw.id !== 'string') return null;
  const e = raw as unknown as TrackedEvent;
  return {
    ...e,
    title: typeof e.title === 'string' ? e.title : 'Untitled event',
    currentStep: Math.max(0, num(e.currentStep, 0)),
    totalSteps: clampSteps(num(e.totalSteps, 1)),
    completionCount: Math.max(0, num(e.completionCount, 0)),
    isRepeatable: !!e.isRepeatable,
    selected: !!e.selected,
    tags: strArray(e.tags),
    thresholds: thresholds(e.thresholds),
  };
}

export function normalizeRecord(raw: unknown): CompletedEventRecord | null {
  if (!isObj(raw) || typeof raw.id !== 'string') return null;
  const r = raw as unknown as CompletedEventRecord;
  return {
    ...r,
    title: typeof r.title === 'string' ? r.title : 'Untitled event',
    totalSteps: num(r.totalSteps, 1),
    finalSteps: num(r.finalSteps, 0),
    completionCountAtArchive: num(r.completionCountAtArchive, 0),
    originalEventId: typeof r.originalEventId === 'string' ? r.originalEventId : r.id,
    completedAt: typeof r.completedAt === 'string' ? r.completedAt : 'Completed',
    tags: strArray(r.tags),
    thresholds: thresholds(r.thresholds),
  };
}
