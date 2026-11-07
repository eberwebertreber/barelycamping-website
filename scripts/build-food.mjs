// Writes the camp food pages from food/meals.js:
//   food/index.html          the ranked list
//   food/<meal-id>/index.html one page per meal, with Recipe structured data for Google
//   sitemap.xml
// Run from the site folder after editing meals.js:  node scripts/build-food.mjs
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://barelycamping.com';
const FOOD = join(ROOT, 'food');

const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(readFileSync(join(FOOD, 'meals.js'), 'utf8'), ctx);
vm.runInContext(readFileSync(join(FOOD, 'recipe.js'), 'utf8'), ctx);
const M = ctx.window.MEALS;
const F = ctx.window.Food;
const { esc } = F;
const ranked = [...M].sort((a, b) => b.score - a.score);
const best = ranked[0];

// the YouTube videos the meals come from, for the video part of the structured data
const VIDEOS = {
  'hsOuKba9Jro': { title: 'I Camped With Camo Items ONLY', date: '2026-05-22' },
  'o4YSQqVWb54': { title: 'I Camped With Inflatable Items Only', date: '2026-06-05' },
  'aVR_wan1-S8': { title: 'I Camped With Harbor Freight Items Only', date: '2026-03-27' },
  'HEQKvuhwthc': { title: 'Target VS Walmart Overnight Survival Challenge!', date: '2026-03-06' },
  'fERTJjjlppI': { title: 'I Camped Using Only $100 Worth of Temu Products', date: '2025-11-27' },
};

const ld = obj => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;
const firstSentence = s => (s.match(/^.*?[.!?](\s|$)/) || [s])[0].trim();
const clip = (s, n) => (s.length <= n ? s : s.slice(0, s.lastIndexOf(' ', n - 1)) + '...');
const ytIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.4 3.5 12 3.5 12 3.5s-7.4 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c2 .6 9.4.6 9.4.6s7.4 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.5 15.6V8.4l6.3 3.6-6.3 3.6z"/></svg>';

