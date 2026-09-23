#!/usr/bin/env node
// Generate the /car-concierge/parking/ landing pages from data/parking-areas/areas.json.
//
// Legal constraint: pages show area-level aggregates only. Never render individual parking
// names, rate tables or rate wording here (the rate data is partly third-party sourced).
//
// Usage: node scripts/parking-areas/build-pages.mjs

import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DOMAIN = 'https://trailfusionai.com';
const BASE_PATH = '/car-concierge/parking/';
const OUT_DIR = join(ROOT, 'car-concierge', 'parking');
const APP_STORE_URL = 'https://apps.apple.com/jp/app/id6751795223';
const APP_ID = '6751795223';
const OG_IMAGE = `${DOMAIN}/assets/og/site-v2-travel.jpg`;
const HOUR_LABELS = ['〜200円', '201〜300円', '301〜400円', '401〜600円', '601円〜'];
const NEARBY_LIMIT = 12;

const data = JSON.parse(readFileSync(join(ROOT, 'data', 'parking-areas', 'areas.json'), 'utf8'));
const { areas, prefectures, national, generatedAt } = data;

// ---- Formatting ------------------------------------------------------------------------------

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const yen = (v) => (v == null ? '—' : `${v.toLocaleString('ja-JP')}円`);
const num = (v) => (v ?? 0).toLocaleString('ja-JP');
const pctText = (v) => (v == null ? '—' : `${Math.round(v)}%`);
const dateJa = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${y}年${m}月${d}日`;
};

const prefByCode = new Map(prefectures.map((p) => [p.prefCode, p]));
const nameCount = areas.reduce((m, a) => m.set(a.name, (m.get(a.name) ?? 0) + 1), new Map());
// Same municipality name in two prefectures (e.g. 府中市) and Tokyo's special wards (中央区 etc.)
// get the prefecture prefix.
const displayName = (a) =>
  nameCount.get(a.name) > 1 || (!a.parentCity && a.name.endsWith('区')) ? `${a.pref}${a.name}` : a.name;
const areaPath = (a) => `${BASE_PATH}${a.prefSlug}/${a.code}/`;
const prefPath = (p) => `${BASE_PATH}${p.prefSlug}/`;

// ---- Shared chrome (header/footer come from the site-v2 travel hub page) -----------------------

const travelHtml = readFileSync(join(ROOT, 'travel', 'index.html'), 'utf8');
const slice = (html, open, close) => {
  const start = html.indexOf(open);
  const end = html.indexOf(close, start);
  if (start < 0 || end < 0) throw new Error(`missing ${open} in travel/index.html`);
  return html.slice(start, end + close.length);
};
const HEADER = slice(travelHtml, '<header class="tf-header">', '</header>');
const FOOTER = slice(travelHtml, '<footer class="tf-footer">', '</footer>');

function page({ path, title, description, jsonLd, body }) {
  const url = DOMAIN + path;
  return `<!DOCTYPE html>
<html lang="ja"><head><meta charset="utf-8"/><meta content="width=device-width, initial-scale=1" name="viewport"/><link href="/assets/icons/trailfusion.svg" rel="icon" type="image/svg+xml"/><link href="/assets/css/site-v2.css" rel="stylesheet"/><link href="/assets/css/parking-area.css" rel="stylesheet"/><script defer="" src="/assets/js/site-v2.js"></script><script async="" src="https://www.googletagmanager.com/gtag/js?id=G-S57KSMSB8Y"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag("js",new Date());gtag("config","G-S57KSMSB8Y");</script>
<title>${esc(title)}</title>
<meta content="${esc(description)}" name="description"/>
<meta content="index, follow, max-image-preview:large" name="robots"/>
<meta content="#172b3a" name="theme-color"/>
<meta name="apple-itunes-app" content="app-id=${APP_ID}"/>
<link href="${url}" rel="canonical"/>
<meta content="summary_large_image" name="twitter:card"/>
<meta content="${esc(title)}" property="og:title"/>
<meta content="${esc(description)}" property="og:description"/>
<meta content="website" property="og:type"/>
<meta content="TrailFusion AI" property="og:site_name"/>
<meta content="ja_JP" property="og:locale"/>
<meta content="${url}" property="og:url"/>
<meta content="${OG_IMAGE}" property="og:image"/>
<meta content="1200" property="og:image:width"/>
<meta content="630" property="og:image:height"/>
<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>
</head>
<body class="tf-page">
<a class="tf-skip" href="#tf-main">本文へ移動</a>
${HEADER}
<main id="tf-main">
${body}
</main>
${FOOTER}
</body></html>
`;
}

function graph(path, title, description, crumbs, extra = []) {
  const url = DOMAIN + path;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', '@id': `${DOMAIN}/#organization`, name: 'TrailFusion AI', url: `${DOMAIN}/`, email: 'trailfusionai@gmail.com' },
      { '@type': 'WebSite', '@id': `${DOMAIN}/#website`, url: `${DOMAIN}/`, name: 'TrailFusion AI', inLanguage: 'ja', publisher: { '@id': `${DOMAIN}/#organization` } },
      {
        '@type': 'WebPage', '@id': `${url}#webpage`, url, name: title, description, inLanguage: 'ja',
        dateModified: generatedAt, isPartOf: { '@id': `${DOMAIN}/#website` },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: crumbs.map(([name, p], i) => ({ '@type': 'ListItem', position: i + 1, name, item: DOMAIN + p })),
      },
      ...extra,
    ],
  };
}

