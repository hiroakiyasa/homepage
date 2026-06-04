document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('social-quest')) return;
  const ver = '2';
  const keys = ['logo','history','score','units','quiz','ranking'];
  const img = {};
  for (const k of keys) img[k] = 'assets/images/social-quest/' + k + '.png?v=' + ver;
  const logo = img.logo;
  const style = document.createElement('style');
  style.textContent = '#social-quest .sq-panel{border:3px solid #1F2E4D;border-radius:26px;background:#fff;box-shadow:8px 8px 0 #1F2E4D;overflow:hidden}#social-quest .sq-img{border:3px solid #1F2E4D;border-radius:18px;background:#fff;box-shadow:6px 6px 0 #1F2E4D;overflow:hidden}#social-quest .sq-img img{width:100%;height:auto;display:block}';
  document.head.appendChild(style);
  const nav = document.querySelector('.app-nav-premium .flex');
  if (nav && !document.getElementById('social-quest-nav')) nav.insertAdjacentHTML('beforeend', '<a id="social-quest-nav" href="#social-quest" class="app-nav-item flex items-center gap-2 px-3 py-2 sm:px-5 sm:py-2.5 rounded-xl text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all text-sm sm:text-base font-medium whitespace-nowrap group"><span class="w-8 h-8 flex items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-yellow-400 text-white shadow-md"><i class="ri-earth-line text-sm"></i></span><span>社会クエスト</span></a>');
  const grid = Array.from(document.querySelectorAll('.grid')).find(g => g.querySelector('a[href="#rika-quest"]'));
  if (grid && !document.getElementById('social-quest-card')) {
    grid.className = grid.className.replace('lg:grid-cols-6', 'lg:grid-cols-4');
    grid.insertAdjacentHTML('beforeend', `<a id="social-quest-card" href="#social-quest" class="app-card p-4 sm:p-5 text-center group cursor-pointer"><div class="w-full aspect-square mx-auto mb-4 rounded-2xl border-2 border-navy overflow-hidden bg-sky"><img src="${logo}" alt="社会クエスト" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy"></div><h3 class="font-display font-black text-navy mb-1 text-sm sm:text-base">社会クエスト</h3><p class="text-xs sm:text-sm text-navy/60 font-bold">Social Studies Quest</p></a>`);
  }
  const rika = document.getElementById('rika-quest');
  if (!rika) return;
  const shots = [['units','中学入試社会 53単元を網羅'],['quiz','4択クイズで楽しく身につく'],['history','歴史の流れがスッとわかる'],['score','偏差値で成長を実感'],['ranking','全国ランキングで挑戦']].map(([k,t]) => `<figure class="sq-img"><img src="${img[k]}" alt="${t}" loading="lazy"></figure>`).join('');
  rika.insertAdjacentHTML('afterend', `<section id="social-quest" class="app-section-v2 py-14 md:py-20" style="background:linear-gradient(180deg,#EAF6FF 0%,#FFFBF2 100%)"><div class="container mx-auto px-4"><div class="sq-panel p-6 md:p-8 mb-8"><div class="flex items-center gap-4 mb-5"><div class="app-icon-tile"><img src="${logo}" alt="社会クエスト ロゴ"></div><div><h2 class="display-xl text-3xl md:text-5xl text-navy">社会クエスト</h2><p class="font-bold text-navy/70">中学入試社会を、楽しくまるごと対策</p></div></div><p class="text-navy/75 leading-relaxed">地理・歴史・公民の53単元を、イラスト解説と4択クイズで学べます。偏差値・苦手分析・全国ランキングで成長がひと目でわかります。</p></div><div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-5">${shots}</div></div></section>`);
  document.querySelectorAll('.font-accent').forEach(n => { if ((n.textContent || '').trim() === '6 APPS') n.textContent = '8 APPS'; });
});
