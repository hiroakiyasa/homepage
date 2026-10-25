"""Shared data and page chrome for the TrailFusion brand site (Japanese + English).

App facts come from docs/brand/store-snapshot.json (App Store Japan lookup) and the Quest
course stats; nothing here is invented. もちのへや is in App Store review: no store link.
"""
import json, html
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASE = 'https://trailfusionai.com'
A = '/assets/brand/'
CSS_VERSION = '20261025-1'
DIM = json.loads((ROOT / 'docs/brand/image-dimensions.json').read_text())
STORE = json.loads((ROOT / 'docs/brand/store-snapshot.json').read_text())['apps']
QUEST_STATS = json.loads((ROOT / 'docs/quest/course-stats.json').read_text())['courses']
SNAPSHOT_DATE = ('2026年10月25日', 'October 25, 2026')
GA = 'G-S57KSMSB8Y'

CATS = {  # key: (ja, en, color)
    'learn': ('学ぶ', 'Learn', '#1d6fd6'),
    'heart': ('心をととのえる', 'Feel better', '#d9577a'),
    'travel': ('旅する', 'Travel', '#0f8a70'),
    'create': ('つくる', 'Create', '#b4530f'),
    'connect': ('つながる', 'Connect', '#5b48c9'),
    'play': ('遊ぶ', 'Play', '#8a5a00'),
    'focus': ('集中する', 'Focus', '#334a6b'),
}


def app(slug, cat, ja, en, tag_ja, tag_en, detail=None, android=None, status='live', legal=None, group='main'):
    return dict(slug=slug, cat=cat, ja=ja, en=en, tag_ja=tag_ja, tag_en=tag_en, detail=detail,
                ios=STORE.get(slug, {}).get('id'), android=android, status=status, legal=legal or {}, group=group)


APPS = [
    app('quest', 'learn', '合格！クエスト', 'Gokaku! Quest', '中学受験の4科から、資格・語学まで。12教材をひとつのアプリで。',
        'Entrance-exam science, social studies, Japanese and math, plus certifications and languages. 12 courses in one app.',
        '/quest/', 'com.gokakushakaiquest.app', legal={'privacy': '/gokaku-quest-privacy.html', 'terms': '/gokaku-quest-terms.html', 'support': '/support/'}),
    app('mochi', 'heart', 'もちのへや', 'Mochi', 'もちもちの相棒と話して、気持ちをことばにする。毎日いっしょに過ごすペットアプリ。',
        'A soft companion to talk with. Put feelings into words and spend a little time together every day.',
        None, status='review', legal={'privacy': '/mochi-privacy.html', 'support': '/mochi-support.html'}),
    app('car-concierge', 'travel', '車旅コンシェルジュ', 'Car Concierge', '今夜休む場所、駐車場の料金、EV充電、次の目的地。車旅をひとつの地図で。',
        'Where to rest tonight, parking fees, EV charging and the next destination, on a single map for road trips in Japan.',
        '/car-concierge.html', legal={'privacy': '/car-concierge-privacy.html', 'terms': '/car-concierge-terms.html'}),
    app('reelmake', 'create', 'Reel Make', 'Reel Make', '写真と動画を選ぶだけ。ナレーションと字幕つきの縦型動画をAIが仕上げる。',
        'Pick photos and clips. AI builds a vertical video with narration and captions.',
        '/reelmake.html', 'com.reelapp.maker', legal={'privacy': '/reelmake-privacy.html', 'terms': '/reelmake-terms.html', 'support': '/reelmake-support.html'}),
    app('voicelink', 'connect', 'VoiceLink AI通訳', 'VoiceLink AI Translator', '音声認識・翻訳・要約をすべて端末内で。話した内容をサーバーに送らない通訳アプリ。',
        'Speech recognition, translation and summaries run entirely on the device. Nothing you say is sent to a server.',
        '/voicelink.html', legal={'privacy': '/voicelink-privacy.html', 'support': '/voicelink-support.html'}),
    app('buddytalk', 'learn', 'BuddyTalk', 'BuddyTalk', 'AIと話して、英語が口から出てくるように。話す練習に絞った英会話アプリ。',
        'Talk with AI until English comes out naturally. An English app focused on speaking practice.',
        '/buddytalk.html', legal={'privacy': '/buddytalk-privacy.html', 'terms': '/buddytalk-terms.html', 'support': '/buddytalk-legal.html'}),
    app('english-quest', 'learn', 'English Quest', 'English Quest', '文法・語彙・英語資格を、クイズと解説で学ぶ英語学習アプリ。',
        'Grammar, vocabulary and English exams, learned through quizzes and explanations.',
        '/eigo-quest.html', legal={'privacy': '/eigo-quest-privacy.html', 'terms': '/eigo-quest-terms.html'}),
    app('fp-quest', 'learn', '合格！FPクエスト', 'Gokaku! FP Quest', 'ファイナンシャル・プランナーの6分野を、図鑑と問題で学ぶ。',
        'The six areas of the Japanese financial planner exam, with illustrated guides and questions.',
        '/quest/courses/fp/', legal={'privacy': '/fp-quest-privacy.html', 'terms': '/fp-quest-terms.html'}),
    app('word-blaster', 'learn', 'ワードブラスター', 'Word Blaster', '単語が敵になって飛んでくる。10言語に対応した単語学習シューティング。',
        'Words fly at you as enemies. A vocabulary shooter for 10 languages.', '/word-blaster.html'),
    app('wood-golem', 'play', '森のウッドゴーレム', 'Wood Golem', '棒取りゲームの読み合いと、ゴーレムの成長物語を楽しむ戦略パズル。',
        'A strategy puzzle built on the classic stick-taking game, with a golem who grows as you win.', '/wood-golem.html'),
    app('hacking-timer', 'focus', 'ハッキングタイマー', 'Hacking Timer', 'Apple Watchで使うインターバルタイマー。集中と休憩のリズムをつくる。',
        'An interval timer for Apple Watch that keeps a rhythm of focus and rest.', '/hacking-timer.html'),
    app('rika-quest', 'learn', '合格理科クエスト', 'Gokaku Rika Quest', '以前の理科の単科アプリ。学習記録と購入は合格！クエストへ引き継げます。',
        'The earlier single-subject science app. Progress and purchases can move to Gokaku! Quest.',
        '/rika-quest.html', 'com.gokakurikaquest.app', group='legacy', legal={'privacy': '/rika-quest-privacy.html', 'terms': '/rika-quest-terms.html', 'support': '/rika-quest-support.html'}),
    app('kokugo-quest', 'learn', '合格！国語クエスト', 'Gokaku! Kokugo Quest', '以前の国語の単科アプリ。学習記録と購入は合格！クエストへ引き継げます。',
        'The earlier single-subject Japanese-language app. Progress and purchases can move to Gokaku! Quest.',
        '/kokugo-quest.html', 'com.gokakukokugoquest.app', group='legacy', legal={'privacy': '/kokugo-quest-privacy.html', 'support': '/kokugo-quest-support.html'}),
]
BY = {a['slug']: a for a in APPS}
LIVE = [a for a in APPS if a['status'] == 'live']
RATINGS = sum(STORE[a['slug']]['ratings'] for a in LIVE)


