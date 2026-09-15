"""Build the learning-first site from the immutable pre-redesign commit.
Run from the repository root: python scripts/site-redesign/build.py
Existing 3D engines, local record storage and legal wording are not rewritten.
"""
from pathlib import Path
from urllib.parse import urljoin, urlsplit, unquote, quote
from html import escape as esc
import base64, hashlib, io, json, re, subprocess, sys, xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
from PIL import Image, ImageOps, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[2]
BASE='b8c922f00f90f1e443b02253dd78d5f60b2de53d'
# Explicit migration opt-in: normal CI validates committed HTML without regenerating it.
if '--rebuild-from-backup' not in sys.argv:
    raise SystemExit('One-time migration helper: use --rebuild-from-backup deliberately. Normal page edits do not require regeneration.')
DOMAIN='https://trailfusionai.com'
DATE='2026-09-16'
OUT=Path('/tmp/site-redesign-results'); OUT.mkdir(parents=True,exist_ok=True)
CHANGED=[]; MEDIA={}; PRESERVED={}
def git(*args): return subprocess.check_output(['git','-C',str(ROOT),*args])
try: git('cat-file','-e',BASE+'^{commit}')
except subprocess.CalledProcessError: subprocess.run(['git','-C',str(ROOT),'fetch','--depth=1','origin',BASE],check=True)
def original(path): return git('show',BASE+':'+path).decode('utf-8')
def write(path,text):
    p=ROOT/path;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(text,encoding='utf-8');CHANGED.append(path)
def fragment(text): return BeautifulSoup(text,'html.parser')
def digest(data): return hashlib.sha256(data).hexdigest()
def image(source,width=900):
    key=(source,width)
    if key in MEDIA:return MEDIA[key]
    if source.startswith('data:image/'):
        raw=base64.b64decode(source.split(',',1)[1])
    else:
        path=ROOT/unquote(urlsplit(source).path).lstrip('/')
        if not path.is_file():raise FileNotFoundError(path)
        raw=path.read_bytes()
    im=Image.open(io.BytesIO(raw));im=ImageOps.exif_transpose(im)
    if im.mode not in ['RGB','RGBA']:im=im.convert('RGBA' if 'transparency' in im.info else 'RGB')
    im.thumbnail((width,2400))
    dest='assets/media/'+digest(raw)[:18]+'-'+str(width)+'.webp'
    p=ROOT/dest;p.parent.mkdir(parents=True,exist_ok=True);im.save(p,'WEBP',quality=86,method=6)
    MEDIA[key]='/'+dest;return MEDIA[key]
def picture(source,alt,cls='',width=1000,eager=False):
    src=image(source,width); p=ROOT/src.lstrip('/')
    with Image.open(p) as im:w,h=im.size
    return f'<img src="{src}" alt="{esc(alt)}" width="{w}" height="{h}" class="{cls}" loading="{"eager" if eager else "lazy"}" decoding="async"'+(' fetchpriority="high"' if eager else '')+'>'

def header(active='learn',extra=''):
    hubs=[('learn','/quest/','学ぶ','合格クエスト'),('travel','/travel/','旅する','車旅'),('diy','/diy/','つくる','<span class="tf-desktop-label">キャンピングカーDIY</span><span class="tf-mobile-label">キャンパーDIY</span>'),('care','/maintenance/','整える','ハイエース整備')]
    links=''.join(f'<a href="{url}" data-hub="{key}" data-active="{str(key==active).lower()}"><b>{a}</b><small>{b}</small></a>' for key,url,a,b in hubs)
    return '<a class="tf-skip" href="#tf-main">本文へ移動</a><header class="tf-header"><div class="tf-container"><div class="tf-top"><a class="tf-brand" href="/" aria-label="TrailFusion AI ホーム"><span class="tf-brand-mark" aria-hidden="true">TF</span>TrailFusion <em>AI</em></a><nav class="tf-utility" aria-label="補助メニュー"><a href="/apps.html">アプリ一覧</a><a href="/about/">私たちについて</a><a href="/support/">サポート</a>'+'</nav>'+('<div class="tf-extra">'+extra+'</div>' if extra else '')+'<details class="tf-mobile-menu"><summary>メニュー</summary><nav class="tf-mobile-links" aria-label="モバイル補助メニュー"><a href="/choose/">クエストを選ぶ</a><a href="/parents/">保護者の方へ</a><a href="/study/">学習ガイド</a><a href="/apps.html">アプリ一覧</a><a href="/about/">私たちについて</a><a href="/support/">サポート</a></nav></details></div><nav class="tf-hubs" aria-label="4つのコンテンツ入口">'+links+'</nav></div></header>'
def footer():
    groups=[('学ぶ',[('/quest/','合格クエストシリーズ'),('/rika-quest.html','合格！理科クエスト'),('/social-quest.html','合格！社会クエスト'),('/kokugo-quest.html','合格！国語クエスト'),('/eigo-quest.html','英語・資格学習'),('/parents/','保護者の方へ'),('/study/','学習ガイド')]),('旅する・つくる・整える',[('/travel/','車旅の入口'),('/car-concierge.html','車旅コンシェルジュ'),('/drive-routes/','絶景ロード図鑑'),('/diy/','キャンピングカーDIY'),('/camping.html','3D間取りを体験'),('/camping-guide.html','DIY完全ガイド'),('/maintenance/','ハイエース整備')]),('TrailFusion AI',[('/apps.html','すべてのアプリ'),('/about/','運営・制作について'),('/support/','お問い合わせ・サポート'),('/support/#policies','アプリ別の規約・プライバシー'),('/privacy-policy.html','サイトのプライバシーポリシー'),('/terms-of-service.html','サイトの利用規約')])]
    columns=''.join('<div><h2>'+title+'</h2><ul>'+''.join('<li><a href="'+url+'">'+text+'</a></li>' for url,text in links)+'</ul></div>' for title,links in groups)
    return '<footer class="tf-footer"><div class="tf-container"><div class="tf-footer-grid"><div><a class="tf-brand" href="/"><span class="tf-brand-mark" aria-hidden="true">TF</span>TrailFusion <em>AI</em></a><p>学ぶ一歩も、旅する一歩も。<br>好奇心から生まれるアプリと、<br>自分らしい暮らしの記録。</p><a href="mailto:trailfusionai@gmail.com">お問い合わせ ↗</a></div>'+columns+'</div><div class="tf-footer-bottom"><span>© <span id="year">2026</span> TrailFusion AI</span><span>学ぶ。旅する。つくる。整える。</span></div></div></footer>'
def breadcrumb(items):
    return '<nav class="tf-breadcrumb" aria-label="パンくず"><a href="/">ホーム</a>'+''.join('<span aria-hidden="true">/</span>'+('<a href="'+url+'">'+esc(text)+'</a>' if url else '<span aria-current="page">'+esc(text)+'</span>') for text,url in items)+'</nav>'
def button(url,text,kind='',app='',store='',placement='page'):
    return '<a class="tf-button '+kind+'" href="'+esc(url,quote=True)+'"'+(f' data-app="{app}"' if app else '')+(f' data-store="{store}"' if store else '')+f' data-placement="{placement}">{text}<span aria-hidden="true">↗</span></a>'
def section(kicker,title,body,kind='',link=None):
    return '<section class="tf-section '+kind+'"><div class="tf-container"><div class="tf-section-head"><div><span class="tf-kicker">'+kicker+'</span><h2>'+title+'</h2></div>'+('<a class="tf-text-link" href="'+link[0]+'">'+link[1]+' →</a>' if link else '')+'</div>'+body+'</div></section>'
def faq(items):
    return '<div class="tf-faq">'+''.join('<details><summary>'+q+'</summary><p>'+a+'</p></details>' for q,a in items)+'</div>'
def final(title='今日の一問が、次の一歩に。',text='気になる教科から、合格クエストを見てみませんか。',url='/quest/',cta='教科から選ぶ'):
    return '<section class="tf-section"><div class="tf-container"><div class="tf-final"><div><span class="tf-kicker">TAKE THE NEXT STEP</span><h2>'+title+'</h2><p>'+text+'</p></div><div class="tf-actions">'+button(url,cta,'light')+'</div></div></div></section>'
