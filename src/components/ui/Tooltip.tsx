import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface TooltipProps {
  label: ReactNode;
  side?: 'top' | 'right' | 'bottom';
  children: ReactNode;
  className?: string;
}

/** Lightweight hover/focus tooltip. No portal — relies on the trigger being relatively positioned. */
export function Tooltip({ label, side = 'top', children, className }: TooltipProps) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className={cn('relative inline-flex', className)}
      onPointerEnter={() => setOpen(true)}
      onPointerLeave={() => setOpen(false)}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={() => setOpen(false)}
    >
      {children}
      {open && (
        <span
          role="tooltip"
          className={cn(
            'pointer-events-none absolute z-[60] whitespace-nowrap rounded-md border border-border bg-surface-3 px-2 py-1 text-[11px] font-medium text-fg shadow-[var(--shadow-lift)] animate-in',
            side === 'top' && 'bottom-full left-1/2 mb-2 -translate-x-1/2',
            side === 'bottom' && 'top-full left-1/2 mt-2 -translate-x-1/2',
            side === 'right' && 'left-full top-1/2 ml-2 -translate-y-1/2',
          )}
        >
          {label}
        </span>
      )}
    </span>
  );
}
