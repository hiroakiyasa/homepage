"""Release gate for complete static global marketing pages. Standard library only."""
import html, json, re, sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

ROOT=Path(__file__).resolve().parents[2]
BASE='https://trailfusionai.com'
EXPECTED={'ar','ca','hr','cs','da','nl','en','fi','fr','de','el','he','hi','hu','id','it','ja','ko','ms','nb','pl','pt','ro','ru','zh-Hans','sk','es','sv','th','zh-Hant','tr','uk','vi','ne','fil'}
manifest=json.loads((ROOT/'docs/brand/global-locales.json').read_text())
info={row['code']:row for row in manifest['languages']}
pages=manifest['pages']
errors=[]

def check(ok,message):
    if not ok: errors.append(message)

def route(code,page):
    if code=='ja': return manifest['japanese_paths'][page]
    return '/'+info[code]['slug']+'/'+('' if page=='index.html' else page)

def file_for(url):
    path=ROOT/urlsplit(url).path.lstrip('/')
    return path/'index.html' if path.is_dir() or str(url).endswith('/') else path

class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.lang=None; self.direction=None; self.canonical=[]; self.alternates={}; self.h1=0
        self.config=None; self.ld=[]; self._script=None; self._buffer=''; self.links=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='html': self.lang=a.get('lang'); self.direction=a.get('dir')
        if tag=='h1': self.h1+=1
        if tag=='link' and a.get('rel')=='canonical': self.canonical.append(a.get('href'))
        if tag=='link' and a.get('rel')=='alternate' and a.get('hreflang'):
            key=a['hreflang']
            if key in self.alternates: errors.append('duplicate hreflang '+key)
            self.alternates[key]=a.get('href')
        if tag=='a': self.links.append(a)
        if tag=='script':
            if a.get('id')=='tf-global-locale': self._script='config'
            elif a.get('type')=='application/ld+json': self._script='ld'
            else: self._script=None
            self._buffer=''
    def handle_data(self,data):
        if self._script: self._buffer+=data
    def handle_endtag(self,tag):
        if tag=='script' and self._script:
            try:
                value=json.loads(self._buffer)
                if self._script=='config': self.config=value
                else: self.ld.append(value)
            except ValueError as exc: errors.append('invalid locale/schema JSON '+str(exc))
            self._script=None

