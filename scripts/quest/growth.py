"""Add reviewed audience routes without rebuilding unrelated published content.

Run after either Quest or brand generation. The protected entrance-exam pages
are not touched. Course evidence lives in docs/quest/growth-release.json.
"""
from pathlib import Path
from urllib.parse import urlencode
import html
import json
import re

ROOT = Path(__file__).resolve().parents[2]
BASE = 'https://trailfusionai.com'
APPLE = 'https://apps.apple.com/jp/app/id6775411516'
GOOGLE = 'https://play.google.com/store/apps/details?id=com.gokakushakaiquest.app'
DAY = '2026-11-21'
STYLE = '<link rel="stylesheet" href="/assets/quest/quest-growth.css?v=20261121">'
SCRIPT = '<script defer src="/assets/quest/quest-growth.js?v=20261121"></script>'
QUALIFICATIONS = [
    ('takken', '宅建士', 'takken-japan', 'business', '権利関係・宅建業法・法令上の制限など。登場人物や条件を整理して、あいまいな知識を確かめます。', '不動産の資格'),
    ('fp', 'FP', 'fp-japan', 'business', 'ライフプランニング、保険、金融、税、不動産、相続。お金に関わる6分野を、図鑑と短い問題で学びます。', 'お金の知識'),
    ('bookkeeping', '簿記', 'bookkeeping-japan', 'business', '資産・負債の考え方から、仕訳・決算・原価計算へ。取引と数字のつながりを確認します。', '会計の基礎と演習'),
    ('it-passport', 'ITパスポート', 'it-passport-japan', 'technology', 'ストラテジ・マネジメント・テクノロジ。仕事で出会うIT用語を、意味と関係から理解します。', '仕事のIT基礎'),
    ('spi3', 'SPI3', 'spi3-japan', 'technology', '言語・非言語を中心に、問題の型と考え方を復習。就職・転職の受検準備に使えます。', '就職・転職の準備'),
]


def esc(value):
    return html.escape(str(value), quote=True)


def block(name, content):
    return f'<!-- quest-growth:{name}:start -->{content}<!-- quest-growth:{name}:end -->'


def clear_block(text, name):
    return re.sub(r'<!-- quest-growth:' + re.escape(name) + r':start -->.*?<!-- quest-growth:' + re.escape(name) + r':end -->', '', text, flags=re.S)


def with_assets(text):
    text = clear_block(text, 'assets')
    return text.replace('</head>', block('assets', STYLE + SCRIPT) + '</head>', 1)


def apple_url(audience, cpp=None, course=None):
    params = {'ct': 'web_' + (course or audience), 'mt': '8'}
    if cpp:
        params = {'ppid': cpp, **params}
    return APPLE + '?' + urlencode(params)


def google_url(audience, course=None):
    referrer = urlencode({'utm_source': 'trailfusionai', 'utm_medium': 'website', 'utm_campaign': 'quest_growth_' + audience, 'utm_content': course or audience})
    return GOOGLE + '&' + urlencode({'referrer': referrer})


def button(label, href, audience, placement, store=None, course=None, secondary=False):
    attrs = f' data-audience="{esc(audience)}" data-placement="{esc(placement)}"'
    if store:
        attrs += f' data-store="{esc(store)}"'
    if course:
        attrs += f' data-course="{esc(course)}"'
    cls = 'growth-button secondary' if secondary else 'growth-button'
    return f'<a class="{cls}" href="{esc(href)}"{attrs}>{esc(label)}</a>'


def route_section(university=True):
    cards = [('/quest/juken/', '中学受験', '理科・社会・国語・算数', 'school', '#246ac0')]
    if university:
        cards.append(('/quest/university/', '大学受験', '情報Ⅰ・数学ⅠA・地理ほか', 'university', '#11796d'))
    cards.append(('/quest/qualifications/', '資格・就職', '宅建・FP・簿記・IT・SPI3', 'qualification', '#7950a8'))
    links = ''.join(f'<a class="growth-route" style="--route-accent:{color}" href="{path}" data-growth-route="{audience}"><strong>{name}<span aria-hidden="true"> →</span></strong><small>{subtitle}</small></a>' for path, name, subtitle, audience, color in cards)
    return '<section class="growth-routes" id="learning-goals" aria-label="学習の目的から選ぶ"><picture class="bg" aria-hidden="true"><img src="/assets/quest/backgrounds/v3-desk.webp" alt="" loading="lazy" decoding="async"></picture><div class="growth-wrap"><p class="growth-label">合格！クエストで、いま学びたいことは？</p><div class="growth-route-grid">' + links + '</div></div></section>'


