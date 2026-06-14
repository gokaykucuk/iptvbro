import { memo } from 'react';
import { Star } from 'lucide-react';
import type { Channel, HealthStatus } from '@/types';
import { cn } from '@/lib/cn';
import { codeToFlag } from '@/lib/format';
import { LazyLogo } from './LazyLogo';
import { HealthBadge } from './ui/HealthBadge';
import { QualityPill } from './ui/Pill';

export interface ChannelRowProps {
  channel: Channel;
  index: number;
  playing: boolean;
  selected: boolean;
  favorite: boolean;
  health: HealthStatus;
  /** Stable handlers (identity-stable) so React.memo can skip unchanged rows. */
  onSelect: (id: string, index: number) => void;
  onToggleFavorite: (id: string) => void;
}

/** A compact, dense list row. The whole row tunes the player; the star toggles favorite. */
export const ChannelRow = memo(function ChannelRow({
  channel,
  index,
  playing,
  selected,
  favorite,
  health,
  onSelect,
  onToggleFavorite,
}: ChannelRowProps) {
  const flag = channel.countryFlag || codeToFlag(channel.countryCode);
  const place = channel.countryName || channel.countryCode?.toUpperCase();
  const quality = channel.resolution || channel.quality;

  return (
    <div
      role="option"
      aria-selected={selected}
      tabIndex={-1}
      onClick={() => onSelect(channel.id, index)}
      className={cn(
        'group flex h-full cursor-pointer items-center gap-2.5 border-l-2 border-transparent px-3 transition-colors',
        playing ? 'border-accent bg-accent-soft' : selected ? 'bg-surface-2' : 'hover:bg-hover',
        health === 'dead' && !playing && 'opacity-45',
      )}
    >
      <LazyLogo src={channel.logo} name={channel.cleanName} className="h-9 w-9 rounded-md" fontPx={11} />

      <div className="min-w-0 flex-1">
        <div
          className={cn(
            'truncate text-[13px] font-medium leading-tight',
            playing ? 'text-accent' : 'text-fg',
          )}
        >
          {channel.cleanName}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-muted">
          {flag && <span aria-hidden>{flag}</span>}
          {place && <span className="truncate">{place}</span>}
          {channel.group[0] && (
            <>
              <span className="text-dim">·</span>
              <span className="truncate">{channel.group[0]}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {quality && <QualityPill label={quality} className="hidden sm:inline-flex" />}
        <HealthBadge status={health} />
        <button
          type="button"
          aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
          aria-pressed={favorite}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(channel.id);
          }}
          className={cn(
            'inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors',
            favorite
              ? 'text-accent'
              : 'text-dim opacity-0 hover:bg-hover hover:text-fg focus-visible:opacity-100 group-hover:opacity-100',
          )}
        >
          <Star size={15} fill={favorite ? 'currentColor' : 'none'} />
        </button>
      </div>
    </div>
  );
});
