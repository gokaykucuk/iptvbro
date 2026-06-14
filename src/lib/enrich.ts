import type { Catalog, Facet } from '@/types';
import { ENRICH_TTL_MS, IPTV_ORG_API } from './constants';
import { idbGetFresh, idbSetFresh } from './idb';

/**
 * iptv-org enrichment.
 *
 * The M3U itself has no language or NSFW data. We join against the small,
 * CORS-open iptv-org JSON API:
 *   - countries.json  -> country name, flag emoji, and the country's languages[]
 *   - languages.json  -> language code -> human name
 * The language facet is derived from each channel's country languages (this is
 * how iptv-org models language too). The large channels.json (~10MB) is an
 * OPTIONAL extra used only for NSFW / closed lifecycle data.
 */

interface CountryApi {
  name: string;
  code: string;
  languages: string[];
  flag: string;
}
interface LanguageApi {
  code: string;
  name: string;
}
interface ChannelApi {
  id: string;
  is_nsfw: boolean;
  closed: string | null;
}

export interface EnrichmentData {
  countriesByCode: Map<string, CountryApi>;
  languageNameByCode: Map<string, string>;
}

function pushIdx(map: Map<string, number[]>, key: string, i: number): void {
  const arr = map.get(key);
  if (arr) arr.push(i);
  else map.set(key, [i]);
}

async function fetchJson<T>(url: string, cacheKey: string): Promise<T> {
  const cached = await idbGetFresh<T>(cacheKey, ENRICH_TTL_MS);
  if (cached) return cached;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  const data = (await res.json()) as T;
  await idbSetFresh(cacheKey, data);
  return data;
}

/** Fetch the lightweight country + language metadata (cached 24h). */
export async function fetchEnrichment(): Promise<EnrichmentData> {
  const [countries, languages] = await Promise.all([
    fetchJson<CountryApi[]>(`${IPTV_ORG_API}/countries.json`, 'enrich:countries'),
    fetchJson<LanguageApi[]>(`${IPTV_ORG_API}/languages.json`, 'enrich:languages'),
  ]);
  const countriesByCode = new Map<string, CountryApi>();
  for (const c of countries) countriesByCode.set(c.code.toLowerCase(), c);
  const languageNameByCode = new Map<string, string>();
  for (const l of languages) languageNameByCode.set(l.code, l.name);
  return { countriesByCode, languageNameByCode };
}

/** Merge country/flag/language metadata into the catalog, returning a new Catalog. */
export function applyEnrichment(catalog: Catalog, data: EnrichmentData): Catalog {
  const idxByLanguage = new Map<string, number[]>();
  const languageCount = new Map<string, number>();
  const countryNames = new Map<string, string>();

  catalog.channels.forEach((ch, i) => {
    const cc = ch.countryCode;
    if (!cc) return;
    const country = data.countriesByCode.get(cc);
    if (!country) return;
    ch.countryName = country.name;
    ch.countryFlag = country.flag;
    countryNames.set(cc, country.name);
    const codes = country.languages ?? [];
    ch.languageCodes = codes;
    ch.languageNames = codes.map((c) => data.languageNameByCode.get(c) ?? c);
    for (const lc of codes) {
      pushIdx(idxByLanguage, lc, i);
      languageCount.set(lc, (languageCount.get(lc) ?? 0) + 1);
    }
  });

  const languages: Facet[] = [...languageCount]
    .map(([code, count]) => ({
      value: code,
      label: data.languageNameByCode.get(code) ?? code,
      count,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  const countries = catalog.countries
    .map((f) => ({ ...f, label: countryNames.get(f.value) ?? f.label }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  return { ...catalog, idxByLanguage, languages, countries, enriched: true };
}

/**
 * OPTIONAL heavy enrichment: fetch channels.json (~10MB) for NSFW + closed
 * lifecycle, returning a map keyed by channel id (tvg-id base, "@quality" stripped).
 */
export async function fetchChannelMeta(): Promise<Map<string, { nsfw: boolean; closed: boolean }>> {
  const list = await fetchJson<ChannelApi[]>(`${IPTV_ORG_API}/channels.json`, 'enrich:channels');
  const map = new Map<string, { nsfw: boolean; closed: boolean }>();
  for (const c of list) map.set(c.id, { nsfw: Boolean(c.is_nsfw), closed: Boolean(c.closed) });
  return map;
}

/** Apply NSFW / closed flags from channels.json onto the catalog channels (in place). */
export function applyChannelMeta(
  catalog: Catalog,
  meta: Map<string, { nsfw: boolean; closed: boolean }>,
): Catalog {
  for (const ch of catalog.channels) {
    if (!ch.tvgId) continue;
    const base = ch.tvgId.split('@')[0];
    const m = meta.get(base);
    if (m) {
      ch.nsfw = m.nsfw;
      ch.closed = m.closed;
    }
  }
  return { ...catalog, channelMetaApplied: true };
}
