import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { initials } from '@/lib/format';

interface LazyLogoProps {
  src?: string;
  name: string;
  /** Tailwind size + shape classes for the container (e.g. "h-8 w-8 rounded-md"). */
  className?: string;
  /** Initials font size in px for the fallback tile. */
  fontPx?: number;
}

/**
 * IntersectionObserver-gated logo loader. Renders a typographic initials tile
 * (never a broken-image icon) until the real logo is in view and decoded.
 */
export function LazyLogo({ src, name, className, fontPx = 11 }: LazyLogoProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: '300px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [inView]);

  const showImg = inView && src && !errored;

  return (
    <div
      ref={ref}
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden bg-surface-3',
        className,
      )}
    >
      {(!showImg || !loaded) && (
        <span
          className="select-none font-mono font-medium text-muted"
          style={{ fontSize: fontPx }}
          aria-hidden
        >
          {initials(name)}
        </span>
      )}
      {showImg && (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          className={cn(
            'absolute inset-0 h-full w-full object-contain p-1 transition-opacity duration-200',
            loaded ? 'opacity-100' : 'opacity-0',
          )}
        />
      )}
    </div>
  );
}
