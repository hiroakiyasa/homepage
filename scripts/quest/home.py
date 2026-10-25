"""Home and shared marketing sections for the Quest site (v3, bright poster style).

Every number shown here comes from docs/quest/course-stats.json / usage-summary.json.
Free vs Pro wording follows the in-app comparison table: levels 40/50 free, 60/70 Pro,
voice for the first 5 units, atlas preview pages. Never say "everything free".
"""
import html

H = {}

# Subject accent colors used across cards, tabs and chips.
CAT = {'school': '#1f6fd0', 'qualification': '#6a4bd0', 'language': '#0b7f78', 'life': '#9a6200'}
SUBJECT = {
    'junior-science': ('#1f8a3c', '#e6f7e9'),
    'junior-social': ('#1f6fd0', '#e5f0ff'),
    'junior-kokugo': ('#d23a5c', '#ffe9ee'),
    'junior-math': ('#b35800', '#fff1de'),
}
CHECK = '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="10" fill="currentColor"/><path d="m5.5 10.2 3 3 6-6.4" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'


def setup(**helpers):
    H.update(helpers)


def esc(s):
    return html.escape(s)


def color(cid, group):
    return SUBJECT.get(cid, (CAT[group], '#f3efff'))[0]


def total(key):
    return sum(d[key] for d in H['STATS']['courses'].values())


def rika(name, alt='', cls='rika', eager=False):
    w = H['DIM'][name]
    return f'<img src="{H["A"]}{name}.webp" alt="{esc(alt)}" class="{cls}" width="{w[0]}" height="{w[1]}" loading="{"eager" if eager else "lazy"}" decoding="async">'


def head(tag, title, lead='', tone=''):
    lead_html = f'<p class="lead">{lead}</p>' if lead else ''
    return f'<div class="v-head {tone}"><span class="tag-star">{tag}</span><h2>{title}</h2>{lead_html}</div>'


def hero():
    c4 = H['COURSES'][:4]
    books = ''.join(
        f'<a class="book b{i}" href="/quest/courses/{c[1]}/" style="--c:{SUBJECT[c[0]][0]}"><span class="book-tab">{c[2]}</span>'
        f'{H["image"](c[0] + "-atlas", c[2] + "のイラスト図鑑：" + c[7], eager=True)}</a>'
        for i, c in enumerate(c4))
    more = ''.join(f'<a href="/quest/courses/{c[1]}/" style="--c:{CAT[c[3]]}">{c[2]}</a>' for c in H['COURSES'][4:])
    q = total('questions')
    pages = total('atlasPages')
    return f'''<section class="v-hero" id="top">{bg_layer("hero", eager=True)}<div class="wrap v-hero-grid">
<div class="v-hero-copy">
<p class="v-tags"><span class="t-navy">中学受験4科</span><span class="t-plus">＋</span><span class="t-white">資格・語学・暮らし</span></p>
<h1>中学受験の4科も、<br>資格も語学も。</h1>
<p class="mega-line"><span class="mega" data-n="12">12</span><span class="mega-unit">教材</span><span class="mega" data-n="{q:,}">{q:,}</span><span class="mega-unit">問</span></p>
<p class="mega-note">収録数は無料・Pro対象の合計（2026年10月25日時点）</p>
<p class="banner"><span>12教材が、ひとつのアプリに！</span></p>
<ul class="checks"><li>{CHECK}全12教材に<b>イラスト図鑑</b>（{pages:,}ページ）</li><li>{CHECK}<b>問題の絵</b>と<b>イラスト解説</b>で、理由までわかる</li><li>{CHECK}問題の<b>読み上げ</b>で、耳からも確かめられる</li></ul>
{H["stores"]("hero")}
<p class="fine">ダウンロード無料。難易度40・50の問題、図鑑のプレビュー、最初の5単元の読み上げは無料。60・70の問題、図鑑の全ページ、読み上げの全対象などはPro。<br>iPhone・iPad / Android　アプリ内課金・広告あり</p>
</div>
<div class="v-hero-art" role="group" aria-label="中学受験4科の実際のイラスト図鑑">
<div class="shelf">{books}</div>
{rika("rika-cheer", "", "rika hero-rika", eager=True)}
<p class="bubble-say">どの教科から<br>はじめる？</p>
<span class="stamp"><small>全12教材</small><b>図鑑</b><small>つき</small></span>
<div class="more-courses"><span>＋ 8教材</span>{more}</div>
</div>
</div></section>'''


