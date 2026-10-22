import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Maximize2, Minus, X } from 'lucide-react';
import { isInteractiveTarget } from '../../lib/browser';

/**
 * The draggable, resizable macOS-style window used by every desktop widget.
 *
 * Before this existed, each widget carried its own copy of ~200 lines of drag
 * and resize code (with slightly different bugs in each). Pointer moves are
 * now coalesced to one state update per animation frame.
 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

type ResizeDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

interface Gesture {
  kind: 'drag' | 'resize';
  dir: ResizeDir | null;
  startX: number;
  startY: number;
  orig: Rect;
}

const MENU_BAR_HEIGHT = 28;
const KEEP_VISIBLE_X = 120; // px of the window that must stay on screen horizontally
const KEEP_VISIBLE_Y = 80;

const RESIZE_HANDLES: { dir: ResizeDir; className: string }[] = [
  { dir: 'n', className: '-top-1.5 left-2 right-2 h-3 cursor-ns-resize' },
  { dir: 's', className: '-bottom-1.5 left-2 right-2 h-3 cursor-ns-resize' },
  { dir: 'w', className: 'top-2 bottom-2 -left-1.5 w-3 cursor-ew-resize' },
  { dir: 'e', className: 'top-2 bottom-2 -right-1.5 w-3 cursor-ew-resize' },
  { dir: 'nw', className: '-top-2 -left-2 w-4 h-4 cursor-nwse-resize' },
  { dir: 'ne', className: '-top-2 -right-2 w-4 h-4 cursor-nesw-resize' },
  { dir: 'sw', className: '-bottom-2 -left-2 w-4 h-4 cursor-nesw-resize' },
  { dir: 'se', className: '-bottom-2 -right-2 w-4 h-4 cursor-nwse-resize' },
];

function clampPosition(x: number, y: number) {
  return {
    x: Math.max(0, Math.min(window.innerWidth - KEEP_VISIBLE_X, x)),
    y: Math.max(MENU_BAR_HEIGHT, Math.min(window.innerHeight - KEEP_VISIBLE_Y, y)),
  };
}

function computeResize(g: Gesture, clientX: number, clientY: number, minW: number, minH: number): Rect {
  const { orig } = g;
  const dir = g.dir!;
  const dx = clientX - g.startX;
  const dy = clientY - g.startY;
  let { x, y, width, height } = orig;

  if (dir.includes('e')) width = Math.max(minW, orig.width + dx);
  if (dir.includes('s')) height = Math.max(minH, orig.height + dy);
  if (dir.includes('w')) {
    // Keep the right edge pinned; never move past the left edge of the screen.
    width = Math.max(minW, Math.min(orig.width - dx, orig.x + orig.width));
    x = orig.x + orig.width - width;
  }
  if (dir.includes('n')) {
    // Keep the bottom edge pinned; never slide under the menu bar.
    height = Math.max(minH, Math.min(orig.height - dy, orig.y + orig.height - MENU_BAR_HEIGHT));
    y = orig.y + orig.height - height;
  }
  return { x, y, width, height };
}

interface WindowFrameProps {
  title: React.ReactNode;
  /** Controls shown on the right side of the title bar. */
  actions?: React.ReactNode;
  isMinimized: boolean;
  zIndex: number;
  onFocus: () => void;
  onMinimize: () => void;
  onClose: () => void;
  /** Called once on mount to pick the starting position and size. */
  initialRect: () => Rect;
  minWidth: number;
  minHeight: number;
  /** Tailwind height class for the title bar. */
  titleBarHeight?: string;
  className?: string;
  frameRef?: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
}

