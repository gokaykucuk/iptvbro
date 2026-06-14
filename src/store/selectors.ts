import { useMemo } from 'react';
import { useStore, type StoreState } from './useStore';
import {
  candidateIndices,
  facetCounts,
  filterIndices,
  type FacetAxis,
  type FilterCriteria,
} from '@/lib/catalog';

const EMPTY: number[] = [];

function buildCriteria(s: StoreState): FilterCriteria {
  return {
    search: s.search,
    countries: s.countries,
    categories: s.categories,
    languages: s.languages,
    hideGeo: s.hideGeo,
    hide247: s.hide247,
    hdOnly: s.hdOnly,
    hideNsfw: s.hideNsfw,
    onlyNsfw: s.onlyNsfw,
    workingOnly: s.workingOnly,
    sort: s.sort,
  };
}

function compute(s: StoreState): number[] {
  const cat = s.catalog;
  if (!cat) return EMPTY;
  const criteria = buildCriteria(s);
  if (s.view === 'all') return filterIndices(cat, criteria, s.health);

  // favorites / recents: preserve user order; apply only search + quick predicates.
  const ids = s.view === 'favorites' ? s.favorites : s.recents.map((r) => r.id);
  const base: number[] = [];
  for (const id of ids) {
    const i = cat.byId.get(id);
    if (i !== undefined) base.push(i);
  }
  const noAxis: FilterCriteria = { ...criteria, countries: [], categories: [], languages: [] };
  return candidateIndices(cat, noAxis, s.health, base);
}

let cache: { key: string; val: number[] } | null = null;

/** Memoized filtered + sorted indices into catalog.channels for the active view. */
export function selectFilteredIndices(s: StoreState): number[] {
  if (!s.catalog) return EMPTY;
  // Health only affects the result when filtering/sorting by it — otherwise a
  // health tick must not invalidate the cache (avoids re-filtering 12k per play).
  const healthRelevant = s.workingOnly || s.sort === 'working';
  const hv = healthRelevant ? s.healthVersion : 0;
  const key = `${s.catalogVersion}:${s.filterVersion}:${hv}:${s.userVersion}:${s.view}`;
  if (cache && cache.key === key) return cache.val;
  const val = compute(s);
  cache = { key, val };
  return val;
}

/** Hook: the current filtered index list (stable ref between unrelated updates). */
export function useFilteredIndices(): number[] {
  return useStore(selectFilteredIndices);
}

/** Imperative read for keyboard handlers etc. */
export function getFilteredIndices(): number[] {
  return selectFilteredIndices(useStore.getState());
}

/** Hook: live facet counts for one axis, recomputed against the other active axes. */
export function useFacetCounts(axis: FacetAxis): Map<string, number> {
  const catalog = useStore((s) => s.catalog);
  const filterVersion = useStore((s) => s.filterVersion);
  const catalogVersion = useStore((s) => s.catalogVersion);
  const workingOnly = useStore((s) => s.workingOnly);
  const healthVersion = useStore((s) => s.healthVersion);
  // facetCounts only reads health when workingOnly is active; otherwise a health
  // tick produces an identical Map, so don't let it invalidate the memo.
  const healthDep = workingOnly ? healthVersion : 0;
  return useMemo(() => {
    const s = useStore.getState();
    if (!s.catalog) return new Map<string, number>();
    return facetCounts(s.catalog, buildCriteria(s), s.health, axis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog, filterVersion, catalogVersion, healthDep, axis]);
}

/** Hook: number of active filters (for the "clear all" affordance). */
export function useActiveFilterCount(): number {
  return useStore(
    (s) =>
      s.countries.length +
      s.categories.length +
      s.languages.length +
      (s.search ? 1 : 0) +
      (s.hideGeo ? 1 : 0) +
      (s.hide247 ? 1 : 0) +
      (s.hdOnly ? 1 : 0) +
      (s.hideNsfw ? 1 : 0) +
      (s.onlyNsfw ? 1 : 0) +
      (s.workingOnly ? 1 : 0),
  );
}
