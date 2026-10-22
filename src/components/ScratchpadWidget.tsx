import React, { useState, useRef, useEffect } from 'react';
import { X, Minus, Maximize2, Copy, Check } from 'lucide-react';

type ResizeDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

interface ScratchpadWidgetProps {
  isMinimized: boolean;
  zIndex: number;
  onFocus: () => void;
  onMinimize: () => void;
  onClose: () => void;
}

export const ScratchpadWidget: React.FC<ScratchpadWidgetProps> = ({
  isMinimized,
  zIndex,
  onFocus,
  onMinimize,
  onClose,
}) => {
  const [rect, setRect] = useState<{ x: number; y: number; width: number; height: number }>({
    x: 180,
    y: 120,
    width: 360,
    height: 280,
  });

  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [text, setText] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('WORKSTATION_SCRATCHPAD_TEXT_V1');
      if (saved !== null) return saved;
    } catch {}
    return 'Reference Notes:\n• Baseliners: genderless (they/them/name/number)\n• Keep ═════ boxes unbroken\n• Max ~1,000 chars per copy block';
  });

  // Sync scratchpad to storage
  useEffect(() => {
    try {
      localStorage.setItem('WORKSTATION_SCRATCHPAD_TEXT_V1', text);
    } catch {}
  }, [text]);

  // Listen for workstation-wide load progress events
  useEffect(() => {
    const handleReload = () => {
      try {
        const saved = localStorage.getItem('WORKSTATION_SCRATCHPAD_TEXT_V1');
        if (saved !== null) setText(saved);
      } catch {}
    };
    window.addEventListener('workstation-progress-loaded', handleReload);
    return () => window.removeEventListener('workstation-progress-loaded', handleReload);
  }, []);
  const [copied, setCopied] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isResizing, setIsResizing] = useState<boolean>(false);

  const dragStartRef = useRef<{ startX: number; startY: number; origX: number; origY: number }>({
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
  });

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

  const handleDragDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('textarea')) return;
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
    setRect((r) => ({
      ...r,
      x: Math.max(0, Math.min(window.innerWidth - 100, dragStartRef.current.origX + dx)),
      y: Math.max(28, Math.min(window.innerHeight - 80, dragStartRef.current.origY + dy)),
    }));
  };

  const handleDragUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  const handleResizeDown = (dir: ResizeDir, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
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

    const minW = 240;
    const minH = 160;

    let newX = origX;
    let newY = origY;
    let newW = origW;
    let newH = origH;

    if (dir.includes('e')) newW = Math.max(minW, origW + dx);
    if (dir.includes('s')) newH = Math.max(minH, origH + dy);
    if (dir.includes('w')) {
      const pw = origW - dx;
      if (pw >= minW) {
        newW = pw;
        newX = origX + dx;
      }
    }
    if (dir.includes('n')) {
      const ph = origH - dy;
      if (ph >= minH) {
        newH = ph;
        newY = origY + dy;
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

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isMinimized) return null;

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
        isFullScreen ? 'border-none rounded-none' : 'border-neutral-300/80 rounded-2xl shadow-xl'
      } transition-shadow ${
        isDragging || isResizing ? 'select-none ring-2 ring-neutral-400/40' : ''
      }`}
    >
      {/* Resize handles */}
      {!isFullScreen && (
        <>
          <div onPointerDown={(e) => handleResizeDown('n', e)} onPointerMove={handleResizeMove} onPointerUp={handleResizeUp} className="absolute -top-1 left-2 right-2 h-2.5 cursor-ns-resize z-50" />
          <div onPointerDown={(e) => handleResizeDown('s', e)} onPointerMove={handleResizeMove} onPointerUp={handleResizeUp} className="absolute -bottom-1 left-2 right-2 h-2.5 cursor-ns-resize z-50" />
          <div onPointerDown={(e) => handleResizeDown('w', e)} onPointerMove={handleResizeMove} onPointerUp={handleResizeUp} className="absolute top-2 bottom-2 -left-1 w-2.5 cursor-ew-resize z-50" />
          <div onPointerDown={(e) => handleResizeDown('e', e)} onPointerMove={handleResizeMove} onPointerUp={handleResizeUp} className="absolute top-2 bottom-2 -right-1 w-2.5 cursor-ew-resize z-50" />
          <div onPointerDown={(e) => handleResizeDown('nw', e)} onPointerMove={handleResizeMove} onPointerUp={handleResizeUp} className="absolute -top-1.5 -left-1.5 w-3 h-3 cursor-nwse-resize z-50" />
          <div onPointerDown={(e) => handleResizeDown('ne', e)} onPointerMove={handleResizeMove} onPointerUp={handleResizeUp} className="absolute -top-1.5 -right-1.5 w-3 h-3 cursor-nesw-resize z-50" />
          <div onPointerDown={(e) => handleResizeDown('sw', e)} onPointerMove={handleResizeMove} onPointerUp={handleResizeUp} className="absolute -bottom-1.5 -left-1.5 w-3 h-3 cursor-nesw-resize z-50" />
          <div onPointerDown={(e) => handleResizeDown('se', e)} onPointerMove={handleResizeMove} onPointerUp={handleResizeUp} className="absolute -bottom-1.5 -right-1.5 w-3 h-3 cursor-nwse-resize z-50" />
        </>
      )}

      {/* Titlebar */}
      <div
        onPointerDown={handleDragDown}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragUp}
        className={`h-9 px-3 bg-neutral-100/90 border-b border-neutral-200/90 ${
          isFullScreen ? 'rounded-none' : 'rounded-t-2xl'
        } flex items-center justify-between cursor-grab active:cursor-grabbing select-none shrink-0`}
      >
        <div className="flex items-center gap-1.5">
          <button onClick={onClose} className="w-3 h-3 rounded-full bg-rose-500 hover:bg-rose-600 border border-rose-600/30 flex items-center justify-center text-rose-950 group">
            <X className="w-2 h-2 opacity-0 group-hover:opacity-100 font-bold" />
          </button>
          <button onClick={onMinimize} className="w-3 h-3 rounded-full bg-amber-400 hover:bg-amber-500 border border-amber-500/30 flex items-center justify-center text-amber-950 group">
            <Minus className="w-2 h-2 opacity-0 group-hover:opacity-100 font-bold" />
          </button>
          <button onClick={() => setIsFullScreen(!isFullScreen)} className="w-3 h-3 rounded-full bg-emerald-500 hover:bg-emerald-600 border border-emerald-600/30 flex items-center justify-center text-emerald-950 group" title={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}>
            <Maximize2 className="w-2 h-2 opacity-0 group-hover:opacity-100 font-bold" />
          </button>
        </div>

        <span className="text-xs font-semibold text-neutral-800">Quick Scratchpad</span>

        <button
          onClick={handleCopy}
          className="p-1 rounded hover:bg-neutral-200/80 text-neutral-600 text-[11px] flex items-center gap-1"
          title="Copy notes"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
        </button>
      </div>

      {/* Body */}
      <div className="p-3 flex-1 flex flex-col">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste temporary text or snippets..."
          className="w-full flex-1 bg-transparent resize-none outline-none text-xs text-neutral-800 leading-relaxed font-mono"
        />
      </div>

      {/* Corner grip */}
      <div
        onPointerDown={(e) => handleResizeDown('se', e)}
        onPointerMove={handleResizeMove}
        onPointerUp={handleResizeUp}
        className="absolute bottom-1 right-1 w-3 h-3 cursor-nwse-resize text-neutral-400"
      >
        <svg width="6" height="6" viewBox="0 0 6 6" fill="currentColor">
          <circle cx="5" cy="5" r="0.8" />
          <circle cx="5" cy="2" r="0.8" />
          <circle cx="2" cy="5" r="0.8" />
        </svg>
      </div>
    </div>
  );
};
