// Camping page specific i18n system (Japanese and English only)
class CampingI18N {
    constructor() {
        this.currentLang = 'ja';
        this.fallbackLang = 'ja';
        this.translations = {};
        this.supportedLanguages = {
            'ja': { name: '日本語', flag: '🇯🇵' },
            'en': { name: 'English', flag: '🇺🇸' }
        };
        this.init();
    }

    async init() {
        await this.loadTranslations();
        this.detectBrowserLanguage();
        this.createLanguageSelector();
        this.createMobileLanguageSelector();
        this.translatePage();
    }

    detectBrowserLanguage() {
        const savedLang = localStorage.getItem('preferred-language');
        if (savedLang && this.supportedLanguages[savedLang]) {
            this.currentLang = savedLang;
            return;
        }

        const browserLang = navigator.language || navigator.languages[0];
        const langCode = browserLang.split('-')[0];
        
        if (this.supportedLanguages[langCode]) {
            this.currentLang = langCode;
        }
    }

    createLanguageSelector() {
        const selector = document.getElementById('language-selector');
        if (!selector) return;

        const currentLangInfo = this.supportedLanguages[this.currentLang];
        selector.innerHTML = `
            <div class="relative">
                <button id="lang-button" class="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary">
                    <span class="text-lg">${currentLangInfo.flag}</span>
                    <span class="text-sm font-medium text-gray-700">${currentLangInfo.name}</span>
                    <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                </button>
                <div id="lang-dropdown" class="hidden absolute right-0 mt-2 w-48 bg-white border border-gray-300 rounded-md shadow-lg z-50">
                    ${Object.entries(this.supportedLanguages).map(([code, info]) => `
                        <button class="lang-option w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center space-x-3 ${code === this.currentLang ? 'bg-gray-50' : ''}" data-lang="${code}">
                            <span class="text-lg">${info.flag}</span>
                            <span>${info.name}</span>
                        </button>
                    `).join('')}
                </div>
            </div>
        `;

        this.attachLanguageSelectorEvents();
    }

    createMobileLanguageSelector() {
        const mobileSelector = document.getElementById('mobile-language-selector');
        if (!mobileSelector) return;

        const currentLangInfo = this.supportedLanguages[this.currentLang];
        mobileSelector.innerHTML = `
            <div class="relative">
                <button id="mobile-lang-button" class="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary transition-colors duration-300">
                    <span class="text-base sm:text-lg">${currentLangInfo.flag}</span>
                </button>
                <div id="mobile-lang-dropdown" class="hidden absolute right-0 mt-2 w-32 bg-white border border-gray-300 rounded-md shadow-lg z-50">
                    ${Object.entries(this.supportedLanguages).map(([code, info]) => `
                        <button class="mobile-lang-option w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center space-x-2 ${code === this.currentLang ? 'bg-gray-50' : ''}" data-lang="${code}">
                            <span class="text-base">${info.flag}</span>
                            <span class="text-xs">${info.name}</span>
                        </button>
                    `).join('')}
                </div>
            </div>
        `;

        this.attachMobileLanguageSelectorEvents();
    }

