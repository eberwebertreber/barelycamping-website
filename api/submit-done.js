/* ============================================================
   api/submit-done.js

   Step 2 of the clip upload. The bytes are already in storage by
   the time this runs. This writes a small JSON sidecar next to
   the clip holding who sent it and what they agreed to, so there
   is no database to run and "download the folder" gets you the
   clips and the credits together.

   Each clip ends up as a pair:
     lets-go-camping/2026-10-03T..._a1b2c3d4.mp4
     lets-go-camping/2026-10-03T..._a1b2c3d4.mp4.json
   ============================================================ */

import { put } from '@vercel/blob';

const str = (v, max) => String(v ?? '').trim().slice(0, max);
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'POST only' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

    const key = str(body.key, 200);
    const link = str(body.link, 400);
    const name = str(body.name, 40);

    // Either they uploaded a file, or they gave us a link to one.
    if (key && !key.startsWith('lets-go-camping/')) {
      return res.status(400).json({ error: 'Bad key' });
    }
    if (!key && !/^https?:\/\//i.test(link)) {
      return res.status(400).json({ error: 'Need either an upload or a link' });
    }
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (body.consent !== true || body.age18 !== true) {
      return res.status(400).json({ error: 'Both permissions have to be given' });
    }

    const record = {
      receivedAt: new Date().toISOString(),
      clip: key || null,
      link: key ? null : link,
      name,
      email: str(body.email, 120) || null,
      video: {
        width: num(body.width),
        height: num(body.height),
        durationSec: num(body.durationSec),
        sizeBytes: num(body.sizeBytes),
      },
      agreed: {
        usageRights: true,
        is18OrGuardianPresent: true,
        noCopyrightedMusic: body.noCopyrightedMusic === true,
      },
    };

    // An upload gets its JSON sidecar next to the clip. A link has no
    // clip to sit beside, so it goes in its own folder.
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const rand = Math.random().toString(36).slice(2, 10);
    const path = key
      ? `${key}.json`
      : `lets-go-camping/links/${stamp}_${rand}.json`;

    await put(path, JSON.stringify(record, null, 2), {
      access: 'private',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('submit-done failed:', err);
    return res.status(500).json({ error: 'Clip landed but the details did not save' });
  }
}
