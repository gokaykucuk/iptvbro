import type {
  Catalog,
  Channel,
  Facet,
  HealthRecord,
  HealthStatus,
  Playlist,
  SortKey,
} from '@/types';
import { codeToFlag } from './format';
import { categorySwatch } from './constants';

/** The filterable criteria the UI maintains, in plain serializable form. */
export interface FilterCriteria {
  search: string;
  countries: string[];
  categories: string[];
  languages: string[];
  hideGeo: boolean;
  hide247: boolean;
  hdOnly: boolean;
  hideNsfw: boolean;
  workingOnly: boolean;
  sort: SortKey;
}

export type FacetAxis = 'country' | 'category' | 'language';

function pushIdx(map: Map<string, number[]>, key: string, i: number): void {
  const arr = map.get(key);
  if (arr) arr.push(i);
  else map.set(key, [i]);
}

function sortFacets(f: Facet[]): Facet[] {
  return f.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/** Build the query-optimized catalog from a parsed playlist (pre-enrichment). */
export function buildCatalog(playlist: Playlist): Catalog {
  const channels = playlist.channels;
  const byId = new Map<string, number>();
  const idxByCountry = new Map<string, number[]>();
  const idxByCategory = new Map<string, number[]>();
  const idxByLanguage = new Map<string, number[]>();
  const countryCount = new Map<string, number>();
  const categoryCount = new Map<string, number>();

  channels.forEach((ch, i) => {
    byId.set(ch.id, i);
    if (ch.countryCode) {
      pushIdx(idxByCountry, ch.countryCode, i);
      countryCount.set(ch.countryCode, (countryCount.get(ch.countryCode) ?? 0) + 1);
    }
    for (const cat of ch.group) {
      pushIdx(idxByCategory, cat, i);
      categoryCount.set(cat, (categoryCount.get(cat) ?? 0) + 1);
    }
  });

  const countries = sortFacets(
    [...countryCount].map(([code, count]) => ({
      value: code,
      label: code.toUpperCase(),
      meta: codeToFlag(code),
      count,
    })),
  );
  const categories = sortFacets(
    [...categoryCount].map(([name, count]) => ({
      value: name,
      label: name,
      meta: categorySwatch(name),
      count,
    })),
  );

  return {
    channels,
    byId,
    idxByCountry,
    idxByCategory,
    idxByLanguage,
    countries,
    categories,
    languages: [],
    epgUrl: playlist.epgUrl,
    source: playlist.source,
    enriched: false,
  };
}

// ---------- health derivation ----------

/**
 * Resolve a channel's effective health from static signals (closed / tags /
 * needs-proxy) plus any learned record from playback success/failure.
 */
export function channelHealth(ch: Channel, health: Map<string, HealthRecord>): HealthStatus {
  if (ch.closed) return 'dead';
  const rec = health.get(ch.id);
  if (rec) return rec.status;
  if (ch.geoBlocked) return 'geo';
  if (ch.needsProxy) return 'proxy';
  return 'unknown';
}

const HEALTH_RANK: Record<HealthStatus, number> = {
  alive: 0,
  unknown: 1,
  proxy: 2,
  geo: 3,
  dead: 4,
};

// ---------- quality helpers ----------

export function resolutionHeight(ch: Channel): number {
  if (ch.resolution) {
    const m = ch.resolution.match(/(\d{3,4})/);
    if (m) return Number(m[1]);
    if (/4K/i.test(ch.resolution)) return 2160;
    if (/8K/i.test(ch.resolution)) return 4320;
  }
  const q = (ch.quality ?? '').toUpperCase();
  if (q === 'UHD') return 2160;
  if (q === 'FHD') return 1080;
  if (q === 'HD') return 720;
  return 0;
}

export function isHd(ch: Channel): boolean {
  const h = resolutionHeight(ch);
  if (h) return h >= 720;
  return /HD/i.test(ch.quality ?? '');
}

// ---------- set algebra over index arrays ----------

function unionIdx(map: Map<string, number[]>, keys: string[]): number[] {
  if (keys.length === 1) return map.get(keys[0]) ?? [];
  const seen = new Set<number>();
  for (const k of keys) {
    const arr = map.get(k);
    if (arr) for (const i of arr) seen.add(i);
  }
  return [...seen];
}

function intersectMany(sets: number[][]): number[] {
  if (sets.length === 0) return [];
  if (sets.length === 1) return sets[0];
  const sorted = [...sets].sort((a, b) => a.length - b.length);
  const smallest = sorted[0];
  const rest = sorted.slice(1).map((s) => new Set(s));
  return smallest.filter((i) => rest.every((s) => s.has(i)));
}

function matchSearch(ch: Channel, q: string): boolean {
  return (
    ch.cleanName.toLowerCase().includes(q) ||
    (ch.tvgId ? ch.tvgId.toLowerCase().includes(q) : false) ||
    ch.group.some((g) => g.toLowerCase().includes(q))
  );
}

/** Apply axis selections + predicate filters, returning UNSORTED indices (source/base order). */
export function candidateIndices(
  catalog: Catalog,
  c: FilterCriteria,
  health: Map<string, HealthRecord>,
  base?: number[],
): number[] {
  const axes: number[][] = [];
  if (c.countries.length) axes.push(unionIdx(catalog.idxByCountry, c.countries));
  if (c.categories.length) axes.push(unionIdx(catalog.idxByCategory, c.categories));
  if (c.languages.length) axes.push(unionIdx(catalog.idxByLanguage, c.languages));
  if (base) axes.push(base);

  let indices: number[];
  if (axes.length) {
    indices = intersectMany(axes);
  } else {
    indices = Array.from({ length: catalog.channels.length }, (_, i) => i);
  }

  const q = c.search.trim().toLowerCase();
  const out: number[] = [];
  for (const i of indices) {
    const ch = catalog.channels[i];
    if (q && !matchSearch(ch, q)) continue;
    if (c.hideGeo && ch.geoBlocked) continue;
    if (c.hide247 && ch.not247) continue;
    if (c.hdOnly && !isHd(ch)) continue;
    if (c.hideNsfw && ch.nsfw) continue;
    if (c.workingOnly && channelHealth(ch, health) === 'dead') continue;
    out.push(i);
  }
  return out;
}

function sortIndices(
  indices: number[],
  catalog: Catalog,
  sort: SortKey,
  health: Map<string, HealthRecord>,
): number[] {
  const ch = catalog.channels;
  const cmpName = (a: number, b: number) => ch[a].cleanName.localeCompare(ch[b].cleanName);
  switch (sort) {
    case 'az':
      return indices.sort(cmpName);
    case 'country':
      return indices.sort(
        (a, b) => (ch[a].countryCode ?? 'zz').localeCompare(ch[b].countryCode ?? 'zz') || cmpName(a, b),
      );
    case 'quality':
      return indices.sort((a, b) => resolutionHeight(ch[b]) - resolutionHeight(ch[a]) || cmpName(a, b));
    case 'working':
      return indices.sort(
        (a, b) =>
          HEALTH_RANK[channelHealth(ch[a], health)] - HEALTH_RANK[channelHealth(ch[b], health)] ||
          cmpName(a, b),
      );
    default:
      return indices;
  }
}

/** Filter + sort the catalog, returning indices into `catalog.channels`. */
export function filterIndices(
  catalog: Catalog,
  c: FilterCriteria,
  health: Map<string, HealthRecord>,
  base?: number[],
): number[] {
  return sortIndices(candidateIndices(catalog, c, health, base), catalog, c.sort, health);
}

/**
 * Live facet counts for one axis, computed against the OTHER active axes +
 * predicates (so each count answers "how many if I also pick this value").
 */
export function facetCounts(
  catalog: Catalog,
  c: FilterCriteria,
  health: Map<string, HealthRecord>,
  axis: FacetAxis,
): Map<string, number> {
  const cc: FilterCriteria = { ...c };
  if (axis === 'country') cc.countries = [];
  else if (axis === 'category') cc.categories = [];
  else cc.languages = [];

  const indices = candidateIndices(catalog, cc, health);
  const counts = new Map<string, number>();
  for (const i of indices) {
    const ch = catalog.channels[i];
    const vals =
      axis === 'country'
        ? ch.countryCode
          ? [ch.countryCode]
          : []
        : axis === 'category'
          ? ch.group
          : (ch.languageCodes ?? []);
    for (const v of vals) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return counts;
}
