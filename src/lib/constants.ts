import { hueFromString } from './format';

/** The playlist loaded on first run. */
export const DEFAULT_PLAYLIST_URL = 'https://iptv-org.github.io/iptv/index.m3u';

/** iptv-org public JSON API base (CORS-open) used for enrichment. */
export const IPTV_ORG_API = 'https://iptv-org.github.io/api';

/** Default address of the optional bundled stream proxy (server/proxy.mjs). */
export const DEFAULT_PROXY_URL = 'http://localhost:8788';

/** Cache lifetimes. */
export const PLAYLIST_TTL_MS = 6 * 60 * 60 * 1000; // 6h
export const ENRICH_TTL_MS = 24 * 60 * 60 * 1000; // 24h
export const EPG_TTL_MS = 60 * 60 * 1000; // 1h — program guide goes stale fast

/**
 * Category swatch — a single small marker color in the category facet list.
 *
 * Deliberately a uniformly DESATURATED, deterministic ramp (low saturation) so
 * it reads as a quiet wayfinding marker, never a second brand color and never
 * close to the saturated health hues (alive/geo/dead/proxy) or the red accent.
 */
export function categorySwatch(name: string): string {
  return `hsl(${hueFromString(name.toLowerCase())} 18% 50%)`;
}

/** Keyboard shortcut map, used by the help dialog and as documentation. */
export const KEYMAP: { keys: string[]; label: string }[] = [
  { keys: ['↑', '↓'], label: 'Zap to previous / next channel' },
  { keys: ['Enter'], label: 'Play selected channel' },
  { keys: ['Space'], label: 'Play / pause' },
  { keys: ['0–9'], label: 'Jump to channel number' },
  { keys: ['M'], label: 'Mute / unmute' },
  { keys: ['F'], label: 'Fullscreen' },
  { keys: ['P'], label: 'Picture-in-picture' },
  { keys: ['L', 'S'], label: 'Favorite the playing channel' },
  { keys: ['/'], label: 'Focus search' },
  { keys: ['⌘', 'K'], label: 'Command palette' },
  { keys: ['C'], label: 'Toggle cinema mode' },
  { keys: ['G'], label: 'Toggle list / grid' },
  { keys: ['?'], label: 'Keyboard shortcuts' },
  { keys: ['Esc'], label: 'Exit overlay / cinema / fullscreen' },
];
