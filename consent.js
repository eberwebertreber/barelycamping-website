/*
  Consent-gated tracking.

  Vercel Web Analytics is cookieless and never gated, so visitor counts stay
  whole no matter what anyone chooses.

  Google Analytics and the Meta Pixel load immediately outside the EU/UK, and
  load in the EU/UK only after the visitor says yes. If we can't work out where
  someone is, we assume the strict rules apply.
*/
(function () {
  var GA_ID = 'G-CSK1QKWB8Z';
  var PIXEL_ID = '1791285082052936';
  var KEY = 'bc_consent';

  function store(k, v) {
    try { localStorage.setItem(k, v); } catch (e) {}
  }
  function recall(k) {
    try { return localStorage.getItem(k); } catch (e) { return null; }
  }

  function needsConsent() {
    try {
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      return /^Europe\//.test(tz) ||
             /^Atlantic\/(Canary|Madeira|Azores|Faroe|Reykjavik)$/.test(tz);
    } catch (e) {
      return true;
    }
  }

  function loadVercel() {
    var s = document.createElement('script');
    s.defer = true;
    s.src = '/_vercel/insights/script.js';
    document.head.appendChild(s);
  }

  function loadGA() {
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID);
  }

  function loadPixel() {
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0';
      n.queue = []; t = b.createElement(e); t.async = !0; t.src = v;
      s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', PIXEL_ID);
    window.fbq('track', 'PageView');
  }

  function loadOptional() { loadGA(); loadPixel(); }

  var CSS =
    '#consent{position:fixed;left:50%;bottom:1.25rem;transform:translateX(-50%);' +
    'width:min(46rem,calc(100vw - 2rem));z-index:9999;padding:1.15rem 1.35rem;' +
    'border-radius:14px;background:rgba(12,12,12,.9);border:1px solid rgba(255,255,255,.13);' +
    'box-shadow:0 12px 40px rgba(0,0,0,.55);display:flex;gap:1.25rem;align-items:center;' +
    'flex-wrap:wrap;font-family:system-ui,-apple-system,sans-serif;' +
    '-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);}' +
    '#consent p{flex:1 1 22rem;margin:0;font-size:.85rem;line-height:1.55;' +
    'color:rgba(255,255,255,.72);}' +
    '#consent a{color:#fff;text-decoration:underline;text-underline-offset:2px;}' +
    '#consent .consent-btns{display:flex;gap:.6rem;flex:0 0 auto;}' +
    '#consent button{font:inherit;font-size:.82rem;padding:.6rem 1.15rem;border-radius:999px;' +
    'cursor:pointer;border:1px solid rgba(255,255,255,.13);background:rgba(255,255,255,.08);' +
    'color:rgba(255,255,255,.85);transition:background .18s ease,color .18s ease;}' +
    '#consent button:hover{background:rgba(255,255,255,.16);color:#fff;}' +
    '#consent button:focus-visible{outline:2px solid #fff;outline-offset:2px;}' +
    '@media(max-width:34rem){#consent{flex-direction:column;align-items:stretch;gap:.9rem;}' +
    '#consent button{flex:1;}}';

  function injectCSS() {
    var st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  function banner() {
    injectCSS();
    var wrap = document.createElement('div');
    wrap.id = 'consent';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-live', 'polite');
    wrap.setAttribute('aria-label', 'Tracking choice');
    wrap.innerHTML =
      '<p>I\'d like to use Google Analytics and the Meta Pixel here. Analytics tells me ' +
      'how many people show up. The pixel is so I can show you merch ads later. Neither ' +
      'one tells me who you are, and nothing on the site breaks if you say no. ' +
      '<a href="/privacy.html">More in the privacy policy</a>.</p>' +
      '<div class="consent-btns">' +
      '<button type="button" data-choice="no">No thanks</button>' +
      '<button type="button" data-choice="yes">Allow</button>' +
      '</div>';

    wrap.addEventListener('click', function (e) {
      var choice = e.target && e.target.getAttribute('data-choice');
      if (!choice) return;
      store(KEY, choice);
      wrap.parentNode && wrap.parentNode.removeChild(wrap);
      if (choice === 'yes') loadOptional();
    });

    document.body.appendChild(wrap);
  }

  loadVercel();

  if (!needsConsent()) { loadOptional(); return; }

  var choice = recall(KEY);
  if (choice === 'yes') { loadOptional(); return; }
  if (choice === 'no') return;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', banner);
  } else {
    banner();
  }
})();
