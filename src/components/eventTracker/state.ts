/**
 * World Clock state as a single reducer.
 *
 * The original component updated history *inside* the events state updater and
 * read results back out through closure variables. React may run updaters
 * later (or twice in Strict Mode), so cycle records could be duplicated and the
 * threshold alert could silently fail to appear. Every transition here is a
 * pure function of (state, action), and `dispatch` is stable, so the memoized
 * cards never need fresh callbacks.
 */
import { STORAGE_KEYS, readJSON, readText } from '../../lib/storage';
import {
  archiveRecordFor,
  eventFromDraft,
  eventFromRecord,
  getEffectiveTimelineMarkers,
  hasReachedAnyThreshold,
  isBaseItem,
  moveToStep,
  normalizeEvent,
  normalizeRecord,
  stepFromBlockClick,
  unitOf,
  type StepOutcome,
} from './logic';
import { INITIAL_EVENTS, INITIAL_HISTORY } from './seedData';
import type { CompletedEventRecord, EventDraft, ThresholdAlert, TrackedEvent } from './types';

export interface TrackerState {
  events: TrackedEvent[];
  history: CompletedEventRecord[];
  compressed: Record<string, boolean>;
  expanded: Record<string, boolean>;
  recentlyTriggeredId: string | null;
  alert: ThresholdAlert | null;
}

export type TrackerAction =
  | { type: 'advanceSelected'; now: number }
  | { type: 'advanceOne'; id: string; now: number }
  | { type: 'clickStep'; id: string; stepIndex: number; now: number }
  | { type: 'toggleSelect'; id: string }
  | { type: 'setAllSelected'; selected: boolean }
  | { type: 'reset'; id: string }
  | { type: 'delete'; id: string }
  | { type: 'archive'; id: string; now: number }
  | { type: 'restore'; recordId: string; now: number }
  | { type: 'deleteRecord'; recordId: string }
  | { type: 'clearHistory' }
  | { type: 'saveDraft'; editingId: string | null; draft: EventDraft; now: number }
  | { type: 'purgeBase' }
  | { type: 'toggleCompressed'; id: string }
  | { type: 'setAllCompressed'; value: boolean }
  | { type: 'toggleExpanded'; id: string }
  | { type: 'expand'; id: string }
  | { type: 'dismissAlert' }
  | { type: 'reload'; events: TrackedEvent[]; history: CompletedEventRecord[]; compressed: Record<string, boolean> };

// ---------------------------------------------------------------------------
// Loading from storage (same keys and precedence as before)
// ---------------------------------------------------------------------------

const isBasePurged = () => readText(STORAGE_KEYS.worldClockBasePurged) === 'true';

const normalizeList = <T>(raw: unknown[], normalize: (v: unknown) => T | null) =>
  raw.map(normalize).filter((v): v is T => v !== null);

export function loadEvents(): TrackedEvent[] {
  const purged = isBasePurged();
  const saved = readJSON(STORAGE_KEYS.worldClockEvents);
  if (Array.isArray(saved)) {
    const events = normalizeList(saved, normalizeEvent);
    return purged ? events.filter((e) => !isBaseItem(e)) : events;
  }
  const backup = readJSON(STORAGE_KEYS.worldClockEventsBackup);
  if (Array.isArray(backup) && backup.length > 0) return normalizeList(backup, normalizeEvent);
  return purged ? [] : INITIAL_EVENTS;
}

export function loadHistory(): CompletedEventRecord[] {
  const purged = isBasePurged();
  const saved = readJSON(STORAGE_KEYS.worldClockHistory);
  if (Array.isArray(saved)) {
    const history = normalizeList(saved, normalizeRecord);
    return purged ? history.filter((h) => !isBaseItem(h)) : history;
  }
  return purged ? [] : INITIAL_HISTORY;
}

export function loadCompressed(): Record<string, boolean> {
  const saved = readJSON(STORAGE_KEYS.worldClockCompressed);
  return typeof saved === 'object' && saved !== null && !Array.isArray(saved)
    ? (saved as Record<string, boolean>)
    : { 'scene-word-count': true };
}

export const initTrackerState = (): TrackerState => ({
  events: loadEvents(),
  history: loadHistory(),
  compressed: loadCompressed(),
  expanded: { 'dark-gate': true, 'hist-ancient-seal': true },
  recentlyTriggeredId: null,
  alert: null,
});

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

const alertFor = (event: TrackedEvent, outcome: StepOutcome): ThresholdAlert | null =>
  outcome.triggered
    ? {
        eventId: event.id,
        title: event.title,
        threshTitle: outcome.triggered.title || outcome.triggered.message.slice(0, 50),
        step: outcome.triggered.step,
        totalSteps: event.totalSteps,
        unit: unitOf(event),
      }
    : null;

