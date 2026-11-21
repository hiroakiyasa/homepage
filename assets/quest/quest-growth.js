'use strict';
// Marketing route only: no answers, personal details or learning history.
document.querySelectorAll('[data-growth-route]').forEach(link => {
  link.addEventListener('click', () => {
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'quest_audience_route', {
        audience: link.dataset.growthRoute,
        course: link.dataset.course || 'all',
        destination: new URL(link.href).pathname,
        page_path: location.pathname
      });
    }
  });
});

// Brand pages keep their existing event and also record the Quest course scope.
// Quest pages already emit this event from quest.js, so do not attach twice.
if (!document.querySelector('script[src^="/assets/quest/quest.js"]')) {
  document.querySelectorAll('a[data-store][data-audience="language"]').forEach(link => {
    link.addEventListener('click', () => {
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'quest_store_click', {
          store: link.dataset.store,
          placement: link.dataset.placement || 'language-detail',
          course: link.dataset.course || 'all',
          audience: 'language',
          product_page: new URL(link.href).searchParams.get('ppid') || 'default',
          page_path: location.pathname
        });
      }
    });
  });
}
