// Fetches latest BarelyCamping videos.
// Primary: scrape youtube.com/@barelycamping/videos (reliable, no API key).
// Fallback: RSS feed (historically worked but currently 404s from many IPs).
// Returns: [{ id, title, thumbnail, url }, ...]

const CHANNEL_ID = 'UCws7Cb7VJ78PszZiBoGOC8Q';
const HANDLE     = '@barelycamping';
const UA         = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

async function scrapeChannelPage() {
  const r = await fetch(`https://www.youtube.com/${HANDLE}/videos`, {
    headers: {
      'User-Agent': UA,
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });
  if (!r.ok) return [];
  const html = await r.text();

  // YouTube embeds all page data in a var ytInitialData = {...};
  const m = html.match(/var ytInitialData\s*=\s*({[\s\S]+?});\s*<\/script>/);
  if (!m) return [];

  let data;
  try { data = JSON.parse(m[1]); } catch { return []; }

  const tabs = data?.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
  // Find the Videos tab (endpoint or title match)
  const videosTab = tabs.find(t =>
    t?.tabRenderer?.selected ||
    t?.tabRenderer?.title === 'Videos' ||
    t?.tabRenderer?.endpoint?.browseEndpoint?.params === 'EgZ2aWRlb3PyBgQKAjoA'
  ) || tabs[1]; // videos tab is usually index 1

  const items = videosTab?.tabRenderer?.content?.richGridRenderer?.contents || [];
  const out = [];
  for (const it of items) {
    const v = it?.richItemRenderer?.content?.videoRenderer;
    if (!v || !v.videoId) continue;
    const title =
      v.title?.runs?.[0]?.text ||
      v.title?.accessibility?.accessibilityData?.label ||
      '';
    out.push({ id: v.videoId, title });
    if (out.length >= 12) break;
  }
  return out;
}

async function tryRss() {
  try {
    const r = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`, {
      headers: { 'User-Agent': UA },
    });
    if (!r.ok) return [];
    const xml = await r.text();
    const ids = [...xml.matchAll(/<yt:videoId>([^<]+)<\/yt:videoId>/g)].map(m => m[1]);
    const titles = [...xml.matchAll(/<media:title>([^<]+)<\/media:title>/g)].map(m => m[1]);
    return ids.map((id, i) => ({ id, title: titles[i] || '' }));
  } catch { return []; }
}

export default async function handler(req, res) {
  try {
    let videos = await scrapeChannelPage();
    if (!videos.length) videos = await tryRss();

    const output = videos.slice(0, 10).map(v => ({
      id: v.id,
      title: v.title,
      thumbnail: `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
      url: `https://youtu.be/${v.id}`,
    }));

    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(output);
  } catch (err) {
    console.error('videos api failed:', err);
    res.status(500).json({ error: 'Failed to fetch videos', detail: String(err) });
  }
}
