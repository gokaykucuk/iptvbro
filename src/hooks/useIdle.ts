import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Tracks pointer/keyboard idleness. Returns `idle` (true after `ms` of no
 * activity) and a `wake()` to reset the timer (call it on mouse move over the
 * region whose chrome should recede).
 */
export function useIdle(ms = 2500): { idle: boolean; wake: () => void } {
  const [idle, setIdle] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const wake = useCallback(() => {
    setIdle(false);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setIdle(true), ms);
  }, [ms]);

  useEffect(() => {
    wake();
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [wake]);

  return { idle, wake };
}
