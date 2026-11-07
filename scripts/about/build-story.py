#!/usr/bin/env python3
"""Render the public 12-part founder narrative into the existing static /about/ page.

Run from the repository root with: python3 scripts/about/build-story.py
Image assets must already exist as assets/brand/about/journey-01.webp ... journey-12.webp.
The source JSON contains editorial public prose, not the private interview transcript.
"""
from __future__ import annotations
from pathlib import Path
from html import escape
import json
import re

ROOT = Path(__file__).resolve().parents[2]
DATA = json.loads((ROOT / 'scripts/about/story-data.json').read_text(encoding='utf-8'))
PAGE = ROOT / 'about/index.html'
CSS = ROOT / 'assets/css/about-story.css'
START = '<!-- BEGIN ABOUT FOUNDER STORY : generated from scripts/about/story-data.json -->'
END = '<!-- END ABOUT FOUNDER STORY -->'
STORY_ROOT = '/assets/brand/about/'
WEBSITE = 'https://trailfusionai.com'
INTRO = (
    '息子に「勉強しなさい」と言うたびに、親として何か違うと思っていました。'
    '社会や理科をもっと面白く伝えたい。そんな身近な葛藤から、40代で学習アプリを作り始めました。'
)
DETAIL = (
    '完成しただけでは、息子は20〜30問でやめてしまった。'
    'ランキングや街づくりを加え、教材を一つにまとめ、'
    '一人ひとりの声を聞きながら作り直してきた4か月の実録を、12枚のイラストとともにお届けします。'
)

def e(t: str) -> str:
    return escape(t, quote=True)

def image_dimensions(day: int) -> tuple[int, int]:
    if day == 1:
        return (1054, 1492)
    if day in (7, 12):
        return (1067, 1474)
    return (1055, 1491)

def render_episode(item: dict) -> str:
    day = item['day']
    assert isinstance(day, int) and 1 <= day <= 12
    src = STORY_ROOT + f'journey-{day:02d}.webp'
    file = ROOT / src.lstrip('/')
    assert file.is_file() and file.stat().st_size > 25_000, file
    assert len(item['paragraphs']) >= 4
    width, height = image_dimensions(day)
    reverse = ' about-story__entry--reverse' if day % 2 == 0 else ''
    color = ('', ' about-story__entry--blue', ' about-story__entry--teal')[(day - 1) % 3]
    paragraphs = '\n'.join(f'<p>{e(paragraph)}</p>' for paragraph in item['paragraphs'])
    note = ''
    if item.get('caution'):
        note = (
            '<p class="about-story__metrics-warning"><strong>数字について：</strong>'
            'この制作画像の利用人数・セッション数は集計期間や定義の再照合中です。'
            '未検証の数値は画像上で伏せており、学習効果や成績の証拠としては扱っていません。</p>'
        )
    return (
        f'\n<article class="about-story__entry{reverse}{color}" id="episode-{day:02d}" '
        f'aria-labelledby="episode-{day:02d}-title">\n'
        f' <figure class="about-story__visual">\n'
        f'  <a class="story-zoom" href="{src}" target="_blank" rel="noopener" '
        f'aria-label="第{day}話のイラストを拡大して読む（別タブで開きます）">'
        f'<img src="{src}" alt="{e(item["alt"])}" width="{width}" height="{height}" '
        f'loading="lazy" decoding="async"></a>\n'
        f'  <figcaption>{e(item["caption"])} '
        f'<a href="{src}" target="_blank" rel="noopener">画像の文字を拡大して読む</a></figcaption>\n'
        f' </figure>\n'
        f' <div class="about-story__copy">\n'
        f'  <p class="about-story__serial">EPISODE {day:02d} / 12</p>\n'
        f'  <h4 id="episode-{day:02d}-title">{e(item["title"])}</h4>\n'
        f'  <p class="about-story__subhead">{e(item["subtitle"])}</p>\n'
        f'  {paragraphs}\n'
        f'  <blockquote class="about-story__insight">{e(item["insight"])}</blockquote>\n'
        f'{note}\n'
        f' </div>\n'
        f'</article>\n'
    )

def render_chapter(chapter: dict, cards: list[dict]) -> str:
    assert len(cards) == 3
    sections = ''.join(render_episode(e) for e in cards)
    return (
        f'\n<section class="about-story__chapter" id="{e(chapter["id"])}" '
        f'aria-labelledby="{e(chapter["id"])}-title">\n'
        f' <header class="about-story__chapter-heading">\n'
        f'  <p class="about-story__chapter-label">{e(chapter["label"])} · {e(chapter["range"])} / 12</p>\n'
        f'  <h3 id="{e(chapter["id"])}-title">{e(chapter["title"])}</h3>\n'
        f'  <p>{e(chapter["lead"])}</p>\n'
        f' </header>\n'
        f'{sections}'
        f'\n</section>\n'
    )

