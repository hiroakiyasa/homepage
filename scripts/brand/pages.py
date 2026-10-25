"""Apps catalog (ja / en), the maker page and the garage hub for hobby notes."""
from brandsite import APPS, STORE, CATS, SNAPSHOT_DATE, LIVE, tx, icon, bg, stores, rating
from home import head


def app_card(a, lang):
    t = tx(lang)
    cat = CATS[a['cat']]
    s = STORE.get(a['slug'])
    meta = (t(f'バージョン {s["version"]}・{s["updated"].replace("-", ".")} 更新', f'Version {s["version"]}, updated {s["updated"]}')
            if s else '')
    meta_html = f'<p class="meta">{meta}</p>' if meta else ''
    labels = {'privacy': t('プライバシー', 'Privacy'), 'terms': t('利用規約', 'Terms'), 'support': t('サポート', 'Support')}
    legal = ''.join(f'<a href="{h}">{labels[k]}</a>' for k, h in a['legal'].items())
    detail = f'<a class="text-link" href="{a["detail"]}">{t("くわしく見る", "Details")} →</a>' if a['detail'] else ''
    return (f'<article class="app-card" id="{a["slug"]}" data-cat="{a["cat"]}" style="--c:{cat[2]}">'
            f'<div class="app-card-top">{icon(a["slug"], lang, "card-icon")}<div><small>{cat[0] if lang == "ja" else cat[1]}</small>'
            f'<h3>{a["ja"] if lang == "ja" else a["en"]}</h3>{rating(a["slug"], lang) if s else ""}</div></div>'
            f'<p>{a["tag_ja"] if lang == "ja" else a["tag_en"]}</p>{meta_html}'
            f'{stores(a["slug"], lang, "apps-catalog", True)}<div class="app-links">{detail}{legal}</div></article>')


def apps_body(lang):
    t = tx(lang)
    main = [a for a in APPS if a['group'] == 'main']
    legacy = [a for a in APPS if a['group'] == 'legacy']
    used = [k for k in CATS if any(a['cat'] == k for a in main)]
    chips = (f'<button type="button" class="chip" data-filter="all" aria-pressed="true">{t("すべて", "All")}<small>{len(main)}</small></button>' +
             ''.join(f'<button type="button" class="chip" data-filter="{k}" aria-pressed="false" style="--c:{CATS[k][2]}">{CATS[k][0] if lang == "ja" else CATS[k][1]}'
                     f'<small>{sum(1 for a in main if a["cat"] == k)}</small></button>' for k in used))
    return f'''<section class="page-hero">{bg("dawn", True)}<div class="br-wrap"><span class="tag">{t("アプリ一覧", "All apps")}</span>
<h1>{t("TrailFusion の<br>アプリ。", "Apps by<br>TrailFusion.")}</h1>
<p class="lead">{t(f"App Store で公開中の{len(LIVE)}本と、審査中の1本。どれも無料でダウンロードでき、規約・プライバシー・サポートへここから進めます。",
                   f"{len(LIVE)} apps on the App Store and one in review. All free to download, with terms, privacy and support linked from here.")}</p>
<div class="chips" role="group" aria-label="{t("分類で絞り込む", "Filter by category")}" hidden>{chips}</div></div></section>
<section class="sec catalog"><div class="br-wrap"><div class="app-grid">{"".join(app_card(a, lang) for a in main)}</div>
<p class="note" data-count aria-live="polite"></p>
<div class="legacy">{head(t("以前の単科アプリ", "Earlier single-subject apps"), t("合格！クエストに、<mark>ひとつにまとめました</mark>。", "Now <mark>combined</mark> in Gokaku! Quest."),
                           t("理科・国語の単科アプリは、学習記録と購入を合格！クエストへ引き継げます。お使いの方はアプリ内の案内か、料金・購入ガイドをご覧ください。",
                             "The science and Japanese-language apps can hand over progress and purchases to Gokaku! Quest."))}
<div class="app-grid two">{"".join(app_card(a, lang) for a in legacy)}</div><p><a class="text-link" href="/quest/plans/">{t("料金・購入・引き継ぎのご案内", "Pricing, purchases and handover (Japanese)")} →</a></p></div>
<p class="note">{t(f"バージョン・更新日・評価は{SNAPSHOT_DATE[0]}時点の App Store（日本）の公開情報です。", f"Versions, dates and ratings are App Store (Japan) public data as of {SNAPSHOT_DATE[1]}.")}</p></div></section>'''


