'use strict';
/* Progressive enhancement only. No personal learning data leaves the finder. */
(() => {
  const header = document.querySelector('.tf-header');
  const measureHeader = () => { if (header) document.documentElement.style.setProperty('--tf-site-header-height', `${Math.ceil(header.getBoundingClientRect().height)}px`); };
  measureHeader();
  if (header && 'ResizeObserver' in window) new ResizeObserver(measureHeader).observe(header);
  window.addEventListener('resize', measureHeader, {passive:true});
  /* The standalone Quest hub is retired. On the homepage, every Quest entry opens the restored apps catalog directly. */
  if (location.pathname === '/' || location.pathname === '/index.html') {
    document.querySelectorAll('a[href="/quest/"],a[href="/quest.html"]').forEach(a => { a.href='/apps.html'; });
  }
  document.querySelectorAll('.tf-mobile-menu').forEach(menu => {
    menu.addEventListener('click', e => { if (e.target.closest('a')) menu.open=false; });
    document.addEventListener('keydown', e => { if (e.key==='Escape' && menu.open) { menu.open=false; menu.querySelector('summary').focus(); } });
    document.addEventListener('click', e => { if (!menu.contains(e.target)) menu.open=false; });
  });
  const emit = (name, properties) => { if (typeof window.gtag === 'function') window.gtag('event',name,properties); };
  document.addEventListener('click', event => {
    const a=event.target.closest('a[href]'); if (!a) return;
    if(a.dataset.store) emit('store_click',{app_id:a.dataset.app||'',store:a.dataset.store,placement:a.dataset.placement||'page',page_path:location.pathname});
    else if(a.dataset.hub) emit('hub_navigation',{hub:a.dataset.hub,placement:a.dataset.placement||'navigation',page_path:location.pathname});
    else if(a.dataset.app) emit('app_detail_click',{app_id:a.dataset.app,placement:a.dataset.placement||'card',page_path:location.pathname});
  });
  const filter=document.querySelector('[data-tf-filter]');
  if(filter) filter.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{
    const category=button.dataset.category;
    filter.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
    let count=0;
    document.querySelectorAll('[data-tf-filter-card]').forEach(card=>{card.hidden=category!=='all'&&card.dataset.category!==category;if(!card.hidden)count++;});
    const status=document.querySelector('[data-tf-filter-status]');if(status)status.textContent=`${count}件のアプリを表示しています。`;
  }));
  const finder=document.querySelector('#quest-finder');
  if(finder) finder.addEventListener('submit',event=>{
    event.preventDefault();
    const subject=finder.elements.subject.value, goal=finder.elements.goal.value;
    const options={rika:['合格！理科クエスト','/rika-quest.html','塾で学んだ単元を選び、問題と解説をセットで確認しましょう。'],social:['合格！社会クエスト','/social-quest.html','地理・歴史・公民から、今週学んだテーマを一つ選びましょう。'],kokugo:['合格！国語クエスト','/kokugo-quest.html','漢字や語彙を、意味と用例を確かめながら少しずつ増やしましょう。'],eigo:['合格！英語クエスト','/eigo-quest.html','英語・資格学習向けの内容と配信案内をご確認ください。中学受験の主要3教科とは別の学習領域です。']};
    const chosen=options[subject]||options.rika;
    const result=document.querySelector('#finder-result');
    result.querySelector('h2').textContent=chosen[0];
    result.querySelector('[data-result-text]').textContent=chosen[2]+(goal==='review'?' 正解数だけでなく、間違えた理由を一つ説明できることを目標に。':goal==='habit'?' 最初は短い時間で終えられる量から始め、続けやすい時間を決めてみましょう。':' わからない内容は解説で確認し、必要に応じて教科書や塾の教材へ戻りましょう。');
    const link=result.querySelector('a');link.href=chosen[1];link.textContent='このクエストを見る →';link.dataset.app=subject;
    result.hidden=false;result.focus({preventScroll:true});
    if(window.innerWidth<761)result.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});
    // Do not transmit the selected subject, goal, grade, answers or identifiers.
  });
  document.querySelectorAll('img[data-counter],.tf-preserved-counter img').forEach(img=>img.addEventListener('error',()=>{img.hidden=true;},{once:true}));
})();
