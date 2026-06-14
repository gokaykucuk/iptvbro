import { useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { useKeyboard } from '@/hooks/useKeyboard';
import { NavRail } from '@/components/NavRail';
import { CommandBar } from '@/components/CommandBar';
import { FilterRail } from '@/components/FilterRail';
import { AppliedFilterBar } from '@/components/AppliedFilterBar';
import { ChannelList } from '@/components/ChannelList';
import { PlayerStage } from '@/components/PlayerStage';
import { PlaylistLoader } from '@/components/PlaylistLoader';
import { SkeletonGrid } from '@/components/SkeletonGrid';
import { CommandPalette } from '@/components/CommandPalette';
import { SettingsSheet } from '@/components/SettingsSheet';
import { KeyboardHelp } from '@/components/KeyboardHelp';
import { Flashcard } from '@/components/Flashcard';
import { useLearningStore } from '@/learning/store';

export default function App() {
  const theme = useStore((s) => s.theme);
  const catalog = useStore((s) => s.catalog);
  const parseStatus = useStore((s) => s.parseStatus);
  const cinema = useStore((s) => s.cinema);
  const gridMode = useStore((s) => s.gridMode);
  const setCurrentChannel = useStore((s) => s.setCurrentChannel);
  const loadUrl = useStore((s) => s.loadUrl);
  const flashcardsEnabled = useLearningStore((s) => s.flashcardsEnabled);
  const flashcardIntervalMin = useLearningStore((s) => s.flashcardIntervalMin);
  const didBoot = useRef(false);

  useKeyboard();

  // Load saved flashcards from IndexedDB on startup.
  useEffect(() => {
    void useLearningStore.getState().loadCards();
  }, []);

  // Periodically surface a due flashcard for review (when not mid-interaction).
  useEffect(() => {
    if (!flashcardsEnabled) return;
    const id = window.setInterval(
      () => {
        const ls = useLearningStore.getState();
        if (ls.selection || ls.flashcard) return;
        const due = ls.dueCards();
        if (due.length) ls.showFlashcard(due[0]);
      },
      Math.max(1, flashcardIntervalMin) * 60_000,
    );
    return () => window.clearInterval(id);
  }, [flashcardsEnabled, flashcardIntervalMin]);

  // Apply the theme to <html> so the CSS custom properties switch.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Auto-resume the most recent playlist on startup (served instantly from the
  // IndexedDB cache), so reopening the app drops you straight back in.
  useEffect(() => {
    if (didBoot.current) return;
    const s = useStore.getState();
    if (!s.catalog && s.parseStatus === 'idle') {
      const last = s.savedPlaylists.find((p) => p.url);
      if (last?.url) {
        didBoot.current = true;
        void loadUrl(last.url, last.name);
      }
    }
  }, [loadUrl]);

  // Resume the last-watched channel once a catalog containing it is ready.
  useEffect(() => {
    const s = useStore.getState();
    if (catalog && s.currentChannelId && s.playState === 'idle' && catalog.byId.has(s.currentChannelId)) {
      setCurrentChannel(s.currentChannelId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog]);

  if (!catalog) {
    return (
      <div className="grid h-full place-items-center bg-bg p-6">
        <PlaylistLoader />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full overflow-hidden bg-bg text-fg">
      {!cinema && <NavRail />}
      {!cinema && (
        <div className="hidden h-full w-[208px] shrink-0 lg:block">
          <FilterRail />
        </div>
      )}
      {!cinema && (
        <div className="flex h-full w-[340px] shrink-0 flex-col border-r border-border bg-surface">
          <CommandBar />
          <AppliedFilterBar />
          <div className="min-h-0 flex-1">
            {parseStatus === 'loading' ? <SkeletonGrid mode={gridMode} /> : <ChannelList />}
          </div>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <PlayerStage />
      </div>

      <CommandPalette />
      <SettingsSheet />
      <KeyboardHelp />
      <Flashcard />
    </div>
  );
}