const breadcrumbHtml = (crumbs) =>
  `<nav aria-label="パンくず" class="tf-breadcrumb">${crumbs
    .map(([name, p], i) =>
      i === crumbs.length - 1 ? `<span aria-current="page">${esc(name)}</span>` : `<a href="${p}">${esc(name)}</a><span aria-hidden="true">/</span>`,
    )
    .join('')}</nav>`;

const baseCrumbs = [['ホーム', '/'], ['車旅', '/travel/'], ['駐車場の料金相場', BASE_PATH]];

const section = (kicker, heading, inner, tone = '') =>
  `<section class="tf-section${tone ? ` ${tone}` : ''}"><div class="tf-container"><div class="tf-section-head"><div><span class="tf-kicker">${kicker}</span><h2>${heading}</h2></div></div>${inner}</div></section>`;

// ---- Reusable blocks ---------------------------------------------------------------------------

function statTiles(stats) {
  const tile = (cls, label, value, note) =>
    `<div class="pa-stat${cls ? ` ${cls}` : ''}"><small>${label}</small><b>${value}</b><p>${note}</p></div>`;
  const money = (v) => (v == null ? '—' : `${num(v)}<span>円</span>`);
  return `<div class="pa-stats">
${tile('lead', '平日昼 1時間の料金（中央値）', money(stats.hour.median), `収録しているコインパーキング${num(stats.hour.n)}件の真ん中の水準です。`)}
${tile('cheap', '安い方から25%の水準', money(stats.hour.p25), '1時間あたり、この金額以下の駐車場が4分の1あります。')}
${tile('', '24時間停めた場合（中央値）', money(stats.day.median), `安い方から25%は${yen(stats.day.p25)}以下。`)}
${tile('', '夜18時〜翌8時（中央値）', money(stats.night.median), '仕事帰りや前泊など、夜から朝まで停める想定です。')}
${tile('', '最大料金がある駐車場', stats.maxShare == null ? '—' : `${Math.round(stats.maxShare)}<span>%</span>`, '料金表に最大料金（上限）の設定がある割合。')}
${tile('', '夜間最大がある駐車場', `${num(stats.nightMaxCount)}<span>件</span>`, '夕方〜夜に始まる時間帯の上限料金がある件数。')}
</div>`;
}

function histogram(stats) {
  const total = stats.hourHistogram.reduce((a, b) => a + b, 0) || 1;
  const peak = Math.max(...stats.hourHistogram, 1);
  const rows = stats.hourHistogram
    .map((count, i) => {
      const share = Math.round((count / total) * 100);
      return `<div class="pa-hist-row${i === 0 ? ' cheap' : ''}"><span>${HOUR_LABELS[i]}</span><span class="pa-hist-track" aria-hidden="true"><span class="pa-hist-fill" style="width:${((count / peak) * 100).toFixed(1)}%"></span></span><b>${share}%</b></div>`;
    })
    .join('');
  return `<div class="pa-hist" role="img" aria-label="平日昼1時間の料金帯ごとの割合">${rows}</div>`;
}

