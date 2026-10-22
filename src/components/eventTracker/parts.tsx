import React, { memo } from 'react';
import { BellRing, Check, ChevronDown, ChevronUp, Clock, Lock, Sparkles } from 'lucide-react';
import { AVAILABLE_ICONS, ICON_BY_NAME } from './constants';
import { getEffectiveTimelineMarkers } from './logic';
import type { CompletedEventRecord, EventIconName, EventThreshold, TrackedEvent } from './types';

export const EventIcon: React.FC<{ name: EventIconName; color: string; className?: string }> = ({
  name,
  color,
  className = 'w-4 h-4',
}) => {
  const Icon = ICON_BY_NAME[name] ?? AVAILABLE_ICONS[0].component;
  return <Icon className={className} style={{ color }} />;
};

/** Icon tile at the left of each card. */
export const CardIcon: React.FC<{ name: EventIconName; color: string; isDark: boolean }> = ({ name, color, isDark }) => (
  <div
    className="p-1.5 rounded-xl shrink-0 mt-0.5"
    style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
  >
    <EventIcon name={name} color={color} />
  </div>
);

export const UnitBadge: React.FC<{ unit: string; isDark: boolean }> = ({ unit, isDark }) => (
  <span
    className={`px-1.5 rounded-md font-mono text-[9px] uppercase tracking-wider font-semibold border ${
      isDark ? 'bg-neutral-800 border-neutral-700 text-neutral-300' : 'bg-neutral-100 border-neutral-200 text-neutral-700'
    }`}
  >
    {unit}
  </span>
);

/** Small red "!" bubble used throughout threshold alerts. */
export const AlertDot: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5 text-[10px]' }) => (
  <span className={`rounded-full bg-white text-red-600 flex items-center justify-center font-black leading-none shrink-0 ${className}`}>
    !
  </span>
);

