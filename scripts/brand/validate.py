"""Browser checks for the TrailFusion brand site. Local server, external traffic blocked, no analytics sent.

  python3 scripts/brand/validate.py      (needs playwright, Chrome or Chromium, WebKit)

Checks at 320/390/768/1440 px in Chromium and 390/1440 in WebKit: HTTP 200, no horizontal overflow,
images decode, one h1, no JavaScript errors. Then the interactions: mobile menu, app filters, FAQ,
store-click analytics payload, retired-locale redirect, and the app catalog without JavaScript.
"""
import http.server, json, socketserver, threading
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = Path('/tmp/brand-site-results')
OUT.mkdir(parents=True, exist_ok=True)
PAGES = ['/', '/en/', '/apps.html', '/en/apps.html', '/about/', '/garage/', '/support/', '/car-concierge.html', '/mochi.html',
         '/reelmake.html', '/en/voicelink.html', '/buddytalk.html', '/fp-quest.html', '/en/word-blaster.html', '/wood-golem.html',
         '/hacking-timer.html', '/eigo-quest.html', '/rika-quest.html', '/kokugo-quest.html',
         '/diy/', '/en/diy/', '/reelmake-privacy.html', '/maintenance/', '/404.html']
passed, errors = [], []


def check(ok, label):
    (passed if ok else errors).append(label)


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=str(ROOT), **k)

    def log_message(self, format, *args):
        pass

    def copyfile(self, source, outputfile):
        try:
            super().copyfile(source, outputfile)
        except (BrokenPipeError, ConnectionResetError):
            pass


server = socketserver.ThreadingTCPServer(('127.0.0.1', 0), Handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
origin = f'http://127.0.0.1:{server.server_address[1]}'


def launch(pw, engine):
    if engine == 'webkit':
        return pw.webkit.launch()
    try:
        return pw.chromium.launch(channel='chrome')
    except Exception:
        return pw.chromium.launch()


try:
    with sync_playwright() as pw:
        for engine in ['chromium', 'webkit']:
            browser = launch(pw, engine)
            ctx = browser.new_context(locale='ja-JP', reduced_motion='reduce')
            ctx.route('**/*', lambda r: r.continue_() if r.request.url.startswith(origin) else r.abort())
            page = ctx.new_page()
            js = []
            page.on('pageerror', lambda e: js.append(str(e)))
            for route in PAGES:
                for width in ([320, 390, 768, 1440] if engine == 'chromium' else [390, 1440]):
                    page.set_viewport_size({'width': width, 'height': 900})
                    res = page.goto(origin + route, wait_until='load')
                    label = f'{engine} {route} {width}px'
                    check(res.status == 200, label + ' HTTP 200')
                    page.locator('img').evaluate_all('(i)=>i.forEach(x=>x.loading="eager")')
                    page.evaluate('Promise.all([...document.images].map(i=>i.decode().catch(()=>{})))')
                    st = page.evaluate('''()=>({o:document.documentElement.scrollWidth>innerWidth+1,
                        b:[...document.images].filter(i=>!i.naturalWidth&&i.src.startsWith(location.origin)).map(i=>i.getAttribute('src')),
                        h:document.querySelectorAll('h1').length, hd:document.querySelectorAll('header.br-header').length})''')
                    check(not st['o'], label + ' no horizontal overflow')
                    check(not st['b'], label + ' images load ' + str(st['b'][:3]))
                    check(st['h'] >= 1, label + ' has an h1')
                    check(st['hd'] == 1, label + ' brand header')
                    if width in (390, 1440) and route in ('/', '/en/', '/apps.html', '/garage/'):
                        page.screenshot(path=str(OUT / f'{engine}-{route.strip("/").replace("/", "-") or "home"}-{width}.png'), full_page=True)
            page.set_viewport_size({'width': 390, 'height': 844})
            page.goto(origin + '/', wait_until='load')
            page.locator('.br-menu summary').click()
            check(page.locator('.br-menu').get_attribute('open') is not None, engine + ' mobile menu opens')
            page.locator('.br-menu nav a').first.click()
            page.goto(origin + '/', wait_until='load')
            page.locator('.faq summary').first.click()
            check(page.locator('.faq details').first.get_attribute('open') is not None, engine + ' FAQ expands')
            page.evaluate('window.gtag=(...a)=>{window.captured=a};document.querySelectorAll("[data-store]").forEach(a=>a.addEventListener("click",e=>e.preventDefault()))')
            page.locator('.flagship [data-store="apple"]').first.click()
            ev = page.evaluate('window.captured')
            check(ev[1] == 'brand_store_click' and ev[2]['app'] == 'quest' and set(ev[2]) == {'store', 'app', 'placement', 'page_path'}, engine + ' store click sends only app metadata')
            page.goto(origin + '/apps.html', wait_until='load')
            total = page.locator('.catalog .app-grid:not(.two) .app-card').count()
            page.get_by_role('button', name='学ぶ', exact=False).first.click()
            learn = page.locator('.catalog .app-grid:not(.two) .app-card:visible').count()
            check(0 < learn < total, engine + f' filter narrows apps ({learn}/{total})')
            page.get_by_role('button', name='すべて', exact=False).first.click()
            check(page.locator('.catalog .app-grid:not(.two) .app-card:visible').count() == total, engine + ' filter resets')
            page.goto(origin + '/ko/', wait_until='load')
            page.wait_for_url('**/en/')
            check(True, engine + ' retired locale redirects to English')
            page.goto(origin + '/', wait_until='load')
            sections = page.evaluate('''()=>[...document.querySelectorAll('main > section')].map(s=>[s.className, !!s.querySelector(':scope > picture.bg img')])''')
            check(all(has for _, has in sections), engine + ' every top-page section has a background ' + str([c for c, h in sections if not h]))
            page.goto(origin + '/reelmake.html', wait_until='load')
            sections = page.evaluate('''()=>[...document.querySelectorAll('main > section')].map(s=>[s.className, !!s.querySelector(':scope > picture.bg img')])''')
            check(all(has for _, has in sections), engine + ' every detail-page section has a background ' + str([c for c, h in sections if not h]))
            check(not js, engine + ' no JavaScript errors ' + str(js[:3]))
            ctx.close()
            nojs = browser.new_context(java_script_enabled=False)
            nojs.route('**/*', lambda r: r.continue_() if r.request.url.startswith(origin) else r.abort())
            p = nojs.new_page()
            p.goto(origin + '/apps.html')
            check(p.locator('.app-card:visible').count() == p.locator('.app-card').count() > 10, engine + ' all apps visible without JavaScript')
            check(p.locator('.chips').is_hidden(), engine + ' filters stay hidden without JavaScript')
            browser.close()
finally:
    server.shutdown()

result = {'passed': len(passed), 'errors': errors, 'pages': PAGES}
(OUT / 'results.json').write_text(json.dumps(result, ensure_ascii=False, indent=2))
print(json.dumps(result, ensure_ascii=False, indent=2))
raise SystemExit(bool(errors))
