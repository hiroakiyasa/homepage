"""Render og-quest.jpg (1200x630) from the live hero with web fonts loaded.

The validator blocks external traffic (so Google Fonts never load); this script is separate
for that reason. Run after build.py:  python3 scripts/quest/make-og.py
"""
from pathlib import Path
import http.server, socketserver, threading
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
TMP = ROOT / 'output/playwright/quest/og-source.png'


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, *args):
        pass


server = socketserver.ThreadingTCPServer(('127.0.0.1', 0), Handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
try:
    TMP.parent.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel='chrome')
        page = browser.new_page(viewport={'width': 1440, 'height': 900}, device_scale_factor=1)
        # Analytics is never loaded while rendering the image.
        page.route('**/googletagmanager.com/**', lambda route: route.abort())
        page.goto(f'http://127.0.0.1:{server.server_address[1]}/quest/', wait_until='networkidle')
        page.evaluate('document.fonts.ready')
        page.add_style_tag(content='.header,.sticky-cta{display:none!important}')
        page.screenshot(path=str(TMP), clip={'x': 60, 'y': 0, 'width': 1320, 'height': 693})
        browser.close()
    Image.open(TMP).convert('RGB').resize((1200, 630), Image.LANCZOS).save(ROOT / 'assets/quest/og-quest.jpg', quality=88)
    print('og-quest.jpg written')
finally:
    server.shutdown()
