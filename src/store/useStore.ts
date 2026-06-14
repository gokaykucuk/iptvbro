import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Catalog,
  GridMode,
  HealthRecord,
  HealthStatus,
  PlayState,
  PlayerError,
  QualityLevel,
  RecentEntry,
  SavedPlaylist,
  SortKey,
  ThemeMode,
  ViewKey,
  ProxyPolicy,
} from '@/types';
import { DEFAULT_PLAYLIST_URL, DEFAULT_PROXY_URL } from '@/lib/constants';
import { loadPlaylistFromUrl, loadPlaylistFromText } from '@/lib/loadPlaylist';
import {
  applyChannelMeta,
  applyEnrichment,
  fetchChannelMeta,
  fetchEnrichment,
} from '@/lib/enrich';

export type ParseStatus = 'idle' | 'loading' | 'enriching' | 'ready' | 'error';

const MAX_RECENTS = 40;

export interface StoreState {
  // ---- catalog ----
  catalog: Catalog | null;
  parseStatus: ParseStatus;
  loadError: string | null;
  health: Map<string, HealthRecord>;
  catalogVersion: number;
  healthVersion: number;

  // ---- filter (persisted) ----
  search: string;
  countries: string[];
  categories: string[];
  languages: string[];
  hideGeo: boolean;
  hide247: boolean;
  hdOnly: boolean;
  hideNsfw: boolean;
  workingOnly: boolean;
  sort: SortKey;
  view: ViewKey;
  gridMode: GridMode;
  filterVersion: number;

  // ---- player (mostly ephemeral) ----
  currentChannelId: string | null;
  selectionIndex: number;
  playState: PlayState;
  playerError: PlayerError | null;
  levels: QualityLevel[];
  currentLevel: number | 'auto';
  volume: number;
  muted: boolean;
  isFullscreen: boolean;
  isPiP: boolean;
  isLive: boolean;
  bitrate: number;
  zapToken: number;
  showStats: boolean;
  cinema: boolean;

  // ---- user (persisted) ----
  favorites: string[];
  recents: RecentEntry[];
  userVersion: number;

  // ---- settings (persisted) ----
  theme: ThemeMode;
  proxyEnabled: boolean;
  proxyUrl: string;
  proxyPolicy: ProxyPolicy;
  autoplay: boolean;
  autoNextOnFailure: boolean;
  nsfwGate: boolean;
  savedPlaylists: SavedPlaylist[];

  // ---- ephemeral UI ----
  commandOpen: boolean;
  settingsOpen: boolean;
  helpOpen: boolean;

  // ---- actions ----
  loadDefault: () => Promise<void>;
  loadUrl: (url: string, name?: string) => Promise<void>;
  loadFile: (text: string, name: string) => void;
  reload: () => Promise<void>;
  enrich: () => Promise<void>;
  setHealth: (id: string, status: HealthStatus) => void;

  setSearch: (s: string) => void;
  toggleFacet: (axis: 'countries' | 'categories' | 'languages', value: string) => void;
  setQuick: (key: 'hideGeo' | 'hide247' | 'hdOnly' | 'hideNsfw' | 'workingOnly', v: boolean) => void;
  setSort: (s: SortKey) => void;
  setView: (v: ViewKey) => void;
  setGridMode: (m: GridMode) => void;
  clearFilters: () => void;

  setCurrentChannel: (id: string | null) => void;
  setSelectionIndex: (i: number) => void;
  setPlayState: (s: PlayState) => void;
  setPlayerError: (e: PlayerError | null) => void;
  setLevels: (l: QualityLevel[]) => void;
  setCurrentLevel: (l: number | 'auto') => void;
  setVolume: (v: number) => void;
  setMuted: (m: boolean) => void;
  setFullscreen: (f: boolean) => void;
  setPiP: (p: boolean) => void;
  setIsLive: (l: boolean) => void;
  setBitrate: (b: number) => void;
  toggleStats: () => void;
  setCinema: (c: boolean) => void;

  toggleFavorite: (id: string) => void;
  pushRecent: (id: string) => void;
  clearRecents: () => void;

  setTheme: (t: ThemeMode) => void;
  setProxyEnabled: (v: boolean) => void;
  setProxyUrl: (u: string) => void;
  setProxyPolicy: (p: ProxyPolicy) => void;
  setSetting: <K extends 'autoplay' | 'autoNextOnFailure' | 'nsfwGate'>(
    key: K,
    v: boolean,
  ) => void;
  removeSavedPlaylist: (id: string) => void;

