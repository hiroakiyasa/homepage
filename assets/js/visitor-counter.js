/* TrailFusion AI - compact page-specific view counter.
 * hits.sh stores a separate total for each URL key; no cookie or API key needed.
 * Keep the historic keys for /, /apps.html, /maintenance.html, /camping.html,
 * and /drive-routes/ so that their existing counts are not reset.
 */
(function () {
  'use strict';

  if (window.TrailFusionVisitorCounterLoaded) return;
  window.TrailFusionVisitorCounterLoaded = true;

  const SERVICE = 'https://hits.sh/trailfusionai.com/';
  const SCRIPT_STYLE_ID = 'tf-page-views-style';

  function pageKey(pathname) {
    let path = pathname || '/';
    try { path = decodeURI(path); } catch (_) { /* Keep valid encoded input. */ }
    path = path.replace(/\/{2,}/g, '/');
    path = path.replace(/\/index\.html$/i, '/');
    if (path === '/') return 'home';
    // /en/, /en/index.html and /en have one counter; query/hash don't count.
    return path.replace(/^\/+|\/+$/g, '').replace(/\.html$/i, '');
  }

  function counterBase(key) {
    return SERVICE + key.split('/').map(encodeURIComponent).join('/');
  }

  function addStyles() {
    if (document.getElementById(SCRIPT_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = SCRIPT_STYLE_ID;
    style.textContent = `
.tf-page-views-slot{display:flex;justify-content:flex-end;align-items:center;box-sizing:border-box;max-width:1180px;margin:0 auto;padding:8px clamp(14px,3vw,32px);font:600 12px/1.3 system-ui,sans-serif;}
.tf-page-views{display:inline-flex;align-items:center;gap:6px;width:max-content;max-width:100%;padding:5px 9px;border:1px solid #ccdbea;border-radius:999px;background:#fff;color:#334155;text-decoration:none;box-shadow:0 2px 8px rgba(20,46,72,.08);transition:border-color .15s,box-shadow .15s;}
.tf-page-views:hover{border-color:#559bdf;box-shadow:0 2px 10px rgba(20,46,72,.15);}
.tf-page-views:focus-visible{outline:2px solid #1976bd;outline-offset:3px;}
.tf-page-views-icon{font-size:13px;line-height:1;}
.tf-page-views img{display:block;width:auto;height:18px;max-width:120px;border:0;box-shadow:none;}
.tf-page-views-fallback{white-space:nowrap;font-size:11px;}
.topbar .tf-page-views-slot{margin:0 8px 0 auto;padding:2px;flex-shrink:0;}
@media(max-width:600px){.tf-page-views-slot{padding:6px 12px;}.tf-page-views{padding:4px 7px;gap:4px;}.tf-page-views img{height:16px;}.topbar .tf-page-views-slot{margin-right:2px;}}
`;
    document.head.appendChild(style);
  }

  function mountCounter() {
    if (!document.body || document.querySelector('[data-tf-page-views]')) return;

    // These hand-built pages already have one visible badge. In particular,
    // camping's established counter must retain its exact existing identity.
    if (document.querySelector('.tf-preserved-counter img, a.tf-counter img')) return;

    const key = pageKey(window.location.pathname);
    const isEnglish = (document.documentElement.lang || '').toLowerCase().startsWith('en');
    const title = isEnglish ? 'Total page views (opens statistics)' : 'このページの累計閲覧数（統計を開く）';
    const slot = document.createElement('div');
    slot.className = 'tf-page-views-slot';
    slot.setAttribute('data-tf-page-views', key);

    const link = document.createElement('a');
    link.className = 'tf-page-views';
    link.href = counterBase(key) + '/';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.referrerPolicy = 'no-referrer';
    link.title = title;
    link.setAttribute('aria-label', title);

    const icon = document.createElement('span');
    icon.className = 'tf-page-views-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '👁';

    const img = document.createElement('img');
    img.src = counterBase(key) + '.svg?style=flat-square&label=PV&color=2476bb&labelColor=334155';
    img.alt = isEnglish ? 'Page views' : '閲覧数';
    // An off-screen footer must still count the page view.
    img.loading = 'eager';
    img.decoding = 'async';
    img.referrerPolicy = 'no-referrer';
    img.addEventListener('error', function () {
      const fallback = document.createElement('span');
      fallback.className = 'tf-page-views-fallback';
      fallback.textContent = isEnglish ? 'Views unavailable' : '閲覧数を取得できません';
      img.replaceWith(fallback);
      link.removeAttribute('href');
      link.removeAttribute('target');
    }, { once: true });

    link.append(icon, img);
    slot.appendChild(link);
    addStyles();

    // The route map fills its viewport, so keep its badge in the top bar.
    const topbar = key === 'drive-routes' ? document.querySelector('.topbar') : null;
    const footer = document.querySelector('footer');
    if (topbar) topbar.appendChild(slot);
    else if (footer && footer.parentNode) footer.parentNode.insertBefore(slot, footer);
    else document.body.appendChild(slot);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountCounter, { once: true });
  } else {
    mountCounter();
  }
})();
