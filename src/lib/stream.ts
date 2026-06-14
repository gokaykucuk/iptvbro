import type { Channel } from '@/types';

export interface ProxySettings {
  proxyEnabled: boolean;
  proxyUrl: string;
  proxyPolicy: 'auto' | 'always';
}

export interface StreamPlan {
  /** The URL to hand to the player. */
  src: string;
  /** Whether it routes through the proxy. */
  proxied: boolean;
  /** Set when the stream cannot play directly and no proxy is available. */
  blocked: 'mixed' | null;
}

/** True when an http:// stream is requested from an https:// page (hard browser block). */
export function isMixedContent(url: string): boolean {
  return typeof location !== 'undefined' && location.protocol === 'https:' && url.startsWith('http://');
}

/**
 * Decide how to load a channel's stream given the current proxy settings.
 * `force` routes through the proxy regardless of policy (used once a stream has
 * been learned to be CORS/header-blocked, so a retry actually fixes it).
 */
export function planStream(ch: Channel, s: ProxySettings, force = false): StreamPlan {
  const mixed = isMixedContent(ch.url);
  const shouldProxy = s.proxyEnabled && (s.proxyPolicy === 'always' || ch.needsProxy || mixed || force);

  if (shouldProxy && s.proxyUrl) {
    const params = new URLSearchParams({ url: ch.url });
    if (ch.httpReferrer) params.set('ref', ch.httpReferrer);
    if (ch.httpUserAgent) params.set('ua', ch.httpUserAgent);
    const base = s.proxyUrl.replace(/\/+$/, '');
    return { src: `${base}/proxy?${params.toString()}`, proxied: true, blocked: null };
  }

  if (mixed) return { src: ch.url, proxied: false, blocked: 'mixed' };
  return { src: ch.url, proxied: false, blocked: null };
}