def esc(s):
    return html.escape(s, quote=True)


def tx(lang):
    return lambda ja, en: ja if lang == 'ja' else en


def img(path, alt, cls='', eager=False):
    key = path.removeprefix(A).removesuffix('.webp')
    w, h = DIM[key]
    load = 'loading="eager" fetchpriority="high"' if eager else 'loading="lazy"'
    return f'<img src="{A}{path.removeprefix(A)}" alt="{esc(alt)}" class="{cls}" width="{w}" height="{h}" {load} decoding="async">'


def icon(slug, lang, cls='app-icon', eager=False):
    a = BY[slug]
    return img(f'{slug}/icon.webp', (a['ja'] if lang == 'ja' else a['en']) + (' のアイコン' if lang == 'ja' else ' icon'), cls, eager)


def bg(name, eager=False, cls='bg'):
    load = 'loading="eager" fetchpriority="high"' if eager else 'loading="lazy"'
    return (f'<picture class="{cls}" aria-hidden="true"><source media="(max-width:720px)" srcset="{A}bg/{name}-m.webp">'
            f'<img src="{A}bg/{name}.webp" alt="" {load} decoding="async"></picture>')


APPLE = '<svg viewBox="0 0 24 28" aria-hidden="true"><path fill="currentColor" d="M18 14c0-3 2-4.5 3-5-1.5-2-4-2.3-5-2.3-2 0-3 1-4 1s-2.5-1-4-1C4 6.8 1 10 1 14c0 6 4 12 6.5 12 1.5 0 2-1 4-1s2.5 1 4 1c2 0 5-4 6-7-2-.8-3.5-2.8-3.5-5ZM16 0c-3 .2-5 2-5 5 3 .3 5-2 5-5Z"/></svg>'
PLAY = '<svg viewBox="0 0 25 28" aria-hidden="true"><path fill="#a5d4a0" d="M1 1v26l13-13Z"/><path fill="#f4d675" d="m1 1 17 10-4 3Z"/><path fill="#ec8661" d="m1 27 17-10-4-3Z"/><path fill="#fff" d="m18 11 6 3-6 3-4-3Z"/></svg>'


