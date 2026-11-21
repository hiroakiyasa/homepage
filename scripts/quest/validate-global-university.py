"""Read-only preservation, accessibility and language-scope release checks."""
from pathlib import Path
from urllib.parse import urlsplit, unquote, parse_qs
import hashlib
import http.server
import json
import re
import socketserver
import subprocess
import threading
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[2]
BASE='https://trailfusionai.com'
BASE_REF='a0c38e8ce3415f32693e789bb5e893c405433844'
OUT=ROOT/'output/quest-global-university'
OUT.mkdir(parents=True,exist_ok=True)
CONFIG=json.loads((ROOT/'docs/quest/growth-release.json').read_text())
ROUTES=['/','/quest/','/quest/university/']+['/quest/university/'+c['slug']+'/' for c in CONFIG['universityCourses']]+['/quest/languages/','/en/quest/','/en/japanese-quest.html','/en/eigo-quest.html','/en/','/en/apps.html']
passed,errors=[],[]
def check(ok,label): (passed if ok else errors).append(label)
def file_for(route): return ROOT/route.lstrip('/')/ 'index.html' if route.endswith('/') else ROOT/route.lstrip('/')
def source(rel): return subprocess.check_output(['git','show',BASE_REF+':'+rel],cwd=ROOT)
def soup_for(route): return BeautifulSoup(file_for(route).read_text(),'html.parser')
def sha(value): return hashlib.sha256(value).hexdigest()
def sig(s):
    return {k:str(s.select_one(k)) for k in ('title','h1','link[rel="canonical"]')}
def graphs(s):
    for tag in s.select('script[type="application/ld+json"]'):
        data=json.loads(tag.get_text())
        yield from data.get('@graph',[data])

protected_paths=subprocess.check_output(['git','ls-tree','-r','--name-only',BASE_REF,'quest/juken','quest/rika-shakai','quest/school4','quest/courses/science','quest/courses/social','quest/courses/japanese-language','quest/courses/math','quest/faq','quest/plans'],cwd=ROOT,text=True).splitlines()
preservation=[]
for rel in protected_paths:
    before=source(rel);after=(ROOT/rel).read_bytes()
    check(before==after,'middle-school full file unchanged: '+rel)
    preservation.append({'path':rel,'mode':'byte-identical','beforeSha256':sha(before),'afterSha256':sha(after),'identical':before==after})
for route in [x for x in ROUTES if x not in ['/quest/languages/','/en/quest/']]:
    rel=file_for(route).relative_to(ROOT).as_posix()
    before=source(rel);after=file_for(route).read_bytes()
    old,new=BeautifulSoup(before,'html.parser'),soup_for(route)
    for k in sig(old):
        check(sig(old)[k]==sig(new)[k],route+' preserves '+k)
    preservation.append({'path':rel,'mode':'URL/title/H1/canonical','beforeSha256':sha(before),'afterSha256':sha(after),'before':sig(old),'after':sig(new),'protectedFieldsIdentical':sig(old)==sig(new)})
(OUT/'preservation.json').write_text(json.dumps({'baseCommit':BASE_REF,'pages':preservation},ensure_ascii=False,indent=2)+'\n')

old_sitemap=source('sitemap.xml').decode()
new_sitemap=(ROOT/'sitemap.xml').read_text()
old_urls=re.findall(r'<loc>(.*?)</loc>',old_sitemap)
new_urls=re.findall(r'<loc>(.*?)</loc>',new_sitemap)
check(set(old_urls)<=set(new_urls),'all 712 existing sitemap URLs retained')
check(len(new_urls)==len(set(new_urls)),'no duplicate sitemap URLs')
check(set(new_urls)-set(old_urls)=={BASE+'/quest/languages/',BASE+'/en/quest/'},'only two new language hub URLs added')
for rel in protected_paths:
    route='/'+rel.removesuffix('index.html')
    pattern=r'<url>\s*<loc>'+re.escape(BASE+route)+r'</loc>.*?</url>'
    a,b=re.search(pattern,old_sitemap,re.S),re.search(pattern,new_sitemap,re.S)
    if a:check(a.group()==b.group(),'middle-school sitemap entry unchanged: '+route)

