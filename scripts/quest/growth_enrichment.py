"""Enrich released university courses and the two global language courses.

Additive, idempotent layer over the published HTML. Do not rebuild or modify
protected middle-school pages. Copy is authored in ChatGPT; no translation API.
"""
from pathlib import Path
from urllib.parse import urlencode
import html
import json
import re

ROOT = Path(__file__).resolve().parents[2]
BASE = 'https://trailfusionai.com'
DAY = '2026-11-21'
VERSION = '20261121-global'
APPLE = 'https://apps.apple.com/app/id6775411516'
GOOGLE = 'https://play.google.com/store/apps/details?id=com.gokakushakaiquest.app'
LANGUAGE_ROUTES = {'ja': '/quest/languages/', 'en': '/en/quest/'}
COURSES = [
    {
        'id': 'japanese-everyday', 'name': 'Japanese Quest', 'ja': '日本語クエスト',
        'enPath': '/en/japanese-quest.html', 'jaPath': '/quest/courses/japanese/',
        'image': 'japanese-everyday-atlas.webp',
        'enLead': 'Build Japanese for daily life. Review vocabulary, grammar and reading with short quizzes, explanations and illustrated guides.',
        'jaLead': '生活で使う日本語を、短い問題・解説・図鑑で。語彙・文法・読解を、自分の目標に合うコースから学べます。',
        'enTracks': ['Everyday Japanese: A1 to B1', 'JLPT study tracks: N5 to N1', 'JFT-Basic study track'],
        'jaTracks': ['生活日本語：A1〜B1', 'JLPT対策：N5〜N1', 'JFT-Basic対策'],
        'enCaption': 'A sample illustrated guide from the Japanese course, with Japanese and English text.',
        'jaCaption': '日本語教材の図鑑の一例。表示言語や利用範囲はアプリ内で確認できます。',
        'enLanguage': 'The learning language is Japanese. English explanations are available in supported content.',
        'jaLanguage': '学習する言語は日本語です。対応する内容では英語の解説も利用できます。',
    },
    {
        'id': 'english-travel', 'name': 'English Quest', 'ja': 'イングリッシュクエスト',
        'enPath': '/en/eigo-quest.html', 'jaPath': '/quest/courses/english/',
        'image': 'english-travel-atlas.webp',
        'enLead': 'Build English vocabulary, grammar and reading skills. Practise useful expressions for travel, work and everyday life.',
        'jaLead': '語彙・文法・読解から、旅行・仕事・日常の表現へ。学びたい分野を選び、短い問題で英語の知識を確かめられます。',
        'enTracks': ['Phonics, vocabulary and grammar', 'Conversation expressions and idioms', 'Reading and writing topics'],
        'jaTracks': ['フォニックス・語彙・文法', '会話表現・イディオム', '読解・ライティングのテーマ'],
        'enCaption': 'A sample illustrated guide from the English course, shown with Japanese explanations.',
        'jaCaption': '英語教材の図鑑の一例。ここでは日本語の解説を表示しています。',
        'enLanguage': 'The learning language is English. English and Japanese explanations are supported; availability varies by content and version.',
        'jaLanguage': '学習する言語は英語です。英語・日本語の解説に対応し、利用範囲は内容や配信版によって異なります。',
    },
]
UNI_TIPS = {
    'information': [
        ('用語を、自分の言葉で', '情報の信頼性・著作権・情報デザインなど、判断の理由を説明できるか確かめます。'),
        ('処理の順序をたどる', 'プログラミングや論理演算は、どこで値や条件が変わるかを追いながら復習します。'),
        ('データを読み解く', '通信やデータ活用の単元で、しくみと資料の見方をつなげます。'),
    ],
    'math-ia': [
        ('条件を整理する', '数と式・二次関数では、与えられた条件と求めるものを分けて考えます。'),
        ('図や表で確かめる', '図形・データの分析・確率は、図や数値の意味を確認しながら解きます。'),
        ('苦手のあとに、模試へ', '48の学習単元を復習したら、収録する4回のオリジナル模試で理解を確かめられます。'),
    ],
    'geography': [
        ('位置と環境をつなぐ', '地図・地形・気候を、地域の暮らしや産業と結びつけて整理します。'),
        ('資料の根拠を探す', '人口や貿易の問題は、数値や分布のどこから判断できるかを考えます。'),
        ('地域を比較する', '地誌で似た地域と異なる地域を比べ、特徴の理由を言葉にします。'),
    ],
    'japanese-history': [
        ('前後の流れをつかむ', '原始・古代から現代まで、できごとの順序と背景を確認します。'),
        ('史料と知識を結ぶ', '史料にある表現を手がかりに、時代や社会の特徴と結びつけます。'),
        ('分野をまたいで復習する', '政治・経済・文化の関係を確かめ、歴史総合の単元もあわせて振り返ります。'),
    ],
    'chemistry': [
        ('現象を粒子で考える', '原子・結合・物質の状態を、目に見える現象と対応させて整理します。'),
        ('反応の条件を確かめる', 'エネルギーや平衡では、何が変わり、何が保たれるかを確認します。'),
        ('性質を比較する', '無機・有機・高分子の物質を、構造と性質のつながりから復習します。'),
    ],
    'physics': [
        ('状況を図にする', '力学・電磁気などの問題で、向き・位置・変化を整理してから考えます。'),
        ('法則の意味を確かめる', '式の記号や単位が何を表すか、どの条件で使えるかを振り返ります。'),
        ('グラフと現象を結ぶ', '熱・波・原子の単元まで、資料の読み取りと現象の説明を行き来して復習します。'),
    ],
}


