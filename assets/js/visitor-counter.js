/* TrailFusion AI - page visitor counter
 * Static-site friendly compact counter badge.
 * Displays a separate page counter in the hero/top area for selected pages.
 */
(function () {
  'use strict';

  if (window.TrailFusionVisitorCounterLoaded) return;
  window.TrailFusionVisitorCounterLoaded = true;

  const COMMON_HERO_TARGETS = [
    '[data-visitor-counter-target]',
    '[data-counter-target]',
    '.premium-hero',
    '.hero',
    '.home-hero',
    '.maintenance-hero',
    '.camping-hero',
    '.hero-section',
    '.hero-area',
    '.hero-wrap',
    '.rq-hero',
    'main section:first-of-type',
    'section:first-of-type'
  ];

  const PAGE_MAP = {
    '/': { key: 'home', label: 'トップページ', targets: COMMON_HERO_TARGETS },
    '/index.html': { key: 'home', label: 'トップページ', targets: COMMON_HERO_TARGETS },
    '/maintenance.html': { key: 'maintenance', label: '整備記録', targets: COMMON_HERO_TARGETS },
    '/apps.html': { key: 'apps', label: 'AIアプリ', targets: ['.premium-hero', ...COMMON_HERO_TARGETS] },
    '/drive-routes/': { key: 'drive-routes', label: 'ドライブルート', targets: ['[data-visitor-counter-target]', '.topbar', '#map', 'main'] },
    '/drive-routes/index.html': { key: 'drive-routes', label: 'ドライブルート', targets: ['[data-visitor-counter-target]', '.topbar', '#map', 'main'] },
    '/camping.html': { key: 'camping', label: 'キャンピングカー制作', targets: COMMON_HERO_TARGETS }
  };

  function normalizePath(pathname) {
    if (!pathname || pathname === '/') return '/';
    const cleaned = pathname.replace(/\/+$/, '');
    return cleaned ? cleaned + (pathname.endsWith('/') ? '/' : '') : '/';
  }

  function getPageConfig() {
    const rawPath = window.location.pathname || '/';
    const withoutTrailing = rawPath.replace(/\/+$/, '') || '/';
    const withTrailing = withoutTrailing === '/' ? '/' : `${withoutTrailing}/`;
    return PAGE_MAP[rawPath] || PAGE_MAP[withoutTrailing] || PAGE_MAP[withTrailing] || PAGE_MAP[normalizePath(rawPath)] || null;
  }

  function injectStyles() {
    if (document.getElementById('tf-visitor-counter-style')) return;
    const style = document.createElement('style');
    style.id = 'tf-visitor-counter-style';
    style.textContent = `
.tf-visitor-counter{
  position:absolute!important;
  top:clamp(.7rem,1.8vw,1.1rem)!important;
  right:clamp(.7rem,1.8vw,1.1rem)!important;
  z-index:9999!important;
  display:inline-flex!important;
  align-items:center!important;
  gap:.38rem!important;
  width:auto!important;
  max-width:min(46vw,180px)!important;
  min-height:32px!important;
  padding:.28rem .42rem!important;
  border:2px solid #1F2E4D!important;
  border-radius:999px!important;
  background:rgba(255,255,255,.96)!important;
  box-shadow:4px 4px 0 #1F2E4D!important;
  backdrop-filter:blur(10px)!important;
  -webkit-backdrop-filter:blur(10px)!important;
  line-height:1!important;
  text-decoration:none!important;
  color:#1F2E4D!important;
  overflow:hidden!important;
}
.tf-visitor-counter::before{
  content:'👀';
  display:inline-grid!important;
  place-items:center!important;
  width:1.32rem!important;
  height:1.32rem!important;
  min-width:1.32rem!important;
  border:1.7px solid #1F2E4D!important;
  border-radius:999px!important;
  background:#FFD84D!important;
  font-size:.74rem!important;
  box-shadow:1.5px 1.5px 0 #1F2E4D!important;
}
.tf-visitor-counter img{
  display:block!important;
  height:21px!important;
  width:auto!important;
  max-width:128px!important;
  border:0!important;
  border-radius:999px!important;
  box-shadow:none!important;
  margin:0!important;
  opacity:1!important;
  visibility:visible!important;
}
.tf-visitor-fallback{
  display:inline-block!important;
  font-family:'M PLUS Rounded 1c',system-ui,sans-serif!important;
  font-weight:900!important;
  font-size:.68rem!important;
  color:#1F2E4D!important;
  letter-spacing:.04em!important;
  white-space:nowrap!important;
}
.topbar .tf-visitor-counter{
  position:static!important;
  margin-left:auto!important;
  margin-right:.45rem!important;
  flex-shrink:0!important;
  transform:none!important;
}
#map .tf-visitor-counter,
body > .tf-visitor-counter{
  position:fixed!important;
  top:4.9rem!important;
  right:.9rem!important;
}
.tf-visitor-counter-target-ready{position:relative!important;}
@media(max-width:720px){
  .tf-visitor-counter{
    top:.55rem!important;
    right:.55rem!important;
    max-width:142px!important;
    min-height:28px!important;
    padding:.22rem .34rem!important;
    box-shadow:3px 3px 0 #1F2E4D!important;
  }
  .tf-visitor-counter::before{width:1.18rem!important;height:1.18rem!important;min-width:1.18rem!important;font-size:.66rem!important;}
  .tf-visitor-counter img{height:18px!important;max-width:104px!important;}
  .topbar .tf-visitor-counter{display:inline-flex!important;transform:scale(.84)!important;transform-origin:center right!important;margin-right:.15rem!important;}
  #map .tf-visitor-counter{position:fixed!important;top:4.6rem!important;right:.65rem!important;}
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
    target.classList.add('tf-visitor-counter-target-ready');
    const computed = window.getComputedStyle(target);
    if (computed.position === 'static') target.style.position = 'relative';
    if (computed.overflow === 'hidden') target.style.overflow = 'hidden';
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
    img.src = `https://hits.sh/${counterPath}.svg?style=flat-square&label=VISITS&color=ff6b5b&labelColor=1f2e4d`;
    img.alt = `${config.label} visits`;
    img.loading = 'eager';
    img.decoding = 'async';
    img.referrerPolicy = 'no-referrer-when-downgrade';
    img.addEventListener('error', function () {
      wrapper.removeAttribute('href');
      wrapper.removeAttribute('target');
      wrapper.innerHTML = '<span class="tf-visitor-fallback">VISITS</span>';
    }, { once: true });

    wrapper.appendChild(img);
    return wrapper;
  }

  function mountCounter(config) {
    if (document.querySelector('.tf-visitor-counter')) return true;
    injectStyles();
    const target = findTarget(config);
    if (!target) return false;
    ensurePositioning(target);
    const counter = createCounter(config);

    if (target.classList && target.classList.contains('topbar')) {
      const spacer = target.querySelector('.topbar-spacer');
      if (spacer && spacer.parentNode) spacer.insertAdjacentElement('afterend', counter);
      else target.appendChild(counter);
      return true;
    }

    target.insertAdjacentElement('afterbegin', counter);
    return true;
  }

  function initVisitorCounter() {
    const config = getPageConfig();
    if (!config) return;
    if (mountCounter(config)) return;

    let attempts = 0;
    const retry = window.setInterval(function () {
      attempts += 1;
      if (mountCounter(config) || attempts >= 12) window.clearInterval(retry);
    }, 250);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVisitorCounter);
  } else {
    initVisitorCounter();
  }
})();
