"""Browser checks for the TrailFusion brand site. Local server, external traffic blocked, no analytics sent.

  python3 scripts/brand/validate.py      (needs playwright, Chrome or Chromium, WebKit)

Checks at 320/390/768/1440 px in Chromium and 390/1440 in WebKit: HTTP 200, no horizontal overflow,
images decode, one h1, no JavaScript errors. Then the interactions: mobile menu, app filters, FAQ,
store-click analytics payload, localized direct URLs, and the app catalog without JavaScript.
"""
import http.server, json, socketserver, sys, threading
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = Path('/tmp/brand-site-results')
OUT.mkdir(parents=True, exist_ok=True)
PAGES = ['/', '/en/', '/apps.html', '/en/apps.html', '/about/', '/garage/', '/support/', '/car-concierge.html', '/mochi.html',
         '/reelmake.html', '/en/voicelink.html', '/buddytalk.html', '/fp-quest.html', '/en/word-blaster.html', '/wood-golem.html',
         '/hacking-timer.html', '/eigo-quest.html', '/rika-quest.html', '/kokugo-quest.html',
         '/camping.html', '/en/diy/', '/reelmake-privacy.html', '/maintenance.html', '/404.html']
CAMPING_PROBE = '--camping-probe' in sys.argv
if CAMPING_PROBE:
    PAGES = ['/camping.html']
passed, errors = [], []


def check(ok, label):
    (passed if ok else errors).append(label)


def check_page_header(page, route, label, origin):
    if route == '/eigo-quest.html':
        # This legacy URL intentionally redirects to the integrated Quest course.
        destination = origin + '/quest/courses/english/'
        page.wait_for_url(destination, wait_until='load')
        header = page.locator('body > header.header')
        brand = header.locator('a.brand[href="/quest/"]')
        check(page.url == destination and header.count() == 1 and header.is_visible()
              and brand.count() == 1 and brand.is_visible()
              and brand.locator('strong').all_text_contents() == ['合格！Quest'],
              label + ' redirects to the English course with its Quest header')
    else:
        check(page.locator('header.br-header').count() == 1, label + ' brand header')