def esc(value):
    return html.escape(str(value), quote=True)


def marked(key, value):
    return '<!-- quest-expansion:' + key + ':start -->' + value + '<!-- quest-expansion:' + key + ':end -->'


def remove(text, key):
    return re.sub(r'<!-- quest-expansion:' + re.escape(key) + r':start -->.*?<!-- quest-expansion:' + re.escape(key) + r':end -->', '', text, flags=re.S)


def insert(text, key, value, anchor, before=True):
    text = remove(text, key)
    assert anchor in text, 'Missing insertion anchor for ' + key
    fragment = marked(key, value)
    return text.replace(anchor, fragment + anchor if before else anchor + fragment, 1)


def schema_block(value):
    return '<script type="application/ld+json">' + json.dumps(value, ensure_ascii=False).replace('</', r'<\/') + '</script>'


def assets(text):
    text = re.sub(r'quest-growth\.css\?v=[^"\']+', 'quest-growth.css?v=' + VERSION, text)
    if '/assets/quest/quest-growth.css' not in text:
        text = text.replace('</head>', '<link rel="stylesheet" href="/assets/quest/quest-growth.css?v=' + VERSION + '"></head>', 1)
    if '/assets/quest/quest-growth.js' not in text:
        text = text.replace('</head>', '<script defer src="/assets/quest/quest-growth.js?v=' + VERSION + '"></script></head>', 1)
    return text


def course_units(course):
    return '48学習単元＋オリジナル模試4回' if course['slug'] == 'math-ia' else str(course['unitCount']) + '単元'


def university_cards(config):
    return ''.join(
        '<article class="growth-course"><span class="growth-topic">' + esc(course_units(c)) + '</span><h3>' + esc(c['name']) + '</h3><p>' + esc(c['lead']) + '</p><a class="growth-text-link" href="/quest/university/' + c['slug'] + '/" data-growth-route="university" data-course="' + c['id'] + '">' + esc(c['name']) + 'の内容を見る →</a></article>'
        for c in config['universityCourses']
    )


def audience_routes(config):
    rows = [
        ('/quest/juken/', '中学受験', '理科・社会・国語・算数', 'school', '#246ac0'),
        ('/quest/university/', '大学受験', '情報Ⅰ・数学ⅠA・地理ほか', 'university', '#11796d'),
        ('/quest/qualifications/', '資格・就職', '宅建・FP・簿記・IT・SPI3', 'qualification', '#7950a8'),
        ('/quest/languages/', '語学', '日本語クエスト・English Quest', 'language', '#956117'),
    ]
    links = ''.join('<a class="growth-route" style="--route-accent:' + color + '" href="' + path + '" data-growth-route="' + audience + '"><strong>' + name + '<span aria-hidden="true"> →</span></strong><small>' + sub + '</small></a>' for path, name, sub, audience, color in rows)
    subjects = ''.join('<a href="/quest/university/' + c['slug'] + '/" data-growth-route="university" data-course="' + c['id'] + '">' + esc(c['name']) + '</a>' for c in config['universityCourses'])
    return '<section class="growth-routes" id="learning-goals" aria-label="学習の目的から選ぶ"><picture class="bg" aria-hidden="true"><img src="/assets/quest/backgrounds/v3-desk.webp" alt="" loading="lazy" decoding="async"></picture><div class="growth-wrap"><p class="growth-label">合格！クエストで、いま学びたいことは？</p><div class="growth-route-grid growth-four-routes">' + links + '</div><nav class="growth-subject-links" aria-label="大学受験の科目"><span>大学受験の科目</span>' + subjects + '</nav></div></section>'


