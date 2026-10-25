"""Local, read-only browser acceptance checks; never sends analytics or clicks stores."""
from pathlib import Path
from urllib.parse import urlsplit, urljoin, unquote
from collections import Counter
import json, http.server, socketserver, threading, re
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'output/playwright/quest';OUT.mkdir(parents=True,exist_ok=True)
PAGES=json.loads((ROOT/'docs/quest/pages.json').read_text());checks=[];errors=[]
def check(ok,label):
 (checks if ok else errors).append(label)
def file_for(url):
 path=ROOT/unquote(urlsplit(url).path).lstrip('/')
 return path/'index.html' if path.is_dir() else path
class Handler(http.server.SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
 def log_message(self,*args):pass
 def copyfile(self,source,outputfile):
  try:super().copyfile(source,outputfile)
  except (BrokenPipeError,ConnectionResetError):pass  # Browser cancelled a request during navigation.
server=socketserver.ThreadingTCPServer(('127.0.0.1',0),Handler)
threading.Thread(target=server.serve_forever,daemon=True).start();origin=f'http://127.0.0.1:{server.server_address[1]}'
try:
 with sync_playwright() as pw:
  for engine in ['chromium','webkit']:
   browser=pw.chromium.launch(channel='chrome') if engine=='chromium' else pw.webkit.launch()
   context=browser.new_context(locale='ja-JP',reduced_motion='reduce')
   context.route('**/*',lambda route:route.continue_() if route.request.url.startswith(origin) else route.abort())
   page=context.new_page();js=[];page.on('pageerror',lambda e:js.append(str(e)))
   selected=PAGES if engine=='chromium' else ['/quest/','/quest/courses/science/','/quest/plans/','/quest/kingdom/']
   for route in selected:
    for width in ([320,390,768,1440] if engine=='chromium' else [390,1440]):
     page.set_viewport_size({'width':width,'height':900});response=page.goto(origin+route,wait_until='load');check(response.status==200,f'{engine} {route} HTTP 200')
     page.locator('img').evaluate_all('(images)=>images.forEach(i=>i.loading="eager")')
     page.evaluate('Promise.all([...document.images].map(i=>i.decode().catch(()=>{})))')
     state=page.evaluate('''()=>({overflow:document.documentElement.scrollWidth>innerWidth+1, broken:[...document.images].filter(i=>!i.naturalWidth).map(i=>i.src),h1:document.querySelectorAll('h1').length})''')
     label=f'{engine} {route} {width}px'
     check(not state['overflow'],label+' no horizontal overflow');check(not state['broken'],label+' images loaded '+str(state['broken']));check(state['h1']==1,label+' one h1')
     if route=='/quest/':
      check(page.locator('.shelf .book').count()==4,label+' hero shows four school subjects')
      check(page.locator('.more-courses a').count()==8,label+' hero shows eight additional courses')
      check('中学受験の4科' in page.locator('h1').inner_text() and 'ひとつのアプリ' in page.locator('.v-hero').inner_text(),label+' unified learning headline')
      check(page.locator('.subj').count()==4,label+' four school subjects shown with real atlas and quiz screens')
      check(page.locator('.ccard .ccard-num').count()==12,label+' all courses show quantity metrics')
      check(page.locator('.stat-notes').count()==1,label+' scoped number and download notes available')
      check(page.locator('.ccard-num dd, .stat-board .num').evaluate_all('(es)=>es.every(e=>e.scrollWidth<=e.clientWidth+1)'),label+' quantity labels are not clipped')
      art=page.locator('main > section').evaluate_all('(items)=>items.filter(e=>e.querySelector(":scope > picture.bg img[src*=\'/backgrounds/v3-\']")).length')
      check(art>=6,label+f' generated backgrounds in key sections ({art})')
     if width in [390,1440] and route in ['/quest/','/quest/courses/science/','/quest/kingdom/','/quest/plans/']:
      slug=route.strip('/').replace('/','-');page.screenshot(path=str(OUT/f'{engine}-{slug}-{width}.png'),full_page=True)
     if route=='/quest/' and width==1440 and engine=='chromium':
      page.locator('.v-hero').screenshot(path=str(OUT/'hero.png'))
   page.set_viewport_size({'width':390,'height':844});page.goto(origin+'/quest/',wait_until='load')
   for name,count in [('中学受験',4),('資格・就職',5),('語学',2),('暮らし',1),('すべて',12)]:
    page.get_by_role('button',name=name,exact=True).click();check(page.locator('.ccard:visible').count()==count,f'{engine} filter {name} shows {count} courses')
   audio=page.locator('audio');audio.evaluate('(a)=>a.load()');page.wait_for_function('document.querySelector("audio").readyState>=1')
   duration=audio.evaluate('(a)=>a.duration');check(duration>1,engine+' real question audio decodes')
   audio.evaluate('(a)=>a.play()');page.wait_for_timeout(400);check(audio.evaluate('(a)=>a.currentTime')>0,engine+' audio playback advances');audio.evaluate('(a)=>a.pause()')
   page.get_by_role('button',name='1個',exact=True).click();check('答えは、2個' in page.locator('[data-quiz-result]').inner_text(),engine+' incorrect answer explains')
   page.get_by_role('button',name='2個',exact=True).click();check('正解' in page.locator('[data-quiz-result]').inner_text(),engine+' correct answer explains')
   preview=page.locator('[data-preview]').first;preview.click();check(page.locator('dialog').evaluate('(d)=>d.open'),engine+' image modal opens')
   page.keyboard.press('Escape');check(not page.locator('dialog').evaluate('(d)=>d.open'),engine+' Escape closes modal');check(preview.evaluate('(e)=>document.activeElement===e'),engine+' modal restores keyboard focus')
   page.locator('.mobile-menu summary').click();check(page.locator('.mobile-menu').get_attribute('open') is not None,engine+' mobile navigation opens')
   page.locator('.mobile-menu nav a').first.click();check(page.locator('.mobile-menu').get_attribute('open') is None,engine+' mobile navigation closes after selection')
   page.locator('.faq summary').first.click();check(page.locator('.faq details').first.get_attribute('open') is not None,engine+' FAQ expands')
   # Capture analytics locally; the route interceptor prevents external traffic.
   page.evaluate('window.gtag=(...args)=>{window.questCaptured=args};document.querySelectorAll("[data-store]").forEach(a=>a.addEventListener("click",e=>e.preventDefault()))')
   page.locator('[data-store="apple"]').first.click();event=page.evaluate('window.questCaptured')
   check(event[0:2]==['event','quest_store_click'] and event[2]['store']=='apple',engine+' store analytics captures only marketing metadata')
   page.goto(origin+'/quest/kingdom/',wait_until='load');page.get_by_role('button',name='領地を見渡す').click();check('night-overview' in page.locator('[data-world-image]').get_attribute('src'),engine+' kingdom view toggles')
   page.goto(origin+'/gokaku-quest.html?utm_source=qa#courses',wait_until='load');page.wait_for_url('**/quest/?utm_source=qa#courses');check(True,engine+' old URL preserves query and fragment')
   check(not js,engine+' no JavaScript runtime errors '+str(js));context.close()
   context=browser.new_context(java_script_enabled=False);context.route('**/*',lambda r:r.continue_() if r.request.url.startswith(origin) else r.abort());p=context.new_page();p.goto(origin+'/quest/');check(p.locator('.ccard').count()==12,engine+' all courses accessible without JavaScript');check(p.locator('[data-store]').count()==4,engine+' hero and bottom download links work without JavaScript');browser.close()
 # The OG image is rendered with web fonts by scripts/quest/make-og.py; here we only check its size.
 from PIL import Image
 check(Image.open(ROOT/'assets/quest/og-quest.jpg').size==(1200,630),'OG image is 1200x630')
 for relative in re.findall(r"url\(['\"]?(/assets/quest/backgrounds/[^)'\"]+)", (ROOT/'assets/quest/quest.css').read_text()+(ROOT/'assets/quest/quest-v3.css').read_text()):
  check((ROOT/relative.lstrip('/')).is_file(),'generated background exists '+relative)
 titles=[]
 for route in PAGES:
  p=file_for(route);s=BeautifulSoup(p.read_text(),'html.parser');titles.append(s.title.string)
  check(s.select_one('link[rel="canonical"]')['href']=='https://trailfusionai.com'+route,route+' canonical URL')
  ids=[x['id'] for x in s.select('[id]')];check(len(ids)==len(set(ids)),route+' unique anchor IDs')
  for x in s.select('a[href],img[src],script[src],link[href],source[src]'):
   href=x.get('href') or x.get('src');u=urlsplit(urljoin('https://trailfusionai.com'+route,href))
   if u.netloc!='trailfusionai.com' or u.scheme not in ['http','https']:continue
   target=file_for(u.path);check(target.is_file(),route+' asset/link '+href)
   if target.is_file() and u.fragment and target.suffix=='.html':check(BeautifulSoup(target.read_text(),'html.parser').find(id=u.fragment) is not None,route+' anchor '+href)
  for script in s.select('script[type="application/ld+json"]'):json.loads(script.string)
  if route=='/quest/':
   ld=json.loads(s.select_one('script[type="application/ld+json"]').string);faq=next(x for x in ld['@graph'] if x['@type']=='FAQPage');visible=[(d.summary.get_text(),d.p.get_text()) for d in s.select('.faq details')];check(visible==[(q['name'],q['acceptedAnswer']['text']) for q in faq['mainEntity']], 'FAQ schema agrees with visible answers')
 check(len(set(titles))==len(PAGES),'all pages have distinct titles')
finally:server.shutdown()
result={'checksPassed':len(checks),'errors':errors,'pages':len(PAGES),'browsers':['Chrome','WebKit'],'widths':[320,390,768,1440]};(OUT/'results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False,indent=2));raise SystemExit(bool(errors))