def stats():
    q, pages, units = total('questions'), total('atlasPages'), total('unitCount')
    u = H['USAGE']
    items = [('教材', '12', '中学受験・資格・語学・暮らし'), ('問題', f'{q:,}', '教材内の重複IDを除いた数'),
             ('図鑑', f'{pages:,}', 'ページ。全12教材に収録'), ('単元', f'{units:,}', '教材ごとの学習単元の合計')]
    cells = ''.join(f'<div><dt>{label}</dt><dd><span class="num" data-n="{n}">{n}</span><small>{note}</small></dd></div>' for label, n, note in items)
    return f'''<section class="v-stats" id="track-record" aria-label="収録内容"><div class="wrap"><dl class="stat-board">{cells}</dl>
<p class="stat-dl">iOSの初回ダウンロード <b>{u["firstDownloads"]:,}件</b>（{u["periodStart"].replace("-", "/")}〜{u["periodEnd"].replace("-", "/")}・App Store Connect）</p>
<details class="stat-notes"><summary>数字について</summary><p>2026年10月25日確認の統合版収録データ。無料・Pro対象の合計で、OS・配信版により利用範囲が異なります。単元数は教材ごとの単元を足した数です。</p><p>iOSの初回ダウンロードは{u["firstDownloads"]:,}件（{u["periodStart"].replace("-", "/")}〜{u["periodEnd"].replace("-", "/")}・App Store Connect）。同じApp Store IDの旧「社会クエスト」期間を含み、再ダウンロードは除外。利用人数や教材別の学習人数ではありません。</p></details>
</div></section>'''


def school4():
    cards = ''
    for c in H['COURSES'][:4]:
        cid, slug, name, *_ = c
        d = H['STATS']['courses'][cid]
        fg, bg = SUBJECT[cid]
        chips = ''.join(f'<li>{esc(g["name"])}<small>{len(g["units"])}</small></li>' for g in d['domains'])
        cards += f'''<article class="subj" style="--c:{fg};--bg:{bg}">
<header><h3>{name}</h3><p><b>{d["questions"]:,}</b>問<span>・</span><b>{d["atlasPages"]:,}</b>ページの図鑑<span>・</span><b>{d["unitCount"]:,}</b>単元</p></header>
<div class="subj-media">{H["preview"](cid + "-atlas", name + "の図鑑：" + c[7])}<div class="phone-mini">{H["image"](cid + "-quiz", name + "の問題と解説の実画面")}</div></div>
<ul class="subj-domains">{chips}</ul>
<a class="go" href="/quest/courses/{slug}/">{name}の単元と図鑑を見る<b aria-hidden="true">→</b></a>
</article>'''
    return f'''<section class="v-sec v-school4" id="school4">{bg_layer("desk", cls="bg bg-top")}<div class="wrap">
{head("中学受験のご家庭へ", '理科・社会・国語・算数。<br><mark>4科が、ぜんぶそろう。</mark>', '塾で習った単元を、その日のうちにもう一度。<br>図鑑で全体をつかんで、問題で確かめる。教科の切りかえはアプリの中でワンタップです。')}
<div class="subj-grid">{cards}</div>
<p class="fine center">左が図鑑、右がアプリの問題画面（実画面）。画像をタップすると大きく見られます。単元横の数字はその分野の単元数です。</p>
</div></section>'''


