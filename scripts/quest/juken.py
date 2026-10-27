"""Subject guides for 中学受験 (science / social studies / Japanese / math), the 暗記 guide, the hub and the FAQ.

These pages exist so that people (and AI assistants) searching for a 中学受験 study app by subject find
合格！クエスト and the single-subject apps by name. Every number comes from docs/quest/course-stats.json
(release manifest, 2026-10-25) and the App Store lookup; prices are intentionally not written here.
"""
import html, json

BASE = 'https://trailfusionai.com'
IOS = 'https://apps.apple.com/jp/app/id'
UNIFIED = {'id': 6775411516, 'rating': 4.37, 'ratings': 114}  # iTunes lookup, App Store Japan, 2026-10-27
SINGLE = {
    'junior-science': {'id': 6772644144, 'name': '合格理科クエスト', 'rating': 4.27, 'ratings': 100},
    'junior-kokugo': {'id': 6780125916, 'name': '合格！国語クエスト', 'rating': 4.52, 'ratings': 23},
}

SUBJECTS = [
    dict(
        slug='science', cid='junior-science', name='理科', ruby='りか',
        title='中学受験 理科アプリ｜図鑑とクイズで生物・地球・物質・エネルギーを復習｜合格！クエスト',
        desc='中学受験の理科を、イラスト図鑑と4択クイズで復習するアプリ。36単元7,742問、偏差値40・50・60・70の4段階。まちがい直しと読み上げ音声つき。合格！クエスト（合格理科クエスト）。',
        h1_a='中学受験の理科アプリ。', h1_b='絵で見て、解いて、<br>「なぜ？」までつなげる。',
        lead='生命・地球・物質・エネルギーの4分野を、イラスト図鑑と4択クイズで。言葉だけでは覚えにくい実験や自然現象を、場面の絵で確かめながら復習できます。',
        scope=[
            ('生命', '生物の観察と分類／昆虫／季節と生き物／花・種子・ふえ方／植物のつくりとはたらき／動物のからだとくらし／人体のしくみと健康／生き物の誕生／生態系と環境',
             '観察の視点、育ち方、からだのつくりを「図で見て名前と結びつける」復習に向く分野です。'),
            ('地球', '天気の観察・変化／流水と地形／地層と岩石／火山と地震／太陽と地球／月／星と星座／太陽系と宇宙',
             '月の満ち欠けや星の動きのように、頭の中だけで想像しにくい内容を図で確認できます。'),
            ('物質', '物質の性質／物のすがたと温度／水溶液と濃度／溶解度と結晶／水溶液の性質／中和／気体の性質と発生／燃焼と酸化／金属・水・環境',
             '濃度や溶解度のような計算を含む単元は、問題と解説を往復して手順を確かめます。'),
            ('エネルギー', '光／音／磁石／電流回路／電磁石と発電／電気の利用／力と圧力／てこ・ばね・滑車／運動・浮力',
             '回路やてこは、図の読み取りが得点に直結しやすい単元です。条件の違う問題を繰り返し解けます。'),
        ],
        weak='計算を含む単元（溶解度・濃度・てこ・ばね・滑車・電流回路）は、つまずく家庭が多い分野です。解説で考え方を確かめ、まちがえた問題は「まちがい直し」で解き直せます。',
        faqs=[
            ('中学受験の理科は、アプリだけで足りますか？', 'アプリは塾の授業や過去問演習を置き換えるものではなく、習った単元の復習と「覚えたつもり」の確認に使う教材です。志望校の出題傾向に合わせた演習は、塾や過去問と併用してください。'),
            ('理科は何問ありますか？', '36単元・7,742問です（2026年10月25日確認、無料・Pro対象を含む）。各問題は偏差値の目安で40・50・60・70の4段階に分かれ、イラスト図鑑は539ページあります。'),
            ('小学4年生でも使えますか？', '使えます。小4〜小6を想定した作りで、単元と難易度を選べます。まずは偏差値40・50の問題から始め、慣れたら60・70に進むと無理がありません。'),
            ('「合格理科クエスト」とはどう違いますか？', '合格理科クエストは理科だけの単体アプリで、合格！クエストは同じ理科に加えて社会・国語・算数などを1つのアプリで学べる統合版です。理科の問題数は同じです。単体アプリの購入と学習記録は、アプリ内の案内に沿って統合版へ引き継げます。'),
        ],
    ),
    dict(
        slug='social', cid='junior-social', name='社会', ruby='しゃかい',
        title='中学受験 社会アプリ｜地理・歴史・公民を図解クイズで復習｜合格！クエスト',
        desc='中学受験の社会を、地理・歴史・公民の53単元5,327問で復習するアプリ。630ページのイラスト図鑑と4択クイズ、まちがい直しつき。合格！クエスト（旧・合格社会クエスト）。',
        h1_a='中学受験の社会アプリ。', h1_b='地名も人物も、<br>つながりで覚える。',
        lead='地理・歴史・公民を図鑑と短いクイズで。地名や人物名を丸暗記するのではなく、背景や時代のつながりを図でたどりながら復習できます。',
        scope=[
            ('地理', '農業のさかんな地域／水産業／工業の種類と特色／日本の伝統工業／日本の資源とエネルギー／交通・通信・都市の発達／日本の貿易／世界のすがた／アジア・南北アメリカ・ヨーロッパなど世界の国々（全16単元）',
             '地図や資料の読み取りを問う問題が多い分野です。似た地名・産物の違いを選択肢の比較で確かめます。'),
            ('歴史', '国のはじまり・古墳・律令国家／平安京／鎌倉・室町幕府／戦国の世／江戸幕府／明治維新／日清・日露戦争／戦争の時代／戦後の日本／文化史（全26単元）',
             '年号の暗記よりも、出来事の順序と原因・結果のつながりを問う復習に向いています。'),
            ('公民', '日本国憲法／民主政治のしくみ／国会・内閣・裁判所／財政と経済／地方自治・社会保障／国際連合／環境問題／現代社会の諸問題（全11単元）',
             '用語の意味を取り違えやすい分野です。問題の解説で言葉の定義と例をセットで確認できます。'),
        ],
        weak='暗記量が多い社会は、同じ用語を何度も見ることが近道です。まちがえた問題がたまるので、テスト前にまとめて解き直せます。',
        faqs=[
            ('社会は何問ありますか？', '53単元・5,327問です（2026年10月25日確認、無料・Pro対象を含む）。偏差値40・50・60・70の4段階で、イラスト図鑑は630ページあります。'),
            ('以前の「合格！社会クエスト」はどうなりましたか？', '社会クエストのストア掲載ページが、現在は合格！クエスト（統合版）になっています。以前に購入した対象商品は、購入時と同じストアアカウントで復元できます。お困りの場合はサポートへご連絡ください。'),
            ('時事問題や最新の統計にも対応していますか？', '教材は定期的に更新しますが、年ごとに変わる時事・統計は塾の教材や最新の資料も併せて確認してください。'),
            ('地図の問題はスマホで見やすいですか？', '1問1画面で、地図や資料は画面に収まる大きさで表示します。タブレットではより大きく表示されます。'),
        ],
    ),
    dict(
        slug='kokugo', cid='junior-kokugo', name='国語', ruby='こくご',
        title='中学受験 国語アプリ｜漢字・語句・ことわざ・読解の基礎を4択クイズで｜合格！クエスト',
        desc='中学受験の国語（語彙・ことわざ・慣用句・漢字・熟語・ことばのきまり・読解）を94単元4,550問で復習するアプリ。読み上げ音声・まちがい直し・図鑑つき。合格！クエスト（合格！国語クエスト）。',
        h1_a='中学受験の国語アプリ。', h1_b='言葉の知識を、<br>読む力の土台に。',
        lead='語彙、ことわざ・慣用句、漢字・熟語、ことばのきまり、読解の知識を、短い4択クイズで毎日少しずつ。文章を読むための「知っている言葉」を増やします。',
        scope=[
            ('語彙・ことば', '心情語／抽象語・評論用語／ことばの意味・多義語／外来語・カタカナ語／オノマトペ／対義語／類義語（19単元）', '意味を知っているかどうかで、読解の速さと正確さが変わります。'),
            ('ことわざ・慣用句', 'ことわざ／慣用句（顔・目、手・足、動物、自然・植物など）／四字熟語／故事成語（22単元）', '意味だけでなく使う場面を選択肢で確かめられます。'),
            ('漢字・熟語', '漢字の書き取り・読み／同音異義語／同訓異字／熟語の構成／三字熟語／部首・画数・筆順（19単元）', '短い問題を繰り返し解く復習に向く分野です。'),
            ('ことばのきまり', '品詞の分類／文の成分・係り受け／用言の活用／助動詞・助詞の識別／敬語／詩の形式・表現技法／短歌・俳句／季語／文学史（16単元）', '文法用語を「見分ける」練習ができます。'),
            ('読解', '物語の心情・場面／説明文の指示語・接続語・要旨／論説文／随筆／脱文挿入・段落整序／長文読解（物語・説明文）（18単元）',
             '読み取りの観点を4択で確かめる単元です。何本もの長文を読み込む練習は、過去問や塾の教材と併用してください。'),
        ],
        weak='国語は「何を勉強すればよいか分かりにくい」教科です。語彙・漢字・文法は知識として積み上げられるので、まずは毎日の短い復習で土台を固めます。',
        faqs=[
            ('国語は何問ありますか？', '94単元・4,550問です（2026年10月25日確認、無料・Pro対象を含む）。偏差値40・50・60・70の4段階で、図鑑は500ページあります。'),
            ('長文読解の練習になりますか？', '読解の単元（物語の心情、説明文の指示語・要旨、長文読解など）を4択で確認できます。ただし何本も長文を読み込む練習や記述の採点はしないので、塾の教材や過去問と併用してください。'),
            ('読み上げ音声はありますか？', '対応する問題には問題文の読み上げがあります。読み上げは最初の5単元が無料、全対象はProです。'),
            ('「合格！国語クエスト」とはどう違いますか？', '合格！国語クエストは国語だけの単体アプリ、合格！クエストは国語に加えて理科・社会・算数などを学べる統合版です。単体アプリの購入と学習記録は、アプリ内の案内に沿って統合版へ引き継げます。'),
        ],
    ),
    dict(
        slug='math', cid='junior-math', name='算数', ruby='さんすう',
        title='中学受験 算数アプリ｜計算・文章題・図形を図とクイズで復習｜合格！クエスト',
        desc='中学受験の算数を、数と計算・変化と関係・データの活用・図形・文章題の55単元6,600問で復習するアプリ。図で考える図鑑と4択クイズ、まちがい直しつき。合格！クエスト。',
        h1_a='中学受験の算数アプリ。', h1_b='式の前に、<br>図で考える。',
        lead='数と計算・変化と関係・データの活用・図形・文章題を、図鑑と4択クイズで。つるかめ算や旅人算のような「頭の中だけでは整理しにくい」問題を、図や関係を手がかりに確かめます。',
        scope=[
            ('数と計算', '整数・小数・分数の計算／約数と倍数／公約数と公倍数の利用／概数と四捨五入／数と規則性（8単元）', '計算力は毎日の短い反復が効きます。'),
            ('変化と関係', '割合／比の性質と利用／文字と式／比例と反比例／平均と単位量あたり／速さとグラフ（11単元）', '割合や速さは式が立つかどうかが分かれ目。解説で考え方を確認できます。'),
            ('データの活用', '割合とグラフ／資料の調べ方／場合の数（3単元）', '資料の読み取りを問う問題で、条件を整理する練習になります。'),
            ('図形', '三角形・四角形の性質／合同と相似／角度／面積と面積比／円とおうぎ形／点の移動／立体と展開図／立体の切断／水の深さとグラフ（18単元）', '図を見て考える分野。問題の図で形の特徴を確かめられます。'),
            ('文章題', '植木算／和差算／つるかめ算／過不足算／相当算／損益算／濃度算／仕事算／旅人算／通過算・流水算など特殊算（15単元）', '条件を図や線分図に整理する練習に向いています。'),
        ],
        weak='算数は「解き方を知る」ことと「自力で式を立てる」ことの間に距離があります。アプリは4択で考え方を確認する復習用で、記述の途中式は紙と鉛筆で練習してください。',
        faqs=[
            ('算数は何問ありますか？', '55単元・6,600問です（2026年10月25日確認、無料・Pro対象を含む）。偏差値40・50・60・70の4段階で、図鑑は540ページあります。'),
            ('途中式を書く練習はできますか？', 'アプリは4択で答えを選ぶ形式で、途中式を書く記述の採点はしません。考え方は解説で確認し、書く練習は紙のノートと併用してください。'),
            ('算数の単体アプリはありますか？', '算数は合格！クエスト（統合版）で学べます。理科・社会・国語・算数をまとめて切り替えられる「中学受験4科Pro」もあります。'),
            ('難しい問題（偏差値60・70）はどこまでの内容ですか？', '偏差値60・70の問題はProの対象で、応用的な条件の問題が増えます。まずは偏差値40・50で基礎の抜けを確認するのがおすすめです。'),
        ],
    ),
]
BY_SLUG = {s['slug']: s for s in SUBJECTS}

