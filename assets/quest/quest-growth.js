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