ORG={'@type':'Organization','@id':DOMAIN+'/#organization','name':'TrailFusion AI','url':DOMAIN+'/','email':'trailfusionai@gmail.com'}
def metadata(soup,path,title,description,active='learn',app=None,noindex=False):
    if not soup.head:
        h=soup.new_tag('head');soup.html.insert(0,h)
    head=soup.head
    for el in soup.find_all('title'):el.decompose()
    t=soup.new_tag('title');t.string=title;head.append(t)
    for name,value in [('description',description),('robots','noindex, follow' if noindex else 'index, follow, max-image-preview:large'),('theme-color','#172b3a'),('twitter:card','summary_large_image')]:
        for el in soup.find_all('meta',attrs={'name':name}):el.decompose()
        head.append(soup.new_tag('meta',attrs={'name':name,'content':value}))
    for el in soup.find_all('link',rel='canonical'):el.decompose()
    url=DOMAIN+('/' if path=='index.html' else '/'+path.removesuffix('index.html'))
    head.append(soup.new_tag('link',rel='canonical',href=url))
    og=DOMAIN+'/assets/og/site-v2-'+(app['id'] if app and app.get('id') else ('learn' if active not in ['travel','diy','care'] else active))+'.jpg'
    for prop,value in [('og:title',title),('og:description',description),('og:type','website'),('og:site_name','TrailFusion AI'),('og:locale','ja_JP'),('og:url',url),('og:image',og),('og:image:width','1200'),('og:image:height','630')]:
        for el in soup.find_all('meta',attrs={'property':prop}):el.decompose()
        head.append(soup.new_tag('meta',attrs={'property':prop,'content':value}))
    for el in soup.find_all('script',type='application/ld+json'):el.decompose()
    graph=[ORG,{'@type':'WebSite','@id':DOMAIN+'/#website','url':DOMAIN+'/','name':'TrailFusion AI','inLanguage':'ja','publisher':{'@id':ORG['@id']}},{'@type':'WebPage','@id':url+'#webpage','url':url,'name':title,'description':description,'inLanguage':'ja','isPartOf':{'@id':DOMAIN+'/#website'}}]
    if path!='index.html':
        hub={'learn':('合格クエスト','/quest/'),'travel':('車旅','/travel/'),'diy':('キャンピングカーDIY','/diy/'),'care':('ハイエース整備','/maintenance/')}.get(active)
        entries=[{'@type':'ListItem','position':1,'name':'ホーム','item':DOMAIN+'/'}]
        if hub and DOMAIN+hub[1]!=url:entries.append({'@type':'ListItem','position':2,'name':hub[0],'item':DOMAIN+hub[1]})
        entries.append({'@type':'ListItem','position':len(entries)+1,'name':title.split(' | ')[0],'item':url})
        graph.append({'@type':'BreadcrumbList','itemListElement':entries})
    retained_app_names={'car-concierge.html':('車旅コンシェルジュ','TravelApplication'),'reelmake.html':('Reel Make','MultimediaApplication'),'buddytalk.html':('BuddyTalk','EducationalApplication'),'wood-golem.html':('Wood Golem','GameApplication'),'word-blaster.html':('Word Blaster','GameApplication')}
    if app is None and path in retained_app_names:
        store=next((a.get('href') for a in soup.select('a[href]') if 'apps.apple.com/' in a.get('href','')),None)
        if store:
            aid=re.search(r'id(\d+)',store)
            if aid:
                store='https://apps.apple.com/jp/app/id'+aid.group(1)
                graph.append({'@type':'SoftwareApplication','name':retained_app_names[path][0],'url':url,'description':description,'applicationCategory':retained_app_names[path][1],'publisher':{'@id':ORG['@id']},'operatingSystem':'iOS','installUrl':store,'sameAs':[store]})
                for el in soup.find_all('meta',attrs={'name':'apple-itunes-app'}):el.decompose()
                head.append(soup.new_tag('meta',attrs={'name':'apple-itunes-app','content':'app-id='+aid.group(1)}))
    if app and app.get('apple'):
        for el in soup.find_all('link',rel='icon'):el.decompose()
        head.append(soup.new_tag('link',rel='icon',href='/'+app['logo'].lstrip('/')))
        graph.append({'@type':'SoftwareApplication','@id':url+'#app','name':app['name'],'url':url,'description':app['description'],'applicationCategory':'EducationalApplication','operatingSystem':'iOS, Android' if app.get('google') else 'iOS','publisher':{'@id':ORG['@id']},'installUrl':app['apple'],'sameAs':[app['apple']]+([app['google']] if app.get('google') else []),'offers':{'@type':'Offer','price':'0','priceCurrency':'JPY'}})
        for el in soup.find_all('meta',attrs={'name':'apple-itunes-app'}):el.decompose()
        head.append(soup.new_tag('meta',attrs={'name':'apple-itunes-app','content':'app-id='+app['apple'].split('id')[-1]}))
    ld=soup.new_tag('script',type='application/ld+json');ld.string=json.dumps({'@context':'https://schema.org','@graph':graph},ensure_ascii=False);head.append(ld)
    return soup

def page(path,title,description,body,active='learn',app=None,noindex=False):
    soup=fragment('<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="icon" href="/assets/icons/trailfusion.svg" type="image/svg+xml"><link rel="stylesheet" href="/assets/css/site-v2.css"><script defer src="/assets/js/site-v2.js"></script><script async src="https://www.googletagmanager.com/gtag/js?id=G-S57KSMSB8Y"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag("js",new Date());gtag("config","G-S57KSMSB8Y");</script></head><body class="tf-page">'+header(active)+'<main id="tf-main">'+body+'</main>'+footer()+'</body></html>')
    metadata(soup,path,title+' | TrailFusion AI',description,active,app,noindex)
    write(path,str(soup))

def load_apps():
    specs=[('rika','理科','rika-quest.html','理科を、<br><span class="tf-accent">わかる冒険に。</span>','生命・地球・物質・エネルギーを、クイズとイラストで。中学受験理科の基礎知識を、単元ごとに確かめる学習アプリ。',['生命','地球','物質','エネルギー'],['単元を選んで学ぶ','イラストと音声で確かめる','リカちゃんと成長を楽しむ']),('social','社会','social-quest.html','暗記の先の、<br><span class="tf-accent">つながる社会へ。</span>','地理・歴史・公民を、4択クイズとイラスト解説で学ぶ中学受験社会のアプリ。苦手なテーマを見つけて、日々の復習に。',['地理','歴史','公民'],['3分野をテーマ別に学ぶ','4択クイズで確かめる','苦手分析と復習につなげる']),('kokugo','国語','kokugo-quest.html','ことばが増える。<br><span class="tf-accent">世界が広がる。</span>','漢字・語彙・ことわざ・慣用句・文法を、イラストと読み上げで。中学受験国語の知識を、目と耳から学ぶアプリ。',['漢字','語彙','ことわざ・慣用句','文法','文学・詩歌'],['意味と用例をつかむ','読み上げで音を確かめる','対戦やランキングを楽しむ'])]
    apps=[]
    for key,subject,path,headline,description,areas,features in specs:
        s=fragment(original(path));images=[x for x in s.select('img') if subject+'クエスト' in x.get('alt','')]
        logo=next(x['src'] for x in images if 'ロゴ' in x.get('alt',''))
        hero=next(x['src'] for x in images if 'メイン' in x.get('alt',''))
        shots=[(x['src'],x.get('alt','')) for x in images if ('画面' in x.get('alt','') and x['src']!=hero)][:4]
        apple=next(a['href'] for a in s.select('a[href]') if 'apps.apple.com' in a['href']); appid=re.search(r'id(\d+)',apple).group(1)
        google=next((a['href'] for a in s.select('a[href]') if 'play.google.com' in a['href']),None)
        apps.append(dict(id=key,subject=subject,path=path,name='合格！'+subject+'クエスト',headline=headline,description=description,areas=areas,features=features,logo=logo,hero=hero,shots=shots,apple='https://apps.apple.com/jp/app/id'+appid,google=google,category='learn',policy=('shakai' if key=='social' else key)+'-quest-privacy.html',terms=('shakai' if key=='social' else key)+'-quest-terms.html',support=('shakai' if key=='social' else key)+'-quest-support.html'))
    return apps
APPS=load_apps()
def app_card(a,placement='card'):
    icon=picture(a['logo'],a['name']+' アイコン','tf-app-icon',160) if a.get('logo') else '<span class="tf-app-icon tf-app-letter" aria-hidden="true">'+a['subject'][:1]+'</span>'
    return '<article class="tf-app-card" data-tf-filter-card data-category="'+a.get('category','learn')+'" id="'+a['id']+'"><div class="tf-app-top">'+icon+'<span class="tf-app-subject">'+a.get('label','中学受験 / '+a['subject'])+'</span></div><h3>'+a['name']+'</h3><p>'+a['description']+'</p><div class="tf-card-tail"><span>'+('iOS / Android' if a.get('google') else 'iOS' if a.get('apple') else '詳細・配信案内')+'</span><a href="/'+a['path']+'" data-app="'+a['id']+'" data-placement="'+placement+'">詳しく見る</a></div></article>'
def app_cards(items=None,placement='card'):return '<div class="tf-grid">'+''.join(app_card(a,placement) for a in (items or APPS))+'</div>'
def store_buttons(a,placement='hero'):
    result=button(a['apple'],'App Storeで見る','dark',a['id'],'apple',placement)
    if a.get('google'):result+=button(a['google'],'Google Playで見る','secondary',a['id'],'google',placement)
    return '<div class="tf-actions">'+result+'<p class="tf-store-note">ダウンロード無料・アプリ内課金あり。価格・対応端末・配信状況は各ストアでご確認ください。</p></div>'
def english_band():return '<div class="tf-band"><div><h3>英語・資格学習にも、クエストを。</h3><p>合格！英語クエストは、英語の文法・語彙・資格学習向け。中学受験の主要3教科とは分けてご案内します。</p></div><a class="tf-text-link" href="/eigo-quest.html">英語クエストを見る →</a></div>'
PHOTOS={'travel':'assets/images/camper/camper_dramatic_sky（大）.jpg','diy':'assets/images/camper/camper_interior_dining（大）.jpeg','care':'assets/images/unsplash/homepage/hiace-maintenance.jpg','road':'assets/images/camper/camper_seaside_sunset（大）.jpeg'}
def path_cards():
    rows=[('travel','TRAVEL','車旅に出よう。','泊まる場所も、次の絶景も。アプリと地図で、週末の寄り道を探す。','/travel/','車旅を楽しむ'),('diy','CAMPER DIY','自分だけの一台を。','3Dの間取りから、内装・電装の制作ガイドまで。想像をかたちに。','/diy/','DIYの世界を見る'),('care','HIACE MAINTENANCE','愛車を、もっと知る。','3Dで仕組みをたどり、日々の整備を記録。長く付き合うための入口。','/maintenance/','整備を知る')]
    return '<div class="tf-grid">'+''.join('<a class="tf-path-card" href="'+url+'" data-hub="'+key+'" data-placement="home-paths">'+picture(PHOTOS[key],title,'tf-path-image',700)+'<div class="tf-path-body"><span class="tf-kicker">'+k+'</span><h3>'+title+'</h3><p>'+text+'</p><span class="tf-text-link">'+cta+' →</span></div></a>' for key,k,title,text,url,cta in rows)+'</div>'

