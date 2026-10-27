"""TrailFusion top page (ja / en). Quest is the flagship; other apps follow; hobby notes live in /garage/."""
import json
from brandsite import ROOT, BY, LIVE, STORE, RATINGS, QUEST_STATS, SNAPSHOT_DATE, CATS, DIM, esc, tx, img, icon, bg, stores, rating

QDIM = json.loads((ROOT / 'docs/quest/image-dimensions.json').read_text())
CHECK = '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="10" fill="currentColor"/><path d="m5.5 10.2 3 3 6-6.4" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
Q_QUESTIONS = sum(c['questions'] for c in QUEST_STATS.values())
Q_PAGES = sum(c['atlasPages'] for c in QUEST_STATS.values())


def qimg(name, alt, cls='', eager=False):
    w, h = QDIM[name]
    load = 'loading="eager"' if eager else 'loading="lazy"'
    return f'<img src="/assets/quest/{name}.webp" alt="{esc(alt)}" class="{cls}" width="{w}" height="{h}" {load} decoding="async">'


def head(tag, title, lead='', center=False):
    lead = f'<p class="lead">{lead}</p>' if lead else ''
    return f'<div class="sec-head{" center" if center else ""}"><span class="tag">{tag}</span><h2>{title}</h2>{lead}</div>'


def checks(items):
    return '<ul class="checks">' + ''.join(f'<li>{CHECK}{x}</li>' for x in items) + '</ul>'


def name(slug, lang):
    return BY[slug]['ja'] if lang == 'ja' else BY[slug]['en']


def hero(lang):
    t = tx(lang)
    p = '' if lang == 'ja' else '/en'
    dock = ''.join(f'<a href="{BY[s]["detail"] or p + "/apps.html#" + s}" class="dock-item">{icon(s, lang, "dock-icon", True)}<span>{name(s, lang)}</span></a>'
                   for s in ['mochi', 'car-concierge', 'reelmake', 'voicelink', 'buddytalk', 'wood-golem'])
    atlases = ''.join(qimg(f'{c}-atlas', alt, 'fan-' + str(i), True) for i, (c, alt) in enumerate(
        [('junior-science', t('理科の図鑑', 'Science atlas')), ('junior-social', t('社会の図鑑', 'Social studies atlas')), ('junior-math', t('算数の図鑑', 'Math atlas'))]))
    return f'''<section class="hero">{bg("hero", True)}<div class="br-wrap hero-grid">
<div class="hero-copy"><span class="tag">{t("TrailFusion のアプリ", "Apps by TrailFusion")}</span>
<h1>{t("毎日に、<br>ちいさな冒険を。", "Small adventures<br>for every day.")}</h1>
<p class="lead">{t("学ぶ、話す、旅する、つくる。暮らしの中の「むずかしい」「めんどう」を、つい続けたくなるアプリに変えています。", "Learning, talking, travelling, making. We turn the hard and tedious parts of everyday life into apps you actually want to keep using.")}</p>
<div class="actions"><a class="btn btn-main" href="/quest/">{t("合格！クエストを見る", "See Gokaku! Quest")} <b aria-hidden="true">→</b></a><a class="btn btn-sub" href="{p}/apps.html">{t("すべてのアプリ", "All apps")}</a></div></div>
<a class="flagship-card" href="/quest/"><span class="flag-ribbon">{t("いちばんの自信作", "Our flagship")}</span>
<div class="flag-top">{icon("quest", lang, "flag-icon", True)}<div><strong>{name("quest", lang)}</strong><small>{t("受験・資格・語学", "Exams, certifications, languages")}</small>{rating("quest", lang)}</div></div>
<div class="flag-fan">{atlases}</div>
<dl class="flag-nums"><div><dt>{t("教材", "Courses")}</dt><dd>12</dd></div><div><dt>{t("問題", "Questions")}</dt><dd>{Q_QUESTIONS:,}</dd></div><div><dt>{t("図鑑", "Atlas pages")}</dt><dd>{Q_PAGES:,}</dd></div></dl>
<span class="flag-go">{t("12教材をひとつのアプリで", "12 courses in one app")} →</span></a>
</div><div class="br-wrap dock-wrap"><p class="dock-label">{t("ほかにも、暮らしのいろんな場面に", "And for other parts of the day")}</p><div class="dock">{dock}</div></div></section>'''