def stores(slug, lang, place, small=False):
    a, t = BY[slug], tx(lang)
    if a['status'] != 'live':
        return f'<p class="status-pill">{t("App Store 審査中・まもなく公開", "In App Store review, coming soon")}</p>'
    country = 'jp' if lang == 'ja' else 'us'
    out = (f'<a class="store{" small" if small else ""}" href="https://apps.apple.com/{country}/app/id{a["ios"]}" data-store="apple" data-app="{slug}" data-placement="{place}">'
           f'{APPLE}<span><small>{t("iPhone・iPad", "iPhone & iPad")}</small><strong>App Store</strong></span></a>')
    if a['android']:
        out += (f'<a class="store{" small" if small else ""}" href="https://play.google.com/store/apps/details?id={a["android"]}" data-store="google" data-app="{slug}" data-placement="{place}">'
                f'{PLAY}<span><small>Android</small><strong>Google Play</strong></span></a>')
    return f'<div class="stores">{out}</div>'


def rating(slug, lang):
    s, t = STORE[slug], tx(lang)
    if not s['ratings']:
        return ''
    count = s['ratings']
    return (f'<span class="rating" title="{t("App Store（日本）の評価", "App Store (Japan) rating")}">'
            f'<b aria-hidden="true">★</b>{s["rating"]:.1f}<small>{t(f"{count}件の評価", f"{count} ratings")}</small></span>')


def nav(lang):
    t = tx(lang)
    p = '' if lang == 'ja' else '/en'
    items = [(f'{p}/apps.html', t('アプリ', 'Apps')), ('/quest/', t('合格！クエスト', 'Gokaku! Quest')),
             (f'{p}/about/' if lang == 'ja' else '/en/#maker', t('つくり手', 'About')), ('/support/', t('サポート', 'Support'))]
    return ''.join(f'<a href="{h}">{label}</a>' for h, label in items)


def header(lang, alt_path, tools=''):
    t = tx(lang)
    home = '/' if lang == 'ja' else '/en/'
    switch = (f'<a class="lang" href="{alt_path}" hreflang="{"en" if lang == "ja" else "ja"}" lang="{"en" if lang == "ja" else "ja"}">'
              f'{"English" if lang == "ja" else "日本語"}</a>')
    return (f'<header class="br-header"><div class="br-wrap br-header-inner">'
            f'<a class="br-logo" href="{home}" aria-label="TrailFusion AI {t("ホーム", "home")}"><img src="/assets/icons/trailfusion-lockup.webp" alt="TrailFusion" width="104" height="64"></a>'
            f'<nav class="br-nav" aria-label="{t("メインメニュー", "Main menu")}">{nav(lang)}</nav>{tools}{switch}'
            f'<details class="br-menu"><summary aria-label="{t("メニューを開く", "Open menu")}"><span></span><span></span><span></span></summary>'
            f'<nav aria-label="{t("モバイルメニュー", "Mobile menu")}">{nav(lang)}{switch}</nav></details></div></header>')


def footer(lang):
    t = tx(lang)
    p = '' if lang == 'ja' else '/en'
    apps = ''.join(f'<li><a href="{a["detail"] or p + "/apps.html#" + a["slug"]}">{a["ja"] if lang == "ja" else a["en"]}</a></li>'
                   for a in APPS[:5])
    garage = ([('/garage/', 'つくり手のガレージ'), ('/travel/story.html', '車旅の記録'), ('/drive-routes/', '絶景ロード図鑑'), ('/diy/', 'キャンピングカーDIY'), ('/maintenance/', 'ハイエース整備')]
              if lang == 'ja' else
              [('/en/travel/', 'Road trips'), ('/drive-routes/', 'Scenic road map (Japanese)'), ('/en/diy/', 'Camper van DIY'), ('/en/maintenance/', 'Van maintenance')])
    brand = ([('/about/', 'つくり手について'), ('/partners/', '協業・パートナー'), ('/support/', 'お問い合わせ・サポート'), ('/support/#policies', 'アプリ別の規約・プライバシー'), ('/privacy-policy.html', 'サイトのプライバシーポリシー'), ('/terms-of-service.html', 'サイトの利用規約')]
             if lang == 'ja' else
             [('/en/#maker', 'About the maker'), ('/support/', 'Support (Japanese)'), ('/support/#policies', 'App privacy and terms'), ('/privacy-policy.html', 'Site privacy policy')])
    col = lambda title, rows: f'<div><h2>{title}</h2><ul>{"".join(f"<li><a href={chr(34)}{h}{chr(34)}>{x}</a></li>" for h, x in rows)}</ul></div>'
    return (f'<footer class="br-footer"><div class="br-wrap"><div class="br-footer-grid">'
            f'<div class="br-footer-brand"><img src="/assets/icons/trailfusion-lockup.webp" alt="TrailFusion" width="104" height="64" loading="lazy">'
            f'<p>{t("毎日に、ちいさな冒険を。<br>学ぶ・話す・旅する・つくるを、続けたくなるアプリに。", "Small adventures for every day.<br>Apps that make learning, talking, travelling and making easier to keep up.")}</p>'
            f'<a class="mail" href="mailto:trailfusionai@gmail.com">trailfusionai@gmail.com</a></div>'
            f'<div><h2>{t("アプリ", "Apps")}</h2><ul>{apps}<li><a href="{p}/apps.html">{t("すべてのアプリ", "All apps")}</a></li></ul></div>'
            f'{col("TrailFusion", brand)}{col(t("つくり手のガレージ", "From the garage"), garage)}</div>'
            f'<div class="br-footer-bottom"><span>© 2026 TrailFusion AI</span><span>{t("アプリの提供者名（App Store）：hiroaki yuasa", "Publisher on the App Store: hiroaki yuasa")}</span></div></div></footer>')


