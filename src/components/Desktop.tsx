import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Battery,
  CalendarCheck2,
  Check,
  ChevronDown,
  Dices,
  FileText,
  FolderDown,
  LayoutGrid,
  Palette,
  Plus,
  Save,
  StickyNote,
  Wifi,
  X,
  type LucideIcon,
} from 'lucide-react';
import { TextEditorWidget } from './TextEditorWidget';
import { ScratchpadWidget } from './ScratchpadWidget';
import { MenuBarClock } from './desktop/MenuBarClock';
import { SaveLoadModal } from './desktop/SaveLoadModal';
import {
  applySnapshotToStorage,
  buildSnapshot,
  readSavedSnapshot,
  saveSnapshotToBrowser,
} from './desktop/workstationSnapshot';
import {
  DEFAULT_WIDGETS,
  WALLPAPERS,
  WIDGET_IDS,
  type DesktopWidgetProps,
  type WallpaperTheme,
  type WidgetId,
  type WidgetsState,
} from './desktop/types';
import { PROGRESS_LOADED_EVENT, STORAGE_KEYS, readText } from '../lib/storage';
import { downloadFile } from '../lib/browser';
import { useDismiss, useLatest } from '../lib/hooks';

export type { WallpaperTheme, WidgetId } from './desktop/types';

// The two heaviest widgets are closed by default, so load their code on first open.
const EventTrackerWidget = lazy(() =>
  import('./eventTracker/EventTrackerWidget').then((m) => ({ default: m.EventTrackerWidget }))
);
const DiceRollerWidget = lazy(() => import('./DiceRollerWidget').then((m) => ({ default: m.DiceRollerWidget })));

interface WidgetDef {
  title: string;
  icon: LucideIcon;
  tileClass: string;
  idleHint: string;
  Component: React.ComponentType<DesktopWidgetProps>;
}

const WIDGET_DEFS: Record<WidgetId, WidgetDef> = {
  'text-studio': {
    title: 'Text Editor',
    icon: FileText,
    tileClass: 'bg-black',
    idleHint: 'Revision Studio & proofread',
    Component: TextEditorWidget,
  },
  'event-tracker': {
    title: 'World Clock',
    icon: CalendarCheck2,
    tileClass: 'bg-emerald-600',
    idleHint: 'Track events by days, steps & points',
    Component: EventTrackerWidget,
  },
  'dice-roller': {
    title: 'Dice Roller',
    icon: Dices,
    tileClass: 'bg-violet-600',
    idleHint: 'Multi-dice & modifiers',
    Component: DiceRollerWidget,
  },
  scratchpad: {
    title: 'Quick Scratchpad',
    icon: StickyNote,
    tileClass: 'bg-amber-500',
    idleHint: 'Dismissed / Closed',
    Component: ScratchpadWidget,
  },
};

type Toast = { kind: 'save' | 'load'; text: string } | null;

const topZ = (widgets: WidgetsState) => Math.max(...WIDGET_IDS.map((id) => widgets[id].zIndex));

