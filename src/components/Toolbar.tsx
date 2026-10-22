import React, { useState, useRef, useEffect } from 'react';
import {
  SpellCheck,
  PenTool,
  ShieldCheck,
  GitCommit,
  Minimize2,
  Scissors,
  BookOpen,
  Sparkles,
  ShieldAlert,
  ChevronDown,
  Check,
  Sliders,
  Sparkle,
} from 'lucide-react';
import { EditConfig, DEFAULT_CONFIG } from '../types';

interface ToolbarProps {
  config: EditConfig;
  onChange: (config: EditConfig) => void;
  isCompact?: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  config,
  onChange,
  isCompact = false,
}) => {
  const [openSettingsKey, setOpenSettingsKey] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setOpenSettingsKey(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleButton = (key: keyof EditConfig) => {
    onChange({
      ...config,
      [key]: {
        ...config[key],
        enabled: !config[key].enabled,
      },
    });
  };

  const applyPreset = (presetName: string) => {
    const fresh: EditConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG));

    if (presetName === 'spelling-flow') {
      fresh.proofread = { enabled: true, mode: 'flow' };
      fresh.revisionDepth.enabled = false;
      fresh.preserveStructure.enabled = true;
      fresh.smoothTransitions.enabled = true;
      fresh.compressRepetition.enabled = false;
      fresh.sectionSplitter.enabled = false;
      fresh.loreRules.enabled = false;
      fresh.sensoryImmersion.enabled = false;
      fresh.strictGuardrails = { enabled: true, noUnnecessaryAdditions: true, preserveNarratorVoice: true, academicCleanup: false };
    } else if (presetName === 'story-split') {
      fresh.proofread = { enabled: true, mode: 'flow' };
      fresh.revisionDepth = { enabled: true, level: 'light' };
      fresh.preserveStructure = { enabled: true, keepParagraphsTogether: true, protectSystemBoxes: true, standardDialogueFormat: true };
      fresh.smoothTransitions.enabled = true;
      fresh.compressRepetition.enabled = true;
      fresh.sectionSplitter = { enabled: true, charLimit: 1000, keepSystemBoxesIntact: true, includeFullUnsplitCopy: true };
      fresh.loreRules = { enabled: true, baselinerGenderless: true, baselinerBodyLanguage: true, protagonistCapitalized: true, preserveCreativeLore: true };
      fresh.sensoryImmersion = { enabled: true, enhanceSensory: true, useOnomatopoeia: true, speechEnhancer: false };
      fresh.strictGuardrails = { enabled: true, noUnnecessaryAdditions: true, preserveNarratorVoice: true, academicCleanup: false };
    } else if (presetName === 'compress') {
      fresh.proofread = { enabled: true, mode: 'flow' };
      fresh.revisionDepth = { enabled: true, level: 'heavy' };
      fresh.preserveStructure.enabled = true;
      fresh.smoothTransitions.enabled = true;
      fresh.compressRepetition.enabled = true;
      fresh.sectionSplitter.enabled = false;
      fresh.loreRules.enabled = false;
      fresh.sensoryImmersion.enabled = false;
      fresh.strictGuardrails = { enabled: true, noUnnecessaryAdditions: true, preserveNarratorVoice: true, academicCleanup: false };
    } else if (presetName === 'academic') {
      fresh.proofread = { enabled: true, mode: 'basic' };
      fresh.revisionDepth = { enabled: true, level: 'light' };
      fresh.preserveStructure.enabled = true;
      fresh.smoothTransitions.enabled = true;
      fresh.compressRepetition.enabled = false;
      fresh.sectionSplitter.enabled = false;
      fresh.loreRules.enabled = false;
      fresh.sensoryImmersion.enabled = false;
      fresh.strictGuardrails = { enabled: true, noUnnecessaryAdditions: true, preserveNarratorVoice: false, academicCleanup: true };
    } else if (presetName === 'all') {
      fresh.proofread.enabled = true;
      fresh.revisionDepth.enabled = true;
      fresh.preserveStructure.enabled = true;
      fresh.smoothTransitions.enabled = true;
      fresh.compressRepetition.enabled = true;
      fresh.sectionSplitter.enabled = true;
      fresh.loreRules.enabled = true;
      fresh.sensoryImmersion.enabled = true;
      fresh.strictGuardrails.enabled = true;
    } else if (presetName === 'clear') {
      fresh.proofread.enabled = false;
      fresh.revisionDepth.enabled = false;
      fresh.preserveStructure.enabled = false;
      fresh.smoothTransitions.enabled = false;
      fresh.compressRepetition.enabled = false;
      fresh.sectionSplitter.enabled = false;
      fresh.loreRules.enabled = false;
      fresh.sensoryImmersion.enabled = false;
      fresh.strictGuardrails.enabled = false;
    }

    onChange(fresh);
    setOpenSettingsKey(null);
  };

  return (
    <div className="w-full space-y-2 select-none">
      {/* Presets Bar */}
      <div className="flex items-center justify-between text-[11px] text-neutral-500 overflow-x-auto no-scrollbar pb-1">
        <div className="flex items-center gap-1 shrink-0">
          <span className="font-medium text-neutral-400 uppercase tracking-wider text-[10px] mr-0.5">
            Presets:
          </span>
          <button
            onClick={() => applyPreset('spelling-flow')}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-200 shadow-2xs text-[11px]"
            title="Spelling + Grammar + Flow"
          >
            <Sparkle className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
            Flow ★
          </button>
          <button
            onClick={() => applyPreset('story-split')}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-200 shadow-2xs text-[11px]"
          >
            Story (1k)
          </button>
          <button
            onClick={() => applyPreset('compress')}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-200 shadow-2xs text-[11px]"
          >
            Compress
          </button>
          <button
            onClick={() => applyPreset('academic')}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-200 shadow-2xs text-[11px]"
          >
            Academic
          </button>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 pl-2">
          <button
            onClick={() => applyPreset('all')}
            className="text-[10px] text-neutral-400 hover:text-black transition-colors"
          >
            All
          </button>
          <span className="text-neutral-300">•</span>
          <button
            onClick={() => applyPreset('clear')}
            className="text-[10px] text-neutral-400 hover:text-black transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Main 9 Buttons Toolbar */}
      <div className="relative bg-white/95 backdrop-blur-md rounded-xl p-1.5 border border-neutral-200/90 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Button 1: Proofreading */}
          <div className="relative inline-flex items-center">
            <div
              className={`inline-flex items-center rounded-lg transition-all text-xs font-medium border ${
                config.proofread.enabled
                  ? 'bg-black text-white border-black shadow-xs'
                  : 'bg-neutral-50 text-neutral-700 border-neutral-200/70 hover:bg-neutral-100'
              }`}
            >
              <button
                type="button"
                onClick={() => toggleButton('proofread')}
                className="flex items-center gap-1 px-2.5 py-1.5 text-left"
              >
                <SpellCheck className="w-3.5 h-3.5" />
                <span>{config.proofread.mode === 'basic' ? 'Proofread' : 'Proof + Flow'}</span>
                {config.proofread.enabled && <Check className="w-3 h-3 text-white ml-0.5 opacity-80" />}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenSettingsKey(openSettingsKey === 'proofread' ? null : 'proofread');
                }}
                className={`p-1 mr-0.5 rounded transition-colors ${
                  config.proofread.enabled ? 'hover:bg-neutral-800 text-neutral-300' : 'hover:bg-neutral-200 text-neutral-400'
                }`}
                title="Config"
              >
                <ChevronDown className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>

          {/* Button 2: Revision Depth */}
          <div className="relative inline-flex items-center">
            <div
              className={`inline-flex items-center rounded-lg transition-all text-xs font-medium border ${
                config.revisionDepth.enabled
                  ? 'bg-black text-white border-black shadow-xs'
                  : 'bg-neutral-50 text-neutral-700 border-neutral-200/70 hover:bg-neutral-100'
              }`}
            >
              <button
                type="button"
                onClick={() => toggleButton('revisionDepth')}
                className="flex items-center gap-1 px-2.5 py-1.5 text-left"
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>{config.revisionDepth.level === 'light' ? 'Light Rev' : 'Heavy Rev'}</span>
                {config.revisionDepth.enabled && <Check className="w-3 h-3 text-white ml-0.5 opacity-80" />}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenSettingsKey(openSettingsKey === 'revisionDepth' ? null : 'revisionDepth');
                }}
                className={`p-1 mr-0.5 rounded transition-colors ${
                  config.revisionDepth.enabled ? 'hover:bg-neutral-800 text-neutral-300' : 'hover:bg-neutral-200 text-neutral-400'
                }`}
                title="Config"
              >
                <ChevronDown className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>

          {/* Button 3: Format & Boxes */}
          <div className="relative inline-flex items-center">
            <div
              className={`inline-flex items-center rounded-lg transition-all text-xs font-medium border ${
                config.preserveStructure.enabled
                  ? 'bg-black text-white border-black shadow-xs'
                  : 'bg-neutral-50 text-neutral-700 border-neutral-200/70 hover:bg-neutral-100'
              }`}
            >
              <button
                type="button"
                onClick={() => toggleButton('preserveStructure')}
                className="flex items-center gap-1 px-2.5 py-1.5 text-left"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Format & Boxes</span>
                {config.preserveStructure.enabled && <Check className="w-3 h-3 text-white ml-0.5 opacity-80" />}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenSettingsKey(openSettingsKey === 'preserveStructure' ? null : 'preserveStructure');
                }}
                className={`p-1 mr-0.5 rounded transition-colors ${
                  config.preserveStructure.enabled ? 'hover:bg-neutral-800 text-neutral-300' : 'hover:bg-neutral-200 text-neutral-400'
                }`}
                title="Config"
              >
                <ChevronDown className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>

          {/* Button 4: Smooth Transitions */}
          <button
            type="button"
            onClick={() => toggleButton('smoothTransitions')}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-all text-xs font-medium border ${
              config.smoothTransitions.enabled
                ? 'bg-black text-white border-black shadow-xs'
                : 'bg-neutral-50 text-neutral-700 border-neutral-200/70 hover:bg-neutral-100'
            }`}
          >
            <GitCommit className="w-3.5 h-3.5" />
            <span>Transitions</span>
            {config.smoothTransitions.enabled && <Check className="w-3 h-3 text-white ml-0.5 opacity-80" />}
          </button>

          {/* Button 5: Compress */}
          <button
            type="button"
            onClick={() => toggleButton('compressRepetition')}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-all text-xs font-medium border ${
              config.compressRepetition.enabled
                ? 'bg-black text-white border-black shadow-xs'
                : 'bg-neutral-50 text-neutral-700 border-neutral-200/70 hover:bg-neutral-100'
            }`}
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>Compress</span>
            {config.compressRepetition.enabled && <Check className="w-3 h-3 text-white ml-0.5 opacity-80" />}
          </button>

          {/* Button 6: Section Splitter */}
          <div className="relative inline-flex items-center">
            <div
              className={`inline-flex items-center rounded-lg transition-all text-xs font-medium border ${
                config.sectionSplitter.enabled
                  ? 'bg-black text-white border-black shadow-xs'
                  : 'bg-neutral-50 text-neutral-700 border-neutral-200/70 hover:bg-neutral-100'
              }`}
            >
              <button
                type="button"
                onClick={() => toggleButton('sectionSplitter')}
                className="flex items-center gap-1 px-2.5 py-1.5 text-left"
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>Split ({config.sectionSplitter.charLimit}ch)</span>
                {config.sectionSplitter.enabled && <Check className="w-3 h-3 text-white ml-0.5 opacity-80" />}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenSettingsKey(openSettingsKey === 'sectionSplitter' ? null : 'sectionSplitter');
                }}
                className={`p-1 mr-0.5 rounded transition-colors ${
                  config.sectionSplitter.enabled ? 'hover:bg-neutral-800 text-neutral-300' : 'hover:bg-neutral-200 text-neutral-400'
                }`}
                title="Config"
              >
                <ChevronDown className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>

          {/* Button 7: Lore & Baseliner */}
          <div className="relative inline-flex items-center">
            <div
              className={`inline-flex items-center rounded-lg transition-all text-xs font-medium border ${
                config.loreRules.enabled
                  ? 'bg-black text-white border-black shadow-xs'
                  : 'bg-neutral-50 text-neutral-700 border-neutral-200/70 hover:bg-neutral-100'
              }`}
            >
              <button
                type="button"
                onClick={() => toggleButton('loreRules')}
                className="flex items-center gap-1 px-2.5 py-1.5 text-left"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Lore & Baseliner</span>
                {config.loreRules.enabled && <Check className="w-3 h-3 text-white ml-0.5 opacity-80" />}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenSettingsKey(openSettingsKey === 'loreRules' ? null : 'loreRules');
                }}
                className={`p-1 mr-0.5 rounded transition-colors ${
                  config.loreRules.enabled ? 'hover:bg-neutral-800 text-neutral-300' : 'hover:bg-neutral-200 text-neutral-400'
                }`}
                title="Config"
              >
                <ChevronDown className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>

          {/* Button 8: Sensory & Speeches */}
          <div className="relative inline-flex items-center">
            <div
              className={`inline-flex items-center rounded-lg transition-all text-xs font-medium border ${
                config.sensoryImmersion.enabled
                  ? 'bg-black text-white border-black shadow-xs'
                  : 'bg-neutral-50 text-neutral-700 border-neutral-200/70 hover:bg-neutral-100'
              }`}
            >
              <button
                type="button"
                onClick={() => toggleButton('sensoryImmersion')}
                className="flex items-center gap-1 px-2.5 py-1.5 text-left"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Sensory & Speeches</span>
                {config.sensoryImmersion.enabled && <Check className="w-3 h-3 text-white ml-0.5 opacity-80" />}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenSettingsKey(openSettingsKey === 'sensoryImmersion' ? null : 'sensoryImmersion');
                }}
                className={`p-1 mr-0.5 rounded transition-colors ${
                  config.sensoryImmersion.enabled ? 'hover:bg-neutral-800 text-neutral-300' : 'hover:bg-neutral-200 text-neutral-400'
                }`}
                title="Config"
              >
                <ChevronDown className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>

          {/* Button 9: Strict Guardrails */}
          <div className="relative inline-flex items-center">
            <div
              className={`inline-flex items-center rounded-lg transition-all text-xs font-medium border ${
                config.strictGuardrails.enabled
                  ? 'bg-black text-white border-black shadow-xs'
                  : 'bg-neutral-50 text-neutral-700 border-neutral-200/70 hover:bg-neutral-100'
              }`}
            >
              <button
                type="button"
                onClick={() => toggleButton('strictGuardrails')}
                className="flex items-center gap-1 px-2.5 py-1.5 text-left"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Strict Guard</span>
                {config.strictGuardrails.enabled && <Check className="w-3 h-3 text-white ml-0.5 opacity-80" />}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenSettingsKey(openSettingsKey === 'strictGuardrails' ? null : 'strictGuardrails');
                }}
                className={`p-1 mr-0.5 rounded transition-colors ${
                  config.strictGuardrails.enabled ? 'hover:bg-neutral-800 text-neutral-300' : 'hover:bg-neutral-200 text-neutral-400'
                }`}
                title="Config"
              >
                <ChevronDown className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Popover Flyout for Sub-Settings */}
        {openSettingsKey && (
          <div
            ref={popoverRef}
            className="absolute left-2 right-2 md:left-4 md:right-auto md:w-84 top-full mt-2 z-50 bg-white border border-neutral-200 shadow-xl rounded-xl p-3 text-xs text-neutral-800 animate-in fade-in zoom-in-95 duration-100"
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-100">
              <span className="font-semibold text-neutral-900 flex items-center gap-1 text-[11px]">
                <Sliders className="w-3 h-3" />
                Configure Rule
              </span>
              <button
                onClick={() => setOpenSettingsKey(null)}
                className="text-neutral-400 hover:text-neutral-800 text-xs px-1"
              >
                ✕
              </button>
            </div>

            {openSettingsKey === 'proofread' && (
              <div className="space-y-2">
                <label className="flex items-start gap-2 p-1.5 rounded-lg hover:bg-neutral-50 cursor-pointer border border-neutral-100">
                  <input
                    type="radio"
                    name="proofreadMode"
                    checked={config.proofread.mode === 'basic'}
                    onChange={() =>
                      onChange({
                        ...config,
                        proofread: { ...config.proofread, mode: 'basic', enabled: true },
                      })
                    }
                    className="mt-0.5 accent-black"
                  />
                  <div>
                    <span className="font-medium text-neutral-900 block text-[11px]">Basic Proofreading</span>
                    <span className="text-neutral-500 text-[10px]">Fix spelling, grammar, punctuation, typos only.</span>
                  </div>
                </label>
                <label className="flex items-start gap-2 p-1.5 rounded-lg hover:bg-neutral-50 cursor-pointer border border-neutral-100">
                  <input
                    type="radio"
                    name="proofreadMode"
                    checked={config.proofread.mode === 'flow'}
                    onChange={() =>
                      onChange({
                        ...config,
                        proofread: { ...config.proofread, mode: 'flow', enabled: true },
                      })
                    }
                    className="mt-0.5 accent-black"
                  />
                  <div>
                    <span className="font-medium text-neutral-900 block text-[11px]">Spelling + Grammar + Flow</span>
                    <span className="text-neutral-500 text-[10px]">Smooth awkward wording & transitions naturally.</span>
                  </div>
                </label>
              </div>
            )}

            {openSettingsKey === 'revisionDepth' && (
              <div className="space-y-2">
                <label className="flex items-start gap-2 p-1.5 rounded-lg hover:bg-neutral-50 cursor-pointer border border-neutral-100">
                  <input
                    type="radio"
                    name="revisionDepth"
                    checked={config.revisionDepth.level === 'light'}
                    onChange={() =>
                      onChange({
                        ...config,
                        revisionDepth: { ...config.revisionDepth, level: 'light', enabled: true },
                      })
                    }
                    className="mt-0.5 accent-black"
                  />
                  <div>
                    <span className="font-medium text-neutral-900 block text-[11px]">Light Revision</span>
                    <span className="text-neutral-500 text-[10px]">Preserve style, move clauses only when needed.</span>
                  </div>
                </label>
                <label className="flex items-start gap-2 p-1.5 rounded-lg hover:bg-neutral-50 cursor-pointer border border-neutral-100">
                  <input
                    type="radio"
                    name="revisionDepth"
                    checked={config.revisionDepth.level === 'heavy'}
                    onChange={() =>
                      onChange({
                        ...config,
                        revisionDepth: { ...config.revisionDepth, level: 'heavy', enabled: true },
                      })
                    }
                    className="mt-0.5 accent-black"
                  />
                  <div>
                    <span className="font-medium text-neutral-900 block text-[11px]">Heavier Revision</span>
                    <span className="text-neutral-500 text-[10px]">Rework sentences, strengthen clarity & vocabulary.</span>
                  </div>
                </label>
              </div>
            )}

            {openSettingsKey === 'preserveStructure' && (
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-[11px]">
                  <input
                    type="checkbox"
                    checked={config.preserveStructure.keepParagraphsTogether}
                    onChange={(e) =>
                      onChange({
                        ...config,
                        preserveStructure: { ...config.preserveStructure, keepParagraphsTogether: e.target.checked, enabled: true },
                      })
                    }
                    className="rounded accent-black"
                  />
                  <span>Keep paragraphs together (no tiny fragments)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-[11px]">
                  <input
                    type="checkbox"
                    checked={config.preserveStructure.protectSystemBoxes}
                    onChange={(e) =>
                      onChange({
                        ...config,
                        preserveStructure: { ...config.preserveStructure, protectSystemBoxes: e.target.checked, enabled: true },
                      })
                    }
                    className="rounded accent-black"
                  />
                  <span>Protect ═════ system boxes intact</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-[11px]">
                  <input
                    type="checkbox"
                    checked={config.preserveStructure.standardDialogueFormat}
                    onChange={(e) =>
                      onChange({
                        ...config,
                        preserveStructure: { ...config.preserveStructure, standardDialogueFormat: e.target.checked, enabled: true },
                      })
                    }
                    className="rounded accent-black"
                  />
                  <span>Standard continuous dialogue quotes</span>
                </label>
              </div>
            )}

            {openSettingsKey === 'sectionSplitter' && (
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span>Limit:</span>
                    <span className="font-mono font-semibold bg-neutral-100 px-1.5 py-0.5 rounded">
                      ~{config.sectionSplitter.charLimit} chars
                    </span>
                  </div>
                  <input
                    type="range"
                    min={400}
                    max={2000}
                    step={100}
                    value={config.sectionSplitter.charLimit}
                    onChange={(e) =>
                      onChange({
                        ...config,
                        sectionSplitter: { ...config.sectionSplitter, charLimit: Number(e.target.value), enabled: true },
                      })
                    }
                    className="w-full accent-black cursor-pointer"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-[11px]">
                  <input
                    type="checkbox"
                    checked={config.sectionSplitter.includeFullUnsplitCopy}
                    onChange={(e) =>
                      onChange({
                        ...config,
                        sectionSplitter: { ...config.sectionSplitter, includeFullUnsplitCopy: e.target.checked, enabled: true },
                      })
                    }
                    className="rounded accent-black"
                  />
                  <span>Include full unsplit copy for record</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-[11px]">
                  <input
                    type="checkbox"
                    checked={config.sectionSplitter.keepSystemBoxesIntact}
                    onChange={(e) =>
                      onChange({
                        ...config,
                        sectionSplitter: { ...config.sectionSplitter, keepSystemBoxesIntact: e.target.checked, enabled: true },
                      })
                    }
                    className="rounded accent-black"
                  />
                  <span>Never split ═════ notification boxes</span>
                </label>
              </div>
            )}

            {openSettingsKey === 'loreRules' && (
              <div className="space-y-2 text-[11px]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.loreRules.baselinerGenderless}
                    onChange={(e) =>
                      onChange({
                        ...config,
                        loreRules: { ...config.loreRules, baselinerGenderless: e.target.checked, enabled: true },
                      })
                    }
                    className="rounded accent-black"
                  />
                  <span>Baseliners have no gender (they/them/name)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.loreRules.baselinerBodyLanguage}
                    onChange={(e) =>
                      onChange({
                        ...config,
                        loreRules: { ...config.loreRules, baselinerBodyLanguage: e.target.checked, enabled: true },
                      })
                    }
                    className="rounded accent-black"
                  />
                  <span>Baseliner body-language dialogue first</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.loreRules.protagonistCapitalized}
                    onChange={(e) =>
                      onChange({
                        ...config,
                        loreRules: { ...config.loreRules, protagonistCapitalized: e.target.checked, enabled: true },
                      })
                    }
                    className="rounded accent-black"
                  />
                  <span>Capitalize Protagonist (HE, HIM, HIS)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.loreRules.preserveCreativeLore}
                    onChange={(e) =>
                      onChange({
                        ...config,
                        loreRules: { ...config.loreRules, preserveCreativeLore: e.target.checked, enabled: true },
                      })
                    }
                    className="rounded accent-black"
                  />
                  <span>Preserve creative lore & mechanics</span>
                </label>
              </div>
            )}

            {openSettingsKey === 'sensoryImmersion' && (
              <div className="space-y-2 text-[11px]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.sensoryImmersion.enhanceSensory}
                    onChange={(e) =>
                      onChange({
                        ...config,
                        sensoryImmersion: { ...config.sensoryImmersion, enhanceSensory: e.target.checked, enabled: true },
                      })
                    }
                    className="rounded accent-black"
                  />
                  <span>Strengthen sensory imagery (heat/sound/texture)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.sensoryImmersion.useOnomatopoeia}
                    onChange={(e) =>
                      onChange({
                        ...config,
                        sensoryImmersion: { ...config.sensoryImmersion, useOnomatopoeia: e.target.checked, enabled: true },
                      })
                    }
                    className="rounded accent-black"
                  />
                  <span>Onomatopoeia (Crunch, Slap, Crack, Thud)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.sensoryImmersion.speechEnhancer}
                    onChange={(e) =>
                      onChange({
                        ...config,
                        sensoryImmersion: { ...config.sensoryImmersion, speechEnhancer: e.target.checked, enabled: true },
                      })
                    }
                    className="rounded accent-black"
                  />
                  <span>Improve speeches (rhythm & escalation)</span>
                </label>
              </div>
            )}

            {openSettingsKey === 'strictGuardrails' && (
              <div className="space-y-2 text-[11px]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.strictGuardrails.noUnnecessaryAdditions}
                    onChange={(e) =>
                      onChange({
                        ...config,
                        strictGuardrails: { ...config.strictGuardrails, noUnnecessaryAdditions: e.target.checked, enabled: true },
                      })
                    }
                    className="rounded accent-black"
                  />
                  <span>No unnecessary additions (no summaries/commentary)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.strictGuardrails.preserveNarratorVoice}
                    onChange={(e) =>
                      onChange({
                        ...config,
                        strictGuardrails: { ...config.strictGuardrails, preserveNarratorVoice: e.target.checked, enabled: true },
                      })
                    }
                    className="rounded accent-black"
                  />
                  <span>Preserve narrator's voice & bluntness</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.strictGuardrails.academicCleanup}
                    onChange={(e) =>
                      onChange({
                        ...config,
                        strictGuardrails: { ...config.strictGuardrails, academicCleanup: e.target.checked, enabled: true },
                      })
                    }
                    className="rounded accent-black"
                  />
                  <span>Academic-writing cleanup mode</span>
                </label>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
