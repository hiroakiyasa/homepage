"""Read-only regression checks for the daylight hero (Chromium and WebKit)."""
from pathlib import Path
from urllib.parse import urljoin,urlsplit,unquote
import http.server,socketserver,threading,json,re
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2]
OUT=Path('/tmp/site-redesign-results/daylight');OUT.mkdir(parents=True,exist_ok=True)
checks=[];errors=[];layouts=[]
def check(ok,label):
    (checks if ok else errors).append(label)
s=BeautifulSoup((ROOT/'index.html').read_text(),'html.parser')
check(len(s.find_all('h1'))==1 and s.h1.get_text()=='学びも、旅も、DIYも、車旅も。','Exact requested headline in static HTML')
check(s.select_one('.tf-premium-hero__overlay') is None,'No dark hero overlay remains')
check(s.select_one('.tf-daylight__picture img')['src']=='/assets/hero/daylight-scene.avif','Independent image exported from original generated artwork')
expected=['/quest/','/travel/story.html','/camping.html','/maintenance.html']
check([a['href'] for a in s.select('.tf-hubs a')]==expected,'Original four direct navigation destinations')
check(s.select_one('.tf-brand-logo')['src']=='/assets/icons/trailfusion-lockup.webp','Original TrailFusion logo')
for a in s.select('.tf-daylight a[href]'):
    u=urlsplit(urljoin('https://trailfusionai.com/',a['href']));p=ROOT/unquote(u.path).lstrip('/')
    if p.is_dir():p=p/'index.html'
    ok=p.is_file()
    if ok and u.fragment:ok=BeautifulSoup(p.read_text(),'html.parser').find(id=u.fragment) is not None
    check(ok,'Hero link resolves: '+a['href'])
ld=json.loads(s.find('script',type='application/ld+json').string)
visible=[(x.summary.get_text(' ',strip=True),x.p.get_text(' ',strip=True)) for x in s.select('.tf-faq-item')]
faq=next(x for x in ld['@graph'] if x.get('@type')=='FAQPage')
check([(x['name'],x['acceptedAnswer']['text']) for x in faq['mainEntity']]==visible,'FAQ JSON-LD matches visible answers')
check('学びも、旅も、 DIY も、 車旅 も。' in (ROOT/'llms-full.txt').read_text(),'AI-readable summary updated')
class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
    def log_message(self,*args):pass
server=socketserver.ThreadingTCPServer(('127.0.0.1',0),Handler)
threading.Thread(target=server.serve_forever,daemon=True).start();origin=f'http://127.0.0.1:{server.server_address[1]}/'
try:
    with sync_playwright() as pw:
        for engine in ['chromium','webkit']:
            browser=getattr(pw,engine).launch()
            for width,height in [(320,800),(390,844),(430,932),(768,1000),(1024,900),(1440,1000)]:
                context=browser.new_context(viewport={'width':width,'height':height},locale='ja-JP',reduced_motion='reduce')
                # Local static rendering only. Do not send analytics or use external network services.
                context.route('**/*',lambda route:route.continue_() if route.request.url.startswith(origin) else route.abort())
                page=context.new_page();js=[];page.on('pageerror',lambda e:js.append(str(e)))
                try:
                    page.goto(origin,wait_until='load',timeout=30000)
                    page.evaluate('document.fonts.ready')
                    page.wait_for_timeout(200)
                    data=page.evaluate('''()=>{const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.x,right:r.right,width:r.width,height:r.height}};const image=document.querySelector('.tf-daylight__picture img');return {width:innerWidth,scroll:document.documentElement.scrollWidth,inner:rect('.tf-daylight__inner'),h1:rect('h1'),button:rect('.tf-daylight__primary'),picture:rect('.tf-daylight__picture'),headingOverflow:[...document.querySelectorAll('.tf-daylight__line')].some(e=>e.scrollWidth>e.clientWidth+1),broken:[...document.querySelectorAll('.tf-daylight img')].filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.src),imageRatio:image.clientWidth/image.clientHeight,naturalRatio:image.naturalWidth/image.naturalHeight,filter:getComputedStyle(image).filter,background:getComputedStyle(document.querySelector('.tf-daylight')).backgroundImage}}''')
                    label=f'{engine} {width}px: '
                    layouts.append({'engine':engine,**data})
                    check(data['scroll']<=width+1,label+'no page horizontal overflow')
                    check(data['inner']['x']>=16 and data['inner']['right']<=width-16,label+'at least 16px side gutters')
                    check(not data['headingOverflow'],label+'headline is not clipped')
                    check(data['button']['height']>=44,label+'primary button touch target')
                    check(not data['broken'],label+'hero images load')
                    check(abs(data['picture']['width']/data['picture']['height']-450/253)<0.03,label+'picture frame keeps proportions')
                    check(abs(data['imageRatio']-data['naturalRatio'])<0.03,label+'image is not distorted')
                    check(data['filter']=='none' and 'url(' not in data['background'],label+'bright surface with unobscured image')
                    check(not js,label+'no JavaScript errors '+str(js))
                    if width in [390,1440]:
                        page.screenshot(path=str(OUT/f'{engine}-hero-{width}.png'),full_page=False,animations='disabled')
                        page.locator('.tf-daylight').screenshot(path=str(OUT/f'{engine}-section-{width}.png'),animations='disabled')
                    if width==390:
                        page.locator('.tf-mobile-menu summary').click()
                        check(page.locator('.tf-mobile-menu').get_attribute('open') is not None,label+'mobile menu opens')
                        page.keyboard.press('Escape')
                        check(page.locator('.tf-mobile-menu').get_attribute('open') is None,label+'Escape closes mobile menu')
                except Exception as exc:errors.append(f'{engine} {width}px: {exc}')
                finally:context.close()
            context=browser.new_context(java_script_enabled=False,viewport={'width':390,'height':844})
            context.route('**/*',lambda route:route.continue_() if route.request.url.startswith(origin) else route.abort())
            page=context.new_page();page.goto(origin,wait_until='load');check(page.locator('#daylight-title').is_visible(),engine+': readable without JavaScript');context.close();browser.close()
finally:server.shutdown()
report={'passed':len(checks),'failed':len(errors),'checks':checks,'errors':errors,'layouts':layouts,'scope':'Chromium and WebKit, 320/390/430/768/1024/1440 CSS pixels. Not a physical iPhone test.'}
(OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps({'passed':len(checks),'failed':len(errors),'errors':errors},ensure_ascii=False,indent=2))
if errors:raise SystemExit(1)
