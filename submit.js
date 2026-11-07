/* The "let's go camping" clip submission page.

     1. the submarine cursor, same behaviour as the homepage
     2. inspect the chosen video IN THE BROWSER before uploading,
        so a portrait or 720p clip is caught on the user's phone
        instead of after a 90MB upload
     3. upload direct to storage via a presigned URL, so the file
        never passes through a serverless function (Vercel caps
        function request bodies at 4.5MB)
     4. accept a plain link instead of a file, for anyone who
        would rather host it themselves */

const SPEC = {
  minShortSide: 1080,
  idealMaxSec: 15,          // the number stated on the page
  hardMinSec: 1,
  hardMaxSec: 30,           // past this it is not a clip, it is a vlog
  maxBytes: 200 * 1024 * 1024,
};

/* submarine cursor */
(function cursor() {
  const el = document.getElementById('cursor');
  if (!el) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia('(hover: none)').matches) return;

  let raf = null, x = 0, y = 0;

  document.addEventListener('mousemove', (e) => {
    x = e.clientX; y = e.clientY;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      el.style.transform = `translate(${x - 34}px, ${y - 16}px)`;
      raf = null;
    });
  });

  document.addEventListener('mouseover', (e) => {
    const hit = e.target.closest('a, button, input, label, select, textarea, video, summary');
    el.style.opacity = hit ? '0' : '1';
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      document.body.classList.add('kb-nav');
      el.style.display = 'none';
    }
  });
})();

/* example clip: keep the placeholder unless a file loads */
(function example() {
  const video = document.getElementById('exampleVideo');
  if (!video) return;
  const frame = video.closest('.example-frame');
  video.addEventListener('loadeddata', () => frame.classList.add('has-video'));
})();

/* helpers */
const $ = (id) => document.getElementById(id);

function showError(el, msg) {
  if (!el) return;
  el.textContent = msg || '';
  el.classList.toggle('show', Boolean(msg));
}

function fmtBytes(b) {
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function looksLikeUrl(v) {
  if (!v) return false;
  try {
    const u = new URL(v.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch { return false; }
}

/**
 * Read width, height and duration out of a local file using a
 * throwaway <video>. Resolves with readable:false if the browser
 * cannot decode it (common with HEVC .mov on some desktops),
 * which we treat as "unknown", not "invalid".
 */
function probe(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    let settled = false;

    const finish = (data) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      resolve(data);
    };

    const timer = setTimeout(() => finish({ readable: false }), 8000);

    v.preload = 'metadata';
    v.muted = true;
    v.onloadedmetadata = () => finish({
      readable: true,
      width: v.videoWidth,
      height: v.videoHeight,
      duration: v.duration,
    });
    v.onerror = () => finish({ readable: false });
    v.src = url;
  });
}

/* validation */
function validate(file, meta) {
  const rows = [];
  let blocking = false;

  if (file.size > SPEC.maxBytes) {
    rows.push({ state: 'fail', text: `${fmtBytes(file.size)}, over the 200MB cap` });
    blocking = true;
  } else {
    rows.push({ state: 'pass', text: fmtBytes(file.size) });
  }

  if (!meta.readable) {
    rows.push({ state: 'warn', text: 'Could not read this file in your browser. It will be checked by hand.' });
    return { rows, blocking };
  }

  if (meta.width > meta.height) {
    rows.push({ state: 'pass', text: `Landscape, ${meta.width} x ${meta.height}` });
  } else {
    rows.push({ state: 'fail', text: 'Portrait. Record again holding your phone horizontally.' });
    blocking = true;
  }

  const shortSide = Math.min(meta.width, meta.height);
  if (shortSide >= SPEC.minShortSide) {
    rows.push({ state: 'pass', text: `${shortSide}p` });
  } else {
    rows.push({ state: 'fail', text: `${shortSide}p, needs to be 1080p or higher.` });
    blocking = true;
  }

  const d = meta.duration;
  if (!isFinite(d) || d <= 0) {
    rows.push({ state: 'warn', text: 'Could not read the length' });
  } else if (d < SPEC.hardMinSec) {
    rows.push({ state: 'fail', text: `${d.toFixed(1)}s, too short` });
    blocking = true;
  } else if (d > SPEC.hardMaxSec) {
    rows.push({ state: 'fail', text: `${Math.round(d)}s, too long. Keep it under 15 seconds.` });
    blocking = true;
  } else if (d > SPEC.idealMaxSec) {
    rows.push({ state: 'warn', text: `${Math.round(d)}s, slightly over 15 seconds. It will be trimmed.` });
  } else {
    rows.push({ state: 'pass', text: `${d.toFixed(1)}s` });
  }

  return { rows, blocking };
}

