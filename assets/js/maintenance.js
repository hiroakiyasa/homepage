import {PARTS,CATEGORIES,SOURCES} from './maintenance-data.js';
import {CATALOG,LESSONS} from './maintenance-knowledge.js';

const $=id=>document.getElementById(id);
const KEY='trailfusion-hiace-maintenance-v1';
const escapeText=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let vehicle={name:'マイハイエース',engine:'1gd',drive:'4wd'},records=[],storageOK=true,category='all',selected='engine',stepIndex=0,playTimer=null,scene=null;
try{
  const saved=JSON.parse(localStorage.getItem(KEY)||'null');
  if(saved){
    if(saved.version!==1||!Array.isArray(saved.records))throw new Error('保存データの形式を確認できません');
    records=saved.records.filter(r=>r&&typeof r.id==='string'&&typeof r.vehicle==='string'&&PARTS.some(p=>p.id===r.part)&&/^\d{4}-\d{2}-\d{2}$/.test(r.date)&&Number.isFinite(r.km)&&r.km>=0&&typeof r.action==='string'&&typeof r.result==='string'&&typeof r.note==='string');
    if(saved.vehicle&&typeof saved.vehicle.name==='string'&&['1kd','1gd','gas'].includes(saved.vehicle.engine)&&['2wd','4wd'].includes(saved.vehicle.drive))vehicle=saved.vehicle;
    if(saved.modelRevision!==2)vehicle={...vehicle,drive:'4wd'};
  }
}catch(error){storageOK=false;$('save-status').textContent='保存領域または既存データを読み込めません。上書きを避けるため保存を停止しています。別のブラウザーでお試しください。';}
const available=()=>PARTS.filter(p=>p.variants.includes(vehicle.engine)&&(!p.drive||p.drive===vehicle.drive));
const vehicleKey=()=>JSON.stringify([vehicle.name,vehicle.engine,vehicle.drive]);
const vehicleRecords=()=>records.filter(r=>r.vehicle===vehicleKey()).sort((a,b)=>b.date.localeCompare(a.date)||(b.createdAt||'').localeCompare(a.createdAt||''));
const lastRecord=id=>vehicleRecords().find(r=>r.part===id);
function syncPinRecords(){document.querySelectorAll('[data-record-part-id]').forEach(b=>{const id=b.dataset.recordPartId,r=lastRecord(id);b.classList.toggle('has-record',Boolean(r));b.classList.toggle('needs-service',r?.result==='要整備');b.title=r?`${r.date} / ${r.km.toLocaleString()} km / ${r.action} / ${r.result}`:'整備記録：未記録';});}
const sourceLink=key=>`<a href="${SOURCES[key][1]}" target="_blank" rel="noopener noreferrer">${SOURCES[key][0]} ↗</a>`;
function persist(nextRecords=records,nextVehicle=vehicle){
  if(!storageOK)throw new Error('保存領域を使用できません。記録は保存されていません。');
  localStorage.setItem(KEY,JSON.stringify({version:1,modelRevision:2,vehicle:nextVehicle,records:nextRecords}));
}
function stopPlayback(){clearInterval(playTimer);playTimer=null;const b=$('play-steps');if(b)b.textContent='▶ 順に見る';document.querySelector('[data-scene-step="play"]').textContent='▶ 工程';}
function playSteps(){if(playTimer){stopPlayback();return;}setStep(0);$('scene-stepper').hidden=false;$('explore').scrollIntoView();$('play-steps').textContent='Ⅱ 一時停止';document.querySelector('[data-scene-step="play"]').textContent='Ⅱ 停止';playTimer=setInterval(()=>{if(stepIndex>=PARTS.find(p=>p.id===selected).steps.length-1){stopPlayback();return;}setStep(stepIndex+1);},4500);}
function renderCategories(){
  $('categories').innerHTML=Object.entries(CATEGORIES).map(([id,label])=>`<button data-category="${id}" aria-pressed="${category===id}">${label}</button>`).join('');
}
function renderList(){
  syncPinRecords();
  const q=$('part-search').value.trim().toLocaleLowerCase();
  const parts=available().filter(p=>(category==='all'||p.category===category)&&(!q||(p.name+p.description+p.symptoms).toLocaleLowerCase().includes(q)));
  $('result-count').textContent=`${parts.length} / ${available().length} パーツ · ${vehicle.name}`;
  $('part-list').innerHTML=parts.length?parts.map(p=>{const r=lastRecord(p.id);return `<button class="part-button" data-part="${p.id}" aria-pressed="${p.id===selected}"><span>${String(PARTS.indexOf(p)+1).padStart(2,'0')}</span><span class="part-label">${p.name}<small>${r?`${r.date} · ${escapeText(r.action)} · ${escapeText(r.result)}`:'未記録'}</small></span><span class="status-dot ${r?(r.result==='要整備'?'attention':'recorded'):''}"></span></button>`;}).join(''):'<p class="model-note">一致する部品がありません。別の語句やカテゴリーをお試しください。</p>';
}
function renderDetail(){
  const p=PARTS.find(p=>p.id===selected),r=lastRecord(selected);
  $('part-detail').innerHTML=`<header class="detail-header"><span class="eyebrow">${CATEGORIES[p.category]} / PART ${String(PARTS.indexOf(p)+1).padStart(2,'0')}</span><h3>${p.name}</h3><p>${p.description}</p><div class="detail-tags"><span class="${p.level==='整備工場'?'pro':''}">${p.level==='整備工場'?'専門整備 / 工程概要':p.level}</span><span>${p.view==='engine'?'座席下・前側':'床下・足回り'}</span><span>${p.variants.length===3?'共通（仕様差あり）':p.variants.length===1?(p.variants[0]==='gas'?'ガソリン・仕様確認':'1GD・装着車'):'ディーゼル・装着仕様を確認'}</span></div></header><div class="detail-body"><div class="detail-topline"><span>${r?`最終記録 ${r.date} / ${Number(r.km).toLocaleString()} km`:'この部品の整備記録は、まだありません。'}</span><button id="locate-part">3Dで位置を見る ↗</button></div><div class="symptom"><b>こんな変化に気づいたら</b>${p.symptoms}</div><div class="steps-title"><h4>${p.level==='整備工場'?'点検から整備までの流れ':'点検の進め方'}</h4><div class="step-controls"><button id="prev-step" aria-label="前の工程">←</button><button id="play-steps">▶ 順に見る</button><button id="next-step" aria-label="次の工程">→</button></div></div><ol class="steps">${p.steps.map(([title,text],i)=>`<li class="step ${i===stepIndex?'active':''}" data-step-row="${i}"><button data-step="${i}" aria-label="工程${i+1}：${title}" aria-current="${i===stepIndex?'step':'false'}">${i+1}</button><div><h5>${title}</h5><p>${text}</p></div></li>`).join('')}</ol><p class="caution">${p.caution}</p><div class="detail-reference"><div><p>年式別の公式資料で確認</p>${p.sources.map(sourceLink).join('')}</div></div><div class="detail-actions"><a href="#sources">出典・公式資料を見る ↗</a><a href="#journal" id="record-selected">この部品の整備を記録 ＋</a></div></div>`;
  updateStep();
  if(r)$('part-detail').querySelector('.detail-topline span').textContent=`${r.date} / ${r.km.toLocaleString()} km / ${r.action} / ${r.result}`;
}
function updateStep(){
  const p=PARTS.find(p=>p.id===selected);
  document.querySelectorAll('[data-step-row]').forEach(li=>{const active=Number(li.dataset.stepRow)===stepIndex;li.classList.toggle('active',active);li.querySelector('button').setAttribute('aria-current',active?'step':'false');});
  if($('prev-step'))$('prev-step').disabled=stepIndex===0;
  if($('next-step'))$('next-step').disabled=stepIndex===p.steps.length-1;
  $('preview-title').textContent=p.name;
  $('preview-text').textContent=`${String(stepIndex+1).padStart(2,'0')} / ${p.steps[stepIndex][0]} — ${p.steps[stepIndex][1]}`;
  $('preview-guide').hidden=false;
  $('scene-step-label').textContent=`${stepIndex+1} / 4　${p.steps[stepIndex][0]}`;
  document.querySelector('[data-scene-step="prev"]').disabled=stepIndex===0;
  document.querySelector('[data-scene-step="next"]').disabled=stepIndex===p.steps.length-1;
}
function choose(id,focus=true){
  if(!available().some(p=>p.id===id))return;
  stopPlayback();selected=id;stepIndex=0;renderList();renderDetail();$('record-part').value=id;scene?.select(id,focus);$('scene-stepper').hidden=false;
  if(['crank','cam','block','head','gasket','timing','oil-pump'].includes(id))setInternal(true);else if(scene&&$('engine-cutaway').getAttribute('aria-pressed')==='true')setInternal(false);
}
function setStep(i){stepIndex=Math.max(0,Math.min(PARTS.find(p=>p.id===selected).steps.length-1,i));updateStep();scene?.step(stepIndex);}
function renderHistory(){
  const list=vehicleRecords();$('record-count').textContent=list.length;
  $('record-history').innerHTML=list.length?list.map(r=>{const part=PARTS.find(p=>p.id===r.part);return `<article class="record-entry"><small>${escapeText(r.date)} / ${r.km.toLocaleString()} km</small><h3>${part.name}<span class="record-result">${escapeText(r.result)}</span></h3><p>${escapeText(r.action)}${r.note?' — '+escapeText(r.note):''}</p><small>${r.nextDate?'次回予定：'+escapeText(r.nextDate):'次回予定日：未設定'}${r.nextKm!==null&&r.nextKm!==undefined?' / '+Number(r.nextKm).toLocaleString()+' km':''}</small></article>`;}).join(''):'<div class="empty-records"><span>＋</span><h3>最初のひと手間から、<br>愛車の履歴がはじまります。</h3><p>まだ整備記録はありません。<br>点検した日と、気づいたことを残しましょう。</p></div>';
}
$('source-list').innerHTML=Object.entries(SOURCES).map(([,s])=>`<a href="${s[1]}" target="_blank" rel="noopener noreferrer"><span>${s[0]}</span><span>↗</span></a>`).join('');
$('vehicle-name').value=vehicle.name;$('engine-type').value=vehicle.engine;$('drive-type').value=vehicle.drive;
function refreshVehicle(){
  const list=available();if(!list.some(p=>p.id===selected))selected='engine';
  $('record-part').innerHTML=list.map(p=>`<option value="${p.id}">${p.name}</option>`).join('');
  renderCategories();renderList();renderHistory();renderDetail();$('record-part').value=selected;scene?.configure(list,vehicle.engine);
  renderCatalog();
}
function renderCatalog(){
 $('catalog-grid').innerHTML=CATALOG.map(([code,title,id,variant])=>{const compatible=available().some(p=>p.id===id);return `<button data-knowledge-part="${id}" class="catalog-card"><small>${code} / ${variant==='gas'?'ガソリン・仕様確認':variant==='diesel'?'ディーゼル':'共通・仕様差あり'}</small><strong>${title}</strong><span>${compatible?'役割と3Dを見る':'比較仕様に切替えて見る'} ↗</span></button>`;}).join('');
}
$('lesson-grid').innerHTML=LESSONS.map((l,i)=>`<article class="lesson-card"><h3>${l.title}</h3><p>${l.basic}</p><ol class="system-flow">${l.flow.map(s=>`<li>${s}</li>`).join('')}</ol><details><summary>もう一歩深く｜機構・専門知識</summary><p>${l.expert}</p></details><button data-lesson="${i}">この仕組みを3Dで見る ↗</button></article>`).join('');
document.querySelector('.vehicle-settings .model-note').textContent='初期表示は1GD・4WDの学習用代表構成です。車体は既存のワイド・ハイルーフ形状を利用し、年式・ボディ別寸法や全グレードの搭載位置を再現したものではありません。保存済みの整備記録は元の車両名・仕様のまま保持。旧版から初回表示時のみ4WDへ切り替え、2WD記録は仕様を戻すと参照できます。';
let motionRunning=!matchMedia('(prefers-reduced-motion: reduce)').matches;
function syncMotion(){ $('motion-toggle').setAttribute('aria-pressed',String(motionRunning));$('motion-toggle').textContent=motionRunning?'Ⅱ 回転を停止':'▶ 回転を再開'; }
syncMotion();
$('motion-toggle').addEventListener('click',()=>{motionRunning=!motionRunning;scene?.motion(motionRunning);syncMotion();});
$('motion-speed').addEventListener('input',()=>{const value=Number($('motion-speed').value);scene?.speed(value);$('motion-speed-label').textContent=value+'×';});
function setInternal(on){scene?.cutaway(on);$('engine-cutaway').setAttribute('aria-pressed',String(on));if(on){$('preview-title').textContent='往復から、回転へ。';$('preview-text').textContent='ピストンとコンロッドがクランクを回し、カムはその半分の速度で回転。外壁はワイヤー表示にして内部を見せています。';}}
$('engine-cutaway').addEventListener('click',()=>setInternal($('engine-cutaway').getAttribute('aria-pressed')!=='true'));
function exploreKnowledge(id){const p=PARTS.find(p=>p.id===id);if(!p)return;if(!available().some(a=>a.id===id)){vehicle={...vehicle,engine:p.variants[0],drive:p.drive||vehicle.drive};$('engine-type').value=vehicle.engine;$('drive-type').value=vehicle.drive;refreshVehicle();$('announcement').textContent='比較のため表示仕様を切り替えました。設定の保存は「この仕様で表示」から行えます。';}choose(id);if(['crank','cam','block','head','gasket','timing','oil-pump'].includes(id))setInternal(true);$('explore').scrollIntoView();}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.knowledgePart)exploreKnowledge(b.dataset.knowledgePart);if(b.dataset.lesson!==undefined){const l=LESSONS[Number(b.dataset.lesson)];exploreKnowledge(l.focus);if(l.focus==='transfer'){scene?.power(true);$('power-flow').setAttribute('aria-pressed','true');}}});
refreshVehicle();
const today=new Date();$('record-date').value=[today.getFullYear(),String(today.getMonth()+1).padStart(2,'0'),String(today.getDate()).padStart(2,'0')].join('-');
$('record-date').max=$('record-date').value;
document.addEventListener('click',e=>{
  const b=e.target.closest('button,a');if(!b)return;
  if(b.dataset.category){category=b.dataset.category;renderCategories();renderList();}
  if(b.dataset.part)choose(b.dataset.part);
  if(b.dataset.view){stopPlayback();setInternal(false);scene?.setView(b.dataset.view);$('rotate').setAttribute('aria-pressed','false');}
  if(b.dataset.step!==undefined){stopPlayback();setStep(Number(b.dataset.step));}
  if(b.id==='locate-part'){scene?.select(selected);$('explore').scrollIntoView();}
  if(b.id==='record-selected')$('record-part').value=selected;
  if(b.id==='prev-step'){stopPlayback();setStep(stepIndex-1);}
  if(b.id==='next-step'){stopPlayback();setStep(stepIndex+1);}
  if(b.id==='play-steps'||b.dataset.sceneStep==='play')playSteps();
  if(b.dataset.sceneStep==='prev'){stopPlayback();setStep(stepIndex-1);}
  if(b.dataset.sceneStep==='next'){stopPlayback();setStep(stepIndex+1);}
});
$('part-search').addEventListener('input',renderList);
$('apply-vehicle').addEventListener('click',()=>{
  const next={name:$('vehicle-name').value.trim()||'マイハイエース',engine:$('engine-type').value,drive:$('drive-type').value};
  stopPlayback();vehicle=next;refreshVehicle();scene?.select(selected,false);
  try{persist();$('save-status').textContent='車両の仕様を保存しました。';}catch(error){$('save-status').textContent='表示は切り替えましたが、設定は保存できませんでした。'+error.message;}
});
$('record-form').addEventListener('submit',e=>{
  e.preventDefault();if(!$('record-form').reportValidity())return;
  const date=$('record-date').value,km=Number($('record-km').value),nextDate=$('record-next-date').value,nextKm=$('record-next-km').value===''?null:Number($('record-next-km').value);
  if((nextDate&&nextDate<date)||(nextKm!==null&&nextKm<km)){$('save-status').textContent='次回予定は実施日・実施距離以降を入力してください。';return;}
  const entry={id:crypto.randomUUID(),vehicle:vehicleKey(),part:$('record-part').value,date,km,action:$('record-action').value,result:$('record-result').value,note:$('record-note').value.trim(),nextDate,nextKm,createdAt:new Date().toISOString()};
  const next=[...records,entry];
  try{persist(next);records=next;renderHistory();renderList();renderDetail();$('save-status').textContent=`${vehicle.name}の整備記録を保存しました。`;$('record-note').value='';$('record-next-date').value='';$('record-next-km').value='';}catch(error){$('save-status').textContent='保存できませんでした。入力内容は残しています。'+error.message;}
});
$('export-records').addEventListener('click',()=>{
  const blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),vehicle,records},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='hiace-maintenance-records.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
