"""Build the TrailFusion brand site (Japanese + English) and bring every older page into the new chrome.

  python3 scripts/brand/build.py

1. Writes the new pages: top, apps, about, garage (ja) and top, apps (en).
2. Swaps the old header/footer of every other Japanese page (and the English hobby pages) for the brand
   chrome, keeping each page's own language selector (div.tf-extra) and content untouched.
3. Retires the 13 other locales: their files become redirects to the English page.
4. Rewrites sitemap.xml and llms.txt for the new structure. Stdlib + BeautifulSoup only.
"""
import re, sys, json, datetime
from pathlib import Path
from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).resolve().parent))
from brandsite import ROOT, BASE, CSS_VERSION, APPS, BY, LIVE, STORE, header, footer, page, app_schema  # noqa: E402
import home, pages, detail  # noqa: E402
from apps_content import C  # noqa: E402

TODAY = datetime.date(2026, 10, 25).isoformat()
QUEST_TODAY = datetime.date(2026, 10, 27).isoformat()  # /quest/ subject guides and FAQ added
RETIRED = ['zh-hans', 'ko', 'es', 'pt-br', 'fr', 'de', 'it', 'ru', 'tr', 'vi', 'th', 'hi', 'ar']
SKIP_DIRS = ('quest/', 'output/', 'archive/', 'node_modules/', 'data/') + tuple(d + '/' for d in RETIRED)
EN_HOBBY = {'diy/index.html': '/en/diy/', 'maintenance/index.html': '/en/maintenance/', 'travel/index.html': '/en/travel/'}
HEADER_RE = re.compile(r'<header class="(?:tf-header|br-header)".*?</header>', re.S)
FOOTER_RE = re.compile(r'<footer class="(?:tf-footer|br-footer)".*?</footer>', re.S)
BLOCKS = [re.compile(p, re.S) for p in (r'<!-- tf-localized:start -->.*?<!-- tf-localized:end -->', r'<!-- home-i18n:start -->.*?<!-- home-i18n:end -->',
                                        r'<!-- br-head -->.*?<!-- /br-head -->')]
HEAD = ('<!-- br-head --><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
        '<link href="https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@700;800;900&display=swap" rel="stylesheet">'
        f'<link rel="stylesheet" href="/assets/css/brand.css?v={CSS_VERSION}"><script defer src="/assets/js/brand.js?v={CSS_VERSION}"></script>{{alt}}<!-- /br-head -->')


def new_pages():
    written = []
    for lang, prefix in (('ja', ''), ('en', 'en/')):
        t = (lambda ja, en: ja if lang == 'ja' else en)
        other = '/en/' if lang == 'ja' else '/'
        written.append(page(prefix + 'index.html', lang,
                            t('TrailFusion AI｜合格！クエストほか、毎日をちょっと楽しくするアプリ', 'TrailFusion AI | Gokaku! Quest and apps for everyday life'),
                            t('TrailFusion AI は、学ぶ・話す・旅する・つくるを続けたくなるアプリをつくる個人開発スタジオ。12教材の学習アプリ「合格！クエスト」を中心に、もちのへや、車旅コンシェルジュ、Reel Make、VoiceLink などを公開しています。',
                              'TrailFusion AI is an indie studio making apps for learning, talking, travelling and creating. Home of Gokaku! Quest, a 12-course study app, plus Mochi, Car Concierge, Reel Make, VoiceLink and more.'),
                            home.body(lang), other, app_schema(lang) + home.faq_schema(lang)))
        written.append(page(prefix + 'apps.html', lang,
                            t('アプリ一覧｜TrailFusion AI', 'All apps | TrailFusion AI'),
                            t(f'TrailFusion AI のアプリ一覧。合格！クエスト、もちのへや、車旅コンシェルジュ、Reel Make、VoiceLink AI通訳など、App Store 公開中の{len(LIVE)}本と規約・サポート。',
                              f'All apps by TrailFusion AI: Gokaku! Quest, Mochi, Car Concierge, Reel Make, VoiceLink and more. {len(LIVE)} apps on the App Store, with terms and support.'),
                            pages.apps_body(lang), '/en/apps.html' if lang == 'ja' else '/apps.html', app_schema(lang)))
    for slug, c in C.items():
        has_en = 'en' in c
        for lang in (('ja', 'en') if has_en else ('ja',)):
            title, desc = detail.meta(slug, lang)
            other = ('/en/' + c['page'] if lang == 'ja' else '/' + c['page']) if has_en else '/en/apps.html'
            schema = [s for s in app_schema(lang) if s['name'] == (BY[slug]['ja'] if lang == 'ja' else BY[slug]['en'])]
            written.append(page(detail.path_of(slug, lang), lang, title, desc, detail.body(slug, lang), other, schema))
    written.append(page('about/index.html', 'ja', 'つくり手について｜TrailFusion AI',
                        'TrailFusion AI は湯浅 浩章（Hiro）の個人開発スタジオ。家族の中学受験、親子の車旅、キャンピングカーの自作から生まれたアプリづくりの考え方と原則。',
                        pages.about_body(), '/en/'))
    written.append(page('garage/index.html', 'ja', 'つくり手のガレージ｜車旅・キャンピングカーDIY・ハイエース整備｜TrailFusion AI',
                        'アプリづくりの原点になった、つくり手の趣味と記録。車旅の記録と絶景ロード図鑑、キャンピングカーDIY、ハイエース整備のページをまとめています。',
                        pages.garage_body(), '/en/travel/'))
    return written


