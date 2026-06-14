import { Tv, Star, Clock, Keyboard, Settings, Play } from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';
import { useStore } from '@/store/useStore';

/** 56px vertical icon nav at the far left: brand mark, view switchers, and bottom utilities. */
export function NavRail() {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const setHelpOpen = useStore((s) => s.setHelpOpen);
  const setSettingsOpen = useStore((s) => s.setSettingsOpen);

  return (
    <nav
      aria-label="Primary"
      className="flex h-full w-14 flex-col items-center gap-1 border-r border-border bg-rail py-3"
    >
      <div
        aria-hidden="true"
        className="mb-2 flex h-7 w-7 items-center justify-center rounded-md bg-accent text-accent-contrast"
      >
        <Play size={16} fill="currentColor" strokeWidth={0} />
      </div>

      <IconButton
        label="All channels"
        size="lg"
        tipSide="right"
        active={view === 'all'}
        onClick={() => setView('all')}
      >
        <Tv size={18} />
      </IconButton>
      <IconButton
        label="Favorites"
        size="lg"
        tipSide="right"
        active={view === 'favorites'}
        onClick={() => setView('favorites')}
      >
        <Star size={18} />
      </IconButton>
      <IconButton
        label="Recently watched"
        size="lg"
        tipSide="right"
        active={view === 'recents'}
        onClick={() => setView('recents')}
      >
        <Clock size={18} />
      </IconButton>

      <div className="mt-auto" />

      <IconButton label="Keyboard shortcuts" size="lg" tipSide="right" onClick={() => setHelpOpen(true)}>
        <Keyboard size={18} />
      </IconButton>
      <IconButton label="Settings" size="lg" tipSide="right" onClick={() => setSettingsOpen(true)}>
        <Settings size={18} />
      </IconButton>
    </nav>
  );
}
