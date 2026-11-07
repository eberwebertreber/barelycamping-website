// Markup for a meal card and a recipe. The browser uses it for the slide-out panel,
// and scripts/build-food.mjs uses the same code to write the static pages.
(function (g) {
  const TYPE_ICON = { All: 'squares-four', Breakfast: 'egg-crack', Lunch: 'bread', Dinner: 'fork-knife', Snack: 'cookie', Dessert: 'cake' };
  const METHOD_ICON = { 'Foil': 'fire', 'Over the fire': 'campfire', 'Cast iron': 'flame', 'Pot': 'cooking-pot', 'Stove': 'fire-simple', 'No cook': 'hand-grabbing', 'Pie iron': 'fire' };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = s => s.toFixed(1);
  const tone = s => (s >= 8 ? 'good' : s < 6 ? 'bad' : '');
  const badge = (s, cls = '') => `<span class="badge num ${tone(s)} ${cls}">${fmt(s)}<span class="vh"> out of 10</span></span>`;
  const ico = (map, k) => `<i class="ph ph-${map[k] || 'circle'}" aria-hidden="true"></i>`;
  const url = m => `/food/${m.id}/`;
  const ytUrl = m => `https://www.youtube.com/watch?v=${m.yt}&t=${m.t}s`;
  const checklist = items => `<ul class="check">${items.map(x => `<li><label><input type="checkbox">${esc(x)}</label></li>`).join('')}</ul>`;

  function card(m, top) {
    return `<li><a class="card${top ? ' top' : ''}" href="${url(m)}" data-id="${m.id}">
      <span class="pic"><span class="clip"><img src="${m.img}" alt="" loading="lazy" width="1400" height="788"></span>${top ? '<span class="tag"><i class="ph ph-trophy" aria-hidden="true"></i>Number 1</span>' : ''}${badge(m.score, 'sm')}</span>
      <h3>${esc(m.name)}</h3><span class="meta t-${m.type}">${ico(TYPE_ICON, m.type)}${m.type}. ${esc(m.method)}</span></a></li>`;
  }

  // h is the heading level: h1 on a meal's own page, h2 inside the panel
  function recipe(m, h) {
    const sub = h === 'h1' ? 'h2' : 'h3';
    return `<div class="hd"><${h} class="rt" id="r-title">${esc(m.name)}</${h}>${badge(m.score)}</div>
      <ul class="tags"><li class="t-${m.type}">${ico(TYPE_ICON, m.type)}${m.type}</li><li class="t-All">${ico(METHOD_ICON, m.method)}${esc(m.method)}</li></ul>
      ${m.take ? `<p class="take">${esc(m.take)}</p>` : ''}
      ${m.quote ? `<blockquote><p>${esc(m.quote)}</p></blockquote>` : ''}
      <div class="save">
        <button type="button" data-act="save"><i class="ph ph-copy" aria-hidden="true"></i><span>Copy recipe</span></button>
        <button type="button" data-act="list"><i class="ph ph-list-checks" aria-hidden="true"></i><span>Copy list</span></button>
        <button type="button" data-act="print"><i class="ph ph-printer" aria-hidden="true"></i><span>Print</span></button>
      </div>
      <${sub} class="sub">What you need</${sub}>${checklist(m.ingredients)}
      <${sub} class="sub">Gear</${sub}>${checklist(m.gear)}
      <${sub} class="sub">How to make it</${sub}><ol>${m.steps.map(x => `<li>${esc(x)}</li>`).join('')}</ol>
      ${m.yt ? `<a class="btn watch" href="${esc(ytUrl(m))}" target="_blank" rel="noopener">Watch me make it<span class="vh"> on YouTube (opens in a new tab)</span></a>` : '<p class="soon">Video coming soon</p>'}`;
  }

  g.Food = { TYPE_ICON, METHOD_ICON, esc, fmt, badge, ico, url, ytUrl, card, recipe };
})(typeof window !== 'undefined' ? window : globalThis);
