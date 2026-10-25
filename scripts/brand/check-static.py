"""Static checks for the TrailFusion brand site (stdlib only; runs in the deploy workflow).

- every new page exists, has one h1, the brand header/footer and valid JSON-LD
- every internal link and asset on the new pages and in the shared chrome resolves to a file
- retired locales only redirect, and nothing links to them
- every sitemap URL resolves to a file
Exit code 1 with a list of problems if anything fails.
"""
import json, re, sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote

ROOT = Path(__file__).resolve().parents[2]
BASE = 'https://trailfusionai.com'
NEW = ['index.html', 'en/index.html', 'apps.html', 'en/apps.html', 'about/index.html', 'garage/index.html']
RETIRED = ['zh-hans', 'ko', 'es', 'pt-br', 'fr', 'de', 'it', 'ru', 'tr', 'vi', 'th', 'hi', 'ar']
problems = []


class Links(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.refs, self.h1, self.ld, self._ld = [], 0, [], None

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'h1':
            self.h1 += 1
        for key in ('href', 'src', 'srcset'):
            value = a.get(key)
            if value and not (tag == 'link' and a.get('rel') in ('preconnect', 'canonical', 'alternate')):
                self.refs.append(value.split(' ')[0])
        if tag == 'script' and a.get('type') == 'application/ld+json':
            self._ld = ''

    def handle_data(self, data):
        if self._ld is not None:
            self._ld += data

    def handle_endtag(self, tag):
        if tag == 'script' and self._ld is not None:
            self.ld.append(self._ld)
            self._ld = None


def target(path):
    p = ROOT / unquote(path).lstrip('/')
    return p / 'index.html' if path.endswith('/') or p.is_dir() else p


def check_page(rel):
    text = (ROOT / rel).read_text(encoding='utf-8')
    parser = Links()
    parser.feed(text)
    if parser.h1 != 1:
        problems.append(f'{rel}: {parser.h1} h1 elements')
    if text.count('class="br-header"') != 1 or text.count('class="br-footer"') != 1:
        problems.append(f'{rel}: brand header/footer missing or duplicated')
    for block in parser.ld:
        try:
            json.loads(block)
        except ValueError as e:
            problems.append(f'{rel}: invalid JSON-LD {e}')
    for ref in parser.refs:
        u = urlsplit(ref)
        if u.scheme in ('mailto', 'tel', 'data') or ref.startswith('#'):
            continue
        if u.netloc and u.netloc != 'trailfusionai.com':
            continue
        if any(u.path.startswith(f'/{r}/') for r in RETIRED):
            problems.append(f'{rel}: links to retired locale {ref}')
        if not target(u.path or '/').is_file():
            problems.append(f'{rel}: missing target {ref}')


for rel in NEW:
    check_page(rel)
for rel in ['support/index.html', '404.html', 'diy/index.html', 'en/diy/index.html', 'car-concierge.html']:
    text = (ROOT / rel).read_text(encoding='utf-8')
    if 'class="br-header"' not in text or 'tf-header' in text:
        problems.append(f'{rel}: older page still has the old header')
for d in RETIRED:
    for f in (ROOT / d).rglob('*.html'):
        if 'http-equiv="refresh"' not in f.read_text():
            problems.append(f'{f.relative_to(ROOT)}: retired locale is not a redirect')
for url in re.findall(r'<loc>(.*?)</loc>', (ROOT / 'sitemap.xml').read_text()):
    if not target(urlsplit(url).path or '/').is_file():
        problems.append(f'sitemap: missing {url}')
home = (ROOT / 'index.html').read_text()
for marker in ('毎日に、', 'href="/quest/"', 'href="/garage/"', 'もちのへや', '車旅コンシェルジュ', 'Reel Make', 'VoiceLink'):
    if marker not in home:
        problems.append(f'index.html: missing {marker}')
hero = home[home.find('<section class="hero"'):home.find('</section>', home.find('<section class="hero"'))]
if 'ハイエース' in hero or 'DIY' in hero:
    problems.append('index.html: hobby content is back in the hero')

if problems:
    print('\n'.join(problems))
    sys.exit(1)
print(f'brand static checks passed ({len(NEW)} pages, sitemap, retired locales)')
