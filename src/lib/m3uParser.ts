import type { Channel, Playlist } from '@/types';

/**
 * A fast, tolerant M3U / M3U8 (extended) playlist parser tuned for the kinds of
 * playlists distributed by iptv-org and similar projects.
 *
 * It understands:
 *   - `#EXTM3U` header attributes (e.g. `x-tvg-url` for the EPG guide)
 *   - `#EXTINF:` lines with quoted attributes (tvg-id, tvg-logo, group-title,
 *     http-referrer, http-user-agent, ...) and a trailing display name
 *   - `#EXTVLCOPT:` option lines (http-referrer / http-user-agent)
 *   - `#EXTGRP:` group lines
 * and derives country, category, resolution, quality and status tags from the
 * conventions iptv-org uses (e.g. tvg-id="Name.us@HD", names like
 * "Channel (1080p) [Geo-blocked]").
 */

const ATTR_RE = /([a-zA-Z0-9_-]+)="([^"]*)"/g;
const RESOLUTION_RE = /\((\d{3,4}[pi]|4K|8K|UHD|FHD|HD|SD)\)/i;
const TAG_RE = /\[([^\]]+)\]/g;

function parseAttributes(line: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  let m: RegExpExecArray | null;
  ATTR_RE.lastIndex = 0;
  while ((m = ATTR_RE.exec(line)) !== null) {
    attrs[m[1].toLowerCase()] = m[2];
  }
  return attrs;
}

/** Extract the human display name from an #EXTINF line (the part after the final attribute/duration). */
function extractName(line: string): string {
  const lastQuote = line.lastIndexOf('"');
  const searchFrom = lastQuote >= 0 ? lastQuote : line.indexOf(':');
  const comma = line.indexOf(',', searchFrom);
  if (comma === -1) return '';
  return line.slice(comma + 1).trim();
}

/** ISO 3166-1 alpha-2 code from a tvg-id like "1Plus1International.ua@SD" -> "ua". */
function countryFromTvgId(tvgId?: string): string | undefined {
  if (!tvgId) return undefined;
  const base = tvgId.split('@')[0];
  const dot = base.lastIndexOf('.');
  if (dot === -1) return undefined;
  const cc = base.slice(dot + 1);
  return /^[a-zA-Z]{2}$/.test(cc) ? cc.toLowerCase() : undefined;
}

/** Quality tag ("SD" | "HD" | ...) from the tvg-id "@" suffix. */
function qualityFromTvgId(tvgId?: string): string | undefined {
  if (!tvgId || !tvgId.includes('@')) return undefined;
  const q = tvgId.split('@')[1]?.trim();
  return q || undefined;
}

function deriveResolution(name: string): string | undefined {
  const m = name.match(RESOLUTION_RE);
  return m ? m[1].toLowerCase().replace('4k', '4K').replace('8k', '8K') : undefined;
}

function deriveTags(name: string): string[] {
  const tags: string[] = [];
  let m: RegExpExecArray | null;
  TAG_RE.lastIndex = 0;
  while ((m = TAG_RE.exec(name)) !== null) tags.push(m[1].trim());
  return tags;
}

function cleanDisplayName(name: string): string {
  return name
    .replace(TAG_RE, '')
    .replace(/\((?:\d{3,4}[pi]|4K|8K|UHD|FHD|HD|SD)\)/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function splitGroups(groupTitle?: string): string[] {
  if (!groupTitle) return ['Uncategorized'];
  const groups = groupTitle
    .split(';')
    .map((g) => g.trim())
    .filter(Boolean);
  return groups.length ? groups : ['Uncategorized'];
}

interface PendingEntry {
  attrs: Record<string, string>;
  name: string;
  vlcReferrer?: string;
  vlcUserAgent?: string;
}

/**
 * Parse extended M3U text into a {@link Playlist}.
 *
 * @param text   Raw playlist contents.
 * @param source Where it came from (url, "file:<name>", "demo") — stored for reference.
 */
export function parseM3U(text: string, source: string): Playlist {
  const lines = text.split(/\r?\n/);
  const channels: Channel[] = [];
  const seenIds = new Set<string>();

  let epgUrl: string | undefined;
  let title: string | undefined;
  let pending: PendingEntry | null = null;

  for (let raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith('#EXTM3U')) {
      const headerAttrs = parseAttributes(line);
      epgUrl = headerAttrs['x-tvg-url'] || headerAttrs['url-tvg'] || epgUrl;
      title = headerAttrs['name'] || title;
      continue;
    }

    if (line.startsWith('#EXTINF')) {
      const attrs = parseAttributes(line);
      pending = { attrs, name: extractName(line) };
      continue;
    }

    if (line.startsWith('#EXTVLCOPT')) {
      if (!pending) continue;
      const opt = line.slice('#EXTVLCOPT:'.length);
      const eq = opt.indexOf('=');
      if (eq === -1) continue;
      const key = opt.slice(0, eq).trim().toLowerCase();
      const value = opt.slice(eq + 1).trim();
      if (key === 'http-referrer') pending.vlcReferrer = value;
      else if (key === 'http-user-agent') pending.vlcUserAgent = value;
      continue;
    }

    if (line.startsWith('#EXTGRP')) {
      if (pending) pending.attrs['group-title'] ||= line.slice('#EXTGRP:'.length).trim();
      continue;
    }

    // Any other comment line — ignore.
    if (line.startsWith('#')) continue;

    // A non-comment line is a stream URL; pair it with the pending #EXTINF (if any).
    const url = line;
    const attrs = pending?.attrs ?? {};
    const rawName = pending?.name || attrs['tvg-name'] || 'Unknown Channel';
    const tvgId = attrs['tvg-id'] || undefined;

    let id = tvgId && tvgId.length ? tvgId : url;
    if (seenIds.has(id)) {
      let n = 2;
      while (seenIds.has(`${id}__${n}`)) n++;
      id = `${id}__${n}`;
    }
    seenIds.add(id);

    const tags = deriveTags(rawName);
    const httpReferrer = attrs['http-referrer'] || pending?.vlcReferrer || undefined;
    const httpUserAgent = attrs['http-user-agent'] || pending?.vlcUserAgent || undefined;

    const channel: Channel = {
      id,
      name: rawName,
      cleanName: cleanDisplayName(rawName),
      url,
      logo: attrs['tvg-logo'] || undefined,
      tvgId,
      group: splitGroups(attrs['group-title']),
      countryCode: countryFromTvgId(tvgId),
      resolution: deriveResolution(rawName),
      quality: qualityFromTvgId(tvgId) || deriveResolution(rawName)?.toUpperCase(),
      tags,
      geoBlocked: tags.some((t) => /geo[\s-]?block/i.test(t)),
      not247: tags.some((t) => /not\s?24\/?7/i.test(t)),
      httpReferrer,
      httpUserAgent,
      needsProxy: Boolean(httpReferrer || httpUserAgent),
    };

    channels.push(channel);
    pending = null;
  }

  return { title, epgUrl, channels, source };
}
