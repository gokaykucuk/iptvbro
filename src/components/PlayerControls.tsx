import { useState } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  Minimize,
  PictureInPicture2,
  Radio,
  SlidersHorizontal,
  Check,
} from 'lucide-react';
import type { PlayerApi } from '@/player/useHlsPlayer';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/cn';
import { IconButton } from './ui/IconButton';

interface PlayerControlsProps {
  controls: PlayerApi;
  visible: boolean;
}

/** Bottom transport row: play, volume, go-to-live, quality, PiP, fullscreen. */
export function PlayerControls({ controls, visible }: PlayerControlsProps) {
  const playState = useStore((s) => s.playState);
  const muted = useStore((s) => s.muted);
  const volume = useStore((s) => s.volume);
  const isLive = useStore((s) => s.isLive);
  const isFullscreen = useStore((s) => s.isFullscreen);
  const isPiP = useStore((s) => s.isPiP);
  const levels = useStore((s) => s.levels);
  const currentLevel = useStore((s) => s.currentLevel);
  const [levelMenu, setLevelMenu] = useState(false);

  const playing = playState === 'playing' || playState === 'buffering';
  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div
      className={cn(
        'glass-control absolute inset-x-0 bottom-0 z-30 flex h-14 items-center gap-2 px-4 transition-opacity duration-200',
        visible ? 'opacity-100' : 'pointer-events-none opacity-0',
      )}
    >
      <IconButton
        label={playing ? 'Pause' : 'Play'}
        onClick={controls.togglePlay}
        size="md"
        tip={false}
        className="text-fg hover:text-fg"
      >
        {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
      </IconButton>

      <div className="group flex items-center gap-1">
        <IconButton label={muted ? 'Unmute' : 'Mute'} onClick={controls.toggleMute} size="md" tip={false}>
          <VolumeIcon size={18} />
        </IconButton>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={muted ? 0 : volume}
          onChange={(e) => controls.setVolume(Number(e.target.value))}
          aria-label="Volume"
          className="h-1 w-0 cursor-pointer accent-accent opacity-0 transition-all duration-200 group-hover:w-20 group-hover:opacity-100 focus-visible:w-20 focus-visible:opacity-100"
        />
      </div>

      <button
        type="button"
        onClick={controls.goLive}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition-colors',
          isLive
            ? 'text-muted hover:text-fg'
            : 'bg-accent-soft text-accent hover:bg-accent hover:text-accent-contrast',
        )}
        aria-label="Go to live edge"
      >
        <Radio size={13} />
        {isLive ? 'Live' : 'Go live'}
      </button>

      <div className="ml-auto flex items-center gap-1">
        {levels.length > 1 && (
          <div className="relative">
            <IconButton
              label="Quality"
              onClick={() => setLevelMenu((v) => !v)}
              active={levelMenu}
              size="md"
              tip={false}
            >
              <SlidersHorizontal size={17} />
            </IconButton>
            {levelMenu && (
              <div
                className="absolute bottom-full right-0 mb-2 w-36 overflow-hidden rounded-lg border border-border bg-surface shadow-[var(--shadow-deep)] animate-in"
                onMouseLeave={() => setLevelMenu(false)}
              >
                <LevelItem
                  label="Auto"
                  active={currentLevel === 'auto'}
                  onClick={() => {
                    controls.setLevel('auto');
                    setLevelMenu(false);
                  }}
                />
                {levels
                  .slice()
                  .sort((a, b) => (b.height ?? 0) - (a.height ?? 0))
                  .map((lvl) => (
                    <LevelItem
                      key={lvl.index}
                      label={lvl.height ? `${lvl.height}p` : `Level ${lvl.index + 1}`}
                      active={currentLevel === lvl.index}
                      onClick={() => {
                        controls.setLevel(lvl.index);
                        setLevelMenu(false);
                      }}
                    />
                  ))}
              </div>
            )}
          </div>
        )}
        <IconButton label="Picture in picture" onClick={controls.togglePiP} active={isPiP} size="md" tip={false}>
          <PictureInPicture2 size={17} />
        </IconButton>
        <IconButton
          label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          onClick={controls.toggleFullscreen}
          size="md"
          tip={false}
        >
          {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
        </IconButton>
      </div>
    </div>
  );
}

function LevelItem({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between px-3 py-2 text-left text-[12px] hover:bg-hover',
        active ? 'text-accent' : 'text-muted',
      )}
    >
      <span className="font-mono">{label}</span>
      {active && <Check size={14} />}
    </button>
  );
}
