<div align="center">

# iptvbro

**A beautiful, professional, open-source IPTV browser & viewer.**

Load any M3U playlist — including the [iptv-org](https://github.com/iptv-org/iptv) catalogue of ~12,000 free channels — and get a fast, cinematic viewing experience in your browser.

</div>

---

## Highlights

- 🎬 **Cinema-first player** — a single, never-unmounting `<video>` so channel zapping is instant. Built on [hls.js](https://github.com/video-dev/hls.js) with native-HLS fallback for Safari/iOS.
- ⚡ **Built for scale** — virtualized list handles 12,000+ channels at 60 fps. Filtering and search are sub-frame thanks to pre-built inverted indexes.
- 🌍 **Three-axis faceting** — filter by **country** (with flags), **category**, and **language**, with live counts that recompute against your other selections.
- ⌨️ **Keyboard-native** — `↑ ↓` to zap, `0–9` to jump to a channel number, `/` to search, `⌘K` for the command palette, `Space` `M` `F` `P` for transport, and more.
- 🩺 **Stream-health system** — every channel shows a live / geo-blocked / offline / needs-proxy state. iptvbro learns from playback and never dead-ends: failed streams offer **Retry**, **Next channel**, and a one-tap **proxy** rescue.
- 🎨 **Three real themes** — a cinematic dark default, a true OLED black, and a genuine light mode (the player always stays near-black).
- 🔌 **Optional zero-dependency proxy** — unlocks streams that need CORS bypass or custom `Referer` / `User-Agent` headers.
- 💾 **Remembers everything** — favorites, recently watched, last channel, filters and settings persist locally; the parsed playlist is cached in IndexedDB for instant reloads.
- 🆓 **Static & free to host** — it's a pure front-end app. Deploy it to GitHub Pages, Netlify, or any static host.

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
```

Open the app and click **“Load the iptv-org playlist”**, paste any M3U URL, or drop an `.m3u` file.

### Build for production

```bash
npm run build      # outputs to dist/
npm run preview    # preview the production build
```

## The optional stream proxy

Browsers can't bypass CORS or set forbidden request headers (`Referer`, `User-Agent`) — yet many IPTV streams require exactly that. iptvbro ships a tiny, **zero-dependency** Node proxy that fixes both.

```bash
npm run proxy            # listens on http://localhost:8788
# or run app + proxy together:
npm run dev:full
```

Then in **Settings → Proxy**, enable it (the default URL is already `http://localhost:8788`). The app also offers a one-tap **Enable proxy** button on any stream that gets blocked.

The proxy adds permissive CORS, injects the `#EXTVLCOPT` referrer/user-agent headers, and rewrites HLS playlists so nested segment/key requests stay unblocked.

> ⚠️ **Self-host only.** The proxy is an open relay by design — run it locally or behind your own auth. Never deploy a shared public instance.

## How it works

```
M3U text ─▶ m3uParser ─▶ buildCatalog ─▶ enrich (iptv-org JSON) ─▶ Zustand store
                                                                        │
   filters/search ─▶ memoized index selectors ─▶ virtualized ChannelList
                                                                        │
              currentChannelId ─▶ useHlsPlayer (persistent <video>) ─▶ PlayerStage
```

- **Parsing** derives country (from the `tvg-id` suffix), categories (`group-title`, `;`-split), resolution, quality, and status tags — all into structured fields, not the display name.
- **Enrichment** joins the small, CORS-open iptv-org `countries.json` / `languages.json` to add country names, flag emoji, and the language axis. (The 10 MB `channels.json` is fetched only if you enable the NSFW gate.)
- **Filtering** intersects pre-built `country → indices`, `category → indices`, and `language → indices` maps, returning index arrays so list rows stay referentially stable.
- **Playback** destroys and recreates the hls.js instance per channel (to release MediaSource buffers) while the DOM `<video>` persists; a monotonic *zap token* discards events from superseded loads.

## Tech stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · hls.js · Zustand · TanStack Virtual · lucide-react.

## Keyboard shortcuts

| Keys | Action |
| --- | --- |
| `↑` `↓` | Zap to previous / next channel |
| `Enter` | Play selected channel |
| `Space` | Play / pause |
| `0`–`9` | Jump to channel number |
| `M` / `F` / `P` | Mute / fullscreen / picture-in-picture |
| `L` or `S` | Favorite the playing channel |
| `/` | Focus search |
| `⌘K` | Command palette |
| `G` | Toggle list / grid |
| `C` | Cinema mode |
| `?` | Show all shortcuts |

## Notes & limitations

- iptv-org is a community catalogue of **publicly available** streams. Many are geo-blocked, intermittent, or offline — iptvbro is designed to make that flaky reality feel solid, but it can't make a dead stream play.
- This project does **not** host, bundle, or endorse any streams. You bring the playlist.

## License

[MIT](./LICENSE) — © iptvbro contributors. Channel data via the wonderful [iptv-org](https://github.com/iptv-org/iptv) project.
