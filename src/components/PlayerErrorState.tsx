import { RotateCw, SkipForward, ShieldCheck, WifiOff, Globe, MonitorX, AlertTriangle } from 'lucide-react';
import type { PlayerErrorKind } from '@/types';
import type { PlayerApi } from '@/player/useHlsPlayer';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/cn';

interface PlayerErrorStateProps {
  controls: PlayerApi;
}

const META: Record<
  PlayerErrorKind,
  { title: string; icon: typeof WifiOff; tone: 'dead' | 'geo' | 'proxy' | 'muted'; suggestProxy: boolean }
> = {
  dead: { title: 'Stream offline', icon: MonitorX, tone: 'dead', suggestProxy: false },
  geo: { title: 'Geo-blocked', icon: Globe, tone: 'geo', suggestProxy: false },
  cors: { title: 'Blocked by the stream', icon: ShieldCheck, tone: 'proxy', suggestProxy: true },
  mixed: { title: 'Insecure stream', icon: ShieldCheck, tone: 'proxy', suggestProxy: true },
  proxy: { title: 'Needs the proxy', icon: ShieldCheck, tone: 'proxy', suggestProxy: true },
  network: { title: 'Connection problem', icon: WifiOff, tone: 'muted', suggestProxy: true },
  media: { title: 'Playback error', icon: AlertTriangle, tone: 'muted', suggestProxy: false },
  unknown: { title: 'Cannot play', icon: AlertTriangle, tone: 'muted', suggestProxy: false },
};

const TONE_TEXT = { dead: 'text-dead', geo: 'text-geo', proxy: 'text-proxy', muted: 'text-muted' };
const TONE_BG = { dead: 'bg-dead/10', geo: 'bg-geo/10', proxy: 'bg-proxy/10', muted: 'bg-surface-2' };

/** Designed in-surface error card. The layout never reflows on failure. */
export function PlayerErrorState({ controls }: PlayerErrorStateProps) {
  const error = useStore((s) => s.playerError);
  const proxyEnabled = useStore((s) => s.proxyEnabled);
  const setProxyEnabled = useStore((s) => s.setProxyEnabled);
  if (!error) return null;

  const meta = META[error.kind];
  const Icon = meta.icon;
  const showProxy = meta.suggestProxy && !proxyEnabled;

  return (
    <div className="absolute inset-0 z-40 grid place-items-center bg-letterbox/80 p-6 backdrop-blur-sm animate-in">
      <div className="flex max-w-sm flex-col items-center gap-3 rounded-xl border border-border bg-surface/90 p-6 text-center shadow-[var(--shadow-deep)]">
        <div className={cn('grid h-12 w-12 place-items-center rounded-full', TONE_BG[meta.tone])}>
          <Icon size={22} className={TONE_TEXT[meta.tone]} />
        </div>
        <h3 className="text-[15px] font-medium text-fg">{meta.title}</h3>
        <p className="text-[12px] leading-relaxed text-muted">{error.message}</p>
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={controls.retry}
            className="inline-flex items-center gap-1.5 rounded-md bg-surface-2 px-3 py-2 text-[12px] text-fg transition-colors hover:bg-hover"
          >
            <RotateCw size={14} /> Retry
          </button>
          <button
            type="button"
            onClick={() => controls.zapBy(1)}
            className="inline-flex items-center gap-1.5 rounded-md bg-surface-2 px-3 py-2 text-[12px] text-fg transition-colors hover:bg-hover"
          >
            <SkipForward size={14} /> Next channel
          </button>
          {showProxy && (
            <button
              type="button"
              onClick={() => {
                setProxyEnabled(true);
                controls.retry();
              }}
              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-[12px] font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
            >
              <ShieldCheck size={14} /> Enable proxy
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
