/* ============================== */
/* TrailFusion AI - Shared UI behaviors */
/* Mobile menu, reveal-on-scroll, scroll-to-top, smooth anchors */
/* ============================== */

(function () {
  'use strict';

  // Mobile menu toggle
  function initMobileMenu() {
    const btn = document.getElementById('mobile-toggle');
    const menu = document.getElementById('mobile-menu');
    if (!btn || !menu) return;
    btn.addEventListener('click', () => {
      menu.classList.toggle('hidden');
      const icon = btn.querySelector('i');
      if (icon) icon.className = menu.classList.contains('hidden') ? 'ri-menu-line text-xl' : 'ri-close-line text-xl';
    });
  }

  // Reveal on scroll
  function initReveal() {
    const elements = document.querySelectorAll('.reveal, .reveal-stagger');
    if (!elements.length || typeof IntersectionObserver === 'undefined') {
      elements.forEach(el => el.classList.add('visible'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    elements.forEach(el => io.observe(el));
  }

  // Scroll to top button
  function initScrollTop() {
    const btn = document.getElementById('scrollToTop');
    if (!btn) return;
    window.addEventListener('scroll', () => {
      btn.classList.toggle('show', window.pageYOffset > 400);
    }, { passive: true });
    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Smooth anchor scroll with header offset
  function initSmoothAnchors() {
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href');
        if (id === '#' || id.length < 2) return;
        let target;
        try { target = document.querySelector(id); } catch (_) { return; }
        if (!target) return;
        e.preventDefault();
        window.scrollTo({ top: target.getBoundingClientRect().top + window.pageYOffset - 80, behavior: 'smooth' });
        const menu = document.getElementById('mobile-menu');
        if (menu && !menu.classList.contains('hidden')) {
          menu.classList.add('hidden');
          const btn = document.getElementById('mobile-toggle');
          if (btn) {
            const icon = btn.querySelector('i');
            if (icon) icon.className = 'ri-menu-line text-xl';
          }
        }
      });
    });
  }

  function init() {
    initMobileMenu();
    initReveal();
    initScrollTop();
    initSmoothAnchors();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
