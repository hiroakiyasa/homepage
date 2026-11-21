"""Add verified material previews and three useful study pages to the existing site.

Only the marked additions and explicitly documented count corrections are owned
by this layer. Existing page titles, H1s, canonicals, and middle-school LPs stay.
"""
from pathlib import Path
from html import escape
import json
import re

ROOT = Path(__file__).resolve().parents[2]
BASE = 'https://trailfusionai.com'
STYLE = '<link rel="stylesheet" href="/assets/quest/quest-materials.css?v=20261121">'
GROUPS = [('school', '中学受験の4科', '/quest/juken/'), ('university', '大学受験の6科目', '/quest/university/'), ('qualification', '資格・就職・運転免許', '/quest/qualifications/'), ('language', '日本語と英語', '/quest/languages/')]
DAY = '2026-11-21'


def esc(x):
    return escape(str(x), quote=True)


def read_json(name):
    return json.loads((ROOT / 'docs/quest' / name).read_text())


def mark(name, content):
    return f'<!-- quest-material:{name}:start -->{content}<!-- quest-material:{name}:end -->'


def clear(text, name):
    return re.sub(r'<!-- quest-material:' + re.escape(name) + r':start -->.*?<!-- quest-material:' + re.escape(name) + r':end -->', '', text, flags=re.S)


def assets(text):
    return clear(text, 'assets').replace('</head>', mark('assets', STYLE) + '</head>', 1)


def image(a, extra='', eager=False):
    return f'<img src="{esc(a["src"])}" width="{a["width"]}" height="{a["height"]}" alt="{esc(a["alt"])}" loading="{"eager" if eager else "lazy"}" decoding="async" {extra}>'


def art_picture(a):
    small, large = a['variants']
    return f'<picture aria-hidden="true"><img src="{small["src"]}" srcset="{small["src"]} 768w, {large["src"]} 1536w" sizes="(max-width:640px) 100vw, (max-width:800px) 48vw, 380px" width="1536" height="1024" alt="" loading="lazy" decoding="async"></picture>'


def link(label, href, primary=False):
    return f'<a class="material-link{" primary" if primary else ""}" href="{esc(href)}">{esc(label)}</a>'


def art_entry(data):
    descriptions = {
        'school': ('中学受験', '理科・社会・国語・算数。単元の復習やまちがい直しを、図鑑と問題から。', '/quest/juken/', '/quest/study/science-observation/', '理科の観察・実験を3問で復習'),
        'university': ('大学受験', '情報Ⅰ・数学ⅠA・地理・日本史・化学・物理。授業で学んだ内容を一問ずつ確認。', '/quest/university/', '/quest/study/information-binary/', '情報Ⅰの二進数・ビットを3問で確認'),
        'qualification': ('資格・就職', '簿記・FP・宅建士・ITパスポート・SPI3。目標の教材を選び、すきま時間に演習。', '/quest/qualifications/', '/quest/study/bookkeeping-journal/', '簿記3級の仕訳を3問で確認'),
    }
    cards = []
    for a in data['decorativeArt']:
        name, desc, route, sample, label = descriptions[a['group']]
        cards.append('<article class="material-art-card">' + art_picture(a) + '<div class="material-art-copy"><h3>' + name + '</h3><p>' + desc + '</p><a href="' + route + '">' + name + 'の教材を見る →</a><a href="' + sample + '">' + label + ' →</a></div></article>')
    return '<section class="material-section material-entry" aria-label="問題を見て学習の目的から選ぶ"><div class="material-wrap"><h2>いまの目標に、学ぶ楽しさを。</h2><p class="material-section-lead">中学受験をめざす子どもから、高校生、資格を学ぶ大人まで。まずは実際の教材と例題を見て、自分に合う学び方を確かめてください。</p><div class="material-art-grid">' + ''.join(cards) + '</div><div class="material-actions">' + link('18教材の問題・図鑑を大きく見る', '/quest/materials/', True) + link('日本語・英語の教材を見る', '/quest/languages/') + '</div></div></section>'


