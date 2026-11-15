"""Render English sharing art from the real international home page."""
from pathlib import Path
import http.server, socketserver, threading
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)
    def log_message(self, *args):
        pass

server = socketserver.ThreadingTCPServer(('127.0.0.1', 0), Handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
origin = f'http://127.0.0.1:{server.server_address[1]}'
tmp = Path('/tmp/trailfusion-global-og.png')
try:
    with sync_playwright() as pw:
        try:
            browser = pw.chromium.launch(channel='chrome')
        except Exception:
            browser = pw.chromium.launch()
        page = browser.new_page(viewport={'width':1440,'height':900}, device_scale_factor=1)
        page.route('**/*', lambda r: r.continue_() if r.request.url.startswith((origin, 'https://fonts.googleapis.com/', 'https://fonts.gstatic.com/')) else r.abort())
        page.goto(origin + '/en/', wait_until='networkidle')
        page.evaluate('document.fonts.ready')
        page.add_style_tag(content='.br-header{display:none!important}.global-hero{padding-top:34px!important}.global-hero-grid{min-height:625px}')
        page.screenshot(path=str(tmp), clip={'x':60,'y':0,'width':1320,'height':693})
        browser.close()
    Image.open(tmp).convert('RGB').resize((1200,630), Image.Resampling.LANCZOS).save(ROOT/'assets/brand/og-global.jpg', quality=90)
    logo = Image.open(ROOT/'assets/icons/trailfusion-lockup.webp').convert('RGBA')
    logo.thumbnail((160,150), Image.Resampling.LANCZOS)
    touch = Image.new('RGBA',(180,180),'#fffdf7')
    touch.alpha_composite(logo,((180-logo.width)//2,(180-logo.height)//2))
    touch.convert('RGB').save(ROOT/'assets/icons/trailfusion-touch.png')
    print('English OG 1200x630 and brand touch icon 180x180 written.')
finally:
    server.shutdown()