def build_story() -> str:
    chapters = DATA['chapters']
    episodes = DATA['episodes']
    assert len(chapters) == 4 and len(episodes) == 12
    assert [x['day'] for x in episodes] == list(range(1, 13))
    intro = (
        f'\n{START}\n'
        '<section class="about-story" id="developer-story" aria-labelledby="developer-story-title">\n'
        ' <div class="br-wrap">\n'
        '  <header class="about-story__intro">\n'
        '   <p class="about-story__eyebrow">TRAILFUSION AI · DEVELOPER STORY / 12 CHAPTERS</p>\n'
        '   <h2 id="developer-story-title">「勉強しなさい」から、<br><em>「もう1問！」</em>へ。</h2>\n'
        f'   <p class="about-story__intro-lead">{e(INTRO)}</p>\n'
        f'   <p class="about-story__intro-note">{e(DETAIL)}</p>\n'
        '   <div class="about-story__intro-meta" aria-label="この物語のテーマ">'
        '<span>親子の受験勉強から</span><span>40代の学び直し</span><span>AIと個人開発</span>'
        '<span>公開後も直し続ける</span></div>\n'
        '  </header>\n'
        '  <nav class="about-story__contents" aria-label="12のエピソードの目次">\n'
    )
    for chapter in chapters:
        intro += (
            f'   <a href="#{e(chapter["id"])}">'
            f'<small>{e(chapter["label"])} · {e(chapter["range"])}</small>'
            f'<strong>{e(chapter["short"])}</strong></a>\n'
        )
    intro += (
        '  </nav>\n'
        '  <p class="about-story__intro-note">'
        '掲載する人物・場面は、実体験をもとに制作したAIイメージです。'
        '実際の子どもや家族の写真ではありません。'
        'この記録は合格や成績向上を保証するものではありません。</p>\n'
    )
    for i, chapter in enumerate(chapters):
        intro += render_chapter(chapter, episodes[3 * i:3 * i + 3])

    intro += (
        '\n  <aside class="about-story__closing" aria-labelledby="story-closing-title">\n'
        '   <p class="about-story__eyebrow">WHAT I WANT TO BUILD NEXT</p>\n'
        '   <h3 id="story-closing-title">まず、一人をよく見て。<br>学び続けたくなる未来へ。</h3>\n'
        '   <p>私は「作ったら終わり」にしたくありません。使ってくれた人が迷った場所を調べ、'
        '問題と答えの正しさを確かめ、必要なら何度でも直す。'
        '息子に楽しく学んでほしいという出発点は、これからも変わりません。</p>\n'
        '   <p>この考え方は、家族との車旅やキャンピングカーのDIY、AIを使った他のアプリ開発にもつながっています。'
        '大きな成功談を語るよりも、まず目の前で困っている誰かの「こうできたら」を形にしたいのです。</p>\n'
        '   <div class="actions">'
        '    <a class="btn btn-main" href="/quest/">合格！クエストの学び方を見る</a>'
        '    <a class="btn btn-sub" href="/car-concierge.html">旅から生まれたアプリ</a>'
        '    <a class="btn btn-sub" href="/garage/">つくり手のガレージ</a>'
        '   </div>\n'
        '   <div class="stores" style="justify-content:center">'
        '    <a class="store small" href="https://apps.apple.com/jp/app/id6775411516"'
        ' data-store="ios" data-app="quest" data-placement="about-story"'
        ' target="_blank" rel="noopener noreferrer" aria-label="合格！クエストをApp Storeで見る">'
        ' <span><small>iPhone / iPad</small><strong>App Store</strong></span></a>'
        '    <a class="store small" href="https://play.google.com/store/apps/details?id=com.gokakushakaiquest.app"'
        ' data-store="android" data-app="quest" data-placement="about-story"'
        ' target="_blank" rel="noopener noreferrer" aria-label="合格！クエストをGoogle Playで見る">'
        ' <span><small>Android</small><strong>Google Play</strong></span></a>'
        '   </div>\n'
        '   <p class="story-caveat">まずは気になる単元を一つ。無料で試せる範囲と有料機能はストア内でご確認ください。'
        ' 学習効果や合格を保証するものではありません。</p>\n'
        '  </aside>\n'
        ' </div>\n'
        '</section>\n'
        f'{END}\n'
    )
    return intro

