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
  of a raw extracted stream — ads may appear; that's YouTube's player, not this app. Paste a
  video link/id into Search to queue it with no key needed. Add a free **YouTube Data API v3**
  key in Settings to search by song/artist name from here too.
- **Spotify** opens `open.spotify.com` in its own browser tab (Spotify blocks being framed by
  another site). This app can't inject controls into another origin's page, so transport buttons
  don't reach it — use Spotify's own tab for playback control.
- **Downloading** works for Plex (direct HTTP with your token) and does nothing for YouTube (no
  `yt-dlp` in a browser) — the Download button opens the video on youtube.com instead.
- **Format conversion / Save As** isn't included — no bundled `ffmpeg`.

## Settings

Plex server URL + `X-Plex-Token` (defaults point at the user's own LAN server), optional YouTube
Data API key, voice-search timeout, favourite/fallback audio output devices.

## Hosting

Static files only (`index.html`, `manifest.json`, `service-worker.js`, `icon.svg`) — works from
`file://`, a local dev server, or GitHub Pages.
