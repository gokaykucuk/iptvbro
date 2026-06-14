import { X } from 'lucide-react';
import { useStore } from '@/store/useStore';

/** Power-user diagnostics overlay (top-right), toggled from TopBadges. */
export function StreamStats() {
  const show = useStore((s) => s.showStats);
  const toggle = useStore((s) => s.toggleStats);
  const catalog = useStore((s) => s.catalog);
  const id = useStore((s) => s.currentChannelId);
  const playState = useStore((s) => s.playState);
  const bitrate = useStore((s) => s.bitrate);
  const levels = useStore((s) => s.levels);
  const currentLevel = useStore((s) => s.currentLevel);
  const isLive = useStore((s) => s.isLive);

  if (!show) return null;
  const ch = id && catalog ? (catalog.channels[catalog.byId.get(id) ?? -1] ?? null) : null;
  let host = '';
  try {
    if (ch) host = new URL(ch.url).host;
  } catch {
    host = '';
  }

  const rows: [string, string][] = [
    ['state', playState],
    ['live', isLive ? 'yes' : 'no'],
    ['bitrate', bitrate ? `${Math.round(bitrate / 1000)} kbps` : '—'],
    ['level', currentLevel === 'auto' ? 'auto' : String(currentLevel)],
    ['levels', String(levels.length)],
    ['tvg-id', ch?.tvgId ?? '—'],
    ['host', host || '—'],
  ];

  return (
    <div className="glass-control absolute right-4 top-16 z-30 w-60 rounded-lg border border-border p-3 font-mono text-[11px] animate-in">
      <div className="mb-2 flex items-center justify-between">
        <span className="eyebrow">Stream stats</span>
        <button type="button" aria-label="Close stats" onClick={toggle} className="text-dim hover:text-fg">
          <X size={13} />
        </button>
      </div>
      <dl className="space-y-1">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-3">
            <dt className="text-dim">{k}</dt>
            <dd className="truncate text-fg" title={v}>
              {v}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