def proof(lang):
    t = tx(lang)
    latest = max(STORE[a['slug']]['updated'] for a in LIVE)
    y, m, d = latest.split('-')
    latest_txt = t(f'{int(m)}月{int(d)}日', f'{["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][int(m)]} {int(d)}')
    cells = [(t('公開中のアプリ', 'Apps on the App Store'), str(len(LIVE)), t('すべて無料でダウンロード', 'All free to download')),
             (t('App Store の評価', 'App Store ratings'), f'{RATINGS:,}', t('件（全アプリの合計）', 'ratings across all apps')),
             (t('合格！クエストの問題', 'Questions in Gokaku! Quest'), f'{Q_QUESTIONS:,}', t('問（12教材の合計）', 'across 12 courses')),
             (t('いちばん新しい更新', 'Latest update'), latest_txt, t(f'{y}年', y))]
    body = ''.join(f'<div><dt>{a}</dt><dd><span class="num">{b}</span><small>{c}</small></dd></div>' for a, b, c in cells)
    return f'''<section class="proof veil" aria-label="{t("数字で見る TrailFusion", "TrailFusion in numbers")}">{bg("kites")}<div class="br-wrap"><dl class="proof-board">{body}</dl>
<p class="note">{t(f"{SNAPSHOT_DATE[0]}時点の App Store（日本）の公開情報と、合格！クエストの収録データ。もちのへやは審査中のため数に含めていません。", f"App Store (Japan) public data and Gokaku! Quest course data as of {SNAPSHOT_DATE[1]}. Mochi is in review and not counted.")}</p></div></section>'''


def flagship(lang):
    t = tx(lang)
    phones = ''.join(f'<figure class="phone p{i}">{qimg(n, alt)}</figure>' for i, (n, alt) in enumerate(
        [('junior-science-quiz', t('理科の問題と解説の画面', 'Science question screen')), ('junior-social-quiz', t('社会の問題と解説の画面', 'Social studies question screen')),
         ('junior-math-quiz', t('算数の問題と解説の画面', 'Math question screen'))]))
    items = [t(f'全12教材にイラスト図鑑（{Q_PAGES:,}ページ）', f'Illustrated atlases for all 12 courses ({Q_PAGES:,} pages)'),
             t('問題の絵・イラスト解説・読み上げで、理由までわかる', 'Question art, illustrated explanations and read-aloud audio'),
             t('学ぶほど自分の王国マップが育つ', 'A kingdom map that grows as you learn'),
             t('1台をきょうだいで。プロフィールを切りかえて記録を分けられる', 'Switch profiles so siblings keep separate records')]
    return f'''<section class="sec flagship veil" id="quest">{bg("quest:kingdom")}<div class="br-wrap flag-grid">
<div>{head(t("フラッグシップ", "Flagship"), t("まんなかにあるのは、<br><mark>合格！クエスト</mark>。", "At the centre:<br><mark>Gokaku! Quest</mark>."),
           t("家族の中学受験から生まれた学習アプリです。理科・社会・国語・算数に、宅建士・FP・簿記・ITパスポート・SPI3・日本語・英語・運転免許を加えた12教材を、ひとつのアプリで学べます。",
             "A study app born from our own family's entrance-exam years. Science, social studies, Japanese and math, plus real-estate, financial planning, bookkeeping, IT Passport, SPI3, Japanese, English and driving theory, in one app."))}
{checks(items)}
<p class="fine">{t("難易度40・50の問題は無料、60・70や図鑑の全ページなどは Pro。アプリ内課金・広告あり。", "Level 40 and 50 questions are free; levels 60 and 70 and the full atlases are Pro. In-app purchases and ads.")}</p>
<p class="fine">{t("中学受験の教科別ガイド：", "Entrance-exam guides (Japanese): ")}<a href="/quest/juken/science/">{t("理科", "Science")}</a>・<a href="/quest/juken/social/">{t("社会", "Social studies")}</a>・<a href="/quest/juken/kokugo/">{t("国語", "Japanese")}</a>・<a href="/quest/juken/math/">{t("算数", "Math")}</a>・<a href="/quest/juken/anki/">{t("暗記アプリ", "Memorization")}</a>・<a href="/quest/faq/">{t("よくある質問", "FAQ")}</a></p>
<div class="actions"><a class="btn btn-main" href="/quest/">{t("合格！クエストのページへ", "Visit the Gokaku! Quest site")} <b aria-hidden="true">→</b></a></div>{stores("quest", lang, "home-flagship")}</div>
<div class="phones">{phones}<figure class="kingdom-chip">{qimg("kingdom", t("王国マップの画面", "Kingdom map screen"))}<figcaption>{t("学ぶほど育つ王国マップ", "Your kingdom grows as you learn")}</figcaption></figure></div>
</div></section>'''


