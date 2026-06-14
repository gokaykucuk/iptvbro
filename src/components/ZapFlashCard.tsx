import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/store/useStore';
import { getFilteredIndices } from '@/store/selectors';
import { positionOfId } from '@/lib/zap';
import { LazyLogo } from '@/components/LazyLogo';
import { codeToFlag } from '@/lib/format';

/**
 * Large translucent "channel landed" card that flashes for ~1.2s after a zap.
 * Driven by store.zapToken: each increment (with a current channel) reveals the
 * card, then a 1200ms timeout hides it. Never fires on first mount (token 0).
 */
export function ZapFlashCard() {
  const zapToken = useStore((s) => s.zapToken);
  const currentChannelId = useStore((s) => s.currentChannelId);
  const catalog = useStore((s) => s.catalog);

  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (zapToken === 0 || !currentChannelId) return;
    setVisible(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setVisible(false), 1200);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [zapToken, currentChannelId]);

  const channel =
    currentChannelId && catalog
      ? catalog.channels[catalog.byId.get(currentChannelId) ?? -1] ?? null
      : null;

  if (!visible || !channel || !catalog) return null;

  const position = positionOfId(getFilteredIndices(), catalog, channel.id);
  const flag = channel.countryFlag ?? codeToFlag(channel.countryCode);
  const country = channel.countryName ?? channel.countryCode;

  return (
    <div className="absolute inset-0 grid place-items-center pointer-events-none z-30">
      <div
        className="glass-control rounded-xl px-6 py-5 animate-pop flex items-center gap-4 shadow-[var(--shadow-deep)]"
        role="status"
        aria-live="polite"
      >
        {position >= 0 && (
          <span className="font-mono tnum text-3xl text-fg">{position + 1}</span>
        )}
        <LazyLogo
          src={channel.logo}
          name={channel.name}
          className="h-12 w-16 rounded-md shrink-0"
          fontPx={16}
        />
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-fg font-medium text-lg truncate">{channel.name}</span>
          {(flag || country) && (
            <span className="text-muted text-[12px] flex items-center gap-1.5">
              {flag && <span aria-hidden="true">{flag}</span>}
              {country && <span className="truncate">{country}</span>}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
