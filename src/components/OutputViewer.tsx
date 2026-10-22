import React, { memo, useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Download,
  FileText,
  Layers,
  Sparkles,
  SplitSquareVertical,
  type LucideIcon,
} from 'lucide-react';
import type { EditResponse } from '../types';
import { computeSimpleDiff } from '../diffUtil';
import { copyText, downloadFile } from '../lib/browser';
import { useTransientValue } from '../lib/hooks';

type Tab = 'sections' | 'full' | 'diff' | 'rules';

interface OutputViewerProps {
  /** The exact text that was sent for revision (not the live editor text). */
  originalText: string;
  /** Already sanitized when it was received. */
  response: EditResponse;
  onApplyToEditor: (text: string) => void;
}

const CopyButton: React.FC<{
  copied: boolean;
  onClick: () => void;
  idleLabel: string;
  copiedLabel: string;
  className: string;
  copiedClassName: string;
}> = ({ copied, onClick, idleLabel, copiedLabel, className, copiedClassName }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
      copied ? copiedClassName : className
    }`}
  >
    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
    <span>{copied ? copiedLabel : idleLabel}</span>
  </button>
);

export const OutputViewer = memo(function OutputViewer({ originalText, response, onApplyToEditor }: OutputViewerProps) {
  const hasSections = !!response.sections?.length;
  const [activeTab, setActiveTab] = useState<Tab>(hasSections ? 'sections' : 'full');
  const [copiedId, markCopied] = useTransientValue<string>();

  const displayText = response.fullUnsplitCopy || response.resultText;

  // The diff is the most expensive part of this view: only compute it when the tab is open.
  const diffTokens = useMemo(
    () => (activeTab === 'diff' ? computeSimpleDiff(originalText, displayText) : []),
    [activeTab, originalText, displayText]
  );

  const copy = async (text: string, id: string) => {
    if (await copyText(text)) markCopied(id);
  };

  const tabs: { id: Tab; label: string; icon: LucideIcon; show: boolean }[] = [
    { id: 'sections', label: `Split Sections (${response.sections?.length ?? 0})`, icon: SplitSquareVertical, show: hasSections },
    { id: 'full', label: 'Full Document', icon: FileText, show: true },
    { id: 'diff', label: 'Diff Comparison', icon: Layers, show: true },
    { id: 'rules', label: `Applied Rules (${response.appliedRules.length})`, icon: Sparkles, show: true },
  ];

  return (
    <div className="bg-white border border-neutral-200/90 rounded-2xl shadow-sm overflow-hidden mb-8 transition-all">
      {/* Header / action bar */}
      <div className="border-b border-neutral-100 bg-neutral-50/40 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-50" />
          <span className="font-semibold text-neutral-900 text-sm">Revision Complete</span>
          <span className="text-xs text-neutral-400 font-mono">
            ({response.stats.resultWordCount} words • {response.stats.resultCharCount} chars)
          </span>
        </div>

        <div className="flex items-center gap-1 bg-neutral-100/90 p-1 rounded-xl text-xs font-medium text-neutral-600" role="tablist">
          {tabs
            .filter((t) => t.show)
            .map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                role="tab"
                aria-selected={activeTab === id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === id ? 'bg-white text-black shadow-xs font-semibold' : 'hover:text-black'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => copy(displayText, 'global-copy')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-neutral-200 text-xs font-medium text-neutral-700 hover:bg-neutral-100 hover:text-black transition-colors"
          >
            {copiedId === 'global-copy' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copied All</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy All</span>
              </>
            )}
          </button>
          <button
            onClick={() => onApplyToEditor(displayText)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-black text-white hover:bg-neutral-800 text-xs font-medium transition-colors shadow-2xs"
            title="Replace editor content with this revision"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>Apply to Editor</span>
          </button>
        </div>
      </div>

      {/* Split sections */}
      {activeTab === 'sections' && response.sections && (
        <div className="p-6 space-y-6 bg-neutral-50/20">
          <div className="flex items-center justify-between gap-3 text-xs text-neutral-500 pb-1">
            <span>
              Each card is formatted under the requested character limit for convenient single-click copying. System
              boxes and mechanics are preserved unbroken.
            </span>
            <button
              onClick={() =>
                downloadFile(
                  response
                    .sections!.map((s) => `[${s.title} • ${s.charCount} chars]\n\n${s.content}\n\n`)
                    .join('----------------------------------------\n\n'),
                  'split-sections.txt'
                )
              }
              className="hover:text-black underline-offset-2 hover:underline flex items-center gap-1 shrink-0"
            >
              <Download className="w-3 h-3" />
              Download Sections
            </button>
          </div>

          <div className="grid grid-cols-1 gap-5">
            {response.sections.map((section) => (
              <div
                key={section.id}
                className="bg-white border border-neutral-200 rounded-xl p-5 shadow-2xs hover:border-neutral-300 transition-all"
              >
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-100">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-neutral-900 text-sm">{section.title}</span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
                      {section.charCount} chars
                    </span>
                  </div>
                  <CopyButton
                    copied={copiedId === section.id}
                    onClick={() => copy(section.content, section.id)}
                    idleLabel="Copy Section"
                    copiedLabel="Copied Section!"
                    className="bg-black text-white hover:bg-neutral-800"
                    copiedClassName="bg-emerald-50 text-emerald-700 border border-emerald-200"
                  />
                </div>
                <div className="font-sans text-neutral-800 text-sm leading-relaxed whitespace-pre-wrap select-text">
                  {section.content}
                </div>
              </div>
            ))}

            {response.fullUnsplitCopy && (
              <div className="bg-white border-2 border-dashed border-neutral-300 rounded-xl p-5 mt-4">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-200">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-neutral-900 text-sm">
                      Complete Unsplit Version (Labeled for the Record)
                    </span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
                      {response.fullUnsplitCopy.length} chars
                    </span>
                  </div>
                  <CopyButton
                    copied={copiedId === 'full-unsplit'}
                    onClick={() => copy(response.fullUnsplitCopy!, 'full-unsplit')}
                    idleLabel="Copy Complete Unsplit"
                    copiedLabel="Copied Complete Copy!"
                    className="bg-neutral-900 text-white hover:bg-black"
                    copiedClassName="bg-emerald-50 text-emerald-700 border border-emerald-200"
                  />
                </div>
                <div className="font-sans text-neutral-800 text-sm leading-relaxed whitespace-pre-wrap select-text">
                  {response.fullUnsplitCopy}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Full document */}
      {activeTab === 'full' && (
        <div className="p-6">
          <div className="flex items-center justify-between text-xs text-neutral-500 mb-3">
            <span>Continuous revised text:</span>
            <button
              onClick={() => downloadFile(displayText, 'revised-text.txt')}
              className="hover:text-black flex items-center gap-1"
            >
              <Download className="w-3 h-3" />
              Download .txt
            </button>
          </div>
          <div className="font-sans text-neutral-900 text-base leading-relaxed whitespace-pre-wrap p-5 bg-neutral-50/50 rounded-xl border border-neutral-100 select-text">
            {displayText}
          </div>
        </div>
      )}

      {/* Diff */}
      {activeTab === 'diff' && (
        <div className="p-6">
          <div className="flex items-center justify-between text-xs text-neutral-500 mb-3">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 bg-emerald-100 border border-emerald-400 rounded" />
                <span>Added</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 bg-rose-100 border border-rose-300 rounded" />
                <span>Removed</span>
              </span>
            </div>
            <span>Word comparison with the text you submitted</span>
          </div>

          <div className="font-sans text-sm leading-relaxed p-5 bg-neutral-50/50 rounded-xl border border-neutral-100 select-text whitespace-pre-wrap">
            {diffTokens.map((token, idx) =>
              token.type === 'added' ? (
                <span key={idx} className="bg-emerald-100/80 text-emerald-900 font-medium px-0.5 rounded">
                  {token.value}
                </span>
              ) : token.type === 'removed' ? (
                <span
                  key={idx}
                  className="bg-rose-100/70 text-rose-800 line-through decoration-rose-400 px-0.5 rounded opacity-70"
                >
                  {token.value}
                </span>
              ) : (
                <span key={idx}>{token.value}</span>
              )
            )}
          </div>
        </div>
      )}

      {/* Applied rules */}
      {activeTab === 'rules' && (
        <div className="p-6 space-y-3">
          <div className="text-xs text-neutral-500 mb-2">
            The revision engine applied the following configured rules to this edit:
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {response.appliedRules.map((rule) => (
              <div
                key={rule}
                className="flex items-center gap-2.5 p-3 rounded-xl border border-neutral-100 bg-neutral-50/70 text-xs font-medium text-neutral-800"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{rule}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
