import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { SearchX } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useFilteredIndices } from '@/store/selectors';
import { channelHealth } from '@/lib/catalog';
import { ChannelRow } from './ChannelRow';
import { ChannelCard } from './ChannelCard';
import { EmptyState } from './EmptyState';

const ROW_H = 48;
const GRID_GAP = 12;
const GRID_PAD = 12;
const TILE_TARGET = 158;

/** The virtualized channel spine — renders only visible rows/tiles for 12k+ channels. */
export function ChannelList() {
  const catalog = useStore((s) => s.catalog);
  const gridMode = useStore((s) => s.gridMode);
  const filtered = useFilteredIndices();
  const currentId = useStore((s) => s.currentChannelId);
  const selectionIndex = useStore((s) => s.selectionIndex);
  const favorites = useStore((s) => s.favorites);
  const health = useStore((s) => s.health);
  const setCurrentChannel = useStore((s) => s.setCurrentChannel);
  const pushRecent = useStore((s) => s.pushRecent);
  const setSelectionIndex = useStore((s) => s.setSelectionIndex);
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const clearFilters = useStore((s) => s.clearFilters);

  const parentRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  // Measure synchronously before paint so the grid's first estimate is correct.
  useLayoutEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const isGrid = gridMode === 'grid';
  const ready = !isGrid || width > 0;
  const cols = isGrid && width > 0 ? Math.max(2, Math.floor((width - GRID_PAD) / TILE_TARGET)) : 1;
  const tileW = isGrid && width > 0 ? (width - GRID_GAP * (cols + 1)) / cols : 0;
  const gridRowH = isGrid && width > 0 ? Math.round((tileW * 9) / 16) + 34 + GRID_GAP : ROW_H;

  const favSet = useMemo(() => new Set(favorites), [favorites]);
  const rowCount = isGrid ? Math.ceil(filtered.length / cols) : filtered.length;

  // Identity-stable handlers (only store actions in deps) so ChannelRow/Card memo holds.
  const handleSelect = useCallback(
    (id: string, index: number) => {
      setCurrentChannel(id);
      pushRecent(id);
      setSelectionIndex(index);
    },
    [setCurrentChannel, pushRecent, setSelectionIndex],
  );

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => (isGrid ? gridRowH : ROW_H),
    overscan: isGrid ? 6 : 14,
  });

  useEffect(() => {
    virtualizer.measure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cols, gridMode, gridRowH]);

  useEffect(() => {
    if (selectionIndex < 0 || selectionIndex >= filtered.length) return;
    const row = isGrid ? Math.floor(selectionIndex / cols) : selectionIndex;
    virtualizer.scrollToIndex(row, { align: 'auto' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionIndex, gridMode, cols]);

  if (!catalog) return null;

  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={<SearchX size={22} />}
        title="No channels match"
        hint="Try removing a filter or clearing your search."
        actionLabel="Clear filters"
        onAction={clearFilters}
      />
    );
  }

  return (
    <div
      ref={parentRef}
      role="listbox"
      aria-label="Channels"
      tabIndex={0}
      className="relative h-full overflow-y-auto outline-none"
    >
      <div style={{ height: ready ? virtualizer.getTotalSize() : 0, width: '100%', position: 'relative' }}>
        {ready &&
          virtualizer.getVirtualItems().map((vi) => {
            if (!isGrid) {
              const fi = vi.index;
              const ch = catalog.channels[filtered[fi]];
              return (
                <div
                  key={ch.id}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: ROW_H, transform: `translateY(${vi.start}px)` }}
                >
                  <ChannelRow
                    channel={ch}
                    index={fi}
                    playing={ch.id === currentId}
                    selected={fi === selectionIndex}
                    favorite={favSet.has(ch.id)}
                    health={channelHealth(ch, health)}
                    onSelect={handleSelect}
                    onToggleFavorite={toggleFavorite}
                  />
                </div>
              );
            }
            const startFi = vi.index * cols;
            const items = [];
            for (let c = 0; c < cols; c++) {
              const fi = startFi + c;
              if (fi >= filtered.length) break;
              const ch = catalog.channels[filtered[fi]];
              items.push(
                <ChannelCard
                  key={ch.id}
                  channel={ch}
                  index={fi}
                  playing={ch.id === currentId}
                  selected={fi === selectionIndex}
                  favorite={favSet.has(ch.id)}
                  health={channelHealth(ch, health)}
                  onSelect={handleSelect}
                  onToggleFavorite={toggleFavorite}
                />,
              );
            }
            return (
              <div
                key={vi.index}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${vi.start}px)`,
                  display: 'grid',
                  gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                  gap: GRID_GAP,
                  padding: `0 ${GRID_PAD}px`,
                }}
              >
                {items}
              </div>
            );
          })}
      </div>
    </div>
  );
}
