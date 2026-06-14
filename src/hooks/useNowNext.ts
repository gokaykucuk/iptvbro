import { useEffect, useMemo, useState } from 'react';
import type { Channel, NowNext } from '@/types';
import { useStore } from '@/store/useStore';
import { epgKey, nowNext } from '@/lib/epg';

const EMPTY: NowNext = { progress: 0 };

/** Live now/next programme for a channel, re-resolving as time advances. */
export function useNowNext(channel: Channel | null): NowNext {
  const epg = useStore((s) => s.epgByChannel);
  const epgVersion = useStore((s) => s.epgVersion);
  const [t, setT] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setT(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  return useMemo(() => {
    if (!channel) return EMPTY;
    const key = epgKey(channel);
    if (!key) return EMPTY;
    return nowNext(epg.get(key), t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, epg, epgVersion, t]);
}
