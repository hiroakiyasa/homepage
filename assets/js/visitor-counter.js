/* TrailFusion AI - page visitor counter
 * Static-site friendly counter badge.
 * Each supported page uses a separate counter key and displays the badge in the hero/top area.
 */
(function () {
  'use strict';

  if (window.TrailFusionVisitorCounterLoaded) return;
  window.TrailFusionVisitorCounterLoaded = true;

  const PAGE_MAP = {
    '/': { key: 'home', label: 'トップページ', targets: ['[data-visitor-counter-target]', '.hero', '.home-hero', 'main section:first-of-type', 'section:first-of-type'] },
    '/index.html': { key: 'home', label: 'トップページ', targets: ['[data-visitor-counter-target]', '.hero', '.home-hero', 'main section:first-of-type', 'section:first-of-type'] },
    '/maintenance.html': { key: 'maintenance', label: '整備記録', targets: ['[data-visitor-counter-target]', '.hero', '.maintenance-hero', '#hero', 'main section:first-of-type', 'section:first-of-type'] },
    '/apps.html': { key: 'apps', label: 'AIアプリ', targets: ['[data-visitor-counter-target]', '.premium-hero', '.hero', 'main section:first-of-type', 'section:first-of-type'] },
    '/drive-routes/': { key: 'drive-routes', label: 'ドライブルート', targets: ['[data-visitor-counter-target]', '.topbar', '#map'] },
    '/drive-routes/index.html': { key: 'drive-routes', label: 'ドライブルート', targets: ['[data-visitor-counter-target]', '.topbar', '#map'] },
    '/camping.html': { key: 'camping', label: 'キャンピングカー制作', targets: ['[data-visitor-counter-target]', '.hero', '.camping-hero', '.hero-section', 'main section:first-of-type', 'section:first-of-type'] }
  };

  function normalizePath(pathname) {
    if (!pathname || pathname === '/') return '/';
    return pathname.replace(/\/+$/, '/') || '/';
  }

  function getPageConfig() {
    const rawPath = window.location.pathname || '/';
    const normalized = normalizePath(rawPath);
    return PAGE_MAP[rawPath] || PAGE_MAP[normalized] || null;
  }

  function injectStyles() {
    if (document.getElementById('tf-visitor-counter-style')) return;
    const style = document.createElement('style');
    style.id = 'tf-visitor-counter-style';
    style.textContent = `
.tf-visitor-counter{
  position:absolute;
  top:clamp(0.85rem,2vw,1.35rem);
  right:clamp(0.85rem,2vw,1.35rem);
  z-index:45;
  display:inline-flex;
  align-items:center;
  gap:.5rem;
  padding:.45rem .55rem;
  border:2.5px solid #1F2E4D;
  border-radius:999px;
  background:rgba(255,255,255,.94);
  box-shadow:5px 5px 0 #1F2E4D;
  backdrop-filter:blur(10px);
  -webkit-backdrop-filter:blur(10px);
  line-height:1;
}
.tf-visitor-counter::before{
  content:'👀';
  display:inline-grid;
  place-items:center;
  width:1.6rem;
  height:1.6rem;
  border:2px solid #1F2E4D;
  border-radius:999px;
  background:#FFD84D;
  font-size:.9rem;
  box-shadow:2px 2px 0 #1F2E4D;
}
.tf-visitor-counter img{display:block;height:28px;width:auto;max-width:170px;border-radius:999px;}
.tf-visitor-fallback{font-family:'M PLUS Rounded 1c',system-ui,sans-serif;font-weight:900;font-size:.78rem;color:#1F2E4D;letter-spacing:.04em;}
.topbar .tf-visitor-counter{
  position:static;
  margin-left:auto;
  margin-right:.5rem;
  flex-shrink:0;
  transform:none;
}
#map .tf-visitor-counter{
  position:fixed;
  top:5.4rem;
  right:1rem;
}
@media(max-width:720px){
  .tf-visitor-counter{transform:scale(.86);transform-origin:top right;}
  .topbar .tf-visitor-counter{display:none;}
  #map .tf-visitor-counter{top:4.8rem;right:.75rem;display:inline-flex;}
}
`;
    document.head.appendChild(style);
  }

  function findTarget(config) {
    for (const selector of config.targets) {
      const target = document.querySelector(selector);
      if (target) return target;
    }
    return document.body;
  }

  function ensurePositioning(target) {
    if (!target || target === document.body) return;
    const computed = window.getComputedStyle(target);
    if (computed.position === 'static') {
      target.style.position = 'relative';
    }
  }

  function createCounter(config) {
    const wrapper = document.createElement('a');
    wrapper.className = 'tf-visitor-counter';
    wrapper.href = 'https://hits.sh/trailfusionai.com/';
    wrapper.target = '_blank';
    wrapper.rel = 'noopener noreferrer';
    wrapper.setAttribute('aria-label', `${config.label}の訪問カウンター`);
    wrapper.title = `${config.label}の訪問数`;

    const img = document.createElement('img');
    const counterPath = `trailfusionai.com/${config.key}`;
    img.src = `https://hits.sh/${counterPath}.svg?style=for-the-badge&label=VISITS&color=ff6b5b&labelColor=1f2e4d`;
    img.alt = `${config.label} visits`;
    img.loading = 'lazy';
    img.referrerPolicy = 'no-referrer-when-downgrade';
    img.addEventListener('error', function () {
      wrapper.removeAttribute('href');
      wrapper.removeAttribute('target');
      wrapper.innerHTML = '<span class="tf-visitor-fallback">VISITS</span>';
    }, { once: true });

    wrapper.appendChild(img);
    return wrapper;
  }

  function initVisitorCounter() {
    const config = getPageConfig();
    if (!config || document.querySelector('.tf-visitor-counter')) return;
    injectStyles();

    const target = findTarget(config);
    ensurePositioning(target);
    const counter = createCounter(config);

    if (target.classList && target.classList.contains('topbar')) {
      const spacer = target.querySelector('.topbar-spacer');
      if (spacer && spacer.parentNode) {
        spacer.insertAdjacentElement('afterend', counter);
        return;
      }
    }

    target.appendChild(counter);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVisitorCounter);
  } else {
    initVisitorCounter();
  }
})();
