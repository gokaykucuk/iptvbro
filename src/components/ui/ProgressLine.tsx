import { cn } from '@/lib/cn';

/** Thin indeterminate red progress line, anchored to the top of its parent. */
export function ProgressLine({ active, className }: { active: boolean; className?: string }) {
  if (!active) return null;
  return (
    <div
      className={cn('pointer-events-none absolute inset-x-0 top-0 z-50 h-0.5 overflow-hidden', className)}
      role="progressbar"
      aria-label="Loading"
    >
      <div
        className="h-full w-1/4 rounded-full bg-accent"
        style={{ animation: 'loadbar 1.1s ease-in-out infinite' }}
      />
    </div>
  );
}