def learning():
    a = H['A']
    return f'''<section class="v-sec v-learn" id="experience">{bg_layer("meadow")}<div class="wrap">
{head("1問の流れ", '見て、答えて、聞いて。<br><mark>1問で「わかった」まで。</mark>', '理科の実際の問題で紹介します。文字だけの問題集では見えにくい「場面」と「理由」を、絵で見せるのが合格！Questのやり方です。')}
<ol class="flow3">
<li class="f1"><span class="f-no">1</span><h3>絵を見て、考える</h3>{H["preview"]("learning-microscope-before", "顕微鏡を観察する子ども。理科の実際の問題用イラスト。")}<p class="q">顕微鏡でプレパラートをのせる場所はどれですか。</p></li>
<li class="f2"><span class="f-no">2</span><h3>答えると、絵で解説</h3>{H["preview"]("learning-microscope-after", "プレパラートを置くステージを図示した、理科の実際の解説イラスト。")}<p>正解は「ステージ」。どこに置いて、どう固定するのかまで絵で確認できます。</p></li>
<li class="f3"><span class="f-no">3</span><h3>読み上げで、耳からも</h3><div class="voice-card"><span class="voice-icon" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span><p id="voice-label">この問題の読み上げを聞いてみる</p><audio controls preload="none" aria-labelledby="voice-label"><source src="{a}learning-microscope-voice.m4a" type="audio/mp4">お使いのブラウザでは音声を再生できません。</audio></div><p>問題文を読み上げるので、文字を追うのが苦手な日も、移動中の復習にも。</p></li>
</ol>
<div class="learn-foot">{rika("rika-idea", "", "rika learn-rika")}<span class="round-stamp"><b>わかる！</b>が<br>ふえていく</span><p class="fine">掲載例：理科「生物の観察と分類」の実際の問題・解説イラスト・読み上げ音声（音声は再生ボタンを押したときだけ流れます）。画像・解説イラスト・音声は対応する問題で利用できます。読み上げは最初の5単元が無料、全対象はPro。</p></div>
</div></section>'''


def levels():
    steps = [('40', '基礎', 'まずは知識の土台', '無料'), ('50', '標準', '理解を問題で確かめる', '無料'),
             ('60', '応用', '知識をつなげて考える', 'Pro'), ('70', '発展', '手ごたえのある問題へ', 'Pro')]
    cells = ''.join(f'<li class="lv{i}"><span class="lv-num">{n}</span><b>{t}</b><small>{d}</small><em class="{"free" if p == "無料" else "pro"}">{p}</em></li>' for i, (n, t, d, p) in enumerate(steps))
    return f'''<section class="v-sec v-levels" id="learning-depth"><div class="wrap v-levels-grid">
<div>{head("難易度は4段階", '40から70まで、<br><mark>自分の段から。</mark>', '同じ単元でも、基礎から応用まで段階があります。まずは40・50で土台を固めて、慣れたら60・70へ。')}
<p class="fine">40・50・60・70は教材内の難易度の目安です。模試の実測偏差値や、成績の向上を保証する数値ではありません。収録範囲は教材・単元により異なります。</p></div>
<ol class="stairs">{cells}</ol>
</div></section>'''


def card(c):
    cid, slug, name, group, _headline, lead, _topics, sample, _use, _tint = c
    d = H['STATS']['courses'][cid]
    return (f'<a class="ccard" data-course-category="{group}" href="/quest/courses/{slug}/" style="--c:{color(cid, group)}">'
            f'<div class="ccard-img">{H["image"](cid + "-atlas", name + "の図鑑・" + sample)}</div>'
            f'<div class="ccard-body"><small>{H["GROUP"][group]}</small><h3>{name}</h3>'
            f'<dl class="ccard-num"><div><dt>問題</dt><dd>{d["questions"]:,}</dd></div><div><dt>図鑑</dt><dd>{d["atlasPages"]:,}</dd></div><div><dt>単元</dt><dd>{d["unitCount"]:,}</dd></div></dl>'
            f'<p>{lead.split("。")[0]}。</p><span class="ccard-go">くわしく見る<b aria-hidden="true">→</b></span></div></a>')


def catalog():
    filters = '<button class="filter" data-filter="all" aria-pressed="true">すべて<small aria-hidden="true">12</small></button>' + ''.join(
        f'<button class="filter" data-filter="{k}" aria-pressed="false" style="--c:{CAT[k]}">{v}<small aria-hidden="true">{sum(1 for c in H["COURSES"] if c[3] == k)}</small></button>'
        for k, v in H['GROUP'].items())
    return f'''<section class="v-sec v-catalog" id="courses"><div class="wrap">
{head("12教材", '受験のあとも、<br><mark>大人の資格や語学も。</mark>', 'ITパスポート、FP、簿記、宅建士、SPI3、日本語、英語、運転免許。<br>家族それぞれの「学びたい」を、同じアプリで。どの教材にもイラスト図鑑があります。')}
<div class="filters" role="group" aria-label="教材を絞り込む" hidden>{filters}</div>
<div class="ccard-grid">{"".join(card(c) for c in H["COURSES"])}</div>
<p class="course-count fine" data-course-count aria-live="polite">12教材を表示しています</p>
<p class="fine">数字は2026年10月25日確認の統合版収録データ（無料・Pro対象を含む）。教材一覧はiOS公開版を基準にしています。Androidで使える教材・機能はストアとアプリでご確認ください。運転免許教材は無料です。</p>
</div></section>'''


