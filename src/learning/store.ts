import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Grade, LearnCard, WordSelection } from './types';
import { clearAllCards, deleteCard, getAllCards, putCard } from './cards';

const DAY = 86_400_000;

export interface NewCardInput {
  id: string;
  word: string;
  lang: string;
  sentence: string;
  explanation: string;
  baseLanguage: string;
}

interface LearningState {
  // settings (persisted to localStorage)
  apiKey: string;
  baseLanguage: string;
  model: string;
  flashcardsEnabled: boolean;
  flashcardIntervalMin: number;

  // cards (persisted in IndexedDB)
  cards: LearnCard[];
  cardsLoaded: boolean;
  cardsVersion: number;

  // ephemeral popups
  selection: WordSelection | null;
  flashcard: LearnCard | null;

  setApiKey: (v: string) => void;
  setBaseLanguage: (v: string) => void;
  setModel: (v: string) => void;
  setFlashcardsEnabled: (v: boolean) => void;
  setFlashcardIntervalMin: (n: number) => void;

  loadCards: () => Promise<void>;
  upsertCard: (input: NewCardInput) => Promise<void>;
  gradeCard: (id: string, grade: Grade) => Promise<void>;
  removeCard: (id: string) => Promise<void>;
  clearCards: () => Promise<void>;

  openWord: (s: WordSelection) => void;
  closeWord: () => void;
  showFlashcard: (c: LearnCard) => void;
  closeFlashcard: () => void;
  dueCards: () => LearnCard[];
}

export const useLearningStore = create<LearningState>()(
  persist(
    (set, get) => ({
      apiKey: '',
      baseLanguage: 'English',
      model: 'gpt-5.4-nano',
      flashcardsEnabled: true,
      flashcardIntervalMin: 6,

      cards: [],
      cardsLoaded: false,
      cardsVersion: 0,

      selection: null,
      flashcard: null,

      setApiKey: (apiKey) => set({ apiKey: apiKey.trim() }),
      setBaseLanguage: (baseLanguage) => set({ baseLanguage }),
      setModel: (model) => set({ model: model.trim() }),
      setFlashcardsEnabled: (flashcardsEnabled) => set({ flashcardsEnabled }),
      setFlashcardIntervalMin: (flashcardIntervalMin) =>
        set({ flashcardIntervalMin: Math.max(1, flashcardIntervalMin) }),

      loadCards: async () => {
        const cards = await getAllCards();
        cards.sort((a, b) => b.createdAt - a.createdAt);
        set((s) => ({ cards, cardsLoaded: true, cardsVersion: s.cardsVersion + 1 }));
      },

      upsertCard: async (input) => {
        const now = Date.now();
        const existing = get().cards.find((c) => c.id === input.id);
        const card: LearnCard = existing
          ? { ...existing, explanation: input.explanation, sentence: input.sentence, baseLanguage: input.baseLanguage }
          : { ...input, createdAt: now, due: now, interval: 0, ease: 2.3, reps: 0 };
        await putCard(card);
        set((s) => ({
          cards: [card, ...s.cards.filter((c) => c.id !== card.id)],
          cardsVersion: s.cardsVersion + 1,
        }));
      },

      gradeCard: async (id, grade) => {
        const card = get().cards.find((c) => c.id === id);
        if (!card) return;
        const now = Date.now();
        let { interval, ease, reps } = card;
        let due: number;
        if (grade === 'again') {
          reps = 0;
          interval = 0;
          ease = Math.max(1.3, ease - 0.2);
          due = now + 60_000;
        } else {
          if (grade === 'easy') ease += 0.15;
          reps += 1;
          if (reps === 1) interval = grade === 'easy' ? 4 : 1;
          else if (reps === 2) interval = grade === 'easy' ? 7 : 3;
          else interval = Math.max(1, Math.round(interval * ease * (grade === 'easy' ? 1.3 : 1)));
          due = now + interval * DAY;
        }
        const updated: LearnCard = { ...card, interval, ease, reps, due };
        await putCard(updated);
        set((s) => ({
          cards: s.cards.map((c) => (c.id === id ? updated : c)),
          cardsVersion: s.cardsVersion + 1,
          flashcard: null,
        }));
      },

      removeCard: async (id) => {
        await deleteCard(id);
        set((s) => ({ cards: s.cards.filter((c) => c.id !== id), cardsVersion: s.cardsVersion + 1 }));
      },

      clearCards: async () => {
        await clearAllCards();
        set((s) => ({ cards: [], cardsVersion: s.cardsVersion + 1, flashcard: null }));
      },

      openWord: (selection) => set({ selection }),
      closeWord: () => set({ selection: null }),
      showFlashcard: (flashcard) => set({ flashcard }),
      closeFlashcard: () => set({ flashcard: null }),
      dueCards: () => {
        const now = Date.now();
        return get().cards.filter((c) => c.due <= now);
      },
    }),
    {
      name: 'iptvbro-learning',
      partialize: (s) => ({
        apiKey: s.apiKey,
        baseLanguage: s.baseLanguage,
        model: s.model,
        flashcardsEnabled: s.flashcardsEnabled,
        flashcardIntervalMin: s.flashcardIntervalMin,
      }),
    },
  ),
);