function mixList(stats) {
  const items = [
    ['平面のコインパーキング', stats.structure.flat],
    ['自走式立体', stats.structure.multiStorey],
    ['タワー式・機械式', stats.structure.mechanical],
    ['無料駐車場', stats.otherSpots.free],
    ['RVパーク', stats.otherSpots.rvPark],
    ['キャンプ場', stats.otherSpots.camp],
    ['EV充電スポット', stats.evChargers],
    ['道の駅', stats.michiNoEki],
  ];
  return `<div class="pa-mix">${items.map(([k, v]) => `<div><span>${k}</span><b>${num(v)}件</b></div>`).join('')}</div>`;
}

function compare(value, base) {
  if (value == null || base == null || !base) return '';
  const ratio = value / base;
  if (ratio >= 1.12) return '<span class="pa-up">高め</span>';
  if (ratio <= 0.88) return '<span class="pa-down">低め</span>';
  return '同程度';
}

function comparisonTable(rows) {
  const head = '<thead><tr><th scope="col">範囲</th><th scope="col" class="pa-num">1時間</th><th scope="col" class="pa-num">24時間</th><th scope="col" class="pa-num">夜18時〜翌8時</th><th scope="col" class="pa-num">最大料金あり</th></tr></thead>';
  const body = rows
    .map(([label, s]) => `<tr><th scope="row">${esc(label)}</th><td class="pa-num">${yen(s.hour.median)}</td><td class="pa-num">${yen(s.day.median)}</td><td class="pa-num">${yen(s.night.median)}</td><td class="pa-num">${pctText(s.maxShare)}</td></tr>`)
    .join('');
  return `<div class="tf-table-scroll"><table class="tf-table">${head}<tbody>${body}</tbody></table></div><p class="tf-note">いずれも中央値。平日（水曜）を想定した参考値です。</p>`;
}

function appBlock(placeName) {
  return `<div class="pa-app"><div><span class="tf-kicker">CAR CONCIERGE APP</span><h2>${esc(placeName)}で、いま停める駐車場を料金順に。</h2><p class="tf-intro" style="margin-top:14px">このページはエリア全体の傾向です。実際に停める駐車場は、入庫・出庫の時刻を入れて比べるのがいちばん確実。車旅コンシェルジュなら地図の上でそのまま探せます。</p><div class="tf-actions"><a class="tf-button" data-placement="parking-area" href="${APP_STORE_URL}" rel="noopener">App Storeで見る<span aria-hidden="true">↗</span></a><a class="tf-button secondary" href="/car-concierge.html">アプリの紹介</a></div><p class="tf-note" style="margin-top:12px">iPhone向け。ダウンロード無料（アプリ内課金あり）。</p></div>
<ul>
<li><b>駐車時間を入れると料金順</b> — 入庫時刻と停める時間から、その時間帯にかかる料金を計算して安い順に並べます。</li>
<li><b>今夜の寝床探し</b> — 道の駅・RVパーク・夜間の駐車場など、休憩・仮眠の候補を地図で探せます。</li>
<li><b>EV充電</b> — 充電スポットを同じ地図で。車種を選ぶと充電時間と料金の目安も確認できます。</li>
<li><b>オービス接近通知</b> — 走行中、オービスの設置地点に近づくとお知らせします。</li>
<li><b>旅ログ</b> — 走った道が地図に残り、これまでの車旅をふり返れます。</li>
</ul></div>`;
}

const sourceNote = `<div class="pa-source"><p>集計の定義：「1時間」は平日（水曜）12:00〜13:00、「24時間」は平日10:00からの24時間、「夜18時〜翌8時」は平日18:00から翌朝8:00までの料金を、車旅コンシェルジュが収録している料金表からアプリと同じ計算方法で求め、エリア内の中央値・下位25%値を10円単位で示しています。祝日・イベント時・土日の料金や、料金表の改定は反映されない場合があります。最新の料金と利用条件は、必ず現地の看板でご確認ください。</p><p>エリアの区分には「国土数値情報（行政区域データ）」（国土交通省）を加工したデータ（smartnews-smri/japan-topography）を使用しています。集計日：${dateJa(generatedAt)}。</p></div>`;

// ---- Area narrative (all statements are hedged to the dataset) ----------------------------------