$('preview-guide').addEventListener('click',()=>$('guide').scrollIntoView());
$('start-explore').addEventListener('click',()=>{choose('engine',false);scene?.setView('engine');});
$('reset-view').addEventListener('click',()=>{setInternal(false);scene?.reset();$('rotate').setAttribute('aria-pressed','false');});
$('all-pins').addEventListener('click',()=>{const on=$('all-pins').getAttribute('aria-pressed')!=='true';if(on)setInternal(false);scene?.showAllPins(on);$('all-pins').setAttribute('aria-pressed',String(on));});
$('power-flow').addEventListener('click',()=>{const on=$('power-flow').getAttribute('aria-pressed')!=='true';if(on)setInternal(false);scene?.power(on);$('power-flow').setAttribute('aria-pressed',String(on));});
$('rotate').addEventListener('click',()=>{const on=$('rotate').getAttribute('aria-pressed')!=='true';scene?.rotate(on);$('rotate').setAttribute('aria-pressed',String(on));});
$('fullscreen').addEventListener('click',async()=>{
  try{if(document.fullscreenElement)await document.exitFullscreen();else if($('explore').requestFullscreen)await $('explore').requestFullscreen();else $('announcement').textContent='このブラウザーは全画面表示に対応していません。';}catch{$('announcement').textContent='全画面表示を開始できませんでした。';}
});
$('retry').addEventListener('click',()=>location.reload());
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopPlayback();});
// The guide and record form stay usable without WebGL; no photo fallback.
const controls=[...document.querySelectorAll('[data-view]'),$('start-explore'),$('rotate'),$('reset-view'),$('all-pins'),$('power-flow'),$('motion-toggle'),$('motion-speed'),$('engine-cutaway')];controls.forEach(b=>b.disabled=true);
try{
  const {createScene}=await import('./maintenance-scene.js');
  scene=await createScene($('vehicle'),PARTS,id=>choose(id,false));
  scene.configure(available(),vehicle.engine);scene.select(selected,false);
  Object.defineProperty(window,'hiaceDiagnostics',{value:()=>scene.getState(),writable:false});
  syncPinRecords();
  $('loading').hidden=true;controls.forEach(b=>b.disabled=false);
  document.documentElement.dataset.sceneReady='true';
}catch(error){
  console.error('3D initialization failed:',error);$('loading').hidden=true;$('fallback').hidden=false;$('vehicle').hidden=true;$('hotspots').hidden=true;
  document.documentElement.dataset.sceneReady='fallback';
}
