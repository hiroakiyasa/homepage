"""Browser checks for localization layout, preference routing and integrated course downloads."""
import http.server,json,socketserver,sys,threading
from pathlib import Path
from urllib.parse import urlsplit,parse_qs
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[2]
OUT=Path('/tmp/trailfusion-global-locale-review');OUT.mkdir(exist_ok=True)
PAGES=['','apps.html','reelmake.html','voicelink.html','japanese-quest.html','eigo-quest.html','buddytalk.html','word-blaster.html','wood-golem.html','hacking-timer.html']
LOCALES=['ar','he','de','ko','zh-hant']
errors=[];passed=0
class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self,*a,**k):super().__init__(*a,directory=str(ROOT),**k)
    def log_message(self,*a):pass
    def copyfile(self,source,output):
        try:super().copyfile(source,output)
        except (BrokenPipeError,ConnectionResetError):pass
server=socketserver.ThreadingTCPServer(('127.0.0.1',0),Handler)
threading.Thread(target=server.serve_forever,daemon=True).start()
origin='http://127.0.0.1:'+str(server.server_address[1])

def check(ok,message):
    global passed
    if ok:passed+=1
    else:errors.append(message)

def blocked(context):
    context.route('**/*',lambda r:r.continue_() if r.request.url.startswith(origin) else r.abort())

try:
    with sync_playwright() as pw:
        for engine in (['chromium'] if '--quick' in sys.argv else ['chromium','webkit']):
            if engine=='webkit':
                browser=pw.webkit.launch()
            else:
                try:browser=pw.chromium.launch(channel='chrome')
                except Exception:browser=pw.chromium.launch()
            context=browser.new_context(locale='en-US',reduced_motion='reduce')
            blocked(context);p=context.new_page()
            js=[];p.on('pageerror',lambda e:js.append(str(e)))
            for locale in LOCALES:
                for route in PAGES:
                    widths=[320] if engine=='chromium' else [390]
                    if engine=='chromium' and route in ('','apps.html','buddytalk.html'):
                        widths+=[390,1440]
                    for width in widths:
                        p.set_viewport_size({'width':width,'height':844})
                        url=origin+'/'+locale+'/'+route
                        response=p.goto(url,wait_until='load')
                        p.locator('img').evaluate_all('(xs)=>xs.forEach(x=>x.loading="eager")')
                        p.evaluate('Promise.all([...document.images].map(x=>x.decode().catch(()=>{})))')
                        state=p.evaluate('''()=>({
                            overflow:document.documentElement.scrollWidth>innerWidth+1,
                            broken:[...document.images].filter(x=>x.src.startsWith(location.origin)&&!x.naturalWidth).map(x=>x.src),
                            headings:document.querySelectorAll('h1').length,
                            lang:document.documentElement.lang
                        })''')
                        check(response.status==200 and p.url==url,url+' changed route/status')
                        check(not state['overflow'] and not state['broken'] and state['headings']==1,str([engine,locale,route,width,state]))
                        if engine=='chromium' and width==390 and route=='':
                            p.screenshot(path=str(OUT/(locale+'-hero-390.png')))
                            if locale in ('ar','he'):
                                p.locator('.global-languages summary').click()
                                p.screenshot(path=str(OUT/(locale+'-languages-390.png')))
                                p.locator('.global-languages summary').click()
                            p.locator('#learn').scroll_into_view_if_needed()
                            p.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
                            p.screenshot(path=str(OUT/(locale+'-learn-390.png')))
            check(not js,engine+' JS errors '+str(js))
            p.goto(origin+'/en/apps.html')
            p.locator('[data-filter="learn"]').click()
            check(p.locator('.app-card:visible').count()==4,engine+' two course cards, BuddyTalk and Word Blaster visible')
            check(p.locator('[data-count]').inner_text()=='Apps: 3',engine+' integrated Quest counted once in Learn')
            p.locator('[data-filter="all"]').click()
            check(p.locator('[data-count]').inner_text()=='Apps: 7',engine+' integrated Quest counted once in all products')
            p.locator('[data-filter="focus"]').click()
            check(p.locator('[data-count]').inner_text()=='Apps: 1',engine+' singular count uses neutral label')
            for course in ('japanese-quest.html','eigo-quest.html'):
                p.goto(origin+'/en/'+course)
                check(p.locator('a[data-store="apple"]').first.get_attribute('href')=='https://apps.apple.com/app/id6775411516',engine+' '+course+' integrated iOS download')
                check(p.locator('a[data-store="google"]').first.get_attribute('href').endswith('id=com.gokakushakaiquest.app'),engine+' '+course+' integrated Android download')
            context.close()

            auto=browser.new_context(locale='fr-CA');blocked(auto);p=auto.new_page()
            p.goto(origin+'/?utm_source=locale-test#learn')
            p.wait_for_url('**/fr/?utm_source=locale-test#learn')
            check(True,engine+' entry selects browser language and preserves campaign/hash')
            p.evaluate("localStorage.setItem('tf_site_language','ko')")
            p.goto(origin+'/de/')
            check(urlsplit(p.url).path=='/de/',engine+' explicit locale wins over saved/browser preferences')
            p.goto(origin+'/')
            p.wait_for_url('**/ko/')
            check(True,engine+' saved preference wins at entry')
            auto.close()

            unavailable=browser.new_context(locale='de-DE');blocked(unavailable)
            unavailable.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw Error('blocked for test')}})")
            p=unavailable.new_page();p.set_viewport_size({'width':390,'height':844})
            p.goto(origin+'/en/?utm_source=locale-test#learn')
            p.locator('.global-languages summary').click()
            p.locator('.global-languages a[data-global-language="ja"]').click()
            p.wait_for_url('**/?utm_source=locale-test&lang=ja#learn')
            check(p.locator('html').get_attribute('lang')=='ja',engine+' explicit Japanese works when storage unavailable')
            p.reload()
            check(p.locator('html').get_attribute('lang')=='ja',engine+' explicit Japanese survives reload without storage')
            unavailable.close()

            nojs=browser.new_context(java_script_enabled=False);blocked(nojs);p=nojs.new_page()
            p.goto(origin+'/fr/')
            check(p.locator('html').get_attribute('lang')=='fr' and 'Create. Translate.' not in p.locator('h1').inner_text(),engine+' translated content exists without JavaScript')
            p.locator('.global-languages summary').click()
            p.locator('.global-languages a[data-global-language="de"]').click()
            check(urlsplit(p.url).path=='/de/' and p.locator('html').get_attribute('lang')=='de',engine+' ordinary language links work without JavaScript')
            nojs.close();browser.close()
finally:server.shutdown()

result={'passed':passed,'errors':errors,'representative_locales':LOCALES}
(OUT/'results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
print(json.dumps(result,ensure_ascii=False,indent=2))
raise SystemExit(bool(errors))