function tips(a, pref) {
  const s = a.stats;
  const list = [];
  const spread = s.hour.p25 && s.hour.median ? s.hour.median / s.hour.p25 : 1;
  if (spread >= 1.3)
    list.push(['同じエリアでも、料金差が大きめ', `収録データでは、1時間の中央値${yen(s.hour.median)}に対し、安い方の4分の1は${yen(s.hour.p25)}以下でした。目的地のすぐ隣にこだわらず、数ブロック先まで比べると差が出やすいエリアです。`]);
  else
    list.push(['料金の幅は比較的せまい', `1時間の中央値${yen(s.hour.median)}、安い方の4分の1が${yen(s.hour.p25)}以下と、料金帯のばらつきは大きくありません。歩く距離や出し入れのしやすさで選んでもよさそうです。`]);

  if ((s.maxShare ?? 0) >= 60)
    list.push(['長く停めるなら、最大料金の「条件」を確認', `最大料金の設定がある駐車場が約${Math.round(s.maxShare)}%。ただし「入庫後○時間」「当日24時まで」「繰り返し適用なし」など条件はさまざまです。上限が効く時間帯に収まるかを看板で確かめましょう。`]);
  else
    list.push(['最大料金がない駐車場も多め', `最大料金の設定がある駐車場は約${Math.round(s.maxShare ?? 0)}%。長時間になりそうなときは、上限のある駐車場を先に絞り込んでおくと安心です。`]);

  if (s.day.median && s.hour.median && s.day.median <= s.hour.median * 8)
    list.push(['半日以上なら、時間貸しより上限料金が効きやすい', `24時間の中央値は${yen(s.day.median)}で、1時間の中央値の約${Math.max(1, Math.round(s.day.median / s.hour.median))}倍。長時間になるほど1時間あたりは割安になりやすい傾向です。`]);
  else
    list.push(['長時間は、周辺エリアとの比較も', `24時間の中央値は${yen(s.day.median)}。長時間停める予定なら、少し離れたエリアや公共交通との組み合わせも検討できます。`]);

  if (s.nightMaxCount >= 10)
    list.push(['夜から朝までは「夜間最大」を探す', `夕方〜夜に始まる上限料金がある駐車場を${num(s.nightMaxCount)}件収録しています。夜18時〜翌8時の中央値は${yen(s.night.median)}。前泊や早朝出発の日に役立ちます。`]);
  if (s.structure.multiStorey + s.structure.mechanical >= 5)
    list.push(['立体・機械式は車高と車幅に注意', `自走式立体やタワー・機械式の駐車場も${num(s.structure.multiStorey + s.structure.mechanical)}件あります。ミニバンやルーフキャリア付きの車は、高さ制限を事前に確認しましょう。`]);
  if (pref && s.hour.median && pref.stats.hour.median) {
    const c = compare(s.hour.median, pref.stats.hour.median).replace(/<[^>]+>/g, '');
    list.push([`${pref.name}全体と比べると${c}`, `${pref.name}全体の1時間の中央値は${yen(pref.stats.hour.median)}。${displayName(a)}は${yen(s.hour.median)}でした（いずれも収録データの参考値）。`]);
  }
  return `<ol class="pa-tips">${list.map(([t, d]) => `<li><strong>${esc(t)}</strong>${esc(d)}</li>`).join('')}</ol>`;
}

function faq(a) {
  const s = a.stats;
  const name = displayName(a);
  return [
    [`${name}の駐車場、1時間の料金相場は？`, `車旅コンシェルジュの収録データ（${num(s.hour.n)}件）では、平日昼の1時間料金の中央値は${yen(s.hour.median)}、安い方から25%の水準は${yen(s.hour.p25)}でした。時間帯・曜日で変わるため、参考値としてご覧ください。`],
    [`${name}で24時間停めるといくらくらい？`, `平日10時から24時間停めた場合の中央値は${yen(s.day.median)}、安い方から25%は${yen(s.day.p25)}以下でした。最大料金は「入庫から24時間」「当日限り」など条件が異なるため、現地の表示をご確認ください。`],
    [`夜から朝まで停めるときの目安は？`, `18時から翌朝8時まで停めた場合の中央値は${yen(s.night.median)}でした。夕方以降に始まる夜間最大料金がある駐車場は${num(s.nightMaxCount)}件収録しています。`],
    [`実際に一番安い駐車場を探すには？`, `このページはエリア全体の傾向を示すものです。車旅コンシェルジュでは、入庫・出庫の時刻を指定して周辺の駐車場を料金順に並べ替えられます。最新の料金と利用条件は現地の看板で確認してください。`],
  ];
}