STEPS = [
    ('図鑑で理解する', 'まず単元の図鑑でイラストと要点を確認。言葉の意味と全体像をつかみます。'),
    ('4択クイズで確かめる', '選択肢をタップすると、その場で正解・不正解と解説が出ます。1問1画面で、短い時間でも進められます。'),
    ('まちがい直しで定着', 'まちがえた問題はためておけて、あとからまとめて解き直せます。ホームから1タップで始められます。'),
    ('今日のクエストを続ける', 'ホームの「今日のクエスト」から続きの単元へ。学ぶとコインがたまり、王国マップの街づくりが進みます。'),
]

HUB_FAQ = [
    ('中学受験の理科・社会・国語・算数をまとめて学べるアプリはありますか？', '合格！クエストで、理科（36単元7,742問）・社会（53単元5,327問）・国語（94単元4,550問）・算数（55単元6,600問）の4科を1つのアプリで学べます。教科は切り替えて使え、学習記録は教科ごとに残ります。'),
    ('中学受験向けの暗記アプリとして使えますか？', 'はい。イラスト図鑑で「見て理解」し、4択クイズで「思い出して確認」し、まちがえた問題を解き直す流れで、暗記を定着させる使い方ができます。くわしくは暗記アプリのページをご覧ください。'),
    ('何年生から使えますか？', '小学4年生〜6年生の中学受験を想定しています。難易度は偏差値の目安で40・50・60・70に分かれており、基礎から段階的に進められます。'),
    ('塾の勉強の代わりになりますか？', 'いいえ。塾や過去問演習の代わりではなく、習った単元の復習と「覚えたつもり」の確認を補う教材です。合格を保証するものでもありません。'),
]

