import React, { useEffect, useState } from 'react';

const clockFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/**
 * The menu bar clock lives in its own component and only ticks when the
 * displayed minute changes. Previously the whole Desktop (and every open
 * widget under it) re-rendered once per second to update this text.
 */
export const MenuBarClock: React.FC = () => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const scheduleNextTick = () => {
      const msToNextMinute = 60_000 - (Date.now() % 60_000) + 50;
      timer = setTimeout(() => {
        setNow(new Date());
        scheduleNextTick();
      }, msToNextMinute);
    };
    scheduleNextTick();
    // Timers are throttled in background tabs, so refresh when the tab returns.
    const onVisible = () => document.visibilityState === 'visible' && setNow(new Date());
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return <span className="font-medium font-mono text-[11px] text-neutral-900 ml-1">{clockFormatter.format(now)}</span>;
};
