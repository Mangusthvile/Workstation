import {
  STORAGE_KEYS,
  flushPendingWrites,
  readJSON,
  readText,
  writeJSON,
  writeText,
} from '../../lib/storage';
import {
  DEFAULT_WIDGETS,
  WALLPAPERS,
  WIDGET_IDS,
  type WallpaperTheme,
  type WidgetsState,
} from './types';

/**
 * Builds, applies, and summarizes full-workstation snapshots.
 * The JSON shape (version 1) is unchanged so older backup files still load.
 */

export interface WorkstationSnapshot {
  version: 1;
  savedAt: string;
  savedAtFormatted: string;
  worldClock: {
    events: unknown[];
    historyEvents: unknown[];
    compressedTimelines: Record<string, boolean>;
  };
  textEditor: { inputText: string };
  scratchpad: { text: string };
  diceRoller: { groups: unknown[]; history: unknown[] };
  desktop: { wallpaper: WallpaperTheme; widgets: WidgetsState };
}

const savedAtFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

export function buildSnapshot(wallpaper: WallpaperTheme, widgets: WidgetsState): WorkstationSnapshot {
  // Make sure every widget's latest edits have reached storage first.
  flushPendingWrites();

  const dice = readJSON(STORAGE_KEYS.diceRoller);
  const compressed = readJSON(STORAGE_KEYS.worldClockCompressed);
  const now = new Date();

  return {
    version: 1,
    savedAt: now.toISOString(),
    savedAtFormatted: savedAtFormatter.format(now),
    worldClock: {
      events: asArray(readJSON(STORAGE_KEYS.worldClockEvents)),
      historyEvents: asArray(readJSON(STORAGE_KEYS.worldClockHistory)),
      compressedTimelines: isRecord(compressed) ? (compressed as Record<string, boolean>) : {},
    },
    textEditor: { inputText: readText(STORAGE_KEYS.textEditor) ?? '' },
    scratchpad: { text: readText(STORAGE_KEYS.scratchpad) ?? '' },
    diceRoller: isRecord(dice)
      ? { groups: asArray(dice.groups), history: asArray(dice.history) }
      : { groups: [], history: [] },
    desktop: { wallpaper, widgets },
  };
}

export function saveSnapshotToBrowser(snapshot: WorkstationSnapshot): boolean {
  const ok = writeJSON(STORAGE_KEYS.fullProgress, snapshot);
  if (ok) writeText(STORAGE_KEYS.lastSavedAt, snapshot.savedAtFormatted);
  return ok;
}

export function readSavedSnapshot(): unknown {
  return readJSON(STORAGE_KEYS.fullProgress);
}

function sanitizeWidgets(raw: unknown): WidgetsState | undefined {
  if (!isRecord(raw)) return undefined;
  const result = { ...DEFAULT_WIDGETS };
  for (const id of WIDGET_IDS) {
    const w = raw[id];
    if (isRecord(w)) {
      result[id] = {
        isOpen: typeof w.isOpen === 'boolean' ? w.isOpen : DEFAULT_WIDGETS[id].isOpen,
        isMinimized: typeof w.isMinimized === 'boolean' ? w.isMinimized : false,
        zIndex: typeof w.zIndex === 'number' && Number.isFinite(w.zIndex) ? w.zIndex : DEFAULT_WIDGETS[id].zIndex,
      };
    }
  }
  return result;
}

/**
 * Writes a snapshot's widget data into storage and returns the desktop layout
 * it contained. Throws if the input is not a snapshot object.
 */
export function applySnapshotToStorage(snapshot: unknown): {
  wallpaper?: WallpaperTheme;
  widgets?: WidgetsState;
} {
  if (!isRecord(snapshot)) throw new Error('Not a Workstation snapshot');

  // Let any pending debounced writes land first so they cannot overwrite the restore.
  flushPendingWrites();

  const wc = snapshot.worldClock;
  if (isRecord(wc)) {
    if (Array.isArray(wc.events)) {
      writeJSON(STORAGE_KEYS.worldClockEvents, wc.events);
      writeJSON(STORAGE_KEYS.worldClockEventsBackup, wc.events);
    }
    if (Array.isArray(wc.historyEvents)) writeJSON(STORAGE_KEYS.worldClockHistory, wc.historyEvents);
    if (isRecord(wc.compressedTimelines)) writeJSON(STORAGE_KEYS.worldClockCompressed, wc.compressedTimelines);
  }

  const te = snapshot.textEditor;
  if (isRecord(te) && typeof te.inputText === 'string') writeText(STORAGE_KEYS.textEditor, te.inputText);

  const sp = snapshot.scratchpad;
  if (isRecord(sp) && typeof sp.text === 'string') writeText(STORAGE_KEYS.scratchpad, sp.text);

  if (isRecord(snapshot.diceRoller)) writeJSON(STORAGE_KEYS.diceRoller, snapshot.diceRoller);

  const desktop = isRecord(snapshot.desktop) ? snapshot.desktop : {};
  const wallpaper = WALLPAPERS.some((w) => w.id === desktop.wallpaper)
    ? (desktop.wallpaper as WallpaperTheme)
    : undefined;
  return { wallpaper, widgets: sanitizeWidgets(desktop.widgets) };
}

export interface SnapshotSummary {
  savedAtFormatted: string;
  eventsCount: number;
  historyCount: number;
  textChars: number;
  scratchpadChars: number;
  diceGroupsCount: number;
}

export function summarizeSnapshot(raw: unknown): SnapshotSummary | null {
  if (!isRecord(raw)) return null;
  const wc = isRecord(raw.worldClock) ? raw.worldClock : {};
  const te = isRecord(raw.textEditor) ? raw.textEditor : {};
  const sp = isRecord(raw.scratchpad) ? raw.scratchpad : {};
  const dr = isRecord(raw.diceRoller) ? raw.diceRoller : {};
  return {
    savedAtFormatted: String(raw.savedAtFormatted || raw.savedAt || 'Recently saved'),
    eventsCount: asArray(wc.events).length,
    historyCount: asArray(wc.historyEvents).length,
    textChars: typeof te.inputText === 'string' ? te.inputText.length : 0,
    scratchpadChars: typeof sp.text === 'string' ? sp.text.length : 0,
    diceGroupsCount: asArray(dr.groups).length,
  };
}
