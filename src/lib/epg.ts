import type { Channel, NowNext, Programme } from '@/types';

/**
 * The EPG key for a channel = its full tvg-id. XMLTV `<channel id>` matches the
 * m3u tvg-id verbatim, INCLUDING any "@quality" feed suffix (e.g. "AlJazeera.qa@English").
 */
export function epgKey(channel: Channel): string | undefined {
  return channel.tvgId || undefined;
}

/** Resolve the current + next programme (and elapsed fraction) at time `t`. */
export function nowNext(programmes: Programme[] | undefined, t: number): NowNext {
  if (!programmes || programmes.length === 0) return { progress: 0 };
  let now: Programme | undefined;
  let next: Programme | undefined;
  for (let i = 0; i < programmes.length; i++) {
    const p = programmes[i];
    if (p.start <= t && t < p.stop) {
      now = p;
      next = programmes[i + 1];
      break;
    }
    if (p.start > t) {
      next = p;
      break;
    }
  }
  const progress = now ? Math.min(1, Math.max(0, (t - now.start) / (now.stop - now.start))) : 0;
  return { now, next, progress };
}

/** Short HH:MM time label (local) for a programme boundary. */
export function clock(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