def enrich_entries(config):
    routes = audience_routes(config)
    for rel in ('index.html', 'quest/index.html'):
        path = ROOT / rel
        text = path.read_text()
        text, n = re.subn(r'<!-- quest-growth:routes:start -->.*?<!-- quest-growth:routes:end -->', lambda _: '<!-- quest-growth:routes:start -->' + routes + '<!-- quest-growth:routes:end -->', text, count=1, flags=re.S)
        assert n == 1
        if rel == 'quest/index.html':
            section = '<section class="growth-page"><div class="growth-section soft" id="university-catalog"><div class="growth-wrap"><p class="growth-kicker">大学受験・高校の復習</p><h2>大学受験の6科目も、<br>同じアプリから。</h2><p class="growth-section-lead">情報Ⅰ・数学ⅠA・地理・日本史・化学・物理。授業や参考書で学んだ範囲から、苦手な単元を選んで復習できます。中学受験の4科とは別に選ぶ、日本語の教材です。</p><div class="growth-course-grid">' + university_cards(config) + '</div><div class="growth-links"><a href="/quest/university/" data-growth-route="university">大学受験の学び方と全単元を見る →</a><a href="/quest/languages/" data-growth-route="language">日本語・英語の語学教材を見る →</a></div></div></div></section>'
            text = insert(text, 'university-catalog', section, '<section class="v-sec v-learn"')
            text = re.sub(r'<div class="more-courses">.*?</div>', lambda _: '<div class="more-courses"><span>＋14教材</span>' + ''.join('<a href="/quest/university/' + c['slug'] + '/" style="--c:#11796d" data-growth-route="university" data-course="' + c['id'] + '">' + esc(c['name']) + '</a>' for c in config['universityCourses']) + ''.join('<a href="' + url + '" style="--c:#6a4bd0">' + name + '</a>' for name, url in [
                ('ITパスポート','/quest/courses/it-passport/'),('FP','/quest/courses/fp/'),('簿記','/quest/courses/bookkeeping/'),('宅建士','/quest/courses/takken/'),('SPI3','/quest/courses/spi3/'),('日本語','/quest/courses/japanese/'),('英語','/quest/courses/english/'),('運転免許','/quest/courses/driver-license/')
            ]) + '</div>', text, count=1, flags=re.S)
            text = text.replace('どの教材にもイラスト図鑑があります。', '図鑑・画像・読み上げの対応は教材・問題によって異なります。')
            text = text.replace('全教材に、無料で解ける問題があります。続けたくなったら、学びたい教材の分だけProに。', '無料で試せる範囲から使い心地を確認できます。追加問題や機能の対象は、教材ごとにアプリ内でご確認ください。')
            itemlist = {'@context': 'https://schema.org', '@type': 'ItemList', '@id': BASE + '/quest/#university-catalog', 'name': '大学受験の6科目', 'itemListElement': [{'@type': 'ListItem', 'position': i+1, 'name': c['name'], 'url': BASE + '/quest/university/' + c['slug'] + '/'} for i,c in enumerate(config['universityCourses'])]}
            text = insert(text, 'university-schema', schema_block(itemlist), '</head>')
            text = text.replace('中学受験・資格・語学を、ひとつのアプリで。', '中学受験・大学受験・資格・語学を、ひとつのアプリで。')
        else:
            text = text.replace('難易度40の問題は無料、50・60・70や図鑑の全ページなどは Pro。アプリ内課金・広告あり。', 'ダウンロード無料・アプリ内課金あり。利用できる問題・図鑑・音声・プランは教材と配信版によって異なります。現在の範囲と価格はアプリ内でご確認ください。')
        path.write_text(assets(text))