  setCommandOpen: (v: boolean) => void;
  setSettingsOpen: (v: boolean) => void;
  setHelpOpen: (v: boolean) => void;
  resetAll: () => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      catalog: null,
      parseStatus: 'idle',
      loadError: null,
      health: new Map(),
      catalogVersion: 0,
      healthVersion: 0,

      search: '',
      countries: [],
      categories: [],
      languages: [],
      hideGeo: false,
      hide247: false,
      hdOnly: false,
      hideNsfw: false,
      workingOnly: false,
      sort: 'az',
      view: 'all',
      gridMode: 'list',
      filterVersion: 0,

      currentChannelId: null,
      selectionIndex: 0,
      playState: 'idle',
      playerError: null,
      levels: [],
      currentLevel: 'auto',
      volume: 1,
      muted: true,
      isFullscreen: false,
      isPiP: false,
      isLive: true,
      bitrate: 0,
      zapToken: 0,
      showStats: false,
      cinema: false,

      favorites: [],
      recents: [],
      userVersion: 0,

      theme: 'dark',
      proxyEnabled: false,
      proxyUrl: DEFAULT_PROXY_URL,
      proxyPolicy: 'auto',
      autoplay: true,
      autoNextOnFailure: false,
      nsfwGate: false,
      savedPlaylists: [],

      commandOpen: false,
      settingsOpen: false,
      helpOpen: false,

      // ---- catalog actions ----
      loadDefault: async () => {
        await get().loadUrl(DEFAULT_PLAYLIST_URL, 'iptv-org');
      },

      loadUrl: async (url, name) => {
        set({ parseStatus: 'loading', loadError: null });
        try {
          const catalog = await loadPlaylistFromUrl(url);
          set((s) => ({
            catalog,
            parseStatus: 'ready',
            catalogVersion: s.catalogVersion + 1,
            savedPlaylists: upsertPlaylist(s.savedPlaylists, {
              id: url,
              name: name ?? hostname(url),
              url,
              source: url,
            }),
          }));
          void get().enrich();
        } catch (err) {
          set({ parseStatus: 'error', loadError: errMessage(err) });
        }
      },

      loadFile: (text, name) => {
        set({ parseStatus: 'loading', loadError: null });
        try {
          const catalog = loadPlaylistFromText(text, `file:${name}`);
          set((s) => ({
            catalog,
            parseStatus: 'ready',
            catalogVersion: s.catalogVersion + 1,
            savedPlaylists: upsertPlaylist(s.savedPlaylists, {
              id: `file:${name}`,
              name,
              source: `file:${name}`,
            }),
          }));
          void get().enrich();
        } catch (err) {
          set({ parseStatus: 'error', loadError: errMessage(err) });
        }
      },

      reload: async () => {
        const cat = get().catalog;
        if (!cat || cat.source.startsWith('file:')) return;
        set({ parseStatus: 'loading', loadError: null });
        try {
          const catalog = await loadPlaylistFromUrl(cat.source, true);
          set((s) => ({ catalog, parseStatus: 'ready', catalogVersion: s.catalogVersion + 1 }));
          void get().enrich();
        } catch (err) {
          set({ parseStatus: 'error', loadError: errMessage(err) });
        }
      },

      enrich: async () => {
        const cat = get().catalog;
        if (!cat || cat.enriched) return;
        try {
          const data = await fetchEnrichment();
          let enriched = applyEnrichment(cat, data);
          if (get().nsfwGate) {
            try {
              const meta = await fetchChannelMeta();
              enriched = applyChannelMeta(enriched, meta);
            } catch {
              /* heavy enrichment is best-effort */
            }
          }
          set((s) => ({ catalog: enriched, catalogVersion: s.catalogVersion + 1 }));
        } catch {
          /* enrichment is non-blocking; the app works without it */
        }
      },

      setHealth: (id, status) =>
        set((s) => {
          const health = new Map(s.health);
          health.set(id, { status, checkedAt: Date.now() });
          return { health, healthVersion: s.healthVersion + 1 };
        }),

      // ---- filter actions ----
      setSearch: (search) => set((s) => ({ search, filterVersion: s.filterVersion + 1 })),
      toggleFacet: (axis, value) =>
        set((s) => {
          const cur = s[axis];
          const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
          return { [axis]: next, filterVersion: s.filterVersion + 1 } as Partial<StoreState>;
        }),
      setQuick: (key, v) => set((s) => ({ [key]: v, filterVersion: s.filterVersion + 1 }) as Partial<StoreState>),
      setSort: (sort) => set((s) => ({ sort, filterVersion: s.filterVersion + 1 })),
      setView: (view) => set((s) => ({ view, filterVersion: s.filterVersion + 1, selectionIndex: 0 })),
      setGridMode: (gridMode) => set({ gridMode }),
      clearFilters: () =>
        set((s) => ({
          search: '',
          countries: [],
          categories: [],
          languages: [],
          hideGeo: false,
          hide247: false,
          hdOnly: false,
          hideNsfw: false,
          workingOnly: false,
          filterVersion: s.filterVersion + 1,
        })),

