import { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { getFilteredIndices } from '@/store/selectors';
import { LazyLogo } from '@/components/LazyLogo';
import { codeToFlag } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { Channel } from '@/types';

/** Centered command palette modal for fast channel search and zapping. */
export function CommandPalette() {
  const commandOpen = useStore((s) => s.commandOpen);
  const catalog = useStore((s) => s.catalog);
  const setCommandOpen = useStore((s) => s.setCommandOpen);
  const setCurrentChannel = useStore((s) => s.setCurrentChannel);
  const pushRecent = useStore((s) => s.pushRecent);

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset query + selection each time the palette opens.
  useEffect(() => {
    if (commandOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [commandOpen]);

  const results = useMemo<Channel[]>(() => {
    if (!catalog) return [];
    const q = query.trim().toLowerCase();
    if (!q) {
      const out: Channel[] = [];
      const indices = getFilteredIndices();
      for (let i = 0; i < indices.length && out.length < 30; i++) {
        const ch = catalog.channels[indices[i]];
        if (ch) out.push(ch);
      }
      return out;
    }
    const out: Channel[] = [];
    for (let i = 0; i < catalog.channels.length && out.length < 40; i++) {
      const ch = catalog.channels[i];
      if (
        ch.cleanName.toLowerCase().includes(q) ||
        (ch.tvgId ? ch.tvgId.toLowerCase().includes(q) : false)
      ) {
        out.push(ch);
      }
    }
    return out;
  }, [catalog, query]);

  // Keep selectedIndex in range as results change.
  useEffect(() => {
    setSelectedIndex((i) => Math.min(i, Math.max(0, results.length - 1)));
  }, [results.length]);

  // Scroll the selected row into view.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>('[data-selected="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex, results]);

  if (!commandOpen) return null;

  const close = () => setCommandOpen(false);

  const commit = (channel: Channel) => {
    setCurrentChannel(channel.id);
    pushRecent(channel.id);
    setCommandOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, Math.max(0, results.length - 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const ch = results[selectedIndex];
      if (ch) commit(ch);
    }
  };

  const browsing = query.trim().length === 0;

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/60"
      onClick={close}
      role="presentation"
    >
      <div
        className="mx-auto mt-[12vh] w-[92vw] max-w-2xl animate-pop overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--shadow-deep)]"
        role="dialog"
        aria-modal="true"
        aria-label="Search channels"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-2.5 border-b border-border px-3.5">
          <Search size={16} className="shrink-0 text-dim" aria-hidden="true" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search 12,000 channels…"
            aria-label="Search channels"
            className="h-12 w-full bg-transparent text-sm text-fg outline-none placeholder:text-dim"
          />
        </div>

        <div
          ref={listRef}
          className="no-scrollbar max-h-[50vh] overflow-y-auto py-1"
          role="listbox"
          aria-label="Channel results"
          aria-live="polite"
        >
          {browsing && results.length > 0 && (
            <div className="eyebrow px-3.5 pb-1 pt-2">Browse</div>
          )}

          {results.length === 0 ? (
            <div className="px-3.5 py-8 text-center text-sm text-dim">No channels found</div>
          ) : (
            results.map((ch, i) => {
              const selected = i === selectedIndex;
              const flag = codeToFlag(ch.countryCode);
              const category = ch.group[0];
              return (
                <button
                  key={ch.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  data-selected={selected}
                  onMouseMove={() => setSelectedIndex(i)}
                  onClick={() => commit(ch)}
                  className={cn(
                    'flex w-full items-center gap-3 border-l-2 border-transparent px-3 py-1.5 text-left transition-colors',
                    selected ? 'border-accent bg-accent-soft text-fg' : 'text-muted hover:bg-hover',
                  )}
                >
                  <LazyLogo
                    src={ch.logo}
                    name={ch.cleanName}
                    className="h-7 w-9 shrink-0 rounded"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm">{ch.cleanName}</span>
                  <span className="flex shrink-0 items-center gap-2 font-mono text-[11px] text-dim">
                    {flag && <span aria-hidden="true">{flag}</span>}
                    {category && <span className="truncate">{category}</span>}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="border-t border-border px-3.5 py-2">
          <span className="eyebrow">↑↓ navigate · ↵ play · esc close</span>
        </div>
      </div>
    </div>
  );
}
