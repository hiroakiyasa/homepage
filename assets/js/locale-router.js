/* Static locale navigation. No translation, geolocation, or external API requests. */
(() => {
  'use strict';
  const element = document.getElementById('tf-locale-config');
  if (!element) return;
  let config;
  try { config = JSON.parse(element.textContent); } catch (_) { return; }
  const LANGS = config.languages;
  const info = Object.fromEntries(LANGS.map(([code, label, slug]) => [code, {label, slug}]));
  const KEYS = ['tf_site_language', 'tf_home_language'];
  const saved = () => { try { return KEYS.map(k => norm(localStorage.getItem(k))).find(Boolean); } catch (_) { return null; } };
  function save(code) { try { KEYS.forEach(k => code ? localStorage.setItem(k, code) : localStorage.removeItem(k)); } catch (_) {} }
  // Timezone inference is local to the device; it does not identify physical location.
  function norm(raw) {
    if (!raw) return null;
    const v = String(raw).replace("_","-").toLowerCase();
    if (v.startsWith("zh")) return "zh-Hans";
    if (v.startsWith("pt")) return "pt-BR";
    const exact = LANGS.find(([code]) => code.toLowerCase() === v);
    if (exact) return exact[0];
    const two = v.split("-")[0];
    const partial = LANGS.find(([code]) => code.toLowerCase().split("-")[0] === two);
    return partial ? partial[0] : null;
  }

  function zoneLang() {
    let z = "";
    try { z = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (_) {}
    const map = {
      "Asia/Tokyo":"ja","Asia/Seoul":"ko","Asia/Shanghai":"zh-Hans","Asia/Chongqing":"zh-Hans",
      "Asia/Hong_Kong":"zh-Hans","Asia/Macau":"zh-Hans","Asia/Taipei":"zh-Hans","Asia/Singapore":"en",
      "Asia/Kolkata":"hi","Asia/Calcutta":"hi","Asia/Bangkok":"th","Asia/Ho_Chi_Minh":"vi","Asia/Saigon":"vi",
      "Europe/Istanbul":"tr","Europe/Paris":"fr","Europe/Monaco":"fr","Europe/Berlin":"de","Europe/Vienna":"de",
      "Europe/Zurich":"de","Europe/Vaduz":"de","Europe/Rome":"it","Europe/San_Marino":"it","Europe/Vatican":"it",
      "Europe/Madrid":"es","Atlantic/Canary":"es","Europe/London":"en","Europe/Dublin":"en",
      "America/New_York":"en","America/Chicago":"en","America/Denver":"en","America/Los_Angeles":"en",
      "America/Phoenix":"en","America/Anchorage":"en","Pacific/Honolulu":"en","America/Toronto":"en",
      "America/Vancouver":"en","America/Edmonton":"en","America/Winnipeg":"en","America/Halifax":"en",
      "America/St_Johns":"en","Australia/Sydney":"en","Australia/Melbourne":"en","Australia/Brisbane":"en",
      "Australia/Perth":"en","Pacific/Auckland":"en","America/Sao_Paulo":"pt-BR","America/Manaus":"pt-BR",
      "America/Recife":"pt-BR","America/Fortaleza":"pt-BR","America/Bahia":"pt-BR","America/Belem":"pt-BR",
      "America/Cuiaba":"pt-BR","America/Rio_Branco":"pt-BR","America/Mexico_City":"es","America/Cancun":"es",
      "America/Bogota":"es","America/Lima":"es","America/Santiago":"es","America/Argentina/Buenos_Aires":"es",
      "America/Montevideo":"es","America/Asuncion":"es","America/Guayaquil":"es","America/Caracas":"es",
      "Asia/Riyadh":"ar","Asia/Dubai":"ar","Asia/Qatar":"ar","Asia/Kuwait":"ar","Asia/Bahrain":"ar",
      "Asia/Muscat":"ar","Asia/Amman":"ar","Asia/Beirut":"ar","Asia/Baghdad":"ar","Africa/Cairo":"ar",
      "Africa/Casablanca":"ar","Africa/Algiers":"ar","Africa/Tunis":"ar"
    };
    if (map[z]) return map[z];
    if (z === "Europe/Moscow" ||
        /^Asia\/(Yekaterinburg|Novosibirsk|Vladivostok|Krasnoyarsk|Irkutsk|Yakutsk|Kamchatka)/.test(z)) {
      return "ru";
    }
    return null;
  }

  function browserLang() {
    for (const value of (navigator.languages || [navigator.language || ""])) {
      const found = norm(value);
      if (found) return found;
    }
    return null;
  }

  const automatic = () => zoneLang() || browserLang() || 'en';
  function destination(code) {
    const url = new URL(location.href);
    url.pathname = (info[code].slug ? '/' + info[code].slug : '') + config.source;
    url.searchParams.delete('lang');
    return url;
  }
  const params = new URLSearchParams(location.search);
  const requested = params.get('lang');
  const explicit = norm(requested);
  const isAuto = requested && requested.toLowerCase() === 'auto';
  const isSource = location.pathname === config.source || location.pathname.replace(/index\.html$/, '') === config.source;
  let target = config.locale;
  if (isAuto) { save(null); target = automatic(); }
  else if (explicit) { save(explicit); target = explicit; }
  else if (isSource && !/bot|crawler|spider|slurp/i.test(navigator.userAgent)) target = saved() || automatic();
  if (target !== config.locale) { location.replace(destination(target).href); return; }
  if (explicit || isAuto) { try { history.replaceState(null, '', destination(target)); } catch (_) {} }
  const top = document.querySelector('.site-head .in, .tf-header .tf-top');
  if (!top || document.getElementById('tf-page-language')) return;
  const label = document.createElement('label');
  label.className = 'tf-page-language';
  label.setAttribute('aria-label', config.label);
  const icon = document.createElement('span'); icon.textContent = '🌐'; icon.setAttribute('aria-hidden', 'true');
  const select = document.createElement('select'); select.id = 'tf-page-language'; select.dir = 'ltr';
  select.setAttribute('aria-label', config.label);
  select.appendChild(new Option(config.automatic + ' · ' + info[automatic()].label, 'auto'));
  LANGS.forEach(([code, name]) => select.appendChild(new Option(name, code)));
  select.value = isSource && !saved() ? 'auto' : config.locale;
  select.addEventListener('change', () => {
    const code = select.value === 'auto' ? automatic() : select.value;
    save(select.value === 'auto' ? null : code);
    location.assign(destination(code).href);
  });
  label.append(icon, select);
  top.insertBefore(label, top.querySelector('.burger, .tf-mobile-menu') || null);
  // The explicit locale path wins; no text observer or repeated DOM replacement is needed.
  window.__TF_LOCALE_READY = config.locale;
})();
