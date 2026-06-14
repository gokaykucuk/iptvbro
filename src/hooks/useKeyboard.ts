import { useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { getFilteredIndices } from '@/store/selectors';
import { positionOfId } from '@/lib/zap';
import { playerApi } from '@/player/api';

/**
 * Global keyboard layer. Mount once. Handles zapping, transport, search focus,
 * number-entry channel jump, favorites, layout, cinema, and overlay dismissal.
 */
export function useKeyboard(): void {
  const numberBuf = useRef('');
  const numberTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useStore.getState();
      const target = e.target as HTMLElement | null;
      const typing =
        !!target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);
      const anyModal = s.commandOpen || s.settingsOpen || s.helpOpen;

      if (e.key === 'Escape') {
        if (s.commandOpen) return s.setCommandOpen(false);
        if (s.settingsOpen) return s.setSettingsOpen(false);
        if (s.helpOpen) return s.setHelpOpen(false);
        if (s.cinema) return s.setCinema(false);
        if (document.fullscreenElement) void document.exitFullscreen();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        s.setCommandOpen(!s.commandOpen);
        return;
      }

      if (typing || anyModal || e.metaKey || e.ctrlKey || e.altKey) return;
      // let focused buttons handle their own activation keys
      if (target?.tagName === 'BUTTON' && (e.key === ' ' || e.key === 'Enter')) return;

      const api = playerApi.current;
      const cat = s.catalog;
      const filtered = getFilteredIndices();

      const zapTo = (delta: number) => {
        if (!cat || !filtered.length) return;
        const cur =
          s.selectionIndex >= 0 && s.selectionIndex < filtered.length
            ? s.selectionIndex
            : positionOfId(filtered, cat, s.currentChannelId);
        const len = filtered.length;
        const start = cur < 0 ? (delta > 0 ? -1 : 0) : cur;
        const next = (((start + delta) % len) + len) % len;
        const ch = cat.channels[filtered[next]];
        s.setSelectionIndex(next);
        s.setCurrentChannel(ch.id);
        s.pushRecent(ch.id);
      };

      switch (e.key) {
        case '/':
          e.preventDefault();
          document.getElementById('global-search')?.focus();
          return;
        case '?':
          e.preventDefault();
          s.setHelpOpen(true);
          return;
        case ' ':
          e.preventDefault();
          api?.togglePlay();
          return;
        case 'ArrowDown':
          e.preventDefault();
          zapTo(1);
          return;
        case 'ArrowUp':
          e.preventDefault();
          zapTo(-1);
          return;
        case 'Enter':
          if (cat && s.selectionIndex >= 0 && s.selectionIndex < filtered.length) {
            const ch = cat.channels[filtered[s.selectionIndex]];
            s.setCurrentChannel(ch.id);
            s.pushRecent(ch.id);
          }
          return;
      }

      if (/^[0-9]$/.test(e.key)) {
        numberBuf.current += e.key;
        if (numberTimer.current) window.clearTimeout(numberTimer.current);
        numberTimer.current = window.setTimeout(() => {
          const n = parseInt(numberBuf.current, 10);
          numberBuf.current = '';
          if (cat && n >= 1 && n <= filtered.length) {
            const ch = cat.channels[filtered[n - 1]];
            s.setSelectionIndex(n - 1);
            s.setCurrentChannel(ch.id);
            s.pushRecent(ch.id);
          }
        }, 800);
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'm':
          api?.toggleMute();
          return;
        case 'f':
          api?.toggleFullscreen();
          return;
        case 'p':
          api?.togglePiP();
          return;
        case 'g':
          s.setGridMode(s.gridMode === 'list' ? 'grid' : 'list');
          return;
        case 'c':
          s.setCinema(!s.cinema);
          return;
        case 'l':
        case 's':
          if (s.currentChannelId) s.toggleFavorite(s.currentChannelId);
          return;
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
