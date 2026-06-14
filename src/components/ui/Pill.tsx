import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type PillVariant = 'default' | 'accent' | 'alive' | 'geo' | 'dead' | 'proxy' | 'outline';

const VARIANTS: Record<PillVariant, string> = {
  default: 'bg-surface-3 text-muted',
  accent: 'bg-accent-soft text-accent',
  alive: 'bg-alive/12 text-alive',
  geo: 'bg-geo/12 text-geo',
  dead: 'bg-dead/12 text-dead',
  proxy: 'bg-proxy/12 text-proxy',
  outline: 'border border-border text-muted',
};

interface PillProps {
  variant?: PillVariant;
  mono?: boolean;
  children: ReactNode;
  className?: string;
}

/** Small status/quality chip. */
export function Pill({ variant = 'default', mono, children, className }: PillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium leading-none',
        mono && 'font-mono tabular-nums',
        VARIANTS[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Resolution / quality chip (mono, e.g. 1080p, HD). */
export function QualityPill({ label, className }: { label: string; className?: string }) {
  return (
    <Pill variant="default" mono className={className}>
      {label}
    </Pill>
  );
}
