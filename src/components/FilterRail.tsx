import { useMemo } from 'react';
import type { Facet } from '@/types';
import type { FacetAxis } from '@/lib/catalog';
import { useStore } from '@/store/useStore';
import { useFacetCounts } from '@/store/selectors';
import { Switch } from '@/components/ui/Switch';
import { cn } from '@/lib/cn';
import { codeToFlag, compactNumber } from '@/lib/format';
import { categorySwatch } from '@/lib/constants';

type QuickKey = 'hideGeo' | 'hide247' | 'hdOnly' | 'hideNsfw' | 'onlyNsfw' | 'workingOnly';

const QUICK_ROWS: { key: QuickKey; label: string }[] = [
  { key: 'workingOnly', label: 'Working only' },
  { key: 'hideGeo', label: 'Hide geo-blocked' },
  { key: 'hide247', label: 'Hide not 24/7' },
  { key: 'hdOnly', label: 'HD only' },
  { key: 'hideNsfw', label: 'Hide NSFW' },
  { key: 'onlyNsfw', label: 'Only NSFW' },
];

const FACET_LIMIT = 60;

interface FacetSectionProps {
  title: string;
  axis: FacetAxis;
  facets: Facet[];
  counts: Map<string, number>;
}

function axisToFilterKey(axis: FacetAxis): 'countries' | 'categories' | 'languages' {
  if (axis === 'country') return 'countries';
  if (axis === 'category') return 'categories';
  return 'languages';
}

function FacetSection({ title, axis, facets, counts }: FacetSectionProps) {
  const filterKey = axisToFilterKey(axis);
  const selected = useStore((s) => s[filterKey]);
  const toggleFacet = useStore((s) => s.toggleFacet);

  const rows = useMemo(() => {
    const out = facets
      .map((f) => ({ facet: f, count: counts.get(f.value) ?? 0 }))
      .filter((r) => r.count > 0 || selected.includes(r.facet.value))
      .sort((a, b) => b.count - a.count || a.facet.label.localeCompare(b.facet.label));
    return out.slice(0, FACET_LIMIT);
  }, [facets, counts, selected]);

  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="eyebrow">{title}</h3>
      {rows.length === 0 ? (
        <p className="px-2 text-[12px] text-dim">—</p>
      ) : (
        <div className="max-h-64 overflow-y-auto no-scrollbar">
          {rows.map(({ facet, count }) => {
            const isSelected = selected.includes(facet.value);
            return (
              <button
                key={facet.value}
                type="button"
                aria-pressed={isSelected}
                onClick={() => toggleFacet(filterKey, facet.value)}
                className={cn(
                  'flex h-7 w-full items-center gap-2 rounded-md px-2 text-[12px] transition-colors hover:bg-hover',
                  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
                  isSelected
                    ? 'border-l-2 border-accent bg-accent-soft text-accent'
                    : 'text-muted',
                )}
              >
                {axis === 'country' && (
                  <span aria-hidden className="shrink-0 text-[13px] leading-none">
                    {facet.meta || codeToFlag(facet.value)}
                  </span>
                )}
                {axis === 'category' && (
                  <span
                    aria-hidden
                    className="h-2 w-2 shrink-0 rounded-sm"
                    style={{ background: facet.meta || categorySwatch(facet.value) }}
                  />
                )}
                <span className="flex-1 truncate text-left">{facet.label}</span>
                <span className="tnum shrink-0 font-mono text-[11px] text-dim">
                  {compactNumber(count)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function FilterRail() {
  const catalog = useStore((s) => s.catalog);
  const setQuick = useStore((s) => s.setQuick);
  const workingOnly = useStore((s) => s.workingOnly);
  const hideGeo = useStore((s) => s.hideGeo);
  const hide247 = useStore((s) => s.hide247);
  const hdOnly = useStore((s) => s.hdOnly);
  const hideNsfw = useStore((s) => s.hideNsfw);
  const onlyNsfw = useStore((s) => s.onlyNsfw);

  const quickValues: Record<QuickKey, boolean> = {
    workingOnly,
    hideGeo,
    hide247,
    hdOnly,
    hideNsfw,
    onlyNsfw,
  };

  const countryCounts = useFacetCounts('country');
  const categoryCounts = useFacetCounts('category');
  const languageCounts = useFacetCounts('language');

  return (
    <div className="flex h-full w-full flex-col gap-5 overflow-y-auto border-r border-border bg-rail px-3 py-3">
      <section className="flex flex-col gap-1.5">
        <h3 className="eyebrow">Filters</h3>
        <div className="flex flex-col gap-0.5">
          {QUICK_ROWS.map(({ key, label }) => (
            <div
              key={key}
              className="flex items-center justify-between text-[12px] text-muted"
            >
              <span>{label}</span>
              <Switch
                checked={quickValues[key]}
                onChange={(v) => setQuick(key, v)}
                label={label}
              />
            </div>
          ))}
        </div>
      </section>

      {catalog && (
        <>
          <FacetSection
            title="Country"
            axis="country"
            facets={catalog.countries}
            counts={countryCounts}
          />
          <FacetSection
            title="Category"
            axis="category"
            facets={catalog.categories}
            counts={categoryCounts}
          />
          <FacetSection
            title="Language"
            axis="language"
            facets={catalog.languages}
            counts={languageCounts}
          />
        </>
      )}
    </div>
  );
}
