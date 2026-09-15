"""Static, preservation and Chromium regression checks for the site redesign."""
from pathlib import Path
from urllib.parse import urljoin,urlsplit,unquote
from collections import Counter
import contextlib,hashlib,http.server,json,socketserver,subprocess,threading,time
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2];OUT=Path('/tmp/site-redesign-results');OUT.mkdir(parents=True,exist_ok=True)
BASE='b8c922f00f90f1e443b02253dd78d5f60b2de53d'
report=json.loads((OUT/'build-report.json').read_text());errors=[];checks=[];warnings=[];layouts=[];runtime=[]
def check(ok,message):
    (checks if ok else errors).append(message)
def soupfile(path):return BeautifulSoup((ROOT/path).read_text(),'html.parser')
def orig(path):return BeautifulSoup(subprocess.check_output(['git','show',BASE+':'+path],cwd=ROOT).decode(),'html.parser')
cache={}
def exists_link(current,href):
    if href.startswith(('mailto:','tel:','javascript:','data:')):return True
    u=urlsplit(urljoin('https://trailfusionai.com/'+current,href))
    if u.netloc and u.netloc!='trailfusionai.com':return True
    p=unquote(u.path).lstrip('/')
    if not p or p.endswith('/'):p+='index.html'
    target=ROOT/p
    if not target.is_file():return False
    if u.fragment and target.suffix=='.html':
        if p not in cache:cache[p]={x.get('id') for x in soupfile(p).select('[id]')}
        return unquote(u.fragment) in cache[p]
    return True
newpages=[p for p in report['changed_pages'] if p not in report['preservation'] and p!='drive-routes/index.html']
for p in report['changed_pages']:
    s=soupfile(p)
    check(len(s.find_all('title'))==1,p+': one title')
    check(len(s.select('link[rel=canonical]'))==1,p+': one canonical')
    check(len(s.select('meta[name=description]'))==1,p+': one description')
    for ld in s.select('script[type="application/ld+json"]'):
        try:json.loads(ld.string or ld.get_text());check(True,p+': JSON-LD parses')
        except Exception as e:check(False,p+': invalid JSON-LD '+str(e))
    if p in newpages:
        check(len(s.find_all('h1'))==1,p+': one H1')
        ids=[x.get('id') for x in s.select('[id]')];dupes=[x for x,n in Counter(ids).items() if n>1]
        check(not dupes,p+': no duplicate IDs '+str(dupes))
    selector='a[href],img[src],script[src],link[rel=stylesheet]' if p in newpages else '.tf-header a[href],.tf-footer a[href],.tf-local-links a[href]'
    broken=[]
    for tag in s.select(selector):
        value=tag.get('href') or tag.get('src')
        if value and not exists_link(p,value):broken.append(value)
    check(not broken,p+': internal destinations exist '+str(sorted(set(broken))))
    if p in newpages:
        check(not any(x.get('src','').startswith('data:image/') for x in s.select('img')),p+': no inline raster images')
        check(all(x.get('alt') is not None and x.get('width') and x.get('height') for x in s.select('img')),p+': image alt and dimensions')
for p,item in report['preservation'].items():
    s=soupfile(p);old=orig(item['source'])
    for sid,sha in item['unchanged_engine_sha256'].items():
        current=s.find(id=sid)
        check(current is not None and hashlib.sha256(current.get_text().encode()).hexdigest()==sha,p+': unchanged '+sid)
    if any(t in p for t in ['privacy','terms','legal','support']):
        now=' '.join(s.stripped_strings)
        missing=[h.get_text(' ',strip=True) for h in old.find_all(['h1','h2','h3']) if h.get_text(' ',strip=True) not in now and not h.find_parent('footer')]
        check(not missing,p+': policy headings retained '+str(missing))
        # Contract paragraphs are retained even when a heading block used a header element.
        missing_p=[]
        for t in old.select('p,li,td'):
            if t.find_parent(['footer','nav']):continue
            text=t.get_text(' ',strip=True)
            if len(text)>35 and text not in now:missing_p.append(text[:90])
        check(not missing_p,p+': policy paragraphs retained '+str(missing_p[:5]))
