import React, { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Check, ChevronDown, Copy, Play, RotateCcw, X } from 'lucide-react';
import { WindowFrame, centeredRect } from './window/WindowFrame';
import { Toolbar } from './Toolbar';
import { OutputViewer } from './OutputViewer';
import { DEFAULT_CONFIG, type EditConfig, type EditResponse } from '../types';
import { SAMPLE_TEXTS, type Sample } from '../sampleTexts';
import { needsSanitizing, removeEmDashes } from '../textSanitizer';
import { STORAGE_KEYS, readText, writeText } from '../lib/storage';
import { copyText } from '../lib/browser';
import { useDismiss, useLatest, usePersistentState, useTransientValue } from '../lib/hooks';
import type { DesktopWidgetProps } from './desktop/types';

const MIN_W = 380;
const MIN_H = 240;
const UNDO_LIMIT = 10;

const loadText = () => {
  const saved = readText(STORAGE_KEYS.textEditor);
  return removeEmDashes(saved ?? SAMPLE_TEXTS[0].text);
};
const saveText = (text: string) => writeText(STORAGE_KEYS.textEditor, text);

const countWords = (text: string) => {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
};

export const TextEditorWidget = memo(function TextEditorWidget({
  isMinimized,
  zIndex,
  onFocus,
  onMinimize,
  onClose,
}: DesktopWidgetProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const samplesRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const pendingCaret = useRef<number | null>(null);

  const [inputText, setInputText] = usePersistentState(STORAGE_KEYS.textEditor, loadText, saveText);
  const [config, setConfig] = useState<EditConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The response is stored with the exact text that produced it, so the diff stays
  // meaningful even if the draft is edited afterwards.
  const [result, setResult] = useState<{ id: number; response: EditResponse; sourceText: string } | null>(null);
  const runCounter = useRef(0);
  const [history, setHistory] = useState<string[]>([]);
  const [copied, markCopied] = useTransientValue<boolean>();
  const [showSamples, setShowSamples] = useState(false);
  useDismiss(showSamples, samplesRef, useCallback(() => setShowSamples(false), []));

  // Abort an in-flight request if the window is closed.
  useEffect(() => () => abortRef.current?.abort(), []);

  const handleRunEdit = async () => {
    if (isLoading) return;
    const cleanInput = removeEmDashes(inputText);
    if (!cleanInput.trim()) {
      setError('Please enter some text to edit.');
      return;
    }

    setError(null);
    setIsLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanInput, config }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server returned error (${res.status})`);
      }

      const data: EditResponse = await res.json();
      // Sanitize once on arrival; the viewer can then render it as-is.
      data.resultText = removeEmDashes(data.resultText);
      if (data.fullUnsplitCopy) data.fullUnsplitCopy = removeEmDashes(data.fullUnsplitCopy);
      if (data.sections) {
        data.sections = data.sections.map((sec) => {
          const content = removeEmDashes(sec.content);
          return { ...sec, content, charCount: content.length };
        });
      }
      setResult({ id: ++runCounter.current, response: data, sourceText: cleanInput });
    } catch (err) {
      if (controller.signal.aborted) return;
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to edit text. Please try again.');
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      if (!controller.signal.aborted) setIsLoading(false);
    }
  };

  // Ctrl/Cmd+Enter runs the edit, but only while focus is inside this window,
  // so the shortcut no longer fires from the Scratchpad or other widgets.
  const runRef = useLatest(handleRunEdit);
  useEffect(() => {
    if (isMinimized) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && frameRef.current?.contains(document.activeElement)) {
        e.preventDefault();
        runRef.current();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isMinimized, runRef]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const el = e.target;
    const raw = el.value;
    if (!needsSanitizing(raw)) {
      setInputText(raw);
      return;
    }
    // Sanitizing changes the length, which would normally throw the caret to the end.
    // Map the caret through the same transformation and restore it right after the commit.
    const caret = el.selectionStart ?? raw.length;
    const cleaned = removeEmDashes(raw);
    const nextCaret = Math.min(cleaned.length, removeEmDashes(raw.slice(0, caret)).length);
    if (cleaned === inputText) {
      // No state change (e.g. a collapsed double space), so no re-render: React just
      // resets the field, and we put the caret back once it has.
      queueMicrotask(() => el.setSelectionRange(nextCaret, nextCaret));
      return;
    }
    pendingCaret.current = nextCaret;
    setInputText(cleaned);
  };

  useLayoutEffect(() => {
    if (pendingCaret.current === null || !textareaRef.current) return;
    textareaRef.current.setSelectionRange(pendingCaret.current, pendingCaret.current);
    pendingCaret.current = null;
  });

  // Stable identity (reads the draft through a ref) so the memoized viewer
  // does not re-render on every keystroke in the editor.
  const inputRef = useLatest(inputText);
  const handleApplyToEditor = useCallback(
    (revisedText: string) => {
      const previous = inputRef.current;
      setHistory((prev) => [previous, ...prev].slice(0, UNDO_LIMIT));
      setInputText(removeEmDashes(revisedText));
      setResult(null);
    },
    [inputRef, setInputText]
  );

  const handleUndo = () => {
    if (history.length === 0) return;
    setInputText(history[0]);
    setHistory((h) => h.slice(1));
  };

  const loadSample = (sample: Sample) => {
    setInputText(removeEmDashes(sample.text));
    setShowSamples(false);
    setResult(null);
    setError(null);
  };

  const wordCount = useMemo(() => countWords(inputText), [inputText]);
  const canRun = !isLoading && inputText.trim().length > 0;

  return (
    <WindowFrame
      frameRef={frameRef}
      isMinimized={isMinimized}
      zIndex={zIndex}
      onFocus={onFocus}
      onMinimize={onMinimize}
      onClose={onClose}
      minWidth={MIN_W}
      minHeight={MIN_H}
      initialRect={() => centeredRect(820, 680, 420, 400)}
      title={
        <>
          <span className="w-2 h-2 rounded-full bg-black" />
          <span>Text Editor</span>
        </>
      }
      actions={
        <div className="relative" ref={samplesRef}>
          <button
            onClick={() => setShowSamples((v) => !v)}
            className="p-1 rounded-lg bg-white hover:bg-neutral-100 border border-neutral-200 text-neutral-700 text-xs flex items-center gap-1"
            title="Load Scenario Sample"
            aria-expanded={showSamples}
          >
            <BookOpen className="w-3 h-3 text-neutral-500" />
            <ChevronDown className="w-2.5 h-2.5 text-neutral-400" />
          </button>

          {showSamples && (
            <div className="absolute right-0 mt-1 w-64 bg-white border border-neutral-200 shadow-xl rounded-xl p-1.5 z-50 text-xs">
              <div className="px-2 py-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Test Samples</div>
              {SAMPLE_TEXTS.map((sample) => (
                <button
                  key={sample.id}
                  onClick={() => loadSample(sample)}
                  className="w-full text-left p-2 rounded-lg hover:bg-neutral-100 transition-colors"
                >
                  <div className="font-semibold text-neutral-800 text-xs">{sample.title}</div>
                  <div className="text-[10px] text-neutral-500 truncate">{sample.description}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      }
    >
      <div className="p-3 sm:p-4 overflow-y-auto flex-1 flex flex-col space-y-3">
        {error && (
          <div
            role="alert"
            className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between"
          >
            <span>{error}</span>
            <button onClick={() => setError(null)} className="px-1" aria-label="Dismiss error">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <Toolbar config={config} onChange={setConfig} />

        {/* Draft editor */}
        <div className="bg-white rounded-xl border border-neutral-200 shadow-2xs p-3 flex flex-col flex-1 min-h-[140px]">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-100 text-[11px] text-neutral-500">
            <span className="font-medium text-neutral-700 uppercase tracking-wider text-[10px]">Draft Input</span>
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span>{inputText.length} chars</span>
              <span className="text-neutral-300">•</span>
              <span>{wordCount} words</span>
              <span className="text-neutral-300">•</span>
              <button
                onClick={async () => (await copyText(inputText)) && markCopied(true)}
                className="hover:text-black flex items-center gap-1 text-neutral-500 font-sans"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={handleChange}
            placeholder="Type or paste text to edit here..."
            className="w-full outline-none resize-none bg-transparent text-neutral-900 text-sm leading-relaxed placeholder:text-neutral-300 flex-1 min-h-[110px] select-text"
            spellCheck={false}
          />

          <div className="pt-2 mt-2 border-t border-neutral-100 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
              {history.length > 0 && (
                <button
                  onClick={handleUndo}
                  className="hover:text-black flex items-center gap-1 text-neutral-600"
                  title="Undo last replace"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Undo</span>
                </button>
              )}
              <span className="hidden sm:inline">⌘+Enter to Run</span>
            </div>

            <button
              onClick={handleRunEdit}
              disabled={!canRun}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm ${
                canRun
                  ? 'bg-black text-white hover:bg-neutral-800 active:scale-[0.98]'
                  : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Revising...</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 fill-current" />
                  <span>Run Edit</span>
                </>
              )}
            </button>
          </div>
        </div>

        {result && (
          <div className="mt-2">
            <OutputViewer
              key={result.id}
              originalText={result.sourceText}
              response={result.response}
              onApplyToEditor={handleApplyToEditor}
            />
          </div>
        )}
      </div>
    </WindowFrame>
  );
});
