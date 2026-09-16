"""Prevent edge-to-edge homepage content and repeated campaign photos."""
from pathlib import Path
from collections import Counter
import http.server
import json
import socketserver
import threading
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = Path('/tmp/site-redesign-results')
WIDTHS = [320, 360, 375, 390, 414, 430, 480, 760, 768, 800, 1024, 1440]

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)
    def log_message(self, *args):
        pass

results = []
errors = []
server = socketserver.ThreadingTCPServer(('127.0.0.1', 0), Handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
origin = f'http://127.0.0.1:{server.server_address[1]}/'
try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(args=['--no-sandbox'])
        for width in WIDTHS:
            context = browser.new_context(viewport={'width': width, 'height': 900}, locale='ja-JP', reduced_motion='reduce')
            page = context.new_page()
            runtime_errors = []
            page.on('pageerror', lambda e: runtime_errors.append(str(e)))
            page.route('**/*', lambda route: route.continue_() if route.request.url.startswith(origin) else route.abort())
            try:
                page.goto(origin, wait_until='domcontentloaded')
                page.evaluate('''async () => {
                    await Promise.all([...document.images].map(i => { i.loading='eager'; return i.decode().catch(() => {}); }));
                    await document.fonts.ready;
                }''')
                data = page.evaluate('''() => {
                    const rect = e => { const r=e.getBoundingClientRect(); return {name:e.className,left:r.left,right:innerWidth-r.right}; };
                    const visuals=[...document.querySelectorAll('main .tf-daylight__picture img, main .tf-sunny-picture, main .tf-sprite-visual, main .tf-home-feature__visual img')].map(e => {
                        const s=getComputedStyle(e);
                        return e.tagName==='IMG' ? e.getAttribute('src') : [s.backgroundImage,s.backgroundPosition].join('|');
                    });
                    return {
                        scroll:document.documentElement.scrollWidth,
                        containers:[...document.querySelectorAll('main>section>.tf-container, main>section>.tf-daylight__inner')].map(rect),
                        content:[...document.querySelectorAll('.tf-home-feature h2,.tf-home-feature .tf-lead,.tf-home-feature__visual,.tf-home-feature .tf-button')].map(rect),
                        visuals,
                        broken:[...document.images].filter(i => !i.complete || !i.naturalWidth).map(i => i.getAttribute('src')),
                        heading:document.querySelector('h1').textContent
                    };
                }''')
                gutter = 20 if width <= 760 else 24
                assert data['scroll'] <= width + 1, f'{width}px: horizontal overflow'
                assert len(data['containers']) >= 9, 'Homepage sections are missing'
                for box in data['containers'] + data['content']:
                    assert min(box['left'], box['right']) >= gutter - .5, f'{width}px: missing gutter: {box}'
                for box in data['containers']:
                    assert abs(box['left'] - box['right']) < 1, f'{width}px: asymmetric container: {box}'
                duplicates = [key for key, count in Counter(data['visuals']).items() if count > 1]
                assert not duplicates, f'{width}px: repeated photos/screenshots: {duplicates}'
                assert not data['broken'], f'{width}px: broken images: {data["broken"]}'
                assert not runtime_errors, f'{width}px: JavaScript errors: {runtime_errors}'
                assert data['heading'] == '学びも、旅も、DIYも、車旅も。', 'Requested headline changed'
                assert page.locator('.tf-pillar-card .tf-sprite-visual').count() == 0, 'Entrance cards repeat hero photos'
                results.append({'width': width, 'gutter_min': gutter, 'containers': len(data['containers']), 'unique_visuals': len(data['visuals']), 'passed': True})
            except Exception as exc:
                errors.append(str(exc))
            finally:
                context.close()
        browser.close()
finally:
    server.shutdown()
    server.server_close()
OUT.mkdir(parents=True, exist_ok=True)
report = {'checks': results, 'errors': errors}
(OUT / 'homepage-regression.json').write_text(json.dumps(report, ensure_ascii=False, indent=2))
print(json.dumps(report, ensure_ascii=False, indent=2))
if errors:
    raise SystemExit(1)
