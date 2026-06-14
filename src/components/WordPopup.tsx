import { useEffect, useRef, useState } from 'react';
import { X, Loader2, Sparkles, Check } from 'lucide-react';
import { useLearningStore } from '@/learning/store';
import { explainWord } from '@/learning/openai';
import { playerApi } from '@/player/api';
import { useStore } from '@/store/useStore';
import { Markdown } from './Markdown';

const WIDTH = 360;
const HEIGHT = 408;

type Status = 'streaming' | 'done' | 'error';

/**
 * Streaming word-explanation popup. Fixed dimensions + internal scroll so it
 * never resizes/reflows while tokens stream in. Saves a flashcard on completion.
 */
export function WordPopup() {
  const selection = useLearningStore((s) => s.selection);
  const closeWord = useLearningStore((s) => s.closeWord);
  const apiKey = useLearningStore((s) => s.apiKey);
  const model = useLearningStore((s) => s.model);
  const baseLanguage = useLearningStore((s) => s.baseLanguage);
  const upsertCard = useLearningStore((s) => s.upsertCard);
  const setSettingsOpen = useStore((s) => s.setSettingsOpen);

  const [text, setText] = useState('');
  const [status, setStatus] = useState<Status>('streaming');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const word = selection?.word ?? '';
  const sentence = selection?.sentence ?? '';

  // Stream the explanation whenever a new word is selected.
  useEffect(() => {
    if (!selection) return;
    setText('');
    setError('');
    setSaved(false);
    if (!apiKey) {
      setStatus('error');
      setError('Add your OpenAI API key in Settings → Learning to get explanations.');
      return;
    }
    setStatus('streaming');
    const ctrl = new AbortController();
    let acc = '';
    (async () => {
      try {
        for await (const delta of explainWord({ word, sentence, baseLanguage, apiKey, model, signal: ctrl.signal })) {
          acc += delta;
          setText(acc);
        }
        setStatus('done');
        if (acc.trim()) {
          await upsertCard({
            id: `${selection.lang}:${word.toLowerCase()}`,
            word,
            lang: selection.lang,
            sentence,
            explanation: acc,
            baseLanguage,
          });
          setSaved(true);
        }
      } catch (e) {
        if ((e as Error)?.name !== 'AbortError') {
          setStatus('error');
          setError((e as Error)?.message || 'Request failed.');
        }
      }
    })();
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word, sentence]);

  // Auto-scroll as content streams.
  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [text]);

  const close = () => {
    const resume = selection?.wasPlaying;
    closeWord();
    if (resume) playerApi.current?.play();
  };

  // Esc closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!selection) return null;

  // Position the card above the clicked word, clamped to the viewport.
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const r = selection.rect;
  const placeAbove = r.top > HEIGHT + 16;
  const top = placeAbove ? Math.max(8, r.top - HEIGHT - 10) : Math.min(vh - HEIGHT - 8, r.bottom + 10);
  const left = Math.min(Math.max(8, r.left + r.width / 2 - WIDTH / 2), vw - WIDTH - 8);

  return (
    <>
      <div className="fixed inset-0 z-[85]" onClick={close} />
      <div
        role="dialog"
        aria-label={`About “${word}”`}
        className="fixed z-[86] flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--shadow-deep)] animate-pop"
        style={{ left, top, width: WIDTH, height: HEIGHT }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Sparkles size={15} className="shrink-0 text-accent" />
          <span className="truncate font-medium text-fg">{word}</span>
          {status === 'streaming' && <Loader2 size={14} className="shrink-0 animate-spin text-dim" />}
          {saved && (
            <span className="flex shrink-0 items-center gap-1 text-[10px] text-alive">
              <Check size={11} /> saved
            </span>
          )}
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            className="ml-auto shrink-0 text-dim transition-colors hover:text-fg"
          >
            <X size={16} />
          </button>
        </div>

        <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-2 text-[13px] leading-relaxed text-muted">
          {status === 'error' ? (
            <div className="space-y-2">
              <p className="text-[13px] text-dead">{error}</p>
              {!apiKey && (
                <button
                  type="button"
                  onClick={() => {
                    close();
                    setSettingsOpen(true);
                  }}
                  className="rounded-md bg-accent px-3 py-1.5 text-[12px] font-medium text-accent-contrast hover:bg-accent-hover"
                >
                  Open Learning settings
                </button>
              )}
            </div>
          ) : text ? (
            <Markdown text={text} />
          ) : (
            <p className="text-dim">Thinking…</p>
          )}
        </div>
      </div>
    </>
  );
}
