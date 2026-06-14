/**
 * Loading placeholder shown while the catalog parses/enriches. Calm, subtle
 * shimmer that mirrors the shape of the list/grid it stands in for. Purely
 * decorative — hidden from assistive tech (status is announced elsewhere).
 */
export function SkeletonGrid(props?: { mode?: 'list' | 'grid' }) {
  const mode = props?.mode ?? 'list';

  if (mode === 'grid') {
    return (
      <div
        aria-hidden
        className="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-3 p-3"
      >
        {Array.from({ length: 18 }, (_, i) => (
          <div key={i} className="shimmer aspect-video rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div aria-hidden>
      {Array.from({ length: 14 }, (_, i) => (
        <div key={i} className="flex h-12 items-center gap-3 px-3">
          <div className="shimmer h-8 w-8 shrink-0 rounded-md" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="shimmer h-3 w-2/3 rounded-md" />
            <div className="shimmer h-2 w-2/5 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
