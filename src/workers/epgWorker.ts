/**
 * EPG worker — fetches an XMLTV guide (optionally gzipped), parses it off the
 * main thread, and returns only the programmes for channels we actually have,
 * within a now-1h … now+24h window. No DOMParser (unavailable in workers) and
 * no dependencies: a tolerant string scan over the regular XMLTV structure.
 */

interface Programme {
  start: number;
  stop: number;
  title: string;
  desc?: string;
}

interface Req {
  url: string;
  wantedIds: string[];
  gzip?: boolean;
}

const ctx = self as unknown as {
  onmessage: ((e: MessageEvent<Req>) => void) | null;
  postMessage: (msg: unknown) => void;
};

const PROG_RE = /<programme\b([^>]*)>([\s\S]*?)<\/programme>/g;
const TITLE_RE = /<title\b[^>]*>([\s\S]*?)<\/title>/;
const DESC_RE = /<desc\b[^>]*>([\s\S]*?)<\/desc>/;

function attr(tag: string, name: string): string {
  const m = tag.match(new RegExp(`${name}="([^"]*)"`));
  return m ? m[1] : '';
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#0?39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_m, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_m, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, '&')
    .trim();
}

/** Parse an XMLTV timestamp like "20240613120000 +0200" to epoch ms. */
function parseXmltvDate(s: string): number {
  const m = s.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?(?:\s*([+-]\d{4}))?/);
  if (!m) return NaN;
  let ms = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
  const tz = m[7];
  if (tz) {
    const sign = tz[0] === '-' ? -1 : 1;
    ms -= sign * (+tz.slice(1, 3) * 60 + +tz.slice(3, 5)) * 60000;
  }
  return ms;
}

ctx.onmessage = async (e: MessageEvent<Req>) => {
  const { url, wantedIds, gzip } = e.data;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const ct = res.headers.get('content-type') ?? '';
    const looksGzip = gzip || ct.includes('gzip') || url.toLowerCase().split('?')[0].endsWith('.gz');
    let text: string;
    if (looksGzip && res.body && typeof DecompressionStream !== 'undefined') {
      const ds = new DecompressionStream('gzip');
      text = await new Response(res.body.pipeThrough(ds)).text();
    } else {
      text = await res.text();
    }

    const wanted = new Set(wantedIds);
    const now = Date.now();
    const from = now - 60 * 60 * 1000;
    const to = now + 24 * 60 * 60 * 1000;
    const byChannel = new Map<string, Programme[]>();

    let m: RegExpExecArray | null;
    PROG_RE.lastIndex = 0;
    while ((m = PROG_RE.exec(text)) !== null) {
      const tag = m[1];
      const channel = attr(tag, 'channel');
      if (!channel || !wanted.has(channel)) continue;
      const start = parseXmltvDate(attr(tag, 'start'));
      const stop = parseXmltvDate(attr(tag, 'stop'));
      if (!start || !stop || stop < from || start > to) continue;
      const body = m[2];
      const tm = body.match(TITLE_RE);
      const title = tm ? decodeEntities(tm[1]) : '';
      if (!title) continue;
      const dm = body.match(DESC_RE);
      const programme: Programme = { start, stop, title };
      if (dm) programme.desc = decodeEntities(dm[1]);
      const arr = byChannel.get(channel);
      if (arr) arr.push(programme);
      else byChannel.set(channel, [programme]);
    }

    for (const arr of byChannel.values()) arr.sort((a, b) => a.start - b.start);
    ctx.postMessage({ ok: true, entries: [...byChannel.entries()] });
  } catch (err) {
    ctx.postMessage({ ok: false, error: err instanceof Error ? err.message : 'EPG failed' });
  }
};

export {};
