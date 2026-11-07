(function () {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touch = matchMedia('(hover: none)').matches;
  const desktop = matchMedia('(hover: hover) and (pointer: fine)').matches && innerWidth > 768;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const NEW_TAB = '<span class="vh"> (opens in a new tab)</span>';

  const socials = [
    ['YouTube', 'https://www.youtube.com/@barelycamping', 'M23.5 6.2a3 3 0 0 0-2.1-2.1C19.4 3.5 12 3.5 12 3.5s-7.4 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c2 .6 9.4.6 9.4.6s7.4 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.5 15.6V8.4l6.3 3.6-6.3 3.6z'],
    ['Instagram', 'https://www.instagram.com/barelycampin', 'M12 2.2c3.2 0 3.6 0 4.8.1 3.3.1 4.8 1.7 4.9 4.9.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 3.2-1.7 4.8-4.9 4.9-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-3.3-.1-4.8-1.7-4.9-4.9C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8C2.4 3.9 3.9 2.4 7.2 2.3 8.4 2.2 8.8 2.2 12 2.2zm0 3.6a6.2 6.2 0 1 0 0 12.4 6.2 6.2 0 0 0 0-12.4zm0 10.2a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.4-11.8a1.4 1.4 0 1 0 0 2.9 1.4 1.4 0 0 0 0-2.9z'],
    ['TikTok', 'https://www.tiktok.com/@barelycamping', 'M19.6 6.7a4.8 4.8 0 0 1-3.8-4.3V2h-3.4v13.7a2.9 2.9 0 1 1-2.1-2.8V9a6.3 6.3 0 1 0 5.5 6.3V8.7a8.2 8.2 0 0 0 4.8 1.5V6.8l-1-.1z'],
    ['Facebook', 'https://www.facebook.com/profile.php?id=61576663508596', 'M13.5 21.5v-8h2.7l.4-3.1h-3.1V8.4c0-.9.3-1.5 1.6-1.5h1.6V4.1c-.3 0-1.3-.1-2.5-.1-2.5 0-4.1 1.5-4.1 4.2v2.4H7.4v3.1h2.7v8h3.4z'],
    ['Email', 'mailto:hello@barelycamping.com', 'M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z'],
  ].map(([name, href, d]) => {
    const ext = href.startsWith('http');
    return `<li><a href="${href}"${ext ? ' target="_blank" rel="noopener"' : ''}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg><span class="vh">${name}${ext ? ' (opens in a new tab)' : ''}</span></a></li>`;
  }).join('');
  document.querySelectorAll('.social').forEach(el => { el.innerHTML = socials; });

  // logo letters: each one fades in on its own, then gets nudged by the cursor or by tilting a phone
  const letters = [];
  document.querySelectorAll('#logo .line').forEach((line, li) => {
    const text = line.textContent;
    line.textContent = '';
    [...text].forEach(ch => {
      const s = document.createElement('span');
      s.className = 'ch';
      s.dataset.line = li;
      s.innerHTML = `<span class="in">${ch}</span>`;
      s.style.setProperty('--del', (0.2 + Math.random() * 1.3).toFixed(2) + 's');
      s.style.setProperty('--dur', (0.7 + Math.random() * 1.3).toFixed(2) + 's');
      line.appendChild(s);
      letters.push(s);
    });
  });
  const state = letters.map(() => ({ x: 0, y: 0, r: 0 }));
  let centers = [];
  const measure = () => { centers = letters.map((s, i) => { const b = s.getBoundingClientRect(); return { x: b.left + b.width / 2 - state[i].x, y: b.top + b.height / 2 - state[i].y + scrollY }; }); };
  setTimeout(measure, 3200);
  addEventListener('resize', measure);

  if (!reduce) {
    let tilt = null;
    if (touch) {
      const start = () => addEventListener('deviceorientation', e => {
        if (e.gamma == null) return;
        tilt = { x: Math.max(-1, Math.min(1, e.gamma / 30)), y: Math.max(-1, Math.min(1, (e.beta - 45) / 30)) };
      });
      // iPhones ask permission for this, and that popup isn't worth it, so they skip the tilt
      if (typeof DeviceOrientationEvent === 'undefined' || typeof DeviceOrientationEvent.requestPermission !== 'function') start();
    }
    const p = { x: innerWidth / 2, y: innerHeight * 0.4, tx: innerWidth / 2, ty: innerHeight * 0.4, active: false };
    addEventListener('pointermove', e => { p.tx = e.clientX; p.ty = e.clientY; p.active = true; });
    document.addEventListener('mouseleave', () => { p.active = false; });
    const tick = () => {
      p.x += (p.tx - p.x) * 0.14; p.y += (p.ty - p.y) * 0.14;
      letters.forEach((s, i) => {
        const c = centers[i]; if (!c) return;
        let tx = 0, ty = 0, tr = 0;
        if (tilt) {
          const depth = s.dataset.line === '0' ? 14 : 22;
          tx = tilt.x * depth; ty = tilt.y * depth * 0.5; tr = tilt.x * 4;
        } else if (p.active) {
          const dx = c.x - p.x, dy = (c.y - scrollY) - p.y, d = Math.hypot(dx, dy), R = 240;
          if (d < R) { const f = (1 - d / R) ** 2; tx = dx / (d || 1) * f * 34; ty = dy / (d || 1) * f * 34; tr = dx / (d || 1) * f * 12; }
        }
        const st = state[i];
        st.x += (tx - st.x) * 0.12; st.y += (ty - st.y) * 0.12; st.r += (tr - st.r) * 0.12;
        s.style.transform = `translate(${st.x.toFixed(2)}px, ${st.y.toFixed(2)}px) rotate(${st.r.toFixed(2)}deg)`;
      });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    letters.forEach(s => s.addEventListener('pointerdown', () => s.animate(
      [{ transform: s.style.transform }, { transform: s.style.transform + ' translateY(-28px) rotate(-6deg)' }, { transform: s.style.transform }],
      { duration: 520, easing: 'cubic-bezier(.34,1.56,.64,1)' })));
  }

  // background video and the moving video rows share one pause button
  const video = document.getElementById('heroVideo');
  const motion = document.getElementById('motion');
  const setMotion = on => {
    document.body.classList.toggle('still', !on);
    if (on) video.play().catch(() => {}); else video.pause();
    motion.innerHTML = `<i class="ph ph-${on ? 'pause' : 'play'}" aria-hidden="true"></i><span class="vh">${on ? 'Pause motion' : 'Play motion'}</span>`;
  };
  setMotion(!reduce);
  motion.addEventListener('click', () => setMotion(document.body.classList.contains('still')));

  // latest videos from the channel. The rows repeat so they can loop, and the
  // repeats are hidden from screen readers and the tab order.
  const vcard = (v, copy) => `<li${copy ? ' aria-hidden="true"' : ''}><a class="vthumb" href="https://www.youtube.com/watch?v=${v.id}" target="_blank" rel="noopener"${copy ? ' tabindex="-1"' : ''}><img src="https://i.ytimg.com/vi/${v.id}/hqdefault.jpg" alt="${esc(v.title)}" loading="lazy" width="480" height="360">${copy ? '' : NEW_TAB}</a></li>`;
  fetch('/api/videos').then(r => r.json()).then(list => {
    if (!Array.isArray(list) || !list.length) return;
    const half = Math.ceil(list.length / 2);
    [[list.slice(0, half), 'belt1'], [list.slice(half), 'belt2']].forEach(([vs, id]) => {
      if (!vs.length) return;
      document.getElementById(id).innerHTML = [0, 1, 2, 3].map(k => vs.map(v => vcard(v, k > 0)).join('')).join('');
    });
  }).catch(() => {});

  // camp food button: the photo cycles through the top meals
  const ranked = [...window.MEALS].sort((a, b) => b.score - a.score);
  const reel = document.getElementById('reel');
  reel.innerHTML = ranked.slice(0, 6).map((m, i) => `<img src="${m.img}" alt=""${i ? '' : ' class="on"'}>`).join('');
  if (!reduce) {
    let k = 0;
    const imgs = reel.querySelectorAll('img');
    setInterval(() => { if (document.body.classList.contains('still')) return; imgs[k].classList.remove('on'); k = (k + 1) % imgs.length; imgs[k].classList.add('on'); }, 1800);
  }

  // paper cutout flame that flares over the YouTube button now and then
  const flame = document.querySelector('.flame');
  if (flame && !reduce) {
    const frames = [...flame.querySelectorAll('g')];
    const seq = [[0, .35], [1, .7], [2, 1], [3, 1], [1, 1.05], [2, 1], [0, 1], [3, .95], [1, 1], [2, .7], [0, .35]];
    let burning = false;
    const burn = () => {
      if (burning || document.body.classList.contains('still') || document.hidden) return;
      burning = true;
      let i = 0;
      const step = () => {
        frames.forEach(f => f.classList.remove('on'));
        if (i === seq.length) { flame.style.transform = 'scaleY(0)'; burning = false; return; }
        const [f, s] = seq[i++];
        frames[f].classList.add('on');
        flame.style.transform = `scale(${Math.min(1, s + .1)}, ${s})`;
        setTimeout(step, 95);
      };
      step();
    };
    const later = () => setTimeout(() => { burn(); later(); }, 7000 + Math.random() * 8000);
    setTimeout(burn, 3500); later();
    flame.parentElement.addEventListener('mouseenter', burn);
  }

  // phone menu
  const top = document.querySelector('.top'), menuBtn = document.getElementById('menuBtn');
  const setMenu = open => { top.classList.toggle('open', open); menuBtn.setAttribute('aria-expanded', open); };
  menuBtn.addEventListener('click', () => setMenu(!top.classList.contains('open')));
  document.querySelectorAll('#menu a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && top.classList.contains('open')) { setMenu(false); menuBtn.focus(); } });
  document.addEventListener('click', e => { if (top.classList.contains('open') && !top.contains(e.target)) setMenu(false); });

  // contact opens a card with the email, instead of scrolling to the bottom
  const card = document.getElementById('ccard');
  let lastFocus = null;
  const openContact = e => {
    if (e) e.preventDefault();
    lastFocus = document.activeElement;
    document.body.classList.add('contact-open');
    document.getElementById('cclose').focus();
  };
  const closeContact = () => {
    if (!document.body.classList.contains('contact-open')) return;
    document.body.classList.remove('contact-open');
    if (lastFocus) lastFocus.focus();
  };
  document.querySelectorAll('a[href="#contact"]').forEach(a => a.addEventListener('click', openContact));
  document.getElementById('cscrim').addEventListener('click', closeContact);
  document.getElementById('cclose').addEventListener('click', closeContact);
  document.addEventListener('keydown', e => {
    if (!document.body.classList.contains('contact-open')) return;
    if (e.key === 'Escape') { closeContact(); return; }
    if (e.key !== 'Tab') return;
    const f = [...card.querySelectorAll('a[href], button')];
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  });
  document.getElementById('ccopy').addEventListener('click', async e => {
    const b = e.currentTarget;
    try { await navigator.clipboard.writeText('hello@barelycamping.com'); b.innerHTML = '<i class="ph ph-check" aria-hidden="true"></i>Copied'; }
    catch { b.textContent = 'hello@barelycamping.com'; }
    setTimeout(() => { b.innerHTML = '<i class="ph ph-copy" aria-hidden="true"></i>Copy email'; }, 2000);
  });
  if (location.hash === '#contact') setTimeout(openContact, 400);

  new IntersectionObserver(([e]) => document.body.classList.toggle('scrolled', !e.isIntersecting), { threshold: 0.85 }).observe(document.getElementById('hero'));

  // submarine cursor with slow sonar rings, on desktop only
  if (desktop && !reduce) {
    document.body.classList.add('has-sub');
    const cur = document.createElement('div');
    cur.id = 'cursor'; cur.setAttribute('aria-hidden', 'true');
    cur.innerHTML = '<img src="/submarine_white.png" alt="" draggable="false">';
    document.body.appendChild(cur);
    const cv = document.createElement('canvas');
    cv.id = 'sonar'; cv.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cv);
    const ctx = cv.getContext('2d');
    const size = () => { cv.width = innerWidth; cv.height = innerHeight; };
    size(); addEventListener('resize', size);
    let mx = innerWidth / 2, my = innerHeight / 2, last = 0;
    cur.style.transform = `translate(${mx - 34}px, ${my - 16}px)`;
    const rings = [];
    document.addEventListener('mousemove', e => {
      mx = e.clientX; my = e.clientY;
      cur.style.transform = `translate(${mx - 34}px, ${my - 16}px)`;
      const now = Date.now();
      if (now - last > 4600) { rings.push({ x: mx, y: my, r: 0, at: now }, { x: mx, y: my, r: 0, at: now + 520 }); last = now; }
    });
    document.addEventListener('mouseover', e => { cur.classList.toggle('over', !!e.target.closest('a, button')); });
    addEventListener('keydown', e => { if (e.key === 'Tab') document.body.classList.add('kb-nav'); });
    (function loop() {
      ctx.clearRect(0, 0, cv.width, cv.height);
      const now = Date.now();
      for (let k = rings.length - 1; k >= 0; k--) {
        const g = rings[k];
        if (now < g.at) continue;
        g.r += 0.32;
        const a = 0.35 * (1 - g.r / 320);
        if (a <= 0) { rings.splice(k, 1); continue; }
        ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2); ctx.stroke();
      }
      requestAnimationFrame(loop);
    })();
  }

  console.log('%c' + `
                                        ~?5PPP5?~.
                                  ..:~JB@@@@@GB@@#:
                          .^!?YPGB#&&@@@@@@@#!?@@@5
                     .^?5B&@@@@@@@@@@@@@@@@@@@@@@@@Y.
                  ^7P#@@@@@@@@@@@@@@@@@@@@@@@@@@&BB@&J:
              :!YB@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@~  ^?GB5~
      ::::^~JG&@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@Y      .!YPJ^
     :#@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@5.         .!YPJ^
      :5&@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@&7              :757
        :!G@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@P:                  .
          :P#&&&@@@@@@@@@@@@@@@@@@@@@@@@@#7
            ...:~JP&@@@@@@@@@@@@@@@@@@@BY:
                   :7PB&@@@@@&&##BP5J5J7~~^
                       .^^~5B?^.      :.
                            :7Y5J~
                             :^!@#G!^^:.
                                ?JJJ??!.
                                 .: .:~:

  MEEEEP MEEEEEP MEEEEEEP MEEEEEEP hi howd u get here
`, 'color:#c8a96e;font-family:monospace;font-size:11px;line-height:1.4');
})();