SITE_FAQ_EXTRA = [
    ('合格！クエストとはどんなアプリですか？', '中学受験の理科・社会・国語・算数に加え、ITパスポート・FP・簿記・宅建士・SPI3・日本語・英語・運転免許まで、全12教材を1つのアプリで学べる学習アプリです。すべての教材にイラスト図鑑があり、学習すると王国マップの街づくりが進みます。'),
    ('どんな人が対象ですか？', '中心は中学受験に取り組む小学4〜6年生とその保護者です。そのほか、資格試験・語学・運転免許の学習者も同じアプリを使えます。'),
    ('対応端末は？', 'iPhone・iPad（App Store）とAndroid（Google Play）で配信しています。提供する教材や機能はOS・配信バージョンにより異なる場合があるため、各ストアの掲載情報をご確認ください。'),
    ('合格を保証しますか？', 'いいえ。合格や成績向上を保証するものではありません。学習の補助教材としてお使いください。'),
    ('偏差値40・50・60・70とは何ですか？', '問題の難易度の目安です。基礎の40・50は無料範囲、応用の60・70はProの対象です。実際の模試の偏差値とは異なる、問題の難易度区分です。'),
    ('合格理科クエスト・合格！国語クエストを使っています。', '単体アプリの購入と学習記録は、アプリ内の案内に沿って合格！クエストへ引き継げます。単体アプリは当面そのまま使えます。'),
]