export const Desktop: React.FC = () => {
  const [wallpaper, setWallpaper] = useState<WallpaperTheme>('sand-mist');
  const [widgets, setWidgets] = useState<WidgetsState>(DEFAULT_WIDGETS);
  const [openMenu, setOpenMenu] = useState<'widgets' | 'wallpaper' | null>(null);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [modalMessage, setModalMessage] = useState<string | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState(() => readText(STORAGE_KEYS.lastSavedAt) || '');
  const [saveVersion, setSaveVersion] = useState(0);
  const [toast, setToast] = useState<Toast>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const widgetsMenuRef = useRef<HTMLDivElement>(null);
  const wallpaperMenuRef = useRef<HTMLDivElement>(null);
  const closeMenus = useCallback(() => setOpenMenu(null), []);
  useDismiss(openMenu === 'widgets', widgetsMenuRef, closeMenus);
  useDismiss(openMenu === 'wallpaper', wallpaperMenuRef, closeMenus);

  useEffect(() => () => clearTimeout(toastTimer.current), []);
  const showToast = useCallback((next: NonNullable<Toast>) => {
    clearTimeout(toastTimer.current);
    setToast(next);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  // --- Window management ----------------------------------------------------
  // All updaters are functional, so these callbacks never change identity and the
  // memoized widgets only re-render when their own window state changes.

  const bringToFront = useCallback((id: WidgetId) => {
    setWidgets((prev) => {
      const w = prev[id];
      const top = topZ(prev);
      if (w.isOpen && !w.isMinimized && w.zIndex === top) return prev; // already in front: no re-render
      return { ...prev, [id]: { isOpen: true, isMinimized: false, zIndex: w.zIndex === top ? top : top + 1 } };
    });
  }, []);

  const toggleMinimize = useCallback((id: WidgetId) => {
    setWidgets((prev) => {
      const w = prev[id];
      if (w.isMinimized) return { ...prev, [id]: { ...w, isMinimized: false, zIndex: topZ(prev) + 1 } };
      return { ...prev, [id]: { ...w, isMinimized: true } };
    });
  }, []);

  const closeWidget = useCallback((id: WidgetId) => {
    setWidgets((prev) => ({ ...prev, [id]: { ...prev[id], isOpen: false } }));
  }, []);

  const openWidget = (id: WidgetId) => {
    bringToFront(id);
    setOpenMenu(null);
  };

  const handlers = useMemo(
    () =>
      Object.fromEntries(
        WIDGET_IDS.map((id) => [
          id,
          {
            onFocus: () => bringToFront(id),
            onMinimize: () => toggleMinimize(id),
            onClose: () => closeWidget(id),
          },
        ])
      ) as Record<WidgetId, Pick<DesktopWidgetProps, 'onFocus' | 'onMinimize' | 'onClose'>>,
    [bringToFront, toggleMinimize, closeWidget]
  );

  // --- Save & load ----------------------------------------------------------

  const handleSave = () => {
    const snapshot = buildSnapshot(wallpaper, widgets);
    if (saveSnapshotToBrowser(snapshot)) {
      setLastSavedTime(snapshot.savedAtFormatted);
      setSaveVersion((v) => v + 1);
      showToast({ kind: 'save', text: 'Workstation progress saved! All widgets, events, notes and texts are secure.' });
    } else {
      setModalMessage('Saving failed: browser storage is full or blocked. Try downloading a .json backup instead.');
      setShowLoadModal(true);
    }
  };

  // Ctrl+S / Cmd+S saves from anywhere. Registered once; always calls the latest handler.
  const saveRef = useLatest(handleSave);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveRef.current();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [saveRef]);

  const restoreSnapshot = (snapshot: unknown, errorMessage: string) => {
    try {
      const restored = applySnapshotToStorage(snapshot);
      if (restored.wallpaper) setWallpaper(restored.wallpaper);
      if (restored.widgets) setWidgets(restored.widgets);
      window.dispatchEvent(new Event(PROGRESS_LOADED_EVENT));
      setShowLoadModal(false);
      setModalMessage(null);
      showToast({ kind: 'load', text: 'Workstation progress loaded successfully!' });
    } catch (err) {
      console.error('Failed to apply progress snapshot:', err);
      setModalMessage(errorMessage);
    }
  };

  const handleRestoreSaved = () => {
    const saved = readSavedSnapshot();
    if (saved === undefined) {
      setModalMessage('No saved workstation progress found in this browser yet. Use "Save" first.');
      return;
    }
    restoreSnapshot(saved, 'Failed to parse saved workstation progress.');
  };

  const handleDownloadBackup = () => {
    const snapshot = buildSnapshot(wallpaper, widgets);
    downloadFile(
      JSON.stringify(snapshot, null, 2),
      `workstation-progress-${new Date().toISOString().slice(0, 10)}.json`,
      'application/json'
    );
  };

  const handleImportFile = async (file: File) => {
    const invalid = 'Invalid backup file. Please select a valid Workstation progress JSON file.';
    try {
      restoreSnapshot(JSON.parse(await file.text()), invalid);
    } catch {
      setModalMessage(invalid);
    }
  };

  const closeModal = useCallback(() => {
    setShowLoadModal(false);
    setModalMessage(null);
  }, []);

  // --- Render -----------------------------------------------------------------

  const wallpaperClass = (WALLPAPERS.find((w) => w.id === wallpaper) ?? WALLPAPERS[0]).background;
  const openIds = WIDGET_IDS.filter((id) => widgets[id].isOpen);

  return (
    <div
      className={`relative w-screen h-screen overflow-hidden select-none font-sans transition-colors duration-500 ${wallpaperClass}`}
    >
      {/* Top menu bar */}
      <header className="absolute top-0 left-0 right-0 h-8 bg-white/40 backdrop-blur-2xl border-b border-black/5 z-40 flex items-center justify-between px-3.5 text-xs text-neutral-800 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold">
            <span className="text-sm">{''}</span>
            <span className="font-semibold text-neutral-900 tracking-tight">Workstation</span>
          </div>

          <div className="w-px h-3.5 bg-black/10 mx-0.5" />

          {/* Widget launcher */}
          <div className="relative" ref={widgetsMenuRef}>
            <button
              onClick={() => setOpenMenu((m) => (m === 'widgets' ? null : 'widgets'))}
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-black/10 hover:bg-black/20 text-neutral-900 transition-all text-[11px] font-medium"
              title="Open or pull up desktop widgets"
              aria-expanded={openMenu === 'widgets'}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-neutral-800" />
              <ChevronDown className="w-2.5 h-2.5 text-neutral-600" />
            </button>

            {openMenu === 'widgets' && (
              <div className="absolute top-full left-0 mt-1.5 w-76 bg-white/95 backdrop-blur-2xl border border-neutral-200/90 shadow-2xl rounded-2xl p-2 z-50 text-xs">
                <div className="px-2 py-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Desktop Widgets</span>
                  <button onClick={closeMenus} className="text-neutral-400 hover:text-black px-1" aria-label="Close menu">
                    <X className="w-3 h-3" />
                  </button>
                </div>

                <div className="space-y-1 mt-1">
                  {WIDGET_IDS.map((id) => {
                    const def = WIDGET_DEFS[id];
                    const state = widgets[id];
                    const Icon = def.icon;
                    const status = state.isOpen
                      ? state.isMinimized
                        ? 'Minimized in dock'
                        : 'Active on screen'
                      : def.idleHint;
                    return (
                      <div
                        key={id}
                        className="p-2 rounded-xl hover:bg-neutral-100/90 transition-colors flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-lg ${def.tileClass} text-white flex items-center justify-center shrink-0 shadow-2xs`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="font-semibold text-neutral-900 leading-tight">{def.title}</div>
                            <div className="text-[10px] text-neutral-500">{status}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => openWidget(id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                            state.isOpen && !state.isMinimized
                              ? 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                              : 'bg-black text-white hover:bg-neutral-800 shadow-2xs'
                          }`}
                        >
                          {state.isOpen ? 'Focus' : 'Open'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="w-px h-3.5 bg-black/10 mx-0.5" />

          {/* Save & load */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleSave}
              className="p-1 rounded-md hover:bg-black/10 transition-colors text-neutral-700 hover:text-neutral-900 cursor-pointer"
              title={
                lastSavedTime
                  ? `Save Workstation (Ctrl+S / Cmd+S) • Last saved ${lastSavedTime}`
                  : 'Save Workstation (Ctrl+S / Cmd+S)'
              }
              aria-label="Save Workstation"
            >
              <Save className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setShowLoadModal(true);
                setOpenMenu(null);
                setModalMessage(null);
              }}
              className="p-1 rounded-md hover:bg-black/10 transition-colors text-neutral-700 hover:text-neutral-900 cursor-pointer"
              title="Load / Restore Workstation Progress"
              aria-label="Load Workstation"
            >
              <FolderDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-neutral-800">
          {/* Wallpaper picker */}
          <div className="relative" ref={wallpaperMenuRef}>
            <button
              onClick={() => setOpenMenu((m) => (m === 'wallpaper' ? null : 'wallpaper'))}
              className="p-1 rounded-md hover:bg-black/10 transition-colors text-neutral-700"
              title="Change Desktop Wallpaper"
              aria-expanded={openMenu === 'wallpaper'}
            >
              <Palette className="w-3.5 h-3.5" />
            </button>

            {openMenu === 'wallpaper' && (
              <div className="absolute top-full right-0 mt-1.5 w-52 bg-white/95 backdrop-blur-2xl border border-neutral-200/90 shadow-2xl rounded-2xl p-2.5 z-50 text-xs">
                <div className="font-semibold text-neutral-700 pb-1.5 mb-1.5 border-b border-neutral-100 text-[11px]">
                  Desktop Wallpaper
                </div>
                <div className="space-y-1">
                  {WALLPAPERS.map((w) => (
                    <button
                      key={w.id}
                      onClick={() => {
                        setWallpaper(w.id);
                        setOpenMenu(null);
                      }}
                      className={`w-full text-left p-1.5 rounded-lg flex items-center gap-2 ${
                        wallpaper === w.id ? 'bg-neutral-900 text-white font-medium' : 'hover:bg-neutral-100'
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded-full ${w.swatch} border border-black/20`} />
                      <span>{w.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <span className="hidden sm:flex items-center gap-1 font-mono text-[10px]">
            <Battery className="w-3.5 h-3.5 text-neutral-700" />
            100%
          </span>
          <Wifi className="w-3.5 h-3.5 text-neutral-700" />
          <MenuBarClock />
        </div>
      </header>

      {/* Widget windows */}
      <Suspense fallback={null}>
        {openIds.map((id) => {
          const { Component } = WIDGET_DEFS[id];
          return (
            <Component
              key={id}
              isMinimized={widgets[id].isMinimized}
              zIndex={widgets[id].zIndex}
              {...handlers[id]}
            />
          );
        })}
      </Suspense>

      {/* Dock: only open widgets */}
      <div className="absolute bottom-3 left-0 right-0 flex justify-center z-40 pointer-events-none">
        <div className="pointer-events-auto backdrop-blur-2xl bg-white/40 border border-white/60 shadow-2xl rounded-2xl p-2 flex items-center gap-3 transition-all hover:bg-white/50">
          {openIds.length === 0 ? (
            <button
              onClick={() => openWidget('text-studio')}
              className="w-11 h-11 rounded-xl bg-black/10 hover:bg-black/20 text-neutral-700 flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-2xs"
              title="Open Text Editor"
            >
              <Plus className="w-5 h-5" />
            </button>
          ) : (
            openIds.map((id) => {
              const def = WIDGET_DEFS[id];
              const Icon = def.icon;
              const minimized = widgets[id].isMinimized;
              return (
                <div key={id} className="relative group flex flex-col items-center">
                  <div className="absolute -top-8 px-2 py-1 bg-black/90 text-white text-[10px] font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-md">
                    {def.title} {minimized ? '(Minimized)' : ''}
                  </div>
                  <button
                    onClick={() => toggleMinimize(id)}
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-sm transition-all duration-150 hover:scale-115 active:scale-95 ${
                      def.tileClass
                    } text-white ${minimized ? 'opacity-65 ring-2 ring-amber-400/50' : 'opacity-100'}`}
                    title={def.title}
                    aria-label={`${minimized ? 'Restore' : 'Minimize'} ${def.title}`}
                  >
                    <Icon className="w-5 h-5 text-white" />
                  </button>
                  <span
                    className={`mt-1 w-1 h-1 rounded-full transition-all ${
                      minimized ? 'bg-amber-500 scale-125' : 'bg-black'
                    }`}
                  />
                </div>
              );
            })
          )}
        </div>
      </div>

      {toast && (
        <div
          role="status"
          className="fixed top-11 left-1/2 -translate-x-1/2 z-50 bg-neutral-900/95 text-white backdrop-blur-md px-4 py-2 rounded-xl text-xs font-semibold shadow-2xl flex items-center gap-2 border border-white/10"
        >
          <Check className={`w-4 h-4 stroke-[3] ${toast.kind === 'save' ? 'text-emerald-400' : 'text-sky-400'}`} />
          <span>{toast.text}</span>
        </div>
      )}

      {showLoadModal && (
        <SaveLoadModal
          saveVersion={saveVersion}
          message={modalMessage}
          onDismissMessage={() => setModalMessage(null)}
          onClose={closeModal}
          onSave={handleSave}
          onRestoreSaved={handleRestoreSaved}
          onDownload={handleDownloadBackup}
          onImportFile={handleImportFile}
        />
      )}
    </div>
  );
};
