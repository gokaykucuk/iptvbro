import { useEffect, useRef } from 'react';
import { Play } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useHlsPlayer } from '@/player/useHlsPlayer';
import { playerApi } from '@/player/api';
import { useIdle } from '@/hooks/useIdle';
import { AmbientWash } from './AmbientWash';
import { TopBadges } from './TopBadges';
import { ChannelInfoOverlay } from './ChannelInfoOverlay';
import { PlayerControls } from './PlayerControls';
import { PlayerErrorState } from './PlayerErrorState';
import { ZapFlashCard } from './ZapFlashCard';
import { StreamStats } from './StreamStats';
import { SubtitleOverlay } from './SubtitleOverlay';
import { WordPopup } from './WordPopup';
import { ProgressLine } from './ui/ProgressLine';

/** The hero stage: owns the single persistent <video> and all player chrome. */
export function PlayerStage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const api = useHlsPlayer(videoRef, containerRef);
  const { idle, wake } = useIdle(2800);

  const currentId = useStore((s) => s.currentChannelId);
  const playState = useStore((s) => s.playState);
  const playerError = useStore((s) => s.playerError);

  useEffect(() => {
    playerApi.current = api;
    return () => {
      if (playerApi.current === api) playerApi.current = null;
    };
  }, [api]);

  const paused = playState === 'paused';
  const loading = playState === 'loading' || playState === 'buffering';
  const chromeVisible = !idle || paused || !!playerError || !currentId;

  return (
    <div
      ref={containerRef}
      onMouseMove={wake}
      className="relative h-full w-full overflow-hidden bg-letterbox"
    >
      <AmbientWash />
      <video
        ref={videoRef}
        playsInline
        autoPlay
        muted
        onClick={() => api.togglePlay()}
        className="absolute inset-0 z-10 h-full w-full bg-transparent object-contain"
      />
      <ProgressLine active={loading} />

      {!currentId && (
        <div className="absolute inset-0 z-10 grid place-items-center px-6 text-center">
          <div>
            <p className="text-sm text-muted">Select a channel to start watching</p>
            <p className="mt-1.5 text-[12px] text-dim">
              ↑ ↓ to zap · <span className="font-mono">/</span> to search ·{' '}
              <span className="font-mono">⌘K</span> for the command palette
            </p>
          </div>
        </div>
      )}

      {currentId && (
        <>
          <TopBadges visible={chromeVisible} />
          <div className="pointer-events-none absolute inset-x-0 bottom-14 z-20">
            <ChannelInfoOverlay visible={chromeVisible} />
          </div>
          <PlayerControls controls={api} visible={chromeVisible} />
          {paused && !playerError && (
            <button
              type="button"
              aria-label="Play"
              onClick={() => api.togglePlay()}
              className="absolute inset-0 z-20 grid place-items-center"
            >
              <span className="glass-control grid h-16 w-16 place-items-center rounded-full text-fg">
                <Play size={28} fill="currentColor" />
              </span>
            </button>
          )}
        </>
      )}

      {currentId && <SubtitleOverlay videoRef={videoRef} chromeVisible={chromeVisible} />}
      <ZapFlashCard />
      <StreamStats />
      <PlayerErrorState controls={api} />
      <WordPopup />
    </div>
  );
}
