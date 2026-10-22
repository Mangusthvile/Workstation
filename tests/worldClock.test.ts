import { test } from 'node:test';
import assert from 'node:assert/strict';
import { trackerReducer, type TrackerState } from '../src/components/eventTracker/state';
import { emptyDraft, sortForDisplay } from '../src/components/eventTracker/logic';
import type { CompletedEventRecord, TrackedEvent } from '../src/components/eventTracker/types';

const NOW = 1_700_000_000_000;

const makeEvent = (overrides: Partial<TrackedEvent> = {}): TrackedEvent => ({
  id: 'e1',
  title: 'Event',
  currentStep: 0,
  totalSteps: 5,
  progressUnit: 'Days',
  isRepeatable: false,
  completionCount: 0,
  selected: true,
  icon: 'clock',
  iconColor: '#000000',
  bgTheme: 'white',
  progressStyle: 'segmented-blocks',
  tags: [],
  thresholds: [],
  ...overrides,
});

const makeState = (events: TrackedEvent[], history: CompletedEventRecord[] = []): TrackerState => ({
  events,
  history,
  compressed: {},
  expanded: {},
  recentlyTriggeredId: null,
  alert: null,
});

/** Deep-freezes state so any accidental mutation inside the reducer throws. */
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

test('advancing one event moves it forward a step', () => {
  const state = freeze(makeState([makeEvent()]));
  const next = trackerReducer(state, { type: 'advanceOne', id: 'e1', now: NOW });
  assert.equal(next.events[0].currentStep, 1);
  assert.equal(next.alert, null);
});

test('reaching a threshold raises an alert, expands details and pops the event to the top', () => {
  const a = makeEvent({ id: 'a' });
  const b = makeEvent({ id: 'b', currentStep: 1, thresholds: [{ id: 't', step: 2, title: 'Gate opens', message: 'msg' }] });
  const next = trackerReducer(freeze(makeState([a, b])), { type: 'advanceOne', id: 'b', now: NOW });
  assert.deepEqual(next.events.map((e) => e.id), ['b', 'a']);
  assert.equal(next.alert?.eventId, 'b');
  assert.equal(next.alert?.threshTitle, 'Gate opens');
  assert.equal(next.expanded.b, true);
  assert.equal(next.recentlyTriggeredId, 'b');
});

test('finishing a repeatable event starts a new cycle and logs it to the Chronicle', () => {
  const e = makeEvent({ isRepeatable: true, currentStep: 2, totalSteps: 3, startedDate: 'Day 3' });
  const next = trackerReducer(freeze(makeState([e])), { type: 'advanceOne', id: 'e1', now: NOW });
  const ev = next.events[0];
  assert.equal(ev.currentStep, 0);
  assert.equal(ev.completionCount, 1);
  assert.equal(ev.lastCompletedText, 'Completed 1x Day 6');
  assert.equal(ev.timelineMarkers?.length, 1);
  assert.equal(next.history.length, 1);
  assert.equal(next.history[0].title, 'Event (Cycle #1)');
  assert.equal(next.history[0].cycleNumber, 1);
});

test('finishing a single-run event stays at 100% and is not archived automatically', () => {
  const e = makeEvent({ currentStep: 4 });
  const next = trackerReducer(freeze(makeState([e])), { type: 'advanceOne', id: 'e1', now: NOW });
  assert.equal(next.events[0].currentStep, 5);
  assert.equal(next.events[0].completionCount, 1);
  assert.equal(next.history.length, 0);
});

test('bulk advance only touches selected events and puts triggered ones first', () => {
  const a = makeEvent({ id: 'a', selected: true });
  const b = makeEvent({ id: 'b', selected: false });
  const c = makeEvent({ id: 'c', selected: true, thresholds: [{ id: 't', step: 1, message: 'hit' }] });
  const next = trackerReducer(freeze(makeState([a, b, c])), { type: 'advanceSelected', now: NOW });
  assert.deepEqual(next.events.map((e) => [e.id, e.currentStep]), [
    ['c', 1],
    ['a', 1],
    ['b', 0],
  ]);
  assert.equal(next.alert?.eventId, 'c');
});

test('bulk advance with nothing selected is a no-op', () => {
  const state = freeze(makeState([makeEvent({ selected: false })]));
  assert.equal(trackerReducer(state, { type: 'advanceSelected', now: NOW }), state);
});

test('bulk advance logs several finished cycles newest-first', () => {
  const a = makeEvent({ id: 'a', isRepeatable: true, currentStep: 4 });
  const b = makeEvent({ id: 'b', isRepeatable: true, currentStep: 4 });
  const next = trackerReducer(freeze(makeState([a, b])), { type: 'advanceSelected', now: NOW });
  assert.deepEqual(next.history.map((h) => h.originalEventId), ['b', 'a']);
});

