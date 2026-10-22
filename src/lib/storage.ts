/**
 * Central place for every localStorage key the Workstation uses, plus safe
 * read/write helpers and a debounced writer.
 *
 * Key names and value formats are unchanged from the original app so existing
 * browser saves and downloaded .json backups keep working.
 */

export const STORAGE_KEYS = {
  textEditor: 'WORKSTATION_TEXT_EDITOR_TEXT_V1',
  scratchpad: 'WORKSTATION_SCRATCHPAD_TEXT_V1',
  diceRoller: 'WORKSTATION_DICE_ROLLER_V1',
  fullProgress: 'WORKSTATION_FULL_PROGRESS_V1',
  lastSavedAt: 'WORKSTATION_LAST_SAVED_AT_V1',
  worldClockEvents: 'WORLD_CLOCK_EVENTS_V1',
  worldClockEventsBackup: 'WORLD_CLOCK_USER_CUSTOM_EVENTS_PERMANENT',
  worldClockHistory: 'WORLD_CLOCK_HISTORY_V1',
  worldClockCompressed: 'WORLD_CLOCK_COMPRESSED_TIMELINES_V1',
  worldClockBasePurged: 'WORLD_CLOCK_BASE_EVENTS_PURGED',
} as const;

/** Fired on window after a snapshot is restored so open widgets reload their state. */
export const PROGRESS_LOADED_EVENT = 'workstation-progress-loaded';

export function readText(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Parses JSON from storage. Returns undefined when missing or unreadable. */
export function readJSON(key: string): unknown {
  const raw = readText(key);
  if (raw === null) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

export function writeText(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    console.warn(`Could not save "${key}" to browser storage:`, err);
    return false;
  }
}

export function writeJSON(key: string, value: unknown): boolean {
  return writeText(key, JSON.stringify(value));
}

// ---------------------------------------------------------------------------
// Debounced writes
//
// Widgets used to call localStorage.setItem (and JSON.stringify their whole
// state) on every keystroke or click. Writes are now coalesced per key. Anything
// that reads storage directly (saving a snapshot, restoring one, leaving the
// page) calls flushPendingWrites() first so nothing is ever lost.
// ---------------------------------------------------------------------------

const pending = new Map<string, { timer: ReturnType<typeof setTimeout>; write: () => void }>();

export function scheduleWrite(key: string, write: () => void, delayMs = 300): void {
  const existing = pending.get(key);
  if (existing) clearTimeout(existing.timer);
  const timer = setTimeout(() => {
    pending.delete(key);
    write();
  }, delayMs);
  pending.set(key, { timer, write });
}

export function flushPendingWrites(): void {
  for (const [key, entry] of pending) {
    clearTimeout(entry.timer);
    pending.delete(key);
    entry.write();
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushPendingWrites);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushPendingWrites();
  });
}
