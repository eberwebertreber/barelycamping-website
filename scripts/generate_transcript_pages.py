#!/usr/bin/env python3
"""
Generate static transcript SEO pages for BarelyCamping.

Reads the Video Content Google Sheet and produces:
  website/v/[slug]/index.html   - per-video transcript page with VideoObject schema
  website/v/index.html          - hub page listing all videos
  website/sitemap.xml            - regenerated to include every video page

Run from repo root (D:\\Projects\\BarelyCamping\\website\\):
  python scripts/generate_transcript_pages.py

Auth: uses drive_token.json (same Google OAuth used for Sheets elsewhere).
Sheet: Video Content (1yVPx3p6RIudIJN_6ZThoVVVULkOzAOm9-ZlQ35ByS0M).

Auto-detects columns by header name (case-insensitive). Looks for:
  - title         (any header containing 'title')
  - video id      (header containing 'video id', 'videoid', 'youtube id', or 'url')
  - transcript    (header containing 'transcript')
  - description   (header containing 'description')
  - upload date   (header containing 'upload date', 'publish', or 'date')
  - thumbnail     (header containing 'thumbnail') - optional
"""

import html
import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

# ─── Config ──────────────────────────────────────────────────
SHEET_ID = "1yVPx3p6RIudIJN_6ZThoVVVULkOzAOm9-ZlQ35ByS0M"
TOKEN_PATH = Path(r"D:\Projects\BarelyCamping\drive_token.json")
WEBSITE_ROOT = Path(__file__).resolve().parent.parent  # /website/
OUT_DIR = WEBSITE_ROOT / "v"
SITEMAP_PATH = WEBSITE_ROOT / "sitemap.xml"
SITE_URL = "https://barelycamping.com"

# ─── Helpers ─────────────────────────────────────────────────
def slugify(s: str) -> str:
    s = s.lower().strip()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_-]+", "-", s)
    s = s.strip("-")
    return s[:80] or "untitled"

def extract_youtube_id(s: str) -> str:
    """Accept a raw video ID, a youtu.be URL, or a youtube.com/watch?v= URL."""
    if not s:
        return ""
    s = s.strip()
    # Raw 11-char ID
    if re.fullmatch(r"[A-Za-z0-9_-]{11}", s):
        return s
    # youtu.be/ID
    m = re.search(r"youtu\.be/([A-Za-z0-9_-]{11})", s)
    if m:
        return m.group(1)
    # youtube.com/watch?v=ID
    m = re.search(r"[?&]v=([A-Za-z0-9_-]{11})", s)
    if m:
        return m.group(1)
    return ""

def find_col(headers, *needles):
    """Return index of first header matching any needle (case-insensitive substring)."""
    low = [h.lower() for h in headers]
    for needle in needles:
        for i, h in enumerate(low):
            if needle in h:
                return i
    return -1

# ─── Sheet Fetch ─────────────────────────────────────────────
def fetch_rows():
    if not TOKEN_PATH.exists():
        sys.exit(f"[error] Missing OAuth token at {TOKEN_PATH}")
    creds = Credentials.from_authorized_user_file(str(TOKEN_PATH))
    service = build("sheets", "v4", credentials=creds)

    # Get the first tab's name
    meta = service.spreadsheets().get(spreadsheetId=SHEET_ID).execute()
    first_tab = meta["sheets"][0]["properties"]["title"]
    print(f"[info] Reading tab: {first_tab}")

    result = (
        service.spreadsheets()
        .values()
        .get(spreadsheetId=SHEET_ID, range=f"'{first_tab}'!A1:Z5000")
        .execute()
    )
    values = result.get("values", [])
    if len(values) < 2:
        sys.exit("[error] Sheet is empty or has no data rows.")
    headers = values[0]
    rows = values[1:]
    print(f"[info] Headers: {headers}")
    return headers, rows

