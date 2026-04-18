// ─── DOM Cursor ──────────────────────────────────────────
const cursorEl = document.getElementById('cursor');
let cx = -200, cy = -200;

if (window.innerWidth > 768) {
  document.addEventListener('mousemove', (e) => {
    cx = e.clientX;
    cy = e.clientY;
    cursorEl.style.transform = `translate(${cx - 34}px, ${cy - 16}px)`;
  });

  // Slight tilt on horizontal movement
  let lastX = cx;
  setInterval(() => {
    const dx = cx - lastX;
    const tilt = Math.max(-15, Math.min(15, dx * 0.8));
    cursorEl.style.transform = `translate(${cx - 34}px, ${cy - 16}px) rotate(${tilt}deg)`;
    lastX = cx;
  }, 60);
}


// ─── Canvas Setup ────────────────────────────────────────
const canvas = document.getElementById('particles');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);


// ─── Ember Particles ─────────────────────────────────────
const EMBER_COLORS = [
  'rgba(255, 100, 20,',
  'rgba(255, 60, 10,',
  'rgba(255, 160, 40,',
  'rgba(255, 200, 80,',
  'rgba(200, 40, 10,',
];

class Ember {
  constructor() { this.reset(true); }

  reset(initial = false) {
    this.x = window.innerWidth * 0.3 + Math.random() * window.innerWidth * 0.4;
    this.y = initial ? Math.random() * window.innerHeight : window.innerHeight + 10;
    this.size = Math.random() * 2.2 + 0.6;
    this.speedY = Math.random() * 1.2 + 0.4;
    this.speedX = (Math.random() - 0.5) * 0.7;
    this.wobble = Math.random() * Math.PI * 2;
    this.wobbleSpeed = (Math.random() - 0.5) * 0.04;
    this.alpha = Math.random() * 0.6 + 0.3;
    this.decay = Math.random() * 0.004 + 0.002;
    this.color = EMBER_COLORS[Math.floor(Math.random() * EMBER_COLORS.length)];
  }

  update() {
    this.y -= this.speedY;
    this.wobble += this.wobbleSpeed;
    this.x += Math.sin(this.wobble) * 0.5 + this.speedX;
    this.alpha -= this.decay;
    if (this.alpha <= 0 || this.y < -10) this.reset();
  }

  draw() {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.shadowBlur = 8;
    ctx.shadowColor = this.color + '0.8)';
    ctx.fillStyle = this.color + this.alpha + ')';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

const embers = Array.from({ length: 55 }, () => new Ember());


// ─── Radar Rings (slow, rare) ────────────────────────────
const rings = [];
let lastRingTime = 0;
let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;

class RadarRing {
  constructor(x, y, delay = 0) {
    this.x = x;
    this.y = y;
    this.radius = 0;
    this.maxRadius = 110;
    this.alpha = 0;
    this.speed = 0.55;
    this.startTime = Date.now() + delay;
    this.started = false;
  }

  update() {
    if (Date.now() < this.startTime) return;
    this.started = true;
    this.radius += this.speed;
    this.alpha = 0.45 * (1 - this.radius / this.maxRadius);
  }

  draw() {
    if (!this.started) return;
    ctx.save();
    ctx.strokeStyle = `rgba(255, 255, 255, ${this.alpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  isDead() { return this.started && this.radius >= this.maxRadius; }
}

if (window.innerWidth > 768) {
  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    const now = Date.now();
    if (now - lastRingTime > 2400) {
      // 3 concentric rings staggered in time
      rings.push(new RadarRing(mouseX, mouseY, 0));
      rings.push(new RadarRing(mouseX, mouseY, 350));
      rings.push(new RadarRing(mouseX, mouseY, 700));
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
    if (rings[i].isDead()) rings.splice(i, 1);
  }
  requestAnimationFrame(animate);
}
animate();


// ─── Hero Video Parallax ─────────────────────────────────
const heroVideo = document.getElementById('heroVideo');
if (heroVideo && window.innerWidth > 768) {
  document.addEventListener('mousemove', (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 18;
    const y = (e.clientY / window.innerHeight - 0.5) * 18;
    heroVideo.style.transform = `scale(1.06) translate(${x}px, ${y}px)`;
  });
}


// ─── Letter Drop Animation ───────────────────────────────
function splitLetters(lineEl, offset = 0) {
  const text = lineEl.textContent.trim();
  lineEl.innerHTML = text.split('').map((ch, i) =>
    `<span class="letter" style="--i:${i + offset}">${ch}</span>`
  ).join('');
}

const line1 = document.getElementById('line1');
const line2 = document.getElementById('line2');
if (line1 && line2) {
  splitLetters(line1, 0);
  splitLetters(line2, line1.textContent.length + 1);
}


// ─── Video Carousel ──────────────────────────────────────
async function loadVideos() {
  const track = document.getElementById('videoTrack');
  try {
    const res = await fetch('/api/videos');
    const videos = await res.json();
    if (!videos.length) return;
    const makeCard = ({ id, title, url }) =>
      `<a href="${url}" target="_blank" class="video-card" title="${title}">
        <img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="${title}" loading="lazy"/>
      </a>`;
    const cards = videos.map(makeCard).join('');
    track.innerHTML = cards + cards;
  } catch (e) { /* silent fail */ }
}
loadVideos();


// ─── Fade in content ─────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  const content = document.querySelector('.hero-content');
  content.style.opacity = '0';
  content.style.transform = 'translateY(16px)';
  content.style.transition = 'opacity 1.1s ease, transform 1.1s ease';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    content.style.opacity = '1';
    content.style.transform = 'translateY(0)';
  }));
});


// ─── Console Easter Egg ──────────────────────────────────
console.log(
  '%c\n' +
  '     (  .  )   W O O D C O C K\n' +
  '    (       )\n' +
  '   (  o   o )\n' +
  '  (    ~~~   )    found the console, huh\n' +
  '   (  ___  )      nothing to see here\n' +
  '    -------\n' +
  '    |     |       just fire and vibes\n' +
  '   /       \\\n' +
  '  /  /   \\  \\\n',
  'color: #c8a96e; font-family: monospace; font-size: 12px; line-height: 1.8'
);
console.log('%chello@barelycamping.com', 'color: #666; font-family: monospace; font-size: 11px');
