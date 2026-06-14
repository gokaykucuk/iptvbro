import { useEffect, useState, type MouseEvent as ReactMouseEvent, type RefObject } from 'react';
import { useStore } from '@/store/useStore';
import { useLearningStore } from '@/learning/store';
import { playerApi } from '@/player/api';
import { cn } from '@/lib/cn';

interface SubtitleOverlayProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  /** When the player chrome is showing, lift subtitles above it. */
  chromeVisible: boolean;
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, '');
}

function cleanWord(w: string): string {
  return w.replace(/^[^\p{L}\p{N}'’-]+|[^\p{L}\p{N}'’-]+$/gu, '');
}

/**
 * Custom subtitle renderer (replaces native cue drawing). It positions cues
 * ABOVE the control overlay and makes every word clickable for the learning
 * feature. Reads the active text track's cues via `cuechange`.
 */
export function SubtitleOverlay({ videoRef, chromeVisible }: SubtitleOverlayProps) {
  const currentSubtitle = useStore((s) => s.currentSubtitle);
  const openWord = useLearningStore((s) => s.openWord);
  const [text, setText] = useState('');
  const [lang, setLang] = useState('auto');

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentSubtitle) {
      setText('');
      return;
    }
    const update = () => {
      let t = '';
      let l = 'auto';
      for (const tt of Array.from(video.textTracks)) {
        if (tt.mode === 'disabled') continue;
        const cues = tt.activeCues;
        if (cues && cues.length) {
          t = Array.from(cues)
            .map((c) => (c as VTTCue).text ?? '')
            .join(' ');
          l = tt.language || 'auto';
          break;
        }
      }
      setText(stripTags(t).replace(/\s+/g, ' ').trim());
      setLang(l);
    };

    const tracks = video.textTracks;
    const onCue = () => update();
    for (const tt of Array.from(tracks)) tt.addEventListener('cuechange', onCue);
    const onAdd = () => {
      for (const tt of Array.from(tracks)) tt.addEventListener('cuechange', onCue);
      update();
    };
    tracks.addEventListener('addtrack', onAdd);
    update();
    // safety net for tracks whose cuechange doesn't fire reliably
    const poll = window.setInterval(update, 500);

    return () => {
      for (const tt of Array.from(tracks)) tt.removeEventListener('cuechange', onCue);
      tracks.removeEventListener('addtrack', onAdd);
      window.clearInterval(poll);
    };
  }, [videoRef, currentSubtitle]);

  if (!currentSubtitle || !text) return null;

  const onWord = (e: ReactMouseEvent<HTMLButtonElement>, raw: string) => {
    const word = cleanWord(raw);
    if (!word) return;
    const r = e.currentTarget.getBoundingClientRect();
    const video = videoRef.current;
    const wasPlaying = !!video && !video.paused;
    playerApi.current?.pause();
    openWord({
      word,
      sentence: text,
      lang,
      wasPlaying,
      rect: { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height },
    });
  };

  const tokens = text.split(/(\s+)/);

  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-x-0 z-[25] flex justify-center px-6 transition-[bottom] duration-200',
        chromeVisible ? 'bottom-[8.75rem]' : 'bottom-10',
      )}
    >
      <p className="pointer-events-auto max-w-3xl text-balance text-center text-[clamp(15px,2.3vw,26px)] font-medium leading-snug text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.95)]">
        {tokens.map((tok, i) =>
          /\S/.test(tok) ? (
            <button
              key={i}
              type="button"
              onClick={(e) => onWord(e, tok)}
              className="cursor-pointer rounded px-px align-baseline transition-colors hover:bg-accent hover:text-accent-contrast focus-visible:bg-accent focus-visible:text-accent-contrast focus-visible:outline-none"
            >
              {tok}
            </button>
          ) : (
            <span key={i}>{tok}</span>
          ),
        )}
      </p>
    </div>
  );
}