/** "Started Day 3 - 4 cycles - Ended Day ?" line under a card title. */
export const TimelineRow = memo(function TimelineRow({
  item,
  isDark,
  isCompressed,
  onToggle,
  variant,
}: {
  item: TrackedEvent | CompletedEventRecord;
  isDark: boolean;
  isCompressed: boolean;
  onToggle: () => void;
  variant: 'active' | 'history';
}) {
  const markers = getEffectiveTimelineMarkers(item);
  const hasMarkers = markers.length > 0;
  const isHistory = variant === 'history';
  if (!isHistory && !item.startedDate && !item.endedDate && !hasMarkers) return null;

  const dash = <span className="opacity-40">-</span>;
  const cycleWord = markers.length === 1 ? 'cycle' : 'cycles';

  return (
    <div
      className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-mono mt-1 ${
        isDark ? 'text-neutral-400' : 'text-neutral-500'
      }`}
    >
      {item.startedDate && (
        <span className="flex items-center gap-1 shrink-0 font-medium">
          <Clock className="w-3 h-3 opacity-70" />
          <span>Started {item.startedDate}</span>
        </span>
      )}

      {hasMarkers && isCompressed && (
        <>
          {dash}
          <button
            type="button"
            onClick={onToggle}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border transition-all ${
              isDark
                ? `bg-neutral-800 text-neutral-300 border-neutral-700 ${isHistory ? '' : 'hover:bg-neutral-700'}`
                : `bg-neutral-100 text-neutral-700 border-neutral-300 ${isHistory ? '' : 'hover:bg-neutral-200 shadow-2xs'}`
            }`}
            title="Expand all milestone cycle markers on timeline"
          >
            <span>•••</span>
            <span>
              {markers.length} {cycleWord}
              {!isHistory && ` (${markers[markers.length - 1]?.label})`}
            </span>
            <ChevronDown className="w-2.5 h-2.5 opacity-70" />
          </button>
        </>
      )}

      {hasMarkers && !isCompressed && (
        <>
          {markers.map((marker) => (
            <React.Fragment key={marker.id}>
              {dash}
              <span
                className={`px-1.5 rounded text-[10px] font-semibold border ${
                  isDark ? 'bg-neutral-800 border-neutral-700 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}
                title={`Completed cycle ${marker.cycle}`}
              >
                {marker.label}
              </span>
            </React.Fragment>
          ))}
          <button
            type="button"
            onClick={onToggle}
            className={
              isHistory
                ? 'inline-flex items-center gap-0.5 px-1 rounded text-[9px] uppercase tracking-wider font-bold opacity-70 hover:opacity-100'
                : `inline-flex items-center gap-0.5 px-1 rounded text-[9px] uppercase tracking-wider font-bold transition-all ml-0.5 ${
                    isDark
                      ? 'text-neutral-400 hover:text-white bg-neutral-800/60'
                      : 'text-neutral-500 hover:text-black bg-neutral-100 hover:bg-neutral-200'
                  }`
            }
            title="Compress intermediate markers for space"
          >
            <span>Compress</span>
            <ChevronUp className="w-2.5 h-2.5" />
          </button>
        </>
      )}

      {item.endedDate && (
        <>
          {dash}
          <span className="shrink-0 font-medium">Ended {item.endedDate}</span>
        </>
      )}

      {isHistory && (
        <span className={`font-semibold ml-1 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
          ✓ {(item as CompletedEventRecord).completedAt}
        </span>
      )}
    </div>
  );
});

export const SpecialNote: React.FC<{ text: string; isDark: boolean }> = ({ text, isDark }) => (
  <div
    className={`my-2 p-2.5 rounded-xl text-xs border ${
      isDark ? 'bg-purple-950/40 border-purple-800/60 text-purple-200' : 'bg-purple-50/90 border-purple-200 text-purple-950'
    }`}
  >
    <div className="font-bold flex items-center gap-1.5 mb-1 text-[11px]">
      <Sparkles className="w-3 h-3 text-purple-400" />
      <span>Special Note</span>
    </div>
    <div className="text-[11px] leading-relaxed opacity-90">{text}</div>
  </div>
);

const thresholdCardClass = (isReached: boolean, isDark: boolean) =>
  isReached
    ? isDark
      ? 'bg-amber-950/40 border-amber-600/50 text-amber-100'
      : 'bg-amber-50/90 border-amber-300 text-amber-950 shadow-2xs'
    : isDark
    ? 'bg-neutral-900/60 border-neutral-800 text-neutral-400'
    : 'bg-neutral-50/70 border-neutral-200 text-neutral-600';

/** Collapsible list of milestone thresholds on an active or archived card. */
export const ThresholdsPanel: React.FC<{
  thresholds: EventThreshold[];
  totalSteps: number;
  unit: string;
  isDark: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  /** Active cards pass progress; Chronicle cards omit it (everything is conquered). */
  currentStep?: number;
}> = ({ thresholds, totalSteps, unit, isDark, isExpanded, onToggle, currentStep }) => {
  const isHistory = currentStep === undefined;
  const reachedCount = isHistory ? thresholds.length : thresholds.filter((t) => currentStep >= t.step).length;

  return (
    <div
      className={`${isHistory ? 'my-2' : 'my-2.5'} rounded-xl border overflow-hidden ${
        isDark ? 'bg-neutral-950/70 border-neutral-800' : 'bg-white/80 border-neutral-200/90'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        className={`w-full px-3 py-2 flex items-center justify-between text-xs font-semibold transition-colors ${
          isDark ? 'hover:bg-neutral-800/50' : 'hover:bg-neutral-100/70'
        }`}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <BellRing className="w-3.5 h-3.5 text-amber-500" />
          {isHistory ? (
            <span>Conquered Thresholds ({thresholds.length})</span>
          ) : (
            <>
              <span>Thresholds</span>
              <span
                className={`px-1.5 py-0.5 rounded-full font-mono text-[10px] ${
                  reachedCount > 0
                    ? 'bg-amber-500 text-black font-bold'
                    : isDark
                    ? 'bg-neutral-800 text-neutral-400'
                    : 'bg-neutral-200 text-neutral-600'
                }`}
              >
                {reachedCount}/{thresholds.length} Reached
              </span>
              {reachedCount > 0 && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600 text-white font-extrabold text-[10px] shadow-xs animate-pulse"
                  title="Event happening today: check out what it is below!"
                >
                  <span className="font-black text-xs leading-none">!</span>
                  <span>Event Happening Today</span>
                </span>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-1 text-[11px] text-neutral-400">
          <span>{isExpanded ? 'Hide' : 'Show details'}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      {isExpanded && (
        <div className={`p-2.5 space-y-2 border-t ${isDark ? 'border-neutral-800' : 'border-neutral-200/50'}`}>
          {thresholds.map((thresh) =>
            isHistory ? (
              <div
                key={thresh.id}
                className={`p-2 rounded-lg border text-xs ${
                  isDark ? 'bg-amber-950/20 border-amber-800/50 text-amber-100' : 'bg-amber-50/60 border-amber-200 text-amber-950'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded font-mono text-[10px] font-bold bg-amber-500 text-black">
                      {thresh.step}/{totalSteps} {unit}
                    </span>
                    {thresh.title && <span className="font-bold">{thresh.title}</span>}
                  </div>
                  <span className="text-[10px] text-emerald-500 flex items-center gap-1 font-semibold">
                    <Check className="w-3 h-3 stroke-[3]" /> Conquered
                  </span>
                </div>
                <div className="text-[11px] opacity-90 pl-0.5">{thresh.message}</div>
              </div>
            ) : (
              <ActiveThreshold
                key={thresh.id}
                thresh={thresh}
                isReached={currentStep >= thresh.step}
                totalSteps={totalSteps}
                unit={unit}
                isDark={isDark}
              />
            )
          )}
        </div>
      )}
    </div>
  );
};

