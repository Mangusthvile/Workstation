import React, { memo, useCallback, useRef, useState } from 'react';
import {
  BookOpen,
  Check,
  ChevronDown,
  GitCommit,
  Minimize2,
  PenTool,
  Scissors,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkle,
  Sparkles,
  SpellCheck,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { EditConfig } from '../types';
import { PRESETS, buildPreset } from '../editPresets';
import { useDismiss } from '../lib/hooks';

/**
 * The nine rule buttons and their settings popovers are described as data
 * below instead of nine hand-copied blocks of JSX (the file went from ~800 to
 * ~300 lines). To add or change a rule, edit RULES.
 */

type RuleKey = keyof EditConfig;

type Setting =
  | { type: 'radio'; field: string; options: { value: string; title: string; desc: string }[] }
  | { type: 'checkbox'; field: string; label: string }
  | { type: 'range'; field: string; min: number; max: number; step: number };

interface RuleDef {
  key: RuleKey;
  icon: LucideIcon;
  label: (config: EditConfig) => string;
  settings?: Setting[];
}

const RULES: RuleDef[] = [
  {
    key: 'proofread',
    icon: SpellCheck,
    label: (c) => (c.proofread.mode === 'basic' ? 'Proofread' : 'Proof + Flow'),
    settings: [
      {
        type: 'radio',
        field: 'mode',
        options: [
          { value: 'basic', title: 'Basic Proofreading', desc: 'Fix spelling, grammar, punctuation, typos only.' },
          { value: 'flow', title: 'Spelling + Grammar + Flow', desc: 'Smooth awkward wording & transitions naturally.' },
        ],
      },
    ],
  },
  {
    key: 'revisionDepth',
    icon: PenTool,
    label: (c) => (c.revisionDepth.level === 'light' ? 'Light Rev' : 'Heavy Rev'),
    settings: [
      {
        type: 'radio',
        field: 'level',
        options: [
          { value: 'light', title: 'Light Revision', desc: 'Preserve style, move clauses only when needed.' },
          { value: 'heavy', title: 'Heavier Revision', desc: 'Rework sentences, strengthen clarity & vocabulary.' },
        ],
      },
    ],
  },
  {
    key: 'preserveStructure',
    icon: ShieldCheck,
    label: () => 'Format & Boxes',
    settings: [
      { type: 'checkbox', field: 'keepParagraphsTogether', label: 'Keep paragraphs together (no tiny fragments)' },
      { type: 'checkbox', field: 'protectSystemBoxes', label: 'Protect ═════ system boxes intact' },
      { type: 'checkbox', field: 'standardDialogueFormat', label: 'Standard continuous dialogue quotes' },
    ],
  },
  { key: 'smoothTransitions', icon: GitCommit, label: () => 'Transitions' },
  { key: 'compressRepetition', icon: Minimize2, label: () => 'Compress' },
  {
    key: 'sectionSplitter',
    icon: Scissors,
    label: (c) => `Split (${c.sectionSplitter.charLimit}ch)`,
    settings: [
      { type: 'range', field: 'charLimit', min: 400, max: 2000, step: 100 },
      { type: 'checkbox', field: 'includeFullUnsplitCopy', label: 'Include full unsplit copy for record' },
      { type: 'checkbox', field: 'keepSystemBoxesIntact', label: 'Never split ═════ notification boxes' },
    ],
  },
  {
    key: 'loreRules',
    icon: BookOpen,
    label: () => 'Lore & Baseliner',
    settings: [
      { type: 'checkbox', field: 'baselinerGenderless', label: 'Baseliners have no gender (they/them/name)' },
      { type: 'checkbox', field: 'baselinerBodyLanguage', label: 'Baseliner body-language dialogue first' },
      { type: 'checkbox', field: 'protagonistCapitalized', label: 'Capitalize Protagonist (HE, HIM, HIS)' },
      { type: 'checkbox', field: 'preserveCreativeLore', label: 'Preserve creative lore & mechanics' },
    ],
  },
  {
    key: 'sensoryImmersion',
    icon: Sparkles,
    label: () => 'Sensory & Speeches',
    settings: [
      { type: 'checkbox', field: 'enhanceSensory', label: 'Strengthen sensory imagery (heat/sound/texture)' },
      { type: 'checkbox', field: 'useOnomatopoeia', label: 'Onomatopoeia (Crunch, Slap, Crack, Thud)' },
      { type: 'checkbox', field: 'speechEnhancer', label: 'Improve speeches (rhythm & escalation)' },
    ],
  },
  {
    key: 'strictGuardrails',
    icon: ShieldAlert,
    label: () => 'Strict Guard',
    settings: [
      { type: 'checkbox', field: 'noUnnecessaryAdditions', label: 'No unnecessary additions (no summaries/commentary)' },
      { type: 'checkbox', field: 'preserveNarratorVoice', label: "Preserve narrator's voice & bluntness" },
      { type: 'checkbox', field: 'academicCleanup', label: 'Academic-writing cleanup mode' },
    ],
  },
];

interface ToolbarProps {
  config: EditConfig;
  onChange: (config: EditConfig) => void;
}

export const Toolbar = memo(function Toolbar({ config, onChange }: ToolbarProps) {
  const [openKey, setOpenKey] = useState<RuleKey | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // The whole toolbar counts as "inside", so clicking a chevron toggles instead of close-then-reopen.
  useDismiss(openKey !== null, containerRef, useCallback(() => setOpenKey(null), []));

  const setRule = (key: RuleKey, patch: Record<string, unknown>) =>
    onChange({ ...config, [key]: { ...config[key], ...patch } } as EditConfig);

  const openRule = RULES.find((r) => r.key === openKey);
  const ruleValues = (key: RuleKey) => config[key] as unknown as Record<string, unknown>;

  return (
    <div className="w-full space-y-2 select-none">
      {/* Presets */}
      <div className="flex items-center justify-between text-[11px] text-neutral-500 overflow-x-auto pb-1">
        <div className="flex items-center gap-1 shrink-0">
          <span className="font-medium text-neutral-400 uppercase tracking-wider text-[10px] mr-0.5">Presets:</span>
          {(['spelling-flow', 'story-split', 'compress', 'academic'] as const).map((id) => (
            <button
              key={id}
              onClick={() => {
                onChange(buildPreset(PRESETS[id].overrides));
                setOpenKey(null);
              }}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-200 shadow-2xs text-[11px]"
              title={PRESETS[id].title}
            >
              {id === 'spelling-flow' && <Sparkle className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />}
              {PRESETS[id].label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 shrink-0 pl-2">
          {(['all', 'clear'] as const).map((id, i) => (
            <React.Fragment key={id}>
              {i > 0 && <span className="text-neutral-300">•</span>}
              <button
                onClick={() => {
                  onChange(buildPreset(PRESETS[id].overrides));
                  setOpenKey(null);
                }}
                className="text-[10px] text-neutral-400 hover:text-black transition-colors"
              >
                {PRESETS[id].label}
              </button>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Rule buttons */}
      <div ref={containerRef} className="relative bg-white/95 backdrop-blur-md rounded-xl p-1.5 border border-neutral-200/90 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {RULES.map((rule) => {
            const enabled = config[rule.key].enabled;
            const Icon = rule.icon;
            const tone = enabled
              ? 'bg-black text-white border-black shadow-xs'
              : 'bg-neutral-50 text-neutral-700 border-neutral-200/70 hover:bg-neutral-100';
            const toggle = (
              <button
                type="button"
                onClick={() => setRule(rule.key, { enabled: !enabled })}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-left ${rule.settings ? '' : `rounded-lg border ${tone}`}`}
                aria-pressed={enabled}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{rule.label(config)}</span>
                {enabled && <Check className="w-3 h-3 text-white ml-0.5 opacity-80" />}
              </button>
            );

            if (!rule.settings) {
              return (
                <div key={rule.key} className="inline-flex text-xs font-medium transition-all">
                  {toggle}
                </div>
              );
            }

            return (
              <div key={rule.key} className={`inline-flex items-center rounded-lg transition-all text-xs font-medium border ${tone}`}>
                {toggle}
                <button
                  type="button"
                  onClick={() => setOpenKey((k) => (k === rule.key ? null : rule.key))}
                  className={`p-1 mr-0.5 rounded transition-colors ${
                    enabled ? 'hover:bg-neutral-800 text-neutral-300' : 'hover:bg-neutral-200 text-neutral-400'
                  }`}
                  title="Configure"
                  aria-expanded={openKey === rule.key}
                >
                  <ChevronDown className="w-2.5 h-2.5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Settings popover */}
        {openRule?.settings && (
          <div className="absolute left-2 right-2 md:left-4 md:right-auto md:w-84 top-full mt-2 z-50 bg-white border border-neutral-200 shadow-xl rounded-xl p-3 text-xs text-neutral-800">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-100">
              <span className="font-semibold text-neutral-900 flex items-center gap-1 text-[11px]">
                <Sliders className="w-3 h-3" />
                Configure Rule
              </span>
              <button onClick={() => setOpenKey(null)} className="text-neutral-400 hover:text-neutral-800 px-1" aria-label="Close">
                <X className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-2 text-[11px]">
              {openRule.settings.map((setting) => {
                const values = ruleValues(openRule.key);
                // Changing any sub-setting also switches the rule on, as before.
                const update = (value: unknown) => setRule(openRule.key, { [setting.field]: value, enabled: true });

                if (setting.type === 'radio') {
                  return setting.options.map((opt) => (
                    <label
                      key={opt.value}
                      className="flex items-start gap-2 p-1.5 rounded-lg hover:bg-neutral-50 cursor-pointer border border-neutral-100"
                    >
                      <input
                        type="radio"
                        name={`${openRule.key}-${setting.field}`}
                        checked={values[setting.field] === opt.value}
                        onChange={() => update(opt.value)}
                        className="mt-0.5 accent-black"
                      />
                      <div>
                        <span className="font-medium text-neutral-900 block text-[11px]">{opt.title}</span>
                        <span className="text-neutral-500 text-[10px]">{opt.desc}</span>
                      </div>
                    </label>
                  ));
                }

                if (setting.type === 'range') {
                  const value = Number(values[setting.field]);
                  return (
                    <div key={setting.field} className="pb-1">
                      <div className="flex items-center justify-between mb-1">
                        <span>Limit:</span>
                        <span className="font-mono font-semibold bg-neutral-100 px-1.5 py-0.5 rounded">~{value} chars</span>
                      </div>
                      <input
                        type="range"
                        min={setting.min}
                        max={setting.max}
                        step={setting.step}
                        value={value}
                        onChange={(e) => update(Number(e.target.value))}
                        className="w-full accent-black cursor-pointer"
                      />
                    </div>
                  );
                }

                return (
                  <label key={setting.field} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(values[setting.field])}
                      onChange={(e) => update(e.target.checked)}
                      className="rounded accent-black"
                    />
                    <span>{setting.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
