document.addEventListener('DOMContentLoaded', () => {
  const APPS = {
    rika: {
      id: 'rika-quest',
      navShort: '理科クエ',
      navTitle: '理科クエスト',
      title: '合格！理科クエスト',
      subTitle: '中学受験理科を、楽しくまるごと対策',
      badge: 'SCIENCE QUEST',
      accent: '#FFD84D',
      bgClass: 'app-bg-sun',
      hand: '理科が得意になる冒険へ ✦',
      logo: 'assets/images/rika-quest/rika-quest-logo.png',
      hero: 'assets/images/rika-quest/rika-quest-1.png',
      detail: 'rika-quest.html',
      ios: 'https://apps.apple.com/us/app/%E5%90%88%E6%A0%BC%E7%90%86%E7%A7%91%E3%82%AF%E3%82%A8%E3%82%B9%E3%83%88/id6772644144',
      android: 'https://play.google.com/store/apps/details?id=com.gokakurikaquest.app',
      intro: '生命・地球・物質・エネルギーの4分野を、イラスト付きクイズでテンポよく攻略。単元別の進捗、偏差値、全国ランキングで、毎日の学習が続きます。',
      features: [
        '生命・地球・物質・エネルギーの全4分野、28単元を網羅',
        '2000問以上の問題で、基礎から入試レベルまで反復練習',
        'イラストと音声で、難しい理科用語もイメージで定着',
        '偏差値・ランキング・復習機能で弱点を見える化'
      ],
      chips: ['全28単元', '2000問以上', 'イラスト解説', '偏差値・ランキング'],
      shots: [
        ['assets/images/rika-quest/rika-quest-2.png', '理科クエストの問題画面'],
        ['assets/images/rika-quest/rika-quest-3.png', '理科クエストの解説画面'],
        ['assets/images/rika-quest/rika-quest-4.png', '理科クエストの進捗画面'],
        ['assets/images/rika-quest/rika-quest-5.png', '理科クエストのランキング画面']
      ]
    },
    shakai: {
      id: 'social-quest',
      navShort: '社会クエ',
      navTitle: '社会クエスト',
      title: '合格！社会クエスト',
      subTitle: '中学受験社会を、地理・歴史・公民まで一気に対策',
      badge: 'SOCIAL STUDIES QUEST',
      accent: '#8FD4FF',
      bgClass: 'app-bg-ocean',
      hand: '地理・歴史・公民を冒険で攻略 ✦',
      logo: 'assets/images/social-quest/logo.png?v=3',
      hero: 'assets/images/social-quest/units.png?v=3',
      detail: 'shakai-quest-privacy.html',
      ios: 'https://apps.apple.com/us/app/%E5%90%88%E6%A0%BC-%E7%A4%BE%E4%BC%9A%E3%82%AF%E3%82%A8%E3%82%B9%E3%83%88-%E4%B8%AD%E5%AD%A6%E5%8F%97%E9%A8%93%E3%81%AE%E5%9C%B0%E7%90%86%E6%AD%B4%E5%8F%B2%E5%85%AC%E6%B0%91/id6775411516',
      android: 'https://play.google.com/store/apps/details?id=com.gokakushakaiquest.app',
      intro: '地理・歴史・公民の重要単元を、4択クイズとイラスト解説で効率よく学習。苦手分析、偏差値、全国ランキングで、入試に必要な知識を楽しく積み上げます。',
      features: [
        '地理・歴史・公民の53単元を体系的にカバー',
        '4択クイズでスキマ時間にテンポよく知識を確認',
        '歴史の流れや地理のポイントをイラストで理解',
        '偏差値・苦手分析・全国ランキングで成長を実感'
      ],
      chips: ['53単元', '地理・歴史・公民', '4択クイズ', '全国ランキング'],
      shots: [
        ['assets/images/social-quest/quiz.png?v=3', '社会クエストの4択クイズ'],
        ['assets/images/social-quest/history.png?v=3', '社会クエストの歴史学習'],
        ['assets/images/social-quest/score.png?v=3', '社会クエストの偏差値画面'],
        ['assets/images/social-quest/ranking.png?v=3', '社会クエストのランキング画面']
      ]
    },
    kokugo: {
      id: 'kokugo-quest',
      navShort: '国語クエ',
      navTitle: '国語クエスト',
      title: '合格！国語クエスト',
      subTitle: '漢字・語彙・ことわざ・文法を、目と耳で楽しく定着',
      badge: 'JAPANESE QUEST',
      accent: '#FF8A7A',
      bgClass: 'app-bg-coral',
      hand: '国語の苦手を得意に変える ✦',
      logo: 'assets/images/kokugo-quest/kokugo-quest-logo.png',
      hero: 'assets/images/kokugo-quest/kokugo-quest-1.png',
      detail: 'kokugo-quest.html',
      ios: 'https://apps.apple.com/us/app/%E5%90%88%E6%A0%BC-%E5%9B%BD%E8%AA%9E%E3%82%AF%E3%82%A8%E3%82%B9%E3%83%88-%E4%B8%AD%E5%AD%A6%E5%8F%97%E9%A8%93%E5%9B%BD%E8%AA%9E-%E6%BC%A2%E5%AD%97-%E8%AA%9E%E5%BD%99-%E6%96%87%E6%B3%95-%E3%82%92%E7%B6%B2%E7%BE%85/id6780125916',
      android: 'https://play.google.com/store/apps/details?id=com.gokakukokugoquest.app',
      intro: '中学受験で差がつく漢字・語彙・ことわざ・慣用句・文法を、イラストと読み上げで楽しく学習。友達対戦やランキングで、毎日続けたくなる国語対策アプリです。',
      features: [
        '漢字・語彙・ことわざ・慣用句・文法を体系的に対策',
        'イラストで意味を理解し、読み上げで記憶に残す',
        '間違えた問題を復習して、苦手な知識を着実に克服',
        '友達対戦・世界ランキング・偏差値で楽しく競える'
      ],
      chips: ['漢字・語彙', 'ことわざ・慣用句', '読み上げ機能', '友達対戦'],
      shots: [
        ['assets/images/kokugo-quest/kokugo-quest-2.png', '国語クエストの問題画面'],
        ['assets/images/kokugo-quest/kokugo-quest-3.png', '国語クエストの解説画面'],
        ['assets/images/kokugo-quest/kokugo-quest-4.png', '国語クエストの学習画面'],
        ['assets/images/kokugo-quest/kokugo-quest-5.png', '国語クエストのランキング画面']
      ]
    }
  };

  const ORDER = [APPS.rika, APPS.shakai, APPS.kokugo];

  function injectStyle() {
    if (document.getElementById('school-quest-style')) return;
    const style = document.createElement('style');
    style.id = 'school-quest-style';
    style.textContent = `
      .school-quest-section { position: relative; overflow: hidden; }
      .school-quest-section::before { content:''; position:absolute; inset:0; background-image:radial-gradient(circle, rgba(31,46,77,.09) 1.4px, transparent 1.4px); background-size:28px 28px; pointer-events:none; }
      .quest-shell { position: relative; z-index: 1; }
      .quest-banner { display:grid; grid-template-columns:1fr; gap:1.25rem; align-items:stretch; padding:1rem; border:3px solid #1F2E4D; border-radius:28px; background:#fff; box-shadow:10px 10px 0 #1F2E4D; }
      @media (min-width: 1024px) { .quest-banner { grid-template-columns:minmax(0, 1.05fr) minmax(360px, .95fr); padding:1.25rem; } }
      .quest-visual { position:relative; min-height:280px; border:3px solid #1F2E4D; border-radius:23px; overflow:hidden; background:#FFFBF2; }
      @media (min-width: 768px) { .quest-visual { min-height:360px; } }
      .quest-visual img { width:100%; height:100%; object-fit:cover; display:block; }
      .quest-visual::after { content:''; position:absolute; inset:0; background:linear-gradient(180deg, rgba(31,46,77,0) 45%, rgba(31,46,77,.18) 100%); pointer-events:none; }
      .quest-content { padding:1rem .25rem .25rem; display:flex; flex-direction:column; min-width:0; }
      @media (min-width: 1024px) { .quest-content { padding:1.5rem 1.5rem 1rem; } }
      .quest-topline { display:flex; gap:.8rem; align-items:center; flex-wrap:wrap; margin-bottom:1rem; }
      .quest-logo { width:76px; height:76px; border:3px solid #1F2E4D; border-radius:22px; box-shadow:6px 6px 0 #1F2E4D; overflow:hidden; flex-shrink:0; background:#fff; transform:rotate(-3deg); }
      .quest-logo img { width:100%; height:100%; object-fit:cover; display:block; }
      .quest-badge { display:inline-flex; align-items:center; gap:.45rem; border:2px solid #1F2E4D; border-radius:999px; padding:.42rem .8rem; background:#fff; color:#1F2E4D; font-size:.72rem; font-weight:900; letter-spacing:.08em; box-shadow:3px 3px 0 #1F2E4D; }
      .quest-title { font-family:'Archivo Black','M PLUS Rounded 1c',sans-serif; font-size:clamp(2rem, 4.6vw, 4.5rem); line-height:.98; color:#1F2E4D; margin:.2rem 0 .55rem; letter-spacing:-.04em; }
      .quest-subtitle { font-weight:900; color:#1F2E4D; font-size:clamp(1rem, 1.6vw, 1.35rem); margin-bottom:.9rem; }
      .quest-intro { color:rgba(31,46,77,.76); line-height:1.85; font-weight:700; margin-bottom:1.25rem; }
      .quest-features { display:grid; gap:.65rem; margin:0 0 1.25rem; padding:0; list-style:none; }
      .quest-features li { display:flex; gap:.7rem; align-items:flex-start; color:rgba(31,46,77,.86); font-weight:800; line-height:1.55; }
      .quest-num { width:34px; height:34px; border:2.5px solid #1F2E4D; border-radius:10px; box-shadow:3px 3px 0 #1F2E4D; display:grid; place-items:center; flex-shrink:0; background:#fff; font-family:'Archivo Black',sans-serif; font-size:.75rem; }
      .quest-actions { display:flex; flex-wrap:wrap; gap:.8rem; margin:.25rem 0 1rem; }
      .quest-store-pill { box-shadow:5px 5px 0 var(--quest-accent, #FFD84D) !important; }
      .quest-store-pill:hover { box-shadow:7px 7px 0 var(--quest-accent, #FFD84D) !important; }
      .quest-store-pill.google { background:#fff !important; color:#1F2E4D !important; }
      .quest-store-pill.detail { background:#FFFBF2 !important; color:#1F2E4D !important; }
      .quest-chips { display:flex; flex-wrap:wrap; gap:.55rem; margin-top:auto; padding-top:.25rem; }
      .quest-chip { display:inline-flex; align-items:center; gap:.35rem; padding:.45rem .75rem; border:2px solid #1F2E4D; border-radius:999px; background:#fff; color:#1F2E4D; font-size:.78rem; font-weight:900; box-shadow:2px 2px 0 #1F2E4D; }
      .quest-shot-grid { display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:1rem; margin-top:1.25rem; }
      @media (min-width: 1024px) { .quest-shot-grid { grid-template-columns:repeat(4, minmax(0,1fr)); } }
      .quest-shot { border:3px solid #1F2E4D; border-radius:22px; box-shadow:7px 7px 0 #1F2E4D; overflow:hidden; background:#fff; transform:rotate(-1deg); transition:transform .25s ease, box-shadow .25s ease; }
      .quest-shot:nth-child(even) { transform:rotate(1deg); }
      .quest-shot:hover { transform:translate(-3px,-3px) rotate(0deg); box-shadow:10px 10px 0 #1F2E4D; }
      .quest-shot img { width:100%; height:auto; display:block; }
      .school-card-sub { display:block; margin-top:.25rem; color:rgba(31,46,77,.62); font-size:.78rem; font-weight:900; }
    `;
    document.head.appendChild(style);
  }

  function storeButtons(app) {
    return `
      <div class="quest-actions" style="--quest-accent:${app.accent}">
        <a href="${app.ios}" target="_blank" rel="noopener" class="store-pill quest-store-pill apple" aria-label="${app.title}をApp Storeで開く">
          <i class="ri-apple-fill text-xl"></i><span>App Store</span>
        </a>
        <a href="${app.android}" target="_blank" rel="noopener" class="store-pill quest-store-pill google" aria-label="${app.title}をGoogle Playで開く">
          <i class="ri-google-play-fill text-xl"></i><span>Google Play</span>
        </a>
        ${app.detail ? `<a href="${app.detail}" class="store-pill quest-store-pill detail"><i class="ri-external-link-line text-xl"></i><span>詳しく見る</span></a>` : ''}
      </div>
    `;
  }

  function buildSection(app, index) {
    const features = app.features.map((feature, i) => `
      <li><span class="quest-num" style="background:${app.accent}">${String(i + 1).padStart(2, '0')}</span><span>${feature}</span></li>
    `).join('');
    const chips = app.chips.map(chip => `<span class="quest-chip"><i class="ri-checkbox-circle-fill" style="color:${app.accent}"></i>${chip}</span>`).join('');
    const shots = app.shots.map(([src, alt]) => `<figure class="quest-shot"><img src="${src}" alt="${alt}" loading="lazy"></figure>`).join('');
    return `
      <section id="${app.id}" class="school-quest-section app-section-v2 ${app.bgClass} py-14 md:py-20">
        <div class="container mx-auto px-4 quest-shell">
          <div class="flex items-center justify-between gap-3 flex-wrap mb-5 fade-in-up visible">
            <div class="flex items-center gap-3 flex-wrap">
              <span class="app-progress-chip"><span>0${index + 1}</span><span class="line"></span><span>03</span></span>
              <span class="quest-badge"><i class="ri-graduation-cap-fill"></i>${app.badge}</span>
            </div>
            <span class="hand-font text-coral text-lg md:text-xl hidden md:inline">${app.hand}</span>
          </div>
          <div class="quest-banner fade-in-up visible">
            <div class="quest-visual">
              <img src="${app.hero}" alt="${app.title}の紹介画像" loading="lazy">
            </div>
            <div class="quest-content">
              <div class="quest-topline">
                <div class="quest-logo"><img src="${app.logo}" alt="${app.title} ロゴ" loading="lazy"></div>
                <div>
                  <span class="quest-badge" style="background:${app.accent}"><i class="ri-smartphone-fill"></i>iOS / Android 対応</span>
                  <span class="quest-badge"><i class="ri-price-tag-3-fill"></i>無料ダウンロード</span>
                </div>
              </div>
              <h2 class="quest-title">${app.title}</h2>
              <p class="quest-subtitle">${app.subTitle}</p>
              <p class="quest-intro">${app.intro}</p>
              <ul class="quest-features">${features}</ul>
              ${storeButtons(app)}
              <div class="quest-chips">${chips}</div>
            </div>
          </div>
          <div class="quest-shot-grid fade-in-up visible">${shots}</div>
        </div>
      </section>
    `;
  }

  function replaceSchoolSections() {
    const rika = document.getElementById('rika-quest');
    if (rika) rika.outerHTML = buildSection(APPS.rika, 0);

    const freshRika = document.getElementById('rika-quest');
    const existingSocial = document.getElementById('social-quest');
    if (existingSocial) existingSocial.outerHTML = buildSection(APPS.shakai, 1);
    else if (freshRika) freshRika.insertAdjacentHTML('afterend', buildSection(APPS.shakai, 1));

    const kokugo = document.getElementById('kokugo-quest');
    if (kokugo) kokugo.outerHTML = buildSection(APPS.kokugo, 2);
  }

  function updateNav() {
    const rikaNav = document.querySelector('.app-nav-premium a[href="#rika-quest"]');
    const kokugoNav = document.querySelector('.app-nav-premium a[href="#kokugo-quest"]');
    if (rikaNav) {
      rikaNav.innerHTML = `<span class="w-8 h-8 rounded-lg overflow-hidden shadow-md flex-shrink-0"><img src="${APPS.rika.logo}" class="w-full h-full object-cover" alt=""></span><span class="sm:hidden">${APPS.rika.navShort}</span><span class="hidden sm:inline">${APPS.rika.navTitle}</span>`;
    }
    if (!document.getElementById('social-quest-nav') && rikaNav) {
      rikaNav.insertAdjacentHTML('afterend', `<a id="social-quest-nav" href="#social-quest" class="app-nav-item flex items-center gap-2 px-3 py-2 sm:px-5 sm:py-2.5 rounded-xl text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all text-sm sm:text-base font-medium whitespace-nowrap group"><span class="w-8 h-8 rounded-lg overflow-hidden shadow-md flex-shrink-0"><img src="${APPS.shakai.logo}" class="w-full h-full object-cover" alt=""></span><span class="sm:hidden">${APPS.shakai.navShort}</span><span class="hidden sm:inline">${APPS.shakai.navTitle}</span></a>`);
    }
    if (kokugoNav) {
      kokugoNav.innerHTML = `<span class="w-8 h-8 rounded-lg overflow-hidden shadow-md flex-shrink-0"><img src="${APPS.kokugo.logo}" class="w-full h-full object-cover" alt=""></span><span class="sm:hidden">${APPS.kokugo.navShort}</span><span class="hidden sm:inline">${APPS.kokugo.navTitle}</span>`;
    }
  }

  function overviewCard(app) {
    return `<a id="${app.id}-card" href="#${app.id}" class="app-card p-4 sm:p-5 text-center group cursor-pointer"><div class="w-full aspect-square mx-auto mb-4 rounded-2xl border-2 border-navy overflow-hidden bg-white"><img src="${app.logo}" alt="${app.title} ロゴ" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy"></div><h3 class="font-display font-black text-navy mb-1 text-sm sm:text-base">${app.navTitle}</h3><span class="school-card-sub">iOS / Android</span></a>`;
  }

  function updateOverview() {
    const grid = document.querySelector('a[href="#rika-quest"]')?.closest('.grid');
    if (!grid) return;
    grid.className = grid.className.replace('lg:grid-cols-6', 'lg:grid-cols-3 xl:grid-cols-6');
    ORDER.forEach((app) => {
      const oldCard = grid.querySelector(`a[href="#${app.id}"]`);
      if (oldCard) oldCard.outerHTML = overviewCard(app);
    });
    const rikaCard = grid.querySelector('#rika-quest-card');
    if (rikaCard && !grid.querySelector('#social-quest-card')) {
      rikaCard.insertAdjacentHTML('afterend', overviewCard(APPS.shakai));
    }
    const title = document.querySelector('[data-i18n="apps.overview.title"]');
    if (title) title.textContent = 'All Apps';
    const desc = document.querySelector('[data-i18n="apps.overview.description"]');
    if (desc) desc.textContent = '中学受験アプリ3本を含む、TrailFusion AIの公開アプリ一覧';
  }

  function updateHeroAndFooter() {
    document.querySelectorAll('.premium-hero .font-accent, .premium-hero .sticker').forEach((node) => {
      const text = (node.textContent || '').trim();
      if (text === '6') node.textContent = '9';
      if (text === '6 APPS') node.textContent = '9 APPS';
    });
    document.querySelectorAll('.font-accent').forEach((node) => {
      if ((node.textContent || '').trim() === '6 APPS') node.textContent = '9 APPS';
    });
    const appFooterList = document.querySelector('footer a[href="rika-quest.html"]')?.closest('ul');
    if (appFooterList && !appFooterList.querySelector('a[href="apps.html#social-quest"]')) {
      const rikaItem = appFooterList.querySelector('a[href="rika-quest.html"]')?.closest('li');
      const html = '<li><a href="apps.html#social-quest" class="hover:text-ocean transition">社会クエスト</a></li>';
      if (rikaItem) rikaItem.insertAdjacentHTML('afterend', html);
      else appFooterList.insertAdjacentHTML('beforeend', html);
    }
  }

  injectStyle();
  updateNav();
  replaceSchoolSections();
  updateOverview();
  updateHeroAndFooter();
});
