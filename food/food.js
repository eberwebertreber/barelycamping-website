(function () {
  const M = window.MEALS;
  const F = window.Food;
  const byId = id => M.find(m => m.id === id);
  const ranked = [...M].sort((a, b) => b.score - a.score);
  const best = ranked[0];
  const NL = String.fromCharCode(10);
  const PHONE = matchMedia('(hover: none) and (pointer: coarse)').matches && !!navigator.share;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // copy, share and print buttons on any recipe
  const toastEl = document.getElementById('toast');
  const toast = msg => { toastEl.textContent = msg; toastEl.classList.add('on'); clearTimeout(toastEl._h); toastEl._h = setTimeout(() => toastEl.classList.remove('on'), 2400); };
  const pageUrl = m => 'https://barelycamping.com' + F.url(m);
  const recipeText = m => [m.name, `${F.fmt(m.score)}/10 from Barely Camping`, '', 'What you need:', ...m.ingredients.map(x => `- ${x}`), '', 'Gear:', ...m.gear.map(x => `- ${x}`), '', 'How to make it:', ...m.steps.map((x, i) => `${i + 1}. ${x}`), '', pageUrl(m)].join(NL);
  const listText = m => [`${m.name}: shopping list`, '', ...m.ingredients.map(x => `- ${x}`), ...m.gear.map(x => `- ${x}`)].join(NL);
  async function shareOrCopy(title, text, copied) {
    if (PHONE) { try { await navigator.share({ title, text }); return; } catch (e) { if (e.name === 'AbortError') return; } }
    try { await navigator.clipboard.writeText(text); toast(copied); } catch { toast('Could not copy that. Try printing instead.'); }
  }
  const phoneLabels = root => {
    if (!PHONE) return;
    root.querySelectorAll('[data-act="save"] span').forEach(s => { s.textContent = 'Send to Notes'; });
    root.querySelectorAll('[data-act="list"] span').forEach(s => { s.textContent = 'Send list'; });
  };
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const m = byId(btn.closest('[data-meal]').dataset.meal);
    if (btn.dataset.act === 'save') shareOrCopy(m.name, recipeText(m), 'Recipe copied. Paste it anywhere, like Notes or a text.');
    if (btn.dataset.act === 'list') shareOrCopy(`${m.name} shopping list`, listText(m), 'Shopping list copied.');
    if (btn.dataset.act === 'print') window.print();
  });
  phoneLabels(document);

  // everything below is the list page only
  const grid = document.getElementById('grid');
  if (!grid) return;

  // hero clip: plays unless the visitor asked for less motion, and can be paused
  const video = document.getElementById('clip');
  const pp = document.getElementById('playpause');
  let userPaused = reduce;
  const setPP = playing => { pp.innerHTML = `<i class="ph ph-${playing ? 'pause' : 'play'}" aria-hidden="true"></i>`; pp.setAttribute('aria-label', playing ? 'Pause the video' : 'Play the video'); };
  const go = () => { if (!userPaused) video.play().catch(() => {}); };
  video.addEventListener('play', () => setPP(true));
  video.addEventListener('pause', () => setPP(false));
  const toggle = () => { userPaused = !video.paused; if (userPaused) video.pause(); else video.play().catch(() => {}); };
  pp.addEventListener('click', toggle);
  video.addEventListener('click', toggle);
  if (reduce) { video.pause(); setPP(false); } else go();
  // iOS pauses it when a system popup shows or you come back to the tab
  addEventListener('pageshow', go);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) go(); });

  // filters
  const types = ['All', 'Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert'].filter(t => t === 'All' || M.some(m => m.type === t));
  const st = { type: 'All', method: 'Any way', sort: 'high', q: '' };
  const typesEl = document.getElementById('types');
  typesEl.innerHTML = types.map(t => `<button type="button" class="chip t-${t}" data-t="${t}" aria-pressed="${t === 'All'}">${F.ico(F.TYPE_ICON, t)}${t}</button>`).join('');
  const setType = t => { st.type = t; typesEl.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', c.dataset.t === t)); draw(); };
  typesEl.addEventListener('click', e => { const c = e.target.closest('.chip'); if (c) setType(c.dataset.t); });
  document.getElementById('jump').addEventListener('click', e => { const a = e.target.closest('a[data-t]'); if (a) setType(a.dataset.t); });
  const methodEl = document.getElementById('method');
  methodEl.innerHTML = ['Any way', ...new Set(M.map(m => m.method))].map(m => `<option>${F.esc(m)}</option>`).join('');
  methodEl.addEventListener('change', () => { st.method = methodEl.value; draw(); });
  document.getElementById('sort').addEventListener('change', e => { st.sort = e.target.value; draw(); });
  document.getElementById('q').addEventListener('input', e => { st.q = e.target.value.trim().toLowerCase(); draw(); });

  function draw() {
    const list = M.filter(m => (st.type === 'All' || m.type === st.type) && (st.method === 'Any way' || m.method === st.method)
      && (!st.q || (m.name + ' ' + m.ingredients.join(' ')).toLowerCase().includes(st.q)));
    list.sort(st.sort === 'high' ? (a, b) => b.score - a.score : st.sort === 'low' ? (a, b) => a.score - b.score : (a, b) => a.name.localeCompare(b.name));
    document.getElementById('count').textContent = `${list.length} of ${M.length} meals`;
    grid.innerHTML = list.length ? list.map(m => F.card(m, m.id === best.id)).join('') : '<li class="empty">Nothing matches that. Try a different filter.</li>';
  }

  // recipe panel. Each card is a real link to the meal's page, so a plain click opens
  // the panel and a ctrl/cmd click or a new tab still goes to the page.
  const panel = document.getElementById('panel');
  const scrim = document.getElementById('scrim');
  let lastFocus = null;
  function openMeal(id) {
    const m = byId(id);
    if (!m) return;
    lastFocus = document.activeElement;
    panel.innerHTML = `<button type="button" class="x" aria-label="Close recipe">&times;</button>
      <div class="pimg"><img src="${m.img}" alt=""></div>
      <div class="recipe" data-meal="${m.id}">${F.recipe(m, 'h2')}<a class="full" href="${F.url(m)}">Open this recipe on its own page</a></div>`;
    phoneLabels(panel);
    panel.scrollTop = 0;
    document.body.classList.add('open');
    panel.querySelector('.x').focus();
  }
  function close() {
    if (!document.body.classList.contains('open')) return;
    document.body.classList.remove('open');
    if (lastFocus) lastFocus.focus();
  }
  document.addEventListener('click', e => {
    const a = e.target.closest('a[data-id]');
    if (!a || e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
    if (matchMedia('(max-width: 768px)').matches) return;
    e.preventDefault();
    openMeal(a.dataset.id);
  });
  panel.addEventListener('click', e => { if (e.target.closest('.x')) close(); });
  scrim.addEventListener('click', close);
  document.addEventListener('keydown', e => {
    if (!document.body.classList.contains('open')) return;
    if (e.key === 'Escape') { close(); return; }
    if (e.key !== 'Tab') return;
    const f = [...panel.querySelectorAll('a[href], button, input')];
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  // old links like /food/#street-corn still open that meal
  const fromHash = () => { const h = location.hash.slice(1); if (byId(h)) openMeal(h); };
  fromHash();
  addEventListener('hashchange', fromHash);
})();