def enrich_university(config):
    changed = []
    for c in [None, *config['universityCourses']]:
        route = '/quest/university/' + (c['slug'] + '/' if c else '')
        path = ROOT / route.lstrip('/') / 'index.html'
        text = path.read_text()
        text = text.replace('2026年11月21日確認の配信対象は、この6科目です。公開対象の収録単元を掲載しています。', '現在学べる大学受験の6科目をご紹介しています。気になる科目から、収録単元を確認できます。')
        text = text.replace('2026年11月21日確認の公開対象教材に基づく単元一覧です。', '学べる単元の一覧です（2026年11月21日確認）。')
        crumbs = '<nav class="growth-breadcrumb" aria-label="パンくず"><div class="growth-wrap"><a href="/quest/">合格！クエスト</a><span aria-hidden="true"> / </span>' + ('<a href="/quest/university/">大学受験</a><span aria-hidden="true"> / </span><span>' + esc(c['name']) + '</span>' if c else '<span>大学受験</span>') + '</div></nav>'
        text = insert(text, 'breadcrumbs', crumbs, '<section class="growth-hero">')
        if c:
            details = '<section class="growth-section soft"><div class="growth-wrap"><h2>' + esc(c['name']) + 'を、どう復習する？</h2><p class="growth-section-lead">問題に答えるだけでなく、理由を説明できるかを確かめる使い方に。授業や参考書の復習として、次の視点で単元を選べます。</p><div class="growth-flow">' + ''.join('<article><h3>' + esc(h) + '</h3><p>' + esc(p) + '</p></article>' for h,p in UNI_TIPS[c['slug']]) + '</div></div></section>'
            text = insert(text, 'subject-learning', details, '<section class="growth-section" id="units">')
            if c['slug'] == 'math-ia':
                text = text.replace('52単元を掲載。知りたい分野を開くと、収録単元を確認できます。', '48の学習単元と4回のオリジナル模試を掲載。知りたい分野を開くと、収録内容を確認できます。')
                text = text.replace('<span>オリジナル模試</span><small>4単元 ＋</small>', '<span>オリジナル模試</span><small>4回 ＋</small>')
            related = '<section class="growth-section"><div class="growth-wrap"><h2>ほかの大学受験科目も確認する</h2><div class="growth-links">' + ''.join('<a href="/quest/university/' + x['slug'] + '/" data-growth-route="university" data-course="' + x['id'] + '">' + esc(x['name']) + ' →</a>' for x in config['universityCourses'] if x['id'] != c['id']) + '</div><p class="growth-note">大学受験教材は日本語で学ぶ教材です。学習する言語を選びたい方は、<a href="/quest/languages/">日本語クエスト・English Quest</a>をご覧ください。</p></div></section>'
            text = insert(text, 'related-subjects', related, '<section class="growth-section" id="download">')
        else:
            rows = ''.join('<tr><th scope="row"><a href="/quest/university/' + x['slug'] + '/">' + esc(x['name']) + '</a></th><td>' + esc(course_units(x)) + '</td><td><span class="growth-mobile-label">主な分野</span>' + esc('・'.join(d['name'] for d in x['domains'] if d['name'] != 'オリジナル模試')) + '</td></tr>' for x in config['universityCourses'])
            overview = '<section class="growth-section soft"><div class="growth-wrap"><h2>6科目の収録範囲を比べる</h2><p class="growth-section-lead">6科目で学べるのは、315の学習単元と4回の数学ⅠAオリジナル模試。合計319項目の内容を、各科目のページで確認できます。</p><div class="growth-table-wrap"><table class="growth-table"><caption>学べる科目と収録内容（2026年11月21日確認）</caption><thead><tr><th scope="col">科目</th><th scope="col">収録内容</th><th scope="col">主な分野</th></tr></thead><tbody>' + rows + '</tbody></table></div><p class="growth-note">この6科目は日本語で学ぶ教材です。受験する試験の全範囲を保証するものではありません。学校や参考書の学習、実際の過去問演習と組み合わせ、単元ごとの理解確認にお使いください。</p></div></section>'
            text = insert(text, 'coverage-table', overview, '<section class="growth-section soft"><div class="growth-wrap"><h2>まとまった勉強の合間に、ひとつ復習。</h2>')
        path.write_text(assets(text))
        changed.append(route)
    return changed


def store_buttons(lang, course='all', placement='language-download'):
    en = lang == 'en'
    apple = APPLE + '?' + urlencode({'ct': 'web_language_' + course, 'mt': '8'})
    referrer = urlencode({'utm_source': 'trailfusionai', 'utm_medium': 'website', 'utm_campaign': 'quest_language_' + lang, 'utm_content': course})
    google = GOOGLE + '&' + urlencode({'referrer': referrer, 'hl': 'en' if en else 'ja'})
    return '<div class="growth-actions">' + ''.join(
        '<a class="growth-button' + (' secondary' if store == 'google' else '') + '" href="' + esc(url) + '" data-store="' + store + '" data-audience="language" data-course="' + course + '" data-placement="' + placement + '">' + label + '</a>'
        for store,url,label in [('apple',apple,'Get on the App Store' if en else 'iPhone・iPadで始める'),('google',google,'Get on Google Play' if en else 'Androidで始める')]
    ) + '</div>'


def language_faq(lang):
    if lang == 'en':
        return [
            ('Are Japanese Quest and English Quest separate apps?', 'They are two courses inside Gokaku Quest. Download the same app, then choose Japanese or English. The app name shown by the store may vary by region.'),
            ('Can I study with English explanations?', 'Yes. English explanations are supported in Japanese Quest and English Quest. The language you are learning is separate from the language used for explanations. Some interface labels and illustrated materials remain in Japanese. Available lessons and explanation languages can vary by content, OS and app version.'),
            ('Are the Japanese entrance-exam and qualification courses in English?', 'The international learning pages cover Japanese Quest and English Quest only. The Japanese entrance-exam and qualification courses use Japanese; they are not presented here as English-language courses.'),
            ('Is everything free?', 'The app is free to download. You can try the available free questions. Additional questions, illustrated guides, audio and other features may require an in-app purchase. Check the app for the current scope, plans and prices.'),
            ('Does the app guarantee a JLPT or JFT-Basic result?', 'No. These are independent study aids with original learning material. They are not official exam apps and do not guarantee a test result. Use the course alongside the official exam information and other study materials.'),
        ]
    return [
        ('日本語クエストとEnglish Questは別アプリですか？', 'どちらも合格！クエストの中にある語学教材です。同じアプリをダウンロードし、日本語または英語の教材を選びます。ストアに表示されるアプリ名は地域によって異なる場合があります。'),
        ('英語の解説で学べますか？', '日本語クエスト・English Questは英語の解説に対応しています。学習する言語と、解説の言語は別です。一部の画面表示や図解には日本語が残ります。利用できる内容・解説の言語は、教材・OS・配信版によって異なります。'),
        ('大学受験や資格の教材も英語で学べますか？', '海外向けに案内する語学教材は日本語クエストとEnglish Questの2教材です。中学受験・大学受験・資格の教材は日本語で学ぶ教材で、全教材が英語で学べるという案内ではありません。'),
        ('すべて無料で利用できますか？', 'ダウンロードは無料です。無料で試せる問題から始められます。追加問題・図鑑・音声などにはアプリ内課金が必要な場合があります。現在の利用範囲・プラン・価格はアプリ内でご確認ください。'),
        ('JLPTやJFT-Basicの結果を保証する教材ですか？', 'いいえ。独自の学習内容を使う学習補助教材です。試験実施団体の公式アプリではなく、合格や得点を保証しません。試験の公式情報やほかの教材と組み合わせてご利用ください。'),
    ]