def kingdom():
    steps = [('問題を解いて、コインを集める', 'どの教材の学習も、街づくりの力になります。'),
             ('建物を選んで、街を育てる', '家やお店、公園、世界の名所まで。'),
             ('ランクが上がると、領地がひらく', '小さな街から、全16の領地へ広がります。')]
    li = ''.join(f'<li><b>{i + 1}</b><div><strong>{t}</strong><p>{d}</p></div></li>' for i, (t, d) in enumerate(steps))
    return f'''<section class="v-sec v-kingdom" id="kingdom">{bg_layer("kingdom")}<div class="wrap v-kingdom-grid">
<div class="k-copy">{head("ごほうびは、王国づくり", '学ぶほど、<br><mark>自分の王国が育つ。</mark>', '「あと1問だけ」が続く仕組み。正解でたまったコインで、自分だけの街をつくれます。')}
<ol class="k-steps">{li}</ol>
<a class="btn btn-sky" href="/quest/kingdom/">王国マップの遊び方 <b aria-hidden="true">→</b></a></div>
<div class="k-shots"><div class="ipad">{H["preview"]("kingdom-day-tablet", "学習でコインを集め、家やお店を建てた王国マップの実画面")}</div>
<div class="k-polaroids"><figure>{H["image"]("step2-build", "コインで建物を選ぶ画面")}<figcaption>建物をえらぶ</figcaption></figure><figure>{H["image"]("step6-landmarks", "世界の名所を選ぶ画面")}<figcaption>世界の名所も</figcaption></figure></div>
<p class="fine">王国マップの実画面（iPad）。街を育てたあとの状態の一例で、はじめは小さな街から始まります。掲載機能はiOS版が基準です。</p></div>
</div></section>'''


def free():
    rows = [('問題', '難易度40・50', '60・70も'), ('読み上げ', '最初の5単元', '全対象範囲'),
            ('イラスト図鑑', 'プレビューページ', '全ページ'), ('王国マップ', '遊べる', '遊べる'), ('広告', 'あり', 'なし')]
    # the free "ads" cell is the only one without a check mark
    tr = ''.join(f'<tr><th scope="row">{a}</th><td>{"" if b == "あり" else CHECK}{b}</td><td>{CHECK}{c}</td></tr>' for a, b, c in rows)
    return f'''<section class="v-sec v-free" id="free">{bg_layer("confetti")}<div class="wrap v-free-grid">
<div>{head("料金", 'まずは無料で、<br><mark>ここまでできる。</mark>', '全教材に、無料で解ける問題があります。続けたくなったら、学びたい教材の分だけProに。')}
<div class="actions"><a class="btn btn-coral" href="#download">無料でダウンロード <b aria-hidden="true">→</b></a><a class="btn btn-ghost" href="/quest/plans/">Proプランを比べる</a></div></div>
<div class="ticket"><table><caption>無料とProのちがい</caption><thead><tr><td></td><th scope="col">無料</th><th scope="col" class="pro">Pro</th></tr></thead><tbody>{tr}</tbody></table>
<p class="fine">Proは1科目・中学受験4科・全科目から選べます。運転免許教材は無料。対象教材・機能・無料範囲は配信バージョンにより異なる場合があります。価格はアプリの購入画面でご確認ください。</p></div>
</div></section>'''