def build_new():
    a,b=APPS[:2]
    hero='<div class="tf-container"><section class="tf-hero"><div><span class="tf-kicker">合格クエスト / 中学受験の学びに</span><h1>学ぶ一歩を、<br><span class="tf-accent">夢中に変える。</span></h1><p class="tf-lead">理科・社会・国語を、クイズと解説で。<br>「知りたい」「もう一問」を、毎日の学びのきっかけに。</p><div class="tf-actions">'+button('/quest/','教科から選ぶ')+button('/parents/','保護者の方へ','secondary')+'</div><div class="tf-pills"><span class="tf-pill">教科別に学べる</span><span class="tf-pill">イラストで理解</span><span class="tf-pill">スマホで復習</span></div><p class="tf-note">TrailFusion AIは、学習アプリと車旅・DIYのコンテンツをつくる個人開発のスタジオです。</p></div><div class="tf-stage" aria-label="実際の学習アプリ画面"><div class="tf-phone">'+picture(a['hero'],'理科クエストの実際のメイン画面','',480,True)+'</div><div class="tf-phone back">'+picture(b['hero'],'社会クエストの単元選択画面','',420)+'</div><div class="tf-stage-tag">小さな「わかった」を、<b>次の一問へ。</b></div></div></section></div>'
    steps='<div class="tf-grid">'+''.join('<article class="tf-step"><span class="tf-step-num">'+num+'</span><h3>'+title+'</h3><p>'+text+'</p></article>' for num,title,text in [('01 / CHOOSE','今日のテーマを一つ。','塾や学校で学んだ単元、気になった分野から。教科ごとに、自分に合うクエストを選びます。'),('02 / DISCOVER','正解より、わかること。','答え合わせのあとに、解説を確認。「なぜそうなる？」を確かめる時間も大切に。'),('03 / CONTINUE','短くても、また明日。','一度で全部を覚えようとせず、短い復習を日々の生活へ。紙の教材と組み合わせて使えます。')])+'</div>'
    home=hero+section('EXPLORE TRAILFUSION','学ぶ、その先にも好奇心を。',path_cards(),'white')+section('GOKAKU QUEST','今、伸ばしたい教科から。',app_cards(placement='home')+english_band(),link=('/choose/','クエスト選びを手伝ってもらう'))+section('SMALL STEPS, EVERY DAY','「もう一問」を、日々の習慣へ。',steps,'white')+section('FOR PARENTS','安心して選べることも、大切に。','<div class="tf-editorial"><div><p class="tf-pullquote">楽しいだけで終わらない。<br>わかったことを、確かめる学びに。</p><p class="tf-lead">対応する学習範囲、無料と有料の違い、個人情報の扱い。使い始める前に知っておきたいことをまとめました。</p><div class="tf-actions">'+button('/parents/','保護者向けガイド','secondary')+'</div></div><div class="tf-answer"><strong>「これだけで合格」とは言いません。</strong>クエストは、知識の確認と復習を支える学習アプリです。記述や思考過程は、紙の教材や授業での学びと組み合わせてください。成績向上や合格を保証するものではありません。</div></div>')+final()
    page('index.html','合格クエストと、好奇心のある暮らし','合格クエストシリーズの理科・社会・国語学習アプリを中心に、車旅コンシェルジュ、キャンピングカーDIY、ハイエース整備を紹介するTrailFusion AI公式サイト。',home)
    quest='<div class="tf-container">'+breadcrumb([('合格クエスト',None)])+'<div class="tf-page-heading"><span class="tf-kicker">GOKAKU QUEST SERIES</span><h1>わかる喜びを、<br><span class="tf-accent">学びのエネルギーに。</span></h1><p class="tf-lead">中学受験の知識を確かめる、理科・社会・国語の学習アプリ。好きな教科も、気になる苦手も、自分のペースで。</p><div class="tf-actions">'+button('/choose/','自分に合うクエストを選ぶ')+button('/parents/','無料・有料と使い方','secondary')+'</div></div>'+app_cards()+english_band()+'</div>'
    quest+=section('FIND YOUR ROUTINE','いまの学習に、ちょうどよく。','<div class="tf-directory"><a href="/study/after-class/"><small>塾や学校のあとに</small><h3>習った内容を、もう一度。</h3><p>今日の単元をアプリで確かめ、解説を読んで理解を整理する使い方。</p></a><a href="/study/review/"><small>苦手を見直したいときに</small><h3>間違えた理由を、一つずつ。</h3><p>不正解の原因を分け、次の復習につなげる方法を紹介します。</p></a></div>')+section('HOW IT WORKS','無理なく始める、3つのステップ。',steps,'white')+final()
    page('quest/index.html','合格クエストシリーズ | 中学受験の理科・社会・国語','合格クエストシリーズの教科別案内。中学受験理科・社会・国語の学習範囲と使い方、英語・資格学習向けアプリをご紹介します。',quest)
    for app in APPS:
        p=app['path'];subject=app['subject']
        body='<div class="tf-container">'+breadcrumb([('合格クエスト','/quest/'),(app['name'],None)])+'<section class="tf-hero tf-app-hero"><div><div class="tf-product-name">'+picture(app['logo'],app['name']+' アイコン','tf-app-icon',160)+'<span>'+app['name']+'</span></div><span class="tf-kicker">中学受験 / '+subject+'の知識と復習</span><h1>'+app['headline']+'</h1><p class="tf-lead">'+app['description']+'</p>'+store_buttons(app)+'<div class="tf-pills">'+''.join('<span class="tf-pill">'+x+'</span>' for x in app['areas'])+'</div></div><figure class="tf-product-stage">'+picture(app['hero'],app['name']+' メイン画面','',620,True)+'<figcaption>アプリの紹介画像。画面・収録内容はバージョンにより異なります。</figcaption></figure></section></div>'
        featuretexts={'rika':['生命・地球・物質・エネルギーから、気になる単元を選べます。習った内容の振り返りにも。','文字だけでは捉えにくいことを、イラストと読み上げで確かめられます。','学習と一緒に育つキャラクター。毎日の一問に、小さな楽しみを添えます。'],'social':['地理・歴史・公民を分けて学習。塾や学校で扱ったテーマから復習できます。','短い時間にも取り組める4択問題。答えを選んだあとは解説を確かめましょう。','結果を振り返り、理解があいまいなところを確認。復習のきっかけにできます。'],'kokugo':['漢字・語彙・慣用句・文法を、分野別に確認。知っていることばの意味を深めます。','イラストと読み上げを組み合わせ、文字と音から意味を確かめられます。','友達との対戦やランキングを、学習を続ける楽しみとして活用できます。']}
        cards='<div class="tf-grid">'+''.join('<article class="tf-step"><span class="tf-step-num">0'+str(i+1)+'</span><h3>'+name+'</h3><p>'+featuretexts[app['id']][i]+'</p></article>' for i,name in enumerate(app['features']))+'</div>'
        body+=section('DESIGNED FOR LEARNING',subject+'の学びを支える、3つの工夫。',cards,'white')
        screens='<div class="tf-shot-grid">'+''.join('<figure>'+picture(src,alt or app['name']+' 学習画面','',600)+'<figcaption>'+esc(alt or '実際のアプリ画面')+'</figcaption></figure>' for src,alt in app['shots'])+'</div>'
        body+=section('INSIDE THE APP','紹介画像で、学びをイメージ。',screens)
        scope='<div class="tf-answer"><strong>'+subject+'クエストで学べること</strong>'+('・'.join(app['areas']))+'を中心に、知識の確認と復習に取り組めます。単元や問題の収録状況は、アプリの最新版でご確認ください。掲載画像は紹介用のため、収録内容や表示が最新版と異なる場合があります。</div><p class="tf-note">'+('文章読解の記述練習まで、このアプリだけで完結するものではありません。' if subject=='国語' else '途中式・記述・実験の考察などは、授業や紙の教材と組み合わせて学びましょう。')+' アプリ内の偏差値は、塾の模試の偏差値や志望校合格可能性を表すものではありません。</p>'
        body+=section('CURRICULUM','学習範囲と、上手な使い分け。',scope,'white')
        body+=section('START SMALL','今日学んだ単元から、始めよう。',steps)
        fee='<div class="tf-table-scroll"><table class="tf-table"><thead><tr><th scope="col">確認すること</th><th scope="col">ご案内</th></tr></thead><tbody><tr><th scope="row">ダウンロード</th><td>無料でダウンロードできます。アプリ内課金があります。</td></tr><tr><th scope="row">有料機能・価格</th><td>利用できる範囲や購入内容は、アプリの購入画面でご確認ください。OS・地域・バージョンで異なる場合があります。</td></tr><tr><th scope="row">広告・個人情報</th><td>利用する機能に応じた取り扱いを、<a href="/'+app['policy']+'">プライバシーポリシー</a>でご確認ください。</td></tr><tr><th scope="row">対応端末</th><td>iOS・Androidの各ストアで、OS要件とお使いの端末の対応をご確認ください。</td></tr></tbody></table></div>'
        body+=section('BEFORE YOU START','無料・有料と、利用前の確認。',fee,'white')
        body+=section('QUESTIONS','よくあるご質問。',faq([('塾に通っていても使えますか？','習った単元の知識を確認する補助教材として使えます。塾のカリキュラムや宿題を置き換えるものではありません。'),('小学何年生から使えますか？','中学受験の学習を進める小学生を中心に、理解度に合う単元からご利用ください。特定の学年の授業進度との一致は保証していません。'),('料金はどこで確認できますか？','ダウンロードは無料です。有料機能・購入価格・更新条件は、購入前にアプリ内の画面でご確認ください。'),('問題や動作について問い合わせたいときは？','アプリ名、該当する単元や問題、端末とアプリのバージョンを添えて、<a href="/support/">サポート</a>へご連絡ください。お子さまの氏名など、不要な個人情報は送らないでください。')]))
        body+='<section class="tf-section"><div class="tf-container"><div class="tf-final"><div><span class="tf-kicker">'+app['name']+'</span><h2>まずは、気になる一問から。</h2><p>使い方と内容を確かめて、自分に合う学びを。</p></div><div>'+store_buttons(app,'bottom')+'</div></div></div></section>'
        body+=section('MORE QUESTS','ほかの教科も、見てみよう。',app_cards([a for a in APPS if a['id']!=app['id']]),'white')
        page(p,app['name']+' | 中学受験'+subject+'の学習アプリ',app['description'],body,app=app)
    eng='<div class="tf-container">'+breadcrumb([('合格クエスト','/quest/'),('英語クエスト',None)])+'<div class="tf-page-heading"><span class="tf-kicker">ENGLISH & QUALIFICATION STUDY</span><h1>英語の学びにも、<br><span class="tf-accent">次のクエストを。</span></h1><p class="tf-lead">合格！英語クエストは、英語の文法・語彙・会話表現と、TOEIC・TOEFL・CETなどに関連する学習を扱うアプリです。</p><div class="tf-actions">'+button('/support/?app=eigo','配信・利用について問い合わせる')+'</div></div><div class="tf-answer"><strong>中学受験の主要3教科とは、別の学習領域です。</strong>理科・社会・国語クエストとは学習対象が異なります。資格試験の公式アプリではなく、スコアや合格を保証するものではありません。</div></div>'
    eng+=section('LEARNING AREAS','基礎から、目的のある学びへ。','<div class="tf-grid">'+''.join('<article class="tf-step"><span class="tf-step-num">'+n+'</span><h3>'+t+'</h3><p>'+d+'</p></article>' for n,t,d in [('01','文法・語彙・表現','英語の文法、単語、会話表現をクイズで学ぶためのコンテンツ。'),('02','演習と学習記録','実力テスト・模試に関連する学習と、取り組みの記録。'),('03','文法の参照教材','GrammarMasterBookなど、学習を振り返るための教材を提供します。')])+'</div>','white')
    eng+=section('AVAILABILITY & PRICING','配信情報と、購入前のご確認。','<div class="tf-read"><p>最新の配信先・対応端末については、サポート窓口へお問い合わせください。ご利用前に、学習内容とお使いの端末の対応をご確認ください。</p><p>通常クイズの無料利用、広告、広告非表示・教材・チケットなどのアプリ内課金、Quest Proの月額・年額プランについては、利用規約をご確認ください。提供内容と価格はアプリ内の購入画面が優先されます。</p><div class="tf-actions">'+button('/eigo-quest-terms.html','利用規約','secondary')+button('/eigo-quest-privacy.html','プライバシー','secondary')+'</div></div>')
    page('eigo-quest.html','合格！英語クエスト | 英語・資格学習のご案内','合格！英語クエストの文法・語彙・資格学習、無料利用とアプリ内課金、配信情報とサポートをご案内します。',eng)

    choose='<div class="tf-container">'+breadcrumb([('合格クエスト','/quest/'),('クエストを選ぶ',None)])+'<div class="tf-page-heading"><span class="tf-kicker">FIND YOUR QUEST</span><h1>いま学びたいことから、<br><span class="tf-accent">クエストを選ぼう。</span></h1><p class="tf-lead">教科と使い方を選ぶと、おすすめの入口をご案内します。学力を診断する機能ではありません。</p></div><div class="tf-finder"><form id="quest-finder"><label class="tf-field"><span>学びたい教科</span><select name="subject"><option value="rika">理科 / 中学受験</option><option value="social">社会 / 中学受験</option><option value="kokugo">国語 / 中学受験</option><option value="eigo">英語 / 英語・資格学習</option></select></label><label class="tf-field"><span>使ってみたい場面</span><select name="goal"><option value="basic">学んだ知識を確かめたい</option><option value="review">間違えた内容を復習したい</option><option value="habit">短い時間から続けたい</option></select></label><button class="tf-button" type="submit">クエストを見る →</button><p class="tf-note">選択内容はこの画面内だけで処理し、保存・送信しません。</p></form><section class="tf-result" id="finder-result" tabindex="-1" aria-live="polite"><span class="tf-kicker">YOUR NEXT STEP</span><h2>気になる教科を、選んでください。</h2><p data-result-text>迷ったときは、今日の授業や塾で学んだ教科から。下の一覧から直接選ぶこともできます。</p><div class="tf-actions">'+button('/quest/','シリーズ一覧を見る')+'</div></section></div><noscript><p>JavaScriptが無効な場合は、下の教科一覧から直接お選びください。</p></noscript></div>'+section('ALL QUESTS','教科から直接選ぶ。',app_cards()+english_band())
    page('choose/index.html','自分に合う合格クエストを選ぶ','学びたい教科と利用場面から合格クエストを選べます。選択内容を保存・送信しない、シンプルなアプリ選びガイドです。',choose)

    for active,path,kicker,title,desc,herocta,entries in [
      ('travel','travel/index.html','TRAVEL, YOUR WAY','次の週末を、<br>少し遠くへ。','車旅コンシェルジュで泊まる場所を探し、絶景ロード図鑑で寄り道を見つける。自分らしいペースで、日本を巡るための入口です。',('/car-concierge.html','車旅アプリを見る'),[('/car-concierge.html','APP','車旅コンシェルジュ','駐車場・車中泊の場所探し、ドライブ、旅の記録をアプリで。'),('/drive-routes/','MAP','絶景ロード図鑑','地域やテーマからドライブルートを探すインタラクティブな地図。'),('/travel/story.html','OUR STORY','この国を、走り続ける理由。','ハイエースでの旅から始まった、TrailFusion AIの原点。'),('/diy/','MAKE YOUR VAN','旅の拠点を、自分の手で。','間取りの3D体験とDIYガイドで、車内の過ごし方を考える。')]),
      ('diy','diy/index.html','CAMPER DIY','「こんな一台」を、<br>自分の手で。','ハイエースの間取りを3Dで眺め、つくり方をガイドで確かめる。計画から内装・電装まで、車中泊仕様づくりの道筋を見つけましょう。',('/camping.html','3D間取りを体験する'),[('/camping.html','INTERACTIVE 3D','間取りを、立体で考える。','レイアウトとシーンを切り替えて、自分の過ごし方をイメージ。'),('/camping-guide.html#roadmap','START HERE','DIYロードマップ','制作全体の順番を確かめて、取りかかる場所を決める。'),('/camping-guide.html#layouts','LAYOUT','用途別レイアウト','ひとり旅、仕事、ふたり旅、家族旅。目的に合う形を探す。'),('/camping-guide.html#foundation','FOUNDATION','基礎と内装','床や断熱など、完成後には見えにくい部分から考える。'),('/camping-guide.html#electrical','ELECTRICAL','電装・サブバッテリー','消費電力と使い方を整理してから、機器や施工方法を検討。'),('/camping-guide.html#costs','BUDGET & REVIEW','費用と、つまずきやすい点','予算と実際の使い勝手を、制作前の計画に織り込む。')]),
      ('care','maintenance/index.html','KNOW YOUR HIACE','愛車を知るほど、<br>旅は、もっと続く。','ハイエースの仕組みを3Dでたどり、部品の役割を学び、整備記録をつなぐ。実車の作業とは分けて、理解を深めるための入口です。',('/maintenance.html','3Dで愛車の仕組みを見る'),[('/maintenance.html#studio','INTERACTIVE 3D','仕組みを、立体でたどる。','車両仕様を選び、部品や動力のつながりを確認する。'),('/maintenance.html#guide','PARTS GUIDE','部品と整備の関係を知る。','部品の分類から、点検で気をつけることを学ぶ。'),('/maintenance.html#journal','MAINTENANCE JOURNAL','愛車の記録を残す。','作業日や走行距離を記録し、JSONで書き出して手元に保存。'),('/maintenance.html#sources','CHECK BEFORE WORK','実車で作業する前に。','学習用のモデルと実車を区別し、車両の整備書や専門家に確認。')])]:
        cards='<div class="tf-directory">'+''.join('<a href="'+url+'"><small>'+tag+'</small><h3>'+t+'</h3><p>'+d+'</p></a>' for url,tag,t,d in entries)+'</div>'
        body='<div class="tf-container">'+breadcrumb([({'travel':'車旅','diy':'キャンピングカーDIY','care':'ハイエース整備'}[active],None)])+'<section class="tf-featured-hero">'+picture(PHOTOS[active],title.replace('<br>',''),' ',1400,True)+'<div><span class="tf-kicker">'+kicker+'</span><h1>'+title+'</h1><p>'+desc+'</p><div class="tf-actions">'+button(herocta[0],herocta[1],'light')+'</div></div></section></div>'+section('EXPLORE','気になるところから、深く。',cards)
        if active=='travel':body+=section('TRAVEL WITH CARE','心地よい旅を、次の人にも。','<div class="tf-answer"><strong>利用ルールと現地の状況を、出発前に確認しましょう。</strong>地図や紹介ページの情報だけで、宿泊可否や安全性を判断しないでください。施設・駐車場のルール、道路状況、天候、営業情報は、管理者や公式案内でご確認ください。</div>','white')
        if active=='diy':body+=section('PLAN BEFORE BUILD','つくる前に、使い方を決める。','<div class="tf-grid">'+''.join('<article class="tf-step"><span class="tf-step-num">0'+str(i+1)+'</span><h3>'+t+'</h3><p>'+d+'</p></article>' for i,(t,d) in enumerate([('何人で、どう過ごす？','寝る人数、荷物、仕事、調理。優先したい場面を先に整理します。'),('何を、自分でつくる？','得意な作業と、施工業者に相談したい作業を分けて計画します。'),('完成後も、見直せる？','点検口や配線の取り回しなど、使い続けるための余地を考えます。')]))+'</div><div class="tf-answer warning"><strong>安全に関わる施工は、専門家へ。</strong>電装・燃焼機器・車体への加工・乗車定員や構造変更などは、車両仕様と法令、メーカーの施工要領を確認してください。このサイトの作例は、個別車両への適合や安全を保証するものではありません。</div>','white')
        if active=='care':body+=section('IMPORTANT NOTES','学ぶことと、実車の作業を分ける。','<div class="tf-answer warning"><strong>3Dは理解のためのモデルです。</strong>部品の形状・配置は学習用に簡略化しています。年式・型式・仕様により実車は異なります。締付トルクや整備手順は、適合する整備書と整備事業者に確認してください。整備記録はこのブラウザ内に保存されるため、端末変更やデータ削除に備えて書き出してください。</div>','white')
        body+=final('好奇心は、まだ続く。','車旅・DIY・整備は、いつでも上の4つの入口から。','/','ホームへ戻る')
        page(path,{'travel':'車旅の入口 | アプリ・ドライブルート・旅の記録','diy':'キャンピングカーDIY | ハイエースの3D間取りと制作ガイド','care':'ハイエース整備 | 3D解説と整備記録'}[active],desc,body,active)

    parents='<div class="tf-container">'+breadcrumb([('合格クエスト','/quest/'),('保護者の方へ',None)])+'<div class="tf-page-heading"><span class="tf-kicker">FOR PARENTS</span><h1>楽しく学ぶ。その前に、<br><span class="tf-accent">安心して選べること。</span></h1><p class="tf-lead">学習範囲、購入、広告やデータのこと。合格クエストを使い始める前に知っておきたい情報をまとめました。</p></div><article class="tf-read"><h2>中学受験の知識を確かめる、補助教材です。</h2><p>理科・社会・国語クエストは、教科別のクイズや解説を通して、知識を確認し復習するためのアプリです。塾や学校の授業、紙の教材と組み合わせてお使いください。英語クエストは英語・資格学習の別領域としてご案内しています。</p><h2>最初は、保護者の方と一緒に。</h2><p>問題の難しさ、解説の読みやすさ、学ぶ内容がお子さまに合うか、数問試して確かめてみてください。時間を長くするより、無理なく終えられる量から始めることを提案しています。</p><h2>無料範囲と課金は、購入画面で確認。</h2><p>各アプリには無料で利用できる範囲と、有料の機能・教材などがあります。アプリごとの提供内容は異なるため、購入内容、金額、定期購入の場合は更新・解約条件を、購入直前の画面でご確認ください。シリーズ共通の買い切りや一括契約を、このサイトでは販売していません。</p><h2>広告・アカウント・学習データについて。</h2><p>広告の表示、分析ツール、アカウントやランキングの利用に伴うデータの扱いは、アプリごとのプライバシーポリシーに記載しています。すべてのアプリについて「広告なし」「登録不要」「データ収集なし」と一律に案内することはしていません。</p><p><a href="/support/#policies">アプリ別のプライバシーポリシーと利用規約を見る →</a></p><h2>成績とランキングの見方。</h2><p>学習結果は、理解があいまいな内容を見つけるための参考としてお使いください。アプリ内の偏差値は、塾の模試の偏差値や志望校への合格可能性を表すものではありません。成績向上や合格を保証するサービスではありません。</p><h2>気になる問題や不具合を見つけたら。</h2><p>アプリ内に問題の報告機能がある場合は、該当する問題からお知らせください。メールの場合はアプリ名、単元・問題、端末、バージョン、状況を添えてください。ご連絡の際、お子さまの氏名や学校名などの不要な個人情報は送らないでください。</p><div class="tf-actions">'+button('/support/','サポートを見る')+button('/choose/','教科を選ぶ','secondary')+'</div></article></div>'
    page('parents/index.html','保護者の方へ | 合格クエストの使い方と安心ガイド','合格クエストの学習範囲、無料と有料、広告・個人情報、成績の見方、問題や不具合の報告について保護者向けにご案内します。',parents)

    articles=[('after-class','塾のあと、何を復習する？','習った単元を、クイズと紙の教材で確かめる。',[('今日の範囲を、一つだけ決める。','塾や学校のノートを見て、今日学んだ単元名を書き出します。すべてを一度に復習するより、理解を確かめたい範囲を一つ選んでみましょう。アプリに同じ単元がない場合は、無理に探し続けず手元の教材で確認します。'),('最初は、解説を見ずに答える。','正解かどうかだけでなく、答えを選んだ理由をことばにしてみます。選択肢を見て思い出しただけなのか、自分で説明できるのかを分けると、次に確かめることが見つかります。'),('答え合わせのあとに、教材へ戻る。','間違えた内容や、正解したけれど理由がわからない内容は、アプリの解説で確認します。図や途中式を自分で書く必要がある内容は、ノートにも残します。アプリの解説と授業の説明が違って見えるときは、先生や保護者に確認しましょう。'),('次の復習の印をつける。','今日できなかったことを一行だけ残し、次回の最初に確かめます。「たくさん解いた」より「前回わからなかった内容が説明できた」を、その日の区切りにする使い方を提案します。')]),('review','間違えた問題を、次の一問につなげる。','苦手の正体を分けて、復習する場所を決める。',[('不正解の理由を、分けてみる。','知識を知らなかった、問題文を読み違えた、計算を間違えた、二つの語句を混同した。同じ不正解でも、次にすることは違います。原因がわからないときは、問題文と解説を並べて読み直します。'),('知らなかった知識は、短く整理。','用語だけでなく、意味や関係する内容を一組で書いてみます。社会の人物なら時代や出来事、理科の性質なら具体例、国語の語句なら使う場面を添えると、自分が何を理解しているか確認できます。'),('選択肢なしでも、説明してみる。','4択で正解できた内容を、選択肢を見ずに説明できるか試します。記述や計算が必要な問題は紙に書き、アプリだけで学習が完結したことにしないようにします。'),('同じ間違いが続くときは、戻る。','何度解いても理解できないときは、問題数を増やす前に基礎の説明へ戻ります。授業のノート、教科書、先生への質問など、別の説明も使いながら確かめましょう。')]),('words','ことばを、意味と用例で増やす。','漢字・語彙・慣用句を、国語クエストとノートで学ぶ。',[('読めることと、意味がわかること。','読める漢字でも、文の中で意味を取り違えることがあります。読み・意味・使い方を別々に確かめると、どこを復習するか整理できます。'),('短い例文を、一つ作る。','学んだ語句を使って、自分の生活に近い短い文を作ってみます。自然な使い方か迷ったときは、辞書や教材の用例で確認します。アプリの読み上げは、音を確かめる補助として使えます。'),('似た意味と、反対の意味を比べる。','紛らわしい語句を並べ、どんな場面で使うか比べます。ことわざや慣用句は、文字どおりの意味と実際の使われ方が違うことにも注目します。'),('文章の中でも、探してみる。','クイズで学んだ語句を、読書や国語の文章問題の中で見つけてみます。文章全体の読解や記述は、国語クエストの知識学習と別に、紙の教材などで練習しましょう。')])]
    articlecards=[]
    for slug,title,desc,parts in articles:
        url='/study/'+slug+'/'
        articlecards.append('<a href="'+url+'"><small>家庭学習の使い方</small><h3>'+title+'</h3><p>'+desc+'</p></a>')
        body='<div class="tf-container">'+breadcrumb([('学習ガイド','/study/'),(title,None)])+'<div class="tf-page-heading"><span class="tf-kicker">LEARNING GUIDE</span><h1>'+title+'</h1><p class="tf-lead">'+desc+'</p><p class="tf-note">TrailFusion AI 編集 / '+DATE+'公開。学習の使い方の提案であり、効果や合格を保証するものではありません。</p></div><article class="tf-read"><div class="tf-answer"><strong>この記事のポイント</strong>'+desc+' お子さまの理解度や授業の進度に合わせて、無理のない量でお使いください。</div>'+''.join('<h2>'+h+'</h2><p>'+p+'</p>' for h,p in parts)+'<h2>クエストで、今日のテーマを確かめる。</h2><p>理科・社会・国語の知識確認に使えるアプリを、教科別に紹介しています。</p><div class="tf-actions">'+button('/quest/','教科別アプリを見る')+'</div></article></div>'
        page('study/'+slug+'/index.html',title,desc,body)
    body='<div class="tf-container">'+breadcrumb([('学習ガイド',None)])+'<div class="tf-page-heading"><span class="tf-kicker">LEARNING JOURNAL</span><h1>毎日の学びに、<br><span class="tf-accent">小さな工夫を。</span></h1><p class="tf-lead">合格クエストを、授業や紙の教材と組み合わせるヒント。ご家庭に合う使い方を探してみてください。</p></div><div class="tf-directory">'+''.join(articlecards)+'</div></div>'+final()
    page('study/index.html','学習ガイド | 合格クエストと家庭学習','塾の復習、間違えた問題の見直し、漢字・語彙の学習など、合格クエストと紙の教材を組み合わせる使い方を紹介します。',body)

    body='<div class="tf-container">'+breadcrumb([('運営・制作について',None)])+'<div class="tf-page-heading"><span class="tf-kicker">ABOUT TRAILFUSION AI</span><h1>好奇心から、<br><span class="tf-accent">使いたくなるものを。</span></h1><p class="tf-lead">学ぶこと。旅すること。自分の手でつくること。TrailFusion AIは、日々の関心や実体験からアプリとコンテンツをつくる、個人開発のスタジオです。</p></div><article class="tf-read"><h2>いま、力を注いでいること。</h2><p>合格クエストシリーズを中心に、クイズや解説を通じて知識を確かめる学習アプリを開発しています。中学受験の理科・社会・国語に加え、英語や日本語の学習にも取り組んでいます。</p><h2>旅とものづくりは、もう一つの原点。</h2><p>ハイエースで日本を巡る経験から生まれた車旅コンシェルジュ。キャンピングカーの間取りやDIY、愛車の仕組みを知る整備コンテンツも、このサイトの大切な柱です。</p><p><a href="/travel/story.html">車旅から始まったストーリーを読む →</a></p><h2>内容を、確かめながら改善する。</h2><p>掲載内容やアプリの問題に気になる点があれば、該当するページや単元とともにお知らせください。ご利用者からの声をもとに、問題や解説、使い勝手の改善を続けていきます。</p><h2>運営・お問い合わせ</h2><p>運営：TrailFusion AI<br>お問い合わせ：<a href="mailto:trailfusionai@gmail.com">trailfusionai@gmail.com</a></p><p>アプリのサポート、コンテンツの訂正、掲載についてのお問い合わせは、サポートページをご確認ください。</p><div class="tf-actions">'+button('/support/','サポートへ')+'</div></article></div>'
    page('about/index.html','TrailFusion AIについて | 学習アプリと車旅・DIY','合格クエストを中心に、車旅コンシェルジュ、キャンピングカーDIY、ハイエース整備のコンテンツをつくるTrailFusion AIの運営案内。',body,'all')
    policies=[]
    for a in APPS+ [{'name':'合格！英語クエスト','policy':'eigo-quest-privacy.html','terms':'eigo-quest-terms.html','support':''},{'name':'車旅コンシェルジュ','policy':'car-concierge-privacy.html','terms':'car-concierge-terms.html','support':''},{'name':'Reel Make','policy':'reelmake-privacy.html','terms':'reelmake-terms.html','support':'reelmake-support.html'},{'name':'にほんごクエスト','policy':'nihongo-quest-privacy.html','terms':'nihongo-quest-terms.html','support':'nihongo-quest-support.html'},{'name':'BuddyTalk','policy':'buddytalk-privacy.html','terms':'buddytalk-terms.html','support':'buddytalk-legal.html'}]:
        links=[]
        for field,label in [('policy','プライバシー'),('terms','利用規約'),('support','個別サポート')]:
            if a.get(field) and (ROOT/a[field]).is_file():links.append('<a href="/'+a[field]+'">'+label+'</a>')
        policies.append('<tr><th scope="row">'+a['name']+'</th><td>'+' ／ '.join(links)+'</td></tr>')
    body='<div class="tf-container">'+breadcrumb([('サポート',None)])+'<div class="tf-page-heading"><span class="tf-kicker">SUPPORT</span><h1>困ったときも、<br><span class="tf-accent">次の一歩が見つかるように。</span></h1><p class="tf-lead">アプリの不具合、学習問題やコンテンツへのご指摘、配信状況についてのお問い合わせを受け付けています。</p></div><article class="tf-read"><h2>アプリのお問い合わせ</h2><p>アプリ名、端末・OS、アプリのバージョン、起きたことと再現手順を添えてご連絡ください。問題の内容については、単元名や問題文、アプリ内の報告機能をご利用いただくと確認しやすくなります。</p><div class="tf-actions">'+button('mailto:trailfusionai@gmail.com?subject=TrailFusion%20AI%20%E3%82%B5%E3%83%9D%E3%83%BC%E3%83%88','メールで問い合わせる')+'</div><p class="tf-note">メールアプリが起動します。このページから直接送信されるフォームではありません。お子さまの氏名・学校名、パスワードや決済情報は送らないでください。</p><h2>購入・復元・定期購入について</h2><p>購入状態の確認や復元方法は、各アプリの案内をご確認ください。定期購入の管理は、購入したストアのアカウント設定をご利用ください。返金の可否は各ストアの条件によります。</p><h2>車旅・DIY・整備の情報について</h2><p>該当ページのURLと、気になる箇所をお知らせください。個別車両の診断や施工の安全性判断は、車両に適合する資料を持つ整備事業者にご相談ください。</p></article><section class="tf-section" id="policies"><div class="tf-section-head"><h2>アプリ別の規約・プライバシー</h2></div><div class="tf-table-scroll"><table class="tf-table"><thead><tr><th scope="col">アプリ</th><th scope="col">確認先</th></tr></thead><tbody>'+''.join(policies)+'</tbody></table></div><p class="tf-note">その他のアプリについては、各アプリの紹介ページとアプリ内の表示をご確認ください。</p></section></div>'
    page('support/index.html','サポート | 合格クエスト・車旅・各種アプリ','TrailFusion AIのアプリとサイトの問い合わせ窓口。合格クエスト、車旅コンシェルジュなどの利用規約とプライバシーポリシーをまとめています。',body,'all')
    old=fragment(original('apps.html')); extras=[]
    for key,name,subject,path,cat,description in [('eigo','合格！英語クエスト','英語','eigo-quest.html','learn','文法・語彙・英語資格に関連する学習。配信情報は詳細ページをご確認ください。'),('nihongo','にほんごクエスト','日本語','nihongo-quest.html','learn','日本で暮らすための日本語を、クイズと読みのサポートで学ぶ。'),('buddy','BuddyTalk','英会話','buddytalk.html','learn','英会話を日常に。AIとの会話学習を支えるアプリ。'),('travel-app','車旅コンシェルジュ','車旅','car-concierge.html','travel','泊まる場所やドライブを探し、旅を記録する車旅のアプリ。'),('reel','Reel Make','動画制作','reelmake.html','create','短い動画やリールづくりを支える、AI動画制作アプリ。'),('wood','Wood Golem','ゲーム','wood-golem.html','play','木製ゴーレムの世界を楽しむゲーム。'),('word','Word Blaster','ゲーム','word-blaster.html','play','ことばとゲームを組み合わせたWord Blaster。'),('timer','Hacking Timer','生産性','hacking-timer.html','tool','時間に集中するためのツール。開発・配信状況は紹介ページをご確認ください。')]:
        found=next((im for im in old.select('img') if name in im.get('alt','')),None)
        logo=found['src'] if found else ('assets/images/nihongo-quest/nihongo-quest-logo.png' if key=='nihongo' else None)
        src=fragment(original(path)) if path!='eigo-quest.html' else None
        apple=next((x['href'] for x in src.select('a[href]') if 'apps.apple.com' in x['href']),None) if src else None
        extras.append(dict(id=key,name=name,subject=subject,path=path,category=cat,description=description,logo=logo,apple=apple,label=subject))
    allapps=APPS+extras
    body='<div class="tf-container">'+breadcrumb([('アプリ一覧',None)])+'<div class="tf-page-heading"><span class="tf-kicker">OUR APPLICATIONS</span><h1>日々の好奇心を、<br><span class="tf-accent">アプリに。</span></h1><p class="tf-lead">合格クエストを中心に、学ぶ・旅する・つくる・あそぶを支えるアプリを開発しています。提供中と配信案内中のアプリを掲載しています。</p></div><div class="tf-filter" data-tf-filter aria-label="アプリの分類">'+''.join('<button type="button" data-category="'+key+'" aria-pressed="'+('true' if key=='all' else 'false')+'">'+label+'</button>' for key,label in [('all','すべて'),('learn','学習'),('travel','車旅'),('create','動画制作'),('play','ゲーム'),('tool','生産性')])+'</div><p class="tf-note" data-tf-filter-status role="status">'+str(len(allapps))+'件のアプリを表示しています。</p><div id="study"></div><div id="travel"></div><div id="create"></div><div id="play"></div><div id="tool"></div><div id="shakai"></div>'+app_cards(allapps,'catalog')+'</div>'+final()
    page('apps.html','アプリ一覧 | 合格クエスト・車旅・AI動画','合格クエストを中心とするTrailFusion AIのアプリ一覧。学習、車旅、動画制作、ゲーム、生産性の分類から探せます。',body,'all')
    body='<div class="tf-container"><div class="tf-page-heading"><span class="tf-kicker">404 / NOT FOUND</span><h1>このページは、<br>見つかりませんでした。</h1><p class="tf-lead">URLが変わったか、入力が違っている可能性があります。下の入口からお探しください。</p><div class="tf-actions">'+button('/quest/','合格クエストへ')+button('/','ホームへ','secondary')+'</div></div>'+path_cards()+'</div>'
    page('404.html','ページが見つかりません', '学習アプリ、車旅、キャンピングカーDIY、ハイエース整備の入口へご案内します。',body,'all',noindex=True)
    catalog=[{k:v for k,v in a.items() if k in ['id','name','subject','path','description','category','apple','google','policy','terms']} for a in allapps]
    write('assets/data/products.json',json.dumps({'updated':DATE,'source_commit':BASE,'notes':'Store URLs retained from existing official site; no claim of current storefront availability. Pricing must be checked in the purchase screen.','products':catalog},ensure_ascii=False,indent=2)+'\n')