for route in ROUTES:
    s=soup_for(route)
    check(len(s.select('h1'))==1,route+' one H1')
    check(s.select_one('link[rel="canonical"]')['href']==BASE+route,route+' self canonical')
    check(s.select_one('meta[name="description"]')['content'].strip(),route+' description present')
    check(not re.search(r'noindex',s.select_one('meta[name="robots"]')['content'] if s.select_one('meta[name="robots"]') else ''),route+' indexable')
    ids=[x['id'] for x in s.select('[id]')]
    check(len(ids)==len(set(ids)),route+' unique IDs')
    for el in s.select('[href], [src]'):
        ref=el.get('href') or el.get('src');u=urlsplit(ref)
        if u.scheme in ('mailto','tel','data') or u.netloc not in ('','trailfusionai.com'):continue
        if el.name=='link' and el.get('rel') in (['canonical'],['alternate'],['preconnect']):continue
        target=file_for(unquote(u.path or route))
        check(target.is_file(),route+' local target: '+ref)
        if target.is_file() and target.suffix=='.html' and u.fragment:
            check(BeautifulSoup(target.read_text(),'html.parser').find(id=u.fragment) is not None,route+' target anchor: '+ref)
    for graph in graphs(s):
        if graph.get('@type')=='FAQPage':
            for q in graph['mainEntity']:
                details=[d for d in s.select('details') if d.summary and d.summary.get_text(' ',strip=True)==q['name']]
                check(any(q['acceptedAnswer']['text'] in d.get_text(' ',strip=True) for d in details),route+' FAQ visible: '+q['name'])
    if '/university/' in route:
        check('公共・政治経済' not in s.main.get_text(),route+' no unreleased civics')
    if route in ['/quest/languages/','/en/quest/']:
        links={x['hreflang']:x['href'] for x in s.select('link[rel="alternate"][hreflang]')}
        check(links=={'ja':BASE+'/quest/languages/','en':BASE+'/en/quest/','x-default':BASE+'/en/quest/'},route+' reciprocal language hub alternates only')
        check({x['id'] for x in s.select('article.language-course')}=={'japanese-everyday','english-travel'},route+' exactly two global course cards')
        for link in s.select('a[data-store]'):
            u=urlsplit(link['href']);q=parse_qs(u.query)
            check('6775411516' in link['href'] if link['data-store']=='apple' else q.get('id')==['com.gokakushakaiquest.app'],route+' correct integrated store destination')
            check(link.get('data-audience')=='language',route+' language attribution')

for c in CONFIG['universityCourses']:
    s=soup_for('/quest/university/'+c['slug']+'/')
    expected=[u['title'] for g in c['domains'] for u in g['units']]
    actual=[li.select_one('span').get_text() for li in s.select('.unit-groups li')]
    check(actual==expected,c['id']+' every released unit title retained in order')
s=soup_for('/quest/university/math-ia/')
check('48の学習単元と4回のオリジナル模試' in s.main.get_text(),'Math IA accurately labels 48 units plus four mock tests')

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
    def log_message(self,*a):pass
