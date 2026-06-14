// Multi-language support system for TrailFusion AI
// Lightweight, page-safe i18n bootstrap used across static pages.
class I18N {
    constructor() {
        this.currentLang = 'ja';
        this.fallbackLang = 'ja';
        this.translations = {};
        this.supportedLanguages = {
            'ja': { name: '日本語', flag: '🇯🇵' },
            'en': { name: 'English', flag: '🇺🇸' },
            'zh': { name: '中文', flag: '🇨🇳' },
            'ko': { name: '한국어', flag: '🇰🇷' },
            'es': { name: 'Español', flag: '🇪🇸' },
            'fr': { name: 'Français', flag: '🇫🇷' },
            'de': { name: 'Deutsch', flag: '🇩🇪' },
            'pt': { name: 'Português', flag: '🇧🇷' },
            'ru': { name: 'Русский', flag: '🇷🇺' },
            'hi': { name: 'हिन्दी', flag: '🇮🇳' }
        };
        this.init();
    }

    isAppsPage() {
        return /(^|\/)apps\.html$/.test(window.location.pathname || '');
    }

    async init() {
        await this.loadTranslations();
        this.detectBrowserLanguage();
        this.createLanguageSelector();
        this.createMobileLanguageSelector();
        this.translatePage();
    }

    detectBrowserLanguage() {
        if (this.isAppsPage()) {
            const appsLang = localStorage.getItem('preferred-language-apps');
            if (appsLang && this.supportedLanguages[appsLang]) {
                this.currentLang = appsLang;
                return;
            }
            this.currentLang = 'ja';
            try { localStorage.setItem('preferred-language', 'ja'); } catch (_) {}
            return;
        }

        const savedLang = localStorage.getItem('preferred-language');
        if (savedLang && this.supportedLanguages[savedLang]) {
            this.currentLang = savedLang;
            return;
        }

        const browserLang = (navigator.languages && navigator.languages[0]) || navigator.language || 'ja';
        const langCode = browserLang.split('-')[0];
        if (this.supportedLanguages[langCode]) this.currentLang = langCode;
    }

    createLanguageSelector() {
        const selector = document.getElementById('language-selector');
        if (!selector) return;
        selector.innerHTML = this.buildSelectorHtml('lang', false);
        this.attachLanguageSelectorEvents('lang', false);
    }

    createMobileLanguageSelector() {
        const selector = document.getElementById('mobile-language-selector');
        if (!selector) return;
        selector.innerHTML = this.buildSelectorHtml('mobile-lang', true);
        this.attachLanguageSelectorEvents('mobile-lang', true);
    }

    buildSelectorHtml(prefix, mobile) {
        const current = this.supportedLanguages[this.currentLang] || this.supportedLanguages.ja;
        const buttonClass = mobile
            ? 'w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary transition-colors duration-300'
            : 'flex items-center space-x-2 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary';
        const dropdownClass = mobile
            ? 'hidden absolute right-0 mt-2 w-40 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-64 overflow-y-auto'
            : 'hidden absolute right-0 mt-2 w-48 bg-white border border-gray-300 rounded-md shadow-lg z-50';
        const optionClass = mobile
            ? 'mobile-lang-option w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center space-x-2'
            : 'lang-option w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center space-x-3';
        return `
            <div class="relative">
                <button id="${prefix}-button" class="${buttonClass}" type="button" aria-label="Language">
                    <span class="${mobile ? 'text-base sm:text-lg' : 'text-lg'}">${current.flag}</span>
                    ${mobile ? '' : `<span class="text-sm font-medium text-gray-700">${current.name}</span><svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>`}
                </button>
                <div id="${prefix}-dropdown" class="${dropdownClass}">
                    ${Object.entries(this.supportedLanguages).map(([code, info]) => `
                        <button class="${optionClass} ${code === this.currentLang ? 'bg-gray-50' : ''}" data-lang="${code}" type="button">
                            <span class="${mobile ? 'text-base' : 'text-lg'}">${info.flag}</span>
                            <span class="${mobile ? 'text-xs' : ''}">${info.name}</span>
                        </button>
                    `).join('')}
                </div>
            </div>`;
    }

