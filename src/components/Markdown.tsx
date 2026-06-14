import type { ReactNode } from 'react';

/** Inline **bold** rendering. */
function inline(s: string): ReactNode[] {
  return s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={i} className="font-medium text-fg">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

/**
 * Minimal markdown renderer for streamed LLM output — headings (##), bullets,
 * and bold. Deliberately tiny so it can re-render every streamed chunk cheaply.
 */
export function Markdown({ text }: { text: string }) {
  const lines = text.split(/\r?\n/);
  const out: ReactNode[] = [];
  let bullets: ReactNode[] = [];

  const flush = (key: string) => {
    if (bullets.length) {
      out.push(
        <ul key={key} className="my-1 list-disc space-y-0.5 pl-4">
          {bullets}
        </ul>,
      );
      bullets = [];
    }
  };

  lines.forEach((ln, i) => {
    const heading = ln.match(/^#{1,4}\s+(.*)/);
    if (heading) {
      flush(`ul-${i}`);
      out.push(
        <h4 key={i} className="mb-0.5 mt-2.5 text-[10px] font-medium uppercase tracking-wide text-accent first:mt-0">
          {inline(heading[1])}
        </h4>,
      );
      return;
    }
    const bullet = ln.match(/^\s*[-*]\s+(.*)/);
    if (bullet) {
      bullets.push(<li key={i}>{inline(bullet[1])}</li>);
      return;
    }
    flush(`ul-${i}`);
    if (ln.trim()) out.push(<p key={i} className="mb-1">{inline(ln)}</p>);
  });
  flush('ul-end');

  return <>{out}</>;
}
