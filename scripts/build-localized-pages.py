#!/usr/bin/env python3
"""Build fully translated static pages. No network access or translation service."""
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit, urljoin, urlencode, parse_qsl
from html.parser import HTMLParser
from html import unescape, escape
import json, re
ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://trailfusionai.com'
LANGS = [('ja','日本語',''),('en','English','en'),('zh-Hans','简体中文','zh-hans'),('ko','한국어','ko'),('es','Español','es'),('pt-BR','Português (Brasil)','pt-br'),('fr','Français','fr'),('de','Deutsch','de'),('it','Italiano','it'),('ru','Русский','ru'),('tr','Türkçe','tr'),('vi','Tiếng Việt','vi'),('th','ไทย','th'),('hi','हिन्दी','hi'),('ar','العربية','ar')]
PAGES = ['apps.html','diy/index.html','maintenance/index.html','travel/index.html']
JP = re.compile(r'[\u3041-\u3096\u30a1-\u30fa\u30fc\u3400-\u9fff]')
BLOCK = re.compile(r'(<script\b[^>]*>.*?</script\s*>|<style\b[^>]*>.*?</style\s*>)',re.S|re.I)
ATTR = re.compile(r'\b([\w:-]+)\s*=\s*([\"\'])(.*?)\2',re.S)
def norm(s): return ' '.join(unescape(s).split())
def visible_path(p): return '/'+p.replace('index.html','') if p.endswith('/index.html') else '/'+p
ROUTES = [visible_path(p) for p in PAGES]
def page_url(src,slug): return ('/'+slug if slug else '')+visible_path(src)
def catalog(lang): return json.loads((ROOT/f'assets/i18n/apps/{lang}.json').read_text())
def tr(s,d): return d.get(norm(s),norm(s))
def translate_text(s,d):
    if not s.strip(): return s
    key=norm(s)
    return re.match(r'^\s*',s)[0]+escape(d[key],quote=False)+re.search(r'\s*$',s)[0] if key in d else s

def link_target(value,lang,slug,source):
    if not value or value.startswith(('#','data:','mailto:','tel:','javascript:')): return value
    u=urlsplit(urljoin(BASE+'/'+source,value))
    if u.netloc!='trailfusionai.com': return value
    path=u.path;query=dict(parse_qsl(u.query,keep_blank_values=True))
    if path in ('/index.html','/'):
        path='/'+slug+'/' if slug else '/'
    elif path in ROUTES:
        path=('/'+slug if slug else '')+path
    elif path.endswith('.html') or (path.endswith('/') and not path.startswith('/assets/')):
        if lang!='ja': query['lang']=lang
    return urlunsplit(('', '', path, urlencode(query), u.fragment))

def app_descriptions(source):
    result={}
    for block in re.findall(r'<article\b.*?</article>',source,re.S):
        p=re.search(r'<p class="adesc">(.*?)</p>',block,re.S)
        a=re.search(r'<a class="amore" href="([^"]+)"',block)
        if p and a:result[urljoin(BASE+'/',a[1])]=norm(re.sub('<[^>]+>','',p[1]))
    p=re.search(r'<p class="desc">(.*?)</p>',source,re.S)
    if p: result[BASE+'/car-concierge.html']=norm(re.sub('<[^>]+>','',p[1]))
    return result

def schema_translate(value,d,lang,slug,src,descriptions):
    if isinstance(value,list):return [schema_translate(v,d,lang,slug,src,descriptions) for v in value]
    if not isinstance(value,dict):return tr(value,d) if isinstance(value,str) else value
    out={k:schema_translate(v,d,lang,slug,src,descriptions) for k,v in value.items()}
    typ=out.get('@type')
    if 'inLanguage' in out:out['inLanguage']=lang
    if typ in ('WebPage','CollectionPage'):
        out['url']=BASE+page_url(src,slug)
        if '@id' in out:out['@id']=out['url']+('#webpage' if typ=='WebPage' else '#collection')
        if src=='apps.html':
            out['name']=tr('アプリ一覧',d)+' — TrailFusion AI'
            out['description']=tr('TrailFusion AI が開発した10のアプリ。車旅コンシェルジュ、合格！社会・理科・国語クエスト、Reel Make、BuddyTalk ほか。すべて無料ではじめられます。',d)
    if typ=='MobileApplication' and out.get('url') in descriptions:
        out['description']=tr(descriptions[out['url']],d)
    if typ=='Organization' and lang!='ja':out.pop('alternateName',None)
    if typ=='ListItem' and isinstance(out.get('item'),str):out['item']=BASE+link_target(out['item'],lang,slug,src)
    return out

def strip_generated(s):
    s=re.sub(r'<!-- tf-localized:start -->.*?<!-- tf-localized:end -->','',s,flags=re.S)
    return re.sub(r'<html\b[^>]*>','<html lang="ja">',s,count=1)

