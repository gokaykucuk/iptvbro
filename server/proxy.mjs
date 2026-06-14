#!/usr/bin/env node
/**
 * iptvbro stream proxy (optional, zero-dependency).
 *
 * Browsers cannot bypass CORS or set forbidden request headers (Referer,
 * User-Agent) — yet many IPTV streams require exactly that. Run this small proxy
 * and point the app's "Stream proxy" setting at it to unlock those streams.
 *
 *   node server/proxy.mjs            # listens on http://localhost:8788
 *   PORT=9000 node server/proxy.mjs
 *
 * Endpoints:
 *   GET /healthz                                  -> "ok"
 *   GET /proxy?url=<encoded>&ref=<encoded>&ua=<encoded>
 *        Fetches <url> (optionally sending Referer/User-Agent), adds permissive
 *        CORS, and — for HLS playlists — rewrites every segment/key/sub-playlist
 *        URL to route back through this proxy so nested requests stay unblocked.
 */
import http from 'node:http';
import https from 'node:https';

const PORT = Number(process.env.PORT) || 8788;
const HOST = process.env.HOST || '0.0.0.0';
const DEFAULT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,OPTIONS',
  'access-control-allow-headers': '*',
  'access-control-expose-headers': '*',
};

// SSRF guard: refuse to fetch internal/loopback/link-local targets so a stray
// public deployment can't be turned into an internal-network scanner. Set
// IPTVBRO_ALLOW_PRIVATE=1 to allow them (e.g. a LAN-only self-host).
function isBlockedHost(host) {
  if (process.env.IPTVBRO_ALLOW_PRIVATE === '1') return false;
  const h = host.toLowerCase().replace(/^\[|\]$/g, '');
  if (h === 'localhost' || h.endsWith('.localhost') || h === '0.0.0.0' || h === '::1') return true;
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const a = +m[1];
    const b = +m[2];
    if (a === 0 || a === 127 || a === 10) return true; // this-host / loopback / private
    if (a === 192 && b === 168) return true; // private
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 169 && b === 254) return true; // link-local + cloud metadata
    if (a >= 224) return true; // multicast / reserved
  }
  if (h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80')) return true; // IPv6 ULA / link-local
  return false;
}

function send(res, status, headers, body) {
  res.writeHead(status, { ...CORS, ...headers });
  res.end(body);
}

function clientFor(u) {
  return u.protocol === 'http:' ? http : https;
}

/** Fetch a URL following redirects, returning the live response stream. */
function fetchUpstream(target, { referer, userAgent, depth = 0 } = {}) {
  return new Promise((resolve, reject) => {
    if (depth > 5) return reject(new Error('too many redirects'));
    let u;
    try {
      u = new URL(target);
    } catch {
      return reject(new Error('invalid url'));
    }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return reject(new Error('unsupported protocol'));
    if (isBlockedHost(u.hostname)) return reject(new Error('blocked host'));
    const headers = { 'user-agent': userAgent || DEFAULT_UA, accept: '*/*' };
    if (referer) {
      headers.referer = referer;
      try {
        headers.origin = new URL(referer).origin;
      } catch {
        /* ignore */
      }
    }
    const req = clientFor(u).request(
      u,
      { method: 'GET', headers, timeout: 20000 },
      (up) => {
        const status = up.statusCode || 502;
        if (status >= 300 && status < 400 && up.headers.location) {
          up.resume();
          const next = new URL(up.headers.location, u).toString();
          resolve(fetchUpstream(next, { referer, userAgent, depth: depth + 1 }));
          return;
        }
        resolve({ status, headers: up.headers, stream: up, finalUrl: u.toString() });
      },
    );
    req.on('timeout', () => req.destroy(new Error('upstream timeout')));
    req.on('error', reject);
    req.end();
  });
}

function isPlaylist(contentType, finalUrl) {
  const ct = (contentType || '').toLowerCase();
  if (ct.includes('mpegurl')) return true;
  const path = finalUrl.split('?')[0].toLowerCase();
  return path.endsWith('.m3u8') || path.endsWith('.m3u');
}

function proxify(uri, baseUrl, ref, ua) {
  let abs;
  try {
    abs = new URL(uri, baseUrl).toString();
  } catch {
    return uri;
  }
  const params = new URLSearchParams({ url: abs });
  if (ref) params.set('ref', ref);
  if (ua) params.set('ua', ua);
  return `/proxy?${params.toString()}`;
}

function rewritePlaylist(text, baseUrl, ref, ua) {
  return text
    .split(/\r?\n/)
    .map((line) => {
      const t = line.trim();
      if (!t) return line;
      if (t.startsWith('#')) {
        // Rewrite URI="..." found in #EXT-X-KEY, #EXT-X-MEDIA, #EXT-X-MAP, etc.
        return line.replace(/URI="([^"]+)"/g, (_m, uri) => `URI="${proxify(uri, baseUrl, ref, ua)}"`);
      }
      return proxify(t, baseUrl, ref, ua);
    })
    .join('\n');
}

const server = http.createServer(async (req, res) => {
  let reqUrl;
  try {
    reqUrl = new URL(req.url, `http://${req.headers.host}`);
  } catch {
    return send(res, 400, { 'content-type': 'text/plain' }, 'bad request');
  }

  if (req.method === 'OPTIONS') return send(res, 204, { 'access-control-max-age': '86400' }, '');
  if (reqUrl.pathname === '/healthz') return send(res, 200, { 'content-type': 'text/plain' }, 'ok');
  if (reqUrl.pathname !== '/proxy') return send(res, 404, { 'content-type': 'text/plain' }, 'not found');

  const target = reqUrl.searchParams.get('url');
  if (!target) return send(res, 400, { 'content-type': 'text/plain' }, 'missing url param');
  const ref = reqUrl.searchParams.get('ref') || undefined;
  const ua = reqUrl.searchParams.get('ua') || undefined;

  try {
    const up = await fetchUpstream(target, { referer: ref, userAgent: ua });
    if (isPlaylist(up.headers['content-type'], up.finalUrl)) {
      const chunks = [];
      for await (const c of up.stream) chunks.push(c);
      const body = rewritePlaylist(Buffer.concat(chunks).toString('utf8'), up.finalUrl, ref, ua);
      return send(
        res,
        up.status,
        { 'content-type': 'application/vnd.apple.mpegurl', 'cache-control': 'no-cache' },
        body,
      );
    }
    res.writeHead(up.status, {
      ...CORS,
      'content-type': up.headers['content-type'] || 'application/octet-stream',
      ...(up.headers['content-length'] ? { 'content-length': up.headers['content-length'] } : {}),
    });
    up.stream.pipe(res);
  } catch (err) {
    // Log detail server-side only; return a generic body so the proxy can't be
    // used as an SSRF reconnaissance oracle from a cross-origin caller.
    console.error(`[proxy] ${target} -> ${err?.message || 'unknown'}`);
    send(res, 502, { 'content-type': 'text/plain' }, 'upstream fetch failed');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`iptvbro proxy listening on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  console.log(`  health:  http://localhost:${PORT}/healthz`);
  console.log(`  usage:   http://localhost:${PORT}/proxy?url=<encoded-stream-url>`);
});
