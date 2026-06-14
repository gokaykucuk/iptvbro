/** A learned vocabulary card, persisted in IndexedDB and reviewed via spaced repetition. */
export interface LearnCard {
  /** `${lang}:${word.toLowerCase()}` — stable identity, dedupes repeats. */
  id: string;
  word: string;
  /** Subtitle/source language code if known, else 'auto'. */
  lang: string;
  /** Language the explanation is written in (the user's base language). */
  baseLanguage: string;
  /** The subtitle line the word was clicked in. */
  sentence: string;
  /** The LLM-generated explanation (markdown). */
  explanation: string;
  createdAt: number;
  // --- SM-2-lite spaced repetition ---
  due: number;
  interval: number; // days
  ease: number;
  reps: number;
}

/** A clicked subtitle word + where it sits on screen (for popup placement). */
export interface WordSelection {
  word: string;
  sentence: string;
  lang: string;
  wasPlaying: boolean;
  rect: { left: number; top: number; right: number; bottom: number; width: number; height: number };
}

export type Grade = 'again' | 'good' | 'easy';