def tools_of(header_html):
    extra = BeautifulSoup(header_html, 'html.parser').select_one('div.tf-extra')
    return str(extra) if extra else ''


def swap_chrome(path, lang, alt):
    s = path.read_text(encoding='utf-8')
    m = HEADER_RE.search(s)
    if not m:
        return False
    for block in BLOCKS:
        s = block.sub('', s)
    m = HEADER_RE.search(s)
    assert m, path
    s = s[:m.start()] + header(lang, alt, tools_of(m.group(0))) + s[m.end():]
    s = FOOTER_RE.sub(lambda _: footer(lang), s, count=1)
    rel = '/' + path.relative_to(ROOT).as_posix().removesuffix('index.html')
    alt_tags = ''
    if alt.startswith(('/en/', '/')) and (rel in EN_HOBBY.values() or rel in ['/' + k.removesuffix('index.html') for k in EN_HOBBY]):
        ja_url, en_url = (rel, alt) if lang == 'ja' else (alt, rel)
        alt_tags = (f'<link rel="alternate" hreflang="ja" href="{BASE + ja_url}"><link rel="alternate" hreflang="en" href="{BASE + en_url}">'
                    f'<link rel="alternate" hreflang="x-default" href="{BASE + ja_url}">')
    s = s.replace('</head>', HEAD.replace('{alt}', alt_tags) + '</head>', 1)
    path.write_text(s, encoding='utf-8')
    return True


def legacy_pages(generated):
    done = []
    for path in sorted(ROOT.rglob('*.html')):
        rel = path.relative_to(ROOT).as_posix()
        if rel.startswith(SKIP_DIRS) or '/' + rel.removesuffix('index.html') in generated:
            continue
        if rel.startswith('en/'):
            src = rel.removeprefix('en/')
            if '/' + rel in generated:
                continue
            if src not in EN_HOBBY:
                continue
            ok = swap_chrome(path, 'en', '/' + src.removesuffix('index.html'))
        else:
            ok = swap_chrome(path, 'ja', EN_HOBBY.get(rel, '/en/'))
        if ok:
            done.append(rel)
    return done


