import { useStore } from '@/store/useStore';
import { hueFromString } from '@/lib/format';

export function AmbientWash() {
  const id = useStore((s) => s.currentChannelId);
  const catalog = useStore((s) => s.catalog);
  const playState = useStore((s) => s.playState);

  const channel = id && catalog ? catalog.channels[catalog.byId.get(id) ?? -1] ?? null : null;

  const neutral = !channel || playState === 'error';
  const hue = neutral ? 0 : hueFromString(channel.cleanName);

  // A whisper of per-channel atmosphere — deliberately desaturated so it reads
  // as ambience, never as a second brand color competing with the cinema-red accent.
  const topLeft = neutral ? 'hsl(0 0% 50% / 0.05)' : `hsl(${hue} 26% 46% / 0.07)`;
  const bottomRight = neutral
    ? 'hsl(0 0% 45% / 0.04)'
    : `hsl(${(hue + 40) % 360} 22% 42% / 0.06)`;

  return (
    <div
      key={channel?.id ?? 'neutral'}
      aria-hidden="true"
      className="absolute inset-0 -z-0 pointer-events-none overflow-hidden"
      style={{ background: 'var(--color-bg)' }}
    >
      <div
        className="absolute -inset-1/4 transition-[background] duration-500 ease-out blur-3xl"
        style={{
          backgroundImage: `radial-gradient(60% 60% at 25% 20%, ${topLeft}, transparent 70%)`,
        }}
      />
      <div
        className="absolute -inset-1/4 transition-[background] duration-500 ease-out blur-3xl"
        style={{
          backgroundImage: `radial-gradient(60% 60% at 80% 85%, ${bottomRight}, transparent 70%)`,
        }}
      />
    </div>
  );
}
