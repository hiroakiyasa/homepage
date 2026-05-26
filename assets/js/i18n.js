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

    attachLanguageSelectorEvents(prefix, mobile) {
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
        }
        if (this.currentLang === 'en') {
            if (key === 'nav.apps') return 'Developed Apps';
            if (key === 'mobileNav.apps') return '✨ Developed Apps';
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
