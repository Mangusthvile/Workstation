import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Minus,
  Maximize2,
  Minimize2,
  Play,
  RotateCcw,
  BookOpen,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Toolbar } from './Toolbar';
import { OutputViewer } from './OutputViewer';
import { EditConfig, DEFAULT_CONFIG, EditResponse } from '../types';
import { SAMPLE_TEXTS, Sample } from '../sampleTexts';
import { removeEmDashes } from '../textSanitizer';

type ResizeDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

interface TextEditorWidgetProps {
  isMinimized: boolean;
  zIndex: number;
  onFocus: () => void;
  onMinimize: () => void;
  onClose: () => void;
}

export const TextEditorWidget: React.FC<TextEditorWidgetProps> = ({
  isMinimized,
  zIndex,
  onFocus,
  onMinimize,
  onClose,
}) => {
  // Window rect: position and dimensions
  const [rect, setRect] = useState<{ x: number; y: number; width: number; height: number }>({
    x: 80,
    y: 50,
    width: 780,
    height: 640,
  });

  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  // Dragging state
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ startX: number; startY: number; origX: number; origY: number }>({
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
  });

  // Resizing state
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const resizeRef = useRef<{
    dir: ResizeDir;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
  }>({
    dir: 'se',
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
    origW: 0,
    origH: 0,
  });

  // Editor State
  const [inputText, setInputText] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('WORKSTATION_TEXT_EDITOR_TEXT_V1');
      if (saved !== null) return removeEmDashes(saved);
    } catch {}
    return removeEmDashes(SAMPLE_TEXTS[0].text);
  });
  const [config, setConfig] = useState<EditConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<EditResponse | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [showSamplesDropdown, setShowSamplesDropdown] = useState<boolean>(false);

  // Sync editor text to storage
  useEffect(() => {
    try {
      localStorage.setItem('WORKSTATION_TEXT_EDITOR_TEXT_V1', removeEmDashes(inputText));
    } catch {}
  }, [inputText]);

  // Listen for workstation-wide load progress events
  useEffect(() => {
    const handleReload = () => {
      try {
        const saved = localStorage.getItem('WORKSTATION_TEXT_EDITOR_TEXT_V1');
        if (saved !== null) setInputText(removeEmDashes(saved));
      } catch {}
    };
    window.addEventListener('workstation-progress-loaded', handleReload);
    return () => window.removeEventListener('workstation-progress-loaded', handleReload);
  }, []);

  // Center on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const initW = Math.min(820, Math.max(420, vw - 80));
      const initH = Math.min(680, Math.max(400, vh - 140));
      const initX = Math.max(16, Math.floor((vw - initW) / 2));
      const initY = Math.max(40, Math.floor((vh - initH) / 2) - 20);
      setRect({ x: initX, y: initY, width: initW, height: initH });
    }
  }, []);

  // Dragging Titlebar Handlers
  const handleDragDown = (e: React.PointerEvent) => {
    if (isFullScreen) return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('textarea')) {
      return;
    }
    e.preventDefault();
    onFocus();
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: rect.x,
      origY: rect.y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleDragMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;
    const newX = Math.max(0, Math.min(window.innerWidth - 120, dragStartRef.current.origX + dx));
    const newY = Math.max(28, Math.min(window.innerHeight - 80, dragStartRef.current.origY + dy));
    setRect((r) => ({ ...r, x: newX, y: newY }));
  };

  const handleDragUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // Resizing Edge & Corner Handlers
  const handleResizeDown = (dir: ResizeDir, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isFullScreen) return;
    onFocus();
    setIsResizing(true);
    resizeRef.current = {
      dir,
      startX: e.clientX,
      startY: e.clientY,
      origX: rect.x,
      origY: rect.y,
      origW: rect.width,
      origH: rect.height,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleResizeMove = (e: React.PointerEvent) => {
    if (!isResizing) return;
    const { dir, startX, startY, origX, origY, origW, origH } = resizeRef.current;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    const minW = 380;
    const minH = 240;

    let newX = origX;
    let newY = origY;
    let newW = origW;
    let newH = origH;

    if (dir.includes('e')) {
      newW = Math.max(minW, origW + dx);
    }
    if (dir.includes('s')) {
      newH = Math.max(minH, origH + dy);
    }
    if (dir.includes('w')) {
      const possibleW = origW - dx;
      if (possibleW >= minW) {
        newW = possibleW;
        newX = origX + dx;
      } else {
        newW = minW;
        newX = origX + (origW - minW);
      }
    }
    if (dir.includes('n')) {
      const possibleH = origH - dy;
      if (possibleH >= minH) {
        newH = possibleH;
        newY = origY + dy;
      } else {
        newH = minH;
        newY = origY + (origH - minH);
      }
    }

    setRect({ x: newX, y: newY, width: newW, height: newH });
  };

  const handleResizeUp = (e: React.PointerEvent) => {
    if (isResizing) {
      setIsResizing(false);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // Full Screen Toggle
  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  // Run Edit API Call
  const handleRunEdit = async () => {
    const cleanInput = removeEmDashes(inputText);
    if (!cleanInput.trim()) {
      setError('Please enter some text to edit.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: cleanInput,
          config,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server returned error (${res.status})`);
      }

      const data: EditResponse = await res.json();
      // Ensure all fields in the response are guaranteed free of em-dashes
      data.resultText = removeEmDashes(data.resultText);
      if (data.fullUnsplitCopy) {
        data.fullUnsplitCopy = removeEmDashes(data.fullUnsplitCopy);
      }
      if (data.sections) {
        data.sections = data.sections.map((sec) => ({
          ...sec,
          content: removeEmDashes(sec.content),
        }));
      }
      setResponse(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to edit text. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRunEdit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inputText, config]);

  const handleApplyToEditor = (revisedText: string) => {
    setHistory((prev) => [inputText, ...prev.slice(0, 9)]);
    setInputText(removeEmDashes(revisedText));
    setResponse(null);
  };

  const handleUndo = () => {
    if (history.length > 0) {
      const prev = history[0];
      setHistory((h) => h.slice(1));
      setInputText(removeEmDashes(prev));
    }
  };

  const copyInput = () => {
    navigator.clipboard.writeText(removeEmDashes(inputText));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const loadSample = (sample: Sample) => {
    setInputText(removeEmDashes(sample.text));
    setShowSamplesDropdown(false);
    setResponse(null);
    setError(null);
  };

  if (isMinimized) {
    return null;
  }

  const wordCount = inputText.trim() ? inputText.trim().split(/\s+/).filter(Boolean).length : 0;
  const charCount = inputText.length;

  return (
    <div
      onPointerDown={onFocus}
      style={
        isFullScreen
          ? {
              position: 'fixed',
              top: '0px',
              left: '0px',
              right: '0px',
              bottom: '0px',
              width: '100vw',
              height: '100vh',
              zIndex: 100,
            }
          : {
              position: 'absolute',
              top: `${rect.y}px`,
              left: `${rect.x}px`,
              width: `${rect.width}px`,
              height: `${rect.height}px`,
              zIndex,
            }
      }
      className={`group flex flex-col bg-white/95 backdrop-blur-2xl border ${
        isFullScreen ? 'border-none rounded-none' : 'border-neutral-300/80 rounded-2xl shadow-2xl'
      } transition-shadow ${
        isDragging || isResizing ? 'select-none shadow-2xl ring-2 ring-neutral-400/40' : ''
      }`}
    >
      {/* 8 Drag & Resize Handles around edges and corners */}
      {!isFullScreen && (
        <>
          {/* Top edge */}
          <div
            onPointerDown={(e) => handleResizeDown('n', e)}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeUp}
            className="absolute -top-1.5 left-2 right-2 h-3 cursor-ns-resize z-50"
          />
          {/* Bottom edge */}
          <div
            onPointerDown={(e) => handleResizeDown('s', e)}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeUp}
            className="absolute -bottom-1.5 left-2 right-2 h-3 cursor-ns-resize z-50"
          />
          {/* Left edge */}
          <div
            onPointerDown={(e) => handleResizeDown('w', e)}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeUp}
            className="absolute top-2 bottom-2 -left-1.5 w-3 cursor-ew-resize z-50"
          />
          {/* Right edge */}
          <div
            onPointerDown={(e) => handleResizeDown('e', e)}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeUp}
            className="absolute top-2 bottom-2 -right-1.5 w-3 cursor-ew-resize z-50"
          />
          {/* Top-Left corner */}
          <div
            onPointerDown={(e) => handleResizeDown('nw', e)}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeUp}
            className="absolute -top-2 -left-2 w-4 h-4 cursor-nwse-resize z-50"
          />
          {/* Top-Right corner */}
          <div
            onPointerDown={(e) => handleResizeDown('ne', e)}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeUp}
            className="absolute -top-2 -right-2 w-4 h-4 cursor-nesw-resize z-50"
          />
          {/* Bottom-Left corner */}
          <div
            onPointerDown={(e) => handleResizeDown('sw', e)}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeUp}
            className="absolute -bottom-2 -left-2 w-4 h-4 cursor-nesw-resize z-50"
          />
          {/* Bottom-Right corner */}
          <div
            onPointerDown={(e) => handleResizeDown('se', e)}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeUp}
            className="absolute -bottom-2 -right-2 w-4 h-4 cursor-nwse-resize z-50"
          />
        </>
      )}

      {/* Widget Window Titlebar (Drag Handle) */}
      <div
        onPointerDown={handleDragDown}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragUp}
        className={`h-10 px-3 bg-neutral-100/90 border-b border-neutral-200/90 ${
          isFullScreen ? 'rounded-none' : 'rounded-t-2xl'
        } flex items-center justify-between cursor-grab active:cursor-grabbing select-none shrink-0`}
      >
        {/* macOS Traffic Lights */}
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="w-3 h-3 rounded-full bg-rose-500 hover:bg-rose-600 border border-rose-600/30 flex items-center justify-center text-rose-950 group transition-all"
            title="Close / Dismiss Widget"
          >
            <X className="w-2 h-2 opacity-0 group-hover:opacity-100 font-bold" />
          </button>
          <button
            onClick={onMinimize}
            className="w-3 h-3 rounded-full bg-amber-400 hover:bg-amber-500 border border-amber-500/30 flex items-center justify-center text-amber-950 group transition-all"
            title="Minimize to Taskbar"
          >
            <Minus className="w-2 h-2 opacity-0 group-hover:opacity-100 font-bold" />
          </button>
          <button
            onClick={toggleFullScreen}
            className="w-3 h-3 rounded-full bg-emerald-500 hover:bg-emerald-600 border border-emerald-600/30 flex items-center justify-center text-emerald-950 group transition-all"
            title={isFullScreen ? 'Exit Full Screen' : 'Enter Full Screen'}
          >
            <Maximize2 className="w-2 h-2 opacity-0 group-hover:opacity-100 font-bold" />
          </button>
        </div>

        {/* Title & Status */}
        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-800">
          <span className="w-2 h-2 rounded-full bg-black"></span>
          <span>Text Editor</span>
          {isFullScreen && (
            <span className="px-1.5 py-0.2 rounded bg-neutral-900 text-white text-[10px] font-normal">
              Full Screen
            </span>
          )}
        </div>

        {/* Quick Window Actions */}
        <div className="flex items-center gap-1.5">
          {/* Sample texts dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSamplesDropdown(!showSamplesDropdown)}
              className="p-1 rounded-lg bg-white hover:bg-neutral-100 border border-neutral-200 text-neutral-700 text-xs flex items-center gap-1"
              title="Load Scenario Sample"
            >
              <BookOpen className="w-3 h-3 text-neutral-500" />
              <ChevronDown className="w-2.5 h-2.5 text-neutral-400" />
            </button>

            {showSamplesDropdown && (
              <div className="absolute right-0 mt-1 w-64 bg-white border border-neutral-200 shadow-xl rounded-xl p-1.5 z-50 text-xs">
                <div className="px-2 py-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  Test Samples
                </div>
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
        </div>
      </div>

      {/* Widget Body Content (Scrollable) */}
      <div className="p-3 sm:p-4 overflow-y-auto flex-1 flex flex-col space-y-3">
        {error && (
          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="font-bold px-1">
              ✕
            </button>
          </div>
        )}

        {/* 9 Edit Buttons Toolbar */}
        <Toolbar config={config} onChange={setConfig} />

        {/* Draft Editor Box */}
        <div className="bg-white rounded-xl border border-neutral-200 shadow-2xs p-3 flex flex-col flex-1 min-h-[140px]">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-100 text-[11px] text-neutral-500">
            <span className="font-medium text-neutral-700 uppercase tracking-wider text-[10px]">
              Draft Input
            </span>

            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span>{charCount} chars</span>
              <span className="text-neutral-300">•</span>
              <span>{wordCount} words</span>
              <span className="text-neutral-300">•</span>
              <button
                onClick={copyInput}
                className="hover:text-black flex items-center gap-1 text-neutral-500 font-sans"
              >
                {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{isCopied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <textarea
            value={inputText}
            onChange={(e) => {
              const cleaned = removeEmDashes(e.target.value);
              setInputText(cleaned);
            }}
            onPaste={(e) => {
              const pasted = e.clipboardData.getData('text');
              if (pasted && (/[\u2014\u2015\u2013]|--|&mdash;/i.test(pasted))) {
                e.preventDefault();
                const cleaned = removeEmDashes(pasted);
                const target = e.currentTarget;
                const start = target.selectionStart || 0;
                const end = target.selectionEnd || 0;
                const newText = inputText.substring(0, start) + cleaned + inputText.substring(end);
                setInputText(removeEmDashes(newText));
                requestAnimationFrame(() => {
                  target.selectionStart = target.selectionEnd = start + cleaned.length;
                });
              }
            }}
            placeholder="Type or paste text to edit here..."
            className="w-full outline-none resize-none bg-transparent text-neutral-900 text-sm leading-relaxed placeholder:text-neutral-300 flex-1 min-h-[110px]"
            spellCheck={false}
          />

          {/* Action Row */}
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
              disabled={isLoading || !inputText.trim()}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm ${
                isLoading || !inputText.trim()
                  ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                  : 'bg-black text-white hover:bg-neutral-800 active:scale-[0.98]'
              }`}
            >
              {isLoading ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
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

        {/* Output Section */}
        {response && (
          <div className="mt-2">
            <OutputViewer
              originalText={inputText}
              response={response}
              onApplyToEditor={handleApplyToEditor}
              onClose={() => setResponse(null)}
            />
          </div>
        )}
      </div>

      {/* Visible Bottom-Right Resize Grip Indicator */}
      {!isFullScreen && (
        <div
          onPointerDown={(e) => handleResizeDown('se', e)}
          onPointerMove={handleResizeMove}
          onPointerUp={handleResizeUp}
          className="absolute bottom-1 right-1 w-3.5 h-3.5 cursor-nwse-resize flex items-end justify-end p-0.5 text-neutral-400 hover:text-black"
          title="Drag corner to resize"
        >
          <svg width="6" height="6" viewBox="0 0 6 6" fill="currentColor">
            <circle cx="5" cy="5" r="0.8" />
            <circle cx="5" cy="2" r="0.8" />
            <circle cx="2" cy="5" r="0.8" />
          </svg>
        </div>
      )}
    </div>
  );
};