const faqHtml = (items) =>
  `<div class="tf-faq">${items.map(([q, ans]) => `<details><summary>${esc(q)}</summary><p>${esc(ans)}</p></details>`).join('')}</div>`;
const faqSchema = (items) => ({
  '@type': 'FAQPage',
  mainEntity: items.map(([q, ans]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: ans } })),
});

// ---- Pages -----------------------------------------------------------------------------------

function areaPage(a) {
  const pref = prefByCode.get(a.prefCode);
  const name = displayName(a);
  const path = areaPath(a);
  const s = a.stats;
  const title = `${name}の駐車場 料金相場と安く停めるコツ｜車旅コンシェルジュ`;
  const description = `${a.pref}${a.name}のコインパーキング${num(s.coinParking)}件を集計。平日1時間の中央値${yen(s.hour.median)}、24時間は${yen(s.day.median)}、最大料金ありは${pctText(s.maxShare)}。料金の傾向と安く停めるコツをまとめました。`;
  const crumbs = [...baseCrumbs, [a.pref, prefPath(pref)], [name, path]];
  const faqItems = faq(a);

  const siblings = areas.filter((x) => x.prefCode === a.prefCode && x.code !== a.code);
  const sameCity = siblings.filter((x) => a.parentCity && x.parentCity === a.parentCity);
  const others = siblings.filter((x) => !sameCity.includes(x)).sort((x, y) => y.stats.coinParking - x.stats.coinParking);
  const nearby = [...sameCity, ...others].slice(0, NEARBY_LIMIT);
  const nearbyHtml = nearby.length
    ? section('NEARBY AREAS', `${esc(a.pref)}のほかのエリア`, `<div class="pa-links">${nearby.map((x) => `<a href="${areaPath(x)}">${esc(displayName(x))}<small>1時間 ${yen(x.stats.hour.median)}</small></a>`).join('')}</div><p class="tf-note" style="margin-top:16px"><a class="tf-text-link" href="${prefPath(pref)}">${esc(a.pref)}のエリア一覧へ</a></p>`)
    : '';

  const body = `<div class="tf-container">${breadcrumbHtml(crumbs)}
<div class="tf-page-heading"><span class="tf-kicker">PARKING FEES · ${esc(a.pref)}</span><h1>${esc(name)}の駐車場<br/><span class="tf-accent">料金相場と安く停めるコツ</span></h1><p class="tf-lead">${esc(a.pref)}${esc(a.name)}で車旅コンシェルジュが収録しているコインパーキング${num(s.coinParking)}件をもとに、平日の1時間・24時間・夜間の料金水準を集計しました。</p></div>
${statTiles(s)}
</div>
${section('PRICE RANGE', '1時間料金の分布', `<div class="pa-two">${histogram(s)}<div class="tf-answer"><strong>${s.hourHistogram[0] + s.hourHistogram[1] > 0 ? `${Math.round(((s.hourHistogram[0] + s.hourHistogram[1]) / Math.max(1, s.hourHistogram.reduce((x, y) => x + y, 0))) * 100)}%が1時間300円以下` : '料金帯の分布'}</strong>平日12時台に1時間停めた場合の料金を、5つの料金帯に分けた割合です。緑の帯（200円以下）が多いほど、探せば安く停めやすいエリアといえます。</div></div>`, 'white')}
${section('HOW TO SAVE', `${esc(name)}で安く停めるコツ`, tips(a, pref))}
${section('COMPARE', `${esc(a.pref)}・全国との比較`, comparisonTable([[name, s], [`${a.pref}全体`, pref.stats], ['全国（収録データ）', national]]), 'white')}
${section('WHAT YOU WILL FIND', 'エリア内の駐車場・施設の内訳', `${mixList(s)}<p class="tf-note" style="margin-top:14px">車旅コンシェルジュの収録件数です。すべての駐車場・施設を網羅しているわけではありません。</p>`)}
<section class="tf-section"><div class="tf-container">${appBlock(name)}</div></section>
${section('QUESTIONS', 'よくあるご質問', faqHtml(faqItems), 'white')}
${nearbyHtml}
<section class="tf-section"><div class="tf-container">${sourceNote}</div></section>`;

  return page({ path, title, description, body, jsonLd: graph(path, title, description, crumbs, [faqSchema(faqItems)]) });
}

