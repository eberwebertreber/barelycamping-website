// ─── Ember Particle System ───────────────────────────────
const canvas = document.getElementById('particles');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

const EMBER_COUNT = 55;
const embers = [];

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
    // Spawn from lower center-ish of screen (where the fire is)
    this.x = window.innerWidth * 0.3 + Math.random() * window.innerWidth * 0.4;
    this.y = initial
      ? Math.random() * window.innerHeight
      : window.innerHeight + 10;
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

for (let i = 0; i < EMBER_COUNT; i++) embers.push(new Ember());

function animateEmbers() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  embers.forEach(e => { e.update(); e.draw(); });
  requestAnimationFrame(animateEmbers);
}
animateEmbers();


// ─── Mouse Parallax on Hero Video ───────────────────────
const heroVideo = document.getElementById('heroVideo');

document.addEventListener('mousemove', (e) => {
  const x = (e.clientX / window.innerWidth - 0.5) * 18;
  const y = (e.clientY / window.innerHeight - 0.5) * 18;
  heroVideo.style.transform = `scale(1.06) translate(${x}px, ${y}px)`;
});


// ─── Auto-populate Video Carousel ───────────────────────
async function loadVideos() {
  const track = document.getElementById('videoTrack');
  try {
    const res = await fetch('/api/videos');
    const videos = await res.json();
    if (!videos.length) return;

    // Build cards, duplicated for seamless loop
    const makeCard = ({ id, title, url }) =>
      `<a href="${url}" target="_blank" class="video-card" title="${title}">
        <img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="${title}" loading="lazy" />
      </a>`;

    const cards = videos.map(makeCard).join('');
    track.innerHTML = cards + cards; // duplicate for infinite loop
  } catch (e) {
    // silently fail — section just stays empty
  }
}
loadVideos();


// ─── Fade in hero content ────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  const content = document.querySelector('.hero-content');
  content.style.opacity = '0';
  content.style.transform = 'translateY(16px)';
  content.style.transition = 'opacity 1.1s ease, transform 1.1s ease';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      content.style.opacity = '1';
      content.style.transform = 'translateY(0)';
    });
  });
});
