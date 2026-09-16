"""One-time hero migration, feature branch only. Removed before publication."""
from pathlib import Path
import re,json,hashlib
from bs4 import BeautifulSoup
p=Path('index.html');original=p.read_text()
assert hashlib.sha1(b'blob '+str(len(p.read_bytes())).encode()+b'\0'+p.read_bytes()).hexdigest()=='b337f58f945f8b48d3342d5a2638da77fe4ded9d','Index changed: review instead of overwriting'
hero=Path('scripts/daylight-migration/hero.html').read_text()
new,n=re.subn(r'<section class="tf-premium-hero">[\s\S]*?</section>',hero,original,count=1)
assert n==1
new=new.replace('<section class="tf-section white tf-home-intro">','<section class="tf-section white tf-home-intro" id="explore">')
new=new.replace('ひと目でわかる、4つの入口。','今日の「やってみたい」は？')
new=new.replace('TrailFusion AI は、学習アプリと家族の車旅・ものづくり・整備をつなぐ総合サイトです。はじめての方でも目的別に進めるよう、4つの入口をわかりやすく整理しています。','一問解いてみる。次の旅先を探す。理想の一台を思い描く。気になるところから、あなたのペースで。')
new=new.replace('<link href="/assets/css/home-premium.css" rel="stylesheet"/>','<link href="/assets/css/home-premium.css" rel="stylesheet"/><link href="/assets/css/home-daylight.css?v=20260916-1" rel="stylesheet"/>')
s=BeautifulSoup(new,'html.parser');tag=s.find('script',type='application/ld+json');oldld=tag.string;ld=json.loads(oldld)
for item in ld['@graph']:
    if item.get('@type')=='WebPage':item['headline']='学びも、旅も、DIYも、車旅も。'
    if item.get('@type')=='FAQPage':item['mainEntity']=[{'@type':'Question','name':x.summary.get_text(' ',strip=True),'acceptedAnswer':{'@type':'Answer','text':x.p.get_text(' ',strip=True)}} for x in s.select('.tf-faq-item')]
new=new.replace(oldld,json.dumps(ld,ensure_ascii=False,separators=(',',':')))
new=new.replace('学び・車旅・キャンパーDIY・ハイエース整備を表現したTrailFusion AIのメインビジュアル','TrailFusion AIの合格クエストシリーズ紹介画像')
p.write_text(new)
llm=Path('llms-full.txt');txt=llm.read_text();s=BeautifulSoup(new,'html.parser');summary=s.find('main').get_text(' ',strip=True)
txt,n=re.subn(r'(## Homepage readable summary\n\n)[\s\S]*?(\n\n## Content intent)',lambda m:m.group(1)+summary+m.group(2),txt,count=1)
assert n==1
llm.write_text(txt)
assert s.h1.get_text()=='学びも、旅も、DIYも、車旅も。'
print('Daylight hero migrated; logo, direct navigation, other pages and 3D modules preserved.')
