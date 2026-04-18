export default async function handler(req, res) {
  const CHANNEL_ID = 'UCws7Cb7VJ78PszZiBoGOC8Q';
  const RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;

  try {
    const response = await fetch(RSS_URL);
    const xml = await response.text();

    const ids = [...xml.matchAll(/<yt:videoId>([^<]+)<\/yt:videoId>/g)]
      .map(m => m[1]);

    const titles = [...xml.matchAll(/<title>([^<]+)<\/title>/g)]
      .slice(1) // skip the channel title
      .map(m => m[1]);

    const videos = ids.slice(0, 8).map((id, i) => ({
      id,
      title: titles[i] || '',
      thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      url: `https://youtu.be/${id}`,
    }));

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(videos);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
}