def faq_section(lang, pairs, key='language-faq'):
    return '<section class="growth-section soft" id="' + key + '"><div class="growth-wrap"><h2>' + ('Before you start' if lang == 'en' else '始める前に知りたいこと') + '</h2><div class="growth-faq faq">' + ''.join('<details><summary>' + esc(q) + '</summary><p>' + esc(a) + '</p></details>' for q,a in pairs) + '</div></div></section>'


def hub(lang):
    en = lang == 'en'
    route = LANGUAGE_ROUTES[lang]
    title = 'Gokaku Quest | Learn Japanese & English | Japanese Quest & English Quest' if en else '日本語クエスト・English Quest｜2つの語学教材をひとつに｜合格！クエスト'
    description = 'Learn Japanese or English in one app. Explore Japanese Quest and English Quest, with quizzes, illustrated guides and English explanations in supported content.' if en else '日本語クエストとEnglish Questを、合格！クエストの中で選べます。生活日本語・JLPT・JFT-Basic、英語の語彙・文法・読解など、2つの語学教材の内容と始め方を紹介します。'
    other = 'ja' if en else 'en'
    header = '<header class="language-header"><div class="growth-wrap"><a class="language-brand" href="' + ('/en/quest/' if en else '/quest/') + '"><img src="/assets/quest/icon.webp" width="48" height="48" alt=""><span>Gokaku Quest<small>' + ('Japanese Quest · English Quest' if en else '日本語クエスト・English Quest') + '</small></span></a><nav aria-label="' + ('Main navigation' if en else 'メインメニュー') + '"><a href="#language-courses">' + ('Choose a course' if en else '教材を選ぶ') + '</a><a href="' + LANGUAGE_ROUTES[other] + '" lang="' + other + '" hreflang="' + other + '">' + ('日本語' if en else 'English') + '</a></nav></div></header>'
    hero = '<section class="growth-hero language-hero"><div class="growth-wrap"><p class="growth-kicker">' + ('Two language courses. One app.' if en else '2つの語学教材を、ひとつのアプリで。') + '</p><h1>' + ('Learn Japanese.<br>Build your English.' if en else '日本語を学ぶ。<br>英語を身につける。') + '</h1><p class="growth-lead">' + ('Choose Japanese Quest for Japanese, or English Quest for English. Start with a short quiz, read the explanation, and return to the topics you want to practise.' if en else '日本語クエストで日本語を、English Questで英語を。短い問題に答え、解説を読み、覚えたい内容を繰り返す。目標に合う教材から始められます。') + '</p><p class="language-scope">' + ('These are the two language courses in Gokaku Quest for international learners. English explanations are supported; content and features vary by version.' if en else '海外向けに案内するのは、この2つの語学教材です。英語の解説に対応し、利用できる内容や機能は配信版によって異なります。') + '</p><div class="growth-actions"><a class="growth-button" href="#language-courses">' + ('Compare the two courses' if en else '2つの教材を比べる') + '</a><a class="growth-button secondary" href="#download">' + ('Download Gokaku Quest' if en else 'アプリをダウンロード') + '</a></div><p class="growth-note">' + ('iPhone · iPad · Android. Free download with in-app purchases.' if en else 'iPhone・iPad / Android。ダウンロード無料・アプリ内課金あり。') + '</p></div></section>'
    cards = ''
    for c in COURSES:
        lead = c['enLead' if en else 'jaLead']
        tracks = c['enTracks' if en else 'jaTracks']
        caption = c['enCaption' if en else 'jaCaption']
        language = c['enLanguage' if en else 'jaLanguage']
        detail = c['enPath' if en else 'jaPath']
        cards += '<article class="language-course" id="' + c['id'] + '"><div class="language-course-copy"><p class="growth-kicker">' + ('Learn Japanese' if en and c['id']=='japanese-everyday' else 'Learn English' if en else c['ja']) + '</p><h3>' + c['name'] + '</h3><p>' + esc(lead) + '</p><ul>' + ''.join('<li>' + esc(x) + '</li>' for x in tracks) + '</ul><p class="language-scope">' + esc(language) + '</p><a class="growth-text-link" href="' + detail + '" data-growth-route="language" data-course="' + c['id'] + '">' + ('Explore ' + c['name'] if en else '教材の内容を詳しく見る') + ' →</a>' + store_buttons(lang,c['id'],'language-card') + '</div><figure><a href="/assets/quest/' + c['image'] + '" target="_blank" rel="noopener" aria-label="' + ('Open the full-size ' + c['name'] + ' sample' if en else c['ja'] + 'の教材画像を大きく開く') + '"><img src="/assets/quest/' + c['image'] + '" alt="' + esc(caption) + '" width="788" height="1400" loading="lazy" decoding="async"></a><figcaption>' + esc(caption) + ' ' + ('Tap the image to view it larger.' if en else '画像をタップすると大きく表示できます。') + '</figcaption></figure></article>'
    courses = '<section class="growth-section" id="language-courses"><div class="growth-wrap"><h2>' + ('Which language would you like to learn?' if en else 'いま、学びたい言語から。') + '</h2><div class="language-course-list">' + cards + '</div></div></section>'
    rows = [('Download Gokaku Quest','Japanese Quest and English Quest are courses in the same app. The store name may vary by region.'),('Choose Japanese or English','Select the course, then choose a track or topic that fits your goal. Check the explanation language in the app.'),('Try, understand, review','Answer a short quiz and read the explanation. Return to topics that need another look.')] if en else [('合格！クエストをダウンロード','日本語クエスト・English Questは同じアプリの中にあります。'),('日本語か英語の教材を選ぶ','目標に合うコースや分野を選びます。解説の言語はアプリ内で確認してください。'),('答えて、理解して、もう一度','短い問題に答え、解説を読みます。あやふやな内容に戻り、復習を続けましょう。')]
    how = '<section class="growth-section soft"><div class="growth-wrap"><h2>' + ('Start in three steps' if en else '始め方は、3ステップ。') + '</h2><div class="growth-flow">' + ''.join('<article><h3>' + esc(h) + '</h3><p>' + esc(p) + '</p></article>' for h,p in rows) + '</div></div></section>'
    pairs = language_faq(lang)
    download = '<section class="growth-section" id="download"><div class="growth-wrap"><h2>' + ('One download. Your next language.' if en else 'ひとつのダウンロードで、次の学びへ。') + '</h2><p class="growth-section-lead">' + ('Download Gokaku Quest, then choose Japanese Quest or English Quest. Try the available free questions and check the app for current content, languages and purchase options.' if en else '合格！クエストをダウンロードし、日本語クエスト・English Questから選べます。無料で試せる問題、内容・解説言語・購入プランはアプリ内でご確認ください。') + '</p>' + store_buttons(lang) + '</div></section>'
    footer = '<footer class="language-footer"><div class="growth-wrap"><p>© 2026 TrailFusion AI · Gokaku Quest</p><nav aria-label="' + ('Footer' if en else 'フッター') + '">' + ''.join('<a href="' + url + '">' + label + '</a>' for url,label in [('/en/' if en else '/', 'TrailFusion AI'),('/gokaku-quest-privacy.html','Privacy policy (Japanese)' if en else 'プライバシーポリシー'),('/gokaku-quest-terms.html','Terms of use (Japanese)' if en else '利用規約'),('/support/','Support (Japanese)' if en else 'サポート')]) + '</nav></div></footer>'
    graph = [
        {'@type':'WebPage','@id':BASE+route+'#page','url':BASE+route,'name':title,'description':description,'inLanguage':lang,'dateModified':DAY},
        {'@type':'MobileApplication','@id':BASE+route+'#app','name':'Gokaku Quest','description':description,'operatingSystem':'iOS, iPadOS, Android','applicationCategory':'EducationalApplication','url':BASE+route,'downloadUrl':[APPLE,GOOGLE],'offers':{'@type':'Offer','price':'0','priceCurrency':'USD' if en else 'JPY'},'hasPart':[{'@type':'LearningResource','name':c['name'],'url':BASE+c['enPath' if en else 'jaPath'],'description':c['enLead' if en else 'jaLead']} for c in COURSES]},
        {'@type':'ItemList','name':'Japanese Quest and English Quest','itemListElement':[{'@type':'ListItem','position':i+1,'name':c['name'],'url':BASE+c['enPath' if en else 'jaPath']} for i,c in enumerate(COURSES)]},
        {'@type':'FAQPage','mainEntity':[{'@type':'Question','name':q,'acceptedAnswer':{'@type':'Answer','text':a}} for q,a in pairs]},
    ]
    hreflang = ''.join('<link rel="alternate" hreflang="' + l + '" href="' + BASE + path + '">' for l,path in [*LANGUAGE_ROUTES.items(),('x-default',LANGUAGE_ROUTES['en'])])
    text = '<!doctype html>\n<html lang="' + lang + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(title) + '</title><meta name="description" content="' + esc(description) + '"><link rel="canonical" href="' + BASE + route + '">' + hreflang + '<meta name="robots" content="index,follow,max-image-preview:large"><meta name="theme-color" content="#235eac"><meta property="og:type" content="website"><meta property="og:site_name" content="Gokaku Quest"><meta property="og:locale" content="' + ('en_US' if en else 'ja_JP') + '"><meta property="og:title" content="' + esc(title) + '"><meta property="og:description" content="' + esc(description) + '"><meta property="og:url" content="' + BASE + route + '"><meta property="og:image" content="' + BASE + '/assets/brand/quest/icon.webp"><meta property="og:image:alt" content="Gokaku Quest app icon"><meta name="twitter:card" content="summary"><meta name="apple-itunes-app" content="app-id=6775411516"><link rel="icon" href="/assets/quest/icon.webp"><link rel="stylesheet" href="/assets/quest/quest.css?v=4"><link rel="stylesheet" href="/assets/quest/quest-growth.css?v=' + VERSION + '"><script defer src="/assets/quest/quest.js?v=3"></script><script defer src="/assets/quest/quest-growth.js?v=' + VERSION + '"></script>' + schema_block({'@context':'https://schema.org','@graph':graph}) + '<script async src="https://www.googletagmanager.com/gtag/js?id=G-S57KSMSB8Y"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag("js",new Date());gtag("config","G-S57KSMSB8Y");</script></head><body data-course="language"><a class="skip" href="#main">' + ('Skip to content' if en else '本文へスキップ') + '</a>' + header + '<main id="main" class="growth-page language-page">' + hero + courses + how + faq_section(lang,pairs) + download + '</main>' + footer + '<script defer src="/assets/js/visitor-counter.js"></script></body></html>\n'
    dest = ROOT / route.lstrip('/') / 'index.html'
    dest.parent.mkdir(parents=True,exist_ok=True)
    dest.write_text(text)
    return route