def faq_html(items):
    return '<section class="growth-section soft"><div class="growth-wrap"><h2>始める前に知りたいこと</h2><div class="growth-faq faq">' + ''.join(f'<details><summary>{esc(q)}</summary><p>{esc(a)}</p></details>' for q, a in items) + '</div></div></section>'


def common_flow(audience):
    first = ('学びたい単元を選ぶ', '学校や参考書で学んだ範囲から。苦手な科目・単元をひとつ選んで始めます。') if audience == 'university' else ('目標の教材を選ぶ', '宅建士・FP・簿記・ITパスポート・SPI3から、いま学びたい教材を選びます。')
    rows = [first, ('短い問題で確かめる', '知っているつもりの言葉や考え方を、問題に答えて確認。迷ったところは解説を読みます。'), ('まちがいを解き直す', 'まちがえた問題にもう一度取り組み、あやふやな知識を確認。学習記録で積み重ねを振り返ります。')]
    return '<section class="growth-section soft"><div class="growth-wrap"><h2>まとまった勉強の合間に、ひとつ復習。</h2><p class="growth-section-lead">参考書や授業で学んだことを、短い演習で確かめる使い方に。通学・通勤や休憩の時間から始められます。</p><div class="growth-flow">' + ''.join(f'<article><h3>{esc(t)}</h3><p>{esc(d)}</p></article>' for t, d in rows) + '</div></div></section>'


def download(audience, config, course=None):
    cpp = config.get('universityCpp') if audience == 'university' else None
    links = button('iPhone・iPadで始める', apple_url(audience, cpp, course), audience, 'growth-download', 'apple', course)
    links += button('Androidで始める', google_url(audience, course), audience, 'growth-download', 'google', course, True)
    return '<section class="growth-section" id="download"><div class="growth-wrap"><h2>学びたい教材から、始めよう。</h2><p class="growth-section-lead">ダウンロード無料。アプリの教材一覧で、目標に合う科目・資格を選べます。</p><div class="growth-actions">' + links + '</div><p class="growth-note">アプリ内課金あり。無料範囲、図鑑・画像・読み上げの対応、利用できる問題・プランは教材や配信版で異なります。現在の利用範囲と価格はアプリ内でご確認ください。</p></div></section>'


