/**
 * Core domain types for iptvbro.
 *
 * A `Channel` is a single playable entry parsed from an M3U playlist, enriched
 * with derived metadata (country, category, quality) and, when available,
 * iptv-org API metadata (country name, flag, languages, nsfw, lifecycle).
 */

export interface Channel {
  /** Stable unique identity for React keys & favorites. tvg-id when present, else stream url (deduped). */
  id: string;
  /** Raw display name from the playlist, e.g. "1+1 International (1080p) [Geo-blocked]". */
  name: string;
  /** Name with resolution/status tags stripped — used for search & sorting. */
  cleanName: string;
  /** The stream URL (usually an .m3u8 HLS manifest). */
  url: string;
  /** tvg-logo URL, if any. */
  logo?: string;
  /** Raw tvg-id attribute, if any. */
  tvgId?: string;
  /** Categories from group-title (split on ";"). Always at least one entry. */
  group: string[];
  /** ISO 3166-1 alpha-2 country code derived from tvg-id suffix (lowercase), if derivable. */
  countryCode?: string;
  /** Display resolution parsed from the name, e.g. "1080p", "720p", "4K". */
  resolution?: string;
  /** Quality tag from tvg-id "@" suffix or name, e.g. "SD", "HD". */
  quality?: string;
  /** Status tags parsed from the name, e.g. ["Geo-blocked", "Not 24/7"]. */
  tags: string[];
  /** Whether the name carried a [Geo-blocked] tag. */
  geoBlocked: boolean;
  /** Whether the name carried a [Not 24/7] tag. */
  not247: boolean;
  /** Required HTTP Referer for the stream (from attributes or #EXTVLCOPT). Needs proxy in-browser. */
  httpReferrer?: string;
  /** Required HTTP User-Agent for the stream (from attributes or #EXTVLCOPT). Needs proxy in-browser. */
  httpUserAgent?: string;
  /** True when the stream cannot play directly in a browser without the proxy (custom headers, or http on https). */
  needsProxy: boolean;

  // --- Optional enrichment from the iptv-org API (resolved by tvg-id) ---
  /** Human-readable country name. */
  countryName?: string;
  /** Country flag emoji. */
  countryFlag?: string;
  /** Language codes (ISO 639-3) the channel broadcasts in. */
  languageCodes?: string[];
  /** Human-readable language names. */
  languageNames?: string[];
  /** Adult content flag from channels.json. */
  nsfw?: boolean;
  /** Channel lifecycle: true when iptv-org marks the channel closed (pre-mark dead). */
  closed?: boolean;
}

export interface Playlist {
  /** Optional playlist title. */
  title?: string;
  /** EPG / XMLTV guide URL from the #EXTM3U `x-tvg-url` header, if present. */
  epgUrl?: string;
  /** All parsed channels, in source order. */
  channels: Channel[];
  /** Where this playlist came from: a URL, "file:<name>", or "demo". */
  source: string;
}

/** A facet value with its occurrence count, used to render filter lists. */
export interface Facet {
  /** The canonical value used for filtering (e.g. country code "ua", category "Sports"). */
  value: string;
  /** Display label (e.g. country name). */
  label: string;
  /** Decorative meta (flag emoji for countries, swatch hex for categories). */
  meta?: string;
  count: number;
}

/**
 * The normalized, query-optimized catalog built once from a parsed playlist.
 * Filtering produces index arrays (number[]) into `channels`, never new objects,
 * so list rows stay referentially stable.
 */
export interface Catalog {
  channels: Channel[];
  /** id -> index into channels[]. */
  byId: Map<string, number>;
  /** country code -> channel indices. */
  idxByCountry: Map<string, number[]>;
  /** category -> channel indices. */
  idxByCategory: Map<string, number[]>;
  /** language code -> channel indices. */
  idxByLanguage: Map<string, number[]>;
  /** Facet lists for the rail, sorted by count desc. */
  countries: Facet[];
  categories: Facet[];
  languages: Facet[];
  epgUrl?: string;
  source: string;
  /** Whether iptv-org enrichment has been merged in. */
  enriched: boolean;
  /** Whether the heavier channels.json (NSFW / closed) metadata has been merged in. */
  channelMetaApplied?: boolean;
}

export type HealthStatus = 'alive' | 'dead' | 'geo' | 'proxy' | 'unknown';

export interface HealthRecord {
  status: HealthStatus;
  checkedAt: number;
}

export type SortKey = 'az' | 'country' | 'quality' | 'working';
export type ViewKey = 'all' | 'favorites' | 'recents';
export type GridMode = 'list' | 'grid';
export type ThemeMode = 'dark' | 'light' | 'oled';

export type PlayState =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'buffering'
  | 'error';

/** The cause of a playback failure, used to pick the right designed error card. */
export type PlayerErrorKind =
  | 'network'
  | 'media'
  | 'cors'
  | 'mixed'
  | 'geo'
  | 'proxy'
  | 'dead'
  | 'unknown';

export interface PlayerError {
  kind: PlayerErrorKind;
  message: string;
}

export interface QualityLevel {
  index: number;
  height?: number;
  bitrate?: number;
  name?: string;
}

export interface RecentEntry {
  id: string;
  at: number;
}

/** A single EPG programme (XMLTV `<programme>`), times in epoch ms. */
export interface Programme {
  start: number;
  stop: number;
  title: string;
  desc?: string;
}

/** Resolved now/next for a channel at a given time. */
export interface NowNext {
  now?: Programme;
  next?: Programme;
  /** 0..1 elapsed fraction of the current programme. */
  progress: number;
}

export interface SavedPlaylist {
  id: string;
  name: string;
  url?: string;
  source: string;
}

export type ProxyPolicy = 'auto' | 'always';