test('clicking a step block sets progress, and clicking the current step steps back', () => {
  const s1 = trackerReducer(freeze(makeState([makeEvent()])), { type: 'clickStep', id: 'e1', stepIndex: 2, now: NOW });
  assert.equal(s1.events[0].currentStep, 3);
  const s2 = trackerReducer(freeze(s1), { type: 'clickStep', id: 'e1', stepIndex: 2, now: NOW });
  assert.equal(s2.events[0].currentStep, 2);
});

test('clicking the last block of a repeatable event also logs the cycle (now consistent with Advance)', () => {
  const e = makeEvent({ isRepeatable: true, currentStep: 1, totalSteps: 3 });
  const next = trackerReducer(freeze(makeState([e])), { type: 'clickStep', id: 'e1', stepIndex: 2, now: NOW });
  assert.equal(next.events[0].completionCount, 1);
  assert.equal(next.history.length, 1);
});

test('archive and restore round-trip an event', () => {
  const archived = trackerReducer(freeze(makeState([makeEvent({ currentStep: 3, endedDate: 'Day 9' })])), {
    type: 'archive',
    id: 'e1',
    now: NOW,
  });
  assert.equal(archived.events.length, 0);
  assert.equal(archived.history[0].completedAt, 'Completed Day 9');

  const restored = trackerReducer(freeze(archived), { type: 'restore', recordId: archived.history[0].id, now: NOW + 1 });
  assert.equal(restored.history.length, 0);
  assert.equal(restored.events[0].title, 'Event');
  assert.equal(restored.events[0].currentStep, 0);
});

test('saving a draft creates new events and updates existing ones (progress clamps to the new total)', () => {
  const created = trackerReducer(freeze(makeState([])), {
    type: 'saveDraft',
    editingId: null,
    draft: { ...emptyDraft(), title: '  New one ', tagsString: '#Quest, writing, ', totalSteps: 10 },
    now: NOW,
  });
  assert.equal(created.events[0].title, 'New one');
  assert.deepEqual(created.events[0].tags, ['quest', 'writing']);

  const edited = trackerReducer(freeze(makeState([makeEvent({ currentStep: 4 })])), {
    type: 'saveDraft',
    editingId: 'e1',
    draft: { ...emptyDraft(), title: 'Renamed', totalSteps: 3 },
    now: NOW,
  });
  assert.equal(edited.events[0].title, 'Renamed');
  assert.equal(edited.events[0].totalSteps, 3);
  assert.equal(edited.events[0].currentStep, 3);
});

test('a blank title is ignored', () => {
  const state = freeze(makeState([]));
  assert.equal(trackerReducer(state, { type: 'saveDraft', editingId: null, draft: emptyDraft(), now: NOW }), state);
});

test('compress toggle works on Chronicle records on the first click', () => {
  const record = {
    id: 'h1',
    isRepeatable: true,
    completionCountAtArchive: 3,
    timelineMarkers: [
      { id: 'm1', cycle: 1, label: 'one' },
      { id: 'm2', cycle: 2, label: 'two' },
    ],
  } as unknown as CompletedEventRecord;
  const next = trackerReducer(freeze(makeState([], [record])), { type: 'toggleCompressed', id: 'h1' });
  // Two markers are compressed by default, so the first click must expand them.
  assert.equal(next.compressed.h1, false);
});

test('purging base events removes them from both lists', () => {
  const next = trackerReducer(
    freeze(
      makeState(
        [makeEvent({ id: 'dark-gate' }), makeEvent({ id: 'mine' })],
        [{ id: 'hist-ancient-seal', tags: [], thresholds: [] } as unknown as CompletedEventRecord]
      )
    ),
    { type: 'purgeBase' }
  );
  assert.deepEqual(next.events.map((e) => e.id), ['mine']);
  assert.equal(next.history.length, 0);
});

test('display order: just-triggered, then on-threshold-today, then any reached, then the rest (stable)', () => {
  const plain1 = makeEvent({ id: 'p1' });
  const reached = makeEvent({ id: 'r', currentStep: 3, thresholds: [{ id: 't', step: 2, message: '' }] });
  const today = makeEvent({ id: 'd', currentStep: 2, thresholds: [{ id: 't', step: 2, message: '' }] });
  const plain2 = makeEvent({ id: 'p2' });
  const order = sortForDisplay([plain1, reached, today, plain2], 'p2').map((e) => e.id);
  assert.deepEqual(order, ['p2', 'd', 'r', 'p1']);
});
