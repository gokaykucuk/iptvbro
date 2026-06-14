import type { Catalog } from '@/types';
import { parseM3U } from './m3uParser';
import { buildCatalog } from './catalog';
import { idbGetFresh, idbSetFresh } from './idb';
import { PLAYLIST_TTL_MS } from './constants';

/** Fetch + parse + cache a playlist URL into a query-ready Catalog. */
export async function loadPlaylistFromUrl(url: string, force = false): Promise<Catalog> {
  const cacheKey = `playlist:${url}`;
  if (!force) {
    const cached = await idbGetFresh<string>(cacheKey, PLAYLIST_TTL_MS);
    if (cached) return buildCatalog(parseM3U(cached, url));
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch playlist (HTTP ${res.status})`);
  const text = await res.text();
  if (!text.includes('#EXTINF') && !text.includes('#EXTM3U')) {
    throw new Error('That URL does not look like an M3U playlist.');
  }
  await idbSetFresh(cacheKey, text);
  return buildCatalog(parseM3U(text, url));
}

/** Parse raw M3U text (e.g. an uploaded file) into a Catalog. */
export function loadPlaylistFromText(text: string, source: string): Catalog {
  return buildCatalog(parseM3U(text, source));
}