SPOTS = {
    'mochi': dict(bg='room', ja=('話すと、気持ちが<br><mark>ことば</mark>になる。', 'もちもちの相棒「もち」と、声や文字でおはなし。うれしい日もモヤモヤする日も、そばで聞いて表情で応えます。',
                                 ['声で話せる、もちもちの相棒', '昔の人の考え方で気持ちを整理する「ことばの引き出し」', '日記と気分カレンダーで、ふたりの日々が思い出に']),
                  en=('Talk, and your feelings<br>turn into <mark>words</mark>.', 'Chat with Mochi, a soft companion, by voice or text. On good days and cloudy ones, Mochi listens and answers with its face.',
                      ['A companion you can talk to out loud', 'A "drawer of words" that borrows ideas from old thinkers to sort out feelings', 'A diary and mood calendar that keep your days together'])),
    'car-concierge': dict(bg='coast', ja=('今夜どこで休む？を、<br><mark>ひとつの地図</mark>で。', '親子の北海道旅から生まれた車旅アプリ。道の駅・RVパーク・SA／PA・駐車場・温泉を同じ地図で探せます。',
                                          ['全国10万件以上の駐車場を収録し、料金を比較', 'EV充電スポットと、充電時間・料金の目安', '走った道を「旅ログ」として地図に残せる']),
                          en=('Where to rest tonight,<br>on <mark>one map</mark>.', 'A road-trip app born from a parent-and-child drive around Hokkaido. Roadside stations, RV parks, service areas, parking and hot springs on a single map.',
                              ['Over 100,000 car parks with fee comparison', 'EV chargers with charging-time and cost estimates', 'Keep the roads you drove as a travel log'])),
    'reelmake': dict(bg='studio', ja=('写真を選ぶだけで、<br><mark>ナレーションつき</mark>の動画に。', 'スマホの写真と短い動画から、縦型のリール動画をAIが仕上げます。動画づくりの知識はいりません。',
                                   ['構成・台本・ナレーション・字幕・カット編集をAIが自動で', '最大60種類の多言語ボイスから話し手を選べる', 'SNSに合わせた縦型サイズで書き出し']),
                     en=('Pick your photos.<br>Get a video with <mark>narration</mark>.', 'AI turns the photos and short clips on your phone into a finished vertical reel. No editing skills needed.',
                         ['Structure, script, voice, captions and cuts done by AI', 'Up to 60 multilingual voices to choose from', 'Exports in vertical sizes for social media'])),
    'voicelink': dict(bg='world', ja=('話した内容は、<br><mark>端末の外に出ない</mark>。', '音声認識・翻訳・要約をすべて iPhone・iPad の中で処理するリアルタイム通訳アプリです。',
                                   ['言語モデルのダウンロード後は機内モードでも使える', '原文と訳文を1文ずつ並べて表示。20言語に対応', 'アカウント登録なし・広告なし。Pro は買い切り']),
                      en=('What you say<br><mark>never leaves the device</mark>.', 'A real-time interpreter that runs speech recognition, translation and summaries entirely on your iPhone or iPad.',
                          ['Works in airplane mode once the language model is downloaded', 'Original and translation side by side, 20 languages', 'No account, no ads. Pro is a one-time purchase'])),
}