const ActiveThreshold: React.FC<{
  thresh: EventThreshold;
  isReached: boolean;
  totalSteps: number;
  unit: string;
  isDark: boolean;
}> = ({ thresh, isReached, totalSteps, unit, isDark }) => (
  <div className={`p-2.5 rounded-xl border text-xs transition-all ${thresholdCardClass(isReached, isDark)}`}>
    <div className="flex items-center justify-between gap-2 mb-1">
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold border ${
            isReached
              ? 'bg-amber-500 text-black border-amber-600 shadow-2xs'
              : isDark
              ? 'bg-neutral-800 text-neutral-300 border-neutral-700'
              : 'bg-neutral-200 text-neutral-700 border-neutral-300'
          }`}
        >
          {thresh.step}/{totalSteps} {unit}
        </span>
        {isReached && (
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-red-600 text-white font-extrabold text-[10px] shadow-sm animate-pulse ring-1 ring-red-400"
            title="Threshold reached! Event happening today."
          >
            <AlertDot className="w-3.5 h-3.5 text-[11px]" />
            <span className="tracking-tight uppercase font-mono text-[9px] font-black">Happening Today</span>
          </span>
        )}
        {thresh.title && <span className="font-bold tracking-tight">{thresh.title}</span>}
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
    <div className="text-[11px] leading-relaxed pl-0.5 opacity-90">{thresh.message}</div>
    {isReached && (
      <div
        className={`mt-1.5 flex items-center gap-1.5 text-[10px] font-bold bg-red-500/10 px-2 py-1 rounded-lg border border-red-500/20 ${
          isDark ? 'text-red-400' : 'text-red-600'
        }`}
      >
        <span className="w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center font-black text-[10px] leading-none shrink-0">
          !
        </span>
        <span>Event happening today: check out what it is!</span>
      </div>
    )}
  </div>
);
