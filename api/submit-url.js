/* Step 1 of the clip upload. Hands the browser a one-time
   presigned PUT URL so the video goes straight to storage and
   never passes through this function. Vercel caps function
   request bodies at 4.5MB, so a 90MB phone clip could not come
   through here even if we wanted it to.

   Why issueSignedToken + presignUrl instead of handleUpload:
   those two return a plain URL that a bare XHR can PUT to.
   handleUpload / uploadPresigned need @vercel/blob/client
   running in the browser, which needs a bundler, and this site
   has no build step.

   The limits below are set ON THE TOKEN, which means the CDN
   enforces them. Client-side checks in submit.js are there to
   give people a useful error on their phone. These are the ones
   that actually stop a 4GB upload. */

import { issueSignedToken, presignUrl } from '@vercel/blob';

const MAX_BYTES = 200 * 1024 * 1024;
const ALLOWED = ['video/mp4', 'video/quicktime'];
const PREFIX = 'lets-go-camping';

const extFor = (contentType, filename) => {
  if (contentType === 'video/quicktime') return 'mov';
  const m = /\.([a-z0-9]{2,4})$/i.exec(filename || '');
  return (m ? m[1].toLowerCase() : 'mp4');
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'POST only' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const size = Number(body.size);
    const contentType = String(body.contentType || '').toLowerCase();

    if (!Number.isFinite(size) || size <= 0) {
      return res.status(400).json({ error: 'Missing file size' });
    }
    if (size > MAX_BYTES) {
      return res.status(413).json({ error: 'That file is over the 200MB limit' });
    }
    // Phones occasionally report an empty type. Let those through and
    // pin the stored content type to mp4 rather than rejecting a real clip.
    if (contentType && !ALLOWED.includes(contentType)) {
      return res.status(415).json({ error: 'Send an MP4 or a MOV' });
    }
    const type = ALLOWED.includes(contentType) ? contentType : 'video/mp4';

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const rand = Math.random().toString(36).slice(2, 10);
    const pathname = `${PREFIX}/${stamp}_${rand}.${extFor(type, body.filename)}`;

    // 15 minutes is plenty for a 200MB upload on a phone and keeps the
    // window short if the URL leaks.
    const validUntil = Date.now() + 15 * 60 * 1000;

    const token = await issueSignedToken({
      pathname,
      operations: ['put'],
      allowedContentTypes: ALLOWED,
      maximumSizeInBytes: MAX_BYTES,
      validUntil,
    });

    const { presignedUrl } = await presignUrl(token, {
      operation: 'put',
      pathname,
      access: 'private',          // no public URL, nothing is browsable
      allowedContentTypes: ALLOWED,
      maximumSizeInBytes: MAX_BYTES,
      addRandomSuffix: false,
      allowOverwrite: false,      // a leaked URL cannot clobber another clip
      validUntil,
    });

    return res.status(200).json({
      key: pathname,
      uploadUrl: presignedUrl,
      headers: { 'content-type': type },
    });
  } catch (err) {
    console.error('submit-url failed:', err);
    return res.status(500).json({ error: 'Could not start the upload' });
  }
}