def about_body():
    origins = [('学ぶ', '家族の中学受験から、合格！クエストへ。', '「覚えるだけでは続かない。クイズ・解説・図鑑・復習が自然につながれば、もっと楽しく学べる」。家族で受験に向き合う中で感じたことが、教育アプリの原点です。', '/quest/', '合格！クエスト'),
               ('旅する', '親子の北海道旅から、車旅コンシェルジュへ。', '知床、オロロンライン、阿寒から釧路へ続く道。家族で出会った「日本にこんな場所があった」という驚きを、ほかの人も見つけやすくしたいと考えました。', '/car-concierge.html', '車旅コンシェルジュ'),
               ('つくる', '未知でも、調べて作れば形にできる。', '専門知識がほとんどない状態から、キャンピングカーの断熱・床・家具・電装・空調まで自分で完成させました。この経験が、最後まで作り切る今の開発スタイルにつながっています。', '/garage/', 'つくり手のガレージ'),
               ('AIと', 'AIを、実際に手を動かす相棒に。', '調査、設計、実装、画像づくり、テスト、公開、分析、改善までをAIとつなぎ、小さなチームでも大きな挑戦を形にしています。', '/apps.html', 'アプリ一覧')]
    oc = ''.join(f'<article><span class="tag">{a}</span><h3>{b}</h3><p>{c}</p><a class="text-link" href="{d}">{e} →</a></article>' for a, b, c, d, e in origins)
    principles = [('自分が使わないものは作らない。', '自分や家族が本当に必要としていることから始め、まず自分たちが使い、その実感をプロダクトへ戻します。'),
                  ('説明書が要らないところまで、迷いを減らす。', '機能の多さより、目的まで迷わず進めることを優先します。開いて数秒で「何をすればいいか」が伝わる体験を目指します。'),
                  ('公開後も、直し続ける。', 'リリースは完成ではなく利用開始。使う人の声、自分の気づき、データをもとに更新し続けます。')]
    pc = ''.join(f'<article><span class="no">0{i}</span><h3>{a}</h3><p>{b}</p></article>' for i, (a, b) in enumerate(principles, 1))
    return f'''<section class="page-hero">{bg("hero", True)}<div class="br-wrap"><span class="tag">つくり手について</span>
<h1>好奇心から、<br>使いたくなるものを。</h1>
<p class="lead">TrailFusion AI は、自分や家族が本当に困ったこと、もっと楽しくできそうだと感じたことを、アプリに変えていく個人開発スタジオです。「つらい・面倒・わからない」を、「楽しい・簡単・続けられる」へ。</p></div></section>
<section class="sec"><div class="br-wrap narrow">{head("メッセージ", "作りたいのは、情報ではなく<br><mark>「前に進める体験」</mark>。")}
<div class="prose"><p>勉強が続かない。旅先の本当に良い場所が見つけにくい。知らないことを自分で作るのは難しそう。AIも、すごそうだけれど実際にどう使えばよいのかわからない。TrailFusion AI の出発点は、そんな日常の小さな「困った」や「こうだったらいいのに」です。</p>
<p>便利な機能を増やすことより、迷いを減らすこと。公開することより、使い続けてもらえること。自分が作ったものが誰かの役に立ち、直接反応が返ってくることを大切にしています。</p></div></div></section>
<section class="sec origins">{bg("dawn")}<div class="br-wrap">{head("原点", "はじまりは、<mark>自分と家族の実体験</mark>。", "机の上で考えた市場ニーズではなく、自分たちが実際に困り、驚き、夢中になった体験からプロダクトを始めています。", True)}<div class="origin-grid">{oc}</div></div></section>
<section class="sec"><div class="br-wrap">{head("3つの原則", "プロダクトづくりで、<mark>守っていること</mark>。", "", True)}<div class="trust-grid three">{pc}</div></div></section>
<section class="sec founder"><div class="br-wrap maker-grid">
<div>{head("創業者", "湯浅 浩章（Hiro）", "子どもの頃から算数、機械、ゲーム、PC、プログラミングが好きで、「仕組みを理解して、自分で動くものを作る」ことに強く惹かれてきました。教育、旅、DIY、AIという一見異なるテーマを、「実際に自分で試し、役立つ形へ変える」という一本の軸でつないでいます。")}
<p class="builder">Builder × Explorer × Integrator</p></div>
<dl class="maker-nums vertical"><div><dt>公開中のアプリ</dt><dd>{len(LIVE)}</dd></div><div><dt>車で旅した都道府県</dt><dd>47</dd></div><div><dt>走った距離</dt><dd>約5万km</dd></div></dl></div></section>
<section class="sec why">{bg("garage")}<div class="br-wrap narrow"><div class="paper">{head("いま、つくる理由", "「いつか」ではなく、<mark>元気な今</mark>やる。")}
<div class="prose"><p>『LIFE SHIFT』を読み、人生が長くなる時代に、これまで身につけたことだけに頼るのではなく、AI・ソフトウェア・BtoC という新しい専門性を自分の手で育てたいと考えるようになりました。</p>
<p>同じ頃、大きなDIYをゼロから完成させたことで、未知の領域でも調べ、設計し、手を動かし、最後まで完成させられるという自信を得ました。「やりたいことを老後まで先送りしない」。TrailFusion AI は、その価値観を毎日の行動に変える場所です。</p></div></div></div></section>
<section class="sec contact"><div class="br-wrap narrow center">{head("ご連絡", "一緒につくる方も、<mark>歓迎しています</mark>。", "教育・EdTech、日本語教育、ASO・アプリマーケティング、AI Agent / MCP、Travel Tech など、異なる専門性を持つ方との出会いを歓迎しています。", True)}
<div class="actions center"><a class="btn btn-main" href="/partners/">協業・パートナーについて →</a><a class="btn btn-sub" href="mailto:trailfusionai@gmail.com">メールで話す</a><a class="btn btn-sub" href="/support/">アプリのサポート</a></div>
<p class="note">運営：TrailFusion AI（App Store の提供者名：hiroaki yuasa）／ お問い合わせ：trailfusionai@gmail.com</p></div></section>'''


