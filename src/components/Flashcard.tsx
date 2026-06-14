import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useLearningStore } from '@/learning/store';
import { Markdown } from './Markdown';

/** Spaced-repetition flashcard that surfaces periodically to review learned words. */
export function Flashcard() {
  const card = useLearningStore((s) => s.flashcard);
  const gradeCard = useLearningStore((s) => s.gradeCard);
  const close = useLearningStore((s) => s.closeFlashcard);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setRevealed(false);
  }, [card?.id]);

  if (!card) return null;

  return (
    <div className="animate-rise fixed bottom-4 left-4 z-[70] flex w-80 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--shadow-deep)]">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <span className="eyebrow">Review</span>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={close}
          className="ml-auto text-dim transition-colors hover:text-fg"
        >
          <X size={14} />
        </button>
      </div>

      <div className="px-3 py-3">
        <div className="text-lg font-medium text-fg">{card.word}</div>
        {card.sentence && <div className="mt-1 text-[12px] italic text-muted">“{card.sentence}”</div>}
        {revealed && (
          <div className="mt-3 max-h-52 overflow-y-auto border-t border-border pt-2 text-[12px] text-muted">
            <Markdown text={card.explanation} />
          </div>
        )}
      </div>

      <div className="flex gap-1.5 border-t border-border p-2">
        {!revealed ? (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="h-8 w-full rounded-md bg-surface-2 text-[12px] text-fg transition-colors hover:bg-hover"
          >
            Show answer
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => gradeCard(card.id, 'again')}
              className="h-8 flex-1 rounded-md bg-surface-2 text-[12px] text-dead transition-colors hover:bg-hover"
            >
              Again
            </button>
            <button
              type="button"
              onClick={() => gradeCard(card.id, 'good')}
              className="h-8 flex-1 rounded-md bg-surface-2 text-[12px] text-fg transition-colors hover:bg-hover"
            >
              Good
            </button>
            <button
              type="button"
              onClick={() => gradeCard(card.id, 'easy')}
              className="h-8 flex-1 rounded-md bg-accent text-[12px] font-medium text-accent-contrast transition-colors hover:bg-accent-hover"
            >
              Easy
            </button>
          </>
        )}
      </div>
    </div>
  );
}