def quiz():
    return f'''<section class="v-sec v-try" id="try"><div class="wrap v-try-grid">
<div>{head("ためしに1問", 'このページで、<br><mark>1問やってみよう。</mark>', '理科の「てこ」。答えをえらぶと、すぐに理由が出ます。')}
<p class="fine">サイト用の体験問題です。アプリの画面ではなく、学習記録にも保存されません。</p></div>
<div class="quiz-card"><p class="quiz-label">理科・てこのつり合い</p><h3>同じ重さのおもり。<br>右には何個つるすと、つり合う？</h3><svg viewBox="0 0 360 160" role="img" aria-label="支点の左3目盛りに2個のおもり。右3目盛りにつるす個数を考えるてこ"><path d="M25 65H335" stroke="#2c4a7a" stroke-width="9" stroke-linecap="round"/><path d="m180 70-24 45h48Z" fill="#ffcd3c"/><path d="M60 65v38M300 65v38" stroke="#2c4a7a" stroke-width="3"/><g stroke="#fff" stroke-width="2"><path d="M60 60v10M100 60v10M140 60v10M220 60v10M260 60v10M300 60v10"/></g><rect x="44" y="102" width="32" height="18" rx="4" fill="#ff7a59"/><rect x="44" y="123" width="32" height="18" rx="4" fill="#ff7a59"/><rect x="280" y="102" width="40" height="39" rx="8" fill="#e3f4ff" stroke="#2b7fe0" stroke-dasharray="4 3"/><g fill="#1f3350" font-family="sans-serif" font-size="15" text-anchor="middle"><text x="118" y="40">3目盛り</text><text x="242" y="40">3目盛り</text><text x="180" y="140">支点</text><text x="300" y="128" font-size="24">?</text></g></svg><div class="quiz-options"><button data-answer="1" aria-pressed="false"><i aria-hidden="true">A</i>1個</button><button data-answer="2" aria-pressed="false"><i aria-hidden="true">B</i>2個</button><button data-answer="3" aria-pressed="false"><i aria-hidden="true">C</i>3個</button><button data-answer="4" aria-pressed="false"><i aria-hidden="true">D</i>4個</button></div><p class="quiz-result" data-quiz-result aria-live="polite">答えをえらぶと、理由がわかります。</p><noscript><p>答えは2個。左右の「重さ × 支点からの距離」を同じにします。</p></noscript></div>
</div></section>'''


def family():
    return f'''<section class="v-sec v-family" id="family"><div class="wrap v-family-grid">
<div class="fam-photo">{H["preview"]("junior-social-atlas", "社会の図鑑：日本の米づくり")}{H["preview"]("junior-math-atlas", "算数の図鑑：算数の世界をつなぐ地図")}</div>
<div>{head("おうちの方へ", '「勉強した？」より、<br><mark>「何がわかった？」</mark>', '')}
<ul class="checks"><li>{CHECK}<b>1台をきょうだいで</b>。プロフィールを切りかえて、学習記録を分けられます</li><li>{CHECK}<b>まちがえた問題</b>から、もう一度ときなおせます</li><li>{CHECK}<b>図鑑を一緒に</b>ながめて、今日の単元を話題に</li></ul>
<div class="actions"><a class="btn btn-sky" href="/quest/rika-shakai/">理科・社会の復習 <b aria-hidden="true">→</b></a><a class="btn btn-ghost" href="/quest/school4/">中学受験4科</a></div>
<p class="fine">プロフィールの切りかえと、別のApple／Googleアカウントへの購入の共有は別の機能です。購入の適用範囲は購入画面とストアの条件をご確認ください。</p></div>
</div></section>'''


def faq_section(items):
    return f'''<section class="v-sec v-faq" id="faq"><div class="wrap">{head("よくある質問", '始める前に、<mark>気になること。</mark>', '')}{H["faq"](items)}<p class="center"><a class="text-link" href="/quest/plans/">料金・購入・復元のくわしい案内 →</a></p></div></section>'''


def download():
    return f'''<section class="v-download" id="download">{bg_layer("sky2")}<div class="wrap"><div class="dl-card">
{rika("rika-wave", "", "rika dl-rika")}
<p class="tag-star">ダウンロード無料</p>
<h2>まずは1問、<br><mark>やってみよう！</mark></h2>
<p>12教材のどれからでも。気になる教材の無料の問題から始められます。</p>
{H["stores"]("bottom")}
<p class="fine">ダウンロード無料・アプリ内課金あり。無料範囲では広告が表示される場合があります。<br>対応端末・教材・機能は、OSや配信バージョンによって異なります。</p>
</div></div></section>'''


def bg_layer(name, eager=False, cls='bg'):
    a = H['A'] + 'backgrounds/v3-'
    loading = 'loading="eager" fetchpriority="high"' if eager else 'loading="lazy"'
    return f'<picture class="{cls}" aria-hidden="true"><source media="(max-width:700px)" srcset="{a}{name}-m.webp"><img src="{a}{name}.webp" alt="" {loading} decoding="async"></picture>'


def body(faq_items):
    return hero() + stats() + school4() + learning() + levels() + catalog() + kingdom() + free() + quiz() + family() + faq_section(faq_items)
