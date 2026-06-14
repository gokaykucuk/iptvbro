import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { IconButton } from '@/components/ui/IconButton';
import { KEYMAP } from '@/lib/constants';

/** Modal listing keyboard shortcuts; visible only when store.helpOpen. */
export function KeyboardHelp() {
  const helpOpen = useStore((s) => s.helpOpen);
  const setHelpOpen = useStore((s) => s.setHelpOpen);

  useEffect(() => {
    if (!helpOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setHelpOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [helpOpen, setHelpOpen]);

  if (!helpOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60"
      onClick={() => setHelpOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        className="animate-pop w-[90vw] max-w-md rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow-deep)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-medium text-fg">Keyboard shortcuts</h2>
          <IconButton label="Close" size="sm" onClick={() => setHelpOpen(false)}>
            <X size={16} />
          </IconButton>
        </div>

        <div className="mt-3">
          {KEYMAP.map(({ keys, label }) => (
            <div
              key={label}
              className="flex items-center justify-between py-1.5 text-[13px]"
            >
              <span className="text-muted">{label}</span>
              <span className="flex items-center gap-1">
                {keys.map((key) => (
                  <kbd
                    key={key}
                    className="inline-flex h-6 items-center rounded-md border border-border bg-surface-2 px-1.5 font-mono text-[11px] text-fg"
                  >
                    {key}
                  </kbd>
                ))}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
