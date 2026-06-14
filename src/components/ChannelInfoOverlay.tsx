import { Star } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { IconButton } from '@/components/ui/IconButton';
import { Pill, QualityPill } from '@/components/ui/Pill';
import { LazyLogo } from '@/components/LazyLogo';
import { codeToFlag } from '@/lib/format';
import { cn } from '@/lib/cn';

/** Bottom now-playing strip rendered inside the player stage. Parent positions it. */
export function ChannelInfoOverlay({ visible }: { visible: boolean }) {
  const id = useStore((s) => s.currentChannelId);
  const catalog = useStore((s) => s.catalog);
  const favorites = useStore((s) => s.favorites);
  const toggleFavorite = useStore((s) => s.toggleFavorite);

  const channel = id && catalog ? catalog.channels[catalog.byId.get(id) ?? -1] ?? null : null;
  if (!channel) return null;

  const isFavorite = favorites.includes(channel.id);
  const flag = channel.countryFlag || codeToFlag(channel.countryCode);
  const region = channel.countryName || channel.countryCode;
  const qualityLabel = channel.resolution || channel.quality;

  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-x-0 bottom-0 z-20 px-5 pb-4 pt-16',
        'bg-gradient-to-t from-black/80 via-black/40 to-transparent',
        'transition-[opacity,transform] duration-200 ease-out',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
      )}
    >
      <div className="pointer-events-auto flex items-end gap-3">
        <LazyLogo
          src={channel.logo}
          name={channel.name}
          className="h-12 w-16 rounded-md bg-letterbox"
          fontPx={13}
        />

        <div className="min-w-0">
          <div className="truncate text-[15px] font-medium text-fg">{channel.name}</div>
          <div className="flex min-w-0 items-center gap-2 truncate text-[12px] text-muted">
            {(flag || region) && (
              <span className="flex shrink-0 items-center gap-1">
                {flag && <span aria-hidden>{flag}</span>}
                {region && <span>{region}</span>}
              </span>
            )}
            {channel.group.slice(0, 3).map((g) => (
              <Pill key={g} variant="default">
                {g}
              </Pill>
            ))}
            {qualityLabel && <QualityPill label={qualityLabel} />}
            {channel.geoBlocked && <Pill variant="geo">Geo</Pill>}
            {channel.not247 && <Pill variant="default">Not 24/7</Pill>}
          </div>
        </div>

        <div className="ml-auto shrink-0">
          <IconButton
            label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            active={isFavorite}
            tipSide="top"
            onClick={() => toggleFavorite(channel.id)}
          >
            <Star size={16} className={isFavorite ? 'fill-current' : undefined} />
          </IconButton>
        </div>
      </div>
    </div>
  );
}