export const WindowFrame: React.FC<WindowFrameProps> = ({
  title,
  actions,
  isMinimized,
  zIndex,
  onFocus,
  onMinimize,
  onClose,
  initialRect,
  minWidth,
  minHeight,
  titleBarHeight = 'h-10',
  className = '',
  frameRef,
  children,
}) => {
  const [rect, setRect] = useState<Rect>(initialRect);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);

  const gesture = useRef<Gesture | null>(null);
  const rafId = useRef(0);
  const queuedRect = useRef<Rect | null>(null);

  const queueRect = useCallback((next: Rect) => {
    queuedRect.current = next;
    if (rafId.current) return;
    rafId.current = requestAnimationFrame(() => {
      rafId.current = 0;
      if (queuedRect.current) setRect(queuedRect.current);
    });
  }, []);

  useEffect(() => () => cancelAnimationFrame(rafId.current), []);

  // Keep the title bar reachable if the browser window shrinks.
  useEffect(() => {
    const onResize = () =>
      setRect((r) => {
        const { x, y } = clampPosition(r.x, r.y);
        return x === r.x && y === r.y ? r : { ...r, x, y };
      });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const beginGesture = (e: React.PointerEvent, kind: Gesture['kind'], dir: ResizeDir | null) => {
    if (isFullScreen || e.button !== 0) return;
    e.preventDefault();
    gesture.current = { kind, dir, startX: e.clientX, startY: e.clientY, orig: rect };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setIsInteracting(true);
  };

  const onTitlePointerDown = (e: React.PointerEvent) => {
    if (isInteractiveTarget(e.target)) return;
    beginGesture(e, 'drag', null);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g) return;
    if (g.kind === 'drag') {
      const { x, y } = clampPosition(g.orig.x + e.clientX - g.startX, g.orig.y + e.clientY - g.startY);
      queueRect({ ...g.orig, x, y });
    } else {
      queueRect(computeResize(g, e.clientX, e.clientY, minWidth, minHeight));
    }
  };

  const endGesture = (e: React.PointerEvent) => {
    if (!gesture.current) return;
    gesture.current = null;
    setIsInteracting(false);
    const el = e.target as HTMLElement;
    if (el.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture(e.pointerId);
  };

  if (isMinimized) return null;

  const style: React.CSSProperties = isFullScreen
    ? { position: 'fixed', inset: 0, width: '100vw', height: '100vh', zIndex: 100 }
    : { position: 'absolute', left: rect.x, top: rect.y, width: rect.width, height: rect.height, zIndex };

  return (
    <div
      ref={frameRef}
      style={style}
      onPointerDownCapture={onFocus}
      onPointerMove={onPointerMove}
      onPointerUp={endGesture}
      onPointerCancel={endGesture}
      className={`flex flex-col bg-white/95 backdrop-blur-2xl border ${
        isFullScreen ? 'border-none rounded-none' : 'border-neutral-300/80 rounded-2xl shadow-2xl'
      } ${isInteracting ? 'select-none ring-2 ring-neutral-400/40' : ''} ${className}`}
    >
      {!isFullScreen &&
        RESIZE_HANDLES.map(({ dir, className: pos }) => (
          <div
            key={dir}
            onPointerDown={(e) => {
              e.stopPropagation();
              beginGesture(e, 'resize', dir);
            }}
            className={`absolute z-50 touch-none ${pos}`}
          />
        ))}

      {/* Title bar (drag handle) */}
      <div
        onPointerDown={onTitlePointerDown}
        onDoubleClick={(e) => {
          if (!isInteractiveTarget(e.target)) setIsFullScreen((v) => !v);
        }}
        className={`${titleBarHeight} px-3 bg-neutral-100/90 border-b border-neutral-200/90 ${
          isFullScreen ? 'rounded-none' : 'rounded-t-2xl'
        } flex items-center justify-between gap-2 cursor-grab active:cursor-grabbing select-none shrink-0 touch-none`}
      >
        <div className="group/lights flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="w-3 h-3 rounded-full bg-rose-500 hover:bg-rose-600 border border-rose-600/30 flex items-center justify-center text-rose-950"
            title="Close"
            aria-label="Close window"
          >
            <X className="w-2 h-2 opacity-0 group-hover/lights:opacity-100" />
          </button>
          <button
            type="button"
            onClick={onMinimize}
            className="w-3 h-3 rounded-full bg-amber-400 hover:bg-amber-500 border border-amber-500/30 flex items-center justify-center text-amber-950"
            title="Minimize to dock"
            aria-label="Minimize window"
          >
            <Minus className="w-2 h-2 opacity-0 group-hover/lights:opacity-100" />
          </button>
          <button
            type="button"
            onClick={() => setIsFullScreen((v) => !v)}
            className="w-3 h-3 rounded-full bg-emerald-500 hover:bg-emerald-600 border border-emerald-600/30 flex items-center justify-center text-emerald-950"
            title={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
            aria-label={isFullScreen ? 'Exit full screen' : 'Enter full screen'}
          >
            <Maximize2 className="w-2 h-2 opacity-0 group-hover/lights:opacity-100" />
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-800 min-w-0">
          {title}
          {isFullScreen && (
            <span className="px-1.5 rounded bg-neutral-900 text-white text-[10px] font-normal">Full Screen</span>
          )}
        </div>

        <div className="flex items-center gap-1.5">{actions}</div>
      </div>

      <div className={`flex-1 min-h-0 flex flex-col ${isFullScreen ? '' : 'rounded-b-2xl overflow-hidden'}`}>
        {children}
      </div>

      {/* Visible bottom-right resize grip */}
      {!isFullScreen && (
        <div
          onPointerDown={(e) => {
            e.stopPropagation();
            beginGesture(e, 'resize', 'se');
          }}
          className="absolute bottom-1 right-1 w-3.5 h-3.5 cursor-nwse-resize flex items-end justify-end p-0.5 text-neutral-400 hover:text-black z-50 touch-none"
          title="Drag corner to resize"
        >
          <svg width="6" height="6" viewBox="0 0 6 6" fill="currentColor" aria-hidden>
            <circle cx="5" cy="5" r="0.8" />
            <circle cx="5" cy="2" r="0.8" />
            <circle cx="2" cy="5" r="0.8" />
          </svg>
        </div>
      )}
    </div>
  );
};

/** Centers a window of the given preferred size inside the current viewport. */
export function centeredRect(preferredW: number, preferredH: number, minW: number, minH: number): Rect {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(preferredW, Math.max(minW, vw - 80));
  const height = Math.min(preferredH, Math.max(minH, vh - 140));
  return {
    x: Math.max(16, Math.floor((vw - width) / 2)),
    y: Math.max(40, Math.floor((vh - height) / 2) - 20),
    width,
    height,
  };
}