    attachLanguageSelectorEvents(prefix) {
        const button = document.getElementById(`${prefix}-button`);
        const dropdown = document.getElementById(`${prefix}-dropdown`);
        if (!button || !dropdown) return;
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('hidden');
        });
        document.addEventListener('click', () => dropdown.classList.add('hidden'));
        dropdown.addEventListener('click', (e) => {
            e.stopPropagation();
            const option = e.target.closest('[data-lang]');
            if (!option) return;
            this.setLanguage(option.dataset.lang);
            dropdown.classList.add('hidden');
        });
    }

    setLanguage(lang) {
        if (!this.supportedLanguages[lang]) return;
        this.currentLang = lang;
        try {
            localStorage.setItem('preferred-language', lang);
            if (this.isAppsPage()) localStorage.setItem('preferred-language-apps', lang);
        } catch (_) {}
        this.translatePage();
        this.createLanguageSelector();
        this.createMobileLanguageSelector();
        this.updateMetaTags();
    }

    updateMetaTags() {
        document.documentElement.lang = this.currentLang;
        const localeMap = { ja:'ja_JP', en:'en_US', zh:'zh_CN', ko:'ko_KR', fr:'fr_FR', pt:'pt_BR', hi:'hi_IN', de:'de_DE', es:'es_ES', ru:'ru_RU' };
        const ogLocale = document.querySelector('meta[property="og:locale"]');
        if (ogLocale) ogLocale.content = localeMap[this.currentLang] || 'ja_JP';
    }

    translatePage() {
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const translation = this.getTranslation(element.dataset.i18n);
            if (!translation) return;
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') element.placeholder = translation;
            else element.innerHTML = translation;
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const translation = this.getTranslation(element.dataset.i18nPlaceholder);
            if (translation) element.placeholder = translation;
        });
        const title = this.getTranslation('meta.title') || this.getTranslation('apps.meta.title');
        const description = this.getTranslation('meta.description') || this.getTranslation('apps.meta.description');
        if (title) document.title = title;
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc && description) metaDesc.content = description;
        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle && title) ogTitle.content = title;
        const ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc && description) ogDesc.content = description;
        this.updateMetaTags();
        this.normalizeAppLabels();
        this.injectKokugoQuest();
    }

    injectKokugoQuest() {
        if (!this.isAppsPage() || document.getElementById('kokugo-quest')) return;
        const logo = 'assets/images/kokugo-quest/kokugo-quest-logo.svg';
        const shots = [1,2,3,4,5,6].map(n => `assets/images/kokugo-quest/kokugo-quest-${n}.svg`);

        const navRow = document.querySelector('.app-nav-premium .flex');
        if (navRow) navRow.insertAdjacentHTML('afterbegin', `<a href="#kokugo-quest" class="app-nav-item flex items-center gap-2 px-3 py-2 sm:px-5 sm:py-2.5 rounded-xl text-gray-700 hover:text-pink-600 hover:bg-pink-50 transition-all text-sm sm:text-base font-medium whitespace-nowrap group"><span class="w-8 h-8 rounded-lg overflow-hidden shadow-md flex-shrink-0"><img src="${logo}" class="w-full h-full object-cover" alt=""></span><span class="sm:hidden">国語クエ</span><span class="hidden sm:inline">国語クエスト</span></a>`);

        const firstCard = document.querySelector('a.app-card[href="#rika-quest"]');
        if (firstCard) {
            firstCard.parentElement.style.gridTemplateColumns = 'repeat(auto-fit,minmax(140px,1fr))';
            firstCard.insertAdjacentHTML('beforebegin', `<a href="#kokugo-quest" class="app-card p-4 sm:p-5 text-center group cursor-pointer"><div class="w-full aspect-square mx-auto mb-4 rounded-2xl border-2 border-navy overflow-hidden bg-coral"><img src="${logo}" alt="合格！国語クエスト ロゴ" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy"></div><h3 class="font-display font-black text-navy mb-1 text-sm sm:text-base">国語クエスト</h3><p class="text-xs sm:text-sm text-navy/60 font-bold">Japanese Quiz Adventure</p></a>`);
        }

        document.querySelectorAll('.font-accent').forEach(el => { if (el.textContent.trim() === '6') el.textContent = '8'; });
        document.querySelectorAll('.sticker').forEach(el => { el.innerHTML = el.innerHTML.replace('🚀 6 APPS', '🚀 8 APPS'); });
        const overviewDesc = document.querySelector('[data-i18n="apps.overview.description"]');
        if (overviewDesc) overviewDesc.textContent = 'Eight applications powered by innovative technology';

        const rika = document.getElementById('rika-quest');
        if (rika) rika.insertAdjacentHTML('beforebegin', `
<section id="kokugo-quest" class="app-section-v2 app-bg-coral py-14 md:py-20">
  <div class="absolute inset-0 dot-pattern opacity-15 pointer-events-none"></div>
  <div class="container mx-auto px-4 relative z-10">
    <div class="flex items-center justify-between gap-3 flex-wrap mb-5 fade-in-up visible">
      <div class="flex items-center gap-3 flex-wrap"><span class="app-progress-chip"><span>08</span><span class="line"></span><span>08</span></span><span class="sticker sticker-coral"><i class="ri-book-open-line mr-1"></i><span>国語クエスト</span></span><span class="sticker sticker-sun">中学受験</span></div>
      <span class="hand-font text-coral text-lg md:text-xl hidden md:inline">Japanese Adventure with illustrations ✦</span>
    </div>
    <div class="app-banner relative overflow-hidden mb-6 md:mb-8 fade-in-up visible">
      <img src="${shots[0]}" alt="" class="absolute inset-0 w-full h-full object-cover">
      <div class="absolute inset-0 app-banner-overlay"></div>
      <div class="relative z-10 h-full flex flex-col justify-center p-6 md:p-10 lg:p-12 max-w-xl">
        <div class="flex items-center gap-3 mb-3 md:mb-4"><div class="app-icon-tile-sm"><img src="${logo}" alt="合格！国語クエスト ロゴ"></div><div class="flex flex-col"><span class="font-accent text-[10px] tracking-widest text-white/60 uppercase">APP</span><span class="font-accent text-sm text-white">08 / 08</span></div></div>
        <h2 class="display-xl text-3xl md:text-4xl lg:text-5xl text-white mb-2 md:mb-3">国語クエスト</h2>
        <p class="text-white/90 text-sm md:text-base leading-relaxed">中学受験の国語を、イラスト・読み上げ・対戦・ランキングで楽しく攻略。</p>
      </div>
    </div>
    <div class="grid lg:grid-cols-12 gap-6 md:gap-8 items-stretch">
      <div class="lg:col-span-7 fade-in-up visible"><div class="card-chunky p-6 md:p-8 h-full flex flex-col"><div class="flex items-center gap-3 mb-4"><div class="w-11 h-11 bg-coral rounded-xl border-2 border-navy grid place-items-center" style="box-shadow:3px 3px 0 #1F2E4D;"><i class="ri-book-open-fill text-xl text-white"></i></div><h3 class="font-display font-black text-lg md:text-xl text-navy">中学受験国語を、楽しくまるごと攻略</h3></div><p class="text-navy/75 text-sm md:text-base leading-relaxed mb-5">漢字・熟語、語彙・言葉、文法・意味、文学・詩歌、文章題まで。イラストで見て、音声で聞いて、友達と競いながら学べる国語学習アプリです。</p><ul class="space-y-2.5 mb-6"><li class="flex items-start gap-3"><span class="feat-num">01</span><p class="text-navy/85 leading-relaxed pt-1.5 text-sm md:text-base">中学受験の国語に必要な全4分野・約65単元を網羅</p></li><li class="flex items-start gap-3"><span class="feat-num">02</span><p class="text-navy/85 leading-relaxed pt-1.5 text-sm md:text-base">ことわざ・慣用句もイラストで意味がひと目でわかる</p></li><li class="flex items-start gap-3"><span class="feat-num">03</span><p class="text-navy/85 leading-relaxed pt-1.5 text-sm md:text-base">問題読み上げで、目と耳から楽しく記憶に定着</p></li><li class="flex items-start gap-3"><span class="feat-num">04</span><p class="text-navy/85 leading-relaxed pt-1.5 text-sm md:text-base">対戦・ランキング・学習レポートで継続意欲を高める</p></li></ul><div class="flex flex-wrap gap-3 mb-4"><span class="store-pill store-pill-disabled"><i class="ri-apple-fill text-xl"></i><span>App Store 準備中</span></span><a href="kokugo-quest.html" class="store-pill"><i class="ri-external-link-line text-xl"></i><span>詳しく見る</span></a></div><div class="flex flex-wrap gap-2 mb-4 mt-auto pt-4"><span class="dl-chip"><i class="ri-book-2-fill text-coral"></i>全4分野</span><span class="dl-chip"><i class="ri-image-fill text-coral"></i>イラスト学習</span><span class="dl-chip"><i class="ri-volume-up-fill text-coral"></i>読み上げ</span><span class="dl-chip"><i class="ri-trophy-fill text-coral"></i>ランキング</span></div><a href="kokugo-quest-privacy.html" target="_blank" class="inline-flex items-center gap-1.5 text-xs font-bold text-navy/60 hover:text-coral transition"><i class="ri-shield-check-line"></i><span>Privacy Policy</span><i class="ri-arrow-right-line"></i></a></div></div>
      <div class="lg:col-span-5 fade-in-up visible"><div class="grid grid-cols-2 gap-4">${shots.slice(1).map(src => `<img src="${src}" alt="" class="app-screenshot">`).join('')}</div></div>
    </div>
  </div>
</section>`);

        const aiList = Array.from(document.querySelectorAll('footer a[href="rika-quest.html"]'))[0];
        if (aiList) aiList.insertAdjacentHTML('beforebegin', '<li><a href="kokugo-quest.html" class="hover:text-ocean transition">国語クエスト</a></li>');
    }

    normalizeAppLabels() {
        const replaceMap = [
            [/AIアプリを見る/g, '開発したアプリを見る'],
            [/AIアプリ/g, '開発したアプリ'],
            [/AIアプリケーション/g, '開発したアプリケーション'],
            [/アプリ紹介/g, '開発したアプリ']
        ];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                const parent = node.parentElement;
                if (!parent || ['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA'].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
                return node.nodeValue && /(AIアプリ|アプリ紹介)/.test(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
            }
        });
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        nodes.forEach(node => {
            let text = node.nodeValue;
            replaceMap.forEach(([pattern, replacement]) => { text = text.replace(pattern, replacement); });
            node.nodeValue = text;
        });
    }

    getTranslation(key) {
        if (this.currentLang === 'ja') {
            if (key === 'nav.apps') return '開発したアプリ';
            if (key === 'mobileNav.apps') return '✨ 開発したアプリ';
            if (key === 'apps.hero.cta') return '開発したアプリを見る';
            if (key === 'apps.overview.title') return '開発したアプリ一覧';
            if (key === 'apps.overview.description') return '8つのアプリを、わかりやすく美しいデザインで紹介しています';
        }
        if (this.currentLang === 'en') {
            if (key === 'nav.apps') return 'Developed Apps';
            if (key === 'mobileNav.apps') return '✨ Developed Apps';
            if (key === 'apps.overview.description') return 'Eight applications powered by innovative technology';
        }
        const keys = key.split('.');
        const tryLang = (lang) => {
            let value = this.translations[lang];
            for (const k of keys) {
                if (value && Object.prototype.hasOwnProperty.call(value, k)) value = value[k];
                else return null;
            }
            return typeof value === 'string' ? value : null;
        };
        return tryLang(this.currentLang) || tryLang(this.fallbackLang);
    }

    async loadTranslations() {
        try {
            const translations = {};
            for (const langCode of Object.keys(this.supportedLanguages)) {
                try {
                    const response = await fetch(`assets/locales/${langCode}.json`);
                    if (response.ok) translations[langCode] = await response.json();
                } catch (_) {}
            }
            if (Object.keys(translations).length > 0) {
                this.translations = translations;
                return;
            }
        } catch (_) {}

        try {
            if (typeof completeTranslations !== 'undefined') {
                this.translations = completeTranslations;
                return;
            }
            const script = document.createElement('script');
            script.src = 'assets/js/translations-complete.js';
            await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
            if (typeof completeTranslations !== 'undefined') {
                this.translations = completeTranslations;
                return;
            }
        } catch (_) {}

        this.translations = {
            ja: {
                meta: { title: 'TrailFusion AI', description: 'TrailFusion AI' },
                nav: { home: 'ホーム', apps: '開発したアプリ', camping: 'キャンピングカー', driveRoutes: 'ドライブルート', maintenance: '整備記録', contact: 'お問い合わせ' },
                mobileNav: { home: '🏠 ホーム', apps: '✨ 開発したアプリ', camping: '🚐 キャンパー', driveRoutes: '🗺️ ドライブルート', maintenance: '🔧 整備記録', contact: '✉️ お問い合わせ' }
            },
            en: {
                meta: { title: 'TrailFusion AI', description: 'TrailFusion AI' },
                nav: { home: 'Home', apps: 'Developed Apps', camping: 'Camper', driveRoutes: 'Drive Routes', maintenance: 'Maintenance', contact: 'Contact' },
                mobileNav: { home: '🏠 Home', apps: '✨ Developed Apps', camping: '🚐 Camper', driveRoutes: '🗺️ Drive Routes', maintenance: '🔧 Maintenance', contact: '✉️ Contact' }
            }
        };
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (!window.i18n) window.i18n = new I18N();
});