def retire_locales():
    targets = {'index.html': '/en/', 'apps.html': '/en/apps.html', 'diy/index.html': '/en/diy/', 'maintenance/index.html': '/en/maintenance/', 'travel/index.html': '/en/travel/'}
    count = 0
    for d in RETIRED:
        for src, dest in targets.items():
            path = ROOT / d / src
            if not path.exists():
                continue
            path.write_text(f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>TrailFusion AI</title><meta name="robots" content="noindex,follow">
<link rel="canonical" href="{BASE + dest}"><meta http-equiv="refresh" content="0; url={dest}"></head>
<body><p>This language version has moved. <a href="{dest}">Continue in English</a> or <a href="/">日本語</a>.</p></body></html>
''')
            count += 1
    return count


def sitemap(changed):
    old = re.findall(r'<url><loc>(.*?)</loc><lastmod>(.*?)</lastmod></url>', (ROOT / 'sitemap.xml').read_text())
    keep = {u: d for u, d in old if not any(u.startswith(f'{BASE}/{x}/') for x in RETIRED)}
    quest_pages = json.loads((ROOT / 'docs/quest/pages.json').read_text())
    for rel in quest_pages:
        keep[BASE + rel] = QUEST_TODAY
    for rel in changed:
        url = BASE + rel if rel.startswith('/') else BASE + '/' + rel.removesuffix('index.html')
        if url.endswith('404.html'):
            continue
        keep[url] = TODAY
    rows = ''.join(f'  <url><loc>{u}</loc><lastmod>{d}</lastmod></url>\n' for u, d in sorted(keep.items(), key=lambda x: (x[0] != BASE + '/', x[0])))
    (ROOT / 'sitemap.xml').write_text(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{rows}</urlset>\n')
    return len(keep)


LLMS_JA = """## 日本語の要約（{today}）
合格！クエスト（TrailFusion AI・提供者名 hiroaki yuasa）は、中学受験（小学4〜6年生）の理科・社会・国語・算数を、イラスト図鑑と4択クイズで復習する学習アプリです。同じアプリで資格・語学（ITパスポート・FP・簿記・宅建士・SPI3・日本語・英語・運転免許）も学べます。iPhone・iPad（App Store）とAndroid（Google Play）で配信。ダウンロード無料・アプリ内課金あり。塾や過去問演習の代わりではなく、復習と確認の補助教材で、合格を保証するものではありません。

### 中学受験の科目別ガイド
- [中学受験 理科・社会・国語・算数アプリ（総合）]({base}/quest/juken/)
- [中学受験 理科アプリ]({base}/quest/juken/science/)：36単元・7,742問・図鑑539ページ。生命・地球・物質・エネルギー。
- [中学受験 社会アプリ]({base}/quest/juken/social/)：53単元・5,327問・図鑑630ページ。地理・歴史・公民。
- [中学受験 国語アプリ]({base}/quest/juken/kokugo/)：94単元・4,550問・図鑑500ページ。語彙・ことわざ慣用句・漢字・ことばのきまり・読解。
- [中学受験 算数アプリ]({base}/quest/juken/math/)：55単元・6,600問・図鑑540ページ。数と計算・変化と関係・データの活用・図形・文章題。
- [中学受験 暗記アプリ]({base}/quest/juken/anki/)：図鑑で理解、4択で思い出し、まちがい直しで定着。
- [よくある質問]({base}/quest/faq/)、[料金・購入ガイド]({base}/quest/plans/)、[中学受験4科]({base}/quest/school4/)
数は2026年10月25日確認の収録データ（無料・Pro対象を含む）。各問題は偏差値の目安で40・50・60・70の4段階（難易度区分であり模試の偏差値とは別）。

### 単体アプリとの関係
- 合格理科クエスト（理科だけの単体アプリ）: https://apps.apple.com/jp/app/id6772644144
- 合格！国語クエスト（国語だけの単体アプリ）: https://apps.apple.com/jp/app/id6780125916
- 合格！クエスト（統合版・4科まとめて）: https://apps.apple.com/jp/app/id6775411516 / Google Play: com.gokakushakaiquest.app
- 以前の「合格！社会クエスト」のストア掲載ページは、現在は統合版です。
- 単体アプリの購入と学習記録は、アプリ内の案内に沿って統合版へ引き継げます。

### 無料とPro
無料: 偏差値40・50の問題、まちがい直し、王国マップ、最初の5単元の読み上げ。Pro（1科目・中学受験4科・全科目）: 偏差値60・70、全対象の読み上げ、図鑑の全ページ、広告なし。価格はアプリ内の購入画面の表示が正です。

### 資格・語学（別セクション）
合格！クエストでは宅建士・FP・日商簿記・ITパスポート・SPI3・日本語（JLPT・JFT-Basic対策）・英語（TOEIC・TOEFLなど）・運転免許（学科）も学べます。 [12教材の一覧]({base}/quest/#courses)
"""

LLMS_FULL = """
## Gokaku! Quest for Japanese junior-high entrance exams (chugaku juken), in English
Gokaku! Quest teaches the four school subjects of Japanese junior-high entrance exams (grades 4 to 6) with an illustrated atlas, one-question-per-screen four-choice quizzes, a mistakes review and a kingdom-building map that grows as you study.
- Science: 36 units, 7,742 questions, 539 atlas pages. {base}/quest/juken/science/
- Social studies: 53 units, 5,327 questions, 630 atlas pages. {base}/quest/juken/social/
- Japanese language: 94 units, 4,550 questions, 500 atlas pages. {base}/quest/juken/kokugo/
- Math: 55 units, 6,600 questions, 540 atlas pages. {base}/quest/juken/math/
- Questions come in four difficulty bands labelled 40, 50, 60 and 70 (a difficulty label, not a mock-exam deviation score). 40 and 50 are free; 60 and 70 are Pro.
- It is a review aid, not a replacement for cram school or past-paper practice, and it does not guarantee admission.
- Single-subject predecessors: Gokaku Rika Quest (science) and Gokaku! Kokugo Quest (Japanese language). Their purchases and progress can move to Gokaku! Quest from inside the app.
- Figures as of 2026-10-25 (release manifest). App Store Japan rating 4.37 from 114 ratings (2026-10-27).
"""


def llms():
    apps = '\n'.join(f'- [{a["en"]}]({BASE}{a["detail"] or "/apps.html#" + a["slug"]}) — {a["tag_en"]}'
                     + (f' App Store: https://apps.apple.com/app/id{a["ios"]}' if a['status'] == 'live' else ' (in App Store review)') for a in APPS if a['group'] == 'main')
    q = sum(c['questions'] for c in home.QUEST_STATS.values())
    text = f'''# TrailFusion AI

> TrailFusion AI is the indie app studio of Hiroaki Yuasa. It makes apps for learning, talking, travelling and creating. The flagship is Gokaku! Quest, one study app with 12 courses (Japanese entrance-exam science, social studies, Japanese and math, plus certifications, Japanese, English and driving theory).

Updated: {TODAY}
Website: {BASE}/ (Japanese) and {BASE}/en/ (English)
Contact: trailfusionai@gmail.com
App Store publisher name: hiroaki yuasa

## Key facts (App Store Japan, {TODAY})
- Apps on the App Store: {len(LIVE)}; one more (Mochi) is in review.
- App Store ratings across all apps: {sum(STORE[a["slug"]]["ratings"] for a in LIVE)}.
- Gokaku! Quest: 12 courses, {q:,} questions, illustrated atlases for every course; levels 40 and 50 are free, 60 and 70 are Pro.

## Apps
{apps}

## Pages
- [Apps catalog]({BASE}/apps.html) / [English]({BASE}/en/apps.html)
- [Gokaku! Quest site]({BASE}/quest/) with [12 course guides]({BASE}/quest/#courses) and [pricing]({BASE}/quest/plans/)
- [Entrance-exam (chugaku juken) subject guides]({BASE}/quest/juken/) and [FAQ]({BASE}/quest/faq/)
- [About the maker]({BASE}/about/)
- [Support, app terms and privacy]({BASE}/support/)
- [The maker's garage]({BASE}/garage/): personal notes on road trips, a camper-van DIY build and Hiace maintenance. These are hobby records, not apps.
'''
    ja = LLMS_JA.format(base=BASE, today=QUEST_TODAY)
    full = text + '\n' + ja + LLMS_FULL.format(base=BASE)
    (ROOT / 'llms.txt').write_text(text + '\n' + ja)
    (ROOT / 'llms-full.txt').write_text(full)


def main():
    generated = new_pages()
    legacy = legacy_pages(generated)
    retired = retire_locales()
    urls = sitemap(generated + legacy)
    llms()
    js = ROOT / 'assets/js/site-v2.js'
    s = js.read_text()
    s = re.sub(r"\n  /\* The standalone Quest hub is retired\..*?\n  }\n", '\n', s, flags=re.S)
    js.write_text(s)
    print(json.dumps({'new_pages': generated, 'chrome_swapped': len(legacy), 'retired_locale_files': retired, 'sitemap_urls': urls}, ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