def check_home_sections(page, engine):
    # Material cards have their own layout and background, not a brand picture.bg.
    images = page.locator('main > section.material-entry img')
    images.evaluate_all('(images)=>images.forEach(image=>image.loading="eager")')
    images.evaluate_all('(images)=>Promise.all(images.map(image=>image.decode().catch(()=>{})))')
    sections = page.evaluate('''()=>[...document.querySelectorAll('main > section')].map(section=>{
        const material = section.classList.contains('material-entry');
        if (!material) return {name:section.className, material, ok:!!section.querySelector(':scope > picture.bg img')};
        const visible = element => {
            if (!element) return false;
            const rect = element.getBoundingClientRect(), style = getComputedStyle(element);
            return rect.width > 0 && rect.height > 0 && style.display !== 'none'
                && style.visibility !== 'hidden' && Number(style.opacity) > 0;
        };
        const heading = section.querySelector(':scope > .material-wrap > h2');
        const cards = [...section.querySelectorAll('.material-art-card')];
        const routes = ['/quest/juken/', '/quest/university/', '/quest/qualifications/'];
        const cardsOK = cards.length === routes.length && cards.every((card, index)=>{
            const title = card.querySelector('h3'), image = card.querySelector('picture img');
            const link = card.querySelector(`a[href="${routes[index]}"]`);
            return visible(title) && !!title.textContent.trim() && visible(image)
                && image.complete && image.naturalWidth > 0 && visible(link);
        });
        return {name:section.className, material,
            ok:visible(heading) && !!heading.textContent.trim() && cardsOK};
    })''')
    check(sum(row['material'] for row in sections) == 1 and all(row['ok'] for row in sections),
          engine + ' top-page sections show backgrounds or visible material cards '
          + str([row['name'] for row in sections if not row['ok']]))


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
        for engine in (['webkit'] if CAMPING_PROBE else ['chromium', 'webkit']):
            browser = launch(pw, engine)
            ctx = browser.new_context(locale='ja-JP', reduced_motion='reduce')
            ctx.route('**/*', lambda r: r.continue_() if r.request.url.startswith(origin) else r.abort())
            page = ctx.new_page()
            js = []
            pending_requests = set()
            page.on('request', lambda r: pending_requests.add(r))
            page.on('requestfinished', lambda r: pending_requests.discard(r))
            page.on('requestfailed', lambda r: pending_requests.discard(r))
            page.on('pageerror', lambda e: js.append(str(e)))
            for route in PAGES:
                for width in ([390] if CAMPING_PROBE else [320, 390, 768, 1440] if engine == 'chromium' else [390, 1440]):
                    page.set_viewport_size({'width': width, 'height': 900})
                    label = f'{engine} {route} {width}px'
                    try:
                        res = page.goto(origin + route, wait_until='load')
                    except Exception:
                        try:
                            state = page.evaluate('''()=>({readyState:document.readyState,
                                fontStatus:document.fonts.status,location:location.href})''')
                        except Exception:
                            state = {'readyState': 'unavailable'}
                        print(json.dumps({'navigation_failure': label, 'state': state,
                              'pending_requests': sorted({r.url[:240] for r in pending_requests})[:20]},
                              ensure_ascii=False), flush=True)
                        raise
                    check(res.status == 200, label + ' HTTP 200')
                    check_page_header(page, route, label, origin)
                    page.locator('img').evaluate_all('(i)=>i.forEach(x=>x.loading="eager")')
                    page.evaluate('Promise.all([...document.images].map(i=>i.decode().catch(()=>{})))')
                    st = page.evaluate('''()=>({o:document.documentElement.scrollWidth>innerWidth+1,
                        b:[...document.images].filter(i=>!i.naturalWidth&&i.src.startsWith(location.origin)).map(i=>i.getAttribute('src')),
                        h:document.querySelectorAll('h1').length})''')
                    if st['o']:
                        layout = page.evaluate('''()=>{
                            const name = e=>e.tagName.toLowerCase()+(e.id?'#'+e.id:'')
                                +(typeof e.className==='string'&&e.className?'.'+e.className.trim().replace(/\\s+/g,'.'):'');
                            const candidates = [...document.querySelectorAll('body *')].filter(e=>
                                !['SCRIPT','STYLE','LINK','META'].includes(e.tagName)).map(e=>{
                                const r=e.getBoundingClientRect(), s=getComputedStyle(e);
                                if(r.width<=0||r.right<=innerWidth+1) return null;
                                const clippedBy=[];
                                for(let p=e.parentElement;p&&p!==document.body;p=p.parentElement){
                                    if(['hidden','auto','scroll','clip'].includes(getComputedStyle(p).overflowX)) clippedBy.push(name(p));
                                }
                                return {element:name(e),text:(e.innerText||'').slice(0,80),left:r.left,right:r.right,
                                    width:r.width,scrollWidth:e.scrollWidth,display:s.display,position:s.position,
                                    minWidth:s.minWidth,overflowX:s.overflowX,font:s.fontFamily,clippedBy};
                            }).filter(Boolean);
                            return {viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,
                                unclipped:candidates.filter(e=>!e.clippedBy.length).slice(0,25),
                                clipped:candidates.filter(e=>e.clippedBy.length).slice(0,10)};
                        }''')
                        print(json.dumps({'overflow': label, 'layout': layout}, ensure_ascii=False), flush=True)
                        page.screenshot(path=str(OUT / f'overflow-{engine}-{route.strip("/").replace("/", "-") or "home"}-{width}.png'), full_page=True)
                    check(not st['o'], label + ' no horizontal overflow')
                    check(not st['b'], label + ' images load ' + str(st['b'][:3]))
                    check(st['h'] >= 1, label + ' has an h1')
                    if width in (390, 1440) and route in ('/', '/en/', '/apps.html', '/garage/'):
                        page.screenshot(path=str(OUT / f'{engine}-{route.strip("/").replace("/", "-") or "home"}-{width}.png'), full_page=True)
            if CAMPING_PROBE:
                browser.close()
                continue
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
            check(page.url.endswith('/ko/') and page.locator('html').get_attribute('lang') == 'ko', engine + ' explicit Korean URL remains localized')
            page.goto(origin + '/', wait_until='load')
            check_home_sections(page, engine)
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

result = {'passed': len(passed), 'errors': errors, 'pages': PAGES,
          'mode': 'camping_probe' if CAMPING_PROBE else 'full'}
(OUT / 'results.json').write_text(json.dumps(result, ensure_ascii=False, indent=2))
print(json.dumps(result, ensure_ascii=False, indent=2))
raise SystemExit(bool(errors))