def align_language_app_schema(text):
    def align(match):
        data = json.loads(match[1])
        for item in data.get('@graph', [data]):
            if item.get('@type') in ('MobileApplication', 'SoftwareApplication') and item.get('name') in ('Gokaku Quest', 'Gokaku! Quest'):
                item['@id'] = BASE + '/en/quest/#app'
                item['url'] = BASE + '/en/quest/'
        return schema_block(data)
    return re.sub(r'<script type="application/ld\+json">(.*?)</script>', align, text, flags=re.S)


def enrich_english():
    paths = []
    for c in COURSES:
        path = ROOT / c['enPath'].lstrip('/')
        text = path.read_text()
        pairs = [language_faq('en')[0], language_faq('en')[1], language_faq('en')[2], language_faq('en')[3]]
        section = '<section class="growth-page">' + faq_section('en',pairs) + '<div class="growth-section"><div class="growth-wrap"><h2>Choose your next language</h2><p class="growth-section-lead">Japanese Quest and English Quest are the two language courses in Gokaku Quest for international learners.</p><div class="growth-links"><a href="/en/quest/" data-growth-route="language">Compare Japanese Quest and English Quest →</a></div></div></div></section>'
        text = insert(text,'language-details',section,'<section class="closing">')
        proof = '<div class="language-availability"><strong>English explanations supported.</strong> ' + esc(c['enLanguage']) + ' The sample images below may show Japanese text.</div>'
        text = insert(text,'language-availability',proof,'<p class="fine">Free to download.',before=True)
        graph = {'@context':'https://schema.org','@graph':[{'@type':'FAQPage','mainEntity':[{'@type':'Question','name':q,'acceptedAnswer':{'@type':'Answer','text':a}} for q,a in pairs]},{'@type':'BreadcrumbList','itemListElement':[{'@type':'ListItem','position':1,'name':'Gokaku Quest language courses','item':BASE+'/en/quest/'},{'@type':'ListItem','position':2,'name':c['name'],'item':BASE+c['enPath']}]}]}
        text = insert(text,'language-details-schema',schema_block(graph),'</head>')
        text = text.replace('href="/en/#learn">Language learning</a>', 'href="/en/quest/">Language learning</a>')
        def label_store(match):
            tag = re.sub(r'\sdata-(?:audience|course)="[^"]*"', '', match[0])
            is_apple = 'data-store="apple"' in tag
            if is_apple:
                url = APPLE + '?' + urlencode({'ct': 'web_language_' + c['id'], 'mt': '8'})
            else:
                referrer = urlencode({'utm_source': 'trailfusionai', 'utm_medium': 'website', 'utm_campaign': 'quest_language_en', 'utm_content': c['id']})
                url = GOOGLE + '&' + urlencode({'referrer': referrer, 'hl': 'en'})
            tag = re.sub(r'href="[^"]*"', lambda _: 'href="' + esc(url) + '"', tag, count=1)
            return tag[:-1] + ' data-audience="language" data-course="' + c['id'] + '">'
        text = re.sub(r'<a\b[^>]*data-app="quest"[^>]*data-store="(?:apple|google)"[^>]*>',label_store,text)
        text = align_language_app_schema(assets(text))
        path.write_text(text)
        paths.append(c['enPath'])
    for rel in ('en/index.html','en/apps.html'):
        path = ROOT / rel
        text = path.read_text()
        if rel == 'en/index.html':
            marker = '<p class="note center">Japanese Quest and English Quest are language-learning courses in Gokaku Quest. One download, then choose Japanese or English.</p>'
        else:
            marker = '<p class="note">Japanese Quest and English Quest are courses in Gokaku Quest. Download it, then choose your learning language. The apps are free to download with optional in-app purchases. Check the store and purchase screen for current device, language and plan details.</p>'
        addition = '<p class="language-hub-link"><a href="/en/quest/" data-growth-route="language">Compare Japanese Quest and English Quest →</a><span>Two language courses with English explanations in supported content.</span></p>'
        text = insert(text,'language-hub-link',addition,marker,before=False)
        path.write_text(align_language_app_schema(assets(text)))
        paths.append('/en/' if rel == 'en/index.html' else '/en/apps.html')
    return paths


