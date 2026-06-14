import { memo } from 'react';
import { Star } from 'lucide-react';
import type { Channel, HealthStatus } from '@/types';
import { cn } from '@/lib/cn';
import { codeToFlag } from '@/lib/format';
import { LazyLogo } from './LazyLogo';
import { HealthBadge } from './ui/HealthBadge';

export interface ChannelCardProps {
  channel: Channel;
  index: number;
  playing: boolean;
  selected: boolean;
  favorite: boolean;
  health: HealthStatus;
  onSelect: (id: string, index: number) => void;
  onToggleFavorite: (id: string) => void;
}

/** A poster tile used in grid mode and for favorites/recents browsing. */
export const ChannelCard = memo(function ChannelCard({
  channel,
  index,
  playing,
  selected,
  favorite,
  health,
  onSelect,
  onToggleFavorite,
}: ChannelCardProps) {
  const flag = channel.countryFlag || codeToFlag(channel.countryCode);

  return (
    <div
      role="option"
      aria-selected={selected}
      onClick={() => onSelect(channel.id, index)}
      className={cn(
        'group relative flex cursor-pointer flex-col overflow-hidden rounded-lg border bg-surface-2 transition-all',
        playing ? 'border-accent ring-1 ring-accent' : 'border-border hover:-translate-y-0.5 hover:border-strong',
        selected && !playing && 'border-strong',
        health === 'dead' && !playing && 'opacity-50',
      )}
    >
      <div className="relative aspect-video w-full bg-letterbox">
        <LazyLogo src={channel.logo} name={channel.cleanName} className="h-full w-full" fontPx={18} />
        <div className="absolute left-1.5 top-1.5">
          <HealthBadge status={health} />
        </div>
        <button
          type="button"
          aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
          aria-pressed={favorite}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(channel.id);
          }}
          className={cn(
            'absolute right-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors',
            favorite
              ? 'text-accent'
              : 'text-white/70 opacity-0 hover:bg-black/40 hover:text-white focus-visible:opacity-100 group-hover:opacity-100',
          )}
        >
          <Star size={15} fill={favorite ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="flex items-center gap-1.5 px-2 py-1.5">
        {flag && <span aria-hidden className="text-[12px]">{flag}</span>}
        <span className={cn('truncate text-[11px] font-medium', playing ? 'text-accent' : 'text-fg')}>
          {channel.cleanName}
        </span>
      </div>
    </div>
  );
});