    attachLanguageSelectorEvents() {
        const button = document.getElementById('lang-button');
        const dropdown = document.getElementById('lang-dropdown');
        const langOptions = document.querySelectorAll('.lang-option');

        if (!button || !dropdown) return;

        button.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('hidden');
        });

        document.addEventListener('click', () => {
            dropdown.classList.add('hidden');
        });

        langOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const lang = option.dataset.lang;
                this.setLanguage(lang);
                dropdown.classList.add('hidden');
            });
        });
    }

    setLanguage(lang) {
        if (!this.supportedLanguages[lang]) return;
        
        this.currentLang = lang;
        localStorage.setItem('preferred-language', lang);
        
        this.translatePage();
        this.updateLanguageSelector();
        this.updateMobileLanguageSelector();
        this.updateMetaTags();
    }

    updateLanguageSelector() {
        const currentLangInfo = this.supportedLanguages[this.currentLang];
        const button = document.getElementById('lang-button');
        if (button) {
            button.innerHTML = `
                <span class="text-lg">${currentLangInfo.flag}</span>
                <span class="text-sm font-medium text-gray-700">${currentLangInfo.name}</span>
                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
            `;
        }

        // Update options selected state
        document.querySelectorAll('.lang-option').forEach(option => {
            const lang = option.dataset.lang;
            if (lang === this.currentLang) {
                option.classList.add('bg-gray-50');
            } else {
                option.classList.remove('bg-gray-50');
            }
        });
    }

    attachMobileLanguageSelectorEvents() {
        const mobileButton = document.getElementById('mobile-lang-button');
        const mobileDropdown = document.getElementById('mobile-lang-dropdown');
        const mobileLangOptions = document.querySelectorAll('.mobile-lang-option');

        if (!mobileButton || !mobileDropdown) return;

        mobileButton.addEventListener('click', (e) => {
            e.stopPropagation();
            mobileDropdown.classList.toggle('hidden');
        });

        document.addEventListener('click', () => {
            mobileDropdown.classList.add('hidden');
        });

        mobileLangOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const lang = option.dataset.lang;
                this.setLanguage(lang);
                mobileDropdown.classList.add('hidden');
            });
        });
    }

    updateMobileLanguageSelector() {
        const currentLangInfo = this.supportedLanguages[this.currentLang];
        const mobileButton = document.getElementById('mobile-lang-button');
        if (mobileButton) {
            mobileButton.innerHTML = `
                <span class="text-base sm:text-lg">${currentLangInfo.flag}</span>
            `;
        }

        // Update mobile options selected state
        document.querySelectorAll('.mobile-lang-option').forEach(option => {
            option.classList.toggle('bg-gray-50', option.dataset.lang === this.currentLang);
        });
    }

    async loadTranslations() {
        // Only load Japanese and English translations
        try {
            const translations = {};
            
            for (const langCode of Object.keys(this.supportedLanguages)) {
                try {
                    const response = await fetch(`assets/locales/${langCode}.json`);
                    if (response.ok) {
                        translations[langCode] = await response.json();
                    }
                } catch (error) {
                    console.warn(`Failed to load ${langCode} translations:`, error);
                }
            }

            this.translations = translations;
            console.log('Camping translations loaded:', Object.keys(this.translations));
        } catch (error) {
            console.error('Failed to load translations:', error);
        }
    }

    translatePage() {
        const currentTranslations = this.translations[this.currentLang] || this.translations[this.fallbackLang] || {};
        
        // Translate elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.getNestedValue(currentTranslations, key);
            if (translation) {
                element.textContent = translation;
            }
        });

        // Translate meta tags
        this.updateMetaTags();
    }

    updateMetaTags() {
        const currentTranslations = this.translations[this.currentLang] || this.translations[this.fallbackLang] || {};
        
        // Update title
        const titleElement = document.querySelector('title[data-i18n]');
        if (titleElement) {
            const key = titleElement.getAttribute('data-i18n');
            const translation = this.getNestedValue(currentTranslations, key);
            if (translation) {
                titleElement.textContent = translation;
            }
        }

        // Update meta description
        const metaDescription = document.querySelector('meta[name="description"][data-i18n-content]');
        if (metaDescription) {
            const key = metaDescription.getAttribute('data-i18n-content');
            const translation = this.getNestedValue(currentTranslations, key);
            if (translation) {
                metaDescription.setAttribute('content', translation);
            }
        }

        // Update Open Graph tags
        document.querySelectorAll('meta[data-i18n-property]').forEach(meta => {
            const key = meta.getAttribute('data-i18n-property');
            const translation = this.getNestedValue(currentTranslations, key);
            if (translation) {
                meta.setAttribute('content', translation);
            }
        });

        // Update Twitter Card tags
        document.querySelectorAll('meta[data-i18n-name]').forEach(meta => {
            const key = meta.getAttribute('data-i18n-name');
            const translation = this.getNestedValue(currentTranslations, key);
            if (translation) {
                meta.setAttribute('content', translation);
            }
        });

        // Update HTML lang attribute
        document.documentElement.setAttribute('lang', this.currentLang);
    }

    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current && current[key], obj);
    }
}