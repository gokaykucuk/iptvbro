import { useEffect, useRef } from 'react';
import { X, Trash2, RotateCw, Upload, Link, Download } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { IconButton } from '@/components/ui/IconButton';
import { Switch } from '@/components/ui/Switch';
import { cn } from '@/lib/cn';
import { DEFAULT_PROXY_URL } from '@/lib/constants';
import type { ThemeMode, ProxyPolicy, SavedPlaylist } from '@/types';

const INPUT_CLASS = 'h-9 w-full rounded-md bg-surface-2 px-2 text-[13px] text-fg';
const BTN_BASE = 'inline-flex h-8 items-center justify-center rounded-md px-3 text-[12px] transition-colors';
const BTN_PRIMARY = cn(BTN_BASE, 'bg-accent text-accent-contrast hover:bg-accent-hover');
const BTN_SECONDARY = cn(BTN_BASE, 'bg-surface-2 text-muted hover:text-fg');

const THEMES: { value: ThemeMode; label: string }[] = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'oled', label: 'OLED' },
];

const PROXY_POLICIES: { value: ProxyPolicy; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'always', label: 'Always' },
];

interface SectionProps {
  title: string;
  first?: boolean;
  children: React.ReactNode;
}

function Section({ title, first, children }: SectionProps) {
  return (
    <section className={cn(!first && 'mt-4 border-t border-border pt-4')}>
      <h3 className="eyebrow mb-3">{title}</h3>
      {children}
    </section>
  );
}

interface SwitchRowProps {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

function SwitchRow({ label, hint, checked, onChange }: SwitchRowProps) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <div className="min-w-0">
        <div className="text-[13px] text-fg">{label}</div>
        {hint ? <div className="mt-0.5 text-[11px] text-dim">{hint}</div> : null}
      </div>
      <Switch checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

function sourceHost(source: string): string {
  if (source.startsWith('file:')) return source.slice(5);
  try {
    return new URL(source).hostname;
  } catch {
    return source;
  }
}

/** Right-side settings drawer; rendered only when store.settingsOpen. */
export function SettingsSheet() {
  const settingsOpen = useStore((s) => s.settingsOpen);
  const setSettingsOpen = useStore((s) => s.setSettingsOpen);

  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);

  const autoplay = useStore((s) => s.autoplay);
  const autoNextOnFailure = useStore((s) => s.autoNextOnFailure);
  const nsfwGate = useStore((s) => s.nsfwGate);
  const setSetting = useStore((s) => s.setSetting);

  const proxyEnabled = useStore((s) => s.proxyEnabled);
  const setProxyEnabled = useStore((s) => s.setProxyEnabled);
  const proxyUrl = useStore((s) => s.proxyUrl);
  const setProxyUrl = useStore((s) => s.setProxyUrl);
  const proxyPolicy = useStore((s) => s.proxyPolicy);
  const setProxyPolicy = useStore((s) => s.setProxyPolicy);

  const savedPlaylists = useStore((s) => s.savedPlaylists);
  const loadUrl = useStore((s) => s.loadUrl);
  const loadFile = useStore((s) => s.loadFile);
  const reload = useStore((s) => s.reload);
  const removeSavedPlaylist = useStore((s) => s.removeSavedPlaylist);

  const resetAll = useStore((s) => s.resetAll);