def patch_page() -> None:
    assert CSS.is_file()
    before = PAGE.read_text(encoding='utf-8')
    s = before
    if START in s:
        assert s.count(START) == 1 and s.count(END) == 1
        first = s.index(START)
        last = s.index(END, first) + len(END)
        s = s[:first].rstrip('\n') + '\n' + s[last:].lstrip('\n')
    else:
        assert END not in s
    # Introduce the journal near the existing about-page hero without replacing
    # the other founder, travel, studio, privacy or contact sections.
    hero_start = s.index('<section class="page-hero">')
    hero_end = s.index('</section>', hero_start) + len('</section>')
    hero = s[hero_start:hero_end]
    jump = '<a class="about-story__hero-jump" href="#developer-story">親子の学びから始まった12の実録を読む ↓</a>'
    if jump not in hero:
        assert '</p></div></section>' in hero
        hero = hero.replace('</p></div></section>', f'</p>{jump}</div></section>')
        s = s[:hero_start] + hero + s[hero_end:]
        hero_end = hero_start + len(hero)
    s = s[:hero_end] + build_story() + s[hero_end:].lstrip('\n')
    assert s.count(START) == s.count(END) == 1
    assert 'id="developer-story"' in s
    new_title = '開発者について｜親子の学びから始まった12の物語｜TrailFusion AI'
    new_desc = ('「勉強しなさい」を「もう1問！」へ。40代でAIを使ったアプリ開発に挑んだ'
                'TrailFusion AIの開発者が、息子の中学受験、最初の失敗、教材の工夫、'
                '利用者の声から学んだ4か月を12枚のイラストで語ります。')
    s, count = re.subn(r'<title>[^<]+</title>',f'<title>{e(new_title)}</title>',s,count=1)
    assert count == 1
    s, count = re.subn(r'(<meta name="description" content=")[^"]*(")',lambda m:m.group(1)+e(new_desc)+m.group(2),s,count=1)
    assert count == 1
    for key, value in {'og:title':new_title,'og:description':new_desc,'og:image':WEBSITE+STORY_ROOT+'og-story.jpg'}.items():
        rx = r'(<meta property="'+key+'" content=")[^"]*(")'
        s, count = re.subn(rx,lambda m:m.group(1)+e(value)+m.group(2),s,count=1)
        assert count == 1, key
    if '<meta name="twitter:image"' not in s:
        s = s.replace('<meta name="twitter:card" content="summary_large_image">',
                      '<meta name="twitter:card" content="summary_large_image">'
                      f'<meta name="twitter:image" content="{WEBSITE+STORY_ROOT}journey-01.webp">')
    if '/assets/css/about-story.css' not in s:
        s=s.replace('<script defer src="/assets/js/brand.js?v=20261025-2"></script>',
                    '<link rel="stylesheet" href="/assets/css/about-story.css?v=20261107">'
                    '<script defer src="/assets/js/brand.js?v=20261025-2"></script>')
    # Structured data: make the developer and page clearly refer to one another.
    rx=r'(<script type="application/ld\+json">)(.*?)(</script>)'
    match = re.search(rx,s,flags=re.S)
    assert match
    schema=json.loads(match.group(2))
    graph=schema['@graph']
    page=next((x for x in graph if x.get('@type')=='WebPage'),None)
    assert page
    page['name']=new_title
    page['description']=new_desc
    page['image']=WEBSITE+STORY_ROOT+'og-story.jpg'
    page['about']={'@id':WEBSITE+'/about/#hiro'}
    graph[:]=[x for x in graph if x.get('@id')!=WEBSITE+'/about/#hiro']
    graph.append({'@type':'Person','@id':WEBSITE+'/about/#hiro','name':'湯浅 浩章',
                  'alternateName':'Hiro','url':WEBSITE+'/about/',
                  'description':'TrailFusion AIの開発者。親子の中学受験、車旅、DIYを出発点に、AIを活用したアプリを開発しています。',
                  'worksFor':{'@id':WEBSITE+'/#org'},'knowsAbout':['学習アプリ設計','AIを使った個人開発','キャンピングカーDIY','家族の車旅']})
    s = s[:match.start()] + match.group(1) + json.dumps(schema,ensure_ascii=False,separators=(',',':')) + match.group(3) + s[match.end():]
    assert s.count('id="episode-') == 24  # one on article, one on title
    PAGE.write_text(s,encoding='utf-8')
    # Update only the already-listed about URL in the existing sitemap.
    sitemap=ROOT/'sitemap.xml'
    current=sitemap.read_text(encoding='utf-8')
    old='<loc>https://trailfusionai.com/about/</loc><lastmod>2026-10-25</lastmod>'
    new='<loc>https://trailfusionai.com/about/</loc><lastmod>2026-11-07</lastmod>'
    assert old in current or new in current
    if old in current:
        sitemap.write_text(current.replace(old,new,1),encoding='utf-8')
    print('ABOUT_STORY_WRITTEN',len(s),'HTML bytes','12 episodes','4 chapters')

if __name__ == '__main__':
    patch_page()