function head({ title, description, path, image, extra = '' }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<meta name="robots" content="index, follow, max-image-preview:large" />
<link rel="canonical" href="${SITE}${path}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Barely Camping" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:url" content="${SITE}${path}" />
<meta property="og:image" content="${SITE}${image}" />
<meta property="og:locale" content="en_US" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="theme-color" content="#F4F4F2" />
<link rel="icon" type="image/png" href="/favicon.png" />
<link rel="apple-touch-icon" href="/favicon.png" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400..800&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/regular/style.css" />
<link rel="stylesheet" href="/food/food.css" />
${extra}
<script src="/consent.js"></script>
</head>
<body>
<a class="skip" href="#main">Skip to main content</a>
<div class="wrap">
  <header class="nav">
    <nav aria-label="Main"><ul>
      <li><a href="/">Home</a></li>
      <li><a href="/food/"${path === '/food/' ? ' aria-current="page"' : ''}><i class="ph ph-fork-knife" aria-hidden="true"></i>Camp food</a></li>
      <li class="hide-sm"><a href="/game.html">Campsite</a></li>
    </ul></nav>
    <a class="yt" href="https://www.youtube.com/@barelycamping?sub_confirmation=1" target="_blank" rel="noopener">${ytIcon}<span class="vh">Barely Camping on YouTube (opens in a new tab)</span></a>
  </header>`;
}

const footer = `
  <footer>
    <span>Barely Camping</span>
    <nav aria-label="Footer"><a href="/">Home</a><a href="/privacy.html">Privacy</a><a href="/accessibility.html">Accessibility</a></nav>
  </footer>
</div>`;

const scripts = `
<div class="toast" id="toast" role="status" aria-live="polite"></div>
<script src="/food/meals.js"></script>
<script src="/food/recipe.js"></script>
<script src="/food/food.js"></script>
</body>
</html>
`;

const person = { '@type': 'Person', name: 'Luke', url: 'https://www.youtube.com/@barelycamping' };

// the list page
const types = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert'].filter(t => M.some(m => m.type === t));
const listLd = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'Every camping meal I\'ve made, ranked',
  url: `${SITE}/food/`,
  author: person,
  mainEntity: {
    '@type': 'ItemList',
    itemListElement: ranked.map((m, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}${F.url(m)}`, name: m.name })),
  },
};
const listPage = head({
  title: 'Camping Meals, Ranked: Easy Campfire Recipes | Barely Camping',
  description: `${M.length} campfire meals I've cooked while camping, each scored out of 10, with what you need, the gear and how to make it. Best so far: ${best.name}.`,
  path: '/food/',
  image: best.img,
  extra: ld(listLd),
}) + `
  <main id="main">
    <div class="hero">
      <div>
        <h1>Every camping meal I've made, ranked</h1>
        <p class="lede">Hi, I'm Luke. These are the meals I've cooked while camping, so you can figure out what you should make on your next trip.</p>
        <div class="stats"><div><b class="num">${M.length}</b><span>meals ranked</span></div></div>
        <ul class="jump" id="jump" aria-label="Jump to a meal type">${types.map(t => `<li><a class="t-${t}" href="#all" data-t="${t}">${F.ico(F.TYPE_ICON, t)}${t} <span>${M.filter(m => m.type === t).length}<span class="vh"> meals</span></span></a></li>`).join('')}</ul>
      </div>
      <div class="photo">
        <video id="clip" src="/food/img/eating.mp4" poster="/food/img/eating-poster.jpg" autoplay muted loop playsinline preload="auto" aria-hidden="true"></video>
        <button type="button" class="playpause" id="playpause" aria-label="Play the video"><i class="ph ph-play" aria-hidden="true"></i></button>
        <a class="pin" href="${F.url(best)}" data-id="${best.id}"><img src="${best.img}" alt=""><span><small>Number 1 right now</small><strong>${esc(best.name)}</strong></span>${F.badge(best.score, 'sm')}</a>
      </div>
    </div>

    <section aria-labelledby="how">
      <h2 class="vh" id="how">How the scores work</h2>
      <ul class="legend">
        <li><span class="badge num good" aria-hidden="true">8+</span><div><b>8 and up: make it</b><span>Worth bringing on your next trip</span></div></li>
        <li><span class="badge num" aria-hidden="true">6-7</span><div><b>6 to 7.9: it's fine</b><span>Eat it if it's what you've got</span></div></li>
        <li><span class="badge num bad" aria-hidden="true">&lt;6</span><div><b>Under 6: don't</b><span>I ate it so you don't have to</span></div></li>
      </ul>
    </section>

    <section class="browse" id="all" aria-labelledby="every">
      <h2 class="sec" id="every">Every meal</h2>
      <div class="bar"><div class="in">
        <label class="search"><i class="ph ph-magnifying-glass" aria-hidden="true"></i><span class="vh">Search meals or ingredients</span><input id="q" type="search" placeholder="Search meals or ingredients" autocomplete="off" /></label>
        <div class="chips" id="types" role="group" aria-label="Meal type"></div>
        <span class="divider" aria-hidden="true"></span>
        <label><span class="vh">How it's cooked</span><select class="sel" id="method"></select></label>
        <label><span class="vh">Sort by</span><select class="sel" id="sort">
          <option value="high">Highest rated</option>
          <option value="low">Lowest rated</option>
          <option value="az">A to Z</option>
        </select></label>
      </div></div>
      <p class="count" id="count" aria-live="polite">${M.length} of ${M.length} meals</p>
      <ul class="grid" id="grid">${ranked.map(m => F.card(m, m.id === best.id)).join('')}</ul>
    </section>
  </main>
${footer}
<div class="scrim" id="scrim"></div>
<div class="panel" id="panel" role="dialog" aria-modal="true" aria-labelledby="r-title"></div>
${scripts}`;
writeFileSync(join(FOOD, 'index.html'), listPage);