# ─── HTML Template ───────────────────────────────────────────
PAGE_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <title>{title_esc} — BarelyCamping</title>
  <meta name="description" content="{meta_desc}" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <link rel="canonical" href="{canonical}" />

  <meta property="og:type" content="video.other" />
  <meta property="og:site_name" content="BarelyCamping" />
  <meta property="og:title" content="{title_esc}" />
  <meta property="og:description" content="{meta_desc}" />
  <meta property="og:url" content="{canonical}" />
  <meta property="og:image" content="{thumb_url}" />
  <meta property="og:video" content="https://www.youtube.com/watch?v={video_id}" />

  <meta name="twitter:card" content="player" />
  <meta name="twitter:title" content="{title_esc}" />
  <meta name="twitter:description" content="{meta_desc}" />
  <meta name="twitter:image" content="{thumb_url}" />

  <meta name="theme-color" content="#0a0a0a" />
  <link rel="icon" type="image/png" href="/submarine_white.png" />
  <link rel="stylesheet" href="/styles.css" />

  <script type="application/ld+json">
  {{
    "@context": "https://schema.org",
    "@type": "VideoObject",
    "name": {title_json},
    "description": {desc_json},
    "thumbnailUrl": "{thumb_url}",
    "uploadDate": "{upload_iso}",
    "contentUrl": "https://www.youtube.com/watch?v={video_id}",
    "embedUrl": "https://www.youtube.com/embed/{video_id}",
    "publisher": {{
      "@type": "Organization",
      "name": "BarelyCamping",
      "logo": {{
        "@type": "ImageObject",
        "url": "{site_url}/submarine_white.png"
      }}
    }},
    "transcript": {transcript_json}
  }}
  </script>

  <style>
    .v-page {{
      max-width: 820px;
      margin: 0 auto;
      padding: 5rem 1.5rem 6rem;
      position: relative;
      z-index: 3;
    }}
    .v-back {{
      display: inline-block;
      margin-bottom: 2rem;
      color: rgba(255,255,255,0.55);
      text-decoration: none;
      font-size: 0.85rem;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      transition: color 0.2s ease;
    }}
    .v-back:hover {{ color: #fff; }}
    .v-title {{
      font-family: 'Bonfire', serif;
      font-size: clamp(2rem, 5vw, 3.4rem);
      line-height: 1.1;
      margin: 0 0 0.5rem;
      background: linear-gradient(180deg,
        rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.55) 42%,
        rgba(200,200,200,0.35) 55%, rgba(255,255,255,0.9) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      -webkit-text-stroke: 1px rgba(255,255,255,0.35);
      filter: drop-shadow(0 4px 14px rgba(0,0,0,0.55));
    }}
    .v-date {{
      color: rgba(255,255,255,0.4);
      font-size: 0.85rem;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      margin: 0 0 2rem;
    }}
    .v-embed {{
      position: relative;
      width: 100%;
      aspect-ratio: 16 / 9;
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 2rem;
      background: #000;
      box-shadow: 0 20px 60px rgba(0,0,0,0.6);
    }}
    .v-embed iframe {{
      position: absolute; inset: 0;
      width: 100%; height: 100%;
      border: 0;
    }}
    .v-desc {{
      color: rgba(240,236,230,0.85);
      font-size: 1rem;
      line-height: 1.7;
      margin-bottom: 2.5rem;
      white-space: pre-wrap;
    }}
    .v-section-label {{
      font-size: 0.75rem;
      letter-spacing: 0.3em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.4);
      margin: 0 0 1rem;
    }}
    .v-transcript {{
      color: rgba(240,236,230,0.82);
      font-size: 0.98rem;
      line-height: 1.8;
      white-space: pre-wrap;
      padding: 1.5rem;
      background: rgba(0,0,0,0.35);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 10px;
      backdrop-filter: blur(4px);
    }}
    .v-watch {{
      display: inline-block;
      margin-top: 2rem;
      padding: 0.9rem 2rem;
      border-radius: 50px;
      background: rgba(255,60,10,0.15);
      border: 1px solid rgba(255,100,40,0.4);
      color: #fff;
      text-decoration: none;
      font-size: 0.9rem;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      transition: all 0.2s ease;
    }}
    .v-watch:hover {{
      background: rgba(255,60,10,0.3);
      transform: translateX(6px);
    }}
  </style>
</head>
<body>

  <div id="cursor">
    <img src="/submarine_white.png" alt="" draggable="false" />
  </div>

  <canvas id="particles"></canvas>
  <div id="heartbeat" aria-hidden="true"></div>
  <div id="flashlight" aria-hidden="true"></div>

  <main class="v-page">
    <a href="/" class="v-back">&larr; Back to Camp</a>
    <h1 class="v-title">{title_esc}</h1>
    <p class="v-date">Uploaded {upload_display}</p>

    <div class="v-embed">
      <iframe
        src="https://www.youtube.com/embed/{video_id}"
        title="{title_esc}"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
        loading="lazy"></iframe>
    </div>

    {desc_block}

    <p class="v-section-label">Full Transcript</p>
    <div class="v-transcript">{transcript_esc}</div>

    <a href="https://www.youtube.com/watch?v={video_id}" target="_blank" rel="noopener" class="v-watch">
      Watch on YouTube &rarr;
    </a>
  </main>

  <script src="/script.js"></script>
</body>
</html>
"""

HUB_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>All Videos — BarelyCamping</title>
  <meta name="description" content="Every BarelyCamping video with full transcripts. Budget camping challenges, store-only survival, and gear battles." />
  <link rel="canonical" href="{site_url}/v/" />
  <meta name="robots" content="index, follow" />
  <link rel="icon" type="image/png" href="/submarine_white.png" />
  <link rel="stylesheet" href="/styles.css" />
  <style>
    .hub {{
      max-width: 1100px;
      margin: 0 auto;
      padding: 5rem 1.5rem 6rem;
      position: relative;
      z-index: 3;
    }}
    .hub h1 {{
      font-family: 'Bonfire', serif;
      font-size: clamp(2.4rem, 6vw, 4.2rem);
      text-align: center;
      margin: 0 0 3rem;
      background: linear-gradient(180deg,
        rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.55) 42%,
        rgba(200,200,200,0.35) 55%, rgba(255,255,255,0.9) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      -webkit-text-stroke: 1px rgba(255,255,255,0.35);
    }}
    .hub-back {{
      display: inline-block;
      margin-bottom: 2rem;
      color: rgba(255,255,255,0.55);
      text-decoration: none;
      font-size: 0.85rem;
      letter-spacing: 0.2em;
      text-transform: uppercase;
    }}
    .hub-grid {{
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 1.5rem;
    }}
    .hub-card {{
      display: block;
      text-decoration: none;
      color: #f0ece6;
      border-radius: 10px;
      overflow: hidden;
      background: rgba(0,0,0,0.35);
      border: 1px solid rgba(255,255,255,0.08);
      transition: transform 0.2s ease, border-color 0.2s ease;
    }}
    .hub-card:hover {{
      transform: translateY(-4px);
      border-color: rgba(255,255,255,0.25);
    }}
    .hub-card img {{
      width: 100%;
      aspect-ratio: 16/9;
      object-fit: cover;
      display: block;
    }}
    .hub-card-body {{
      padding: 1rem 1.1rem 1.2rem;
    }}
    .hub-card-title {{
      font-size: 0.95rem;
      line-height: 1.4;
      margin: 0;
    }}
  </style>
</head>
<body>

  <div id="cursor"><img src="/submarine_white.png" alt="" draggable="false" /></div>
  <canvas id="particles"></canvas>
  <div id="heartbeat" aria-hidden="true"></div>
  <div id="flashlight" aria-hidden="true"></div>

  <main class="hub">
    <a href="/" class="hub-back">&larr; Back to Camp</a>
    <h1>All Videos</h1>
    <div class="hub-grid">
{cards}
    </div>
  </main>

  <script src="/script.js"></script>
</body>
</html>
"""

HUB_CARD = """      <a href="/v/{slug}/" class="hub-card">
        <img src="{thumb}" alt="{title_attr}" loading="lazy" />
        <div class="hub-card-body">
          <p class="hub-card-title">{title_esc}</p>
        </div>
      </a>"""

# ─── Build ───────────────────────────────────────────────────
def build_pages():
    headers, rows = fetch_rows()

    col_title = find_col(headers, "title")
    col_video = find_col(headers, "video id", "videoid", "youtube id", "youtube url", "url")
    col_trans = find_col(headers, "transcript")
    col_desc  = find_col(headers, "description")
    col_date  = find_col(headers, "upload date", "publish", "date")
    col_thumb = find_col(headers, "thumbnail")

    if col_title < 0 or col_trans < 0:
        sys.exit(f"[error] Need Title + Transcript columns. Found headers: {headers}")

    print(f"[info] Mapped columns -> title:{col_title} video:{col_video} transcript:{col_trans} desc:{col_desc} date:{col_date}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    built = []
    for row in rows:
        def cell(i):
            return row[i].strip() if 0 <= i < len(row) and row[i] else ""

        title = cell(col_title)
        transcript = cell(col_trans)
        if not title or not transcript:
            continue

        video_id = extract_youtube_id(cell(col_video))
        if not video_id:
            print(f"[skip] No valid video ID for: {title!r}")
            continue

        description = cell(col_desc)
        upload_raw = cell(col_date)
        thumb = cell(col_thumb) or f"https://i.ytimg.com/vi/{video_id}/maxresdefault.jpg"

        # Parse upload date
        upload_iso = ""
        upload_display = ""
        if upload_raw:
            for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%Y-%m-%dT%H:%M:%SZ", "%m/%d/%y"):
                try:
                    dt = datetime.strptime(upload_raw, fmt)
                    upload_iso = dt.strftime("%Y-%m-%d")
                    upload_display = dt.strftime("%B %d, %Y")
                    break
                except ValueError:
                    continue
            if not upload_iso:
                upload_iso = upload_raw
                upload_display = upload_raw

        slug = slugify(title)
        canonical = f"{SITE_URL}/v/{slug}/"

        # Build description block (optional)
        desc_block = ""
        if description:
            desc_block = f'<div class="v-desc">{html.escape(description)}</div>'

        # Meta description: use first ~160 chars of description, fallback to transcript snippet
        meta_src = description or transcript
        meta_desc = re.sub(r"\s+", " ", meta_src).strip()[:155]
        if len(meta_src) > 155:
            meta_desc += "..."

        page = PAGE_TEMPLATE.format(
            title_esc=html.escape(title),
            title_json=json.dumps(title),
            meta_desc=html.escape(meta_desc),
            canonical=canonical,
            video_id=video_id,
            thumb_url=thumb,
            upload_iso=upload_iso,
            upload_display=upload_display or "recently",
            transcript_esc=html.escape(transcript),
            transcript_json=json.dumps(transcript[:5000]),  # cap schema transcript
            desc_json=json.dumps(description[:500] if description else title),
            desc_block=desc_block,
            site_url=SITE_URL,
        )

        page_dir = OUT_DIR / slug
        page_dir.mkdir(parents=True, exist_ok=True)
        (page_dir / "index.html").write_text(page, encoding="utf-8")

        built.append({
            "slug": slug,
            "title": title,
            "video_id": video_id,
            "thumb": thumb,
            "upload_iso": upload_iso,
        })
        print(f"[ok]   /v/{slug}/")

    # Hub page
    cards = "\n".join(
        HUB_CARD.format(
            slug=b["slug"],
            thumb=b["thumb"],
            title_esc=html.escape(b["title"]),
            title_attr=html.escape(b["title"], quote=True),
        )
        for b in built
    )
    hub = HUB_TEMPLATE.format(cards=cards, site_url=SITE_URL)
    (OUT_DIR / "index.html").write_text(hub, encoding="utf-8")
    print(f"[ok]   /v/  (hub listing {len(built)} videos)")

    # Sitemap
    urls = [f"{SITE_URL}/", f"{SITE_URL}/v/"]
    urls += [f"{SITE_URL}/v/{b['slug']}/" for b in built]
    sitemap = ['<?xml version="1.0" encoding="UTF-8"?>',
               '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u in urls:
        sitemap.append("  <url>")
        sitemap.append(f"    <loc>{u}</loc>")
        sitemap.append("    <changefreq>weekly</changefreq>")
        sitemap.append("  </url>")
    sitemap.append("</urlset>\n")
    SITEMAP_PATH.write_text("\n".join(sitemap), encoding="utf-8")
    print(f"[ok]   sitemap.xml ({len(urls)} URLs)")

    print(f"\n[done] Built {len(built)} transcript pages.")
    print("Next: git add v/ sitemap.xml && git commit -m 'Transcript SEO pages' && git push")

if __name__ == "__main__":
    build_pages()