def esc(s):
    return html.escape(s, quote=True)


def app_schema(sub):
    """Extra JSON-LD for the single-subject app when this subject has one (real App Store lookup numbers only)."""
    s = SINGLE.get(sub['cid'])
    if not s:
        return []
    return [{'@type': 'MobileApplication', 'name': s['name'], 'operatingSystem': 'iOS, iPadOS',
             'applicationCategory': 'EducationalApplication', 'downloadUrl': f'{IOS}{s["id"]}',
             'offers': {'@type': 'Offer', 'price': '0', 'priceCurrency': 'JPY'},
             'aggregateRating': {'@type': 'AggregateRating', 'ratingValue': s['rating'], 'ratingCount': s['ratings']}}]


def breadcrumb(items):
    return {'@type': 'BreadcrumbList', 'itemListElement': [
        {'@type': 'ListItem', 'position': i + 1, 'name': n, 'item': BASE + u} for i, (n, u) in enumerate(items)]}


def crumbs(items):
    parts = ' / '.join(f'<a href="{u}">{n}</a>' for n, u in items[:-1]) + f' / {items[-1][0]}'
    return f'<div class="wrap crumbs">{parts}</div>'


def single_note(sub):
    s = SINGLE.get(sub['cid'])
    if s:
        return (f'<section class="section white"><div class="wrap split"><div><span class="kicker">単体アプリとの関係</span><h2>{s["name"]}も、<br>同じ内容です。</h2></div>'
                f'<div><p>{sub["name"]}だけを学びたい方向けに、単体アプリ「{s["name"]}」（App Store）があります。合格！クエストは{sub["name"]}に加えて他の教科・教材も1つのアプリで学べる統合版で、'
                f'{sub["name"]}の問題数は同じです。単体アプリの購入と学習記録は、アプリ内の案内に沿って統合版へ引き継げます。</p>'
                f'<a class="text-link" href="{IOS}{s["id"]}" data-store="apple" data-placement="juken-single">{s["name"]}（App Store） ↗</a></div></div></section>')
    if sub['slug'] == 'social':
        return ('<section class="section white"><div class="wrap split"><div><span class="kicker">以前の社会クエストをお使いの方へ</span><h2>社会クエストは、<br>統合版になりました。</h2></div>'
                '<div><p>以前「合格！社会クエスト」として公開していたストアの掲載ページが、現在は合格！クエスト（統合版）です。購入済みの対象商品は、購入時と同じストアアカウントで復元できます。</p>'
                '<a class="text-link" href="/quest/plans/">購入の復元・契約管理のご案内 ↗</a></div></div></section>')
    return ('<section class="section white"><div class="wrap split"><div><span class="kicker">4科をまとめて</span><h2>理科・社会・国語・算数を、<br>1つのアプリで。</h2></div>'
            '<div><p>算数は合格！クエスト（統合版）で学べます。理科・社会・国語もあわせて切り替えて使える「中学受験4科Pro」があり、価格と対象はアプリの購入画面で確認できます。</p>'
            '<a class="text-link" href="/quest/school4/">中学受験4科のページへ ↗</a></div></div></section>')


