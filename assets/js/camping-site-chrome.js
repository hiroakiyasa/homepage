/* TrailFusion camping site chrome.
 * Source: camping.html, blob 91a09582c6ebc1450cdfc2addac9361dbd258bd7.
 * The full original header/footer live in isolated style scopes, not inside the 3D canvas.
 * Safe to load only on Hiace Studio pages. The model and its animation code are untouched.
 */
(() => {
  'use strict';
  if (!document.getElementById('hiace-atelier') || document.querySelector('tf-camping-header')) return;
  const local = location.protocol === 'file:';
  const base = new URL(local ? 'https://trailfusionai.com/' : './', document.baseURI);
  const url = path => new URL(path, base).href;
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const oldHeader = document.querySelector('body > .site-header');
  const oldFooter = document.querySelector('body > .site-footer');
  if (!oldHeader || !oldFooter) return;

  const HEADER = `<header class="sticky top-0 z-50 bg-cream/95 backdrop-blur-md border-b-[3px] border-navy">
  <div class="container mx-auto px-4 py-3"><div class="flex items-center justify-between">
    <a href="index.html" class="flex items-center gap-3 group"><div class="relative">
      <img src="assets/images/b295aa9fa2c904bc29a0e5e438249d00.jpg" alt="TrailFusion AI" class="h-10 rounded-xl border-2 border-navy group-hover:rotate-[-6deg] transition-transform duration-300">
      <span class="absolute -top-1 -right-1 w-3 h-3 bg-coral rounded-full border-2 border-navy"></span>
    </div><div><div class="font-display font-black text-navy text-base sm:text-lg leading-none">TrailFusion</div><div class="font-accent text-[10px] text-coral tracking-widest">×AI ADVENTURE</div></div></a>
    <nav class="hidden lg:flex items-center gap-6 xl:gap-8" aria-label="メインナビゲーション">
      <a href="index.html" class="nav-item text-navy">ホーム</a>
      <a href="camping.html" class="nav-item text-navy" aria-current="page">キャンピングカー</a>
      <a href="drive-routes/" class="nav-item text-navy">ドライブルート</a>
      <a href="apps.html" class="nav-item text-navy">AIアプリ</a>
      <a href="maintenance.html" class="nav-item text-navy">整備記録</a>
    </nav>
    <div class="flex items-center gap-2 sm:gap-3">
      <a href="#roadmap" class="hidden lg:inline-flex btn-chunky btn-chunky-coral text-sm"><i class="ri-road-map-line" aria-hidden="true"></i>ロードマップを見る</a>
      <a href="index.html" class="mobile-pill bg-sky lg:hidden" aria-label="ホーム"><i class="ri-home-smile-line" aria-hidden="true"></i><span class="hidden sm:inline">ホーム</span></a>
      <a href="apps.html" class="mobile-pill bg-peach lg:hidden" aria-label="AIアプリ"><i class="ri-apps-2-line" aria-hidden="true"></i><span class="hidden sm:inline">アプリ</span></a>
      <button id="mobile-toggle" class="lg:hidden w-10 h-10 grid place-items-center bg-sun border-2 border-navy rounded-xl" aria-label="メニューを開く" aria-controls="mobile-menu" aria-expanded="false"><i class="ri-menu-line text-xl" aria-hidden="true"></i></button>
    </div>
  </div>
  <nav id="mobile-menu" class="hidden lg:hidden pt-4 pb-2" aria-label="モバイルナビゲーション"><div class="grid grid-cols-2 gap-2">
    <a href="index.html" class="p-3 text-center rounded-xl bg-white border-2 border-navy font-bold">🏠 ホーム</a>
    <a href="camping.html" class="p-3 text-center rounded-xl bg-sky border-2 border-navy font-bold" aria-current="page">🚐 キャンパー</a>
    <a href="drive-routes/" class="p-3 text-center rounded-xl bg-ocean border-2 border-navy font-bold">🗺️ ドライブルート</a>
    <a href="apps.html" class="p-3 text-center rounded-xl bg-peach border-2 border-navy font-bold">✨ AIアプリ</a>
    <a href="maintenance.html" class="p-3 text-center rounded-xl bg-grass border-2 border-navy font-bold">🔧 整備記録</a>
    <a href="#roadmap" class="p-3 text-center rounded-xl bg-coral text-white border-2 border-navy font-bold col-span-2">🧭 ロードマップ</a>
  </div></nav></div></header>`;

  const FOOTER = `<footer class="bg-cream border-t-[3px] border-navy py-12">
  <div class="container mx-auto px-4"><div class="grid md:grid-cols-3 gap-8 mb-8">
    <div><a href="index.html" class="flex items-center gap-3 mb-3"><img src="assets/images/b295aa9fa2c904bc29a0e5e438249d00.jpg" alt="TrailFusion AI" class="h-10 rounded-xl border-2 border-navy"><div><div class="font-display font-black text-navy text-lg leading-none">TrailFusion</div><div class="font-accent text-[10px] text-coral tracking-widest">×AI ADVENTURE</div></div></a>
      <p class="text-sm text-navy/70 leading-relaxed">キャンピングカーDIYとAIアプリ開発で、「やりたいことを今やる」を叶える。</p></div>
    <div><div class="font-black text-navy mb-3">章を読み返す</div><ul class="text-sm text-navy/75 space-y-1.5">
      <li><a href="#why" class="hover:text-coral">01. はじまりの章</a></li>
      <li><a href="#layouts" class="hover:text-coral">02. 用途別レイアウト6選</a></li>
      <li><a href="#base-car" class="hover:text-coral">03. ベース車両を選ぶ</a></li>
      <li><a href="#foundation" class="hover:text-coral">04. 基礎工事</a></li>
      <li><a href="#interior" class="hover:text-coral">05. 内装仕上げ</a></li>
      <li><a href="#galley" class="hover:text-coral">06. 家具・ギャレー</a></li>
      <li><a href="#electrical" class="hover:text-coral">07. サブバッテリー・電装</a></li>
      <li><a href="#ff-heater" class="hover:text-coral">＋ FFヒーター後付け</a></li>
      <li><a href="#roof-ac" class="hover:text-coral">＋ ルーフエアコン後付け</a></li>
      <li><a href="#registration" class="hover:text-coral">08. 8ナンバー構造変更</a></li>
      <li><a href="#costs" class="hover:text-coral">09. 費用と失敗の総まとめ</a></li>
    </ul></div>
    <div><div class="font-black text-navy mb-3">ほかのページ</div><ul class="text-sm text-navy/75 space-y-1.5">
      <li><a href="index.html" class="hover:text-coral">🏠 ホーム</a></li>
      <li><a href="drive-routes/" class="hover:text-coral">🗺️ ドライブルート</a></li>
      <li><a href="apps.html" class="hover:text-coral">✨ AIアプリ</a></li>
      <li><a href="maintenance.html" class="hover:text-coral">🔧 整備記録</a></li>
    </ul></div>
  </div><div class="pt-6 border-t-2 border-navy/20 text-center text-sm text-navy/60">© <span id="year"></span> TrailFusion AI — すべての挑戦者へ。</div></div></footer>
  <button id="scrollToTop" aria-label="ページ上部へ"><i class="ri-arrow-up-line" aria-hidden="true"></i></button>`;

  // Critical styling prevents unstyled menus before the same original site CSS arrives.
  const CRITICAL = `:host{display:block;color:#1F2E4D;font:400 16px/1.5 'M PLUS Rounded 1c','Hiragino Kaku Gothic ProN','Yu Gothic',sans-serif}*{box-sizing:border-box}a{color:inherit;text-decoration:none}button{font:inherit;color:inherit;cursor:pointer}img{display:block;max-width:100%}ul,p{margin:0}ul{padding:0;list-style:none}a:focus-visible,button:focus-visible{outline:3px solid #1273e6;outline-offset:4px}.container{width:100%}.mx-auto{margin-left:auto;margin-right:auto}.px-4{padding-left:16px;padding-right:16px}.py-3{padding-top:12px;padding-bottom:12px}.py-12{padding-top:48px;padding-bottom:48px}.flex{display:flex}.grid{display:grid}.items-center{align-items:center}.justify-between{justify-content:space-between}.gap-2{gap:8px}.gap-3{gap:12px}.gap-6{gap:24px}.gap-8{gap:32px}.grid-cols-2{grid-template-columns:repeat(2,minmax(0,1fr))}.col-span-2{grid-column:span 2}.place-items-center{place-items:center}.relative{position:relative}.absolute{position:absolute}.h-10{height:40px;width:40px;object-fit:cover}.w-10{width:40px}.h-3{height:12px}.w-3{width:12px}.rounded-xl{border-radius:12px}.rounded-full{border-radius:9999px}.border-2{border:2px solid #1F2E4D}.border-navy{border-color:#1F2E4D}.border-b-\\[3px\\]{border-bottom:3px solid #1F2E4D}.border-t-\\[3px\\]{border-top:3px solid #1F2E4D}.border-t-2{border-top:2px solid}.border-navy\\/20{border-color:rgb(31 46 77 / .2)}.bg-cream{background:#FFFBF2}.bg-cream\\/95{background:rgb(255 251 242 / .95);backdrop-filter:blur(12px)}.bg-white{background:white}.bg-sky{background:#A5E3F5}.bg-peach{background:#FFB3BA}.bg-ocean{background:#4ECDC4}.bg-grass{background:#7DD87A}.bg-coral{background:#FF6B5B}.bg-sun{background:#FFD84D}.text-white{color:white}.text-navy{color:#1F2E4D}.text-coral{color:#FF6B5B}.text-navy\\/70{color:rgb(31 46 77 / .7)}.text-navy\\/75{color:rgb(31 46 77 / .75)}.text-navy\\/60{color:rgb(31 46 77 / .6)}.font-display{font-family:'M PLUS Rounded 1c',sans-serif}.font-accent{font-family:'Archivo Black',sans-serif}.font-black{font-weight:900}.font-bold{font-weight:700}.text-base{font-size:16px}.text-lg{font-size:18px}.text-xl{font-size:20px}.text-sm{font-size:14px}.text-\\[10px\\]{font-size:10px}.leading-none{line-height:1}.leading-relaxed{line-height:1.625}.tracking-widest{letter-spacing:.1em}.text-center{text-align:center}.mb-3{margin-bottom:12px}.mb-8{margin-bottom:32px}.pt-4{padding-top:16px}.pb-2{padding-bottom:8px}.pt-6{padding-top:24px}.p-3{padding:12px}.space-y-1\\.5>:not([hidden])~:not([hidden]){margin-top:6px}.-top-1{top:-4px}.-right-1{right:-4px}.hover\\:text-coral:hover{color:#FF6B5B}.nav-item{padding:.5rem 0;font-weight:700;position:relative;white-space:nowrap;transition:color .2s}.nav-item::after{content:"";position:absolute;left:0;bottom:-4px;width:0;height:3px;background:#FFD84D;border-radius:2px;transition:width .25s}.nav-item:hover::after,.nav-item[aria-current=page]::after{width:100%}.nav-item[aria-current=page]{color:#FF6B5B}.btn-chunky{display:inline-flex;align-items:center;gap:.5rem;padding:.9rem 1.6rem;border:3px solid #1F2E4D;border-radius:999px;font-weight:800;box-shadow:5px 5px 0 #1F2E4D;transition:transform .18s,box-shadow .18s;white-space:nowrap}.btn-chunky-coral{background:#FF6B5B;color:white}.btn-chunky:hover{transform:translate(-2px,-2px);box-shadow:7px 7px 0 #1F2E4D}.mobile-pill{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:8px 10px;border:2px solid #1F2E4D;border-radius:999px;min-width:38px;min-height:40px;font-size:.8rem;font-weight:800}.hidden{display:none!important}#scrollToTop{position:fixed;right:22px;bottom:22px;width:48px;height:48px;display:grid;place-items:center;background:#FFD84D;color:#1F2E4D;border:3px solid #1F2E4D;border-radius:50%;box-shadow:4px 4px 0 #1F2E4D;opacity:0;visibility:hidden;transform:translateY(8px);transition:opacity .2s,transform .2s;z-index:40;font-size:22px}#scrollToTop.show{opacity:1;visibility:visible;transform:none}@media(min-width:640px){.container{max-width:640px}.sm\\:inline{display:inline!important}.sm\\:text-lg{font-size:18px}.sm\\:gap-3{gap:12px}}@media(min-width:768px){.container{max-width:768px}.md\\:grid-cols-3{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(min-width:1024px){.container{max-width:1024px}.lg\\:hidden{display:none!important}.lg\\:flex{display:flex!important}.lg\\:inline-flex{display:inline-flex!important}}@media(min-width:1280px){.container{max-width:1280px}.xl\\:gap-8{gap:32px}}@media(min-width:1536px){.container{max-width:1536px}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important}}`;

  const addGlobalSheet = (key, href) => {
    if (document.querySelector(`link[data-tf-sheet="${key}"]`)) return;
    const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = href;
    link.dataset.tfSheet = key; document.head.appendChild(link);
  };
  addGlobalSheet('fonts', 'https://fonts.googleapis.com/css2?family=Archivo+Black&family=M+PLUS+Rounded+1c:wght@400;500;700;800;900&display=swap');
  addGlobalSheet('icons', 'https://cdnjs.cloudflare.com/ajax/libs/remixicon/4.6.0/remixicon.min.css');

  function mount(tag, original, markup) {
    const host = document.createElement(tag), shadow = host.attachShadow({mode:'open'});
    shadow.innerHTML = `<style>${CRITICAL}</style><link rel="stylesheet" href="${url('assets/css/tailwind-compiled.css?v=20260419')}"><link rel="stylesheet" href="${url('assets/css/trailfusion.css?v=20260419')}"><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/remixicon/4.6.0/remixicon.min.css"><style>.hidden{display:none!important}@media(min-width:1024px){.lg\\:hidden{display:none!important}.lg\\:flex{display:flex!important}.lg\\:inline-flex{display:inline-flex!important}}</style>${markup}`;
    shadow.querySelectorAll('a[href]').forEach(a => {
      if (!a.getAttribute('href').startsWith('#')) a.href = url(a.getAttribute('href'));
    });
    shadow.querySelectorAll('img[src]').forEach(img => {img.src=url(img.getAttribute('src'));img.decoding='async';});
    original.replaceWith(host); return {host,shadow};
  }
  const header = mount('tf-camping-header', oldHeader, HEADER);
  const footer = mount('tf-camping-footer', oldFooter, FOOTER);
  header.host.style.cssText = 'display:block;position:sticky;top:0;z-index:60;background:#fffbf2';
  footer.shadow.getElementById('year').textContent = new Date().getFullYear();

  const toggle = header.shadow.getElementById('mobile-toggle'), menu = header.shadow.getElementById('mobile-menu');
  function setMenu(open, returnFocus=false) {
    menu.classList.toggle('hidden', !open); toggle.setAttribute('aria-expanded',String(open));
    toggle.setAttribute('aria-label',open?'メニューを閉じる':'メニューを開く');
    toggle.querySelector('i').className = open?'ri-close-line text-xl':'ri-menu-line text-xl';
    if(returnFocus)toggle.focus();
  }
  toggle.addEventListener('click',()=>setMenu(menu.classList.contains('hidden')));
  header.shadow.addEventListener('keydown',e=>{if(e.key==='Escape'&&!menu.classList.contains('hidden')){e.preventDefault();setMenu(false,true);}});
  document.addEventListener('click',e=>{if(!e.composedPath().includes(header.host))setMenu(false);});
  matchMedia('(min-width:1024px)').addEventListener('change',e=>{if(e.matches)setMenu(false);});

  const summary = {electrical:'power',registration:'registration',foundation:'foundation',interior:'foundation',galley:'furniture','ff-heater':'climate','roof-ac':'climate',costs:'budget'};
  function scrollToElement(el) {
    if(!el)return;
    const y=el.getBoundingClientRect().top+scrollY-header.host.getBoundingClientRect().height-12;
    window.scrollTo({top:Math.max(0,y),behavior:reduce()?'auto':'smooth'});
  }
  function selectSummary(id) {
    const button=document.querySelector(`[data-summary="${id}"]`);
    if(button){button.click();return true;}
    const select=document.getElementById('more-summary');
    if(select && [...select.options].some(o=>o.value===id)){select.value=id;select.dispatchEvent(new Event('change',{bubbles:true}));return true;}
    return false;
  }
  function navigate(hash) {
    const id=hash.replace(/^#/,'');setMenu(false);
    const api=window.hiaceAtelier;
    if(id==='roadmap'&&api?.snapshot().ready){api.setStep(0);scrollToElement(document.getElementById('hiace-atelier'));return true;}
    if(id==='layouts'&&api?.snapshot().ready){api.setMode('explore');scrollToElement(document.getElementById('layout-picker'));return true;}
    if(summary[id]&&selectSummary(summary[id])){scrollToElement(document.getElementById('detail'));return true;}
    if(id==='real-life'&&selectSummary('media')){scrollToElement(document.getElementById('detail'));return true;}
    // These original chapters were not retained as long sections in the compact studio.
    // The original guide is preserved byte-for-byte alongside the studio before publishing it.
    if(['why','base-car'].includes(id)){location.href=url('camping-guide.html'+hash);return true;}
    if(id==='roadmap'){scrollToElement(document.getElementById('hiace-atelier'));return true;}
    return false;
  }
  for(const root of [header.shadow,footer.shadow]) root.addEventListener('click',e=>{
    const a=e.target.closest('a[href^="#"]'); if(!a||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;
    if(navigate(a.getAttribute('href')))e.preventDefault();
  });
  const top = footer.shadow.getElementById('scrollToTop');
  const showTop=()=>top.classList.toggle('show',scrollY>400);
  addEventListener('scroll',showTop,{passive:true});showTop();
  top.addEventListener('click',()=>window.scrollTo({top:0,behavior:reduce()?'auto':'smooth'}));
  const styles=document.createElement('style');styles.dataset.tfSiteChrome='true';
  styles.textContent=`#hiace-atelier .hero-stage{height:calc(100svh - var(--tf-site-header-height,85px) - 168px)}#hiace-atelier.expanded{z-index:80}#hiace-atelier.expanded .hero-stage{height:calc(100svh - 163px)}@media(max-width:767px){#hiace-atelier .hero-stage{height:calc(100svh - var(--tf-site-header-height,67px) - 155px)}#hiace-atelier.expanded .hero-stage{height:calc(100svh - 155px)}}`;
  document.head.appendChild(styles);
  const measure=()=>document.documentElement.style.setProperty('--tf-site-header-height',`${header.host.getBoundingClientRect().height}px`);
  new ResizeObserver(measure).observe(header.host);measure();
  window.TrailFusionCampingChrome={version:'1.0.0',sourceBlob:'91a09582c6ebc1450cdfc2addac9361dbd258bd7',header:header.host,footer:footer.host,navigate};
})();
