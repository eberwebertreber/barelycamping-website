// ─── DOM Cursor (no tilt) ────────────────────────────────
const cursorEl = document.getElementById('cursor');

// Track latest mouse position always — used for submarine boot landing
let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;
let lastMoveAt = Date.now();
let bootComplete = false;

document.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  lastMoveAt = Date.now();
});

if (window.innerWidth > 768 && cursorEl) {
  document.addEventListener('mousemove', (e) => {
    if (!bootComplete) return;                         // boot owns the cursor until ready
    cursorEl.style.transform = `translate(${e.clientX - 34}px, ${e.clientY - 16}px)`;
  });

  // Hide submarine over clickable elements (let native pointer show)
  const hideSub = () => { if (bootComplete) cursorEl.style.opacity = '0'; };
  const showSub = () => { if (bootComplete) cursorEl.style.opacity = '1'; };
  document.addEventListener('mouseover', (e) => {
    if (e.target.closest('a, button, .logo-stack, .ambient-btn')) hideSub();
    else showSub();
  });

  // Cursor transition so it fades instead of snapping
  cursorEl.style.transition = 'opacity 0.18s ease';
}


// ─── Canvas Setup ────────────────────────────────────────
const canvas = document.getElementById('particles');
const ctx    = canvas.getContext('2d');

function resize() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);


// ─── Ember Particles ─────────────────────────────────────
const EMBER_COLORS = [
  'rgba(255,100,20,', 'rgba(255,60,10,',
  'rgba(255,160,40,', 'rgba(255,200,80,',
  'rgba(200,40,10,',
];