def preserve(path,active='all',destination=None,legal=False):
    text=original(path); soup=fragment(text)
    if not soup.html or not soup.body:return
    if soup.find('meta',attrs={'http-equiv':re.compile('refresh',re.I)}):return
    target=destination or path
    coreids={x.get('id') for x in soup.select('[id]')}
    engine={x.get('id'):digest(x.get_text().encode()) for x in soup.select('script[id]') if x.get('id','').startswith('hiace-')}
    # Relocated story retains correct source URLs; no JS engines are relocated.
    if destination:
        for tag in soup.find_all(True):
            for attr in ['href','src','poster','action']:
                val=tag.get(attr)
                if val and not val.startswith(('data:','http:','https:','mailto:','tel:','javascript:','#','/')):tag[attr]=urljoin('/',val)
        for style in soup.find_all('style'):
            content=style.string or style.get_text()
            content=re.sub(r'url\(([\"\']?)(assets/[^)\"\']+)\1\)',r'url(/\2)',content)
            style.string=content
    extra=''
    rm=soup.find(id='rm-lang');rmcta=soup.find(id='rm-nav-cta')
    if rm:extra=str(rm.extract())+(str(rmcta.extract()) if rmcta else '')
    oldhead=soup.find('tf-lp-header') or soup.select_one('.site-head') or soup.find('header')
    contenthead=None
    if legal and oldhead and oldhead.find('h1'):
        contenthead=oldhead.extract();oldhead=None
    if oldhead:
        for control in list(oldhead.select('select, #language-selector, #mobile-language-selector')):
            if control.get('id') not in ['rm-lang']:
                extra+=str(control.extract())
    oldfoot=soup.find('tf-lp-footer') or soup.find('footer')
    for thing in [oldhead,oldfoot,soup.find(id='drawer'),soup.find(id='mobile-menu'),soup.find(id='lp-site-chrome-runtime')]:
        if thing:thing.decompose()
    soup.body['class']=soup.body.get('class',[])+['tf-legal' if legal else 'tf-legacy']
    if legal:
        inner=soup.new_tag('div',attrs={'class':'tf-legal-content','id':'tf-main'})
        if contenthead:inner.append(contenthead)
        for child in list(soup.body.contents):inner.append(child.extract())
        soup.body.append(inner)
    else:
        # Keep all existing element IDs used by the interactive engines.
        anchor=soup.new_tag('div',id='tf-main');soup.body.insert(0,anchor)
    intro=header(active,extra)
    for node in reversed(list(fragment(intro).contents)):soup.body.insert(0,node)
    local={'travel':[('/travel/','車旅の入口'),('/car-concierge.html','車旅アプリ'),('/drive-routes/','ルートを探す')],'diy':[('/diy/','DIYの入口'),('/camping.html','3D間取り'),('/camping-guide.html','制作ガイド')],'care':[('/maintenance/','整備の入口'),('#studio','3Dで知る'),('#guide','整備ガイド'),('#journal','整備記録 <span id="record-count">0</span>')]}.get(active,[])
    if local:
        nav=fragment('<nav class="tf-local-links" aria-label="この分野のメニュー">'+''.join('<a href="'+u+'">'+t+'</a>' for u,t in local)+'</nav>').nav
        soup.find('header',class_='tf-header').insert_after(nav)
    for node in list(fragment(footer()).contents):soup.body.append(node)
    soup.head.append(soup.new_tag('link',rel='stylesheet',href='/assets/css/site-v2.css'))
    js=soup.new_tag('script',src='/assets/js/site-v2.js');js['defer']='';soup.head.append(js)
    title=soup.title.get_text().strip() if soup.title else path
    description=soup.find('meta',attrs={'name':'description'})
    description=description.get('content','') if description else title+'。TrailFusion AIの公式案内と関連情報。'
    if destination:
        title='車旅から始まった物語 | TrailFusion AI';description='ハイエースで日本を巡る経験から生まれた、車旅コンシェルジュとTrailFusion AIの原点。'
    metadata(soup,target,title,description,active)
    # Externalize HTML-embedded raster images. Leave script/model payloads byte-identical.
    for im in soup.select('img'):
        source=im.get('src','')
        if source.startswith('data:image/') and ';base64,' in source:
            try:im['src']=image(source,160 if any(w in im.get('alt','') for w in ['アイコン','ロゴ','TrailFusion']) else 1400)
            except (ValueError,OSError):continue
        if im.get('src','').startswith('/assets/media/'):
            with Image.open(ROOT/im['src'].lstrip('/')) as pic:im['width'],im['height']=pic.size
        if not im.get('loading') and not legal:im['loading']='lazy'
        if 'alt' not in im.attrs:im['alt']=''
        im['decoding']='async'
    if path=='car-concierge.html':
        for a in soup.select('a[href]'):
            if 'apps.apple.com' in a['href']:a['data-store']='apple';a['data-app']='travel-app'
    for legacy_script in soup.find_all('script'):
        code=legacy_script.string
        if code and "document.getElementById('year').textContent = new Date().getFullYear();" in code:
            legacy_script.string=code.replace("document.getElementById('year').textContent = new Date().getFullYear();", "document.addEventListener('DOMContentLoaded',function(){var year=document.getElementById('year');if(year)year.textContent=new Date().getFullYear();});")
    remaining={x.get('id') for x in soup.select('[id]')}
    removed=sorted(coreids-remaining)
    for scriptid,sha in engine.items():
        assert soup.find(id=scriptid) and digest(soup.find(id=scriptid).get_text().encode())==sha,scriptid
    PRESERVED[target]={'source':path,'source_bytes':len(text.encode()),'removed_ids':removed,'unchanged_engine_sha256':engine}
    write(target,str(soup))