/* form wiring */
(function form() {
  const form = $('submitForm');
  if (!form) return;

  const drop = $('drop');
  const fileInput = $('fileInput');
  const linkInput = $('linkInput');
  const checksEl = $('checks');
  const submitBtn = $('submitBtn');

  let picked = null;   // { file, meta }

  const hasLink = () => looksLikeUrl(linkInput.value);

  const refreshSubmit = () => {
    submitBtn.disabled = !(
      (picked || hasLink())
      && $('nameInput').value.trim().length > 0
      && $('musicCheck').checked
      && $('ageCheck').checked
      && $('rightsCheck').checked
    );
  };

  /* file selection */
  async function handleFile(file) {
    showError($('fileError'), '');
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      drop.dataset.state = 'idle';
      picked = null;
      refreshSubmit();
      showError($('fileError'), 'That file is not a video. Upload an MP4 or a MOV.');
      return;
    }

    drop.dataset.state = 'checking';
    const meta = await probe(file);
    const { rows, blocking } = validate(file, meta);

    $('pickedName').textContent = file.name;
    checksEl.innerHTML = '';
    for (const row of rows) {
      const li = document.createElement('li');
      li.className = row.state;
      const b = document.createElement('b');
      b.textContent = row.state === 'pass' ? '✓' : row.state === 'fail' ? '✕' : '!';
      li.append(b, document.createTextNode(row.text));
      checksEl.appendChild(li);
    }

    drop.dataset.state = 'picked';
    picked = blocking ? null : { file, meta };
    if (blocking) showError($('fileError'), 'Fix the issues above, then try again.');
    refreshSubmit();
  }

  fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

  $('clearFile').addEventListener('click', () => {
    picked = null;
    fileInput.value = '';
    drop.dataset.state = 'idle';
    showError($('fileError'), '');
    refreshSubmit();
  });

  /* drag and drop */
  ['dragenter', 'dragover'].forEach((ev) =>
    drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('dragover'); })
  );
  ['dragleave', 'drop'].forEach((ev) =>
    drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('dragover'); })
  );
  drop.addEventListener('drop', (e) => {
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  });

  /* live enable/disable */
  ['nameInput', 'linkInput', 'musicCheck', 'ageCheck', 'rightsCheck'].forEach((id) =>
    $(id).addEventListener('input', refreshSubmit)
  );

  /* PUT the file with progress */
  function putFile(url, file, headers, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', url, true);
      for (const [k, v] of Object.entries(headers || {})) xhr.setRequestHeader(k, v);
      xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
      xhr.onload = () =>
        xhr.status >= 200 && xhr.status < 300
          ? resolve()
          : reject(new Error(`Storage rejected the upload (${xhr.status})`));
      xhr.onerror = () => reject(new Error('Network dropped during the upload'));
      xhr.send(file);
    });
  }

  /* submit */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    ['formError', 'nameError', 'consentError', 'linkError', 'emailError'].forEach((id) => showError($(id), ''));

    const name = $('nameInput').value.trim();
    if (!name) { showError($('nameError'), 'First name is required.'); return; }

    const link = linkInput.value.trim();
    if (!picked && !link) { showError($('fileError'), 'Upload a video, or paste a link to one.'); return; }
    if (!picked && link && !looksLikeUrl(link)) {
      showError($('linkError'), 'That link is not valid. It should start with http.');
      return;
    }

    if (!$('musicCheck').checked || !$('ageCheck').checked || !$('rightsCheck').checked) {
      showError($('consentError'), 'Please confirm all three before submitting.');
      return;
    }

    const email = $('emailInput').value.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      showError($('emailError'), 'That email is not valid. You can leave it blank.');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting';

    const setProgress = (frac) => {
      const pct = Math.round(frac * 100);
      $('progressFill').style.width = `${pct}%`;
      $('progressLabel').textContent = `Uploading ${pct}%`;
    };

    try {
      let key = null;

      // A file beats a link if somebody gives both.
      if (picked) {
        $('progress').hidden = false;
        setProgress(0);

        const tokenRes = await fetch('/api/submit-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: picked.file.name,
            size: picked.file.size,
            contentType: picked.file.type,
          }),
        });
        if (!tokenRes.ok) throw new Error(`Could not start the upload (${tokenRes.status})`);
        const { uploadUrl, key: k, headers } = await tokenRes.json();

        await putFile(uploadUrl, picked.file, headers, setProgress);
        key = k;
        $('progressLabel').textContent = 'Finishing up';
      }

      const doneRes = await fetch('/api/submit-done', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key,
          link: picked ? null : link,
          name,
          email,
          sizeBytes: picked ? picked.file.size : null,
          width: picked ? (picked.meta.width ?? null) : null,
          height: picked ? (picked.meta.height ?? null) : null,
          durationSec: picked ? (picked.meta.duration ?? null) : null,
          consent: true,
          age18: true,
          noCopyrightedMusic: true,
        }),
      });
      if (!doneRes.ok) throw new Error(`Upload saved but details did not (${doneRes.status})`);

      form.hidden = true;
      $('done').hidden = false;
      $('done').scrollIntoView({ block: 'center', behavior: 'smooth' });
    } catch (err) {
      $('progress').hidden = true;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit';
      showError($('formError'), `${err.message}. Please try again.`);
    }
  });

  $('sendAnother').addEventListener('click', () => {
    picked = null;
    fileInput.value = '';
    drop.dataset.state = 'idle';
    form.reset();
    form.hidden = false;
    $('done').hidden = true;
    $('progress').hidden = true;
    submitBtn.textContent = 'Submit';
    refreshSubmit();
    form.scrollIntoView({ block: 'start', behavior: 'smooth' });
  });

  refreshSubmit();
})();