def render(route, title, description, body, audience, faqs, items, config, course=None):
    template = (ROOT / 'quest/index.html').read_text()
    header = re.search(r'<header\b.*?</header>', template, re.S).group(0)
    footer = re.search(r'<footer\b.*?</footer>', template, re.S).group(0)
    header = header.replace('/quest/#courses', '/quest/#learning-goals')
    footer = footer.replace('/quest/#courses', '/quest/#learning-goals')
    footer = footer.replace('中学受験・資格・語学を', '中学受験・大学受験・資格・語学を')
    footer = footer.replace('12教材を見る', '教材一覧を見る')
    footer = footer.replace('<nav class="footer-links" aria-label="フッターメニュー">', '<nav class="footer-links" aria-label="フッターメニュー"><a href="/quest/university/">大学受験の6科目</a><a href="/quest/qualifications/">資格・就職の教材</a>')
    crumbs = [{'@type': 'ListItem', 'position': 1, 'name': '合格！クエスト', 'item': BASE + '/quest/'}]
    if course:
        crumbs.append({'@type': 'ListItem', 'position': 2, 'name': '大学受験', 'item': BASE + '/quest/university/'})
    crumbs.append({'@type': 'ListItem', 'position': len(crumbs) + 1, 'name': title.split('｜')[0], 'item': BASE + route})
    graph = [
        {'@type': 'WebPage', '@id': BASE + route + '#page', 'url': BASE + route, 'name': title, 'description': description, 'inLanguage': 'ja', 'dateModified': DAY, 'isPartOf': {'@id': BASE + '/#site'}},
        {'@type': 'SoftwareApplication', '@id': BASE + '/quest/#app', 'name': '合格！クエスト', 'applicationCategory': 'EducationalApplication', 'operatingSystem': 'iOS, iPadOS, Android', 'url': BASE + '/quest/', 'downloadUrl': [APPLE, GOOGLE], 'offers': {'@type': 'Offer', 'price': '0', 'priceCurrency': 'JPY'}},
        {'@type': 'BreadcrumbList', 'itemListElement': crumbs},
        {'@type': 'FAQPage', 'mainEntity': [{'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in faqs]},
    ]
    if items:
        graph.append({'@type': 'ItemList', 'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'name': name, 'url': BASE + path} for i, (name, path) in enumerate(items)]})
    schema = json.dumps({'@context': 'https://schema.org', '@graph': graph}, ensure_ascii=False).replace('</', r'<\/')
    text = f'''<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{esc(title)}</title><meta name="description" content="{esc(description)}"><link rel="canonical" href="{BASE + route}"><meta name="robots" content="index,follow,max-image-preview:large"><meta name="theme-color" content="#235eac"><meta property="og:type" content="website"><meta property="og:site_name" content="合格！クエスト"><meta property="og:locale" content="ja_JP"><meta property="og:title" content="{esc(title)}"><meta property="og:description" content="{esc(description)}"><meta property="og:url" content="{BASE + route}"><meta property="og:image" content="{BASE}/assets/quest/og-quest.jpg"><meta name="twitter:card" content="summary_large_image"><meta name="apple-itunes-app" content="app-id=6775411516"><link rel="icon" href="/assets/quest/icon.webp"><link rel="apple-touch-icon" href="/assets/quest/apple-touch-icon.png"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@500;700;800;900&family=Noto+Sans+JP:wght@400;500;700;900&display=swap" rel="stylesheet"><link rel="stylesheet" href="/assets/quest/quest.css?v=4"><link rel="stylesheet" href="/assets/quest/quest-v3.css?v=5">{STYLE}<script defer src="/assets/quest/quest.js?v=3"></script>{SCRIPT}<script type="application/ld+json">{schema}</script><script async src="https://www.googletagmanager.com/gtag/js?id=G-S57KSMSB8Y"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments)}}gtag('js',new Date());gtag('config','G-S57KSMSB8Y');</script></head>
<body data-course="{esc(course or audience)}"><a class="skip" href="#main">本文へスキップ</a>{header}<main id="main" class="growth-page">{body}{common_flow(audience)}{faq_html(faqs)}{download(audience, config, course)}</main>{footer}<script defer src="/assets/js/visitor-counter.js"></script></body></html>
'''
    dest = ROOT / route.lstrip('/') / 'index.html'
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(text)
    return route


def qualifications(config):
    cards, items = [], []
    for slug, name, cid, group, desc, topic in QUALIFICATIONS:
        path = '/quest/courses/' + slug + '/'
        items.append((name, path))
        cpp = config['qualificationCpp'][group]
        cards.append(f'<article class="growth-course"><span class="growth-topic">{esc(topic)}</span><h3>{esc(name)}</h3><p>{esc(desc)}</p><a class="growth-text-link" href="{path}" data-growth-route="qualification" data-course="{cid}">{esc(name)}の教材・単元を見る →</a><a class="growth-store-link" href="{esc(apple_url("qualification", cpp, cid))}" data-store="apple" data-course="{cid}" data-audience="qualification" data-placement="qualification-card">iPhone・iPadで教材の紹介を見る ↗</a></article>')
    faqs = [
        ('どの資格・就職の教材がありますか？', '宅建士、FP、簿記、ITパスポート、SPI3の教材があります。各教材の詳細ページに学べる分野と単元を掲載しています。英語や運転免許の学科対策も同じアプリから選べます。'),
        ('中学受験をしていない大人でも使えますか？', 'はい。資格・就職の教材は、中学受験の理科・社会・国語・算数とは別に選べます。学びたい教材から始めてください。'),
        ('無料で試せますか？', '無料でダウンロードでき、無料で試せる問題があります。追加問題や機能は教材・プランにより異なります。価格と利用範囲はアプリの購入画面でご確認ください。'),
        ('試験の年度や級はどこで確認できますか？', '教材の単元一覧を確認し、受験する試験の級・年度の範囲と照らし合わせてください。法令や制度が関わる内容は、試験実施団体が案内する基準日と最新の公式情報も確認しましょう。'),
        ('過去問集や公式アプリですか？', '本アプリは独自の問題・解説を使う学習補助アプリです。試験実施団体の公式アプリではなく、合格や得点の向上を保証するものではありません。'),
    ]
    body = '<section class="growth-hero"><div class="growth-wrap growth-hero-inner"><div><span class="growth-kicker">資格・就職の学び直し｜合格！クエスト</span><h1>仕事の合間に、<br>資格の一問を。</h1><p class="growth-lead">宅建士・FP・簿記・ITパスポート・SPI3。<br>図鑑でつながりをつかみ、問題で確かめ、まちがいを解き直す。目標の教材を選んで、自分のペースで学べます。</p><div class="growth-actions">' + button('学びたい資格を選ぶ', '#qualification-courses', 'qualification', 'hero') + button('無料範囲と料金を見る', '/quest/plans/', 'qualification', 'hero', secondary=True) + '</div><p class="growth-note">iPhone・iPad / Android。ダウンロード無料・アプリ内課金あり。</p></div><figure class="growth-cover"><img src="/assets/quest/takken-japan-atlas.webp" alt="宅建士教材の図鑑：権利能力・行為能力" width="788" height="1400" loading="eager"><figcaption>宅建士教材の図鑑の一例。ほかの教材の実画像は詳細ページで確認できます。</figcaption></figure></div></section>'
    body += '<section class="growth-section" id="qualification-courses"><div class="growth-wrap"><h2>いまの目標から選ぶ。</h2><p class="growth-section-lead">資格の知識を身につけたい方も、就職・転職の準備をしたい方も。教材ごとの単元と実画像を確認してから始められます。</p><div class="growth-course-grid">' + ''.join(cards) + '</div><div class="growth-links"><a href="/quest/courses/english/">英語の教材を見る →</a><a href="/quest/courses/driver-license/">運転免許の学科対策を見る →</a></div></div></section>'
    return render('/quest/qualifications/', '資格勉強アプリ｜宅建・FP・簿記・ITパスポート・SPI3｜合格！クエスト', '宅建士・FP・簿記・ITパスポート・SPI3を、図鑑と問題、まちがい直しで学ぶ合格！クエスト。収録単元と実教材を確認し、目標の資格から始められます。', body, 'qualification', faqs, items, config)


def university(config):
    courses = config['universityCourses']
    if not courses:
        return []
    names = '・'.join(c['name'] for c in courses)
    items = [(c['name'], '/quest/university/' + c['slug'] + '/') for c in courses]
    faqs = [
        ('大学受験向けには、どの科目がありますか？', names + 'の6科目があります。中学受験の4科とは別の教材です。各科目のページで収録単元を確認できます。'),
        ('共通テストや大学入試の過去問を収録していますか？', '本アプリは独自作成の問題で知識や考え方を復習する学習補助です。実際の過去問集ではありません。学校・参考書での学習や、志望校の過去問演習と合わせてお使いください。'),
        ('すべての機能や問題を無料で使えますか？', 'ダウンロードは無料ですが、利用できる問題、図鑑、画像、読み上げ、プランの範囲は教材や配信版によって異なります。現在使える範囲はアプリでご確認ください。'),
        ('英語や中学受験の教材も使えますか？', '同じアプリ内に英語や、中学受験の理科・社会・国語・算数の教材があります。数学ⅠAと中学受験の算数は別の教材として選べます。'),
    ]
    cards = ''.join(f'<article class="growth-course"><span class="growth-topic">大学受験・高校の復習</span><h3>{esc(c["name"])}</h3><p>{esc(c["lead"])}</p><a class="growth-text-link" href="/quest/university/{c["slug"]}/" data-growth-route="university" data-course="{c["id"]}">{esc(c["name"])}の収録単元を見る →</a></article>' for c in courses)
    body = '<section class="growth-hero"><div class="growth-wrap growth-hero-inner"><div><span class="growth-kicker">大学受験・共通テストの基礎固め｜合格！クエスト</span><h1 class="growth-university-title"><span>あいまいな理解を、</span><br><span>一問ずつ</span><span>確かな知識に。</span></h1><p class="growth-lead">' + esc(names) + '。<br>授業や参考書で学んだ単元を選んで、問題と解説で確認。まちがい直しを、毎日の復習に。</p><div class="growth-actions">' + button('学びたい科目を選ぶ', '#university-courses', 'university', 'hero') + button('アプリで始める', '#download', 'university', 'hero', secondary=True) + '</div><p class="growth-note">iPhone・iPad / Android。教材の利用範囲はアプリで確認できます。</p></div><figure class="growth-cover"><img src="/assets/quest/university-info-real.png" alt="大学受験の情報Ⅰ：情報の特性と信頼性を学ぶ実際の問題画面" width="1320" height="2868" loading="eager"><figcaption>情報Ⅰ「情報の特性と信頼性の判断」の実画面。画面と画像は問題・配信版により異なります。</figcaption></figure></div></section>'
    body += '<section class="growth-section" id="university-courses"><div class="growth-wrap"><h2>必要な科目・単元から。</h2><p class="growth-section-lead">高校の復習から大学受験の基礎固めまで。試験全体の演習は学校の教材や過去問で進めながら、苦手単元の確認に使えます。</p><div class="growth-course-grid">' + cards + '</div><div class="growth-scope">2026年11月21日確認の配信対象は、この6科目です。公開対象の収録単元を掲載しています。図鑑・問題画像・読み上げの対応や利用できる問題は、教材・配信版によって異なります。</div></div></section>'
    routes = [render('/quest/university/', '大学受験・共通テストの勉強アプリ｜6科目を単元別に復習｜合格！クエスト', '大学受験向けの情報Ⅰ・数学ⅠA・地理・日本史・化学・物理を、短い問題と解説、まちがい直しで復習。合格！クエストの収録単元と学び方を紹介します。', body, 'university', faqs, items, config)]
    for c in courses:
        units = ''.join('<details class="unit-group"><summary><span>' + esc(g['name']) + '</span><small>' + str(len(g['units'])) + '単元 ＋</small></summary><ul>' + ''.join('<li><span>' + esc(u['title']) + '</span></li>' for u in g['units']) + '</ul></details>' for g in c['domains'])
        title = '大学受験 ' + c['name'] + 'の勉強アプリ｜単元別の問題・復習｜合格！クエスト'
        description = c['name'] + 'の収録単元と学び方を紹介。' + c['lead'] + '合格！クエストで、大学受験・高校学習の苦手単元を短い問題から復習できます。'
        body = '<section class="growth-hero"><div class="growth-wrap"><span class="growth-kicker"><a href="/quest/university/">大学受験の教材</a> / ' + esc(c['name']) + '</span><h1>' + esc(c['headline']) + '</h1><p class="growth-lead">' + esc(c['lead']) + '</p><div class="growth-actions">' + button('収録単元を見る', '#units', 'university', 'course-hero', course=c['id']) + button('アプリで始める', '#download', 'university', 'course-hero', course=c['id'], secondary=True) + '</div></div></section>'
        body += '<section class="growth-section" id="units"><div class="growth-wrap"><h2>' + esc(c['name']) + 'で学べる単元</h2><p class="growth-section-lead">' + str(c['unitCount']) + '単元を掲載。知りたい分野を開くと、収録単元を確認できます。</p><div class="unit-groups">' + units + '</div><p class="growth-note">2026年11月21日確認の公開対象教材に基づく単元一覧です。無料・有料の利用範囲、画像・図鑑・音声の対応はアプリでご確認ください。</p><div class="growth-links"><a href="/quest/university/">大学受験の6科目に戻る →</a><a href="/quest/qualifications/">資格・就職の教材を見る →</a></div></div></section>'
        ownfaq = [('この教材では何を学べますか？', c['lead']), *faqs[1:3]]
        routes.append(render('/quest/university/' + c['slug'] + '/', title, description, body, 'university', ownfaq, [], config, c['id']))
    return routes


def update_qualification_links(config):
    changed = []
    for slug, name, cid, group, desc, topic in QUALIFICATIONS:
        rel = 'quest/courses/' + slug + '/index.html'
        path = ROOT / rel
        text = path.read_text()
        url = esc(apple_url('qualification', config['qualificationCpp'][group], cid))
        text = re.sub(r'(href=")https://apps\.apple\.com/jp/app/id6775411516(?:\?[^\"]*)?(\")', lambda m: m[1] + url + m[2], text)
        play_url = esc(google_url('qualification', cid))
        text = re.sub(r'(href=")https://play\.google\.com/store/apps/details\?id=com\.gokakushakaiquest\.app(?:&[^\"]*)?(\")', lambda m: m[1] + play_url + m[2], text)
        def label_store(match):
            tag = re.sub(r'\sdata-audience="[^"]*"', '', match[0])
            return tag[:-1] + ' data-audience="qualification">'
        text = re.sub(r'<a\b[^>]*\bdata-store="(?:apple|google)"[^>]*>', label_store, text)
        text = clear_block(text, 'qualification-related')
        note = f'<div class="growth-related"><a href="/quest/qualifications/">資格・就職の教材を比較する →</a>　宅建士・FP・簿記・ITパスポート・SPI3を、同じアプリで選べます。</div>'
        text = text.replace('</main>', block('qualification-related', note) + '</main>', 1)
        path.write_text(with_assets(text))
        changed.append('/quest/courses/' + slug + '/')
    return changed


def update_entry_pages(config):
    has_uni = bool(config['universityCourses'])
    for rel in ['index.html', 'quest/index.html']:
        path = ROOT / rel
        text = clear_block(path.read_text(), 'routes')
        routes = block('routes', route_section(has_uni))
        if rel == 'quest/index.html':
            text = text.replace('<main id="main">', '<main id="main">' + routes, 1)
        else:
            # Keep the existing brand hero as the first section.
            text = text.replace('</section>', '</section>' + routes, 1)
        if has_uni:
            if rel == 'quest/index.html':
                text = re.sub(r'<p class="mega-line">.*?</p>', '<p class="mega-line"><span class="mega" data-n="18">18</span><span class="mega-unit">教材から選べる</span></p>', text, count=1, flags=re.S)
                text = text.replace('収録数は無料・Pro対象の合計（2026年10月25日時点）', '中学受験4科＋大学受験6科目＋資格・就職5教材＋語学2教材＋運転免許（2026年11月21日確認）')
                text = text.replace('全12教材にイラスト図鑑（6,074ページ）', '図鑑・解説で理解を深める（対応する教材・問題）')
                text = text.replace('12教材が、ひとつのアプリに！', '18教材が、ひとつのアプリに！')
                text = text.replace('全12教材に<b>イラスト図鑑</b>（6,074ページ）', '<b>図鑑・解説</b>で理解を深める（対応する教材・問題）')
                text = text.replace('<small>全12教材</small><b>図鑑</b><small>つき</small>', '<small>図解で</small><b>理解</b><small>を深める</small>')
                text = text.replace('資格・語学・暮らし</span></p>', '大学受験・資格・語学</span></p>')
                text = text.replace('ダウンロード無料。難易度40の問題、図鑑のプレビュー、最初の5単元の読み上げは無料。50・60・70の問題、図鑑の全ページ、読み上げの全対象などはPro。', 'ダウンロード無料。教材ごとに利用できる問題と機能を確認できます。無料・Proの利用範囲はアプリ内の案内をご覧ください。')
                text = text.replace('全12教材図鑑つき', '気になる教材から')
                pattern = r'<dl class="stat-board">.*?</dl>'
                stats = '<dl class="stat-board">' + ''.join(f'<div><dt>{name}</dt><dd><span class="num" data-n="{n}">{n}</span><small>{label}</small></dd></div>' for name,n,label in [('中学受験',4,'理科・社会・国語・算数'),('大学受験',6,'情報Ⅰ・数学ⅠA・地理ほか'),('資格・就職',5,'宅建・FP・簿記・IT・SPI3'),('語学・暮らし',3,'日本語・英語・運転免許')]) + '</dl>'
                text = re.sub(pattern, stats, text, count=1, flags=re.S)
                text = text.replace('<span class="tag-star">12教材</span>', '<span class="tag-star">中学受験・資格・語学・暮らし</span>')
                text = text.replace('>すべて<small aria-hidden="true">12</small>', '>この一覧のすべて<small aria-hidden="true">12</small>')
                text = text.replace('12教材をすべて見る', '中学受験・資格・語学の教材を見る')
                text = text.replace('12教材のどれからでも。', '18教材から選べます。')
                text = text.replace('>12教材を見る<', '>教材一覧を見る<')
                text = text.replace('全12教材にイラスト図鑑。問題画像・イラスト解説・対応問題の読み上げ音声で、基礎から応用まで学べます。無料の問題から始め、学ぶほど広がる王国を育てよう。', '中学受験4科、大学受験6科目、資格・就職、語学の18教材をひとつのアプリで。問題と解説、まちがい直しで、自分の目標に合う学びを続けられます。')
                text = text.replace('2026年10月25日確認の統合版収録データ。無料・Pro対象の合計で、OS・配信版により利用範囲が異なります。単元数は教材ごとの単元を足した数です。', '教材の分類は2026年11月21日確認。教材別の収録数は各ページに確認日を示しています。OS・配信版により利用範囲が異なります。')
            else:
                text = text.replace('理科・社会・国語・算数に、宅建士・FP・簿記・ITパスポート・SPI3・日本語・英語・運転免許を加えた12教材を、ひとつのアプリで学べます。', '理科・社会・国語・算数の中学受験4科に、情報Ⅰ・数学ⅠA・地理・日本史・化学・物理の大学受験6科目、資格・就職・語学・運転免許を加えた18教材を、ひとつのアプリで選べます。')
                text = text.replace('全12教材にイラスト図鑑（6,074ページ）', '図鑑・解説で理解を深める（対応する教材・問題）')
                text = text.replace('12教材をひとつのアプリで', '受験・資格・語学の18教材をひとつに')
                text = text.replace('12教材の学習アプリ', '18教材の学習アプリ')
                text = text.replace('<span>教材</span><b>12</b>', '<span>教材</span><b>18</b>')
                text = re.sub(r'<dl class="flag-nums">.*?</dl>', '<dl class="flag-nums"><div><dt>教材</dt><dd>18</dd></div><div><dt>中学受験</dt><dd>4科</dd></div><div><dt>大学受験</dt><dd>6科</dd></div></dl>', text, count=1, flags=re.S)
                text = text.replace('<dt>合格！クエストの問題</dt><dd><span class="num">99,075</span><small>問（12教材の合計）</small>', '<dt>合格！クエストの教材</dt><dd><span class="num">18</span><small>中学受験・大学受験・資格・語学</small>')
                text = text.replace('2026年10月25日時点の App Store（日本）の公開情報と、合格！クエストの収録データ。もちのへやは審査中のため数に含めていません。', 'アプリ数・評価・更新日は2026年10月25日時点の App Store（日本）の情報です。合格！クエストの18教材は2026年11月21日確認。')
        path.write_text(with_assets(text))
    return ['/', '/quest/']


def update_indexes(routes, changed, config):
    path = ROOT / 'docs/quest/pages.json'
    pages = json.loads(path.read_text())
    path.write_text(json.dumps(list(dict.fromkeys(pages + routes)), ensure_ascii=False, indent=2) + '\n')
    path = ROOT / 'sitemap.xml'
    text = path.read_text()
    for route in dict.fromkeys(routes + changed):
        url = BASE + route
        pattern = r'<url>\s*<loc>' + re.escape(url) + r'</loc>.*?</url>'
        entry = f'<url><loc>{url}</loc><lastmod>{DAY}</lastmod></url>'
        if re.search(pattern, text, re.S):
            text = re.sub(pattern, lambda _: entry, text, flags=re.S)
        else:
            text = text.replace('</urlset>', '  ' + entry + '\n</urlset>')
    path.write_text(text)
    uni_names = '・'.join(c['name'] for c in config['universityCourses'])
    section = f'## 合格！クエストの学習目的別ガイド（{DAY}確認）\n\n合格！クエストは、中学受験4科、大学受験6科目、資格・就職5教材、語学2教材、運転免許の18教材を選べる学習アプリです。ダウンロード無料、アプリ内課金あり。問題、図鑑、画像、読み上げ、プランの利用範囲は教材と配信版で異なるため、アプリ内の案内を確認してください。\n\n- [中学受験4科]({BASE}/quest/juken/)：理科・社会・国語・算数。従来の教科別ページを継続。\n- [大学受験の6科目]({BASE}/quest/university/)：{uni_names}。独自作成の問題・解説を使う復習用教材で、過去問集ではありません。\n- [資格・就職]({BASE}/quest/qualifications/)：宅建士・FP・簿記・ITパスポート・SPI3。\n'
    section += ''.join(f'- [大学受験 {c["name"]}]({BASE}/quest/university/{c["slug"]}/)：{c["unitCount"]}単元。{c["lead"]}\n' for c in config['universityCourses'])
    section += '\n受験する試験の全範囲の網羅や合格・得点向上を保証するものではありません。以前の12教材・99,075問・6,074図鑑ページという数値は2026年10月25日の旧スナップショットであり、18教材の現在の合計ではありません。\n'
    for rel in ['llms.txt', 'llms-full.txt']:
        path = ROOT / rel
        text = path.read_text()
        text = re.sub(r'\n<!-- quest-growth:facts:start -->.*?<!-- quest-growth:facts:end -->\n?', '', text, flags=re.S)
        text = text.replace('one study app with 12 courses (Japanese entrance-exam science, social studies, Japanese and math, plus certifications, Japanese, English and driving theory)', 'one study app with 18 courses for Japanese junior-high and university entrance exams, certifications, languages and driving theory')
        text = re.sub(r'^- Gokaku! Quest: 12 courses,.*$', '- Gokaku! Quest: 18 courses as of 2026-11-21. Current course scope and availability: https://trailfusionai.com/quest/ .', text, flags=re.M)
        text = text.replace('[12 course guides]', '[course guides]').replace('12 courses in one app.', '18 courses in one app.')
        text = re.sub(r'^無料: 各単元の.*$', 'ダウンロード無料・アプリ内課金あり。利用できる問題・機能・プランは教材や配信版によって異なります。現在の利用範囲と価格はアプリ内の案内・購入画面でご確認ください。', text, flags=re.M)
        text = text.replace('[12教材の一覧]', '[中学受験・資格・語学等の教材一覧]')
        text += '\n' + block('facts', section) + '\n'
        path.write_text(text)


def apply():
    config = json.loads((ROOT / 'docs/quest/growth-release.json').read_text())
    assert len(config['universityCourses']) == 6, 'Confirm the six publicly delivered university courses before rendering.'
    routes = [qualifications(config), *university(config)]
    changed = update_qualification_links(config) + update_entry_pages(config)
    update_indexes(routes, changed, config)
    from growth_enrichment import apply as enrich
    enrich(config)
    from material_gallery import apply as add_materials
    add_materials()
    print(json.dumps({'growthPages': routes, 'updatedEntryPages': changed, 'protectedEntranceExamPages': 'dedicated pages unchanged; FAQ/plans current course counts corrected by material layer', 'asOf': DAY}, ensure_ascii=False))


if __name__ == '__main__':
    apply()
