import { useMemo } from 'react';
import { List, Grid3x3, X } from 'lucide-react';
import type { Facet, SortKey } from '@/types';
import { useStore } from '@/store/useStore';
import { selectFilteredIndices, useActiveFilterCount } from '@/store/selectors';
import { IconButton } from '@/components/ui/IconButton';
import { cn } from '@/lib/cn';
import { compactNumber } from '@/lib/format';
import { categorySwatch } from '@/lib/constants';

type QuickKey = 'hideGeo' | 'hide247' | 'hdOnly' | 'hideNsfw' | 'workingOnly';

const QUICK_LABELS: Record<QuickKey, string> = {
  hideGeo: 'No geo',
  hide247: '24/7',
  hdOnly: 'HD',
  hideNsfw: 'SFW',
  workingOnly: 'Working',
};

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'az', label: 'A–Z' },
  { value: 'country', label: 'Country' },
  { value: 'quality', label: 'Quality' },
  { value: 'working', label: 'Working first' },
];

function labelMap(facets: Facet[] | undefined): Map<string, Facet> {
  const m = new Map<string, Facet>();
  if (facets) for (const f of facets) m.set(f.value, f);
  return m;
}

/** Slim bar above the channel list: live result count, removable filter tokens, sort + grid/list. */
export function AppliedFilterBar() {
  const resultCount = useStore((s) => selectFilteredIndices(s).length);
  const activeCount = useActiveFilterCount();
  const catalog = useStore((s) => s.catalog);

  const search = useStore((s) => s.search);
  const countries = useStore((s) => s.countries);
  const categories = useStore((s) => s.categories);
  const languages = useStore((s) => s.languages);
  const hideGeo = useStore((s) => s.hideGeo);
  const hide247 = useStore((s) => s.hide247);
  const hdOnly = useStore((s) => s.hdOnly);
  const hideNsfw = useStore((s) => s.hideNsfw);
  const workingOnly = useStore((s) => s.workingOnly);
  const sort = useStore((s) => s.sort);
  const gridMode = useStore((s) => s.gridMode);

  const setSearch = useStore((s) => s.setSearch);
  const toggleFacet = useStore((s) => s.toggleFacet);
  const setQuick = useStore((s) => s.setQuick);
  const clearFilters = useStore((s) => s.clearFilters);
  const setSort = useStore((s) => s.setSort);
  const setGridMode = useStore((s) => s.setGridMode);

  const countryLabels = useMemo(() => labelMap(catalog?.countries), [catalog]);
  const categoryLabels = useMemo(() => labelMap(catalog?.categories), [catalog]);
  const languageLabels = useMemo(() => labelMap(catalog?.languages), [catalog]);

  const quickActive = ([
    ['hideGeo', hideGeo],
    ['hide247', hide247],
    ['hdOnly', hdOnly],
    ['hideNsfw', hideNsfw],
    ['workingOnly', workingOnly],
  ] as [QuickKey, boolean][]).filter(([, on]) => on);

  return (
    <div className="flex h-11 items-center gap-2 border-b border-border bg-surface px-3">
      <div className="shrink-0 text-[12px]">
        <span className="font-mono tabular-nums text-fg">{compactNumber(resultCount)}</span>{' '}
        <span className="text-dim">channels</span>
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        {search.trim() !== '' && (
          <Token label={`“${search}”`} onRemove={() => setSearch('')} removeLabel="Clear search" />
        )}

        {countries.map((code) => {
          const facet = countryLabels.get(code);
          const flag = facet?.meta ?? '';
          const name = facet?.label ?? code;
          return (
            <Token
              key={`country-${code}`}
              label={`${flag} ${name}`.trim()}
              onRemove={() => toggleFacet('countries', code)}
              removeLabel={`Remove ${name} filter`}
            />
          );
        })}

        {categories.map((name) => {
          const label = categoryLabels.get(name)?.label ?? name;
          const swatch = categoryLabels.get(name)?.meta ?? categorySwatch(name);
          return (
            <Token
              key={`category-${name}`}
              onRemove={() => toggleFacet('categories', name)}
              removeLabel={`Remove ${label} filter`}
              label={
                <>
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: swatch }}
                    aria-hidden="true"
                  />
                  {label}
                </>
              }
            />
          );
        })}

        {languages.map((code) => {
          const name = languageLabels.get(code)?.label ?? code;
          return (
            <Token
              key={`language-${code}`}
              label={name}
              onRemove={() => toggleFacet('languages', code)}
              removeLabel={`Remove ${name} filter`}
            />
          );
        })}

        {quickActive.map(([key]) => (
          <Token
            key={`quick-${key}`}
            label={QUICK_LABELS[key]}
            onRemove={() => setQuick(key, false)}
            removeLabel={`Remove ${QUICK_LABELS[key]} filter`}
          />
        ))}
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        {activeCount > 0 && (
          <button
            type="button"
            onClick={clearFilters}
            className="h-8 rounded-md px-2 text-[12px] text-muted transition-colors hover:text-fg focus-visible:text-fg"
          >
            Clear all
          </button>
        )}

        <label className="flex items-center gap-1.5">
          <span className="eyebrow">Sort</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Sort channels"
            className="h-8 rounded-md bg-surface-2 px-2 text-[12px] text-muted transition-colors hover:text-fg focus-visible:text-fg"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <IconButton
          label={gridMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
          size="sm"
          active={gridMode === 'grid'}
          onClick={() => setGridMode(gridMode === 'grid' ? 'list' : 'grid')}
        >
          {gridMode === 'grid' ? <Grid3x3 size={16} /> : <List size={16} />}
        </IconButton>
      </div>
    </div>
  );
}

interface TokenProps {
  label: React.ReactNode;
  onRemove: () => void;
  removeLabel: string;
}

function Token({ label, onRemove, removeLabel }: TokenProps) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1 rounded-md bg-surface-2 px-2 text-[11px] text-muted',
      )}
    >
      <span className="inline-flex items-center gap-1 truncate">{label}</span>
      <IconButton label={removeLabel} size="sm" tip={false} onClick={onRemove} className="h-4 w-4 -mr-1">
        <X size={12} />
      </IconButton>
    </span>
  );
}
