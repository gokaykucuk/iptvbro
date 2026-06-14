import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { Tv, Link, Upload, Loader2 } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { DEFAULT_PLAYLIST_URL } from '@/lib/constants';
import { cn } from '@/lib/cn';

/** First-run hero shown full-bleed when there is no catalog: load a playlist via preset, URL, or file. */
export function PlaylistLoader() {
  const parseStatus = useStore((s) => s.parseStatus);
  const loadError = useStore((s) => s.loadError);
  const savedPlaylists = useStore((s) => s.savedPlaylists);
  const loadDefault = useStore((s) => s.loadDefault);
  const loadUrl = useStore((s) => s.loadUrl);
  const loadFile = useStore((s) => s.loadFile);

  const [url, setUrl] = useState(DEFAULT_PLAYLIST_URL);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loading = parseStatus === 'loading';

  async function ingestFile(file: File) {
    const text = await file.text();
    loadFile(text, file.name);
  }

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void ingestFile(file);
    e.target.value = '';
  }

  function onDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragging(false);
    if (loading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) void ingestFile(file);
  }

  function onDragOver(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    if (!loading) setDragging(true);
  }

  function submitUrl() {
    const trimmed = url.trim();
    if (trimmed && !loading) void loadUrl(trimmed);
  }

  return (
    <div className="flex min-h-full w-full items-center justify-center bg-bg p-8">
      <div className="animate-rise w-[90vw] max-w-lg">
        {/* Brand */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent shadow-[var(--shadow-lift)]">
            <Tv size={28} className="text-accent-contrast" aria-hidden />
          </div>
          <h1 className="mt-5 text-2xl font-medium text-fg">iptvbro</h1>
          <p className="mt-2 text-muted">A beautiful way to watch IPTV. Load any M3U playlist.</p>
        </div>

        {/* Loading overlay state */}
        {loading ? (
          <div
            className="mt-9 flex flex-col items-center gap-3 py-10 text-muted"
            role="status"
            aria-live="polite"
          >
            <Loader2 size={28} className="animate-spin text-accent" aria-hidden />
            <span className="text-[13px]">Loading…</span>
          </div>
        ) : (
          <div className="mt-9 flex flex-col gap-6">
            {/* Primary action */}
            <button
              type="button"
              onClick={() => void loadDefault()}
              disabled={loading}
              className={cn(
                'inline-flex h-11 w-full items-center justify-center rounded-lg bg-accent px-5',
                'font-medium text-accent-contrast transition-colors hover:bg-accent-hover',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                'disabled:pointer-events-none disabled:opacity-40',
              )}
            >
              Load the iptv-org playlist
            </button>

            {/* URL row */}
            <div>
              <label className="eyebrow mb-2 block text-left">From a URL</label>
              <div className="flex items-center gap-2">
                <div className="flex h-10 flex-1 items-center gap-2 rounded-md border border-border bg-surface px-3 transition-colors focus-within:border-strong">
                  <Link size={16} className="shrink-0 text-dim" aria-hidden />
                  <input
                    type="url"
                    inputMode="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submitUrl();
                    }}
                    placeholder="https://example.com/playlist.m3u"
                    aria-label="Playlist URL"
                    spellCheck={false}
                    autoComplete="off"
                    className="font-mono w-full bg-transparent text-[13px] text-fg placeholder:text-dim focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={submitUrl}
                  disabled={loading || !url.trim()}
                  className={cn(
                    'inline-flex h-10 shrink-0 items-center justify-center rounded-md px-4',
                    'border border-border bg-surface-2 font-medium text-fg transition-colors',
                    'hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                    'disabled:pointer-events-none disabled:opacity-40',
                  )}
                >
                  Load
                </button>
              </div>
            </div>

            {/* Drag & drop / file area */}
            <label
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={() => setDragging(false)}
              className={cn(
                'flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center transition-colors',
                dragging ? 'border-strong bg-hover text-muted' : 'border-border text-dim hover:bg-hover',
              )}
            >
              <Upload size={18} aria-hidden />
              <span className="text-[13px]">
                Drop an M3U file here, or <span className="text-muted">browse</span>
              </span>
              <span className="text-[11px] text-dim">.m3u, .m3u8 or .txt</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".m3u,.m3u8,.txt"
                onChange={onFileChange}
                disabled={loading}
                className="sr-only"
                aria-label="Choose a playlist file"
              />
            </label>

            {/* Saved playlists */}
            {savedPlaylists.length > 0 && (
              <div>
                <span className="eyebrow mb-2 block text-left">Recent playlists</span>
                <div className="flex flex-wrap gap-2">
                  {savedPlaylists.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => p.url && void loadUrl(p.url, p.name)}
                      disabled={loading || !p.url}
                      title={p.url ?? p.name}
                      className={cn(
                        'inline-flex h-8 max-w-[14rem] items-center gap-1.5 rounded-md px-3',
                        'border border-border bg-surface-2 text-[12px] text-muted transition-colors',
                        'hover:bg-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                        'disabled:pointer-events-none disabled:opacity-40',
                      )}
                    >
                      <Link size={14} className="shrink-0 text-dim" aria-hidden />
                      <span className="truncate">{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {loadError && (
          <p className="mt-4 text-center text-[12px] text-dead" role="alert" aria-live="assertive">
            {loadError}
          </p>
        )}
      </div>
    </div>
  );
}