function prefPage(p) {
  const path = prefPath(p);
  const list = areas.filter((a) => a.prefCode === p.prefCode).sort((x, y) => y.stats.coinParking - x.stats.coinParking);
  const s = p.stats;
  const title = `${p.name}の駐車場 料金相場（市区町村別）｜車旅コンシェルジュ`;
  const description = `${p.name}のコインパーキング${num(s.coinParking)}件を市区町村別に集計。1時間の中央値は${yen(s.hour.median)}、24時間は${yen(s.day.median)}。${list.length}エリアの料金相場を比べられます。`;
  const crumbs = [...baseCrumbs, [p.name, path]];
  const rows = list
    .map((a) => `<tr><th scope="row"><a href="${areaPath(a)}">${esc(displayName(a))}</a></th><td class="pa-num">${num(a.stats.coinParking)}件</td><td class="pa-num">${yen(a.stats.hour.median)} ${compare(a.stats.hour.median, s.hour.median)}</td><td class="pa-num">${yen(a.stats.day.median)}</td><td class="pa-num">${pctText(a.stats.maxShare)}</td></tr>`)
    .join('');
  const table = `<div class="tf-table-scroll"><table class="tf-table"><thead><tr><th scope="col">エリア</th><th scope="col" class="pa-num">収録件数</th><th scope="col" class="pa-num">1時間（${esc(p.name)}比）</th><th scope="col" class="pa-num">24時間</th><th scope="col" class="pa-num">最大料金あり</th></tr></thead><tbody>${rows}</tbody></table></div><p class="tf-note">収録件数が${data.definitions.thresholds.minCoinParking}件以上のエリアを掲載しています。料金はいずれも中央値（平日の参考値）。</p>`;
  const body = `<div class="tf-container">${breadcrumbHtml(crumbs)}
<div class="tf-page-heading"><span class="tf-kicker">PARKING FEES · ${esc(p.name)}</span><h1>${esc(p.name)}の駐車場<br/><span class="tf-accent">料金相場を市区町村別に</span></h1><p class="tf-lead">${esc(p.name)}で車旅コンシェルジュが収録しているコインパーキング${num(s.coinParking)}件を集計しました。エリアを選ぶと、料金の分布や安く停めるコツを確認できます。</p></div>
${statTiles(s)}
</div>
${section('BY AREA', `${esc(p.name)}のエリア別 料金相場`, table, 'white')}
${section('WHAT YOU WILL FIND', `${esc(p.name)}の駐車場・施設の内訳`, mixList(s))}
<section class="tf-section white"><div class="tf-container">${appBlock(p.name)}</div></section>
<section class="tf-section"><div class="tf-container">${sourceNote}</div></section>`;
  return page({ path, title, description, body, jsonLd: graph(path, title, description, crumbs) });
}

