"""Shared copy for the "past 10 years of entrance exams" plan (2026-11-22).

Source of truth: jyuken_sience/docs/past-exam-10y/COPY.md (rev. 3). Until a course's
research records are complete, only the planned form ("これから…見直していきます") is used.
Do not strengthen it: no "分析中/分析済み", no "問題はオリジナル／すべて" (use 問題文は自作),
no guarantees, no "past papers included", never call certification tests 入試, never present
40〜70 as mock-exam deviation scores, and never mention past papers for languages,
the driving licence or SPI3.
"""
from html import escape

ROUTE = '/quest/how-we-make/'
STATUS = 'planned'
DAY = '2026-11-22'
QUALIFICATION_COURSES = ('takken-japan', 'fp-japan', 'bookkeeping-japan', 'it-passport-japan')
# Pages whose copy carries this wording (sitemap lastmod is set to DAY for them).
UPDATED_ROUTES = [ROUTE, '/quest/', '/quest/juken/', '/quest/faq/', '/quest/university/', '/quest/qualifications/', '/quest/materials/',
                  '/quest/juken/science-plants/', '/quest/juken/science-animals/', '/quest/juken/social-anki/', '/quest/juken/last-2-months/',
                  '/quest/study/science-observation/', '/quest/study/information-binary/', '/quest/study/bookkeeping-journal/']
CIVICS_PAGE_NOTE = '公共，政治・経済の教材紹介ページは準備中です。'
TAG = '【今後の取り組み】'
# One-liners by audience (COPY.md rev. 3).
ONE_LINE = 'これから過去10年分を目安に入試問題を調べて、単元と問題を見直していきます'  # 中学受験・共通テスト
ONE_LINE_QUALIFICATION = 'これから過去10年分を目安に資格試験の過去問を調べて、単元と問題を見直していきます'
ONE_LINE_INFORMATION = 'これから共通テスト情報Ⅰ（2025年度から）の本試験と、前身の「情報関係基礎」の過去問を調べて、単元と問題を見直していきます'
ONE_LINE_GENERAL = TAG + '中学受験・共通テスト・一部の資格試験で、過去10年分を目安に過去問を調べて、教材を見直していきます'
SHORT = 'これから過去10年分の入試を調べて、教材を見直します'
DESCRIPTION = (TAG + '中学受験・共通テスト・一部の資格試験について、過去10年分を目安に、公開されている入試・試験問題を調べ、'
               'よく出る論点と問い方をもとに、単元の構成と問題を教材ごとに見直していきます。問題文は自作しており、過去問をそのまま載せてはいません。')
NOTE = ('2026年11月に決めた取り組みで、教材ごとに順番に進め、終わった教材から調べた試験名と年度をお知らせします。'
        '公開されている年度が10年に満たない学校・試験は、確認できた範囲で調べます。共通テスト情報Ⅰの本試験は2025年度からです。'
        '過去問が公開されていない試験（運転免許・SPI3など）と語学は対象外です。合格を保証するものではありません。')
STEPS = [
    ('過去10年分を開く', '共通テストは2021年度以降の本試験・追試験、それより前は大学入試センター試験（新しい科目は前身の科目）。中学受験は偏差値帯ごとに実在の中学校の入試問題（学校が公開している年度）。資格試験は公開されている試験問題・サンプル問題。'),
    ('数える', '論点ごとに、どの年度にどんな資料・問い方で出たかを表にします。'),
    ('単元を見直す', 'よく出る論点の問題を厚くし、確認した資料の範囲でまだ出ていないが教科書・出題範囲にある論点も入れます。難易度（アプリ独自の4段階：40・50・60・70）ごとに問い方を変えます。'),
    ('自作する', '過去問の文章・図・選択肢は写さない方針で、論点と問い方だけを取り出して作ります。'),
    ('指摘を受けて直す', '気づいた点は問題ごとの「ほうこく」ボタンから送れます。報告を確認し、誤りが確認できた問題は直しています。'),
]
# Courses in scope. Languages, the driving licence and SPI3 are out of scope (NOTE says so).
SCOPE = [
    ('中学受験4科', '理科・社会・国語・算数', '偏差値帯ごとに、実在の中学校の入試問題（学校が公開している年度）を調べます。'),
    ('共通テスト7科目', '情報Ⅰ・数学ⅠA・地理・日本史・化学・物理・公共，政治・経済', '2021年度以降の本試験・追試験と、それより前の大学入試センター試験を調べます。情報Ⅰは2025年度からの本試験と、前身の「情報関係基礎」の過去問を調べます。' + CIVICS_PAGE_NOTE),
    ('一部の資格試験', '宅建士・FP・簿記・ITパスポート', '公開されている試験問題・サンプル問題を調べます。'),
]
FAQ = [
    ('過去問は入っていますか？', '過去問はそのまま載せていません。問題文は自作しています。過去問の文章・図・選択肢は写さない方針で、論点と問い方だけを取り出して作ります。志望校の過去問演習は、別途おこなってください。'),
    ('何年分を調べますか？', '過去10年分が目安です。共通テストは2021年度以降の本試験・追試験、それより前は大学入試センター試験（新しい科目は前身の科目）。中学受験は実在の中学校の入試問題（学校が公開している年度）、資格試験は公開されている試験問題・サンプル問題です。公開されている年度が10年に満たない学校・試験は、確認できた範囲で調べます。'),
    ('どの教材が対象ですか？', '中学受験4科（理科・社会・国語・算数）、共通テスト7科目（情報Ⅰ・数学ⅠA・地理・日本史・化学・物理・公共，政治・経済）、一部の資格試験（宅建士・FP・簿記・ITパスポート）の教材です。' + CIVICS_PAGE_NOTE + '過去問が公開されていない試験（運転免許・SPI3など）と語学は対象外です。'),
    ('見直しはもう終わっていますか？', 'まだです。2026年11月に決めた取り組みで、教材ごとに順番に進め、終わった教材から調べた試験名と年度をお知らせします。'),
    ('合格は保証されますか？', '合格を保証するものではありません。学校・塾での学習や過去問演習と合わせて、復習と確認にお使いください。'),
    ('問題のまちがいに気づいたら？', '各問題の「ほうこく」ボタンから送れます。報告を確認し、誤りが確認できた問題は直しています。'),
]


