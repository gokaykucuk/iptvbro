import type { Catalog } from '@/types';

/** Channel id `delta` steps away in the filtered list, wrapping around the ends. */
export function neighborId(
  filtered: number[],
  catalog: Catalog,
  currentId: string | null,
  delta: number,
): string | null {
  const len = filtered.length;
  if (!len) return null;
  let pos = currentId ? filtered.findIndex((i) => catalog.channels[i].id === currentId) : -1;
  if (pos === -1) pos = delta > 0 ? -1 : 0;
  const next = (((pos + delta) % len) + len) % len;
  return catalog.channels[filtered[next]].id;
}

/** Position of a channel id within the filtered list, or -1. */
export function positionOfId(filtered: number[], catalog: Catalog, id: string | null): number {
  if (!id) return -1;
  return filtered.findIndex((i) => catalog.channels[i].id === id);
}