check(set(info)==EXPECTED,'manifest must contain the 35 supported website languages')
check(len(pages)==10,'manifest must contain the 10 global marketing page types')
expected={route(code,page) for code in info if code!='ja' for page in pages}
check(set(manifest['generated'])==expected,'all 340 translated/static global URLs must be generated before release')
source=json.loads((ROOT/'scripts/brand/locales/en.json').read_text())
headings=json.loads((ROOT/'scripts/brand/locales/headings.en.json').read_text())
check(len(source)==manifest['body_keys'] and len(headings)==manifest['heading_keys'],'source key count differs from generated manifest')
for code in sorted(EXPECTED-{'ja'}):
    for prefix,original in [('',source),('headings.',headings)]:
        path=ROOT/'scripts/brand/locales'/(prefix+code+'.json')
        if not path.is_file():
            errors.append('missing translation '+str(path.relative_to(ROOT)));continue
        data=json.loads(path.read_text())
        check(set(data)==set(original),code+' '+prefix+'missing/extra translation keys')
        for key,value in data.items():
            check(isinstance(value,str) and bool(value.strip()),code+' '+prefix+key+' empty translation')
            if key in original and isinstance(value,str):
                check(re.findall(r'\{[^{}]+\}',value)==re.findall(r'\{[^{}]+\}',original[key]),code+' '+prefix+key+' placeholder mismatch')
                if code!='en' and len(original[key])>55:
                    check(value!=original[key],code+' '+prefix+key+' untranslated English sentence')
    for page in pages:
        relative=route(code,page)
        path=file_for(relative)
        if not path.is_file():
            errors.append('missing global page '+relative);continue
        text=path.read_text()
        parsed=Page();parsed.feed(text)
        check(parsed.lang==code,relative+' wrong html lang')
        check(parsed.direction==('rtl' if code in ('ar','he') else 'ltr'),relative+' wrong text direction')
        check(parsed.h1==1,relative+' needs exactly one h1')
        check(parsed.canonical==[BASE+relative],relative+' wrong canonical')
        expected_alternates={info[key]['hreflang']:BASE+route(key,page) for key in info}
        expected_alternates['x-default']=BASE+(manifest['japanese_paths'][page] if page in ('index.html','apps.html') else route('en',page))
        check(parsed.alternates==expected_alternates,relative+' incomplete/wrong hreflang alternates')
        check(bool(parsed.config) and parsed.config.get('locale')==code,relative+' missing/wrong locale config')
        if parsed.config:
            check(parsed.config.get('entry') is False,relative+' explicit locale must not auto-redirect')
            check(parsed.config.get('routes')=={key:route(key,page) for key in info},relative+' wrong language switch targets')
            check(all(parsed.config.get('counter',{}).get(k) for k in ('title','alt','unavailable')),relative+' untranslated runtime counter labels')
        language_links={a.get('data-global-language'):a.get('href') for a in parsed.links if a.get('data-global-language')!='auto' and a.get('data-global-language')}
        check(language_links=={key:route(key,page)+('?lang=ja' if key=='ja' else '') for key in info},relative+' language choices need ordinary working links')
        check('6782028599' not in text,relative+' still promotes standalone English Quest')
        check('com.reelapp.maker' not in text,relative+' still has unavailable Reel Make Android link')
        check(not re.search(r'junior-(?:science|social|math)',text),relative+' domestic-subject image remains')
        for a in parsed.links:
            href=a.get('href','')
            check(not re.search(r'/en/(?:fp-quest|rika-quest|kokugo-quest)|/quest/juken/',href),relative+' domestic-subject route remains')
            if a.get('data-store')=='apple':
                check('/jp/' not in href,relative+' store link fixed to Japan')
        if page in ('japanese-quest.html','eigo-quest.html'):
            stores=[a for a in parsed.links if a.get('data-store')]
            check(any('id6775411516' in a.get('href','') for a in stores),relative+' missing integrated Gokaku Quest download')
            check(all(a.get('data-app')=='quest' for a in stores),relative+' language course uses another product download')
        if page in ('index.html','apps.html'):
            graph=[node for block in parsed.ld for node in block.get('@graph',[]) if node.get('@type')=='MobileApplication']
            quest=[node for node in graph if 'id6775411516' in node.get('downloadUrl','')]
            check(len(graph)==7 and len(quest)==1,relative+' app schema must count Gokaku Quest only once')
            if quest: check(len(quest[0].get('hasPart',[]))==2,relative+' integrated app must show both language courses')
        if code!='en':
            # Check the rendered document as well as dictionary completeness.
            for key,value in source.items():
                if len(value)>75 and (html.escape(value,quote=False) in text or value in text):
                    errors.append(relative+' contains unlocalized source sentence '+key)
                    break

for page in pages:
    text=file_for(manifest['japanese_paths'][page]).read_text()
    parsed=Page();parsed.feed(text)
    check(parsed.lang=='ja',page+' Japanese body language changed')
    if page in ('index.html','apps.html'):
        check(parsed.config and parsed.config.get('entry') is True,page+' missing automatic entry navigation')
    expected_alternates={info[key]['hreflang']:BASE+route(key,page) for key in info}
    expected_alternates['x-default']=BASE+(manifest['japanese_paths'][page] if page in ('index.html','apps.html') else route('en',page))
    check(parsed.alternates==expected_alternates,page+' Japanese alternates incomplete or inconsistent')

for relative in ('index.html','apps.html','eigo-quest.html'):
    check('6782028599' not in (ROOT/relative).read_text(),relative+' still acquires for standalone English Quest')
legacy=(ROOT/'eigo-quest.html').read_text()
check('noindex' in legacy and 'url=/quest/courses/english/' in legacy,'legacy English URL must preserve its integrated course destination')

for relative in ('index.html','apps.html','reelmake.html'):
    check('com.reelapp.maker' not in (ROOT/relative).read_text(),relative+' still has unavailable Reel Make Android link')

if errors:
    print('\n'.join(errors));sys.exit(1)
print(f'global static checks passed (35 website languages, 340 complete pages, {len(source)} body + {len(headings)} whole-heading keys per translation)')