def line_for(course_id):
    """One-liner for a course, or None when the course is out of scope (languages, driving licence, SPI3...)."""
    if course_id == 'joho1-kyotsu-japan':
        return ONE_LINE_INFORMATION
    if course_id.startswith('junior-') or 'kyotsu' in course_id:
        return ONE_LINE
    if course_id in QUALIFICATION_COURSES:
        return ONE_LINE_QUALIFICATION
    return None


def link_html(label='問題の作り方を見る'):
    return f'<a class="text-link" href="{ROUTE}">{escape(label)} ↗</a>'


def sentence(line=ONE_LINE):
    """A one-liner as a sentence, for use inside running text."""
    return line + '。'


def brief(line=ONE_LINE):
    """A one-liner followed by the required note, for FAQ answers and running text."""
    return sentence(line) + NOTE


def full():
    """Description plus note. Use where certification tests appear (never call them 入試)."""
    return DESCRIPTION + NOTE


def section(kicker='問題の作り方'):
    """Short trust section for the Quest v3 pages (one line, description, note, link)."""
    return (f'<section class="section white" id="how-we-make"><div class="wrap split"><div><span class="kicker">{escape(kicker)}</span>'
            f'<h2>{escape(ONE_LINE)}。</h2></div><div><p>{escape(DESCRIPTION)}</p><p class="fine">{escape(NOTE)}</p>'
            f'{link_html()}</div></div></section>')


def growth_box(line=ONE_LINE):
    """Same content for the growth pages; pass ONE_LINE_QUALIFICATION on certification pages."""
    head = f'<strong>{escape(sentence(line))}</strong> '
    return (f'<div class="growth-scope" id="how-we-make">{head}{escape(DESCRIPTION)}<br>{escape(NOTE)} '
            f'<a href="{ROUTE}">問題の作り方を見る →</a></div>')


def page(ctx):
    faq, breadcrumb, crumbs = ctx['faq'], ctx['breadcrumb'], ctx['crumbs']
    trail = [('Quest', '/quest/'), ('問題の作り方', ROUTE)]
    hero = ('<section class="hero"><div class="wrap"><span class="eyebrow">今後の取り組み｜問題の作り方</span>'
            '<h1>過去10年分を目安に過去問を調べて、<br>教材を見直していきます。</h1>'
            '<p class="hero-lead"><b>対象は、中学受験・共通テスト・一部の資格試験です。</b></p>'
            f'<p class="hero-lead">{escape(DESCRIPTION)}</p><p class="fine">{escape(NOTE)}</p></div></section>')
    cards = ''.join(f'<article class="flow-card"><span class="num">0{i + 1}</span><h3>{escape(t)}</h3><p>{escape(d)}</p></article>' for i, (t, d) in enumerate(STEPS))
    steps = ('<section class="section white" id="steps"><div class="wrap"><div class="section-head"><div><span class="kicker">調べ方</span><h2>5つの段で、調べて見直す。</h2></div>'
             '<p>論点と問い方を数え、自作した問題文で単元を見直します。</p></div>'
             f'<div class="flow">{cards}</div></div></section>')
    rows = ''.join(f'<article class="topic"><h3>{escape(n)}</h3><p class="unit-list">{escape(c)}</p><p>{escape(d)}</p></article>' for n, c, d in SCOPE)
    scope = ('<section class="section" id="scope"><div class="wrap"><div class="section-head"><div><span class="kicker">対象</span><h2>見直していく教材。</h2></div>'
             '<p>教材ごとに順番に進め、終わった教材から調べた試験名と年度をお知らせします。</p></div>'
             f'<div class="topic-grid">{rows}</div>'
             '<p style="margin-top:20px"><a class="text-link" href="/quest/juken/">中学受験の4科 ↗</a> <a class="text-link" href="/quest/university/">大学受験の教材 ↗</a> '
             '<a class="text-link" href="/quest/qualifications/">資格・就職の教材 ↗</a> <a class="text-link" href="/quest/faq/">よくある質問 ↗</a></p></div></section>')
    questions = ('<section class="section white" id="faq"><div class="wrap"><div class="section-head"><div><span class="kicker">よくある質問</span><h2>問題の作り方について。</h2></div></div>'
                 f'{faq(FAQ)}</div></section>')
    return dict(path=ROUTE, title='問題の作り方｜過去10年分を目安に過去問を調べて見直していきます｜合格！Quest',
                desc='合格！クエストの問題の作り方と今後の取り組み。中学受験・共通テスト・一部の資格試験で、過去10年分を目安に過去問を調べて、教材を見直していきます。問題文は自作しており、過去問をそのまま載せてはいません。',
                body=crumbs(trail) + hero + steps + scope + questions, faqs=FAQ, extra=[breadcrumb(trail)])