def free_pro():
    return ('<section class="section"><div class="wrap"><div class="section-head"><div><span class="kicker">無料とPro</span><h2>無料でできること、<br>Proでできること。</h2></div>'
            '<p>金額はアプリの購入画面（App Store・Google Play）の表示が正です。</p></div>'
            '<div class="topic-grid"><article class="topic"><h3>無料でできること</h3><p>全教材の偏差値40・50の問題、まちがい直し、王国マップ、読み上げ（最初の5単元）、図鑑のプレビュー。無料範囲では広告が表示される場合があります。</p></article>'
            '<article class="topic"><h3>Proでできること</h3><p>偏差値60・70の問題、全対象範囲の読み上げ、図鑑の全ページ、高画質の問題イラスト、広告なし。1科目Pro・中学受験4科Pro・全科目Proから選べます。</p></article>'
            '<article class="topic"><h3>おすすめの始め方</h3><p>まず無料の問題を数日使ってみて、お子さんに合うか確かめてから、必要な教科だけProにする進め方がおすすめです。</p></article></div>'
            '<p class="fine" style="margin-top:15px">対象教材・機能・無料範囲は配信バージョンにより異なる場合があります。<a href="/quest/plans/">料金・購入ガイド</a></p></div></section>')


def parents(sub):
    return (f'<section class="section mint"><div class="wrap split"><div><span class="kicker">おうちの方へ</span><h2>{sub["name"]}の復習を、<br>家庭で続けるコツ。</h2></div>'
            f'<div><p>{sub["weak"]}</p><ul class="checks-plain"><li><b>通塾の合間・行き帰り</b>に、1問1画面で数問だけ</li><li><b>寝る前の5分</b>は、まちがい直しで苦手だけを解き直す</li>'
            '<li><b>図鑑を一緒にながめて</b>、「今日は何がわかった？」と会話する</li><li>1台をきょうだいで使うときは、プロフィールを切り替えて学習記録を分ける</li></ul></div></div></section>')


def steps_section(sub):
    cards = ''.join(f'<article class="flow-card"><span class="num">0{i + 1}</span><h3>{t}</h3><p>{d}</p></article>' for i, (t, d) in enumerate(STEPS))
    return (f'<section class="section"><div class="wrap"><div class="section-head"><div><span class="kicker">学び方</span><h2>{sub["name"]}の4ステップ。</h2></div>'
            '<p>図鑑で理解 → 4択クイズ → まちがい直し → 毎日のクエスト。</p></div>'
            f'<div class="flow">{cards}</div></div></section>')


