import { Command, Grid3x3, List, Moon, Search, Shuffle, Sun, X } from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';
import { getFilteredIndices } from '@/store/selectors';
import { useStore } from '@/store/useStore';
import { titleCase } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { ThemeMode } from '@/types';

const THEME_CYCLE: Record<ThemeMode, ThemeMode> = {
  dark: 'light',
  light: 'oled',
  oled: 'dark',
};

/** Horizontal top bar: inline search on the left, command/shuffle/layout/theme controls on the right. */
export function CommandBar() {
  const search = useStore((s) => s.search);
  const gridMode = useStore((s) => s.gridMode);
  const theme = useStore((s) => s.theme);
  const catalog = useStore((s) => s.catalog);

  const setSearch = useStore((s) => s.setSearch);
  const setCommandOpen = useStore((s) => s.setCommandOpen);
  const setGridMode = useStore((s) => s.setGridMode);
  const setTheme = useStore((s) => s.setTheme);
  const setCurrentChannel = useStore((s) => s.setCurrentChannel);
  const pushRecent = useStore((s) => s.pushRecent);

  const handleShuffle = () => {
    const indices = getFilteredIndices();
    if (indices.length === 0 || !catalog) return;
    const pick = indices[Math.floor(Math.random() * indices.length)];
    const channel = catalog.channels[pick];
    if (!channel) return;
    setCurrentChannel(channel.id);
    pushRecent(channel.id);
  };

  const ThemeIcon = theme === 'light' ? Sun : Moon;

  return (
    <div className="flex h-12 items-center gap-2 border-b border-border bg-rail px-3">
      <div className="relative flex max-w-md flex-1 items-center">
        <Search
          size={16}
          className="pointer-events-none absolute left-2 text-dim"
          aria-hidden="true"
        />
        <input
          id="global-search"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search channels…"
          aria-label="Search channels"
          className={cn(
            'h-8 w-full rounded-md bg-surface-2 pl-8 text-sm text-fg placeholder:text-dim',
            'transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
            search ? 'pr-9' : 'pr-2',
          )}
        />
        {search && (
          <IconButton
            label="Clear search"
            size="sm"
            tip={false}
            onClick={() => setSearch('')}
            className="absolute right-0.5 h-7 w-7"
          >
            <X size={16} />
          </IconButton>
        )}
      </div>

      <div className="ml-auto flex items-center gap-1">
        <IconButton label="Command palette  ⌘K" size="sm" onClick={() => setCommandOpen(true)}>
          <Command size={16} />
        </IconButton>

        <IconButton label="Shuffle" size="sm" onClick={handleShuffle}>
          <Shuffle size={16} />
        </IconButton>

        <IconButton
          label="Toggle layout"
          size="sm"
          onClick={() => setGridMode(gridMode === 'list' ? 'grid' : 'list')}
        >
          {gridMode === 'list' ? <Grid3x3 size={16} /> : <List size={16} />}
        </IconButton>

        <IconButton
          label={`Theme: ${titleCase(theme)}`}
          size="sm"
          onClick={() => setTheme(THEME_CYCLE[theme])}
        >
          <ThemeIcon size={16} />
        </IconButton>
      </div>
    </div>
  );
}
