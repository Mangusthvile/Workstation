import React, { useMemo, useState } from 'react';
import { BellRing, Check, Plus, Sliders, Sparkles, Tag, Trash2, X } from 'lucide-react';
import {
  AVAILABLE_ICONS,
  BG_THEMES,
  COLOR_PALETTE,
  MAX_TOTAL_STEPS,
  PROGRESS_STYLES,
  STATUS_OPTIONS,
  UNIT_PRESETS,
} from './constants';
import { clampSteps, parseTags } from './logic';
import { EventIcon } from './parts';
import type { EventDraft, EventThreshold, ProgressBarStyle } from './types';

interface EventFormProps {
  initialDraft: EventDraft;
  isEditing: boolean;
  existingTags: string[];
  onSubmit: (draft: EventDraft) => void;
  onCancel: () => void;
}

const inputBase = 'text-xs bg-white rounded-xl border border-neutral-300';
const labelBase = 'block text-[11px] font-semibold text-neutral-700 mb-1';

/**
 * Create / edit form. It owns its draft state, so typing in a field
 * re-renders only the form, not every event card behind it. (Previously 17
 * separate useState hooks lived in the parent widget.)
 */
export const EventForm: React.FC<EventFormProps> = ({ initialDraft, isEditing, existingTags, onSubmit, onCancel }) => {
  const [draft, setDraft] = useState<EventDraft>(initialDraft);
  const update = (patch: Partial<EventDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const unit = draft.progressUnit || 'Days';
  const selectedTags = useMemo(() => parseTags(draft.tagsString), [draft.tagsString]);

  const toggleTag = (tag: string) => {
    const normalized = tag.toLowerCase().trim().replace(/^#/, '');
    const next = selectedTags.includes(normalized)
      ? selectedTags.filter((t) => t !== normalized)
      : [...selectedTags, normalized];
    update({ tagsString: next.join(', ') });
  };

  const addThreshold = () =>
    setDraft((d) => {
      const last = d.thresholds[d.thresholds.length - 1];
      const step = Math.min(d.totalSteps, last ? last.step + 5 : Math.round(d.totalSteps / 2));
      return {
        ...d,
        thresholds: [...d.thresholds, { id: `thresh-${Date.now()}-${d.thresholds.length}`, step, title: '', message: '' }],
      };
    });

  const updateThreshold = (index: number, patch: Partial<EventThreshold>) =>
    setDraft((d) => ({
      ...d,
      thresholds: d.thresholds.map((t, i) => {
        if (i !== index) return t;
        const next = { ...t, ...patch };
        if (patch.step !== undefined) next.step = Math.max(1, Math.min(d.totalSteps, Number(patch.step) || 1));
        return next;
      }),
    }));

  const removeThreshold = (index: number) =>
    setDraft((d) => ({ ...d, thresholds: d.thresholds.filter((_, i) => i !== index) }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (draft.title.trim()) onSubmit(draft);
      }}
      className="mb-4 p-4 bg-white rounded-2xl border border-neutral-300 shadow-md space-y-4 select-text"
    >
      <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-neutral-700" />
          <span className="font-bold text-sm text-neutral-900">{isEditing ? 'Customize Event' : 'Create New Event'}</span>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="p-1 rounded-lg text-neutral-400 hover:text-black hover:bg-neutral-100"
          aria-label="Close form"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Title & subtitle */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelBase}>Event Title *</label>
          <input
            type="text"
            required
            autoFocus
            placeholder="e.g. Dark Gate, Scene Drafting, Raid"
            value={draft.title}
            onChange={(e) => update({ title: e.target.value })}
            className={`w-full ${inputBase} px-3 py-2 outline-none focus:border-black font-semibold shadow-2xs`}
          />
        </div>
        <div>
          <label className={labelBase}>Subtitle / Context</label>
          <input
            type="text"
            placeholder="e.g. Formation of the Gate to the Dark World"
            value={draft.subtitle}
            onChange={(e) => update({ subtitle: e.target.value })}
            className={`w-full ${inputBase} px-3 py-2 outline-none focus:border-black shadow-2xs`}
          />
        </div>
      </div>

      {/* Status & timeline */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className={labelBase}>Status Indicator</label>
          <div className="flex items-center gap-1.5">
            <select
              value={draft.statusEmoji}
              onChange={(e) => {
                const opt = STATUS_OPTIONS.find((s) => s.emoji === e.target.value);
                update({ statusEmoji: e.target.value, ...(opt ? { statusLabel: opt.label } : {}) });
              }}
              className={`${inputBase} px-2.5 py-1.5`}
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
              value={draft.statusLabel}
              onChange={(e) => update({ statusLabel: e.target.value })}
              className={`flex-1 min-w-0 ${inputBase} px-2.5 py-1.5`}
            />
          </div>
        </div>
        <div>
          <label className={labelBase}>Started Timeline</label>
          <input
            type="text"
            placeholder="e.g. Started Day 3, Session 12"
            value={draft.startedDate}
            onChange={(e) => update({ startedDate: e.target.value })}
            className={`w-full ${inputBase} px-2.5 py-1.5`}
          />
        </div>
        <div>
          <label className={labelBase}>Ended Timeline</label>
          <input
            type="text"
            placeholder="e.g. Ended Day ?, Ongoing"
            value={draft.endedDate}
            onChange={(e) => update({ endedDate: e.target.value })}
            className={`w-full ${inputBase} px-2.5 py-1.5`}
          />
        </div>
      </div>

      {/* Progression unit */}
      <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2.5">
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-xs font-bold text-neutral-900">Progression Unit</label>
            <p className="text-[10px] text-neutral-500">
              Decide what unit this event advances by (e.g., Days, Steps, Points, Words, Hours).
            </p>
          </div>
          <span className="px-2 py-0.5 rounded-lg bg-black text-white font-mono text-[10px] font-bold">{unit}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {UNIT_PRESETS.map((u) => {
            const isSelected = draft.progressUnit.toLowerCase() === u.toLowerCase();
            return (
              <button
                key={u}
                type="button"
                onClick={() => update({ progressUnit: u })}
                className={`px-2.5 py-1 rounded-xl text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-black text-white shadow-2xs font-bold ring-1 ring-black'
                    : 'bg-white hover:bg-neutral-200 text-neutral-700 border border-neutral-300'
                }`}
              >
                {u}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 pt-0.5">
          <span className="text-[11px] font-semibold text-neutral-600">Custom Unit:</span>
          <input
            type="text"
            placeholder="Type any unit (e.g. Days, Mana, Miles, Rounds)"
            value={draft.progressUnit}
            onChange={(e) => update({ progressUnit: e.target.value })}
            className={`flex-1 ${inputBase} px-3 py-1.5 outline-none focus:border-black font-medium`}
          />
        </div>
      </div>

      {/* Total steps & lifecycle */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelBase}>Total Progression Target ({unit})</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={MAX_TOTAL_STEPS}
              value={draft.totalSteps}
              onChange={(e) => update({ totalSteps: clampSteps(parseInt(e.target.value, 10)) })}
              className={`w-20 text-center font-mono font-bold ${inputBase} px-2 py-1.5`}
            />
            <span className="text-[11px] text-neutral-600 font-mono">
              total {unit} (e.g. 30 in 5/30 {unit})
            </span>
          </div>
        </div>
        <div>
          <label className={labelBase}>Lifecycle</label>
          <label className="flex items-center gap-2 mt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={draft.isRepeatable}
              onChange={(e) => update({ isRepeatable: e.target.checked })}
              className="accent-black rounded"
            />
            <span className="text-xs text-neutral-800 font-medium">Repeatable Loop (tracks completion based on {unit})</span>
          </label>
        </div>
      </div>

      {/* Progress style with previews */}
      <div>
        <label className={labelBase}>Choose Progress Bar Style (with Live Visual Previews)</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PROGRESS_STYLES.map((style) => {
            const isSelected = draft.progressStyle === style.id;
            return (
              <button
                key={style.id}
                type="button"
                onClick={() => update({ progressStyle: style.id })}
                className={`p-3 rounded-2xl text-left border transition-all ${
                  isSelected ? 'bg-white border-black ring-2 ring-black shadow-xs' : 'bg-white/80 border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-neutral-900">{style.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-black stroke-[2.5]" />}
                </div>
                <div className="p-2 bg-neutral-100/80 rounded-xl mb-1.5">
                  <StylePreview style={style.id} color={draft.iconColor} unit={draft.progressUnit} total={draft.totalSteps} />
                </div>
                <div className="text-[10px] text-neutral-500">{style.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Icon, color, background */}
      <div className="space-y-3">
        <div>
          <label className={labelBase}>Event Icon</label>
          <div className="flex flex-wrap gap-1.5">
            {AVAILABLE_ICONS.map((ic) => {
              const isSelected = draft.icon === ic.name;
              return (
                <button
                  key={ic.name}
                  type="button"
                  onClick={() => update({ icon: ic.name })}
                  className={`p-2 rounded-xl border flex items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-black text-white border-black scale-105 shadow-xs'
                      : 'bg-white border-neutral-200 hover:border-neutral-300 text-neutral-700'
                  }`}
                  title={ic.label}
                  aria-label={ic.label}
                >
                  <EventIcon name={ic.name} color={isSelected ? '#FFFFFF' : draft.iconColor} />
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className={labelBase}>Accent Color</label>
          <div className="flex flex-wrap items-center gap-2">
            {COLOR_PALETTE.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => update({ iconColor: c.value })}
                className={`w-6 h-6 rounded-full border-2 transition-transform ${
                  draft.iconColor === c.value ? 'scale-115 border-black shadow-sm' : 'border-white hover:scale-105'
                }`}
                style={{ backgroundColor: c.value }}
                title={c.label}
                aria-label={c.label}
              />
            ))}
            <input
              type="color"
              value={draft.iconColor}
              onChange={(e) => update({ iconColor: e.target.value })}
              className="w-7 h-7 rounded cursor-pointer border-0 p-0"
              title="Custom color hex"
            />
          </div>
        </div>

        <div>
          <label className={labelBase}>Event Background Theme</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {BG_THEMES.map((theme) => {
              const isSelected = draft.bgTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => update({ bgTheme: theme.id })}
                  className={`p-2 rounded-xl text-xs font-medium border flex items-center justify-between transition-all ${theme.cardClass} ${
                    isSelected ? 'ring-2 ring-black border-transparent shadow-xs font-bold' : 'opacity-80 hover:opacity-100'
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

      {/* Thresholds */}
      <div className="p-3.5 bg-white rounded-2xl border border-neutral-300 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
              <BellRing className="w-3.5 h-3.5 text-amber-600" />
              <span>Multiple Milestone Thresholds ({draft.thresholds.length})</span>
            </div>
            <div className="text-[10px] text-neutral-500">
              Define stage milestones based on {unit} (e.g. 15/30, 20/30, 30/30) with custom lore
            </div>
          </div>
          <button
            type="button"
            onClick={addThreshold}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-black text-white hover:bg-neutral-800 text-xs font-medium transition-colors"
          >
            <Plus className="w-3 h-3" />
            <span>Add Threshold</span>
          </button>
        </div>

        {draft.thresholds.length === 0 ? (
          <div className="p-4 text-center text-xs text-neutral-400 border border-dashed border-neutral-200 rounded-xl">
            No thresholds added yet. Click "+ Add Threshold" to set milestones.
          </div>
        ) : (
          <div className="space-y-2.5">
            {draft.thresholds.map((thresh, idx) => (
              <div key={thresh.id} className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2">
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
                        max={draft.totalSteps}
                        value={thresh.step}
                        onChange={(e) => updateThreshold(idx, { step: Number(e.target.value) })}
                        className="w-16 text-center font-mono font-bold text-xs bg-white px-2 py-1 rounded-lg border border-neutral-300"
                      />
                      <span className="text-[11px] font-mono text-neutral-500">
                        / {draft.totalSteps} {unit}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeThreshold(idx)}
                    className="p-1 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Remove threshold"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Milestone Title (e.g. Early Winter Sets In, Herald Crosses)"
                  value={thresh.title ?? ''}
                  onChange={(e) => updateThreshold(idx, { title: e.target.value })}
                  className="w-full text-xs bg-white px-2.5 py-1.5 rounded-lg border border-neutral-300 outline-none focus:border-black font-semibold"
                />
                <textarea
                  rows={2}
                  placeholder={`Event description / Custom alert lore (e.g. Snow begins to fall when ${thresh.step} ${unit} are reached...)`}
                  value={thresh.message}
                  onChange={(e) => updateThreshold(idx, { message: e.target.value })}
                  className="w-full text-xs bg-white px-2.5 py-1.5 rounded-lg border border-neutral-300 outline-none focus:border-black resize-y"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Special note */}
      <div>
        <label className={`${labelBase} flex items-center gap-1.5`}>
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Special Note / Narrative Override Rules (Optional)</span>
        </label>
        <textarea
          rows={2}
          placeholder="e.g. If Sid is able to complete his array around the dark gate, he'll freeze it at 15/30 until he is ready for it to progress in which it will progress to 30/30 in 5 days."
          value={draft.specialNote}
          onChange={(e) => update({ specialNote: e.target.value })}
          className={`w-full ${inputBase} px-3 py-2 outline-none focus:border-black`}
        />
      </div>

      {/* Notes & tags */}
      <div className="space-y-3">
        <div>
          <label className={labelBase}>General Notes</label>
          <input
            type="text"
            placeholder="e.g. Hook, Confrontation, Climax, Lore"
            value={draft.notes}
            onChange={(e) => update({ notes: e.target.value })}
            className={`w-full ${inputBase} px-3 py-1.5 outline-none focus:border-black`}
          />
        </div>

        <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-neutral-900">Event Tags</label>
            <span className="text-[10px] text-neutral-500">Type below or click created tags to auto-input</span>
          </div>
          <input
            type="text"
            placeholder="e.g. dark-world, sid, portal, winter"
            value={draft.tagsString}
            onChange={(e) => update({ tagsString: e.target.value })}
            className={`w-full ${inputBase} px-3 py-1.5 outline-none focus:border-black font-medium`}
          />
          {existingTags.length > 0 && (
            <div className="pt-1">
              <div className="text-[10px] font-semibold text-neutral-600 mb-1.5 flex items-center gap-1">
                <Tag className="w-3 h-3 text-neutral-500" />
                <span>Click to auto-input already created tags:</span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                {existingTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-medium transition-all flex items-center gap-1 ${
                        isSelected
                          ? 'bg-black text-white shadow-2xs font-bold ring-1 ring-black'
                          : 'bg-white hover:bg-neutral-200 text-neutral-700 border border-neutral-300'
                      }`}
                      title={isSelected ? `Remove #${tag}` : `Auto-input #${tag}`}
                    >
                      {isSelected ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : <Plus className="w-2.5 h-2.5 text-neutral-400" />}
                      <span>#{tag}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-neutral-600 hover:bg-neutral-100 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-1.5 rounded-xl bg-black hover:bg-neutral-800 text-white text-xs font-semibold shadow-xs transition-colors"
        >
          {isEditing ? 'Update Event' : 'Save Event'}
        </button>
      </div>
    </form>
  );
};

/** Tiny static preview of each progress style inside the style picker. */
const StylePreview: React.FC<{ style: ProgressBarStyle; color: string; unit: string; total: number }> = ({
  style,
  color,
  unit,
  total,
}) => {
  switch (style) {
    case 'segmented-blocks':
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <span
                key={n}
                className={`w-4 h-4 rounded text-[9px] flex items-center justify-center font-mono ${
                  n <= 3 ? 'bg-black text-white font-bold' : 'bg-white text-neutral-400 border border-neutral-300'
                }`}
              >
                {n}
              </span>
            ))}
            <span className="text-[10px] text-neutral-400 ml-1 font-mono">...10</span>
          </div>
          <div className="text-[9px] text-neutral-400 font-mono">⬜⬜⬜⬜⬜⬛⬛⬛⬛⬛ (Grid Matrix)</div>
        </div>
      );
    case 'smooth-linear':
      return (
        <div className="space-y-1">
          <div className="w-full h-2.5 rounded-full bg-neutral-200 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: '60%', backgroundColor: color }} />
          </div>
          <div className="flex justify-between text-[9px] font-mono text-neutral-500">
            <span>0 {unit}</span>
            <span>60%</span>
            <span>
              {total} {unit}
            </span>
          </div>
        </div>
      );
    case 'segmented-pips':
      return (
        <div className="flex items-center gap-1">
          {Array.from({ length: 8 }, (_, idx) => (
            <div
              key={idx}
              className={`h-2.5 flex-1 rounded-xs ${idx < 5 ? 'shadow-2xs' : 'bg-neutral-300'}`}
              style={{ backgroundColor: idx < 5 ? color : undefined }}
            />
          ))}
        </div>
      );
    case 'circular-ring':
      return (
        <div className="flex items-center gap-2">
          <div className="relative w-7 h-7 flex items-center justify-center">
            <svg className="w-7 h-7 -rotate-90" viewBox="0 0 36 36" aria-hidden>
              <circle cx="18" cy="18" r="14" fill="none" stroke="#D4D4D8" strokeWidth="4" />
              <circle cx="18" cy="18" r="14" fill="none" stroke={color} strokeWidth="4" strokeDasharray="88" strokeDashoffset="35" strokeLinecap="round" />
            </svg>
            <span className="absolute font-mono text-[8px] font-bold">60%</span>
          </div>
          <span className="text-[10px] text-neutral-500">Radial gauge with center percent</span>
        </div>
      );
    case 'milestone-nodes':
      return (
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
      );
    default:
      return null;
  }
};