def scope_section(sub):
    rows = ''.join(f'<article class="topic"><h3>{d}</h3><p class="unit-list">{u}</p><p>{note}</p></article>' for d, u, note in sub['scope'])
    return (f'<section class="section white" id="scope"><div class="wrap"><div class="section-head"><div><span class="kicker">出題範囲</span><h2>中学受験の{sub["name"]}で、<br>扱う範囲。</h2></div>'
            '<p>収録している分野と単元です。単元名の一覧と問題数は、下の「学習ガイド」で確認できます。</p></div>'
            f'<div class="topic-grid">{rows}</div></div></section>')


def other_links(current):
    links = ''.join(f'<a class="text-link" href="/quest/juken/{s["slug"]}/">中学受験 {s["name"]}アプリ ↗</a> ' for s in SUBJECTS if s['slug'] != current)
    return (f'<section class="section"><div class="wrap"><div class="section-head"><h2>ほかの教科も、同じアプリで。</h2></div><p style="margin-bottom:15px">{links}'
            '<a class="text-link" href="/quest/juken/anki/">暗記アプリとしての使い方 ↗</a> <a class="text-link" href="/quest/school4/">中学受験4科 ↗</a> <a class="text-link" href="/quest/faq/">よくある質問 ↗</a></p></div></section>')


def subject_page(sub, ctx):
    stores, faq, unit_section, preview, image = ctx['stores'], ctx['faq'], ctx['unit_section'], ctx['preview'], ctx['image']
    cid, name = sub['cid'], sub['name']
    path = f'/quest/juken/{sub["slug"]}/'
    trail = [('Quest', '/quest/'), ('中学受験ガイド', '/quest/juken/'), (f'{name}', path)]
    stats = ctx['STATS']['courses'][cid]
    hero = (f'<section class="detail-hero"><div class="wrap detail-grid"><div><span class="eyebrow">中学受験・小4〜小6 / 合格！クエスト</span><h1>{sub["h1_a"]}<br>{sub["h1_b"]}</h1><p>{sub["lead"]}</p>'
            f'{stores("juken-" + sub["slug"])}<p class="fine">ダウンロード無料・アプリ内課金あり。合格を保証するものではありません。無料の問題から始められます。</p></div>'
            f'<div class="detail-visual">{image(cid + "-atlas", name + "のイラスト図鑑", eager=True)}</div></div></section>')
    figures = f'<figure>{preview(cid + "-atlas", name + "のイラスト図鑑")}<figcaption>図鑑で、全体や関係を整理。</figcaption></figure>'
    figures += f'<figure>{preview(cid + "-quiz", name + "の問題と解説の実画面")}<figcaption>問題を解いて、解説で確認。<small>アプリの学習画面の一例です。</small></figcaption></figure>'
    shots = ('<section class="section" id="samples"><div class="wrap"><div class="section-head"><div><span class="kicker">教材の中身</span><h2>図鑑と問題の画面。</h2></div>'
             '<p>タップすると大きく読めます。画面は更新により変わります。</p></div>'
             f'<div class="gallery two">{figures}</div></div></section>')
    body = (crumbs(trail) + hero + scope_section(sub) + unit_section(cid, name) + steps_section(sub) + shots + parents(sub) + free_pro() + single_note(sub)
            + f'<section class="section white"><div class="wrap"><div class="section-head"><div><span class="kicker">よくある質問</span><h2>{name}アプリのよくある質問。</h2></div></div>{faq(sub["faqs"])}</div></section>'
            + other_links(sub['slug']))
    extra = [breadcrumb([(n, u) for n, u in trail])] + app_schema(sub)
    return dict(path=path, title=sub['title'], desc=sub['desc'], body=body, faqs=sub['faqs'], extra=extra)


