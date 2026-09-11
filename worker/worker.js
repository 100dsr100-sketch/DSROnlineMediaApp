// DSR Online Media App - keyless YouTube search relay.
//
// A browser can't call yt-dlp and can't fetch youtube.com/results itself
// (no CORS headers on that response), so this worker fetches the public
// search-results page server-side - exactly what a browser visiting that
// URL would receive - and pulls the same video list out of the page's own
// embedded ytInitialData JSON. No API key, no quota, nothing that isn't
// already sent to any visitor of that search page.
export default {
  async fetch(request) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

    const q = new URL(request.url).searchParams.get('q');
    if (!q || !q.trim()) {
      return new Response(JSON.stringify({ error: 'missing ?q=' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const searchUrl = 'https://www.youtube.com/results?search_query=' +
      encodeURIComponent(q.trim()) + '&hl=en&gl=US';

    let html;
    try {
      const upstream = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          // Skips YouTube's EU consent interstitial, which would otherwise
          // replace the results page with a cookie-consent form.
          'Cookie': 'CONSENT=YES+1; PREF=hl=en&gl=US',
        },
        cf: { cacheTtl: 300, cacheEverything: true },
      });
      if (!upstream.ok) {
        return new Response(JSON.stringify({ error: 'upstream HTTP ' + upstream.status }), {
          status: 502, headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
      html = await upstream.text();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'upstream fetch failed: ' + e }), {
        status: 502, headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const items = extractVideos(html).slice(0, 20);
    return new Response(JSON.stringify({ items }), {
      headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
    });
  },
};

function extractVideos(html) {
  const m = html.match(/var ytInitialData\s*=\s*(\{.*?\});<\/script>/s) ||
            html.match(/ytInitialData"\]\s*=\s*(\{.*?\});/s);
  if (!m) return [];
  let data;
  try { data = JSON.parse(m[1]); } catch (e) { return []; }

  const out = [];
  const seen = new Set();

  // Walk the whole tree looking for videoRenderer nodes rather than
  // threading through the exact contents path, which YouTube reshuffles
  // between rollouts (shelves, ads, "people also search for" rows, etc).
  (function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (node.videoRenderer) {
      const v = node.videoRenderer;
      const id = v.videoId;
      if (id && !seen.has(id)) {
        seen.add(id);
        const title = textOf(v.title);
        const channel = textOf(v.ownerText) || textOf(v.longBylineText) || textOf(v.shortBylineText);
        const durationSec = parseDur(v.lengthText && v.lengthText.simpleText);
        const views = parseViews(
          (v.viewCountText && (v.viewCountText.simpleText || textOf(v.viewCountText))) ||
          (v.shortViewCountText && (v.shortViewCountText.simpleText || textOf(v.shortViewCountText)))
        );
        if (title) out.push({ id, title, channel: channel || '', durationSec, views });
      }
    }
    for (const k in node) {
      const val = node[k];
      if (val && typeof val === 'object') walk(val);
    }
  })(data);

  return out;
}

function textOf(run) {
  if (!run) return '';
  if (run.simpleText) return run.simpleText;
  if (Array.isArray(run.runs)) return run.runs.map(r => r.text).join('');
  return '';
}

function parseDur(s) {
  if (!s) return 0;
  const parts = String(s).split(':').map(n => parseInt(n, 10) || 0);
  let sec = 0;
  for (const p of parts) sec = sec * 60 + p;
  return sec;
}

function parseViews(s) {
  if (!s) return 0;
  s = String(s).replace(/views?/i, '').trim();
  const m = s.match(/^([\d.,]+)\s*([KMB]?)$/i);
  if (!m) return parseInt(s.replace(/[^\d]/g, ''), 10) || 0;
  let n = parseFloat(m[1].replace(/,/g, ''));
  const suf = m[2].toUpperCase();
  if (suf === 'K') n *= 1e3; else if (suf === 'M') n *= 1e6; else if (suf === 'B') n *= 1e9;
  return Math.round(n);
}
