(() => {
  "use strict";
  const LANGS = [
    ["ja","日本語","/"],
    ["en","English","/en/"],
    ["zh-Hans","简体中文","/zh-hans/"],
    ["ko","한국어","/ko/"],
    ["es","Español","/es/"],
    ["pt-BR","Português","/pt-br/"],
    ["fr","Français","/fr/"],
    ["de","Deutsch","/de/"],
    ["it","Italiano","/it/"],
    ["ru","Русский","/ru/"],
    ["tr","Türkçe","/tr/"],
    ["vi","Tiếng Việt","/vi/"],
    ["th","ไทย","/th/"],
    ["hi","हिन्दी","/hi/"],
    ["ar","العربية","/ar/"]
  ];
  const KEY = "tf_home_language";
  const byCode = Object.fromEntries(LANGS.map(([code,label,path]) => [code,{code,label,path}]));
  const routeCodes = Object.fromEntries(LANGS.map(([code,,path]) => [path,code]));

  function getSaved() { try { return localStorage.getItem(KEY); } catch (_) { return null; } }
  function setSaved(v) {
    try { v ? localStorage.setItem(KEY,v) : localStorage.removeItem(KEY); } catch (_) {}
  }
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

  function regionLang() {
    const map = {
      JP:"ja",US:"en",GB:"en",AU:"en",NZ:"en",IE:"en",
      CN:"zh-Hans",HK:"zh-Hans",MO:"zh-Hans",TW:"zh-Hans",KR:"ko",
      ES:"es",MX:"es",AR:"es",CO:"es",CL:"es",PE:"es",BR:"pt-BR",PT:"pt-BR",
      FR:"fr",MC:"fr",DE:"de",AT:"de",CH:"de",LI:"de",IT:"it",SM:"it",RU:"ru",
      TR:"tr",VN:"vi",TH:"th",IN:"hi",SA:"ar",AE:"ar",QA:"ar",KW:"ar",BH:"ar",
      OM:"ar",EG:"ar",JO:"ar",LB:"ar",IQ:"ar",MA:"ar",DZ:"ar",TN:"ar"
    };
    for (const value of (navigator.languages || [navigator.language || ""])) {
      try {
        const region = new Intl.Locale(value).region;
        if (region && map[region]) return map[region];
      } catch (_) {}
    }
    return null;
  }

  const autoLang = () => zoneLang() || browserLang() || regionLang() || "en";
  const cleanPath = () => location.pathname.replace(/\/index\.html$/, "/");
  const current = () => routeCodes[cleanPath()] || norm(document.documentElement.lang) || "ja";

  function cleanSearch() {
    const params = new URLSearchParams(location.search);
    params.delete("lang");
    return params.toString() ? "?" + params.toString() : "";
  }
  function go(code) {
    const item = byCode[code] || byCode.en;
    const next = item.path + cleanSearch() + location.hash;
    if (cleanPath() === item.path) {
      if (location.search.includes("lang=")) location.replace(next);
      return;
    }
    location.assign(next);
  }

  function processExplicit() {
    const params = new URLSearchParams(location.search);
    const raw = params.get("lang");
    if (!raw) return false;
    if (raw.toLowerCase() === "auto") {
      setSaved(null);
      go(autoLang());
      return true;
    }
    const code = norm(raw);
    if (!code) return false;
    setSaved(code);
    go(code);
    return true;
  }
  function maybeRedirect() {
    if (processExplicit()) return true;
    if (cleanPath() !== "/") return false;
    if (/bot|crawl|spider|slurp|bingpreview|facebookexternalhit/i.test(navigator.userAgent || "")) return false;
    const target = norm(getSaved()) || autoLang();
    if (target && target !== "ja") {
      go(target);
      return true;
    }
    return false;
  }

  if (maybeRedirect()) return;

  function addStyles() {
    const style = document.createElement("style");
    style.id = "tf-home-i18n-style";
    style.textContent = ".tf-language-switcher{display:flex;align-items:center;gap:6px;margin-left:auto;flex:0 0 auto}.tf-language-switcher__label{font-size:15px;line-height:1}.tf-language-switcher select{max-width:145px;padding:7px 28px 7px 9px;border:1px solid var(--tf-line,#d8dee5);border-radius:9px;background:#fff;color:var(--tf-ink,#172b3a);font:600 12px/1.4 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;cursor:pointer}.tf-language-switcher select:focus-visible{outline:2px solid var(--tf-blue,#145cdb);outline-offset:2px}html[dir=rtl] .tf-header,html[dir=rtl] .tf-footer{text-align:right}@media(max-width:760px){.tf-language-switcher{gap:3px}.tf-language-switcher__label{display:none}.tf-language-switcher select{max-width:104px;padding-left:7px;padding-right:22px;font-size:11px}.tf-header .tf-top{gap:8px}.tf-brand-logo{max-width:132px;height:auto}}";
    document.head.appendChild(style);
  }
  function installSelector() {
    const top = document.querySelector(".tf-header .tf-top");
    if (!top || document.getElementById("tf-home-language")) return;

    const wrap = document.createElement("div");
    wrap.className = "tf-language-switcher";
    const label = document.createElement("label");
    label.className = "tf-language-switcher__label";
    label.htmlFor = "tf-home-language";
    label.textContent = "🌐";
    const select = document.createElement("select");
    select.id = "tf-home-language";
    select.setAttribute("aria-label", "Language / 言語");

    const detected = autoLang();
    const autoOption = document.createElement("option");
    autoOption.value = "auto";
    autoOption.textContent = "Auto · " + (byCode[detected]?.label || "English");
    select.appendChild(autoOption);
    for (const [code, name] of LANGS) {
      const option = document.createElement("option");
      option.value = code;
      option.textContent = name;
      select.appendChild(option);
    }

    const saved = norm(getSaved());
    select.value = saved || "auto";
    if (!saved && current() !== detected) select.value = current();

    select.addEventListener("change", () => {
      if (select.value === "auto") {
        setSaved(null);
        go(autoLang());
      } else {
        setSaved(select.value);
        go(select.value);
      }
    });

    wrap.append(label, select);
    top.insertBefore(wrap, top.querySelector(".tf-mobile-menu") || null);
  }
  addStyles();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installSelector, { once: true });
  } else {
    installSelector();
  }
})();
