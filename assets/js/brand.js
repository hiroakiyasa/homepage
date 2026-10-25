'use strict';
/* TrailFusion brand pages: menu, app filters, store-click analytics. Progressive enhancement only. */
(() => {
  const header = document.querySelector('.br-header');
  const setHeight = () => {
    if (header) document.documentElement.style.setProperty('--tf-site-header-height', `${Math.ceil(header.getBoundingClientRect().height)}px`);
  };
  setHeight();
  window.addEventListener('resize', setHeight, { passive: true });

  document.querySelectorAll('.br-menu').forEach(menu => {
    menu.addEventListener('click', e => { if (e.target.closest('a')) menu.open = false; });
    document.addEventListener('click', e => { if (!menu.contains(e.target)) menu.open = false; });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && menu.open) { menu.open = false; menu.querySelector('summary').focus(); }
    });
  });

  // Category filters exist only when JavaScript runs; without it every app stays visible.
  const chips = document.querySelector('.chips');
  if (chips) {
    chips.hidden = false;
    const count = document.querySelector('[data-count]');
    const ja = document.documentElement.lang === 'ja';
    chips.addEventListener('click', e => {
      const chip = e.target.closest('[data-filter]');
      if (!chip) return;
      const filter = chip.dataset.filter;
      chips.querySelectorAll('[data-filter]').forEach(c => c.setAttribute('aria-pressed', String(c === chip)));
      let visible = 0;
      document.querySelectorAll('.catalog .app-grid:not(.two) .app-card').forEach(card => {
        card.hidden = filter !== 'all' && card.dataset.cat !== filter;
        if (!card.hidden) visible += 1;
      });
      if (count) count.textContent = ja ? `${visible}本のアプリを表示しています` : `Showing ${visible} apps`;
      if (typeof window.gtag === 'function') window.gtag('event', 'brand_app_filter', { category: filter });
    });
  }

  // Store clicks: which app and where on the page. No personal data.
  document.addEventListener('click', e => {
    const a = e.target.closest('a[data-store]');
    if (a && typeof window.gtag === 'function') {
      window.gtag('event', 'brand_store_click', { store: a.dataset.store, app: a.dataset.app || '', placement: a.dataset.placement || '', page_path: location.pathname });
    }
  });
})();
