import React, { memo, useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import {
  Archive,
  Check,
  CheckSquare,
  ChevronRight,
  Clock,
  Copy,
  FileText,
  Globe,
  History,
  Plus,
  Search,
  Square,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { WindowFrame } from '../window/WindowFrame';
import type { DesktopWidgetProps } from '../desktop/types';
import { STORAGE_KEYS, writeJSON, writeText } from '../../lib/storage';
import { copyText } from '../../lib/browser';
import { useOnProgressLoaded, usePersistedValue, useTransientValue } from '../../lib/hooks';
import { EventCard } from './EventCard';
import { HistoryCard } from './HistoryCard';
import { EventForm } from './EventForm';
import {
  collectTags,
  draftFromEvent,
  draftFromRecord,
  emptyDraft,
  eventsSummaryText,
  filterEvents,
  filterItems,
  getEffectiveTimelineMarkers,
  historySummaryText,
  isBaseItem,
  isTimelineCompressed,
  sortForDisplay,
} from './logic';
import { initTrackerState, loadCompressed, loadEvents, loadHistory, trackerReducer } from './state';
import type { CompletedEventRecord, EventDraft, TrackedEvent } from './types';

// Re-exported for anything that imported these from the old single-file widget.
export type {
  CompletedEventRecord,
  EventBgTheme,
  EventIconName,
  EventThreshold,
  ProgressBarStyle,
  TimelineMarker,
  TrackedEvent,
} from './types';
export { BASE_EVENT_IDS } from './seedData';
export { getEffectiveTimelineMarkers, getRepeatableMarkerLabel } from './logic';
export { loadEvents as loadInitialEvents, loadHistory as loadInitialHistory } from './state';

type ViewTab = 'active' | 'history';
type FilterMode = 'all' | 'repeatable' | 'single';

interface FormSession {
  key: number;
  editingId: string | null;
  draft: EventDraft;
}

const ALERT_DURATION_MS = 8000;

const tagChipClass = (active: boolean) =>
  `px-2 py-0.5 rounded-md transition-colors shrink-0 ${
    active ? 'bg-neutral-900 text-white font-semibold' : 'bg-white border border-neutral-200 hover:border-neutral-300 text-neutral-700'
  }`;

const allChipClass = (active: boolean) =>
  `px-2 py-0.5 rounded-md transition-colors shrink-0 ${
    active ? 'bg-neutral-900 text-white font-semibold' : 'bg-neutral-200/60 hover:bg-neutral-200 text-neutral-700'
  }`;

const SearchBox: React.FC<{ value: string; onChange: (v: string) => void; placeholder: string }> = ({
  value,
  onChange,
  placeholder,
}) => (
  <div className="relative">
    <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full text-xs bg-white pl-8 pr-7 py-1.5 rounded-xl border border-neutral-200 outline-none focus:border-black transition-colors"
    />
    {value && (
      <button
        onClick={() => onChange('')}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black p-0.5"
        title="Clear search"
        aria-label="Clear search"
      >
        <X className="w-3 h-3" />
      </button>
    )}
  </div>
);

const TagStrip: React.FC<{ tags: string[]; active: string; allLabel: string; onSelect: (tag: string) => void }> = ({
  tags,
  active,
  allLabel,
  onSelect,
}) =>
  tags.length === 0 ? null : (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[11px] text-neutral-500 scrollbar-none">
      <Tag className="w-3 h-3 text-neutral-400 shrink-0" />
      <button onClick={() => onSelect('all')} className={allChipClass(active === 'all')}>
        {allLabel}
      </button>
      {tags.map((tag) => (
        <button key={tag} onClick={() => onSelect(active === tag ? 'all' : tag)} className={tagChipClass(active === tag)}>
          #{tag}
        </button>
      ))}
    </div>
  );

export const EventTrackerWidget = memo(function EventTrackerWidget(props: DesktopWidgetProps) {
  const [state, dispatch] = useReducer(trackerReducer, undefined, initTrackerState);
  const { events, history, compressed, expanded, recentlyTriggeredId, alert } = state;

  const [view, setView] = useState<ViewTab>('active');
  const [copied, markCopied] = useTransientValue<boolean>();
  const [form, setForm] = useState<FormSession | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [tagFilter, setTagFilter] = useState('all');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [historyQuery, setHistoryQuery] = useState('');
  const [historyTag, setHistoryTag] = useState('all');

  // Persistence (debounced). Same keys as before; the events backup key is kept in sync too.
  usePersistedValue(STORAGE_KEYS.worldClockEvents, events, (v) => {
    writeJSON(STORAGE_KEYS.worldClockEvents, v);
    writeJSON(STORAGE_KEYS.worldClockEventsBackup, v);
  });
  usePersistedValue(STORAGE_KEYS.worldClockHistory, history, (v) => writeJSON(STORAGE_KEYS.worldClockHistory, v));
  usePersistedValue(STORAGE_KEYS.worldClockCompressed, compressed, (v) => writeJSON(STORAGE_KEYS.worldClockCompressed, v));

  useOnProgressLoaded(() =>
    dispatch({ type: 'reload', events: loadEvents(), history: loadHistory(), compressed: loadCompressed() })
  );

  // Auto-dismiss the threshold alert.
  useEffect(() => {
    if (!alert) return;
    const timer = setTimeout(() => dispatch({ type: 'dismissAlert' }), ALERT_DURATION_MS);
    return () => clearTimeout(timer);
  }, [alert]);

  // --- Derived data ---------------------------------------------------------

  const selectedCount = useMemo(() => events.filter((e) => e.selected).length, [events]);
  const allSelected = events.length > 0 && selectedCount === events.length;
  const hasBaseEvents = useMemo(() => events.some(isBaseItem), [events]);
  const activeTags = useMemo(() => collectTags(events), [events]);
  const historyTags = useMemo(() => collectTags(history), [history]);
  const existingTags = useMemo(() => collectTags(events, history), [events, history]);

  const visibleEvents = useMemo(
    () => sortForDisplay(filterEvents(events, { query: searchQuery, tag: tagFilter, mode: filterMode }), recentlyTriggeredId),
    [events, searchQuery, tagFilter, filterMode, recentlyTriggeredId]
  );
  const visibleHistory = useMemo(
    () => filterItems(history, { query: historyQuery, tag: historyTag }),
    [history, historyQuery, historyTag]
  );

  const areAllCompressed = useMemo(() => {
    const withMarkers = events.filter((e) => getEffectiveTimelineMarkers(e).length > 0);
    return withMarkers.every((e) => compressed[e.id] !== false);
  }, [events, compressed]);

  // --- Stable callbacks for memoized cards ------------------------------------

  const openEditForm = useCallback(
    (event: TrackedEvent) => setForm({ key: Date.now(), editingId: event.id, draft: draftFromEvent(event) }),
    []
  );
  const openCloneForm = useCallback((record: CompletedEventRecord) => {
    setForm({ key: Date.now(), editingId: null, draft: draftFromRecord(record, Date.now()) });
  }, []);
  const restoreRecord = useCallback((record: CompletedEventRecord) => {
    dispatch({ type: 'restore', recordId: record.id, now: Date.now() });
    setView('active');
  }, []);
  const toggleTagFilter = useCallback((tag: string) => setTagFilter((cur) => (cur === tag ? 'all' : tag)), []);
  const toggleHistoryTag = useCallback((tag: string) => setHistoryTag((cur) => (cur === tag ? 'all' : tag)), []);

  const openCreateForm = () => setForm({ key: Date.now(), editingId: null, draft: emptyDraft() });
  const closeForm = useCallback(() => setForm(null), []);
  const submitForm = useCallback(
    (draft: EventDraft) => {
      dispatch({ type: 'saveDraft', editingId: form?.editingId ?? null, draft, now: Date.now() });
      setForm(null);
    },
    [form?.editingId]
  );

  const purgeBaseEvents = () => {
    writeText(STORAGE_KEYS.worldClockBasePurged, 'true');
    dispatch({ type: 'purgeBase' });
  };

  const clearHistory = () => {
    if (window.confirm('Are you sure you want to clear all completed event records from history?')) {
      dispatch({ type: 'clearHistory' });
    }
  };

  const copySummary = async () => {
    if (view === 'history' && history.length === 0) return;
    const text = view === 'active' ? eventsSummaryText(events) : historySummaryText(history);
    if (await copyText(text)) markCopied(true);
  };

  const filtersActive = searchQuery !== '' || tagFilter !== 'all' || filterMode !== 'all';

  return (
    <WindowFrame
      {...props}
      minWidth={420}
      minHeight={380}
      className="select-none"
      initialRect={() => ({ x: 280, y: 55, width: 700, height: 620 })}
      title={
        <>
          <Globe className="w-3.5 h-3.5 text-emerald-600" />
          <span>World Clock</span>
        </>
      }
      actions={
        <>
          <span
            className="text-[10px] text-emerald-600 flex items-center gap-1 font-mono font-medium"
            title="All created events and progress are saved in your browser"
          >
            <Check className="w-2.5 h-2.5 stroke-[3]" />
            <span className="hidden sm:inline">Saved</span>
          </span>
          <button
            onClick={copySummary}
            className="p-1 rounded-md hover:bg-neutral-200 text-neutral-500 hover:text-black text-[11px] flex items-center gap-1 transition-colors"
            title={view === 'active' ? 'Copy World Clock summary to clipboard' : 'Copy Chronicle log to clipboard'}
          >
            {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
          </button>
        </>
      }
    >
      {/* Primary tabs */}
      <div className="flex items-center justify-between px-3 pt-2 pb-1.5 bg-neutral-100/70 border-b border-neutral-200 shrink-0">
        <div className="flex items-center gap-1 p-0.5 bg-neutral-200/80 rounded-xl" role="tablist">
          <button
            role="tab"
            aria-selected={view === 'active'}
            onClick={() => setView('active')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              view === 'active' ? 'bg-white text-black shadow-xs' : 'text-neutral-600 hover:text-black'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            <span>World Clock</span>
            <span
              className={`px-1.5 rounded-full text-[10px] font-mono ${
                view === 'active' ? 'bg-neutral-900 text-white' : 'bg-neutral-300 text-neutral-700'
              }`}
            >
              {events.length}
            </span>
          </button>
          <button
            role="tab"
            aria-selected={view === 'history'}
            onClick={() => setView('history')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              view === 'history' ? 'bg-white text-black shadow-xs' : 'text-neutral-600 hover:text-black'
            }`}
          >
            <History className="w-3.5 h-3.5 text-amber-600" />
            <span>Chronicle & History</span>
            <span
              className={`px-1.5 rounded-full text-[10px] font-mono font-bold ${
                view === 'history' ? 'bg-amber-500 text-black' : 'bg-neutral-300 text-neutral-700'
              }`}
            >
              {history.length}
            </span>
          </button>
        </div>

        {view === 'active' ? (
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
              onClick={openCreateForm}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition-all shadow-xs ${
                form && !form.editingId ? 'bg-black text-white' : 'bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-200'
              }`}
            >
              <Plus className="w-3 h-3" />
              <span>New Event</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            {history.length > 0 && (
              <button
                onClick={clearHistory}
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

      {/* Toolbars */}
      {view === 'active' ? (
        <div className="p-3 bg-neutral-50/80 border-b border-neutral-200 space-y-2.5 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => dispatch({ type: 'advanceSelected', now: Date.now() })}
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
              <button
                onClick={() => dispatch({ type: 'setAllSelected', selected: !allSelected })}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-100 text-[11px] font-medium text-neutral-700 transition-all"
                title={allSelected ? 'Deselect all events' : 'Select all events'}
              >
                {allSelected ? <CheckSquare className="w-3.5 h-3.5 text-black" /> : <Square className="w-3.5 h-3.5 text-neutral-400" />}
                <span>{allSelected ? 'All Selected' : 'Select All'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 p-0.5 bg-neutral-200/60 rounded-xl text-[11px] shrink-0">
                {(['all', 'repeatable', 'single'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setFilterMode(mode)}
                    className={`px-2 py-1 rounded-lg font-medium transition-all capitalize ${
                      filterMode === mode ? 'bg-white text-black shadow-xs font-semibold' : 'text-neutral-600 hover:text-black'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              <button
                onClick={() => dispatch({ type: 'setAllCompressed', value: !areAllCompressed })}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-100 text-[11px] font-medium text-neutral-700 transition-all shadow-2xs"
                title="Toggle space-saving compression of timeline milestone markers across all events"
              >
                <Clock className="w-3 h-3 text-neutral-500" />
                <span>{areAllCompressed ? 'Expand Timelines' : 'Compress Timelines'}</span>
              </button>
            </div>
          </div>

          <SearchBox value={searchQuery} onChange={setSearchQuery} placeholder="Search World Clock by name, unit, lore, or #tags..." />
          <TagStrip tags={activeTags} active={tagFilter} allLabel="All Tags" onSelect={setTagFilter} />
        </div>
      ) : (
        <div className="p-3 bg-neutral-50/80 border-b border-neutral-200 space-y-2.5 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-neutral-900 flex items-center gap-1.5">
                <Archive className="w-3.5 h-3.5 text-amber-600" />
                <span>World Chronicle Log</span>
              </span>
              <span className="text-[11px] text-neutral-500">Log of all conquered events and repeatable cycle milestones</span>
            </div>
            <button
              onClick={copySummary}
              disabled={history.length === 0}
              className="flex items-center gap-1 px-3 py-1 rounded-xl bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-200 text-xs font-semibold shadow-2xs transition-all disabled:opacity-50"
            >
              <FileText className="w-3 h-3" />
              <span>Copy Chronicle Log</span>
            </button>
          </div>
          <SearchBox value={historyQuery} onChange={setHistoryQuery} placeholder="Search Chronicle by title, unit, lore, or tags..." />
          <TagStrip tags={historyTags} active={historyTag} allLabel="All Chronicle Tags" onSelect={setHistoryTag} />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-3 bg-neutral-100/50">
        {form && (
          <EventForm
            key={form.key}
            initialDraft={form.draft}
            isEditing={!!form.editingId}
            existingTags={existingTags}
            onSubmit={submitForm}
            onCancel={closeForm}
          />
        )}

        {view === 'active' && (
          <div className="space-y-3.5">
            {alert && (
              <div
                role="alert"
                className="p-3 bg-red-600 text-white rounded-2xl shadow-lg flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-white text-red-600 flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                    !
                  </div>
                  <div className="min-w-0">
                    <div className="font-extrabold text-xs tracking-tight flex items-center gap-1.5 flex-wrap">
                      <span>Event Happening Today: {alert.title}!</span>
                      <span className="font-mono text-[10px] px-1.5 rounded bg-black/30 text-white font-bold">
                        Threshold {alert.step}/{alert.totalSteps} {alert.unit}
                      </span>
                    </div>
                    <div className="text-[11px] text-red-100 truncate mt-0.5">
                      {alert.threshTitle}: Event popped to top of list! Check out what it is below.
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => dispatch({ type: 'expand', id: alert.eventId })}
                    className="px-2.5 py-1 rounded-xl bg-white text-red-600 hover:bg-red-50 text-[11px] font-bold shadow-xs transition-colors"
                  >
                    Check Event
                  </button>
                  <button
                    onClick={() => dispatch({ type: 'dismissAlert' })}
                    className="p-1 hover:bg-white/20 rounded-lg text-white transition-colors"
                    title="Dismiss alert"
                    aria-label="Dismiss alert"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {visibleEvents.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-neutral-200 space-y-3">
                <Clock className="w-8 h-8 text-neutral-300 mx-auto" />
                <div className="text-sm font-bold text-neutral-800">
                  {events.length === 0 ? 'No events currently in World Clock' : 'No matching events found'}
                </div>
                <div className="text-xs text-neutral-500 max-w-sm mx-auto">
                  {events.length === 0 ? 'Click "+ New Event" to create and track events.' : 'Try clearing filters or search query.'}
                </div>
                {events.length === 0 && (
                  <button
                    type="button"
                    onClick={openCreateForm}
                    className="px-3.5 py-1.5 rounded-xl bg-black hover:bg-neutral-800 text-white text-xs font-semibold shadow-xs transition-all inline-block"
                  >
                    + New Event
                  </button>
                )}
                {filtersActive && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setTagFilter('all');
                      setFilterMode('all');
                    }}
                    className="mt-2 text-xs text-black font-semibold underline block mx-auto"
                  >
                    Reset all filters
                  </button>
                )}
              </div>
            ) : (
              visibleEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  isRecentlyTriggered={recentlyTriggeredId === event.id}
                  isExpanded={!!expanded[event.id]}
                  isCompressed={isTimelineCompressed(event, compressed)}
                  activeTag={tagFilter}
                  dispatch={dispatch}
                  onEdit={openEditForm}
                  onTagClick={toggleTagFilter}
                />
              ))
            )}
          </div>
        )}

        {view === 'history' && (
          <div className="space-y-3.5">
            {visibleHistory.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-neutral-200 space-y-2">
                <History className="w-8 h-8 text-neutral-300 mx-auto" />
                <div className="text-sm font-bold text-neutral-700">No completed events in Chronicle yet</div>
                <div className="text-xs text-neutral-400 max-w-sm mx-auto">
                  {historyQuery || historyTag !== 'all'
                    ? 'No completed records match the search filter.'
                    : 'When events finish their targets or complete repeatable cycles, they will be preserved in this Chronicle.'}
                </div>
                {(historyQuery || historyTag !== 'all') && (
                  <button
                    onClick={() => {
                      setHistoryQuery('');
                      setHistoryTag('all');
                    }}
                    className="mt-2 text-xs text-black font-semibold underline"
                  >
                    Clear chronicle filters
                  </button>
                )}
              </div>
            ) : (
              visibleHistory.map((record) => (
                <HistoryCard
                  key={record.id}
                  record={record}
                  isExpanded={!!expanded[record.id]}
                  isCompressed={isTimelineCompressed(record, compressed)}
                  activeTag={historyTag}
                  dispatch={dispatch}
                  onRestore={restoreRecord}
                  onClone={openCloneForm}
                  onTagClick={toggleHistoryTag}
                />
              ))
            )}
          </div>
        )}
      </div>
    </WindowFrame>
  );
});
