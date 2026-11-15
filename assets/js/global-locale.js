/* Static locale navigation. No IP lookup, geolocation or runtime translation API. */
(() => {
  'use strict';
  const element = document.getElementById('tf-global-locale');
  if (!element) return;
  let config;
  try { config = JSON.parse(element.textContent); } catch (_) { return; }
  const supported = Object.keys(config.routes || {});
  if (!supported.length) return;
  const KEYS = ['tf_site_language', 'tf_home_language'];

  function normalize(raw) {
    if (!raw) return null;
    let tag = String(raw).trim().replace(/_/g, '-').toLowerCase();
    if (/^zh(?:-|$)/.test(tag)) {
      if (/(?:^|-)hans(?:-|$)/.test(tag)) return 'zh-Hans';
      if (/(?:^|-)hant(?:-|$)/.test(tag)) return 'zh-Hant';
      return /(?:^|-)(?:tw|hk|mo)(?:-|$)/.test(tag) ? 'zh-Hant' : 'zh-Hans';
    }
    const aliases = { tl:'fil', no:'nb', iw:'he', in:'id' };
    let base = tag.split('-')[0];
    base = aliases[base] || base;
    const exact = supported.find(code => code.toLowerCase() === tag);
    return exact || supported.find(code => code.toLowerCase() === base) || null;
  }

  function stored() {
    try {
      for (const key of KEYS) {
        const language = normalize(localStorage.getItem(key));
        if (language) return language;
      }
    } catch (_) {}
    return null;
  }

  function save(language) {
    try {
      for (const key of KEYS) {
        if (language) localStorage.setItem(key, language);
        else localStorage.removeItem(key);
      }
    } catch (_) {}
  }

  function browserLanguage() {
    for (const candidate of (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ''])) {
      const language = normalize(candidate);
      if (language) return language;
    }
    return 'en';
  }

  function destination(language, keepJapaneseChoice = false) {
    const url = new URL(location.href);
    url.pathname = config.routes[language];
    url.searchParams.delete('lang');
    // A deliberate Japanese choice must also work when storage is disabled.
    if (language === 'ja' && keepJapaneseChoice) url.searchParams.set('lang','ja');
    return url;
  }

  const params = new URL(location.href).searchParams;
  const requested = params.get('lang');
  const explicit = normalize(requested);
  const automatic = requested && requested.toLowerCase() === 'auto';
  let target = config.locale;
  if (automatic) { save(null); target = browserLanguage(); }
  else if (explicit) { save(explicit); target = explicit; }
  else if (config.entry && !/bot|crawler|spider|slurp/i.test(navigator.userAgent || '')) {
    target = stored() || browserLanguage();
  }

  const next = destination(target, explicit === 'ja');
  if (target !== config.locale) {
    location.replace(next.href);
    return;
  }
  if ((automatic || explicit) && next.href !== location.href) {
    try { history.replaceState(null,'',next.href); } catch (_) {}
  }

  function bind() {
    document.querySelectorAll('.global-languages').forEach(menu => {
      menu.addEventListener('click', event => {
        const link = event.target.closest('a[data-global-language]');
        if (!link || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const value = link.dataset.globalLanguage;
        const chosen = value === 'auto' ? browserLanguage() : normalize(value);
        if (!chosen) return;
        event.preventDefault();
        save(value === 'auto' ? null : chosen);
        menu.open = false;
        const url = destination(chosen, chosen === 'ja' && value !== 'auto');
        if (url.href !== location.href) location.assign(url.href);
      });
      document.addEventListener('click', event => {
        if (!menu.contains(event.target)) menu.open = false;
      });
      document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && menu.open) {
          menu.open = false;
          menu.querySelector('summary').focus();
        }
      });
    });
    window.__TF_LOCALE_READY = config.locale;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, {once:true});
  else bind();
})();