  const addUrlRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!settingsOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setSettingsOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [settingsOpen, setSettingsOpen]);

  if (!settingsOpen) return null;

  const handleAddUrl = () => {
    const url = addUrlRef.current?.value.trim();
    if (!url) return;
    void loadUrl(url);
    if (addUrlRef.current) addUrlRef.current.value = '';
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const text = await file.text();
    loadFile(text, file.name);
  };

  const handleExport = () => {
    const s = useStore.getState();
    const data = {
      favorites: s.favorites,
      recents: s.recents,
      theme: s.theme,
      proxyEnabled: s.proxyEnabled,
      proxyUrl: s.proxyUrl,
      proxyPolicy: s.proxyPolicy,
      savedPlaylists: s.savedPlaylists,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = 'iptvbro-settings.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(href);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (typeof parsed !== 'object' || parsed === null) return;
      const data = parsed as Record<string, unknown>;
      if (data.theme === 'dark' || data.theme === 'light' || data.theme === 'oled') {
        setTheme(data.theme);
      }
      if (typeof data.proxyEnabled === 'boolean') setProxyEnabled(data.proxyEnabled);
      if (typeof data.proxyUrl === 'string') setProxyUrl(data.proxyUrl);
      if (data.proxyPolicy === 'auto' || data.proxyPolicy === 'always') {
        setProxyPolicy(data.proxyPolicy);
      }
    } catch {
      /* import is best-effort */
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/50"
      onClick={() => setSettingsOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        className="animate-in fixed right-0 top-0 h-full w-[400px] max-w-[92vw] overflow-y-auto border-l border-border bg-surface shadow-[var(--shadow-deep)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-[15px] font-medium text-fg">Settings</h2>
          <IconButton label="Close settings" size="sm" onClick={() => setSettingsOpen(false)}>
            <X size={16} />
          </IconButton>
        </div>

        <div className="px-5 py-5">
          {/* 1) Appearance */}
          <Section title="Appearance" first>
            <div
              role="radiogroup"
              aria-label="Theme"
              className="flex gap-1 rounded-md bg-surface-2 p-1"
            >
              {THEMES.map((t) => {
                const active = theme === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setTheme(t.value)}
                    className={cn(
                      'h-8 flex-1 rounded-md text-[12px] transition-colors',
                      active
                        ? 'bg-accent text-accent-contrast'
                        : 'bg-surface-2 text-muted hover:text-fg',
                    )}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* 2) Playback */}
          <Section title="Playback">
            <SwitchRow
              label="Autoplay"
              checked={autoplay}
              onChange={(v) => setSetting('autoplay', v)}
            />
            <SwitchRow
              label="Auto-skip failed streams"
              checked={autoNextOnFailure}
              onChange={(v) => setSetting('autoNextOnFailure', v)}
            />
            <SwitchRow
              label="Hide adult channels"
              hint="Loads extra data from iptv-org"
              checked={nsfwGate}
              onChange={(v) => setSetting('nsfwGate', v)}
            />
          </Section>

          {/* 3) Proxy */}
          <Section title="Proxy">
            <SwitchRow
              label="Use stream proxy"
              checked={proxyEnabled}
              onChange={setProxyEnabled}
            />
            {proxyEnabled ? (
              <div className="mt-1 space-y-3">
                <input
                  type="url"
                  value={proxyUrl}
                  onChange={(e) => setProxyUrl(e.target.value)}
                  placeholder={DEFAULT_PROXY_URL}
                  aria-label="Proxy URL"
                  className={INPUT_CLASS}
                />
                <div
                  role="radiogroup"
                  aria-label="Proxy policy"
                  className="flex gap-1 rounded-md bg-surface-2 p-1"
                >
                  {PROXY_POLICIES.map((p) => {
                    const active = proxyPolicy === p.value;
                    return (
                      <button
                        key={p.value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setProxyPolicy(p.value)}
                        className={cn(
                          'h-8 flex-1 rounded-md text-[12px] transition-colors',
                          active
                            ? 'bg-accent text-accent-contrast'
                            : 'bg-surface-2 text-muted hover:text-fg',
                        )}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-dim">
                  Run the bundled proxy locally (npm run proxy). It adds CORS and custom
                  headers some streams need. Self-host only.
                </p>
              </div>
            ) : null}
          </Section>

          {/* 4) Playlists */}
          <Section title="Playlists">
            {savedPlaylists.length > 0 ? (
              <ul className="mb-3 space-y-1">
                {savedPlaylists.map((p: SavedPlaylist) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-hover"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] text-fg">{p.name}</div>
                      <div className="truncate font-mono text-[11px] text-dim">
                        {sourceHost(p.source)}
                      </div>
                    </div>
                    {p.url ? (
                      <button
                        type="button"
                        onClick={() => loadUrl(p.url as string, p.name)}
                        className={BTN_SECONDARY}
                      >
                        Load
                      </button>
                    ) : null}
                    <IconButton
                      label={`Remove ${p.name}`}
                      size="sm"
                      onClick={() => removeSavedPlaylist(p.id)}
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-3 text-[12px] text-dim">No saved playlists yet.</p>
            )}

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Link
                  size={14}
                  className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-dim"
                />
                <input
                  ref={addUrlRef}
                  type="url"
                  placeholder="Add playlist URL"
                  aria-label="Add playlist URL"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddUrl();
                  }}
                  className={cn(INPUT_CLASS, 'pl-7')}
                />
              </div>
              <button type="button" onClick={handleAddUrl} className={BTN_PRIMARY}>
                Load
              </button>
            </div>

            <label className={cn(BTN_SECONDARY, 'mt-2 w-full cursor-pointer gap-2')}>
              <Upload size={16} />
              Import .m3u file
              <input
                type="file"
                accept=".m3u,.m3u8,.txt"
                onChange={handleFile}
                className="sr-only"
              />
            </label>

            <button
              type="button"
              onClick={() => void reload()}
              className={cn(BTN_SECONDARY, 'mt-2 w-full gap-2')}
            >
              <RotateCw size={16} />
              Reload current
            </button>
          </Section>

          {/* 5) Data */}
          <Section title="Data">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExport}
                className={cn(BTN_SECONDARY, 'flex-1 gap-2')}
              >
                <Download size={16} />
                Export
              </button>
              <label className={cn(BTN_SECONDARY, 'flex-1 cursor-pointer gap-2')}>
                <Upload size={16} />
                Import
                <input
                  type="file"
                  accept="application/json,.json"
                  onChange={handleImport}
                  className="sr-only"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={() => resetAll()}
              className={cn(BTN_BASE, 'mt-3 w-full gap-2 bg-surface-2 text-dead hover:bg-hover')}
            >
              <Trash2 size={16} />
              Reset all
            </button>
          </Section>
        </div>
      </div>
    </div>
  );
}
