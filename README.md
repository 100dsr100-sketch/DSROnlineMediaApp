# DSR Online Media App (HTML)

Browser/PWA port of the Lazarus **DSR Online Media App** jukebox. Single static page, no
backend, no account — settings live in `localStorage`.

## What it does

- **Search** YouTube, Plex, or Spotify from one box; **Find** queues and plays the top match.
- **Queue** with Auto-advance, Shuffle, Repeat, right-click/long-press context menu (Play now,
  Download, Remove, Clear, Save/Load playlist as `.dsrpl`).
- **Voice search** (Web Speech API) — "play `<song>` from Plex" style commands.
- **Time-synced lyrics** from [lrclib.net](https://lrclib.net), overlaid on the video pane.
- **Audio output picker** via the browser's `setSinkId` (Chrome/Edge), with saved favourite
  devices and a "Release" fallback, mirroring the desktop app's Bluetooth routing panel.
- **Open File** plays local audio/video straight from disk (ephemeral — browsers can't persist
  a file handle across a reload, so these aren't restored from a saved playlist).

## What's different from the desktop app, and why

A webpage can't spawn `yt-dlp.exe`, `ffmpeg.exe`, or a WebView2 process, so a few things work
differently on purpose:

- **YouTube** plays through YouTube's own official embedded player (`IFrame Player API`) instead
  of a raw extracted stream — ads may appear; that's YouTube's player, not this app. Search by
  song/artist name goes through **`worker/`** — a small keyless Cloudflare Worker
  (`dsr-ytsearch`, deployed at `dsr-ytsearch.100dsr100.workers.dev`) that fetches YouTube's own
  public search-results page server-side and reads the same video list out of its embedded
  `ytInitialData` — no API key, no quota. Pasting a video link/id into Search always works too,
  relay or not. A YouTube Data API v3 key can be set in Settings as a fallback/alternative if the
  relay field is cleared.
- **Spotify** opens `open.spotify.com` in its own browser tab (Spotify blocks being framed by
  another site). This app can't inject controls into another origin's page, so transport buttons
  don't reach it — use Spotify's own tab for playback control.
- **Downloading** works for Plex (direct HTTP with your token) and does nothing for YouTube (no
  `yt-dlp` in a browser) — the Download button opens the video on youtube.com instead.
- **Format conversion / Save As** isn't included — no bundled `ffmpeg`.

## Settings

Plex server URL + `X-Plex-Token` (defaults point at the user's own LAN server), YouTube search
relay URL (defaults to the deployed `dsr-ytsearch` Worker) + optional YouTube Data API key
fallback, voice-search timeout, favourite/fallback audio output devices.

## Hosting

Static files only (`index.html`, `manifest.json`, `service-worker.js`, `icon.svg`) — works from
`file://`, a local dev server, or GitHub Pages.

## `worker/` — YouTube search relay

`worker/worker.js` is a standalone Cloudflare Worker (deploy with `npx wrangler deploy` from
that folder) that proxies a keyless YouTube search: `GET <worker-url>/?q=<query>` returns
`{ items: [{ id, title, channel, durationSec, views }, ...] }`. It's the same relay pattern as
the `dsr-yahoo` Worker behind DSR Dashboard — reads a public page server-side because a browser
can't (no CORS headers on `youtube.com/results`). Nothing it fetches isn't already sent to any
visitor of that search page.