/** Shared by "Advance" on one card and clicking a step block. */
function applySingleStep(state: TrackerState, id: string, targetStep: (e: TrackedEvent) => number, now: number): TrackerState {
  const target = state.events.find((e) => e.id === id);
  if (!target) return state;

  const outcome = moveToStep(target, targetStep(target), now);
  const updated = outcome.event;

  // Events with a reached threshold pop to the top of the list.
  const events =
    outcome.triggered || hasReachedAnyThreshold(updated)
      ? [updated, ...state.events.filter((e) => e.id !== id)]
      : state.events.map((e) => (e.id === id ? updated : e));

  const next: TrackerState = {
    ...state,
    events,
    history: outcome.cycleRecord ? [outcome.cycleRecord, ...state.history] : state.history,
  };

  if (outcome.triggered) {
    next.recentlyTriggeredId = id;
    next.expanded = { ...state.expanded, [id]: true };
    next.alert = alertFor(updated, outcome);
  }
  return next;
}

export function trackerReducer(state: TrackerState, action: TrackerAction): TrackerState {
  switch (action.type) {
    case 'advanceSelected': {
      const triggeredIds: string[] = [];
      const newRecords: CompletedEventRecord[] = [];
      let firstAlert: ThresholdAlert | null = null;
      const advanced: TrackedEvent[] = [];

      for (const event of state.events) {
        if (!event.selected) {
          advanced.push(event);
          continue;
        }
        const outcome = moveToStep(event, event.currentStep + 1, action.now);
        advanced.push(outcome.event);
        if (outcome.cycleRecord) newRecords.unshift(outcome.cycleRecord); // newest first, as before
        if (outcome.triggered) {
          triggeredIds.push(event.id);
          firstAlert ??= alertFor(outcome.event, outcome);
        }
      }

      if (advanced.every((e, i) => e === state.events[i])) return state; // nothing selected

      const triggered = new Set(triggeredIds);
      const events = triggered.size
        ? [...advanced.filter((e) => triggered.has(e.id)), ...advanced.filter((e) => !triggered.has(e.id))]
        : advanced;

      const next: TrackerState = { ...state, events, history: [...newRecords, ...state.history] };
      if (firstAlert) {
        next.recentlyTriggeredId = firstAlert.eventId;
        next.expanded = { ...state.expanded, ...Object.fromEntries(triggeredIds.map((id) => [id, true])) };
        next.alert = firstAlert;
      }
      return next;
    }

    case 'advanceOne':
      return applySingleStep(state, action.id, (e) => e.currentStep + 1, action.now);

    case 'clickStep':
      return applySingleStep(state, action.id, (e) => stepFromBlockClick(e, action.stepIndex), action.now);

    case 'toggleSelect':
      return {
        ...state,
        events: state.events.map((e) => (e.id === action.id ? { ...e, selected: !e.selected } : e)),
      };

    case 'setAllSelected':
      return { ...state, events: state.events.map((e) => (e.selected === action.selected ? e : { ...e, selected: action.selected })) };

    case 'reset':
      return {
        ...state,
        events: state.events.map((e) =>
          e.id === action.id ? { ...e, currentStep: 0, completionCount: 0, timelineMarkers: [] } : e
        ),
      };

    case 'delete':
      return { ...state, events: state.events.filter((e) => e.id !== action.id) };

    case 'archive': {
      const target = state.events.find((e) => e.id === action.id);
      if (!target) return state;
      return {
        ...state,
        history: [archiveRecordFor(target, action.now), ...state.history],
        events: state.events.filter((e) => e.id !== action.id),
      };
    }

    case 'restore': {
      const record = state.history.find((h) => h.id === action.recordId);
      if (!record) return state;
      return {
        ...state,
        events: [eventFromRecord(record, action.now), ...state.events],
        history: state.history.filter((h) => h.id !== action.recordId),
      };
    }

    case 'deleteRecord':
      return { ...state, history: state.history.filter((h) => h.id !== action.recordId) };

    case 'clearHistory':
      return { ...state, history: [] };

    case 'saveDraft': {
      if (!action.draft.title.trim()) return state;
      if (action.editingId) {
        return {
          ...state,
          events: state.events.map((e) => (e.id === action.editingId ? eventFromDraft(action.draft, e, action.now) : e)),
        };
      }
      return { ...state, events: [eventFromDraft(action.draft, undefined, action.now), ...state.events] };
    }

    case 'purgeBase':
      return {
        ...state,
        events: state.events.filter((e) => !isBaseItem(e)),
        history: state.history.filter((h) => !isBaseItem(h)),
      };

    case 'toggleCompressed': {
      // Works for both active events and Chronicle records (the original only
      // looked at active events, so the first click on a record did nothing).
      const item = state.events.find((e) => e.id === action.id) ?? state.history.find((h) => h.id === action.id);
      const current = state.compressed[action.id] ?? (item ? getEffectiveTimelineMarkers(item).length >= 2 : false);
      return { ...state, compressed: { ...state.compressed, [action.id]: !current } };
    }

    case 'setAllCompressed':
      return {
        ...state,
        compressed: { ...state.compressed, ...Object.fromEntries(state.events.map((e) => [e.id, action.value])) },
      };

    case 'toggleExpanded':
      return { ...state, expanded: { ...state.expanded, [action.id]: !state.expanded[action.id] } };

    case 'expand':
      return { ...state, expanded: { ...state.expanded, [action.id]: true }, alert: null };

    case 'dismissAlert':
      return state.alert ? { ...state, alert: null } : state;

    case 'reload':
      return { ...state, events: action.events, history: action.history, compressed: action.compressed };

    default:
      return state;
  }
}
