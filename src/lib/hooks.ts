import { useCallback, useEffect, useRef, useState } from 'react';
import { PROGRESS_LOADED_EVENT, scheduleWrite } from './storage';

/** Keeps a ref pointing at the latest value, for use inside stable callbacks. */
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

/** Runs `callback` whenever a workstation snapshot is restored. */
export function useOnProgressLoaded(callback: () => void) {
  const latest = useLatest(callback);
  useEffect(() => {
    const handler = () => latest.current();
    window.addEventListener(PROGRESS_LOADED_EVENT, handler);
    return () => window.removeEventListener(PROGRESS_LOADED_EVENT, handler);
  }, [latest]);
}

/** Writes `value` to storage (debounced) whenever it changes. */
export function usePersistedValue<T>(key: string, value: T, save: (value: T) => void, delayMs = 300) {
  const saveRef = useLatest(save);
  useEffect(() => {
    scheduleWrite(key, () => saveRef.current(value), delayMs);
  }, [key, value, delayMs, saveRef]);
}

/**
 * useState that loads from storage once, saves back with a debounce, and
 * reloads itself when a workstation snapshot is restored.
 */
export function usePersistentState<T>(
  key: string,
  load: () => T,
  save: (value: T) => void,
  delayMs = 300
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(load);
  usePersistedValue(key, value, save, delayMs);
  useOnProgressLoaded(() => setValue(load()));
  return [value, setValue];
}

/** Calls `onDismiss` when the user clicks outside `ref` or presses Escape while `open`. */
export function useDismiss(open: boolean, ref: React.RefObject<HTMLElement | null>, onDismiss: () => void) {
  const dismiss = useLatest(onDismiss);
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) dismiss.current();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && dismiss.current();
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, ref, dismiss]);
}

/**
 * A boolean (or id) that switches on and then resets itself after `ms`.
 * Used for "Copied!" feedback. The timer is cleared on unmount and when the
 * flag is triggered again.
 */
export function useTransientValue<T>(ms = 2000): [T | null, (value: T) => void] {
  const [value, setValue] = useState<T | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const trigger = useCallback(
    (next: T) => {
      clearTimeout(timer.current);
      setValue(next);
      timer.current = setTimeout(() => setValue(null), ms);
    },
    [ms]
  );
  return [value, trigger];
}