server=socketserver.ThreadingTCPServer(('127.0.0.1',0),Handler)
threading.Thread(target=server.serve_forever,daemon=True).start()
origin='http://127.0.0.1:'+str(server.server_address[1])
screens=[]
try:
    with sync_playwright() as pw:
        browser=pw.chromium.launch(channel='chrome')
        ctx=browser.new_context()
        ctx.route('**/*',lambda r:r.continue_() if r.request.url.startswith(origin) else r.abort())
        page=ctx.new_page()
        browser_errors=[]
        page.on('pageerror',lambda e:browser_errors.append(str(e)))
        for route in ROUTES:
            for width in ([320,390,1440] if route in ['/','/quest/','/quest/university/','/quest/university/math-ia/','/quest/languages/','/en/quest/','/en/japanese-quest.html','/en/eigo-quest.html'] else [390]):
                page.set_viewport_size({'width':width,'height':900})
                res=page.goto(origin+route,wait_until='load')
                page.locator('img').evaluate_all('(els)=>els.forEach(e=>e.loading="eager")')
                page.evaluate('Promise.all(Array.from(document.images).map(i=>i.decode().catch(()=>{})))')
                state=page.evaluate('({overflow:document.documentElement.scrollWidth>innerWidth+1,broken:Array.from(document.images).filter(i=>!i.complete||!i.naturalWidth).map(i=>i.getAttribute("src"))})')
                label=str(width)+'px '+route
                check(res.status==200,label+' loads')
                check(not state['overflow'],label+' no page horizontal overflow')
                check(not state['broken'],label+' all images load')
                if width==390 and route in ['/','/quest/','/quest/university/','/quest/university/math-ia/','/quest/languages/','/en/quest/','/en/japanese-quest.html','/en/eigo-quest.html']:
                    file=OUT/((route.strip('/').replace('/','-').removesuffix('.html') or 'home')+'-390.png')
                    page.screenshot(path=str(file),full_page=True);screens.append(str(file))
                    page.screenshot(path=str(file.with_name(file.stem+'-viewport.png')))
                if width==1440 and route in ['/quest/','/quest/university/','/en/quest/']:
                    file=OUT/((route.strip('/').replace('/','-') or 'home')+'-1440.png')
                    page.screenshot(path=str(file),full_page=True);screens.append(str(file))
        for route in ['/en/quest/','/quest/languages/','/en/japanese-quest.html','/en/eigo-quest.html']:
            page.goto(origin+route,wait_until='load')
            page.evaluate('window.testEvents=[];window.gtag=(...x)=>window.testEvents.push(x);document.querySelectorAll("a[data-store]").forEach(a=>a.addEventListener("click",e=>e.preventDefault()))')
            for store in ['apple','google']:
                a=page.locator('a[data-audience="language"][data-store="'+store+'"]').first
                a.click()
                event=page.evaluate('window.testEvents.filter(x=>x[1]==="quest_store_click").slice(-1)[0]')
                check(bool(event) and event[2]['audience']=='language' and event[2]['store']==store and event[2]['course'] in ['japanese-everyday','english-travel','all'],route+' '+store+' course attribution')
            count=page.evaluate('window.testEvents.filter(x=>x[1]==="quest_store_click").length')
            check(count==2,route+' emits each store event once')
            page.locator('.growth-faq details summary').first.click()
            check(page.locator('.growth-faq details').first.get_attribute('open') is not None,route+' FAQ opens')
        check(not browser_errors,'no JavaScript errors: '+str(browser_errors))
        ctx.close()
        nojs=browser.new_context(java_script_enabled=False)
        nojs.route('**/*',lambda r:r.continue_() if r.request.url.startswith(origin) else r.abort())
        p=nojs.new_page()
        p.goto(origin+'/en/quest/')
        check(p.locator('article.language-course').count()==2,'both language courses visible without JavaScript')
        p.goto(origin+'/quest/university/')
        check(p.locator('.growth-table tbody tr').count()==6,'six university coverage rows visible without JavaScript')
        browser.close()
finally:server.shutdown()
report={'baseCommit':BASE_REF,'passed':len(passed),'errors':errors,'middleSchoolPagesByteIdentical':len(protected_paths),'preservedExistingMetadataPages':len(preservation)-len(protected_paths),'sitemapBefore':len(old_urls),'sitemapAfter':len(new_urls),'screenshots':screens,'browser':'Chromium with installed Chrome','viewports':[320,390,1440],'limits':['Emulated viewports, not a physical device','External analytics blocked; events inspected locally','Search rankings and actual installs cannot be guaranteed or verified by this check']}
(OUT/'validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False,indent=2))
raise SystemExit(bool(errors))