def build_preserved():
    rootfiles=git('ls-tree','--name-only',BASE).decode().splitlines()
    new={'index.html','apps.html','rika-quest.html','social-quest.html','kokugo-quest.html','eigo-quest.html','404.html'}
    preserve('index.html','travel','travel/story.html')
    for path in rootfiles:
        if not path.endswith('.html') or path in new or path=='demo-tiktok-integration.html':continue
        legal=any(w in path for w in ['privacy','terms','legal','support'])
        active='care' if path=='maintenance.html' else 'diy' if path in ['camping.html','camping-guide.html'] else 'travel' if path=='car-concierge.html' else 'learn' if any(x in path for x in ['rika-','social-','shakai-','kokugo-','eigo-','nihongo-']) else 'all'
        preserve(path,active,legal=legal)
    # Keep map controls and exact viewport layout; add navigation within its existing About dialog.
    p='drive-routes/index.html';s=fragment(original(p));dialog=s.find(id='aboutDialog')
    if dialog:
        nav=fragment('<nav aria-label="関連コンテンツ" style="display:flex;flex-wrap:wrap;gap:14px;margin:20px 0"><a href="/travel/">車旅の入口</a><a href="/diy/">キャンピングカーDIY</a><a href="/maintenance/">ハイエース整備</a><a href="/quest/">合格クエスト</a></nav>').nav;dialog.append(nav)
    home=s.select_one('.logo')
    if home and home.name=='a':home['href']='/travel/'
    for navlink in s.select('.topbar a.ghost-btn'):
        if navlink.get('href')=='../index.html':navlink['href']='/travel/';navlink.string='← 車旅トップ'
    metadata(s,p,'絶景ロード図鑑 | 車旅のドライブルート | TrailFusion AI','地域やテーマから日本のドライブルートを探すインタラクティブな地図。車旅コンシェルジュやDIY・整備のコンテンツも紹介します。','travel')
    write(p,str(s))


