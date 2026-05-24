/* ============================== */
/* TrailFusion AI - Shared UI behaviors */
/* Mobile menu, reveal-on-scroll, scroll-to-top, smooth anchors */
/* ============================== */

(function () {
  'use strict';

  function defaultJapanVisitorsToJapanese() {
    try {
      const hasSavedLanguage = Boolean(localStorage.getItem('preferred-language'));
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (!hasSavedLanguage && timeZone === 'Asia/Tokyo') {
        localStorage.setItem('preferred-language', 'ja');
      }
    } catch (_) {
      // Ignore storage/timezone errors and keep the existing page behavior.
    }
  }

  function prioritizeRikaQuestOnAppsPage() {
    const rikaSection = document.getElementById('rika-quest');
    if (!rikaSection) return;

    const rikaNav = document.querySelector('.app-nav-premium a[href="#rika-quest"]');
    const navList = rikaNav && rikaNav.parentElement;
    if (rikaNav && navList && navList.firstElementChild !== rikaNav) {
      navList.prepend(rikaNav);
    }

    const rikaCard = document.querySelector('section.bg-cream a[href="#rika-quest"].app-card');
    const cardGrid = rikaCard && rikaCard.parentElement;
    if (rikaCard && cardGrid && cardGrid.firstElementChild !== rikaCard) {
      cardGrid.prepend(rikaCard);
    }

    const firstAppSection = document.querySelector('section[id].app-section-v2');
    if (firstAppSection && firstAppSection !== rikaSection) {
      firstAppSection.parentNode.insertBefore(rikaSection, firstAppSection);
    }

    const heroCta = document.querySelector('section.premium-hero a[href="#gp-teachers"]');
    if (heroCta) heroCta.setAttribute('href', '#rika-quest');

    const rikaBadge = rikaSection.querySelector('.app-progress-chip');
    if (rikaBadge) {
      rikaBadge.innerHTML = '<span>PICK UP</span><span class="line"></span><span>01</span>';
    }
  }

  function loadVisitorCounter() {
    if (document.querySelector('script[data-trailfusion-visitor-counter]') || window.TrailFusionVisitorCounterLoaded) return;
    const script = document.createElement('script');
    script.src = 'assets/js/visitor-counter.js';
    script.defer = true;
    script.dataset.trailfusionVisitorCounter = 'true';
    document.head.appendChild(script);
  }

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
    prioritizeRikaQuestOnAppsPage();
    initMobileMenu();
    initReveal();
    initScrollTop();
    initSmoothAnchors();
    loadVisitorCounter();
  }

  defaultJapanVisitorsToJapanese();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