def update_indexes(routes,config):
    path=ROOT/'docs/quest/pages.json'
    pages=json.loads(path.read_text())
    path.write_text(json.dumps(list(dict.fromkeys(pages + list(LANGUAGE_ROUTES.values()))),ensure_ascii=False,indent=2)+'\n')
    path=ROOT/'sitemap.xml'
    text=path.read_text()
    for route in routes:
        url=BASE+route
        entry='<url><loc>'+url+'</loc><lastmod>'+DAY+'</lastmod></url>'
        pattern=r'<url>\s*<loc>'+re.escape(url)+r'</loc>.*?</url>'
        if re.search(pattern,text,re.S): text=re.sub(pattern,lambda _:entry,text,flags=re.S)
        else: text=text.replace('</urlset>','  '+entry+'\n</urlset>')
    path.write_text(text)
    facts='## Global language-learning scope ('+DAY+')\n\nJapanese Quest (japanese-everyday) and English Quest (english-travel) are the two Gokaku Quest courses for international learners. They are courses in the same app, not separate downloads. English explanations are supported; lessons, images, audio, explanation languages and purchase options vary by content, OS and version. Japanese entrance-exam and qualification courses use Japanese. Do not describe all 18 courses as available in English.\n\n- [Compare the two language courses]('+BASE+'/en/quest/)\n- [Japanese Quest]('+BASE+'/en/japanese-quest.html): everyday Japanese A1–B1, JLPT N5–N1 study tracks and JFT-Basic study track. Learning language: Japanese.\n- [English Quest]('+BASE+'/en/eigo-quest.html): phonics, vocabulary, grammar, conversation expressions, idioms, reading and writing topics. Learning language: English.\n- [日本語の語学教材ガイド]('+BASE+'/quest/languages/)\n\nThe Japanese university-entrance section lists the six released courses: Information I, Math IA, Geography, Japanese History, Chemistry and Physics. Its 319 listed entries consist of 315 learning units and four original Math IA mock tests. These are Japanese-language supplementary study materials, not a claim of complete exam coverage. Public Affairs / Politics and Economics is not advertised as released.\n\nFree download with in-app purchases. Do not infer that every feature or lesson is free or included in one plan. A website translation does not mean every course is translated. This file is supplementary; the public HTML pages are the primary source.\n'
    for rel in ('llms.txt','llms-full.txt'):
        path=ROOT/rel
        text=remove(path.read_text(),'language-facts')
        text=text.replace('## Gokaku! Quest for Japanese junior-high entrance exams (chugaku juken), in English','## English summary of the Japanese-language entrance-exam courses')
        text = re.sub(r'\n{3,}', '\n\n', text).rstrip()
        text += '\n\n'+marked('language-facts',facts)+'\n'
        path.write_text(text)


def apply(config=None):
    config=config or json.loads((ROOT/'docs/quest/growth-release.json').read_text())
    assert len(config['universityCourses'])==6
    assert sum(c['unitCount'] for c in config['universityCourses'])==319
    enrich_entries(config)
    routes=['/','/quest/',*enrich_university(config),hub('ja'),hub('en'),*enrich_english()]
    update_indexes(routes,config)
    print(json.dumps({'enrichedRoutes':routes,'globalLanguageCourses':[c['id'] for c in COURSES],'preservation':'existing titles, H1s, canonicals and middle-school pages retained'},ensure_ascii=False))


if __name__=='__main__':
    apply()
