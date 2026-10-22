import React, { useState } from 'react';
import {
  Copy,
  Check,
  RotateCcw,
  Download,
  ArrowRight,
  FileText,
  SplitSquareVertical,
  CheckCircle2,
  Layers,
  Sparkles,
} from 'lucide-react';
import { EditResponse, SectionBlock } from '../types';
import { computeSimpleDiff } from '../diffUtil';
import { removeEmDashes } from '../textSanitizer';

interface OutputViewerProps {
  originalText: string;
  response: EditResponse;
  onApplyToEditor: (text: string) => void;
  onClose?: () => void;
}

export const OutputViewer: React.FC<OutputViewerProps> = ({
  originalText,
  response,
  onApplyToEditor,
}) => {
  const [activeTab, setActiveTab] = useState<'sections' | 'full' | 'diff' | 'rules'>(
    response.sections && response.sections.length > 0 ? 'sections' : 'full'
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(removeEmDashes(text));
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const downloadText = (content: string, filename: string) => {
    const blob = new Blob([removeEmDashes(content)], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const displayText = removeEmDashes(response.fullUnsplitCopy || response.resultText);
  const diffTokens = computeSimpleDiff(removeEmDashes(originalText), displayText);

  return (
    <div className="bg-white border border-neutral-200/90 rounded-2xl shadow-sm overflow-hidden mb-8 transition-all">
      {/* Top Header / Action Bar */}
      <div className="border-b border-neutral-100 bg-neutral-50/40 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-50"></div>
          <span className="font-semibold text-neutral-900 text-sm">Revision Complete</span>
          <span className="text-xs text-neutral-400 font-mono">
            ({response.stats.resultWordCount} words • {response.stats.resultCharCount} chars)
          </span>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1 bg-neutral-100/90 p-1 rounded-xl text-xs font-medium text-neutral-600">
          {response.sections && response.sections.length > 0 && (
            <button
              onClick={() => setActiveTab('sections')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'sections'
                  ? 'bg-white text-black shadow-xs font-semibold'
                  : 'hover:text-black'
              }`}
            >
              <SplitSquareVertical className="w-3.5 h-3.5" />
              Split Sections ({response.sections.length})
            </button>
          )}

          <button
            onClick={() => setActiveTab('full')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'full'
                ? 'bg-white text-black shadow-xs font-semibold'
                : 'hover:text-black'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Full Document
          </button>

          <button
            onClick={() => setActiveTab('diff')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'diff'
                ? 'bg-white text-black shadow-xs font-semibold'
                : 'hover:text-black'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Diff Comparison
          </button>

          <button
            onClick={() => setActiveTab('rules')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'rules'
                ? 'bg-white text-black shadow-xs font-semibold'
                : 'hover:text-black'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Applied Rules ({response.appliedRules.length})
          </button>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => copyToClipboard(displayText, 'global-copy')}
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

      {/* Tab 1: Split Section Copy Blocks (~1000 char cards) */}
      {activeTab === 'sections' && response.sections && (
        <div className="p-6 space-y-6 bg-neutral-50/20">
          <div className="flex items-center justify-between text-xs text-neutral-500 pb-1">
            <span>
              Each card is formatted under the requested character limit for convenient single-click
              copying. System boxes and mechanics are preserved unbroken.
            </span>
            <button
              onClick={() =>
                downloadText(
                  response.sections
                    ?.map((s) => `[${s.title} • ${s.charCount} chars]\n\n${s.content}\n\n`)
                    .join('----------------------------------------\n\n') || '',
                  'split-sections.txt'
                )
              }
              className="hover:text-black underline-offset-2 hover:underline flex items-center gap-1"
            >
              <Download className="w-3 h-3" />
              Download Sections
            </button>
          </div>

          <div className="grid grid-cols-1 gap-5">
            {response.sections.map((section, idx) => (
              <div
                key={section.id}
                className="bg-white border border-neutral-200 rounded-xl p-5 shadow-2xs hover:border-neutral-300 transition-all"
              >
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-100">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-neutral-900 text-sm">
                      {section.title}
                    </span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
                      {section.charCount} chars
                    </span>
                  </div>

                  <button
                    onClick={() => copyToClipboard(removeEmDashes(section.content), section.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      copiedId === section.id
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-black text-white hover:bg-neutral-800'
                    }`}
                  >
                    {copiedId === section.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Copied Section!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Section</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="font-sans text-neutral-800 text-sm leading-relaxed whitespace-pre-wrap select-text">
                  {removeEmDashes(section.content)}
                </div>
              </div>
            ))}

            {/* Complete Unsplit Copy Card for the record */}
            {response.fullUnsplitCopy && (
              <div className="bg-white border-2 border-dashed border-neutral-300 rounded-xl p-5 mt-4">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-200">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-neutral-900 text-sm">
                      Complete Unsplit Version (Labeled for the Record)
                    </span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
                      {removeEmDashes(response.fullUnsplitCopy).length} chars
                    </span>
                  </div>

                  <button
                    onClick={() => copyToClipboard(removeEmDashes(response.fullUnsplitCopy!), 'full-unsplit')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      copiedId === 'full-unsplit'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-neutral-900 text-white hover:bg-black'
                    }`}
                  >
                    {copiedId === 'full-unsplit' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Copied Complete Copy!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Complete Unsplit</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="font-sans text-neutral-800 text-sm leading-relaxed whitespace-pre-wrap select-text">
                  {removeEmDashes(response.fullUnsplitCopy)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Full Document Continuous View */}
      {activeTab === 'full' && (
        <div className="p-6">
          <div className="flex items-center justify-between text-xs text-neutral-500 mb-3">
            <span>Continuous revised text:</span>
            <button
              onClick={() => downloadText(displayText, 'revised-text.txt')}
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

      {/* Tab 3: Diff Comparison View */}
      {activeTab === 'diff' && (
        <div className="p-6">
          <div className="flex items-center justify-between text-xs text-neutral-500 mb-3">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 bg-emerald-100 border border-emerald-400 rounded"></span>
                <span>Added</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 bg-rose-100 border border-rose-300 rounded line-through"></span>
                <span>Removed</span>
              </span>
            </div>
            <span>Token comparison with original draft</span>
          </div>

          <div className="font-sans text-sm leading-relaxed p-5 bg-neutral-50/50 rounded-xl border border-neutral-100 select-text whitespace-pre-wrap">
            {diffTokens.map((token, idx) => {
              if (token.type === 'added') {
                return (
                  <span
                    key={idx}
                    className="bg-emerald-100/80 text-emerald-900 font-medium px-0.5 rounded"
                  >
                    {token.value}
                  </span>
                );
              }
              if (token.type === 'removed') {
                return (
                  <span
                    key={idx}
                    className="bg-rose-100/70 text-rose-800 line-through decoration-rose-400 px-0.5 rounded opacity-70"
                  >
                    {token.value}
                  </span>
                );
              }
              return <span key={idx}>{token.value}</span>;
            })}
          </div>
        </div>
      )}

      {/* Tab 4: Applied Rules Checklist */}
      {activeTab === 'rules' && (
        <div className="p-6 space-y-3">
          <div className="text-xs text-neutral-500 mb-2">
            The revision engine applied the following configured rules to this edit:
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {response.appliedRules.map((rule, idx) => (
              <div
                key={idx}
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
};