def hub_page(ctx):
    stores, faq, card, COURSES = ctx['stores'], ctx['faq'], ctx['card'], ctx['COURSES']
    st = ctx['STATS']['courses']
    trail = [('Quest', '/quest/'), ('中学受験ガイド', '/quest/juken/')]
    rows = ''.join(
        f'<tr><th scope="row"><a href="/quest/juken/{s["slug"]}/">{s["name"]}</a></th><td>{st[s["cid"]]["unitCount"]}単元</td><td>{st[s["cid"]]["questions"]:,}問</td><td>{st[s["cid"]]["atlasPages"]}ページ</td>'
        f'<td>{"、".join(d for d, _, _ in s["scope"])}</td></tr>' for s in SUBJECTS)
    table = ('<div class="table-scroll"><table class="juken-table"><caption>合格！クエストの中学受験4科（2026年10月25日確認、無料・Pro対象を含む）</caption>'
             '<thead><tr><th scope="col">教科</th><th scope="col">単元</th><th scope="col">問題</th><th scope="col">図鑑</th><th scope="col">分野</th></tr></thead>'
             f'<tbody>{rows}</tbody></table></div>')
    cards = ''.join(card(c) for c in COURSES[:4])
    hero = ('<section class="hero"><div class="wrap"><span class="eyebrow">中学受験・小学4〜6年生の家庭学習</span><h1>中学受験の理科・社会・国語・算数アプリ。<br>図鑑とクイズで、4科をまとめて復習。</h1>'
            '<p class="hero-lead">合格！クエストは、中学受験の4科を1つのアプリで学べる学習アプリです。イラスト図鑑で理解し、4択クイズで確かめ、まちがいは解き直す。偏差値40・50・60・70の4段階で、基礎から段階的に進められます。</p>'
            f'{stores("juken-hub")}<p class="fine">ダウンロード無料・アプリ内課金あり。塾や過去問演習を置き換えるものではなく、復習と確認の補助教材です。合格を保証するものではありません。</p></div></section>')
    why = ('<section class="section"><div class="wrap"><div class="section-head"><div><span class="kicker">選ばれ方</span><h2>中学受験の学習アプリを選ぶときの見方。</h2></div></div>'
           '<div class="topic-grid"><article class="topic"><h3>範囲が合っているか</h3><p>単元と問題数、難易度の段階が、お子さんの現在地に合うかを確認します。このアプリは小4〜小6の4科を、偏差値の目安40〜70で用意しています。</p></article>'
           '<article class="topic"><h3>理由まで分かるか</h3><p>正解・不正解だけでなく、絵と解説で理由を確かめられるか。図鑑と解説イラストで「なぜ」まで確認できます。</p></article>'
           '<article class="topic"><h3>続けられるか</h3><p>1問1画面・タップで即判定。まちがい直しや、学ぶほど育つ王国マップで、毎日続ける動機づけを助けます。</p></article></div></div></section>')
    subjects = ('<section class="section white"><div class="wrap"><div class="section-head"><div><span class="kicker">科目別ガイド</span><h2>教科から選ぶ。</h2></div><p>各教科の出題範囲・学び方・保護者向けの使い方をまとめています。</p></div>'
                f'{table}<div class="ccard-grid" style="margin-top:24px">{cards}</div>'
                '<p style="margin-top:20px"><a class="text-link" href="/quest/juken/anki/">暗記アプリとしての使い方 ↗</a> <a class="text-link" href="/quest/school4/">中学受験4科 ↗</a> <a class="text-link" href="/quest/faq/">よくある質問 ↗</a></p></div></section>')
    body = (crumbs(trail) + hero + why + subjects + free_pro()
            + f'<section class="section white"><div class="wrap"><div class="section-head"><div><span class="kicker">よくある質問</span><h2>中学受験アプリのよくある質問。</h2></div></div>{faq(HUB_FAQ)}</div></section>')
    return dict(path='/quest/juken/', title='中学受験 理科・社会・国語・算数アプリ｜4科を図鑑とクイズで復習｜合格！クエスト',
                desc='中学受験の理科・社会・国語・算数を1つのアプリで。理科7,742問・社会5,327問・国語4,550問・算数6,600問、偏差値40〜70の4段階。イラスト図鑑・まちがい直し・読み上げつき。',
                body=body, faqs=HUB_FAQ, extra=[breadcrumb(trail)])