def garage_body():
    rooms = [
        ('車旅', 'この国を、<br>走り続ける理由。', '47都道府県、約5万km。親子で走った旅の記録と、寄り道したくなる道の地図です。',
         [('/travel/story.html', '車旅の記録', 'ハイエースの旅から始まった、TrailFusion の原点。'), ('/drive-routes/', '絶景ロード図鑑', '地域やテーマからドライブルートを探せる地図。'), ('/travel/', '車旅の入口', '旅のページの一覧。')],
         ('/car-concierge.html', 'この旅から生まれたアプリ：車旅コンシェルジュ')),
        ('キャンピングカーDIY', '「こんな一台」を、<br>自分の手で。', '間取りを3Dで眺め、床・断熱・家具・電装までの作り方を順番にたどれます。',
         [('/diy/', 'DIYの入口', '制作全体の流れと、読む順番。'), ('/camping.html', '3Dで間取りを見る', 'レイアウトとシーンを切り替えて過ごし方をイメージ。'), ('/camping-guide.html', 'DIYガイド', '計画・基礎・電装・費用までの記録。')], None),
        ('ハイエース整備', '愛車を知るほど、<br>旅は続く。', '部品の仕組みを3Dでたどり、整備の記録を残すためのノートです。',
         [('/maintenance/', '整備の入口', '整備ページの一覧。'), ('/maintenance.html', '3Dで仕組みを見る', '部品と動力のつながりを立体で確認。'), ('/document/', '整備の資料', '作業ごとにまとめたPDFの記録。')], None),
    ]
    out = ''
    for tag, title, lead, links, app_link in rooms:
        cards = ''.join(f'<a class="g-card" href="{h}"><strong>{a}</strong><span>{b}</span></a>' for h, a, b in links)
        extra = f'<p><a class="text-link" href="{app_link[0]}">{app_link[1]} →</a></p>' if app_link else ''
        out += f'<article class="room"><div>{head(tag, title, lead)}{extra}</div><div class="g-cards">{cards}</div></article>'
    return f'''<section class="page-hero garage-hero">{bg("garage", True)}<div class="br-wrap"><span class="tag">つくり手のガレージ</span>
<h1>アプリの外の、<br>つくり手の時間。</h1>
<p class="lead">ここはアプリの紹介ではなく、つくり手の趣味と記録の部屋です。車で日本を旅し、キャンピングカーを自分で作り、愛車を整備してきた経験が、今のアプリづくりにつながっています。</p></div></section>
<section class="sec"><div class="br-wrap">{out}
<p class="note">整備・DIYの内容は個人の記録です。実車での作業は、車両の整備書や専門家に確認してから行ってください。</p></div></section>'''