def spotlights(lang):
    t = tx(lang)
    out = []
    for i, (slug, s) in enumerate(SPOTS.items()):
        title, lead, items = s[lang]
        a = BY[slug]
        shots = ''.join(f'<figure class="shot s{k}">{img(f"{slug}/shot-{k}.webp", t(f"{a["ja"]}の画面 {k}", f"{a["en"]} screen {k}"))}</figure>' for k in (1, 2, 3)
                        if f'{slug}/shot-{k}' in DIM)
        more = (f'<a class="text-link" href="{a["detail"]}">{t("くわしく見る", "Learn more")} →</a>' if a['detail'] else
                f'<a class="text-link" href="{a["legal"]["support"]}">{t("サポート・プライバシー", "Support & privacy")} →</a>')
        cat = CATS[a['cat']]
        out.append(f'''<article class="spot{" flip" if i % 2 else ""}" id="{slug}" style="--c:{cat[2]}">{bg(s["bg"]) if s["bg"] else ""}
<div class="spot-copy"><p class="spot-app">{icon(slug, lang, "spot-icon")}<span><small style="color:{cat[2]}">{cat[0] if lang == "ja" else cat[1]}</small><strong>{name(slug, lang)}</strong>{rating(slug, lang) if a["status"] == "live" else ""}</span></p>
<h3>{title}</h3><p>{lead}</p>{checks(items)}{stores(slug, lang, "home-spot", True)}{more}</div>
<div class="spot-shots">{shots}</div></article>''')
    return f'''<section class="sec spots veil" id="apps">{bg("dawn")}{head(t("アプリのなかま", "The app family"), t("暮らしのいろんな場面に、<br><mark>ちいさな相棒</mark>を。", "A small companion<br>for <mark>each part of the day</mark>."),
                                                      t("話す、旅する、つくる、伝える。どのアプリも「自分たちが使いたかったもの」から始まっています。", "Talking, travelling, making, translating. Every app started as something we wanted to use ourselves."), True)}
<div class="br-wrap">{"".join(out)}</div></section>'''


def more_apps(lang):
    t = tx(lang)
    p = '' if lang == 'ja' else '/en'
    cards = ''
    for slug in ['buddytalk', 'english-quest', 'fp-quest', 'word-blaster', 'wood-golem', 'hacking-timer']:
        a = BY[slug]
        cat = CATS[a['cat']]
        cards += (f'<a class="mini" href="{a["detail"] or p + "/apps.html#" + slug}" style="--c:{cat[2]}">{icon(slug, lang, "mini-icon")}'
                  f'<span><small>{cat[0] if lang == "ja" else cat[1]}</small><strong>{name(slug, lang)}</strong>{rating(slug, lang)}</span>'
                  f'<p>{a["tag_ja"] if lang == "ja" else a["tag_en"]}</p></a>')
    return f'''<section class="sec more veil">{bg("shelf")}<div class="br-wrap">{head(t("ほかのアプリ", "More apps"), t("学ぶ・遊ぶ・集中する。", "Learn, play, focus."), "", True)}
<div class="mini-grid">{cards}</div><p class="center"><a class="btn btn-sub" href="{p}/apps.html">{t("すべてのアプリと規約・サポート", "All apps, policies and support")} →</a></p></div></section>'''


