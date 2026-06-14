import type { HealthStatus } from '@/types';
import { cn } from '@/lib/cn';

const MAP: Record<HealthStatus, { dot: string; text: string; label: string }> = {
  alive: { dot: 'bg-alive', text: 'text-alive', label: 'Live' },
  geo: { dot: 'bg-geo', text: 'text-geo', label: 'Geo' },
  dead: { dot: 'bg-dead', text: 'text-dead', label: 'Offline' },
  proxy: { dot: 'bg-proxy', text: 'text-proxy', label: 'Proxy' },
  unknown: { dot: 'bg-dim', text: 'text-dim', label: '' },
};

interface HealthBadgeProps {
  status: HealthStatus;
  withLabel?: boolean;
  className?: string;
}

/**
 * Stream-health indicator. Status is conveyed by BOTH a colored dot and a text
 * label (never color alone) for accessibility.
 */
export function HealthBadge({ status, withLabel = false, className }: HealthBadgeProps) {
  const m = MAP[status];
  const label = m.label || 'Unknown';
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)} title={label}>
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', m.dot)} aria-hidden />
      {withLabel && m.label && (
        <span className={cn('text-[10px] font-medium leading-none', m.text)}>{m.label}</span>
      )}
      <span className="sr-only">{label}</span>
    </span>
  );
}
