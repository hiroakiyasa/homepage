// Multi-language support system for TrailFusion AI
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
            'fr': { name: 'Français', flag: '🇫🇷' },
            'pt': { name: 'Português', flag: '🇵🇹' },
            'hi': { name: 'हिन्दी', flag: '🇮🇳' },
            'de': { name: 'Deutsch', flag: '🇩🇪' },
            'es': { name: 'Español', flag: '🇪🇸' },
            'ru': { name: 'Русский', flag: '🇷🇺' }
        };
        this.init();
    }

    init() {
        this.loadTranslations();
        this.detectBrowserLanguage();
        this.createLanguageSelector();
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

    attachLanguageSelectorEvents() {
        const button = document.getElementById('lang-button');
        const dropdown = document.getElementById('lang-dropdown');
        
        if (!button || !dropdown) return;

        button.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('hidden');
        });

        document.addEventListener('click', () => {
            dropdown.classList.add('hidden');
        });

        dropdown.addEventListener('click', (e) => {
            e.stopPropagation();
            if (e.target.classList.contains('lang-option')) {
                const lang = e.target.dataset.lang;
                this.setLanguage(lang);
                dropdown.classList.add('hidden');
            }
        });
    }

    setLanguage(lang) {
        if (!this.supportedLanguages[lang]) return;
        
        this.currentLang = lang;
        localStorage.setItem('preferred-language', lang);
        
        this.translatePage();
        this.updateLanguageSelector();
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

        // Update active state in dropdown
        document.querySelectorAll('.lang-option').forEach(option => {
            option.classList.toggle('bg-gray-50', option.dataset.lang === this.currentLang);
        });
    }

    updateMetaTags() {
        document.documentElement.lang = this.currentLang;
        
        const ogLocale = document.querySelector('meta[property="og:locale"]');
        if (ogLocale) {
            const localeMap = {
                'ja': 'ja_JP',
                'en': 'en_US',
                'zh': 'zh_CN',
                'ko': 'ko_KR',
                'fr': 'fr_FR',
                'pt': 'pt_BR',
                'hi': 'hi_IN',
                'de': 'de_DE',
                'es': 'es_ES',
                'ru': 'ru_RU'
            };
            ogLocale.content = localeMap[this.currentLang] || 'ja_JP';
        }
    }

    translatePage() {
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.dataset.i18n;
            const translation = this.getTranslation(key);
            if (translation) {
                if (element.tagName === 'INPUT' && element.type === 'text') {
                    element.placeholder = translation;
                } else {
                    element.textContent = translation;
                }
            }
        });

        // Translate meta tags
        const title = this.getTranslation('meta.title');
        const description = this.getTranslation('meta.description');
        
        if (title) document.title = title;
        
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc && description) metaDesc.content = description;
        
        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle && title) ogTitle.content = title;
        
        const ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc && description) ogDesc.content = description;
    }

    getTranslation(key) {
        const keys = key.split('.');
        let translation = this.translations[this.currentLang];
        
        for (const k of keys) {
            if (translation && translation[k]) {
                translation = translation[k];
            } else {
                // Fallback to default language
                translation = this.translations[this.fallbackLang];
                for (const k of keys) {
                    if (translation && translation[k]) {
                        translation = translation[k];
                    } else {
                        return null;
                    }
                }
                break;
            }
        }
        
        return typeof translation === 'string' ? translation : null;
    }

    loadTranslations() {
        this.translations = {
            ja: {
                meta: {
                    title: "TrailFusion AI - キャンピングカーDIYとAIアプリケーション開発",
                    description: "キャンピングカーDIY制作からAIアプリケーション開発まで。ハイエースを自作キャンピングカーに改造する実践ガイドと革新的なAIアプリを紹介。"
                },
                nav: {
                    home: "ホーム",
                    apps: "AIアプリ",
                    camping: "キャンピングカーDIY",
                    contact: "お問い合わせ"
                },
                common: {
                    learnMore: "詳しく見る",
                    getStarted: "始める",
                    tryNow: "今すぐ試す",
                    download: "ダウンロード",
                    register: "登録する",
                    send: "送信する",
                    viewApps: "アプリを見る",
                    viewGuide: "ガイドを見る",
                    seeDetails: "詳細を見る"
                },
                index: {
                    hero: {
                        line1: "自由な旅と",
                        line2: "革新的なAI体験",
                        line3: "を創造する",
                        description: "キャンピングカーDIYとAIアプリケーションで、あなたの夢を現実に"
                    },
                    services: {
                        title: "TrailFusion AI のサービス",
                        subtitle: "DIYの専門知識と最先端のAI技術を組み合わせ、ユーザーの夢の実現をサポートします"
                    }
                }
            },
            en: {
                meta: {
                    title: "TrailFusion AI - Camper DIY & AI Application Development",
                    description: "From camper DIY creation to AI application development. Practical guide to converting a HiAce into a homemade camper and introducing innovative AI apps."
                },
                nav: {
                    home: "Home",
                    apps: "AI Apps",
                    camping: "Camper DIY",
                    contact: "Contact"
                },
                common: {
                    learnMore: "Learn More",
                    getStarted: "Get Started",
                    tryNow: "Try Now",
                    download: "Download",
                    register: "Register",
                    send: "Send",
                    viewApps: "View Apps",
                    viewGuide: "View Guide",
                    seeDetails: "See Details"
                },
                index: {
                    hero: {
                        line1: "Free Travel and",
                        line2: "Innovative AI Experience",
                        line3: "Creating",
                        description: "Make your dreams come true with camper DIY and AI applications"
                    },
                    services: {
                        title: "TrailFusion AI Services",
                        subtitle: "Combining DIY expertise with cutting-edge AI technology to support users in realizing their dreams"
                    }
                }
            },
            zh: {
                meta: {
                    title: "TrailFusion AI - 房车DIY与AI应用开发",
                    description: "从房车DIY制作到AI应用开发。将HiAce改装为自制房车的实用指南和创新AI应用介绍。"
                },
                nav: {
                    home: "首页",
                    apps: "AI应用",
                    camping: "房车DIY",
                    contact: "联系我们"
                },
                common: {
                    learnMore: "了解更多",
                    getStarted: "开始",
                    tryNow: "立即试用",
                    download: "下载"
                }
            },
            ko: {
                meta: {
                    title: "TrailFusion AI - 캠핑카 DIY 및 AI 애플리케이션 개발",
                    description: "캠핑카 DIY 제작부터 AI 애플리케이션 개발까지. 하이에이스를 자작 캠핑카로 개조하는 실용 가이드와 혁신적인 AI 앱 소개."
                },
                nav: {
                    home: "홈",
                    apps: "AI 앱",
                    camping: "캠핑카 DIY",
                    contact: "문의하기"
                },
                common: {
                    learnMore: "자세히 보기",
                    getStarted: "시작하기",
                    tryNow: "지금 시도",
                    download: "다운로드"
                }
            },
            fr: {
                meta: {
                    title: "TrailFusion AI - DIY Camping-car et Développement d'Applications IA",
                    description: "De la création DIY de camping-car au développement d'applications IA. Guide pratique pour convertir un HiAce en camping-car fait maison et présentation d'applications IA innovantes."
                },
                nav: {
                    home: "Accueil",
                    apps: "Applications IA",
                    camping: "DIY Camping-car",
                    contact: "Contact"
                },
                common: {
                    learnMore: "En savoir plus",
                    getStarted: "Commencer",
                    tryNow: "Essayer maintenant",
                    download: "Télécharger"
                }
            },
            pt: {
                meta: {
                    title: "TrailFusion AI - DIY de Motorhome e Desenvolvimento de Aplicações IA",
                    description: "Da criação DIY de motorhome ao desenvolvimento de aplicações IA. Guia prático para converter um HiAce em motorhome caseiro e apresentação de aplicações IA inovadoras."
                },
                nav: {
                    home: "Início",
                    apps: "Apps IA",
                    camping: "DIY Motorhome",
                    contact: "Contato"
                },
                common: {
                    learnMore: "Saiba mais",
                    getStarted: "Começar",
                    tryNow: "Experimente agora",
                    download: "Download"
                }
            },
            hi: {
                meta: {
                    title: "TrailFusion AI - कैम्पर DIY और AI एप्लिकेशन डेवलपमेंट",
                    description: "कैम्पर DIY निर्माण से AI एप्लिकेशन डेवलपमेंट तक। HiAce को घर में बने कैम्पर में बदलने की व्यावहारिक गाइड और नवाचार AI ऐप्स का परिचय।"
                },
                nav: {
                    home: "होम",
                    apps: "AI ऐप्स",
                    camping: "कैम्पर DIY",
                    contact: "संपर्क करें"
                },
                common: {
                    learnMore: "और जानें",
                    getStarted: "शुरू करें",
                    tryNow: "अभी आज़माएं",
                    download: "डाउनलोड"
                }
            },
            de: {
                meta: {
                    title: "TrailFusion AI - Wohnmobil DIY & KI-Anwendungsentwicklung",
                    description: "Von Wohnmobil-DIY-Erstellung bis zur KI-Anwendungsentwicklung. Praktischer Leitfaden zur Umwandlung eines HiAce in ein selbstgebautes Wohnmobil und Vorstellung innovativer KI-Apps."
                },
                nav: {
                    home: "Startseite",
                    apps: "KI-Apps",
                    camping: "Wohnmobil DIY",
                    contact: "Kontakt"
                },
                common: {
                    learnMore: "Mehr erfahren",
                    getStarted: "Loslegen",
                    tryNow: "Jetzt ausprobieren",
                    download: "Herunterladen"
                }
            },
            es: {
                meta: {
                    title: "TrailFusion AI - DIY de Autocaravana y Desarrollo de Aplicaciones IA",
                    description: "Desde la creación DIY de autocaravanas hasta el desarrollo de aplicaciones IA. Guía práctica para convertir un HiAce en autocaravana casera y presentación de aplicaciones IA innovadoras."
                },
                nav: {
                    home: "Inicio",
                    apps: "Apps IA",
                    camping: "DIY Autocaravana",
                    contact: "Contacto"
                },
                common: {
                    learnMore: "Saber más",
                    getStarted: "Empezar",
                    tryNow: "Probar ahora",
                    download: "Descargar"
                }
            },
            ru: {
                meta: {
                    title: "TrailFusion AI - DIY Кемпер и Разработка AI Приложений",
                    description: "От создания DIY кемпера до разработки AI приложений. Практическое руководство по переоборудованию HiAce в самодельный кемпер и представление инновационных AI приложений."
                },
                nav: {
                    home: "Главная",
                    apps: "AI Приложения",
                    camping: "DIY Кемпер",
                    contact: "Контакты"
                },
                common: {
                    learnMore: "Узнать больше",
                    getStarted: "Начать",
                    tryNow: "Попробовать сейчас",
                    download: "Скачать",
                    register: "Зарегистрироваться",
                    send: "Отправить",
                    viewApps: "Посмотреть приложения",
                    viewGuide: "Посмотреть руководство",
                    seeDetails: "Подробности"
                },
                index: {
                    hero: {
                        line1: "Свободные путешествия и",
                        line2: "Инновационный AI опыт",
                        line3: "Создание",
                        description: "Воплотите свои мечты в реальность с DIY кемпером и AI приложениями"
                    },
                    services: {
                        title: "Услуги TrailFusion AI",
                        subtitle: "Сочетая экспертизу DIY с передовыми AI технологиями для поддержки пользователей в реализации их мечт"
                    }
                }
            }
        };
    }
}

// Initialize i18n system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.i18n = new I18N();
});