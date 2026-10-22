import React, { memo, useCallback } from 'react';
import { Award, CheckCheck, Copy, Trash2, Undo2 } from 'lucide-react';
import { getTheme } from './constants';
import { unitOf } from './logic';
import { TagButton } from './EventCard';
import { CardIcon, SpecialNote, ThresholdsPanel, TimelineRow, UnitBadge } from './parts';
import type { TrackerAction } from './state';
import type { CompletedEventRecord } from './types';

interface HistoryCardProps {
  record: CompletedEventRecord;
  isExpanded: boolean;
  isCompressed: boolean;
  activeTag: string;
  dispatch: React.Dispatch<TrackerAction>;
  onRestore: (record: CompletedEventRecord) => void;
  onClone: (record: CompletedEventRecord) => void;
  onTagClick: (tag: string) => void;
}

/** One completed event or cycle in the World Chronicle. */
export const HistoryCard = memo(function HistoryCard({
  record,
  isExpanded,
  isCompressed,
  activeTag,
  dispatch,
  onRestore,
  onClone,
  onTagClick,
}: HistoryCardProps) {
  const { id } = record;
  const theme = getTheme(record.bgTheme);
  const isDark = !!theme.isDark;
  const unit = unitOf(record);
  const toggleExpanded = useCallback(() => dispatch({ type: 'toggleExpanded', id }), [dispatch, id]);
  const toggleCompressed = useCallback(() => dispatch({ type: 'toggleCompressed', id }), [dispatch, id]);

  return (
    <div className={`p-4 rounded-2xl border transition-all ${theme.cardClass}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          <CardIcon name={record.icon} color={record.iconColor} isDark={isDark} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm sm:text-base tracking-tight truncate">{record.title}</span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                  isDark ? 'bg-emerald-950 border-emerald-700 text-emerald-200' : 'bg-emerald-50 border-emerald-200 text-emerald-900 shadow-2xs'
                }`}
              >
                <span>{record.statusEmoji || '🟦'}</span>
                <span>{record.statusLabel || 'Completed'}</span>
              </span>
              <UnitBadge unit={unit} isDark={isDark} />
            </div>

            {record.subtitle && (
              <div className={`text-xs font-medium mt-0.5 ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>{record.subtitle}</div>
            )}

            <TimelineRow item={record} isDark={isDark} isCompressed={isCompressed} onToggle={toggleCompressed} variant="history" />

            {record.notes && <div className={`text-[11px] mt-1 ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>{record.notes}</div>}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onRestore(record)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-white text-black hover:bg-neutral-100 border border-neutral-300 shadow-2xs transition-all active:scale-95"
            title="Restore event back to World Clock"
          >
            <Undo2 className="w-3 h-3" />
            <span>Restore</span>
          </button>
          <button
            onClick={() => onClone(record)}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark ? 'text-neutral-400 hover:text-white hover:bg-neutral-800' : 'text-neutral-500 hover:text-black hover:bg-black/5'
            }`}
            title="Clone as new template"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => dispatch({ type: 'deleteRecord', recordId: id })}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark ? 'text-neutral-400 hover:text-rose-400 hover:bg-neutral-800' : 'text-neutral-500 hover:text-rose-600 hover:bg-rose-50'
            }`}
            title="Delete record from history"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="my-2 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between text-xs font-mono">
        <span className={`flex items-center gap-1 font-bold ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`}>
          <CheckCheck className="w-3.5 h-3.5" />
          <span>Completed All Checkpoints</span>
        </span>
        <span className="font-bold">
          {record.finalSteps}/{record.totalSteps} {unit} (100%)
        </span>
      </div>

      {record.thresholds.length > 0 && (
        <ThresholdsPanel
          thresholds={record.thresholds}
          totalSteps={record.totalSteps}
          unit={unit}
          isDark={isDark}
          isExpanded={isExpanded}
          onToggle={toggleExpanded}
        />
      )}

      {record.specialNote && <SpecialNote text={record.specialNote} isDark={isDark} />}

      <div
        className={`mt-2 pt-2 border-t flex flex-wrap items-center justify-between gap-2 text-[11px] ${
          isDark ? 'border-neutral-800 text-neutral-400' : 'border-neutral-200/60 text-neutral-600'
        }`}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[10px] font-semibold border ${
              isDark ? 'bg-neutral-800 text-neutral-200 border-neutral-700' : 'bg-neutral-100 text-neutral-800 border-neutral-200'
            }`}
          >
            <Award className="w-2.5 h-2.5 text-amber-500" />
            <span>{record.isRepeatable ? `Completed Loop #${record.cycleNumber || 1}` : 'Conquered Event'}</span>
          </span>
          {record.tags.map((tag) => (
            <TagButton key={tag} tag={tag} active={activeTag === tag} isDark={isDark} onClick={onTagClick} />
          ))}
        </div>
        <div className="font-mono text-[10px] opacity-70">
          {record.totalSteps} {unit} completed
        </div>
      </div>
    </div>
  );
});
