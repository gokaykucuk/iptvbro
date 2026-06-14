import { BarChart3, Settings } from 'lucide-react';
import { Pill, QualityPill } from '@/components/ui/Pill';
import { IconButton } from '@/components/ui/IconButton';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/cn';

/** Top overlay row inside the player stage: live/quality/bitrate badges + stream controls. */
export function TopBadges({ visible }: { visible: boolean }) {
  const currentChannelId = useStore((s) => s.currentChannelId);
  const catalog = useStore((s) => s.catalog);
  const playState = useStore((s) => s.playState);
  const bitrate = useStore((s) => s.bitrate);
  const isLive = useStore((s) => s.isLive);
  const showStats = useStore((s) => s.showStats);
  const toggleStats = useStore((s) => s.toggleStats);
  const setSettingsOpen = useStore((s) => s.setSettingsOpen);

  const channel =
    currentChannelId && catalog
      ? catalog.channels[catalog.byId.get(currentChannelId) ?? -1] ?? null
      : null;

  const resolution = channel ? channel.resolution ?? channel.quality : undefined;

  return (
    <div
      className={cn(
        'absolute inset-x-0 top-0 z-20 flex items-start justify-between px-5 pt-4 pb-10',
        'bg-gradient-to-b from-black/60 to-transparent transition-opacity duration-200 ease-out',
        visible ? 'opacity-100' : 'pointer-events-none opacity-0',
      )}
    >
      {channel ? (
        <div className="flex items-center gap-2">
          {playState === 'playing' && isLive ? (
            <Pill variant="accent">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" aria-hidden="true" />
              LIVE
            </Pill>
          ) : null}
          {resolution ? <QualityPill label={resolution} /> : null}
          {bitrate > 0 ? (
            <span className="font-mono text-[11px] tabular-nums text-muted">
              {Math.round(bitrate / 1000)} kbps
            </span>
          ) : null}
        </div>
      ) : (
        <div />
      )}

      <div className="flex items-center gap-1">
        <IconButton
          label="Stream stats"
          size="sm"
          active={showStats}
          onClick={() => toggleStats()}
          className="glass-control rounded-md"
        >
          <BarChart3 size={16} />
        </IconButton>
        <IconButton
          label="Settings"
          size="sm"
          onClick={() => setSettingsOpen(true)}
          className="glass-control rounded-md"
        >
          <Settings size={16} />
        </IconButton>
      </div>
    </div>
  );
}
