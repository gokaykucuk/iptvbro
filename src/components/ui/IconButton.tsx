import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Tooltip } from './Tooltip';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible name; also used as the tooltip text. */
  label: string;
  children: ReactNode;
  active?: boolean;
  size?: 'sm' | 'md' | 'lg';
  tip?: boolean;
  tipSide?: 'top' | 'right' | 'bottom';
}

const SIZES = {
  sm: 'h-8 w-8',
  md: 'h-9 w-9',
  lg: 'h-11 w-11',
};

/** Square icon button with a built-in tooltip and accessible label. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, children, active, size = 'md', tip = true, tipSide = 'top', className, ...rest },
  ref,
) {
  const button = (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-md text-muted transition-colors',
        'hover:bg-hover hover:text-fg focus-visible:text-fg',
        'disabled:pointer-events-none disabled:opacity-40',
        active && 'bg-accent-soft text-accent hover:text-accent',
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
  return tip ? (
    <Tooltip label={label} side={tipSide}>
      {button}
    </Tooltip>
  ) : (
    button
  );
});