def render(source,lang,slug,src):
    d=catalog(lang);desc=app_descriptions(source);out=[]
    if src != "apps.html" and lang != "ja":
        home=json.loads((ROOT/f"assets/i18n/home/{lang}.json").read_text())
        for key in ("整える","つくる"):
            if key in home: d[key]=home[key]
    for part in BLOCK.split(source):
        if re.match(r'<style\b',part,re.I):out.append(part);continue
        if re.match(r'<script\b',part,re.I):
            if re.search(r'type=[\"\']application/ld\+json',part):
                raw=re.search(r'>(.*)</script',part,re.S)[1]
                obj=schema_translate(json.loads(raw),d,lang,slug,src,desc)
                part='<script type="application/ld+json">'+json.dumps(obj,ensure_ascii=False).replace('</','<\\/')+'</script>'
            else:
                for s in ('メニューを開く','メニューを閉じる'):
                    part=part.replace("'"+s+"'",json.dumps(tr(s,d),ensure_ascii=False)).replace('"'+s+'"',json.dumps(tr(s,d),ensure_ascii=False))
            out.append(part);continue
        for token in re.split(r'(<[^>]+>)',part):
            if not token.startswith('<'):out.append(translate_text(token,d));continue
            def att(m):
                key,quote,value=m.groups();v=unescape(value)
                if key in ('alt','aria-label','title','placeholder') or (key=='content' and token.lower().startswith('<meta')):v=tr(v,d)
                elif key in ('href','src','poster'):
                    if token.lower().startswith('<a') and key=='href':v=link_target(v,lang,slug,src)
                    elif not urlsplit(v).scheme and not v.startswith(('/', '#')):v=urlsplit(urljoin(BASE+'/'+src,v)).path
                return key+'='+quote+escape(v,quote=True)+quote
            out.append(ATTR.sub(att,token))
    s=''.join(out)
    if lang not in ('ja','zh-Hans'):
        s=re.sub(r'(</(?:b|strong|span)>)(?=[^<\s])',r'\1 ',s)
        s=re.sub(r'(?<=\S)(?=<(?:b|strong)\b)',' ',s)
    s=re.sub(r'<html\b[^>]*>',f'<html lang="{lang}" dir="{"rtl" if lang=="ar" else "ltr"}">',s,count=1)
    s=re.sub(r'<link\b(?=[^>]*rel=[\"\']canonical[\"\'])[^>]*>',f'<link rel="canonical" href="{BASE+page_url(src,slug)}">',s,flags=re.I)
    s=re.sub(r'<meta\b(?=[^>]*(?:property|name)=[\"\']og:url[\"\'])[^>]*>',f'<meta property="og:url" content="{BASE+page_url(src,slug)}">',s,flags=re.I)
    og_locale={'ja':'ja_JP','en':'en_US','zh-Hans':'zh_CN','ko':'ko_KR','es':'es_ES','pt-BR':'pt_BR','fr':'fr_FR','de':'de_DE','it':'it_IT','ru':'ru_RU','tr':'tr_TR','vi':'vi_VN','th':'th_TH','hi':'hi_IN','ar':'ar_SA'}[lang]
    s=re.sub(r'<meta\b(?=[^>]*(?:property|name)=[\"\']og:locale[\"\'])[^>]*>',f'<meta property="og:locale" content="{og_locale}">',s,flags=re.I)
    alternates=''.join(f'<link rel="alternate" hreflang="{code}" href="{BASE+page_url(src,sl)}">' for code,_,sl in LANGS)
    alternates+=f'<link rel="alternate" hreflang="x-default" href="{BASE+page_url(src,"")}">'
    config={'locale':lang,'source':visible_path(src),'published':ROUTES,'languages':LANGS,'automatic':d.get('_auto','自動'),'label':d.get('_language','言語')}
    config_tag='<script type="application/json" id="tf-locale-config">'+json.dumps(config,ensure_ascii=False).replace('</','<\\/')+'</script>'
    additions='<!-- tf-localized:start -->'+alternates+'<link rel="stylesheet" href="/assets/css/localized-pages.css?v=20260926-1">'+config_tag+'<!-- tf-localized:end -->'
    return s.replace('</head>',additions+'</head>',1)

class Check(HTMLParser):
    def __init__(self):super().__init__(convert_charrefs=True);self.skip=0;self.strings=[]
    def handle_starttag(self,t,attrs):
        if t in ('script','style'):self.skip+=1
        for k,v in attrs:
            if v and k in ('alt','aria-label','title','placeholder'):self.strings.append(v)
            if t=='meta' and k=='content':self.strings.append(v or '')
    def handle_endtag(self,t):
        if t in ('script','style') and self.skip:self.skip-=1
    def handle_data(self,s):
        if not self.skip and s.strip():self.strings.append(norm(s))

def main():
    report={};outputs=[]
    for src in PAGES:
        source=strip_generated((ROOT/src).read_text())
        for lang,_,slug in LANGS:
            html=render(source,lang,slug,src);check=Check();check.feed(html)
            left=sorted(set(s for s in check.strings if JP.search(s))) if lang not in ('ja','zh-Hans') else []
            if lang=='zh-Hans':left=sorted(set(s for s in check.strings if re.search(r'[\u3041-\u3096\u30a1-\u30fa\u30fc]',s)))
            if left:raise SystemExit(f'Untranslated content in {lang}/{src}: '+json.dumps(left,ensure_ascii=False))
            for block in re.findall(r'<script type="application/ld\+json">(.*?)</script>',html,re.S):json.loads(block)
            path=ROOT/slug/src if slug else ROOT/src
            outputs.append((path,html));report[str(path.relative_to(ROOT))]={'locale':lang,'text_and_attribute_segments':len(check.strings),'untranslated_japanese':0,'html_bytes':len(html.encode())}
    for path,html in outputs:path.parent.mkdir(parents=True,exist_ok=True);path.write_text(html)
    dst=ROOT/'reports/localization-build.json';dst.parent.mkdir(exist_ok=True)
    dst.write_text(json.dumps({'method':'ChatGPT-authored static translations; no translation API','pages':report},ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'pages_built':len(outputs),'validation':'PASS','pages':list(report)},ensure_ascii=False))
if __name__=='__main__':main()
