import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  hint?: string;
  icon?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

/** Centered placeholder for empty lists, no-results states, and first-run prompts. */
export function EmptyState({ title, hint, icon, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center animate-in">
      {icon ? (
        <div className="rounded-full bg-surface-2 p-3 text-dim">{icon}</div>
      ) : null}
      <p className="text-sm font-medium text-fg">{title}</p>
      {hint ? (
        <p className="max-w-xs text-center text-[12px] text-dim">{hint}</p>
      ) : null}
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-1 inline-flex h-8 items-center rounded-md bg-surface-2 px-3 text-[12px] text-fg transition-colors hover:bg-hover focus-visible:bg-hover"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