      // ---- player actions ----
      setCurrentChannel: (id) =>
        set((s) => ({
          currentChannelId: id,
          zapToken: s.zapToken + 1,
          playState: id ? 'loading' : 'idle',
          playerError: null,
        })),
      setSelectionIndex: (selectionIndex) => set({ selectionIndex }),
      setPlayState: (playState) => set({ playState }),
      setPlayerError: (playerError) => set({ playerError, playState: playerError ? 'error' : 'idle' }),
      setLevels: (levels) => set({ levels }),
      setCurrentLevel: (currentLevel) => set({ currentLevel }),
      setVolume: (volume) => set({ volume, muted: volume === 0 }),
      setMuted: (muted) => set({ muted }),
      setFullscreen: (isFullscreen) => set({ isFullscreen }),
      setPiP: (isPiP) => set({ isPiP }),
      setIsLive: (isLive) => set({ isLive }),
      setBitrate: (bitrate) => set({ bitrate }),
      toggleStats: () => set((s) => ({ showStats: !s.showStats })),
      setCinema: (cinema) => set({ cinema }),

      // ---- user actions ----
      toggleFavorite: (id) =>
        set((s) => {
          const favorites = s.favorites.includes(id)
            ? s.favorites.filter((f) => f !== id)
            : [id, ...s.favorites];
          return { favorites, userVersion: s.userVersion + 1 };
        }),
      pushRecent: (id) =>
        set((s) => {
          const recents = [{ id, at: Date.now() }, ...s.recents.filter((r) => r.id !== id)].slice(
            0,
            MAX_RECENTS,
          );
          return { recents, userVersion: s.userVersion + 1 };
        }),
      clearRecents: () => set((s) => ({ recents: [], userVersion: s.userVersion + 1 })),

      // ---- settings actions ----
      setTheme: (theme) => set({ theme }),
      setProxyEnabled: (proxyEnabled) => set({ proxyEnabled }),
      setProxyUrl: (proxyUrl) => set({ proxyUrl }),
      setProxyPolicy: (proxyPolicy) => set({ proxyPolicy }),
      setSetting: (key, v) => set({ [key]: v } as Partial<StoreState>),
      removeSavedPlaylist: (id) =>
        set((s) => ({ savedPlaylists: s.savedPlaylists.filter((p) => p.id !== id) })),

      setCommandOpen: (commandOpen) => set({ commandOpen }),
      setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
      setHelpOpen: (helpOpen) => set({ helpOpen }),

      resetAll: () => {
        try {
          localStorage.removeItem('iptvbro');
        } catch {
          /* ignore */
        }
        set({
          favorites: [],
          recents: [],
          countries: [],
          categories: [],
          languages: [],
          hideGeo: false,
          hide247: false,
          hdOnly: false,
          hideNsfw: false,
          workingOnly: false,
          search: '',
          currentChannelId: null,
          filterVersion: get().filterVersion + 1,
          userVersion: get().userVersion + 1,
        });
      },
    }),
    {
      name: 'iptvbro',
      version: 1,
      partialize: (s) => ({
        countries: s.countries,
        categories: s.categories,
        languages: s.languages,
        hideGeo: s.hideGeo,
        hide247: s.hide247,
        hdOnly: s.hdOnly,
        hideNsfw: s.hideNsfw,
        workingOnly: s.workingOnly,
        sort: s.sort,
        view: s.view,
        gridMode: s.gridMode,
        favorites: s.favorites,
        recents: s.recents,
        currentChannelId: s.currentChannelId,
        volume: s.volume,
        muted: s.muted,
        theme: s.theme,
        proxyEnabled: s.proxyEnabled,
        proxyUrl: s.proxyUrl,
        proxyPolicy: s.proxyPolicy,
        autoplay: s.autoplay,
        autoNextOnFailure: s.autoNextOnFailure,
        nsfwGate: s.nsfwGate,
        savedPlaylists: s.savedPlaylists,
      }),
    },
  ),
);

// ---------- helpers ----------

function upsertPlaylist(list: SavedPlaylist[], p: SavedPlaylist): SavedPlaylist[] {
  const without = list.filter((x) => x.id !== p.id);
  return [p, ...without].slice(0, 12);
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function errMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