def study_links(copy):
    cards = ''.join('<article class="material-guide-card"><h3><a href="' + p['route'] + '">' + esc(p['h1']) + '</a></h3><p>' + esc(p['description']) + '</p>' + link('例題3問と解説を読む', p['route']) + '</article>' for p in copy['pages'])
    return '<section class="material-section"><div class="material-wrap"><h2>まず3問。考え方を確かめよう。</h2><p class="material-section-lead">アプリの実際の問題を、このページでも読めます。答え合わせだけで終わらず、解説から次の復習につなげましょう。</p><div class="material-guide-grid">' + cards + '</div></div></section>'


def material_card(c):
    primary = c[c['primary']]
    a = primary['asset']
    is_question = c['primary'] == 'question'
    kind = '問題の図解' if is_question else '図鑑'
    topic = primary['unitTitle'] if is_question else primary['title']
    stem = '<p class="material-stem">' + esc(primary['question']['question']) + '</p>' if is_question else ''
    secondary = ''
    if is_question and c.get('atlas', {}).get('asset'):
        atlas = c['atlas']
        secondary = '<details class="material-extra"><summary>この教材の図鑑も見る</summary><figure class="material-figure"><a class="material-visual" href="' + atlas['asset']['src'] + '" aria-label="' + esc(atlas['asset']['alt'] + 'を原寸で開く') + '">' + image(atlas['asset']) + '</a><figcaption>' + esc(atlas['title']) + '。画像をタップすると原寸で開きます。</figcaption></figure></details>'
    return '<article class="material-card" id="' + c['courseId'] + '"><div class="material-card-head"><span class="material-kind">実際の' + kind + '</span><h3>' + esc(c['title']) + '</h3><p class="material-topic">' + esc(topic) + '</p></div><figure class="material-figure"><a class="material-visual" href="' + a['src'] + '" aria-label="' + esc(a['alt'] + 'を原寸で開く') + '">' + image(a) + '</a><figcaption>教材に使われている' + kind + 'です。画像をタップすると原寸で開きます。</figcaption></figure><div class="material-card-body">' + stem + secondary + '<div class="material-actions">' + link('教材と単元を見る', c['href'], True) + link('アプリで学ぶ', '#download') + '</div></div></article>'


def download(audience, course=None, heading='気になる教材から、始めよう。', body='アプリの教材一覧で、学びたい科目や資格を選べます。'):
    import growth
    return '<section class="material-section" id="download"><div class="material-wrap"><h2>' + esc(heading) + '</h2><p class="material-section-lead">' + esc(body) + '</p><div class="growth-actions">' + growth.button('iPhone・iPadで始める', growth.apple_url(audience, None, course), audience, 'material-download', 'apple', course) + growth.button('Androidで始める', growth.google_url(audience, course), audience, 'material-download', 'google', course, True) + '</div><p class="material-note">ダウンロード無料・アプリ内課金あり。無料で試せる問題があります。図鑑・問題画像・読み上げ、学べる範囲やプランは教材・配信版により異なります。現在の利用範囲と価格はアプリでご確認ください。</p></div></section>'


def faq(items):
    return '<section class="material-section"><div class="material-wrap"><h2>よくある質問</h2><div class="material-faq">' + ''.join('<details><summary>' + esc(q) + '</summary><p>' + esc(a) + '</p></details>' for q, a in items) + '</div></div></section>'