function indexPage() {
  const path = BASE_PATH;
  const title = '駐車場の料金相場を市区町村別に｜車旅コンシェルジュ';
  const description = `全国${areas.length}の市区町村・区について、コインパーキングの1時間・24時間・夜間料金の相場を集計。エリアごとの傾向と安く停めるコツをまとめました。`;
  const crumbs = baseCrumbs;
  const cards = prefectures
    .map((p) => {
      const n = areas.filter((a) => a.prefCode === p.prefCode).length;
      return `<a href="${prefPath(p)}">${esc(p.name)}<small>${n}エリア・1時間 ${yen(p.stats.hour.median)}</small></a>`;
    })
    .join('');
  const body = `<div class="tf-container">${breadcrumbHtml(crumbs)}
<div class="tf-page-heading"><span class="tf-kicker">PARKING FEES IN JAPAN</span><h1>駐車場の料金相場を、<br/><span class="tf-accent">市区町村ごとに。</span></h1><p class="tf-lead">車旅コンシェルジュが収録しているコインパーキングの料金表から、平日の1時間・24時間・夜間に停めた場合の料金を計算し、エリアごとの中央値を出しました。出かける前の目安にどうぞ。</p></div>
<div class="pa-stats">
<div class="pa-stat lead"><small>全国・平日昼 1時間（中央値）</small><b>${num(national.hour.median)}<span>円</span></b><p>収録データ${num(national.hour.n)}件の中央値です。</p></div>
<div class="pa-stat cheap"><small>安い方から25%の水準</small><b>${num(national.hour.p25)}<span>円</span></b><p>1時間あたり。</p></div>
<div class="pa-stat"><small>24時間（中央値）</small><b>${num(national.day.median)}<span>円</span></b><p>平日10時から24時間。</p></div>
<div class="pa-stat"><small>夜18時〜翌8時（中央値）</small><b>${num(national.night.median)}<span>円</span></b><p>夜から朝まで停める想定。</p></div>
<div class="pa-stat"><small>最大料金がある駐車場</small><b>${Math.round(national.maxShare)}<span>%</span></b><p>料金表に上限の設定がある割合。</p></div>
<div class="pa-stat"><small>掲載エリア</small><b>${areas.length}<span>エリア</span></b><p>収録${data.definitions.thresholds.minCoinParking}件以上の市区町村・区。</p></div>
</div>
</div>
${section('BY PREFECTURE', '都道府県から探す', `<div class="pa-links">${cards}</div>`, 'white')}
<section class="tf-section"><div class="tf-container">${appBlock('目的地の近く')}</div></section>
<section class="tf-section white"><div class="tf-container">${sourceNote}</div></section>`;
  return page({ path, title, description, body, jsonLd: graph(path, title, description, crumbs) });
}

// ---- Sitemap / llms.txt -----------------------------------------------------------------------

function replaceBlock(text, start, end, block, anchor) {
  const re = new RegExp(`${start}[\\s\\S]*?${end}\\n*`);
  // Markdown anchors (llms.txt headings) need a blank line before them.
  const content = `${start}\n${block}${end}\n${anchor.startsWith('#') ? '\n' : ''}`;
  if (re.test(text)) return text.replace(re, content);
  const i = text.lastIndexOf(anchor);
  if (i < 0) return `${text.trimEnd()}\n\n${content}`;
  return text.slice(0, i) + content + text.slice(i);
}

function writeFile(rel, html) {
  const path = join(ROOT, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, html);
}

function main() {
  rmSync(OUT_DIR, { recursive: true, force: true });
  const urls = [BASE_PATH];
  writeFile('car-concierge/parking/index.html', indexPage());
  for (const p of prefectures) {
    writeFile(`car-concierge/parking/${p.prefSlug}/index.html`, prefPage(p));
    urls.push(prefPath(p));
  }
  for (const a of areas) {
    writeFile(`car-concierge/parking/${a.prefSlug}/${a.code}/index.html`, areaPage(a));
    urls.push(areaPath(a));
  }

  const sitemapPath = join(ROOT, 'sitemap.xml');
  const sitemap = readFileSync(sitemapPath, 'utf8');
  const entries = urls.map((u) => `  <url><loc>${DOMAIN}${u}</loc><lastmod>${generatedAt}</lastmod></url>\n`).join('');
  writeFileSync(sitemapPath, replaceBlock(sitemap, '  <!-- parking-areas:start -->', '  <!-- parking-areas:end -->', entries, '</urlset>'));

  const llmsPath = join(ROOT, 'llms.txt');
  const llms = readFileSync(llmsPath, 'utf8');
  const llmsBlock = `## Parking fee levels by area (Car Travel Concierge data)

- [Parking fee levels by municipality](${DOMAIN}${BASE_PATH}): area-level medians of weekday 1-hour, 24-hour and overnight (18:00–08:00) coin-parking fees for ${areas.length} municipalities / wards in ${prefectures.length} prefectures, computed from the app's rate data with the app's own fee calculation. Aggregates only; no individual parking lots are listed. Values are reference levels; on-site signs are authoritative.
`;
  writeFileSync(llmsPath, replaceBlock(llms, '<!-- parking-areas:start -->', '<!-- parking-areas:end -->', llmsBlock, '## Important interpretation boundaries'));

  console.log(`generated ${urls.length} pages (${areas.length} areas, ${prefectures.length} prefectures, 1 index)`);
}

main();
