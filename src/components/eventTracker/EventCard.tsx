import React, { memo, useCallback } from 'react';
import { Archive, Award, CheckCheck, ChevronDown, ChevronRight, Edit3, Repeat, RotateCcw, Trash2 } from 'lucide-react';
import { getTheme } from './constants';
import { percentOf, unitOf } from './logic';
import { ProgressDisplay } from './ProgressDisplay';
import { AlertDot, CardIcon, SpecialNote, ThresholdsPanel, TimelineRow, UnitBadge } from './parts';
import type { TrackerAction } from './state';
import type { TrackedEvent } from './types';

interface EventCardProps {
  event: TrackedEvent;
  isRecentlyTriggered: boolean;
  isExpanded: boolean;
  isCompressed: boolean;
  activeTag: string;
  dispatch: React.Dispatch<TrackerAction>;
  onEdit: (event: TrackedEvent) => void;
  onTagClick: (tag: string) => void;
}

/**
 * One active World Clock event. Memoized: with stable callbacks, advancing or
 * editing one event re-renders only that card instead of the whole list.
 */
export const EventCard = memo(function EventCard({
  event,
  isRecentlyTriggered,
  isExpanded,
  isCompressed,
  activeTag,
  dispatch,
  onEdit,
  onTagClick,
}: EventCardProps) {
  const { id } = event;
  const theme = getTheme(event.bgTheme);
  const isDark = !!theme.isDark;
  const unit = unitOf(event);
  const percent = percentOf(event);
  const isCompleted = event.currentStep >= event.totalSteps;

  const reached = event.thresholds.filter((t) => event.currentStep >= t.step);
  const latestReached = reached[reached.length - 1];
  const hasReached = reached.length > 0;

  const toggleExpanded = useCallback(() => dispatch({ type: 'toggleExpanded', id }), [dispatch, id]);
  const toggleCompressed = useCallback(() => dispatch({ type: 'toggleCompressed', id }), [dispatch, id]);
  const onStepClick = useCallback(
    (stepIndex: number) => dispatch({ type: 'clickStep', id, stepIndex, now: Date.now() }),
    [dispatch, id]
  );
  const archive = () => dispatch({ type: 'archive', id, now: Date.now() });

  const iconBtn = (hover: string) =>
    `p-1.5 rounded-lg transition-colors ${isDark ? `text-neutral-400 hover:bg-neutral-800 ${hover}` : `text-neutral-500 ${hover}`}`;

  return (
    <div
      className={`p-4 rounded-2xl border transition-all ${theme.cardClass} ${
        hasReached ? (isDark ? 'ring-2 ring-red-500/70 shadow-lg' : 'ring-2 ring-red-500/50 shadow-md') : ''
      } ${isRecentlyTriggered ? 'animate-pulse' : ''}`}
    >
      {/* Threshold reached banner */}
      {hasReached && (
        <div
          className={`mb-3 p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
            isDark ? 'bg-red-950/40 border-red-800/60 text-red-200' : 'bg-red-50/90 border-red-200 text-red-950 shadow-2xs'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center font-black text-xs shadow-xs animate-bounce shrink-0">
              !
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-xs flex items-center gap-1.5 flex-wrap">
                <span>Event Happening Today!</span>
                {latestReached && (
                  <span className="font-mono text-[10px] px-1.5 rounded bg-red-600 text-white font-bold">
                    Threshold {latestReached.step}/{event.totalSteps} {unit}
                  </span>
                )}
              </div>
              <div className="text-[11px] truncate opacity-90 mt-0.5">
                {latestReached?.title
                  ? `"${latestReached.title}": check out what it is below.`
                  : 'Milestone threshold reached today: check out what it is below.'}
              </div>
            </div>
          </div>
          {!isExpanded && (
            <button
              type="button"
              onClick={toggleExpanded}
              className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold shadow-2xs transition-colors shrink-0 flex items-center gap-1"
            >
              <span>Check it out</span>
              <ChevronDown className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          <input
            type="checkbox"
            checked={event.selected}
            onChange={() => dispatch({ type: 'toggleSelect', id })}
            className="mt-1 accent-black rounded cursor-pointer shrink-0"
            title="Select for unified progression"
            aria-label={`Select ${event.title}`}
          />
          <CardIcon name={event.icon} color={event.iconColor} isDark={isDark} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm sm:text-base tracking-tight truncate">{event.title}</span>
              {hasReached && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-extrabold shadow-xs animate-pulse shrink-0"
                  title="Threshold reached! Event happening today: check out what it is below"
                >
                  <AlertDot />
                  <span className="hidden sm:inline">Event Happening Today</span>
                  <span className="sm:hidden">Event Today</span>
                </span>
              )}
              {event.statusEmoji && (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                    isDark ? 'bg-neutral-800 border-neutral-700 text-neutral-200' : 'bg-white border-neutral-200 text-neutral-800 shadow-2xs'
                  }`}
                >
                  <span>{event.statusEmoji}</span>
                  <span>{event.statusLabel || 'Status'}</span>
                </span>
              )}
              <UnitBadge unit={unit} isDark={isDark} />
            </div>

            {event.subtitle && (
              <div className={`text-xs font-medium mt-0.5 ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>{event.subtitle}</div>
            )}

            <TimelineRow item={event} isDark={isDark} isCompressed={isCompressed} onToggle={toggleCompressed} variant="active" />

            {event.notes && <div className={`text-[11px] mt-1 ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>{event.notes}</div>}
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => dispatch({ type: 'advanceOne', id, now: Date.now() })}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold shadow-2xs transition-all active:scale-95 ${
              isDark ? 'bg-white text-black hover:bg-neutral-200' : 'bg-black text-white hover:bg-neutral-800'
            }`}
            title={`Advance (+1 ${unit})`}
          >
            <ChevronRight className="w-3.5 h-3.5" />
            <span>Advance</span>
          </button>
          <button
            onClick={archive}
            className={iconBtn(isDark ? 'hover:text-amber-300' : 'hover:text-amber-700 hover:bg-amber-50')}
            title="Archive event to World Chronicle History"
          >
            <Archive className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onEdit(event)}
            className={iconBtn(isDark ? 'hover:text-white' : 'hover:text-black hover:bg-black/5')}
            title="Edit event and multiple thresholds"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => dispatch({ type: 'reset', id })}
            className={iconBtn(isDark ? 'hover:text-white' : 'hover:text-black hover:bg-black/5')}
            title="Reset progress to 0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => dispatch({ type: 'delete', id })}
            className={iconBtn(isDark ? 'hover:text-rose-400' : 'hover:text-rose-600 hover:bg-rose-50')}
            title="Delete event"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {isCompleted && (
        <div className="mt-2.5 p-2 bg-emerald-500/15 border border-emerald-500/30 rounded-xl flex items-center justify-between gap-2">
          <div className={`flex items-center gap-1.5 text-xs font-bold ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`}>
            <CheckCheck className="w-4 h-4 text-emerald-600" />
            <span>
              Event Complete ({event.currentStep}/{event.totalSteps} {unit})!
            </span>
          </div>
          <button
            onClick={archive}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold transition-colors shadow-2xs"
          >
            <Archive className="w-3 h-3" />
            <span>Archive to Chronicle</span>
          </button>
        </div>
      )}

      {/* Progress */}
      <div className="py-2.5">
        <div className="flex items-center justify-between text-xs font-mono mb-1.5 font-bold">
          <span className={isDark ? 'text-neutral-300' : 'text-neutral-800'}>
            Progress: {event.currentStep}/{event.totalSteps} {unit}
          </span>
          <span className="opacity-70">({percent}%)</span>
        </div>
        <ProgressDisplay event={event} unit={unit} isDark={isDark} onStepClick={onStepClick} />
      </div>

      {event.thresholds.length > 0 && (
        <ThresholdsPanel
          thresholds={event.thresholds}
          totalSteps={event.totalSteps}
          unit={unit}
          isDark={isDark}
          isExpanded={isExpanded}
          onToggle={toggleExpanded}
          currentStep={event.currentStep}
        />
      )}

      {event.specialNote && <SpecialNote text={event.specialNote} isDark={isDark} />}

      {/* Footer: lifecycle badge, tags, progress */}
      <div
        className={`mt-2 pt-2 border-t flex flex-wrap items-center justify-between gap-2 text-[11px] ${
          isDark ? 'border-neutral-800 text-neutral-400' : 'border-neutral-200/60 text-neutral-600'
        }`}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          {event.isRepeatable ? (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[10px] font-semibold border ${
                isDark ? 'bg-neutral-800 text-neutral-200 border-neutral-700' : 'bg-neutral-100 text-neutral-800 border-neutral-200'
              }`}
              title={`Repeatable loop. Completed ${event.completionCount} full cycles`}
            >
              <Repeat className="w-2.5 h-2.5" />
              <span>Repeatable · {event.completionCount}x</span>
              {event.lastCompletedText && (
                <span className={`font-bold ml-0.5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
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
            <TagButton key={tag} tag={tag} active={activeTag === tag} isDark={isDark} onClick={onTagClick} />
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
});

export const TagButton: React.FC<{ tag: string; active: boolean; isDark: boolean; onClick: (tag: string) => void }> = ({
  tag,
  active,
  isDark,
  onClick,
}) => (
  <button
    onClick={() => onClick(tag)}
    className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium transition-colors border ${
      active
        ? 'bg-black text-white border-black'
        : isDark
        ? 'bg-neutral-800/80 text-neutral-300 border-neutral-700 hover:bg-neutral-700'
        : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300 hover:text-black'
    }`}
    title={`Filter by tag #${tag}`}
  >
    #{tag}
  </button>
);
