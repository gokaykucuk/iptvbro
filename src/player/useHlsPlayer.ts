import { useCallback, useEffect, useRef } from 'react';
import Hls from 'hls.js';
import type { PlayerErrorKind, QualityLevel } from '@/types';
import { useStore } from '@/store/useStore';
import { getFilteredIndices } from '@/store/selectors';
import { planStream } from '@/lib/stream';
import { neighborId } from '@/lib/zap';

export interface PlayerApi {
  togglePlay: () => void;
  play: () => void;
  pause: () => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  toggleFullscreen: () => void;
  togglePiP: () => void;
  retry: () => void;
  goLive: () => void;
  setLevel: (l: number | 'auto') => void;
  zapBy: (delta: number) => void;
}

const NATIVE_HLS_TYPE = 'application/vnd.apple.mpegurl';

/**
 * Owns the single, persistent <video> element. Zapping swaps the source on the
 * same element; the Hls instance is destroyed + recreated per channel to release
 * MediaSource buffers, while a monotonically increasing zap token discards stale
 * events from a superseded load.
 */
export function useHlsPlayer(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  containerRef: React.RefObject<HTMLElement | null>,
): PlayerApi {
  const hlsRef = useRef<Hls | null>(null);
  const recoverRef = useRef(0);

  const currentChannelId = useStore((s) => s.currentChannelId);
  const zapToken = useStore((s) => s.zapToken);
  const proxyEnabled = useStore((s) => s.proxyEnabled);
  const proxyUrl = useStore((s) => s.proxyUrl);
  const proxyPolicy = useStore((s) => s.proxyPolicy);
  const catalogVersion = useStore((s) => s.catalogVersion);

  // ---- helper: advance to a neighbor channel ----
  const zapBy = useCallback((delta: number) => {
    const s = useStore.getState();
    if (!s.catalog) return;
    const id = neighborId(getFilteredIndices(), s.catalog, s.currentChannelId, delta);
    if (id) {
      s.setCurrentChannel(id);
      s.pushRecent(id);
    }
  }, []);

  // ---- stream loading ----
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const s = useStore.getState();
    const cat = s.catalog;

    if (!currentChannelId || !cat) return;
    const idx = cat.byId.get(currentChannelId);
    if (idx === undefined) return;
    const ch = cat.channels[idx];

    const token = zapToken;
    const stale = () => useStore.getState().zapToken !== token;

    recoverRef.current = 0;

    // tear down any previous Hls pipeline (the <video> element itself persists)
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Once a stream has been learned to be CORS/header-blocked, force it through
    // the proxy on retry even under the "auto" policy.
    const learnedProxy = s.health.get(ch.id)?.status === 'proxy';
    const plan = planStream(ch, { proxyEnabled, proxyUrl, proxyPolicy }, learnedProxy);

    if (plan.blocked === 'mixed') {
      s.setHealth(ch.id, 'proxy');
      s.setPlayerError({
        kind: 'mixed',
        message:
          'This stream is served over http:// but the app runs over https://. Enable the proxy to watch it.',
      });
      return;
    }

    s.setPlayState('loading');
    s.setPlayerError(null);
    video.muted = useStore.getState().muted;
    video.volume = useStore.getState().volume;

    const fail = (kind: PlayerErrorKind, message: string) => {
      if (stale()) return;
      const st = useStore.getState();
      if (kind === 'dead' || kind === 'geo') st.setHealth(ch.id, kind);
      else if (kind === 'proxy' || kind === 'cors' || kind === 'mixed') st.setHealth(ch.id, 'proxy');
      st.setPlayerError({ kind, message });
      if (st.autoNextOnFailure) window.setTimeout(() => !stale() && zapBy(1), 1200);
    };

    const onPlaying = () => {
      if (stale()) return;
      const st = useStore.getState();
      st.setPlayState('playing');
      st.setPlayerError(null);
      st.setHealth(ch.id, 'alive');
    };

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        backBufferLength: 30,
        manifestLoadingTimeOut: 12000,
        manifestLoadingMaxRetry: 1,
        fragLoadingTimeOut: 20000,
      });
      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (stale()) return;
        const levels: QualityLevel[] = hls.levels.map((lvl, i) => ({
          index: i,
          height: lvl.height,
          bitrate: lvl.bitrate,
          name: lvl.name,
        }));
        useStore.getState().setLevels(levels);
        void video.play().catch(() => {
          // autoplay blocked without a gesture — surface the play affordance
          if (!stale()) useStore.getState().setPlayState('paused');
        });
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_e, data) => {
        if (stale()) return;
        const lvl = hls.levels[data.level];
        if (lvl) useStore.getState().setBitrate(lvl.bitrate);
      });

      hls.on(Hls.Events.LEVEL_LOADED, (_e, data) => {
        if (stale()) return;
        useStore.getState().setIsLive(Boolean(data.details.live));
      });

      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (stale() || !data.fatal) return;
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR && recoverRef.current < 1) {
          recoverRef.current += 1;
          hls.recoverMediaError();
          return;
        }
        const code = data.response?.code;
        let kind: PlayerErrorKind = 'unknown';
        let message = 'This stream could not be played.';
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          if (plan.proxied) {
            kind = 'network';
            message = 'The stream or the proxy did not respond. Check that the proxy is running.';
          } else if (ch.needsProxy) {
            kind = 'proxy';
            message = 'This stream needs custom headers. Enable the proxy to watch it.';
          } else if (code === 403 || ch.geoBlocked) {
            kind = 'geo';
            message = 'This stream appears to be geo-blocked in your region.';
          } else if (code === 404 || code === 410) {
            kind = 'dead';
            message = 'This stream is offline.';
          } else {
            kind = 'cors';
            message = 'The stream blocked this request (CORS) or is unreachable. Try the proxy.';
          }
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          kind = 'media';
          message = 'The stream sent media this browser cannot decode.';
        }
        hls.destroy();
        if (hlsRef.current === hls) hlsRef.current = null;
        fail(kind, message);
      });

      hls.loadSource(plan.src);
      hls.attachMedia(video);
    } else if (video.canPlayType(NATIVE_HLS_TYPE)) {
      // Safari / iOS native HLS
      video.src = plan.src;
      const onErr = () => fail(ch.needsProxy ? 'proxy' : 'dead', 'This stream could not be played.');
      video.addEventListener('error', onErr, { once: true });
      void video.play().catch(() => {
        if (!stale()) useStore.getState().setPlayState('paused');
      });
    } else {
      fail('unknown', 'HLS playback is not supported in this browser.');
    }

    video.addEventListener('playing', onPlaying);

    return () => {
      video.removeEventListener('playing', onPlaying);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentChannelId, zapToken, proxyEnabled, proxyUrl, proxyPolicy, catalogVersion]);

  // ---- video <-> store event wiring (once) ----
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onWaiting = () => {
      if (useStore.getState().playState === 'playing') useStore.getState().setPlayState('buffering');
    };
    const onPause = () => {
      const st = useStore.getState();
      if (st.playState !== 'error' && !video.ended) st.setPlayState('paused');
    };
    const onPlay = () => {
      const st = useStore.getState();
      if (st.playState === 'paused') st.setPlayState('playing');
    };
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('pause', onPause);
    video.addEventListener('play', onPlay);
    return () => {
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('play', onPlay);
    };
  }, [videoRef]);

  // ---- volume / mute sync (store -> element) ----
  const volume = useStore((s) => s.volume);
  const muted = useStore((s) => s.muted);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = volume;
    video.muted = muted;
  }, [volume, muted, videoRef]);

  // ---- fullscreen / PiP listeners ----
  useEffect(() => {
    const onFs = () => useStore.getState().setFullscreen(Boolean(document.fullscreenElement));
    const video = videoRef.current;
    const onPipEnter = () => useStore.getState().setPiP(true);
    const onPipLeave = () => useStore.getState().setPiP(false);
    document.addEventListener('fullscreenchange', onFs);
    video?.addEventListener('enterpictureinpicture', onPipEnter);
    video?.addEventListener('leavepictureinpicture', onPipLeave);
    return () => {
      document.removeEventListener('fullscreenchange', onFs);
      video?.removeEventListener('enterpictureinpicture', onPipEnter);
      video?.removeEventListener('leavepictureinpicture', onPipLeave);
    };
  }, [videoRef]);

  // ---- controls ----
  const play = useCallback(() => void videoRef.current?.play().catch(() => undefined), [videoRef]);
  const pause = useCallback(() => videoRef.current?.pause(), [videoRef]);
  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play().catch(() => undefined);
    else v.pause();
  }, [videoRef]);

  const setVolume = useCallback(
    (v: number) => {
      const clamped = Math.max(0, Math.min(1, v));
      useStore.getState().setVolume(clamped);
      if (clamped > 0) useStore.getState().setMuted(false);
    },
    [],
  );

  const toggleMute = useCallback(() => {
    const st = useStore.getState();
    st.setMuted(!st.muted);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen().catch(() => undefined);
  }, [containerRef]);

  const togglePiP = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (document.pictureInPictureElement) void document.exitPictureInPicture().catch(() => undefined);
    else void v.requestPictureInPicture?.().catch(() => undefined);
  }, [videoRef]);

  const retry = useCallback(() => {
    const st = useStore.getState();
    if (st.currentChannelId) st.setCurrentChannel(st.currentChannelId);
  }, []);

  const goLive = useCallback(() => {
    const hls = hlsRef.current;
    const v = videoRef.current;
    if (hls && hls.liveSyncPosition != null) v && (v.currentTime = hls.liveSyncPosition);
    else if (v && v.seekable.length) v.currentTime = v.seekable.end(v.seekable.length - 1);
  }, [videoRef]);

  const setLevel = useCallback((l: number | 'auto') => {
    const hls = hlsRef.current;
    if (hls) hls.currentLevel = l === 'auto' ? -1 : l;
    useStore.getState().setCurrentLevel(l);
  }, []);

  return {
    togglePlay,
    play,
    pause,
    setVolume,
    toggleMute,
    toggleFullscreen,
    togglePiP,
    retry,
    goLive,
    setLevel,
    zapBy,
  };
}
