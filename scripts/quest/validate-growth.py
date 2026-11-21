"""Validate growth routes and preserve existing search landing pages."""
from pathlib import Path
from urllib.parse import urlsplit, unquote
from collections import Counter
import hashlib
import http.server
import json
import re
import socketserver
import subprocess
import threading
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
BASE_REF = '7979e9ed4652cf705c27a3f36fc67ffe532c0fc2'
OUT = ROOT / 'output/quest-growth'
OUT.mkdir(parents=True, exist_ok=True)
config = json.loads((ROOT / 'docs/quest/growth-release.json').read_text())
routes = ['/quest/qualifications/', '/quest/university/'] + ['/quest/university/' + c['slug'] + '/' for c in config['universityCourses']]
existing = ['/', '/quest/'] + ['/quest/courses/' + slug + '/' for slug in ['takken', 'fp', 'bookkeeping', 'it-passport', 'spi3']]
checks, errors = [], []


def check(ok, label):
    (checks if ok else errors).append(label)


def file_for(route):
    return ROOT / route.lstrip('/') / 'index.html' if route.endswith('/') else ROOT / route.lstrip('/')


protected = subprocess.check_output(['git', 'ls-tree', '-r', '--name-only', BASE_REF, 'quest/juken', 'quest/rika-shakai', 'quest/school4'], cwd=ROOT, text=True).splitlines()
for rel in protected:
    before = subprocess.check_output(['git', 'show', BASE_REF + ':' + rel], cwd=ROOT)
    check((ROOT / rel).read_bytes() == before, 'protected page unchanged: ' + rel)

for route in existing:
    rel = file_for(route).relative_to(ROOT).as_posix()
    before = BeautifulSoup(subprocess.check_output(['git', 'show', BASE_REF + ':' + rel], cwd=ROOT, text=True), 'html.parser')
    after = BeautifulSoup(file_for(route).read_text(), 'html.parser')
    for selector in ['title', 'h1', 'link[rel="canonical"]']:
        check(str(before.select_one(selector)) == str(after.select_one(selector)), route + ' preserves ' + selector)
    if '/courses/' in route:
        for el in after.select('.growth-related'):
            el.decompose()
        check(before.main.get_text(' ', strip=True) == after.main.get_text(' ', strip=True), route + ' preserves main copy')

for route in routes + existing:
    soup = BeautifulSoup(file_for(route).read_text(), 'html.parser')
    check(len(soup.select('h1')) == 1, route + ' one H1')
    check(soup.select_one('link[rel="canonical"]')['href'] == 'https://trailfusionai.com' + route, route + ' correct canonical')
    ids = [el['id'] for el in soup.select('[id]')]
    check(len(ids) == len(set(ids)), route + ' unique IDs')
    for el in soup.select('[href], [src]'):
        ref = el.get('href') or el.get('src')
        url = urlsplit(ref)
        if url.scheme in ('mailto', 'tel', 'data') or url.netloc not in ('', 'trailfusionai.com'):
            continue
        if el.name == 'link' and el.get('rel') in (['canonical'], ['alternate'], ['preconnect']):
            continue
        path = url.path or route
        target = file_for(unquote(path))
        check(target.is_file(), route + ' target exists: ' + path)
        if target.is_file() and url.fragment and target.suffix == '.html':
            check(BeautifulSoup(target.read_text(), 'html.parser').find(id=url.fragment) is not None, route + ' anchor exists: ' + ref)
    for tag in soup.select('script[type="application/ld+json"]'):
        schema = json.loads(tag.string)
        if route in routes:
            faq = next(x for x in schema['@graph'] if x['@type'] == 'FAQPage')
            visible = [(el.summary.get_text(), el.p.get_text()) for el in soup.select('.growth-faq details')]
            check(visible == [(q['name'], q['acceptedAnswer']['text']) for q in faq['mainEntity']], route + ' FAQ schema matches visible text')
    check('公共・政治経済' not in soup.main.get_text(), route + ' does not advertise unreleased civics')

for c in config['universityCourses']:
    soup = BeautifulSoup(file_for('/quest/university/' + c['slug'] + '/').read_text(), 'html.parser')
    check(len(soup.select('.unit-groups li')) == c['unitCount'], c['id'] + ' unit count matches release snapshot')

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)
    def log_message(self, *args):
        pass

