"""Render assets/brand/og.jpg (1200x630) from the top-page hero with web fonts loaded.

The browser validator blocks external traffic (fonts never load), so this is a separate step.
Run after build.py:  python3 scripts/brand/make-og.py
"""
from pathlib import Path
import http.server, socketserver, threading
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
TMP = Path('/tmp/brand-og-source.png')


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, format, *args):
        pass


server = socketserver.ThreadingTCPServer(('127.0.0.1', 0), Handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel='chrome')
        page = browser.new_page(viewport={'width': 1440, 'height': 900})
        page.route('**/googletagmanager.com/**', lambda route: route.abort())
        page.goto(f'http://127.0.0.1:{server.server_address[1]}/', wait_until='networkidle')
        page.evaluate('document.fonts.ready')
        page.add_style_tag(content='.br-header,.dock-wrap{display:none!important}.hero{padding-top:70px!important}')
        page.screenshot(path=str(TMP), clip={'x': 60, 'y': 0, 'width': 1320, 'height': 693})
        browser.close()
    Image.open(TMP).convert('RGB').resize((1200, 630), Image.LANCZOS).save(ROOT / 'assets/brand/og.jpg', quality=88)
    print('assets/brand/og.jpg written')
finally:
    server.shutdown()