// one page per meal
// clear out pages for meals that were removed from meals.js
for (const d of readdirSync(FOOD)) {
  const p = join(FOOD, d);
  if (statSync(p).isDirectory() && d !== 'img' && !M.some(m => m.id === d)) rmSync(p, { recursive: true });
}
for (const m of M) {
  const path = F.url(m);
  const v = m.yt && VIDEOS[m.yt];
  const description = clip(`${F.fmt(m.score)} out of 10. ${m.take || m.quote}`, 158);
  const recipeLd = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: m.name,
    image: [`${SITE}${m.img}`],
    description: m.take || m.quote,
    author: person,
    recipeCategory: m.type,
    keywords: `camping meal, campfire recipe, camping food, ${m.method.toLowerCase()}`,
    recipeIngredient: m.ingredients,
    tool: m.gear.map(name => ({ '@type': 'HowToTool', name })),
    recipeInstructions: m.steps.map(text => ({ '@type': 'HowToStep', text })),
    review: {
      '@type': 'Review',
      author: person,
      reviewRating: { '@type': 'Rating', ratingValue: m.score, bestRating: 10, worstRating: 0 },
    },
    mainEntityOfPage: `${SITE}${path}`,
  };
  if (v) {
    recipeLd.video = {
      '@type': 'VideoObject',
      name: v.title,
      description: `Luke makes ${m.name.toLowerCase()} at camp in ${v.title}.`,
      thumbnailUrl: [`https://i.ytimg.com/vi/${m.yt}/hqdefault.jpg`],
      uploadDate: v.date,
      contentUrl: F.ytUrl(m),
      embedUrl: `https://www.youtube.com/embed/${m.yt}`,
    };
  }
  const crumbsLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: 'Camp food', item: `${SITE}/food/` },
      { '@type': 'ListItem', position: 3, name: m.name, item: `${SITE}${path}` },
    ],
  };
  const others = ranked.filter(x => x.id !== m.id);
  const page = head({
    title: `${m.name} Recipe | Barely Camping`,
    description,
    path,
    image: m.img,
    extra: ld(recipeLd) + '\n' + ld(crumbsLd),
  }) + `
  <main id="main">
    <nav aria-label="Breadcrumb"><ol class="crumbs"><li><a href="/">Home</a></li><li><a href="/food/">Camp food</a></li><li aria-current="page">${esc(m.name)}</li></ol></nav>
    <article class="meal">
      <div class="shot"><img src="${m.img}" alt="${esc(m.name)} at camp" width="1400" height="788"></div>
      <div class="recipe" data-meal="${m.id}">
        ${F.recipe(m, 'h1')}
        ${v ? `<p class="src">From my video ${esc(v.title)}.</p>` : ''}
      </div>
    </article>
    <section class="more" aria-labelledby="more">
      <h2 class="sec" id="more">More camping meals</h2>
      <ul class="grid">${others.map(x => F.card(x, x.id === best.id)).join('')}</ul>
    </section>
  </main>
${footer}
${scripts}`;
  mkdirSync(join(FOOD, m.id), { recursive: true });
  writeFileSync(join(FOOD, m.id, 'index.html'), page);
}

// the camp food button and top 5 strip on the homepage
const homePath = join(ROOT, 'index.html');
let home = readFileSync(homePath, 'utf8');
const fill = (name, html) => {
  const re = new RegExp(`(<!-- ${name}:start -->)[\\s\\S]*?(<!-- ${name}:end -->)`);
  if (!re.test(home)) throw new Error(`index.html is missing the ${name} markers`);
  home = home.replace(re, `$1${html}$2`);
};
const tone = s => (s >= 8 ? 'good' : s < 6 ? 'bad' : '');
fill('food-button', `<a class="food" href="/food/"><span class="reel" id="reel" aria-hidden="true"></span><span class="txt"><b><i class="ph ph-fork-knife" aria-hidden="true"></i>Camp food rankings</b><span>${M.length} meals ranked. Number 1 is <em>${esc(best.name.split(' with')[0])}</em></span></span><i class="ph ph-arrow-right arrow" aria-hidden="true"></i></a>`);
fill('food-strip', `
    <div class="hd"><h2 id="food-title">Camp food rankings</h2><a class="all" href="/food/">See all ${M.length} meals <i class="ph ph-arrow-right" aria-hidden="true"></i></a></div>
    <ul class="egrid">${ranked.slice(0, 5).map(m => `
      <li><a class="ecard" href="${F.url(m)}"><span class="pic"><img src="${m.img}" alt="" loading="lazy" width="1400" height="788"><span class="sc ${tone(m.score)}">${F.fmt(m.score)}<span class="vh"> out of 10</span></span></span><h3>${esc(m.name)}</h3><span class="meta">${m.type}. ${esc(m.method)}</span></a></li>`).join('')}
    </ul>
    `);
writeFileSync(homePath, home);

// sitemap
const today = new Date().toISOString().slice(0, 10);
const urls = [
  ['/', 'weekly', '1.0'],
  ['/food/', 'weekly', '0.9'],
  ...ranked.map(m => [F.url(m), 'monthly', '0.8']),
  ['/game.html', 'monthly', '0.5'],
  ['/privacy.html', 'yearly', '0.3'],
  ['/accessibility.html', 'yearly', '0.3'],
];
writeFileSync(join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([u, f, p]) => `  <url>
    <loc>${SITE}${u}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${f}</changefreq>
    <priority>${p}</priority>
  </url>`).join('\n')}
</urlset>
`);

console.log(`Built /food/ and ${M.length} meal pages, sitemap has ${urls.length} URLs.`);