server = socketserver.ThreadingTCPServer(('127.0.0.1', 0), Handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
origin = 'http://127.0.0.1:' + str(server.server_address[1])
screenshots, browsers_checked, browsers_unavailable = [], [], []
try:
    with sync_playwright() as pw:
        for engine in ['chromium', 'webkit']:
            try:
                browser = pw.chromium.launch(channel='chrome') if engine == 'chromium' else pw.webkit.launch()
            except Exception as exc:
                if engine == 'webkit' and "Executable doesn't exist" in str(exc):
                    browsers_unavailable.append('WebKit executable not installed')
                    continue
                raise
            browsers_checked.append(engine)
            context = browser.new_context()
            context.route('**/*', lambda r: r.continue_() if r.request.url.startswith(origin) else r.abort())
            page = context.new_page()
            js_errors = []
            page.on('pageerror', lambda e: js_errors.append(str(e)))
            for route in ['/quest/university/', '/quest/qualifications/', '/quest/university/math-ia/', '/quest/', '/']:
                for width in ([320, 390, 1440] if engine == 'chromium' else [390]):
                    page.set_viewport_size({'width': width, 'height': 900})
                    response = page.goto(origin + route, wait_until='load')
                    page.locator('img').evaluate_all('(els)=>els.forEach(e=>e.loading="eager")')
                    page.evaluate('Promise.all(Array.from(document.images).map(i=>i.decode().catch(()=>{})))')
                    state = page.evaluate('({overflow:document.documentElement.scrollWidth>innerWidth+1, broken:Array.from(document.images).filter(i=>!i.complete||!i.naturalWidth).map(i=>i.getAttribute("src"))})')
                    label = f'{engine} {width}px {route}'
                    check(response.status == 200, label + ' HTTP 200')
                    check(not state['overflow'], label + ' no horizontal overflow')
                    check(not state['broken'], label + ' no broken images: ' + str(state['broken']))
                    if engine == 'chromium' and width == 390:
                        file = OUT / (route.strip('/').replace('/', '-') or 'home')
                        file = file.with_suffix('.png')
                        page.screenshot(path=str(file), full_page=True)
                        screenshots.append(file.relative_to(ROOT).as_posix())
                        page.screenshot(path=str(file.with_name(file.stem + '-viewport.png')))
            page.goto(origin + '/quest/qualifications/', wait_until='load')
            page.locator('.growth-faq summary').first.click()
            check(page.locator('.growth-faq details').first.get_attribute('open') is not None, engine + ' FAQ opens')
            page.evaluate('window.gtag=(...args)=>{window.lastEvent=args}; document.querySelector("a[data-store=apple]").addEventListener("click", e=>e.preventDefault())')
            page.locator('a[data-store="apple"]').first.click()
            event = page.evaluate('window.lastEvent')
            check(event[0:2] == ['event', 'quest_store_click'] and event[2]['course'] == 'takken-japan' and event[2]['product_page'] == config['qualificationCpp']['business'], engine + ' course and CPP marketing attribution')
            for route in [x for x in existing if '/courses/' in x]:
                page.goto(origin + route, wait_until='load')
                page.evaluate('window.gtag=(...args)=>{window.lastEvent=args}; document.querySelectorAll("a[data-store]").forEach(a=>a.addEventListener("click", e=>e.preventDefault()))')
                for store in ['apple', 'google']:
                    page.locator('a[data-store="' + store + '"]').first.click()
                    event = page.evaluate('window.lastEvent')
                    check(event[0:2] == ['event', 'quest_store_click'] and event[2]['audience'] == 'qualification' and event[2]['store'] == store, engine + ' qualification audience on existing detail ' + route + store)
            check(not js_errors, engine + ' no JavaScript errors: ' + str(js_errors))
            context.close()
            nojs = browser.new_context(java_script_enabled=False)
            nojs.route('**/*', lambda r: r.continue_() if r.request.url.startswith(origin) else r.abort())
            p = nojs.new_page()
            p.goto(origin + '/quest/university/', wait_until='load')
            check(p.locator('.growth-course').count() == 6, engine + ' six courses available without JavaScript')
            p.goto(origin + '/quest/university/chemistry/', wait_until='load')
            check(p.locator('.unit-groups li').count() == 52, engine + ' full chemistry units available without JavaScript')
            browser.close()
finally:
    server.shutdown()

result = {'checkedAt': '2026-11-21', 'baseCommit': BASE_REF, 'passed': len(checks), 'errors': errors, 'protectedPages': len(protected), 'newPages': routes, 'viewports': [320, 390, 1440], 'browsers': browsers_checked, 'unavailableBrowsers': browsers_unavailable, 'screenshots': screenshots, 'limits': 'Emulated mobile viewports, not a physical iPhone; external analytics requests blocked during checks.'}
(OUT / 'validation.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(result, ensure_ascii=False, indent=2))
raise SystemExit(bool(errors))