def render(route, title, description, body, faqs, image_src, course=None):
    template = (ROOT / 'quest/index.html').read_text()
    head = re.search(r'<head\b[^>]*>(.*?)</head>', template, re.S).group(1)
    # Reuse only common style/navigation plumbing. Metadata is specific to this page.
    styles = ''.join(re.findall(r'<link\b(?=[^>]*rel="(?:stylesheet|preconnect|icon|apple-touch-icon)")[^>]*>', head))
    if '/assets/quest/quest-growth.css' not in styles:
        styles += '<link rel="stylesheet" href="/assets/quest/quest-growth.css?v=20261121">'
    if '/assets/quest/quest-materials.css' not in styles:
        styles += STYLE
    header = re.search(r'<header\b.*?</header>', template, re.S).group(0)
    footer = re.search(r'<footer\b.*?</footer>', template, re.S).group(0)
    crumbs = [{'@type': 'ListItem', 'position': 1, 'name': '合格！クエスト', 'item': BASE + '/quest/'}]
    if route != '/quest/materials/':
        crumbs.append({'@type': 'ListItem', 'position': 2, 'name': '実際の問題と図鑑', 'item': BASE + '/quest/materials/'})
    crumbs.append({'@type': 'ListItem', 'position': len(crumbs) + 1, 'name': title.split('｜')[0], 'item': BASE + route})
    graph = [{'@type': 'WebPage', '@id': BASE + route + '#page', 'url': BASE + route, 'name': title, 'description': description, 'inLanguage': 'ja', 'dateModified': DAY, 'isPartOf': {'@id': BASE + '/#site'}, 'primaryImageOfPage': {'@type': 'ImageObject', 'url': BASE + image_src}}, {'@type': 'BreadcrumbList', 'itemListElement': crumbs}]
    if faqs:
        graph.append({'@type': 'FAQPage', 'mainEntity': [{'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in faqs]})
    schema = json.dumps({'@context': 'https://schema.org', '@graph': graph}, ensure_ascii=False).replace('</', '<\\/')
    text = f'''<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{esc(title)}</title><meta name="description" content="{esc(description)}"><link rel="canonical" href="{BASE + route}"><meta name="robots" content="index,follow,max-image-preview:large"><meta name="theme-color" content="#235eac"><meta property="og:type" content="website"><meta property="og:site_name" content="合格！クエスト"><meta property="og:locale" content="ja_JP"><meta property="og:title" content="{esc(title)}"><meta property="og:description" content="{esc(description)}"><meta property="og:url" content="{BASE + route}"><meta property="og:image" content="{BASE + image_src}"><meta name="twitter:card" content="summary_large_image"><meta name="apple-itunes-app" content="app-id=6775411516">{styles}<script defer src="/assets/quest/quest.js?v=3"></script><script type="application/ld+json">{schema}</script><script async src="https://www.googletagmanager.com/gtag/js?id=G-S57KSMSB8Y"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments)}}gtag('js',new Date());gtag('config','G-S57KSMSB8Y');</script></head><body data-course="{esc(course or 'all')}"><a class="skip" href="#main">本文へスキップ</a>{header}<main id="main" class="material-page">{body}</main>{footer}<script defer src="/assets/js/visitor-counter.js"></script></body></html>
'''
    dest = ROOT / route.strip('/') / 'index.html'
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(text)


def gallery(data, copy):
    title = '中学受験・大学受験・資格の実際の問題と図鑑｜18教材の合格！クエスト'
    description = '中学受験4科、大学受験6科目、資格・就職・語学など18教材の実際の問題図解と図鑑を大きく掲載。例題と解説で学び方を確認してから、合格！クエストを始められます。'
    body = '<section class="material-hero"><div class="material-wrap"><nav class="material-breadcrumb" aria-label="パンくず"><a href="/quest/">合格！クエスト</a><span>›</span><span>実際の問題と図鑑</span></nav><p class="material-eyebrow">18教材の実教材を、じっくり確認</p><h1>実際の問題と図鑑で、<br>学び方を見てみよう。</h1><p class="material-lead">中学受験の4科も、大学受験の6科目も、資格・就職・語学の学習も。教材で使う図解と図鑑を、大きな画像で紹介します。</p><nav class="material-nav" aria-label="教材の分野">' + ''.join('<a href="#' + group + '">' + label + '</a>' for group, label, route in GROUPS) + '</nav><p class="material-note">掲載する画像は実際の教材素材です。アプリの画面全体ではありません。問題・図鑑の対応と無料・有料の利用範囲は、教材や配信版で異なります。</p></div></section>'
    body += study_links(copy)
    for group, label, route in GROUPS:
        body += '<section class="material-section" id="' + group + '"><div class="material-wrap"><h2>' + label + '</h2><p class="material-section-lead"><a href="' + route + '">' + label + 'の教材ガイドを見る →</a></p><div class="material-grid">' + ''.join(material_card(c) for c in data['courses'] if c['group'] == group) + '</div></div></section>'
    faqs = [('画像は実際にアプリで使う教材ですか？', 'はい。公開対象の教材で使われている問題の図解・図鑑から選んでいます。このページでは画像を見やすい大きさで掲載しており、アプリの画面全体を再現したものではありません。'), ('大学受験向けには何がありますか？', '情報Ⅰ・数学ⅠA・地理・日本史・化学・物理の6科目です。高校の授業や参考書で学んだ単元を、問題と解説で復習するための教材です。実際の過去問集や試験全範囲の網羅を表すものではありません。'), ('英語の解説で学べる教材はどれですか？', '英語の解説に対応する語学教材は、日本語クエスト（Japanese Quest）とEnglish Questです。日本語の中学受験・大学受験・資格教材がすべて英語で学べるわけではありません。一部の画面表示や図解には日本語が残っています。'), ('このページの画像や例題はアプリで全部無料ですか？', 'このウェブページでは見本を閲覧できますが、アプリ内の利用権とは異なります。アプリには無料で試せる問題があり、追加問題や図鑑などの利用条件は教材・プランによって異なります。アプリ内で範囲と価格をご確認ください。')]
    body += faq(faqs) + download('general')
    render('/quest/materials/', title, description, body, faqs, '/assets/quest/materials/junior-science-question.webp')


def study_pages(copy, samples, data):
    courses = {c['courseId']: c for c in data['courses']}
    sample_pages = {p['slug']: p for p in samples['pages']}
    routes = []
    for p in copy['pages']:
        questions = sample_pages[p['slug']]['questions']
        c = courses[p['courseId']]
        body = '<section class="material-hero"><div class="material-wrap"><nav class="material-breadcrumb" aria-label="パンくず"><a href="/quest/">合格！クエスト</a><span>›</span><a href="/quest/materials/">実際の問題と図鑑</a><span>›</span><span>' + esc(p['h1']) + '</span></nav><p class="material-eyebrow">実際の教材から、3問と解説</p><h1>' + esc(p['h1']) + '</h1><p class="material-lead">' + esc(p['lead']) + '</p><div class="material-actions">' + link('3問に取り組む', '#samples', True) + link(c['title'] + 'の単元を見る', c['href']) + '</div><p class="material-note">合格！クエスト独自の学習問題です。試験実施団体の公式問題・過去問ではありません。</p></div></section>'
        body += '<section class="material-section" id="samples"><div class="material-wrap"><h2>' + esc(p['sampleHeading']) + '</h2><p class="material-section-lead">選択肢を見て考えてから「答えと解説を読む」を開きましょう。問題文・選択肢・ヒント・解説は実際の教材のまま掲載しています。</p>'
        if p.get('sampleAccessNote'):
            body += '<p class="material-inline-note">' + esc(p['sampleAccessNote']) + '</p>'
        for i, q in enumerate(questions):
            raw = q['question']
            opts = raw['options']
            def option(o):
                return (o.get('label', '') + (' ' + o['sub'] if o.get('sub') else '')) if isinstance(o, dict) else str(o)
            figure = image(q['websiteImage'], 'class="sample-image"') if q.get('websiteImage') else ''
            body += '<article class="material-sample" data-source-question="' + esc(q['sourceId']) + '"><p class="material-eyebrow">例題 ' + str(i+1) + ' / ' + esc(q['unitTitle']) + '</p><h3>' + esc(p['sampleLabels'][i]) + '</h3><p class="material-sample-question">' + esc(raw['question']) + '</p>' + figure + '<ol class="material-options">' + ''.join('<li>' + esc(option(o)) + '</li>' for o in opts) + '</ol><details class="material-answer"><summary>答えと解説を読む</summary><p class="correct">正解：' + str(raw['correctIndex']+1) + '．' + esc(option(opts[raw['correctIndex']])) + '</p><p><strong>ヒント</strong><br>' + esc(raw.get('hint', '')) + '</p><p><strong>解説</strong><br>' + esc(raw['explanation']) + '</p></details></article>'
        body += '</div></section><section class="material-section"><div class="material-wrap"><h2>解いたあとは、考え方を整理。</h2><div class="material-learning-steps">'
        for section in p['sections']:
            body += '<article><h3>' + esc(section['heading']) + '</h3>' + ''.join('<p>' + esc(t) + '</p>' for t in section['paragraphs']) + '</article>'
        body += '</div>'
        if p.get('comparison'):
            t = p['comparison']
            body += '<div class="material-comparison"><table><caption>5ビットで、何を数えるか</caption><thead><tr>' + ''.join('<th scope="col">' + esc(x) + '</th>' for x in t['headers']) + '</tr></thead><tbody>'
            for row in t['rows']:
                body += '<tr>' + ''.join('<' + ('th scope="row"' if i == 0 else 'td') + ' data-label="' + esc(t['headers'][i]) + '">' + esc(value) + '</' + ('th' if i == 0 else 'td') + '>' for i, value in enumerate(row)) + '</tr>'
            body += '</tbody></table></div>'
        body += '</div></section><section class="material-section"><div class="material-wrap"><h2>次の復習につなげる3ステップ</h2><ol class="material-practice-list">' + ''.join('<li>' + esc(step) + '</li>' for step in p['practiceSteps']) + '</ol><div class="material-actions">' + link(c['title'] + 'の教材を見る', c['href'], True) + link('ほかの教材の実画像を見る', '/quest/materials/') + '</div></div></section>'
        faqs = [(x['question'], x['answer']) for x in p['faqs']]
        body += faq(faqs)
        body += '<section class="material-section"><div class="material-wrap"><h2>学習範囲を確認するための公式情報</h2><p class="material-section-lead">下記は学習・試験の範囲を確認するための参考先です。このページの例題の出典とは異なります。</p><ul class="material-reference-list">' + ''.join('<li><a href="' + esc(r['url']) + '">' + esc(r['label']) + '</a><p>' + esc(r['role']) + '</p></li>' for r in p['references']) + '</ul></div></section>'
        body += download(p['audience'], p['courseId'], p['ctaHeading'], p['ctaBody'])
        preview = questions[0]['websiteImage']['src'] if questions[0].get('websiteImage') else '/assets/quest/og-quest.jpg'
        render(p['route'], p['title'], p['description'], body, faqs, preview, p['courseId'])
        routes.append(p['route'])
    return routes


def add_block(path, name, content, after=None):
    text = clear(path.read_text(), name)
    block = mark(name, content)
    if after and after in text:
        text = text.replace(after, after + block, 1)
    else:
        assert '</main>' in text
        text = text.replace('</main>', block + '</main>', 1)
    path.write_text(assets(text))


def hub_catalog(data):
    path = ROOT / 'quest/index.html'
    text = clear(clear(path.read_text(), 'university-cards'), 'university-filter')
    cards = []
    for c in data['courses']:
        if c['group'] != 'university':
            continue
        a = c[c['primary']]['asset']
        unit_label = '48単元＋模試4回' if c['courseId'] == 'math-ia-kyotsu-japan' else str(c['unitCount']) + '単元'
        cards.append('<a class="ccard" data-course-category="university" href="' + c['href'] + '" style="--c:#11796d"><div class="ccard-img material-catalog-img">' + image(a) + '</div><div class="ccard-body"><small>大学受験</small><h3>' + esc(c['title'].replace('大学受験・', '')) + '</h3><p class="material-catalog-count">' + unit_label + '</p><p>授業・参考書で学んだ単元を、問題と解説で復習。</p><span class="ccard-go">くわしく見る<b aria-hidden="true">→</b></span></div></a>')
    pattern = r'(<div class="ccard-grid">.*?)(</div>\s*<p\b[^>]*\bdata-course-count)'
    assert re.search(pattern, text, re.S), 'Catalog anchor missing'
    text = re.sub(pattern, lambda m: m[1] + mark('university-cards', ''.join(cards)) + m[2], text, count=1, flags=re.S)
    filter_html = '<button class="filter" data-filter="university" aria-pressed="false" style="--c:#11796d">大学受験<small aria-hidden="true">6</small></button>'
    pattern = r'(<button\b[^>]*data-filter="school".*?</button>)'
    text = re.sub(pattern, lambda m: m[0] + mark('university-filter', filter_html), text, count=1, flags=re.S)
    text = re.sub(r'(data-filter="all"[^>]*>この一覧のすべて<small[^>]*>)12(</small>)', r'\g<1>18\2', text)
    text = text.replace('12教材を表示しています', '18教材を表示しています')
    text = text.replace('普通免許の学科対策を無料で学習。', '普通免許の学科対策を、短い問題で学習。')
    text = text.replace('<span class="tag-star">中学受験・資格・語学・暮らし</span>', '<span class="tag-star">中学受験・大学受験・資格・語学・暮らし</span>')
    text = text.replace('<h2>受験のあとも、<br><mark>大人の資格や語学も。</mark></h2>', '<h2>中学受験から大学受験、<br><mark>大人の資格や語学も。</mark></h2>')
    # The existing table uses distinct question counts, not duplicated unit totals.
    counts = read_json('released-gallery-counts.json')['courses']
    for c in data['courses']:
        if c['group'] == 'university':
            continue
        pattern = r'(<a\b[^>]*class="ccard"[^>]*href="' + re.escape(c['href']) + r'"[^>]*>)(.*?)(</a>)'
        def count_card(m):
            inner = m[2]
            for label, value in [('問題', counts[c['courseId']]['uniqueQuestionCount']), ('図鑑', counts[c['courseId']]['pageCount']), ('単元', counts[c['courseId']]['unitCount'])]:
                inner = re.sub(r'(<dt>' + label + r'</dt><dd>)[0-9,]+(</dd>)', lambda z: z[1] + format(value, ',') + z[2], inner, count=1)
            return m[1] + inner + m[3]
        text = re.sub(pattern, count_card, text, count=1, flags=re.S)
    old = '数字は2026年10月25日確認の統合版収録データ（無料・Pro対象を含む）。教材一覧はiOS公開版を基準にしています。Androidで使える教材・機能はストアとアプリでご確認ください。運転免許教材は無料です。'
    new = '数字は2026年11月21日確認の公開対象教材に基づきます（無料・有料範囲を含む）。同じ問題が複数の単元に登場する場合、問題数は重複を除いています。数学ⅠAは48単元と独自の模試4回です。教材・機能の利用範囲は配信版とアプリ内でご確認ください。'
    text = text.replace(old, new)
    path.write_text(assets(text))


def minimal_factual_corrections():
    old_answer = '中学受験の理科・社会・国語・算数に加え、ITパスポート・FP・簿記・宅建士・SPI3・日本語・英語・運転免許まで、全12教材を1つのアプリで学べる学習アプリです。すべての教材にイラスト図鑑があり、学習すると王国マップの街づくりが進みます。'
    new_answer = '中学受験の理科・社会・国語・算数、大学受験の情報Ⅰ・数学ⅠA・地理・日本史・化学・物理に加え、ITパスポート・FP・簿記・宅建士・SPI3・日本語・英語・運転免許まで、全18教材を1つのアプリで学べる学習アプリです。図鑑・画像の対応は教材や問題により異なります。学習すると王国マップの街づくりが進みます。'
    for rel in ['quest/faq/index.html', 'quest/plans/index.html']:
        path = ROOT / rel
        text = path.read_text().replace(old_answer, new_answer)
        text = text.replace('12教材のどれからでも。', '18教材のどれからでも。').replace('12教材を見る', '18教材を見る')
        path.write_text(text)


def enrichment(data, copy):
    for rel in ['index.html', 'quest/index.html']:
        add_block(ROOT / rel, 'visual-entry', art_entry(data), '<!-- quest-growth:routes:end -->')
    for group, route, sample in [('university', 'quest/university/index.html', copy['pages'][1]), ('qualification', 'quest/qualifications/index.html', copy['pages'][2])]:
        a = next(x for x in data['decorativeArt'] if x['group'] == group)
        body = '<section class="material-section"><div class="material-wrap"><div class="material-band">' + art_picture(a) + '<div><h2>実際の問題で、学び方を確認。</h2><p class="material-inline-note">' + esc(sample['description']) + '</p><div class="material-actions">' + link('例題3問と解説を読む', sample['route'], True) + link('実際の問題・図鑑を見る', '/quest/materials/#' + group) + '</div></div></div></div></section>'
        add_block(ROOT / route, 'sample-band', body)
    for c in data['courses']:
        if c['group'] != 'university':
            continue
        a = c[c['primary']]['asset']
        text = '<section class="material-section"><div class="material-wrap material-mini-preview"><a href="/quest/materials/#' + c['courseId'] + '">' + image(a) + '</a><div><h2>' + esc(c['title'].replace('大学受験・', '')) + 'の教材を、大きな画像で。</h2><p class="material-inline-note">教材で使う実際の図解や図鑑を見て、復習のイメージを確かめてください。</p><div class="material-actions">' + link('問題・図鑑の見本を見る', '/quest/materials/#' + c['courseId'], True)
        if c['courseId'] == 'joho1-kyotsu-japan':
            text += link('二進数・ビットの例題3問', '/quest/study/information-binary/')
        text += '</div></div></div></section>'
        add_block(ROOT / c['href'].strip('/') / 'index.html', 'actual-preview', text)


def indexes(routes):
    page_file = ROOT / 'docs/quest/pages.json'
    values = json.loads(page_file.read_text())
    for route in routes:
        if route not in values:
            values.append(route)
    page_file.write_text(json.dumps(values, ensure_ascii=False, indent=2) + '\n')
    path = ROOT / 'sitemap.xml'
    text = path.read_text()
    for route in routes:
        if '<loc>' + BASE + route + '</loc>' not in text:
            text = text.replace('</urlset>', '<url><loc>' + BASE + route + '</loc><lastmod>' + DAY + '</lastmod></url>\n</urlset>')
    path.write_text(text)
    path = ROOT / 'llms.txt'
    text = clear(path.read_text(), 'study-links').rstrip()
    links = '\n\n## Actual material previews and learning examples\n\n- [実際の問題と図鑑：18教材](https://trailfusionai.com/quest/materials/)\n- [中学受験理科：観察・実験の3問](https://trailfusionai.com/quest/study/science-observation/)\n- [情報Ⅰ：二進数・ビットの3問](https://trailfusionai.com/quest/study/information-binary/)\n- [簿記3級：仕訳の3問](https://trailfusionai.com/quest/study/bookkeeping-journal/)\n\nThe previews show real released teaching materials, not reconstructed native app screens. The three study pages retain original questions and explanations, provide extra study guidance, and link to relevant courses. Website samples are not proof of free access to every corresponding app lesson. Original study questions are not official past exam questions. Public visible HTML is the primary source.\n'
    path.write_text(text + '\n' + mark('study-links', links) + '\n')


def apply():
    if not (ROOT / 'docs/quest/study-samples.json').exists():
        return []
    data, copy, samples = read_json('material-gallery.json'), read_json('study-pages-copy.json'), read_json('study-samples.json')
    assert len(data['courses']) == 18
    minimal_factual_corrections()
    hub_catalog(data)
    enrichment(data, copy)
    gallery(data, copy)
    routes = ['/quest/materials/', *study_pages(copy, samples, data)]
    indexes(routes)
    return routes


if __name__ == '__main__':
    print(json.dumps({'routes': apply()}, ensure_ascii=False))