def anki_page(ctx):
    stores, faq = ctx['stores'], ctx['faq']
    trail = [('Quest', '/quest/'), ('中学受験ガイド', '/quest/juken/'), ('暗記アプリ', '/quest/juken/anki/')]
    faqs = [
        ('暗記アプリとして、どんな覚え方ができますか？', 'イラスト図鑑で「見て理解」、4択クイズで「思い出して確認」、まちがえた問題を「解き直し」という3段階で、同じ内容を形を変えて何度も確認できます。'),
        ('暗記カードのように単語帳を作れますか？', '自分でカードを作る単語帳アプリではありません。あらかじめ用意された単元・問題で学ぶ形式で、ことわざ・漢字・歴史用語・理科の用語などを問題として確認します。'),
        ('間隔をあけて自動で復習してくれますか？', 'まちがえた問題がたまり、ホームから解き直せます。復習の間隔を自動で最適化する機能ではありません。テスト前にまとめて解き直す使い方が中心です。'),
        ('暗記が苦手な子にも向いていますか？', '絵と短いクイズで進められるので、文字だけの暗記よりも取りかかりやすいという使い方ができます。効果には個人差があり、成績向上を保証するものではありません。'),
    ]
    hero = ('<section class="hero"><div class="wrap"><span class="eyebrow">中学受験の暗記・復習</span><h1>中学受験の暗記アプリ。<br>見て、思い出して、解き直す。</h1>'
            '<p class="hero-lead">理科の用語、社会の地名・人物、国語のことわざ・漢字。覚えることが多い中学受験の暗記を、イラスト図鑑と4択クイズで、毎日の短い時間に。</p>'
            f'{stores("juken-anki")}<p class="fine">ダウンロード無料・アプリ内課金あり。合格を保証するものではありません。</p></div></section>')
    method = ('<section class="section white"><div class="wrap"><div class="section-head"><div><span class="kicker">暗記のしかた</span><h2>「覚えたつもり」を、<br>なくす3ステップ。</h2></div></div>'
              '<div class="flow"><article class="flow-card"><span class="num">01</span><h3>絵で見て理解する</h3><p>意味のわからない言葉を丸暗記すると、すぐ忘れます。図鑑のイラストで「どんな場面か」を先につかみます。</p></article>'
              '<article class="flow-card"><span class="num">02</span><h3>思い出して答える</h3><p>見るだけより、4択から選ぶ「思い出す」作業のほうが記憶に残りやすいと言われます。タップですぐ正誤が分かります。</p></article>'
              '<article class="flow-card"><span class="num">03</span><h3>まちがいを解き直す</h3><p>まちがえた問題だけをためて、あとでまとめて解き直し。覚えにくいものだけを繰り返せます。</p></article></div></div></section>')
    subs = ('<section class="section"><div class="wrap"><div class="section-head"><h2>教科別に暗記する。</h2></div><div class="topic-grid">'
            + ''.join(f'<article class="topic"><h3><a href="/quest/juken/{s["slug"]}/">{s["name"]}</a></h3><p>{s["scope"][0][0]}ほか{len(s["scope"])}分野。{ctx["STATS"]["courses"][s["cid"]]["questions"]:,}問。</p></article>' for s in SUBJECTS)
            + '</div></div></section>')
    body = (crumbs(trail) + hero + method + subs
            + f'<section class="section white"><div class="wrap"><div class="section-head"><div><span class="kicker">よくある質問</span><h2>暗記アプリのよくある質問。</h2></div></div>{faq(faqs)}</div></section>'
            + other_links('anki'))
    return dict(path='/quest/juken/anki/', title='中学受験 暗記アプリ｜図鑑とクイズで用語を定着｜合格！クエスト',
                desc='中学受験の暗記を、イラスト図鑑・4択クイズ・まちがい直しで。理科・社会・国語・算数の用語、ことわざ、漢字を毎日少しずつ復習できる学習アプリ。',
                body=body, faqs=faqs, extra=[breadcrumb(trail)])


def faq_page(ctx):
    stores, faq, base_faq = ctx['stores'], ctx['faq'], ctx['FAQ']
    trail = [('Quest', '/quest/'), ('よくある質問', '/quest/faq/')]
    items = SITE_FAQ_EXTRA + base_faq + HUB_FAQ
    seen, uniq = set(), []
    for q, a in items:
        if q not in seen:
            seen.add(q)
            uniq.append((q, a))
    hero = ('<section class="hero"><div class="wrap"><span class="eyebrow">よくある質問</span><h1>合格！クエストの<br>よくある質問。</h1>'
            '<p class="hero-lead">対象・料金・対応端末・単体アプリとの関係など、始める前に多い疑問をまとめました。</p></div></section>')
    body = (crumbs(trail) + hero + f'<section class="section white"><div class="wrap">{faq(uniq)}</div></section>' + other_links('faq')
            + '<section class="section"><div class="wrap"><p class="fine">価格はアプリの購入画面の表示が正です。内容は2026年10月27日時点。問い合わせは<a href="/support/">サポート</a>へ。</p></div></section>')
    return dict(path='/quest/faq/', title='よくある質問｜対象・料金・対応端末・単体アプリとの関係｜合格！クエスト',
                desc='合格！クエストのよくある質問。中学受験4科から資格・語学まで12教材、無料とProの違い、対応端末、合格理科クエスト・合格！国語クエストとの関係。',
                body=body, faqs=uniq, extra=[breadcrumb(trail)])


def build(ctx):
    return [hub_page(ctx)] + [subject_page(s, ctx) for s in SUBJECTS] + [anki_page(ctx), faq_page(ctx)]
