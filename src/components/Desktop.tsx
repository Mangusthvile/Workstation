import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  StickyNote,
  Palette,
  LayoutGrid,
  Plus,
  Wifi,
  Battery,
  ChevronDown,
  Dices,
  CalendarCheck2,
  Save,
  FolderDown,
  Download,
  Upload,
  Check,
  FileJson,
  X,
  Clock,
} from 'lucide-react';
import { TextEditorWidget } from './TextEditorWidget';
import { ScratchpadWidget } from './ScratchpadWidget';
import { DiceRollerWidget } from './DiceRollerWidget';
import { EventTrackerWidget } from './EventTrackerWidget';

export type WallpaperTheme = 'sand-mist' | 'ocean-surf' | 'cyber-game' | 'studio-white';
export type WidgetId = 'text-studio' | 'event-tracker' | 'dice-roller' | 'scratchpad';

export const Desktop: React.FC = () => {
  const [wallpaper, setWallpaper] = useState<WallpaperTheme>('sand-mist');
  const [showWidgetsMenu, setShowWidgetsMenu] = useState<boolean>(false);
  const [showWallpaperPicker, setShowWallpaperPicker] = useState<boolean>(false);
  const [topZ, setTopZ] = useState<number>(30);
  const [currentTime, setCurrentTime] = useState<string>('');

  // Workstation Save & Load Progress State
  const [lastSavedTime, setLastSavedTime] = useState<string>(() => {
    try {
      return localStorage.getItem('WORKSTATION_LAST_SAVED_AT_V1') || '';
    } catch {
      return '';
    }
  });
  const [showLoadModal, setShowLoadModal] = useState<boolean>(false);
  const [modalMessage, setModalMessage] = useState<string | null>(null);
  const [showSaveToast, setShowSaveToast] = useState<boolean>(false);
  const [showLoadSuccessToast, setShowLoadSuccessToast] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);


  // Managed Widgets list (Text Editor is the first widget, Event Tracker is added)
  const [widgets, setWidgets] = useState<Record<WidgetId, { isOpen: boolean; isMinimized: boolean; zIndex: number }>>({
    'text-studio': { isOpen: true, isMinimized: false, zIndex: 30 },
    'event-tracker': { isOpen: false, isMinimized: false, zIndex: 29 },
    'dice-roller': { isOpen: false, isMinimized: false, zIndex: 28 },
    scratchpad: { isOpen: false, isMinimized: false, zIndex: 27 },
  });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const bringToFront = (id: WidgetId) => {
    const newZ = topZ + 1;
    setTopZ(newZ);
    setWidgets((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        zIndex: newZ,
        isMinimized: false,
      },
    }));
  };

  const openWidget = (id: WidgetId) => {
    const newZ = topZ + 1;
    setTopZ(newZ);
    setWidgets((prev) => ({
      ...prev,
      [id]: {
        isOpen: true,
        isMinimized: false,
        zIndex: newZ,
      },
    }));
    setShowWidgetsMenu(false);
  };

  const closeWidget = (id: WidgetId) => {
    setWidgets((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        isOpen: false,
      },
    }));
  };

  const toggleMinimizeWidget = (id: WidgetId) => {
    setWidgets((prev) => {
      const isCurrentlyMin = prev[id].isMinimized;
      const newZ = isCurrentlyMin ? topZ + 1 : prev[id].zIndex;
      if (isCurrentlyMin) setTopZ(newZ);
      return {
        ...prev,
        [id]: {
          ...prev[id],
          isMinimized: !isCurrentlyMin,
          zIndex: newZ,
        },
      };
    });
  };

  // --- Global Workstation Progress Save & Load System ---
  const getWorkstationSnapshot = () => {
    let worldClockEvents = [];
    let worldClockHistory = [];
    let worldClockTimelines = {};
    let textEditorText = '';
    let scratchpadText = '';
    let diceRollerData = { groups: [], history: [] };

    try {
      const rawEvents = localStorage.getItem('WORLD_CLOCK_EVENTS_V1');
      if (rawEvents) worldClockEvents = JSON.parse(rawEvents);
    } catch {}

    try {
      const rawHist = localStorage.getItem('WORLD_CLOCK_HISTORY_V1');
      if (rawHist) worldClockHistory = JSON.parse(rawHist);
    } catch {}

    try {
      const rawTimelines = localStorage.getItem('WORLD_CLOCK_COMPRESSED_TIMELINES_V1');
      if (rawTimelines) worldClockTimelines = JSON.parse(rawTimelines);
    } catch {}

    try {
      const rawText = localStorage.getItem('WORKSTATION_TEXT_EDITOR_TEXT_V1');
      if (rawText !== null) textEditorText = rawText;
    } catch {}

    try {
      const rawScratch = localStorage.getItem('WORKSTATION_SCRATCHPAD_TEXT_V1');
      if (rawScratch !== null) scratchpadText = rawScratch;
    } catch {}

    try {
      const rawDice = localStorage.getItem('WORKSTATION_DICE_ROLLER_V1');
      if (rawDice) diceRollerData = JSON.parse(rawDice);
    } catch {}

    const now = new Date();
    const timeFormatted = now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return {
      version: 1,
      savedAt: now.toISOString(),
      savedAtFormatted: timeFormatted,
      worldClock: {
        events: worldClockEvents,
        historyEvents: worldClockHistory,
        compressedTimelines: worldClockTimelines,
      },
      textEditor: {
        inputText: textEditorText,
      },
      scratchpad: {
        text: scratchpadText,
      },
      diceRoller: diceRollerData,
      desktop: {
        wallpaper,
        widgets,
      },
    };
  };

  const handleSaveProgress = () => {
    const snapshot = getWorkstationSnapshot();
    try {
      localStorage.setItem('WORKSTATION_FULL_PROGRESS_V1', JSON.stringify(snapshot));
      localStorage.setItem('WORKSTATION_LAST_SAVED_AT_V1', snapshot.savedAtFormatted);
      setLastSavedTime(snapshot.savedAtFormatted);
      setShowSaveToast(true);
      setTimeout(() => setShowSaveToast(false), 3000);
    } catch (e) {
      console.warn('Failed to save workstation progress:', e);
    }
  };

  // Global Ctrl+S / Cmd+S shortcut to save workstation progress
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveProgress();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [wallpaper, widgets]);

  const handleDownloadBackup = () => {
    const snapshot = getWorkstationSnapshot();
    const jsonStr = JSON.stringify(snapshot, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workstation-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const applySnapshot = (snapshot: any) => {
    try {
      if (snapshot.worldClock) {
        if (Array.isArray(snapshot.worldClock.events)) {
          localStorage.setItem('WORLD_CLOCK_EVENTS_V1', JSON.stringify(snapshot.worldClock.events));
          localStorage.setItem(
            'WORLD_CLOCK_USER_CUSTOM_EVENTS_PERMANENT',
            JSON.stringify(snapshot.worldClock.events)
          );
        }
        if (Array.isArray(snapshot.worldClock.historyEvents)) {
          localStorage.setItem(
            'WORLD_CLOCK_HISTORY_V1',
            JSON.stringify(snapshot.worldClock.historyEvents)
          );
        }
        if (snapshot.worldClock.compressedTimelines) {
          localStorage.setItem(
            'WORLD_CLOCK_COMPRESSED_TIMELINES_V1',
            JSON.stringify(snapshot.worldClock.compressedTimelines)
          );
        }
      }

      if (snapshot.textEditor?.inputText !== undefined) {
        localStorage.setItem('WORKSTATION_TEXT_EDITOR_TEXT_V1', snapshot.textEditor.inputText);
      }

      if (snapshot.scratchpad?.text !== undefined) {
        localStorage.setItem('WORKSTATION_SCRATCHPAD_TEXT_V1', snapshot.scratchpad.text);
      }

      if (snapshot.diceRoller) {
        localStorage.setItem('WORKSTATION_DICE_ROLLER_V1', JSON.stringify(snapshot.diceRoller));
      }

      if (snapshot.desktop) {
        if (snapshot.desktop.wallpaper) setWallpaper(snapshot.desktop.wallpaper as any);
        if (snapshot.desktop.widgets) setWidgets(snapshot.desktop.widgets as any);
      }

      // Notify all active widgets to update their states immediately
      window.dispatchEvent(new Event('workstation-progress-loaded'));

      setShowLoadModal(false);
      setShowLoadSuccessToast(true);
      setTimeout(() => setShowLoadSuccessToast(false), 3000);
    } catch (err) {
      console.error('Failed to apply progress snapshot:', err);
    }
  };

  const getSavedSnapshotSummary = () => {
    try {
      const saved = localStorage.getItem('WORKSTATION_FULL_PROGRESS_V1');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          savedAtFormatted: parsed.savedAtFormatted || parsed.savedAt || 'Recently saved',
          eventsCount: Array.isArray(parsed.worldClock?.events) ? parsed.worldClock.events.length : 0,
          historyCount: Array.isArray(parsed.worldClock?.historyEvents) ? parsed.worldClock.historyEvents.length : 0,
          textChars: typeof parsed.textEditor?.inputText === 'string' ? parsed.textEditor.inputText.length : 0,
          scratchpadChars: typeof parsed.scratchpad?.text === 'string' ? parsed.scratchpad.text.length : 0,
          diceGroupsCount: Array.isArray(parsed.diceRoller?.groups) ? parsed.diceRoller.groups.length : 0,
        };
      }
    } catch {}
    return null;
  };

  const handleLoadSavedProgress = () => {
    try {
      const saved = localStorage.getItem('WORKSTATION_FULL_PROGRESS_V1');
      if (saved) {
        const parsed = JSON.parse(saved);
        applySnapshot(parsed);
      } else {
        setModalMessage('No saved workstation progress found in this browser yet. Use "Save" first.');
      }
    } catch (err) {
      console.error('Failed to load saved progress:', err);
      setModalMessage('Failed to parse saved workstation progress.');
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (typeof parsed !== 'object' || parsed === null) {
          throw new Error('Invalid JSON');
        }
        applySnapshot(parsed);
      } catch {
        setModalMessage('Invalid backup file. Please select a valid Workstation progress JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Only currently open widgets appear in the bottom dock/taskbar
  const openWidgetsList: {
    id: WidgetId;
    title: string;
    icon: any;
    bgColor: string;
    iconColor: string;
    isMinimized: boolean;
  }[] = [];

  if (widgets['text-studio'].isOpen) {
    openWidgetsList.push({
      id: 'text-studio',
      title: 'Text Editor',
      icon: FileText,
      bgColor: 'bg-black text-white',
      iconColor: 'text-white',
      isMinimized: widgets['text-studio'].isMinimized,
    });
  }
  if (widgets['event-tracker'].isOpen) {
    openWidgetsList.push({
      id: 'event-tracker',
      title: 'World Clock',
      icon: CalendarCheck2,
      bgColor: 'bg-emerald-600 text-white',
      iconColor: 'text-white',
      isMinimized: widgets['event-tracker'].isMinimized,
    });
  }
  if (widgets['dice-roller'].isOpen) {
    openWidgetsList.push({
      id: 'dice-roller',
      title: 'Dice Roller',
      icon: Dices,
      bgColor: 'bg-violet-600 text-white',
      iconColor: 'text-white',
      isMinimized: widgets['dice-roller'].isMinimized,
    });
  }
  if (widgets.scratchpad.isOpen) {
    openWidgetsList.push({
      id: 'scratchpad',
      title: 'Quick Scratchpad',
      icon: StickyNote,
      bgColor: 'bg-amber-500 text-white',
      iconColor: 'text-white',
      isMinimized: widgets.scratchpad.isMinimized,
    });
  }

  // Background styling
  const getWallpaperClasses = () => {
    switch (wallpaper) {
      case 'sand-mist':
        return 'bg-gradient-to-br from-[#dfd7cc] via-[#eae5df] to-[#c9c0b5]';
      case 'ocean-surf':
        return 'bg-gradient-to-br from-[#0c3843] via-[#107080] to-[#5cb3b8]';
      case 'cyber-game':
        return 'bg-gradient-to-br from-[#0d091a] via-[#1a1233] to-[#2b1b4d]';
      case 'studio-white':
      default:
        return 'bg-gradient-to-br from-[#f8f9fa] via-[#e9ecef] to-[#dee2e6]';
    }
  };

  return (
    <div
      className={`relative w-screen h-screen overflow-hidden select-none font-sans transition-colors duration-500 ${getWallpaperClasses()}`}
    >
      {/* Top Menu Bar: Whole app is known as Workstation */}
      <header className="absolute top-0 left-0 right-0 h-8 bg-white/40 backdrop-blur-2xl border-b border-black/5 z-40 flex items-center justify-between px-3.5 text-xs text-neutral-800 shadow-2xs">
        {/* Left:  Workstation brand and Widget pull-up button */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold cursor-pointer">
            <span className="text-sm"></span>
            <span className="font-semibold text-neutral-900 tracking-tight">Workstation</span>
          </div>

          <div className="w-[1px] h-3.5 bg-black/10 mx-0.5"></div>

          {/* Icon-based Widget Launcher Button */}
          <div className="relative">
            <button
              onClick={() => {
                setShowWidgetsMenu(!showWidgetsMenu);
                setShowWallpaperPicker(false);
              }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-black/10 hover:bg-black/20 text-neutral-900 transition-all text-[11px] font-medium"
              title="Open or pull up desktop widgets"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-neutral-800" />
              <ChevronDown className="w-2.5 h-2.5 text-neutral-600" />
            </button>

            {/* Widgets Pull-Up Menu */}
            {showWidgetsMenu && (
              <div className="absolute top-full left-0 mt-1.5 w-76 bg-white/95 backdrop-blur-2xl border border-neutral-200/90 shadow-2xl rounded-2xl p-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2 py-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Desktop Widgets</span>
                  <button
                    onClick={() => setShowWidgetsMenu(false)}
                    className="text-neutral-400 hover:text-black font-semibold px-1"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-1 mt-1">
                  {/* First Widget: Text Editor */}
                  <div className="p-2 rounded-xl hover:bg-neutral-100/90 transition-colors flex items-center justify-between group">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-black text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-semibold text-neutral-900 leading-tight">
                          Text Editor
                        </div>
                        <div className="text-[10px] text-neutral-500">
                          {widgets['text-studio'].isOpen
                            ? widgets['text-studio'].isMinimized
                              ? 'Minimized in dock'
                              : 'Active on screen'
                            : 'Revision Studio & proofread'}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => openWidget('text-studio')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        widgets['text-studio'].isOpen && !widgets['text-studio'].isMinimized
                          ? 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                          : 'bg-black text-white hover:bg-neutral-800 shadow-2xs'
                      }`}
                    >
                      {widgets['text-studio'].isOpen ? 'Focus' : 'Open'}
                    </button>
                  </div>

                  {/* Event Tracker Widget */}
                  <div className="p-2 rounded-xl hover:bg-neutral-100/90 transition-colors flex items-center justify-between group">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                        <CalendarCheck2 className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-semibold text-neutral-900 leading-tight">
                          World Clock
                        </div>
                        <div className="text-[10px] text-neutral-500">
                          {widgets['event-tracker'].isOpen
                            ? widgets['event-tracker'].isMinimized
                              ? 'Minimized in dock'
                              : 'Active on screen'
                            : 'Track events by days, steps & points'}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => openWidget('event-tracker')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        widgets['event-tracker'].isOpen && !widgets['event-tracker'].isMinimized
                          ? 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                          : 'bg-black text-white hover:bg-neutral-800 shadow-2xs'
                      }`}
                    >
                      {widgets['event-tracker'].isOpen ? 'Focus' : 'Open'}
                    </button>
                  </div>

                  {/* Dice Roller Widget */}
                  <div className="p-2 rounded-xl hover:bg-neutral-100/90 transition-colors flex items-center justify-between group">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-violet-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                        <Dices className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-semibold text-neutral-900 leading-tight">
                          Dice Roller
                        </div>
                        <div className="text-[10px] text-neutral-500">
                          {widgets['dice-roller'].isOpen
                            ? widgets['dice-roller'].isMinimized
                              ? 'Minimized in dock'
                              : 'Active on screen'
                            : 'Multi-dice & modifiers'}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => openWidget('dice-roller')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        widgets['dice-roller'].isOpen && !widgets['dice-roller'].isMinimized
                          ? 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                          : 'bg-black text-white hover:bg-neutral-800 shadow-2xs'
                      }`}
                    >
                      {widgets['dice-roller'].isOpen ? 'Focus' : 'Open'}
                    </button>
                  </div>

                  {/* Quick Scratchpad Widget */}
                  <div className="p-2 rounded-xl hover:bg-neutral-100/90 transition-colors flex items-center justify-between group">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                        <StickyNote className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-semibold text-neutral-900 leading-tight">
                          Quick Scratchpad
                        </div>
                        <div className="text-[10px] text-neutral-500">
                          {widgets.scratchpad.isOpen
                            ? widgets.scratchpad.isMinimized
                              ? 'Minimized in dock'
                              : 'Active on screen'
                            : 'Dismissed / Closed'}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => openWidget('scratchpad')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        widgets.scratchpad.isOpen && !widgets.scratchpad.isMinimized
                          ? 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                          : 'bg-black text-white hover:bg-neutral-800 shadow-2xs'
                      }`}
                    >
                      {widgets.scratchpad.isOpen ? 'Focus' : 'Open'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="w-[1px] h-3.5 bg-black/10 mx-0.5"></div>

          {/* Workstation Save & Load Controls - Pure icons matching menu bar style with no text */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleSaveProgress}
              className="p-1 rounded-md hover:bg-black/10 transition-colors text-neutral-700 hover:text-neutral-900 cursor-pointer"
              title={lastSavedTime ? `Save Workstation (Ctrl+S / Cmd+S) • Last saved ${lastSavedTime}` : "Save Workstation (Ctrl+S / Cmd+S)"}
              aria-label="Save Workstation"
            >
              <Save className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => {
                setShowLoadModal(true);
                setShowWidgetsMenu(false);
                setShowWallpaperPicker(false);
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

        {/* Right: Original Style status indicators (Palette, Battery, Wifi, Time) */}
        <div className="flex items-center gap-3 text-[11px] text-neutral-800">
          {/* Desktop Wallpaper Switcher */}
          <div className="relative">
            <button
              onClick={() => {
                setShowWallpaperPicker(!showWallpaperPicker);
                setShowWidgetsMenu(false);
              }}
              className="p-1 rounded-md hover:bg-black/10 transition-colors text-neutral-700"
              title="Change Desktop Wallpaper"
            >
              <Palette className="w-3.5 h-3.5" />
            </button>

            {showWallpaperPicker && (
              <div className="absolute top-full right-0 mt-1.5 w-52 bg-white/95 backdrop-blur-2xl border border-neutral-200/90 shadow-2xl rounded-2xl p-2.5 z-50 text-xs">
                <div className="font-semibold text-neutral-700 pb-1.5 mb-1.5 border-b border-neutral-100 text-[11px]">
                  Desktop Wallpaper
                </div>
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      setWallpaper('sand-mist');
                      setShowWallpaperPicker(false);
                    }}
                    className={`w-full text-left p-1.5 rounded-lg flex items-center gap-2 ${
                      wallpaper === 'sand-mist' ? 'bg-neutral-900 text-white font-medium' : 'hover:bg-neutral-100'
                    }`}
                  >
                    <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-[#dfd7cc] to-[#eae5df] border border-black/20" />
                    <span>MacBook Sand</span>
                  </button>
                  <button
                    onClick={() => {
                      setWallpaper('ocean-surf');
                      setShowWallpaperPicker(false);
                    }}
                    className={`w-full text-left p-1.5 rounded-lg flex items-center gap-2 ${
                      wallpaper === 'ocean-surf' ? 'bg-neutral-900 text-white font-medium' : 'hover:bg-neutral-100'
                    }`}
                  >
                    <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-[#107080] to-[#5cb3b8] border border-black/20" />
                    <span>Ocean Surf Waves</span>
                  </button>
                  <button
                    onClick={() => {
                      setWallpaper('cyber-game');
                      setShowWallpaperPicker(false);
                    }}
                    className={`w-full text-left p-1.5 rounded-lg flex items-center gap-2 ${
                      wallpaper === 'cyber-game' ? 'bg-neutral-900 text-white font-medium' : 'hover:bg-neutral-100'
                    }`}
                  >
                    <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-[#1a1233] to-[#2b1b4d] border border-black/20" />
                    <span>Gamer Dark Neon</span>
                  </button>
                  <button
                    onClick={() => {
                      setWallpaper('studio-white');
                      setShowWallpaperPicker(false);
                    }}
                    className={`w-full text-left p-1.5 rounded-lg flex items-center gap-2 ${
                      wallpaper === 'studio-white' ? 'bg-neutral-900 text-white font-medium' : 'hover:bg-neutral-100'
                    }`}
                  >
                    <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-[#f8f9fa] to-[#dee2e6] border border-black/20" />
                    <span>Minimalist Studio</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Battery */}
          <span className="hidden sm:flex items-center gap-1 font-mono text-[10px]">
            <Battery className="w-3.5 h-3.5 text-neutral-700" />
            100%
          </span>

          {/* Wi-Fi */}
          <Wifi className="w-3.5 h-3.5 text-neutral-700" />

          {/* Clock */}
          <span className="font-medium font-mono text-[11px] text-neutral-900 ml-1">
            {currentTime}
          </span>
        </div>
      </header>

      {/* First Widget: Text Editor */}
      {widgets['text-studio'].isOpen && (
        <TextEditorWidget
          isMinimized={widgets['text-studio'].isMinimized}
          zIndex={widgets['text-studio'].zIndex}
          onFocus={() => bringToFront('text-studio')}
          onMinimize={() => toggleMinimizeWidget('text-studio')}
          onClose={() => closeWidget('text-studio')}
        />
      )}

      {/* Event Tracker Widget */}
      {widgets['event-tracker'].isOpen && (
        <EventTrackerWidget
          isMinimized={widgets['event-tracker'].isMinimized}
          zIndex={widgets['event-tracker'].zIndex}
          onFocus={() => bringToFront('event-tracker')}
          onMinimize={() => toggleMinimizeWidget('event-tracker')}
          onClose={() => closeWidget('event-tracker')}
        />
      )}

      {/* Dice Roller Widget */}
      {widgets['dice-roller'].isOpen && (
        <DiceRollerWidget
          isMinimized={widgets['dice-roller'].isMinimized}
          zIndex={widgets['dice-roller'].zIndex}
          onFocus={() => bringToFront('dice-roller')}
          onMinimize={() => toggleMinimizeWidget('dice-roller')}
          onClose={() => closeWidget('dice-roller')}
        />
      )}

      {/* Quick Scratchpad Widget */}
      {widgets.scratchpad.isOpen && (
        <ScratchpadWidget
          isMinimized={widgets.scratchpad.isMinimized}
          zIndex={widgets.scratchpad.zIndex}
          onFocus={() => bringToFront('scratchpad')}
          onMinimize={() => toggleMinimizeWidget('scratchpad')}
          onClose={() => closeWidget('scratchpad')}
        />
      )}

      {/* Bottom Dock / Taskbar - ONLY CURRENTLY OPEN WIDGETS */}
      <div className="absolute bottom-3 left-0 right-0 flex justify-center z-40 pointer-events-none">
        <div className="pointer-events-auto backdrop-blur-2xl bg-white/40 border border-white/60 shadow-2xl rounded-2xl p-2 flex items-center gap-3 transition-all hover:bg-white/50">
          {openWidgetsList.length === 0 ? (
            <button
              onClick={() => openWidget('text-studio')}
              className="w-11 h-11 rounded-xl bg-black/10 hover:bg-black/20 text-neutral-700 flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-2xs"
              title="Open Text Editor"
            >
              <Plus className="w-5 h-5" />
            </button>
          ) : (
            openWidgetsList.map((item) => {
              const IconComp = item.icon;
              return (
                <div key={item.id} className="relative group flex flex-col items-center">
                  {/* Tooltip on hover */}
                  <div className="absolute -top-8 px-2 py-1 bg-black/90 text-white text-[10px] font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-md">
                    {item.title} {item.isMinimized ? '(Minimized)' : ''}
                  </div>

                  {/* App Icon Button */}
                  <button
                    onClick={() => toggleMinimizeWidget(item.id)}
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-sm transition-all duration-150 hover:scale-115 active:scale-95 ${
                      item.bgColor
                    } ${item.isMinimized ? 'opacity-65 ring-2 ring-amber-400/50' : 'opacity-100'}`}
                    title={item.title}
                  >
                    <IconComp className={`w-5 h-5 ${item.iconColor}`} />
                  </button>

                  {/* Indicator dot underneath icon */}
                  <span
                    className={`mt-1 w-1 h-1 rounded-full transition-all ${
                      item.isMinimized ? 'bg-amber-500 scale-125' : 'bg-black'
                    }`}
                  />
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Hidden file input for importing workstation backup JSON */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleImportFile}
      />

      {/* Save Success Toast */}
      {showSaveToast && (
        <div className="fixed top-11 left-1/2 -translate-x-1/2 z-50 bg-neutral-900/95 text-white backdrop-blur-md px-4 py-2 rounded-xl text-xs font-semibold shadow-2xl flex items-center gap-2 border border-white/10 animate-in fade-in slide-in-from-top-2">
          <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
          <span>Workstation progress saved! All widgets, events, notes and texts are secure.</span>
        </div>
      )}

      {/* Load Success Toast */}
      {showLoadSuccessToast && (
        <div className="fixed top-11 left-1/2 -translate-x-1/2 z-50 bg-neutral-900/95 text-white backdrop-blur-md px-4 py-2 rounded-xl text-xs font-semibold shadow-2xl flex items-center gap-2 border border-white/10 animate-in fade-in slide-in-from-top-2">
          <Check className="w-4 h-4 text-sky-400 stroke-[3]" />
          <span>Workstation progress loaded successfully!</span>
        </div>
      )}

      {/* Modal: Save & Load Workstation Progress */}
      {showLoadModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white/95 backdrop-blur-2xl border border-neutral-200/90 shadow-2xl rounded-2xl max-w-lg w-full p-5 space-y-4 text-xs text-neutral-800">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-neutral-200/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center shadow-2xs">
                  <FolderDown className="w-4 h-4 text-sky-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">Workstation Save & Load</h3>
                  <p className="text-[11px] text-neutral-500">
                    Preserve, restore, and export progress across all workstation widgets
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowLoadModal(false);
                  setModalMessage(null);
                }}
                className="w-6 h-6 rounded-lg text-neutral-400 hover:text-black hover:bg-neutral-100 flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Error or Alert Message if any */}
            {modalMessage && (
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs flex items-center justify-between">
                <span>{modalMessage}</span>
                <button
                  onClick={() => setModalMessage(null)}
                  className="text-amber-700 hover:text-black font-bold ml-2"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Section 1: Browser Quick Checkpoint */}
            {(() => {
              const summary = getSavedSnapshotSummary();
              return (
                <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-neutral-900 text-xs flex items-center gap-1.5">
                      <Save className="w-3.5 h-3.5 text-neutral-600" />
                      Browser Saved Checkpoint
                    </span>
                    {summary ? (
                      <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                        Saved: {summary.savedAtFormatted}
                      </span>
                    ) : (
                      <span className="text-[10px] text-neutral-400 font-mono">None saved yet</span>
                    )}
                  </div>

                  {summary ? (
                    <>
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-600">
                        <div className="p-2 bg-white rounded-lg border border-neutral-200/60">
                          <span className="text-neutral-400 block text-[10px]">World Clock</span>
                          <span className="font-semibold text-neutral-800">
                            {summary.eventsCount} events, {summary.historyCount} completed
                          </span>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-neutral-200/60">
                          <span className="text-neutral-400 block text-[10px]">Text Editor</span>
                          <span className="font-semibold text-neutral-800">
                            {summary.textChars} characters
                          </span>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-neutral-200/60">
                          <span className="text-neutral-400 block text-[10px]">Quick Scratchpad</span>
                          <span className="font-semibold text-neutral-800">
                            {summary.scratchpadChars} characters
                          </span>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-neutral-200/60">
                          <span className="text-neutral-400 block text-[10px]">Dice Roller</span>
                          <span className="font-semibold text-neutral-800">
                            {summary.diceGroupsCount} groups saved
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={handleLoadSavedProgress}
                          className="flex-1 py-2 px-3 rounded-xl bg-black hover:bg-neutral-800 text-white font-semibold text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Restore This Checkpoint</span>
                        </button>
                        <button
                          onClick={handleSaveProgress}
                          className="py-2 px-3 rounded-xl bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          title="Overwrite browser checkpoint with current state"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Update Save</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-[11px] text-neutral-500">
                        No workstation checkpoint has been saved to your browser yet. Click below to save your current work right now.
                      </p>
                      <button
                        onClick={handleSaveProgress}
                        className="w-full py-2 px-3 rounded-xl bg-black hover:bg-neutral-800 text-white font-semibold text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Save Current Workstation Now (Ctrl+S)</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Section 2: Offline File Backup (.JSON) */}
            <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-neutral-900 text-xs flex items-center gap-1.5">
                  <FileJson className="w-3.5 h-3.5 text-neutral-600" />
                  JSON File Backup & Restore
                </span>
                <span className="text-[10px] text-neutral-400">Offline file</span>
              </div>
              <p className="text-[11px] text-neutral-500 leading-normal">
                Download a file to your device or load an existing backup. Backups preserve all documents, custom repeatable events, timeline milestones, scratchpad notes, and dice rolls.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={handleDownloadBackup}
                  className="py-2 px-3 rounded-xl bg-white hover:bg-neutral-100 text-neutral-800 font-semibold text-xs border border-neutral-200 transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Download Backup (.json)</span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="py-2 px-3 rounded-xl bg-white hover:bg-neutral-100 text-neutral-800 font-semibold text-xs border border-neutral-200 transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-sky-600" />
                  <span>Upload & Load (.json)</span>
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-neutral-100 text-[11px] text-neutral-400">
              <span>Tip: Press <kbd className="px-1.5 py-0.5 bg-neutral-100 border border-neutral-300 rounded text-[10px] text-neutral-700 font-mono">Ctrl+S</kbd> anytime to save</span>
              <button
                onClick={() => setShowLoadModal(false)}
                className="px-3 py-1 rounded-lg text-neutral-600 hover:text-black font-semibold hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