def trust(lang):
    t = tx(lang)
    recent = sorted(((STORE[a['slug']]['updated'], a['slug']) for a in LIVE if a['group'] == 'main'), reverse=True)[:5]
    rows = ''.join(f'<li><span>{name(s, lang)}</span><time datetime="{d}">{d.replace("-", ".")}</time></li>' for d, s in recent)
    cards = [
        ('01', t('自分と家族が使うものから', 'We start from our own needs'),
         t('合格！クエストは家族の中学受験から、車旅コンシェルジュは親子の北海道旅から生まれました。まず自分たちが毎日使い、気づいたことを直しています。',
           'Gokaku! Quest came from our family\'s entrance-exam years, Car Concierge from a drive around Hokkaido. We use them every day and fix what we notice.')),
        ('02', t('集めるもの・集めないものを書く', 'We say what we collect, and what we don\'t'),
         t('すべてのアプリにプライバシーポリシーと問い合わせ窓口を用意しています。VoiceLink は話した内容を端末の外に送りません。',
           'Every app has a privacy policy and a support contact. VoiceLink never sends what you say off the device.')),
        ('03', t('子どもが使うアプリは、とくに丁寧に', 'Extra care for apps children use'),
         t('合格！クエストは、無料で使える範囲・Pro・広告の扱いを料金ページで説明しています。サブスクリプションは App Store／Google Play の設定で管理・解約できます。',
           'Gokaku! Quest explains what is free, what is Pro and how ads work on its pricing page. Subscriptions are managed and cancelled in App Store or Google Play settings.')),
        ('04', t('出したあとも直し続ける', 'We keep improving after release'), t('最近の更新日（App Store）', 'Recent App Store updates') + f'<ul class="updates">{rows}</ul>'),
    ]
    body = ''.join(f'<article><span class="no">{n}</span><h3>{h}</h3><div>{d}</div></article>' for n, h, d in cards)
    return f'''<section class="sec trust veil">{bg("planes")}<div class="br-wrap">{head(t("信頼のために", "Trust"), t("安心して使ってもらうために、<br><mark>決めていること</mark>。", "What we promise,<br><mark>so you can trust the apps</mark>."), "", True)}
<div class="trust-grid">{body}</div><p class="note center">{t(f"App Store の評価は全アプリ合計 {RATINGS}件（{SNAPSHOT_DATE[0]}時点・日本）。", f"{RATINGS} App Store ratings across all apps (Japan, as of {SNAPSHOT_DATE[1]}).")}</p></div></section>'''


def maker(lang):
    t = tx(lang)
    garage_cards = [('/travel/story.html' if lang == 'ja' else '/en/travel/', t('車旅の記録', 'Road trips'), t('47都道府県、約5万kmを走った旅のこと。', 'Notes from about 50,000 km across all 47 prefectures.')),
                    ('/diy/' if lang == 'ja' else '/en/diy/', t('キャンピングカーDIY', 'Camper van DIY'), t('床・断熱・家具・電装まで自分で作った記録。', 'Building the floor, insulation, furniture and wiring ourselves.')),
                    ('/maintenance/' if lang == 'ja' else '/en/maintenance/', t('ハイエース整備ノート', 'Van maintenance notes'), t('愛車の仕組みと整備の記録を3Dで。', 'How the van works, with 3D models and service notes.'))]
    gc = ''.join(f'<a class="g-card" href="{h}"><strong>{a}</strong><span>{b}</span></a>' for h, a, b in garage_cards)
    about = '/about/' if lang == 'ja' else '/about/'
    return f'''<section class="sec maker veil" id="maker">{bg("desk")}<div class="br-wrap maker-grid">
<div>{head(t("つくり手", "The maker"), t("ひとりの親が、<br><mark>家族と一緒に</mark>、<br>つくっています。", "Made by one parent,<br><mark>with the family</mark>."),
           t("TrailFusion AI は、湯浅 浩章（Hiro）の個人開発スタジオです。家族で中学受験に向き合い、親子で日本中を車で旅し、キャンピングカーを自分の手で作ってきました。その「困った」と「楽しい」を、アプリにしています。",
             "TrailFusion AI is the indie studio of Hiroaki Yuasa (Hiro). Facing entrance exams as a family, driving across Japan with the kids and building a camper van by hand: the troubles and the fun become apps."))}
<dl class="maker-nums"><div><dt>{t("公開中のアプリ", "Live apps")}</dt><dd>{len(LIVE)}</dd></div><div><dt>{t("車で旅した都道府県", "Prefectures driven")}</dt><dd>47</dd></div><div><dt>{t("走った距離", "Distance driven")}</dt><dd>{t("約5万km", "~50,000 km")}</dd></div></dl>
<div class="actions"><a class="btn btn-sub" href="{about}">{t("つくり手について", "About the maker (Japanese)")} →</a><a class="btn btn-sub" href="/partners/">{t("協業のご相談", "Partnerships (Japanese)")} →</a></div></div>
<div class="garage">{bg("garage", cls="bg garage-bg")}<div class="garage-in"><span class="tag">{t("つくり手のガレージ", "From the garage")}</span>
<h3>{t("アプリの外の、<br>つくり手の時間。", "Life outside the apps.")}</h3><p>{t("アプリではありませんが、アプリづくりの原点になった趣味の記録です。", "Not apps, but the hobbies that started them.")}</p>
<div class="g-cards">{gc}</div>{f'<a class="text-link" href="/garage/">ガレージをのぞく →</a>' if lang == 'ja' else ''}</div></div>
</div></section>'''