def og_images():
    folder=ROOT/'assets/og';folder.mkdir(parents=True,exist_ok=True)
    for key in ['learn','travel','diy','care','rika','social','kokugo']:
        canvas=Image.new('RGB',(1200,630),'#edf3fa');d=ImageDraw.Draw(canvas)
        fontpath='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';font=ImageFont.truetype(fontpath,60);small=ImageFont.truetype(fontpath,26)
        d.rectangle((0,0,28,630),fill='#145cdb');d.text((70,70),'TrailFusion AI',font=small,fill='#536672')
        words={'learn':['GOKAKU','QUEST'],'travel':['TRAVEL,','YOUR WAY.'],'diy':['BUILD','YOUR VAN.'],'care':['KNOW','YOUR HIACE.'],'rika':['SCIENCE','QUEST'],'social':['SOCIAL','QUEST'],'kokugo':['JAPANESE','QUEST']}[key]
        for i,w in enumerate(words):d.text((66,200+i*85),w,font=font,fill='#172b3a')
        d.text((70,540),'LEARN / TRAVEL / DIY / MAINTENANCE',font=ImageFont.truetype(fontpath,17),fill='#536672')
        if key in ['learn','rika','social','kokugo']:
            for i,a in enumerate(APPS if key=='learn' else [a for a in APPS if a['id']==key]):
                pic=Image.open(ROOT/image(a['logo'],200).lstrip('/')).convert('RGBA');pic=ImageOps.contain(pic,(158,158));canvas.paste(pic,(720+(i%2)*180,100+(i//2)*210),pic)
        else:
            pic=Image.open(ROOT/image(PHOTOS[key],1200).lstrip('/')).convert('RGB');pic=ImageOps.fit(pic,(510,630));canvas.paste(pic,(690,0))
        canvas.save(folder/('site-v2-'+key+'.jpg'),quality=90,optimize=True)


def machine_files():
    # Training/search choices already present in robots.txt are preserved.
    robots=original('robots.txt').replace('Disallow: /maintenance.html','Allow: /maintenance.html')
    write('robots.txt',robots)
    paths=sorted(set(CHANGED))
    excluded={'404.html'}
    urls=['/'+p.removesuffix('index.html') for p in paths if p.endswith('.html') and p not in excluded]
    # Keep legacy sitemap URLs even if their files are intentionally unchanged.
    old=ET.fromstring(original('sitemap.xml'));ns={'s':'http://www.sitemaps.org/schemas/sitemap/0.9'}
    olddates={n.find('s:loc',ns).text:n.find('s:lastmod',ns).text if n.find('s:lastmod',ns) is not None else '' for n in old.findall('s:url',ns)}
    urls=sorted(set([DOMAIN+u for u in urls]+list(olddates)))
    lines=['<?xml version="1.0" encoding="UTF-8"?>','<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u in urls:
        modified=DATE if u in {DOMAIN+'/'+p.removesuffix('index.html') for p in paths if p.endswith('.html')} else olddates.get(u,DATE)
        lines.append('  <url><loc>'+esc(u)+'</loc><lastmod>'+modified+'</lastmod></url>')
    lines.append('</urlset>');write('sitemap.xml','\n'.join(lines)+'\n')
    write('sitemap-index.xml','<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>'+DOMAIN+'/sitemap.xml</loc></sitemap></sitemapindex>\n')
    text='# TrailFusion AI\n\n> Official site for the Gokaku Quest learning-app series, car travel, camper DIY and Hiace educational maintenance content.\n\nUpdated: '+DATE+'\n\n## Primary learning series\n'
    for a in APPS:text+='- ['+a['name']+']('+DOMAIN+'/'+a['path']+'): '+a['description']+' App Store: '+a['apple']+'; Google Play: '+a['google']+'\n'
    text+='- [合格！英語クエスト]('+DOMAIN+'/eigo-quest.html): English vocabulary, grammar and qualification-related study. Separate from the Japanese junior-high entrance-exam subjects. Verified store URLs are not yet listed on this website.\n'
    text+='\n## Site sections\n'
    for title,path in [('合格クエスト','/quest/'),('保護者の方へ','/parents/'),('学習ガイド','/study/'),('車旅','/travel/'),('車旅コンシェルジュ','/car-concierge.html'),('絶景ロード図鑑','/drive-routes/'),('キャンピングカーDIY','/diy/'),('3D間取り','/camping.html'),('DIY制作ガイド','/camping-guide.html'),('ハイエース整備','/maintenance/'),('3D部品解説と整備記録','/maintenance.html'),('アプリ一覧','/apps.html'),('運営者','/about/'),('問い合わせ・アプリ別ポリシー','/support/')]:text+='- ['+title+']('+DOMAIN+path+')\n'
    text+='\n## Interpretation and source boundaries\n- Free download does not mean all content is free. Check the actual purchase screen for current prices and subscription conditions.\n- No admission, learning outcome, ranking or availability guarantees. In-app deviation scores are not school entrance-exam predictions.\n- 3D vehicle models are educational approximations, not official service data. Consult the correct service manual and a qualified professional before work.\n- Maintenance records stay in browser local storage; export for backup.\n- Contact: trailfusionai@gmail.com\n- This optional document is a factual index, not a directive to ranking or AI systems.\n'
    write('llms.txt',text)
    full=text+'\n## Readable page summaries\n'
    for p in ['index.html','quest/index.html','parents/index.html','travel/index.html','diy/index.html','maintenance/index.html']:
        s=fragment((ROOT/p).read_text());main=s.find('main');full+='\n### '+DOMAIN+'/'+p.removesuffix('index.html')+'\n'+main.get_text(' ',strip=True)+'\n'
    write('llms-full.txt',full)


def docs():
    write('docs/ROLLBACK-SITE-20260916.md','# 復元手順\n\n## 保存済みの改修前状態\n- Backup branch: `backup/pre-site-restructure-20260915`\n- Commit: `'+BASE+'`\n\nmasterへの公開は改修内容を一つにまとめたコミットで行います。公開コミットを取り消すと、元のページ内容へ戻り、旧自動上書き処理の停止は維持されます。公開コミットを取り消す場合は、履歴を書き換えるforce pushではなく、次の方法を使用してください。\n\n```sh\ngit fetch origin\ngit switch master\ngit pull --ff-only origin master\ngit revert <この改修の公開コミットSHA>\ngit push origin master\n```\n\n公開後に追加変更がある場合は、競合内容を確認してからrevertを完了してください。バックアップブランチは改修しないでください。ローカルの整備記録はGit管理の対象ではありません。ブラウザの記録書き出しで別途バックアップしてください。\n')
    write('docs/SITE-REDESIGN-20260916.md','# サイト再構成と運用\n\n## 構成\n合格クエストをトップの主役にしつつ、学ぶ・旅する・つくる・整えるの4入口を常設。既存の商品・3D間取り・DIY記事・整備記録・地図のURLは維持。学習の3教科と英語・資格学習は用途を区別。\n\n## 生成（初回移行専用）\n通常の更新はコミット済みのHTML・CSS・JSを編集し、検証だけを実行してください。移行用スクリプトは過去の内容を基準にするため、自動デプロイや通常の修正時には再実行しません。\n\n`python scripts/site-redesign/build.py --rebuild-from-backup`。基準コミット `'+BASE+'` の原文から旧ページを再構成するため冪等です。今後旧コンテンツを更新するときは、元ページを参照する方式を見直して新しい編集を上書きしないこと。直接編集するページと生成ページを混在運用しないでください。\n\n## 保持対象\nキャンピングカー3Dのhiace-*スクリプト、整備アプリのJS/ローカルストレージ、地図アプリの操作・データを保持。契約・プライバシー本文は変更せず周辺UIだけ更新。中学受験の3LPは日本語の静的ページとして再構築。既存の英語などのアプリ内機能を変更するものではありません。旧3LPのページ翻訳UIは新しい日本語中心の構成には移植していません。\n\n## SEO / AI検索\n静的HTMLの説明、カテゴリ内リンク、canonical、OG、BreadcrumbList、実内容と一致する構造化データを整備。robotsの既存AI検索/学習クローラー許可方針は保持し、整備ページの一律拒否を解除。llms.txt/llms-full.txtは補助索引であり表示・引用・順位の保証ではありません。\n\n## ASOとの境界\nウェブ側の商品名・説明・実画面・ストアリンク・Smart App Bannerを整備。App Store Connect / Google Play Consoleの名称、サブタイトル、キーワード、ストアスクリーンショット、カスタムプロダクトページは変更していません。確認できていない英語クエストのストアURL、評価・DL数・問題数・最新価格は捏造しません。\n\n## 計測\n既存GA4 IDを使用。`store_click`（app_id/store/placement/page_path）、`app_detail_click`、`hub_navigation`を送信。選択ガイドの回答や学年、氏名は送信しない。ストアクリックはインストール・課金の計測ではありません。AppleのキャンペーントークンはApp Store Connectで取得し、実際のプロバイダートークンを設定する必要があります。\n\n## 次のストア運用\n実際のストア情報で対象・料金・画像を揃える。公式のプロダクトページ最適化で画像やコピーを検証。インストール後の継続・課金と合わせて評価する。自動で順位が上がるとは考えない。\n\n## 一次資料\n- https://developers.google.com/search/docs/appearance/ai-features\n- https://developer.apple.com/app-store/product-page/\n- https://developer.apple.com/jp/help/app-store-connect-analytics/acquisition/campaign-links\n- https://developers.openai.com/api/docs/bots\n')

write('assets/icons/trailfusion.svg','<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="18" fill="#172b3a"/><path d="M12 19h25v5H27v24h-5V24H12zm27 0h17v5H44v8h10v5H44v11h-5z" fill="white"/></svg>')
build_new();build_preserved();og_images();machine_files();docs()
report={'base_commit':BASE,'date':DATE,'changed_pages':sorted(set(p for p in CHANGED if p.endswith('.html'))),'new_media_count':len(set(MEDIA.values())),'preservation':PRESERVED,'page_bytes':{p:(ROOT/p).stat().st_size for p in sorted(set(CHANGED)) if p.endswith('.html')}}
write('docs/site-redesign-manifest.json',json.dumps(report,ensure_ascii=False,indent=2)+'\n')
(OUT/'build-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
# Attach generated text for inspection, without republishing original source snapshots.
for p in sorted(set(CHANGED)):
    dest=OUT/'generated'/p;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes((ROOT/p).read_bytes())
print(json.dumps({k:v for k,v in report.items() if k!='preservation'},ensure_ascii=False,indent=2))