def page(path, lang, title, desc, body, alt_path, schema=None, og='/assets/brand/og.jpg', noindex=False):
    url = BASE + ('/' + path.removesuffix('index.html') if path != 'index.html' else '/')
    alt_url = BASE + alt_path
    graph = [{'@type': 'Organization', '@id': BASE + '/#org', 'name': 'TrailFusion AI', 'url': BASE + '/',
              'logo': BASE + '/assets/icons/trailfusion-lockup.webp', 'email': 'trailfusionai@gmail.com'},
             {'@type': 'WebPage', '@id': url + '#webpage', 'url': url, 'name': title, 'description': desc, 'inLanguage': lang,
              'isPartOf': {'@type': 'WebSite', '@id': BASE + '/#site', 'name': 'TrailFusion AI', 'url': BASE + '/'}}]
    graph += schema or []
    hreflang = '' if noindex else (f'<link rel="alternate" hreflang="{lang}" href="{url}"><link rel="alternate" hreflang="{"en" if lang == "ja" else "ja"}" href="{alt_url}">'
                                   f'<link rel="alternate" hreflang="x-default" href="{url if lang == "ja" else alt_url}">')
    text = f'''<!doctype html>
<html lang="{lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(title)}</title><meta name="description" content="{esc(desc)}"><link rel="canonical" href="{url}">{hreflang}
<meta name="robots" content="{"noindex,follow" if noindex else "index,follow,max-image-preview:large"}"><meta name="theme-color" content="#5bb8f0">
<meta property="og:type" content="website"><meta property="og:site_name" content="TrailFusion AI"><meta property="og:locale" content="{"ja_JP" if lang == "ja" else "en_US"}">
<meta property="og:title" content="{esc(title)}"><meta property="og:description" content="{esc(desc)}"><meta property="og:url" content="{url}">
<meta property="og:image" content="{BASE + og}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/assets/icons/trailfusion.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/assets/quest/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@500;700;800;900&family=Noto+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/css/brand.css?v={CSS_VERSION}"><script defer src="/assets/js/brand.js?v={CSS_VERSION}"></script>
<script type="application/ld+json">{json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False)}</script>
<script async src="https://www.googletagmanager.com/gtag/js?id={GA}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments)}}gtag("js",new Date());gtag("config","{GA}");</script>
</head><body class="br"><a class="skip" href="#main">{"本文へスキップ" if lang == "ja" else "Skip to content"}</a>{header(lang, alt_path)}<main id="main">{body}</main>{footer(lang)}</body></html>
'''
    dest = ROOT / path
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(text)
    return '/' + path.removesuffix('index.html')


def app_schema(lang):
    out = []
    for a in LIVE:
        s = STORE[a['slug']]
        item = {'@type': 'MobileApplication', 'name': a['ja'] if lang == 'ja' else a['en'], 'operatingSystem': 'iOS' + (', Android' if a['android'] else ''),
                'applicationCategory': 'EducationalApplication' if a['cat'] == 'learn' else 'TravelApplication' if a['cat'] == 'travel' else 'GameApplication' if a['cat'] == 'play' else 'UtilitiesApplication',
                'offers': {'@type': 'Offer', 'price': '0', 'priceCurrency': 'JPY'}, 'publisher': {'@id': BASE + '/#org'},
                'downloadUrl': f'https://apps.apple.com/jp/app/id{a["ios"]}'}
        if s['ratings'] >= 5:
            item['aggregateRating'] = {'@type': 'AggregateRating', 'ratingValue': s['rating'], 'ratingCount': s['ratings']}
        out.append(item)
    return out
