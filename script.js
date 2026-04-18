// ─── DOM Cursor (no tilt) ────────────────────────────────
const cursorEl = document.getElementById('cursor');

if (window.innerWidth > 768 && cursorEl) {
  document.addEventListener('mousemove', (e) => {
    cursorEl.style.transform = `translate(${e.clientX - 34}px, ${e.clientY - 16}px)`;
  });

  // Hide submarine over clickable elements (let native pointer show)
  const hideSub = () => { cursorEl.style.opacity = '0'; };
  const showSub = () => { cursorEl.style.opacity = '1'; };
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
    } catch (err) {
      console.warn('Ambient audio failed to play:', err);
      ambientBtn.style.borderColor = 'rgba(255,80,80,0.6)';
      setTimeout(() => { ambientBtn.style.borderColor = ''; }, 600);
    }
  } else {
    ambientAudio.pause();
    ambientPlaying = false;
    ambientBtn.classList.remove('playing');
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
  } catch (e) { /* silent */ }
}
loadVideos();


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
                         :~7777~:
                      ~YB@@@@@@@&BY.
             .:^~!7?JPB@@@@@@@J~5@@@J
        :~7JPG#&@@@@@@@@@@@@@@@G5B@@@&^
     :75B&@@@@@@@@@@@@@@@@@@@@@@@@@@@@@&?
   :!YB&@@@@@@@@@@@@@@@@@@@@@@@@@@&GG&@#?.
  .~JG&@@@@@@@@@@@@@@@@@@@@@@@@@@@&^  .!Y##5~
 ..^?P#@@@@@@@@@@@@@@@@@@@@@@@@@@@@@J       ^JPP?^
 ~##BB#&@@@@@@@@@@@@@@@@@@@@@@@@@@@@5           :?PP?^
  J&@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@&?               ^JGP~
   :JB&@@@@@@@@@@@@@@@@@@@@@@@@@@G^                   ^!.
      :#@@@@@@@@@@@@@@@@@@@@@@@@&?
       ^YPGGB&@@@@@@@@@@@@@@@@@&5:
             .~?P&@@@@@@@@@@@&&P7..
                 :75B&@@@&@&&#BP5JYY?!!~^
                     :^~~!G#?^..      .^.
                           ^?YY7^
                            :!7#@B?:.
                               !&YBY77!^
                                ^?~~!??!.

  MEEEEP MEEEEEP MEEEEEEP MEEEEEEP hi howd u get here
`,
  'color:#c8a96e;font-family:monospace;font-size:11px;line-height:1.4'
);