FAQ = {
    'ja': [('TrailFusion AI はだれが運営していますか？', '湯浅 浩章による個人開発スタジオです。App Store に表示されるアプリの提供者名は「hiroaki yuasa」です。'),
           ('アプリは無料ですか？', 'すべて無料でダウンロードできます。一部の機能や教材はアプリ内課金です。内容と価格は各アプリの購入画面でご確認ください。'),
           ('問い合わせはどこからできますか？', 'サポートページ、またはメール（trailfusionai@gmail.com）からお問い合わせください。アプリ別の利用規約とプライバシーポリシーもサポートページにまとめています。'),
           ('ハイエース整備やキャンピングカーDIYのページはどこにありますか？', 'アプリとは分けて「つくり手のガレージ」にまとめました。車旅の記録、絶景ロード図鑑、キャンピングカーDIY、ハイエース整備のページはすべてそのまま見られます。'),
           ('以前の理科・国語のアプリを使っています。', '学習記録と購入は、合格！クエストへ引き継げます。引き継ぎ方は合格！クエストの料金・購入ガイドをご覧ください。')],
    'en': [('Who is TrailFusion AI?', 'An indie studio run by Hiroaki Yuasa. On the App Store, the publisher name is "hiroaki yuasa".'),
           ('Are the apps free?', 'All apps are free to download. Some features and courses are in-app purchases; check the purchase screen in each app for details and prices.'),
           ('How do I contact you?', 'Use the support page or email trailfusionai@gmail.com. App-specific terms and privacy policies are listed on the support page.'),
           ('Are the apps in English?', 'Several apps support English, including Reel Make, VoiceLink, Word Blaster and BuddyTalk. Gokaku! Quest is built around Japanese courses.')],
}


def faq(lang):
    t = tx(lang)
    items = ''.join(f'<details><summary>{q}</summary><p>{a}</p></details>' for q, a in FAQ[lang])
    return f'''<section class="sec faq-sec veil">{bg("mailbox")}<div class="br-wrap narrow">{head(t("よくある質問", "FAQ"), t("はじめての方へ。", "Before you start."), "", True)}<div class="faq">{items}</div></div></section>'''


def closing(lang):
    t = tx(lang)
    return f'''<section class="closing">{bg("hero")}<div class="br-wrap"><div class="closing-card">{icon("quest", lang, "closing-icon")}
<h2>{t("まずは、<br>いちばんの自信作から。", "Start with<br>our flagship.")}</h2><p>{t("合格！クエストは無料でダウンロードできます。", "Gokaku! Quest is free to download.")}</p>{stores("quest", lang, "home-closing")}
<p class="fine">{t("アプリ内課金・広告あり。対応端末・教材・機能はOSや配信バージョンによって異なります。", "In-app purchases and ads. Devices, courses and features vary by OS and version.")}</p></div></div></section>'''


def faq_schema(lang):
    return [{'@type': 'FAQPage', 'mainEntity': [{'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in FAQ[lang]]}]


def body(lang):
    return hero(lang) + proof(lang) + flagship(lang) + spotlights(lang) + more_apps(lang) + trust(lang) + maker(lang) + faq(lang) + closing(lang)