class Ember {
  constructor() { this.reset(true); }
  reset(initial = false) {
    this.x        = window.innerWidth * 0.3 + Math.random() * window.innerWidth * 0.4;
    this.y        = initial ? Math.random() * window.innerHeight : window.innerHeight + 10;
    this.size     = Math.random() * 2.2 + 0.6;
    this.speedY   = Math.random() * 1.2 + 0.4;
    this.speedX   = (Math.random() - 0.5) * 0.7;
    this.wobble   = Math.random() * Math.PI * 2;
    this.wobbleSpd= (Math.random() - 0.5) * 0.04;
    this.alpha    = Math.random() * 0.6 + 0.3;
    this.decay    = Math.random() * 0.004 + 0.002;
    this.color    = EMBER_COLORS[Math.floor(Math.random() * EMBER_COLORS.length)];
  }
  update() {
    this.y      -= this.speedY;
    this.wobble += this.wobbleSpd;
    this.x      += Math.sin(this.wobble) * 0.5 + this.speedX;
    this.alpha  -= this.decay;
    if (this.alpha <= 0 || this.y < -10) this.reset();
  }
  draw() {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.shadowBlur  = 8;
    ctx.shadowColor = this.color + '0.8)';
    ctx.fillStyle   = this.color + this.alpha + ')';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

const embers = Array.from({ length: 55 }, () => new Ember());


// ─── Radar Rings (slow sonar pings) ─────────────────────
const rings = [];
let lastRingTime = 0;

class RadarRing {
  constructor(x, y, delay = 0) {
    this.x = x; this.y = y;
    this.radius   = 0;
    this.maxRadius= 320;
    this.alpha    = 0;
    this.speed    = 1.15;
    this.startAt  = Date.now() + delay;
    this.alive    = true;
  }
  update() {
    if (Date.now() < this.startAt) return;
    this.radius += this.speed;
    this.alpha   = 0.35 * (1 - this.radius / this.maxRadius);
    if (this.radius >= this.maxRadius) this.alive = false;
  }
  draw() {
    if (Date.now() < this.startAt) return;
    ctx.save();
    ctx.strokeStyle = `rgba(255,255,255,${this.alpha})`;
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

if (window.innerWidth > 768) {
  document.addEventListener('mousemove', (e) => {
    const now = Date.now();
    if (now - lastRingTime > 2400) {
      rings.push(new RadarRing(e.clientX, e.clientY, 0));
      rings.push(new RadarRing(e.clientX, e.clientY, 380));
      rings.push(new RadarRing(e.clientX, e.clientY, 760));
      lastRingTime = now;
    }
  });
}


// ─── Main Animation Loop ─────────────────────────────────
function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  embers.forEach(e => { e.update(); e.draw(); });
  for (let i = rings.length - 1; i >= 0; i--) {
    rings[i].update();
    rings[i].draw();
    if (!rings[i].alive) rings.splice(i, 1);
  }
  requestAnimationFrame(animate);
}
animate();


// ─── Hero Video Parallax ─────────────────────────────────
const heroVideo = document.getElementById('heroVideo');
if (heroVideo && window.innerWidth > 768) {
  document.addEventListener('mousemove', (e) => {
    const x = (e.clientX / window.innerWidth  - 0.5) * 18;
    const y = (e.clientY / window.innerHeight - 0.5) * 18;
    heroVideo.style.transform = `scale(1.06) translate(${x}px, ${y}px)`;
  });
}


// ─── Letter Drop (random directions) ────────────────────
const DIRS = [
  ['0px',   '-50px'],  // top
  ['0px',    '50px'],  // bottom
  ['-50px',  '0px'],   // left
  ['50px',   '0px'],   // right
  ['-40px', '-40px'],  // top-left
  ['40px',  '-40px'],  // top-right
  ['-40px',  '40px'],  // bottom-left
  ['40px',   '40px'],  // bottom-right
];

function splitLetters(lineEl, offset = 0) {
  const text = lineEl.textContent.trim();
  lineEl.innerHTML = text.split('').map((ch, i) => {
    const [fx, fy] = DIRS[Math.floor(Math.random() * DIRS.length)];
    return `<span class="letter" data-char="${ch}" style="--i:${i + offset};--fx:${fx};--fy:${fy}">${ch}</span>`;
  }).join('');
}

const line1 = document.getElementById('line1');
const line2 = document.getElementById('line2');
if (line1 && line2) {
  const l1len = line1.textContent.trim().length;
  splitLetters(line1, 0);
  splitLetters(line2, l1len + 1);
}


// ─── Konami Code Easter Egg (↑↑↓↓←→←→BA = ember burst) ──
const KONAMI = [
  'ArrowUp','ArrowUp','ArrowDown','ArrowDown',
  'ArrowLeft','ArrowRight','ArrowLeft','ArrowRight',
  'b','a'
];
let konamiPos = 0;

document.addEventListener('keydown', (e) => {
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (key === KONAMI[konamiPos]) {
    konamiPos++;
    if (konamiPos === KONAMI.length) {
      spawnEmberBurst();
      konamiPos = 0;
    }
  } else {
    konamiPos = 0;
  }
});

function spawnEmberBurst() {
  if (embers.length > 1000) return;    // safety cap (raised for bigger burst)
  const cx = window.innerWidth  / 2;
  const cy = window.innerHeight / 2;
  for (let i = 0; i < 360; i++) {
    const b = new Ember();
    b.x       = cx + (Math.random() - 0.5) * 640;
    b.y       = cy + (Math.random() - 0.5) * 360;
    b.speedY  = Math.random() * 5 + 1.8;
    b.speedX  = (Math.random() - 0.5) * 6;
    b.alpha   = Math.random() * 0.4 + 0.65;
    b.decay   = Math.random() * 0.006 + 0.003;
    b.size    = Math.random() * 3.4 + 1.2;
    embers.push(b);
  }
  // Brief whoosh-style flash via the body glitch filter
  document.body.style.transition = 'filter 0.6s ease';
  document.body.style.filter = 'brightness(1.22) saturate(1.45)';
  setTimeout(() => { document.body.style.filter = ''; }, 600);
}


// ─── Flashlight Mode (press F = torch cone follows cursor) ─
const flashlightEl = document.getElementById('flashlight');

document.addEventListener('keydown', (e) => {
  // ignore if typing in an input
  const t = document.activeElement?.tagName;
  if (t === 'INPUT' || t === 'TEXTAREA') return;
  if (e.key === 'f' || e.key === 'F') {
    document.body.classList.toggle('flashlight-on');
  }
});

// Cone tracks the cursor (desktop) — reuses mousemove
document.addEventListener('mousemove', (e) => {
  if (!flashlightEl) return;
  flashlightEl.style.setProperty('--fx', e.clientX + 'px');
  flashlightEl.style.setProperty('--fy', e.clientY + 'px');
});
// Mobile: tap-drag moves the cone
document.addEventListener('touchmove', (e) => {
  if (!flashlightEl || !e.touches[0]) return;
  flashlightEl.style.setProperty('--fx', e.touches[0].clientX + 'px');
  flashlightEl.style.setProperty('--fy', e.touches[0].clientY + 'px');
}, { passive: true });


// ─── Heartbeat Pulse (night-only, 8pm–6am local) ─────────
(function heartbeat() {
  const h = new Date().getHours();
  if (h >= 20 || h < 6) {
    document.getElementById('heartbeat')?.classList.add('active');
  }
})();


// ─── Logo Easter Egg (5 clicks = page glitch) ───────────
const GLITCH_CHARS = '!@#$%Δ∑≠∞◆▲░▒▓';
let logoClicks = 0;

document.getElementById('logoStack')?.addEventListener('click', () => {
  logoClicks++;
  if (logoClicks >= 5) {
    logoClicks = 0;

    // Scramble letters
    const letters = document.querySelectorAll('.letter');
    let frame = 0;
    const interval = setInterval(() => {
      letters.forEach(l => {
        l.textContent = GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
      });
      frame++;
      if (frame >= 18) {
        clearInterval(interval);
        letters.forEach(l => { l.textContent = l.dataset.char; });
      }
    }, 50);

    // Full page colour glitch
    document.body.classList.add('glitching');
    setTimeout(() => document.body.classList.remove('glitching'), 950);
  }
});


// ─── Ambient Sound Toggle ────────────────────────────────
const ambientBtn   = document.getElementById('ambientBtn');
const ambientAudio = document.getElementById('ambientAudio');
let ambientPlaying = false;

ambientBtn?.addEventListener('click', async () => {
  if (!ambientPlaying) {
    try {
      ambientAudio.volume = 0.35;
      await ambientAudio.play();
      ambientPlaying = true;
      ambientBtn.classList.add('playing');
      document.body.classList.add('ambient-on');
    } catch (err) {
      console.warn('Ambient audio failed to play:', err);
      ambientBtn.style.borderColor = 'rgba(255,80,80,0.6)';
      setTimeout(() => { ambientBtn.style.borderColor = ''; }, 600);
    }
  } else {
    ambientAudio.pause();
    ambientPlaying = false;
    ambientBtn.classList.remove('playing');
    document.body.classList.remove('ambient-on');
  }
});


// ─── Video Carousel ──────────────────────────────────────
async function loadVideos() {
  const track = document.getElementById('videoTrack');
  if (!track) return;
  try {
    const res    = await fetch('/api/videos');
    const videos = await res.json();
    if (!videos.length) return;
    const makeCard = ({ id, title, url }) =>
      `<a href="${url}" target="_blank" class="video-card" title="${title}">
        <img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="${title}" loading="lazy"/>
      </a>`;
    const cards = videos.map(makeCard).join('');
    track.innerHTML = cards + cards;

    // Mobile: replace CSS auto-scroll with a touchable JS version
    if (window.innerWidth <= 768) initMobileCarousel(track);
  } catch (e) { /* silent */ }
}
loadVideos();


// ─── Camper ID (persistent visitor number) ───────────────
(async function assignCamperId() {
  const el = document.getElementById('camperId');
  if (!el) return;
  let id = localStorage.getItem('bc_camperId');
  if (!id) {
    try {
      const r = await fetch('https://abacus.jasoncameron.dev/hit/barelycamping.com/camper');
      const data = await r.json();
      id = data.value;
    } catch {
      id = Math.floor(Math.random() * 90000) + 10000;   // fallback
    }
    localStorage.setItem('bc_camperId', id);
  }
  el.textContent = `camper #${Number(id).toLocaleString()}`;
})();


// ─── Boot Sequence ───────────────────────────────────────
(function boot() {
  document.body.classList.add('booting');
  const isDesktop = window.innerWidth > 768;

  // Pre-position submarine off-screen (top center) so it can drop
  if (cursorEl && isDesktop) {
    cursorEl.style.transition = 'none';
    cursorEl.style.transform =
      `translate(${window.innerWidth / 2 - 34}px, -140px)`;
  }

  // Stage 1 — Letters (already animating via existing CSS)
  // Stage 2 @ 1.5s — Background fades in
  setTimeout(() => document.body.classList.add('boot-bg'), 1500);

  // Stage 3 @ 2.0s — Ember canvas appears + big burst from bottom
  setTimeout(() => {
    document.body.classList.add('boot-particles');
    spawnBottomSurge();
  }, 2000);

  // Stage 4 @ 3.0s — Buttons, ambient, scroll hint, camper ID stagger in
  setTimeout(() => document.body.classList.add('boot-buttons'), 3000);

  // Stage 5 @ 4.3s — Submarine drops from top and descends to cursor
  setTimeout(() => {
    if (!cursorEl || !isDesktop) return;
    document.body.classList.add('boot-sub');
    const targetX = mouseX - 34;
    const targetY = mouseY - 16;
    cursorEl.style.transition =
      'transform 1.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease';
    requestAnimationFrame(() => {
      cursorEl.style.transform = `translate(${targetX}px, ${targetY}px)`;
    });
  }, 4300);

  // Stage 6 @ 5.9s — Boot finished, cursor follows mouse normally
  setTimeout(() => {
    document.body.classList.remove('booting');
    if (cursorEl) {
      cursorEl.style.transition = 'opacity 0.18s ease';
      // Sync to current mouse position so there's no stale jump
      if (isDesktop) {
        cursorEl.style.transform = `translate(${mouseX - 34}px, ${mouseY - 16}px)`;
      }
    }
    bootComplete = true;
  }, 5900);
})();

function spawnBottomSurge() {
  if (embers.length > 1000) return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  for (let i = 0; i < 220; i++) {
    const b = new Ember();
    b.x       = Math.random() * w;
    b.y       = h + Math.random() * 30;
    b.speedY  = Math.random() * 4 + 2.2;
    b.speedX  = (Math.random() - 0.5) * 1.4;
    b.alpha   = Math.random() * 0.5 + 0.55;
    b.size    = Math.random() * 2.6 + 0.9;
    b.decay   = Math.random() * 0.005 + 0.0025;
    embers.push(b);
  }
}

function initMobileCarousel(track) {
  const wrap = track.parentElement;
  if (!wrap) return;

  // Override desktop animation / transform so the container scrolls natively
  wrap.classList.add('mobile-carousel');
  track.style.animation = 'none';
  track.style.transform = 'none';

  let paused = false;
  let resumeTimer = null;
  const SPEED = 0.5; // px per frame (~30px/s)

  function tick() {
    if (!paused) {
      const half = track.scrollWidth / 2;
      if (wrap.scrollLeft >= half) {
        wrap.scrollLeft -= half; // seamless loop — we have cards duplicated
      } else {
        wrap.scrollLeft += SPEED;
      }
    }
    requestAnimationFrame(tick);
  }

  wrap.addEventListener('touchstart', () => {
    paused = true;
    clearTimeout(resumeTimer);
  }, { passive: true });

  wrap.addEventListener('touchend', () => {
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => { paused = false; }, 2500);
  }, { passive: true });

  tick();
}


// ─── Fade in hero content ─────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  const content = document.querySelector('.hero-content');
  if (!content) return;
  content.style.opacity   = '0';
  content.style.transform = 'translateY(16px)';
  content.style.transition= 'opacity 1.1s ease, transform 1.1s ease';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    content.style.opacity   = '1';
    content.style.transform = 'translateY(0)';
  }));
});


// ─── Console Easter Egg ──────────────────────────────────
console.log(
  '%c' + `
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
`,
  'color:#c8a96e;font-family:monospace;font-size:11px;line-height:1.4'
);