for p in ['maintenance.html','camping.html','drive-routes/index.html']:
    old=orig(p);new=soupfile(p);oldids={x['id'] for x in old.select('[id]')};newids={x['id'] for x in new.select('[id]')}
    removable={'lp-site-chrome-runtime','lp-navigation-20260908','burger','drawer','ig-grad'}
    check(not(oldids-newids-removable),p+': interactive IDs retained '+str(sorted(oldids-newids-removable)))
# All maintenance behavior and data modules are untouched.
for p in sorted((ROOT/'assets/js').glob('maintenance*.js')):
    rel=str(p.relative_to(ROOT));base=subprocess.check_output(['git','show',BASE+':'+rel],cwd=ROOT)
    check(p.read_bytes()==base,rel+': exact behavior preserved')

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
    def log_message(self,*args):pass
server=socketserver.ThreadingTCPServer(('127.0.0.1',8765),QuietHandler)
threading.Thread(target=server.serve_forever,daemon=True).start()
origin='http://127.0.0.1:8765/'
shotpages={'index.html','quest/index.html','rika-quest.html','social-quest.html','kokugo-quest.html','travel/index.html','diy/index.html','maintenance/index.html','apps.html','parents/index.html','choose/index.html'}
with sync_playwright() as pw:
    browser=pw.chromium.launch(args=['--no-sandbox','--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    for width in [390,1440]:
        context=browser.new_context(viewport={'width':width,'height':900},device_scale_factor=1,locale='ja-JP',reduced_motion='reduce')
        tab=context.new_page();pageerrors=[];tab.on('pageerror',lambda e:pageerrors.append(str(e)))
        for p in newpages:
            pageerrors.clear()
            try:
                response=tab.goto(origin+p,wait_until='domcontentloaded',timeout=30000)
                tab.wait_for_timeout(220)
                tab.evaluate('async()=>{await Promise.race([Promise.all([...document.images].filter(i=>i.loading!=="lazy"||i.getBoundingClientRect().top<innerHeight).map(i=>i.decode().catch(()=>{}))),new Promise(r=>setTimeout(r,4000))])}')
                data=tab.evaluate('''()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,broken:[...document.images].filter(i=>i.getAttribute('src').startsWith('/')&&i.complete&&i.naturalWidth===0).map(i=>i.getAttribute('src')),h1:document.querySelector('h1')?.getBoundingClientRect().height,header:document.querySelector('.tf-header')?.getBoundingClientRect().height})''')
                layouts.append({'page':p,'viewport':width,**data})
                check(data['scroll']<=width+2,f'{p} {width}px: no horizontal overflow ({data["scroll"]})')
                check(not data['broken'],f'{p} {width}px: images load '+str(data['broken']))
                check(not pageerrors,f'{p} {width}px: no JavaScript errors '+str(pageerrors))
                if p in shotpages:
                    dest=OUT/'screenshots'/f'{p.replace("/","_").replace(".html","")}-{width}.png';dest.parent.mkdir(exist_ok=True)
                    tab.screenshot(path=str(dest),full_page=True,animations='disabled')
            except Exception as e:errors.append(f'{p} {width}px: browser check failed {str(e)[:300]}')
        context.close()
    context=browser.new_context(viewport={'width':390,'height':844},locale='ja-JP',reduced_motion='reduce')
    tab=context.new_page()
    try:
        tab.goto(origin+'index.html',wait_until='domcontentloaded');tab.locator('.tf-mobile-menu summary').click();check(tab.locator('.tf-mobile-menu').get_attribute('open') is not None,'Mobile menu opens');tab.keyboard.press('Escape');check(tab.locator('.tf-mobile-menu').get_attribute('open') is None,'Escape closes menu')
        tab.goto(origin+'choose/index.html',wait_until='domcontentloaded');tab.select_option('select[name=subject]','social');tab.select_option('select[name=goal]','review');tab.locator('#quest-finder button').click();check(tab.locator('#finder-result a').get_attribute('href')=='/social-quest.html','Finder points to selected subject');check('社会' in tab.locator('#finder-result h2').inner_text(),'Finder announces result')
        tab.goto(origin+'apps.html',wait_until='domcontentloaded');tab.locator('[data-tf-filter] button[data-category=travel]').click();check(tab.locator('[data-tf-filter-card]:visible').count()==1,'App category filter works');tab.locator('[data-tf-filter] button[data-category=all]').click();check(tab.locator('[data-tf-filter-card]:visible').count()==11,'All app entries are available')
        tab.goto(origin+'rika-quest.html',wait_until='domcontentloaded');tab.locator('.tf-faq summary').first.click();check(tab.locator('.tf-faq details').first.get_attribute('open') is not None,'FAQ opens without special library')
    except Exception as e:errors.append('Interaction check: '+str(e)[:350])
    context.close()
    # No-JavaScript crawlability and fallback.
    context=browser.new_context(java_script_enabled=False,viewport={'width':360,'height':800},locale='ja-JP')
    tab=context.new_page()
    for p in ['index.html','quest/index.html','choose/index.html','travel/index.html']:
        tab.goto(origin+p,wait_until='domcontentloaded');check(tab.locator('h1').is_visible(),p+': readable with JavaScript disabled');check(tab.locator('.tf-hubs a').count()==4,p+': all four routes in static HTML')
    context.close()
    # Interact with existing local maintenance storage, isolated in a fresh browser context.
    context=browser.new_context(viewport={'width':1440,'height':1000},locale='ja-JP')
    tab=context.new_page();engineerrors=[];tab.on('pageerror',lambda e:engineerrors.append(str(e)))
    try:
        tab.goto(origin+'maintenance.html',wait_until='domcontentloaded',timeout=40000)
        tab.wait_for_function('document.querySelector("#record-part")?.options.length>0',timeout=30000)
        tab.fill('#record-date','2026-09-16');tab.fill('#record-km','82000');tab.fill('#record-note','AUTOMATED REGRESSION TEST - isolated browser only')
        tab.locator('#record-form button[type=submit]').click();tab.wait_for_timeout(250)
        check(tab.locator('#record-count').inner_text()=='1','Maintenance record saves in isolated browser')
        tab.reload(wait_until='domcontentloaded');tab.wait_for_timeout(1000);check(tab.locator('#record-count').inner_text()=='1','Maintenance record persists after reload')
        with tab.expect_download(timeout=10000) as info:tab.locator('#export-records').click()
        data=json.loads(Path(info.value.path()).read_text());check(len(data.get('records',[]))==1,'Maintenance record JSON export works')
        tab.screenshot(path=str(OUT/'screenshots/maintenance-interactive-1440.png'),full_page=True,animations='disabled')
        runtime.append({'page':'maintenance.html','errors':list(engineerrors),'record_test':'completed'})
        check(not engineerrors,'Maintenance engine has no JavaScript errors '+str(engineerrors))
    except Exception as e:errors.append('Maintenance regression: '+str(e)[:400]);runtime.append({'page':'maintenance.html','errors':list(engineerrors)})
    context.close()
    context=browser.new_context(viewport={'width':1440,'height':1000},locale='ja-JP',reduced_motion='reduce')
    tab=context.new_page();engineerrors=[];tab.on('pageerror',lambda e:engineerrors.append(str(e)))
    try:
        tab.goto(origin+'camping.html',wait_until='domcontentloaded',timeout=40000);tab.wait_for_timeout(4500)
        check(tab.locator('#hiace-atelier').is_visible(),'Camper 3D UI is visible')
        check(tab.locator('#layout-picker').count()==1,'Camper layout selector retained')
        check(tab.locator('.tf-hubs a').count()==4,'Camper exposes all four sections')
        options=tab.locator('#layout-picker button')
        if options.count()>1:options.nth(1).click();tab.wait_for_timeout(600);check(True,'Camper layout button can be used')
        tab.screenshot(path=str(OUT/'screenshots/camping-interactive-1440.png'),full_page=True,animations='disabled')
        runtime.append({'page':'camping.html','errors':list(engineerrors)})
        check(not engineerrors,'Camper engine has no JavaScript errors '+str(engineerrors))
    except Exception as e:errors.append('Camper regression: '+str(e)[:400]);runtime.append({'page':'camping.html','errors':list(engineerrors)})
    context.close();browser.close()
server.shutdown()
result={'passed':len(checks),'failed':len(errors),'errors':errors,'warnings':warnings,'checks':checks,'layout':layouts,'runtime':runtime,'scope':'Static generated pages: mobile/desktop + no-JS; Chromium only. Legacy policy preservation, 3D payload hashes, maintenance record save/reload/export. Not an App Store or Play Console audit.'}
(OUT/'validation-report.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
print(json.dumps({'passed':len(checks),'failed':len(errors),'errors':errors,'warnings':warnings},ensure_ascii=False,indent=2))
if errors:raise SystemExit(1)
