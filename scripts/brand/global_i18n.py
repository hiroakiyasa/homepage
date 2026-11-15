"""Static translations for the global app marketing pages. No runtime translation API."""
import json, re
from pathlib import Path
from bs4 import BeautifulSoup, Comment, Doctype

ROOT = Path(__file__).resolve().parents[2]
LOCALES = ROOT / 'scripts/brand/locales'
PAGES = ['index.html', 'apps.html', 'reelmake.html', 'voicelink.html', 'japanese-quest.html', 'eigo-quest.html', 'buddytalk.html', 'word-blaster.html', 'wood-golem.html', 'hacking-timer.html']
BRANDS = {'TrailFusion AI', 'TrailFusion', 'Reel Make', 'VoiceLink AI Translator', 'VoiceLink', 'BuddyTalk', 'Japanese Quest', 'English Quest', 'Gokaku Quest', 'Gokaku! Quest', 'Word Blaster', 'Wood Golem', 'Hacking Timer', 'hiroaki yuasa', 'App Store', 'Google Play', 'Android', 'iPhone & iPad', '© 2026 TrailFusion AI', 'JLPT', 'JFT-Basic'}
RUNTIME = ['Language', 'Automatic (browser language)', 'Showing {count} apps', 'Total page views (opens statistics)', 'Page views', 'Views unavailable']
ATTRS = ['alt', 'aria-label', 'title', 'placeholder']

def normal(value):
    return re.sub(r'\s+', ' ', str(value)).strip()

def eligible(value):
    value = normal(value)
    return bool(re.search('[A-Za-z]', value)) and value not in BRANDS and '@' not in value and not value.startswith(('http:', 'https:', 'mailto:'))

def text_nodes(soup):
    for node in soup.find_all(string=True):
        if isinstance(node, (Comment, Doctype)) or node.find_parent(['script', 'style', 'svg']):
            continue
        if eligible(node):
            yield node

def attr_nodes(soup):
    for tag in soup.find_all(True):
        for attr in ATTRS:
            if attr in tag.attrs and eligible(tag[attr]):
                yield tag, attr
        if tag.name == 'meta' and (tag.get('name') == 'description' or tag.get('property') in ('og:title', 'og:description')) and eligible(tag.get('content', '')):
            yield tag, 'content'

def ld_values(value):
    if isinstance(value, list):
        for entry in value:
            yield from ld_values(entry)
    elif isinstance(value, dict):
        for key, entry in value.items():
            if key in ('name', 'description', 'text') and isinstance(entry, str) and eligible(entry):
                yield normal(entry)
            elif isinstance(entry, (dict, list)):
                yield from ld_values(entry)

def source_strings():
    strings = set(RUNTIME)
    for page in PAGES:
        soup = BeautifulSoup((ROOT / 'en' / page).read_text(), 'html.parser')
        strings.update(normal(x) for x in text_nodes(soup))
        strings.update(normal(tag[attr]) for tag, attr in attr_nodes(soup))
        for block in soup.select('script[type="application/ld+json"]'):
            strings.update(ld_values(json.loads(block.string)))
    return sorted(strings)

def extract():
    LOCALES.mkdir(exist_ok=True)
    path=LOCALES/'en.json'
    values=json.loads(path.read_text()) if path.exists() else {}
    known=set(values.values())
    number=max([int(k[1:]) for k in values]+[0])
    for text in source_strings():
        if text not in known:
            number+=1;values[f't{number:03d}']=text;known.add(text)
    path.write_text(json.dumps(values,ensure_ascii=False,indent=2)+'\n')
    path=LOCALES/'headings.en.json'
    headings=json.loads(path.read_text()) if path.exists() else {}
    known=set(headings.values());number=max([int(k[1:]) for k in headings]+[0])
    for page in PAGES:
        soup=BeautifulSoup((ROOT/'en'/page).read_text(),'html.parser')
        for node in whole_nodes(soup):
            value=heading_value(node)
            if value not in known:
                number+=1;headings[f'h{number:03d}']=value;known.add(value)
    path.write_text(json.dumps(headings,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'body_keys':len(values),'heading_keys':len(headings),'existing_keys_preserved':True}))
    return values


BASE = 'https://trailfusionai.com'
LANGUAGES = [
    ('ja', '日本語', ''), ('en', 'English', 'en'),
    ('ar', 'العربية', 'ar'), ('ca', 'Català', 'ca'), ('hr', 'Hrvatski', 'hr'),
    ('cs', 'Čeština', 'cs'), ('da', 'Dansk', 'da'), ('nl', 'Nederlands', 'nl'),
    ('fi', 'Suomi', 'fi'), ('fr', 'Français', 'fr'), ('de', 'Deutsch', 'de'),
    ('el', 'Ελληνικά', 'el'), ('he', 'עברית', 'he'), ('hi', 'हिन्दी', 'hi'),
    ('hu', 'Magyar', 'hu'), ('id', 'Bahasa Indonesia', 'id'), ('it', 'Italiano', 'it'),
    ('ko', '한국어', 'ko'), ('ms', 'Bahasa Melayu', 'ms'), ('nb', 'Norsk bokmål', 'nb'),
    ('pl', 'Polski', 'pl'), ('pt', 'Português', 'pt-br'), ('ro', 'Română', 'ro'),
    ('ru', 'Русский', 'ru'), ('zh-Hans', '简体中文', 'zh-hans'), ('sk', 'Slovenčina', 'sk'),
    ('es', 'Español', 'es'), ('sv', 'Svenska', 'sv'), ('th', 'ไทย', 'th'),
    ('zh-Hant', '繁體中文', 'zh-hant'), ('tr', 'Türkçe', 'tr'), ('uk', 'Українська', 'uk'),
    ('vi', 'Tiếng Việt', 'vi'), ('ne', 'नेपाली', 'ne'), ('fil', 'Filipino', 'fil'),
]
INFO = {code: {'label': label, 'slug': slug, 'hreflang': 'tl' if code == 'fil' else code} for code, label, slug in LANGUAGES}
JA_PATHS = {p: '/' + p for p in PAGES}
JA_PATHS.update({'index.html': '/', 'japanese-quest.html': '/quest/courses/japanese/', 'eigo-quest.html': '/quest/courses/english/'})
OG_LOCALES = {'en':'en_US', 'ar':'ar_SA', 'ca':'ca_ES', 'hr':'hr_HR', 'cs':'cs_CZ', 'da':'da_DK', 'nl':'nl_NL', 'fi':'fi_FI', 'fr':'fr_FR', 'de':'de_DE', 'el':'el_GR', 'he':'he_IL', 'hi':'hi_IN', 'hu':'hu_HU', 'id':'id_ID', 'it':'it_IT', 'ko':'ko_KR', 'ms':'ms_MY', 'nb':'nb_NO', 'pl':'pl_PL', 'pt':'pt_BR', 'ro':'ro_RO', 'ru':'ru_RU', 'zh-Hans':'zh_CN', 'sk':'sk_SK', 'es':'es_ES', 'sv':'sv_SE', 'th':'th_TH', 'zh-Hant':'zh_TW', 'tr':'tr_TR', 'uk':'uk_UA', 'vi':'vi_VN', 'ne':'ne_NP', 'fil':'fil_PH', 'ja':'ja_JP'}

def page_url(locale, page):
    if locale == 'ja':
        return JA_PATHS[page]
    return '/' + INFO[locale]['slug'] + '/' + ('' if page == 'index.html' else page)

def default_url(page):
    return JA_PATHS[page] if page in ('index.html','apps.html') else page_url('en',page)

def heading_value(node):
    return re.sub(r'\s+([.,?!])', r'\1', normal(node.get_text(' ', strip=True)))

def whole_nodes(soup):
    nodes = soup.select('h1,h2,h3,p.d-catch')
    nodes += [p for p in soup.select('p') if p.get_text().startswith('Made by Hiroaki Yuasa')]
    return [n for n in nodes if len([s for s in n.strings if normal(s)]) > 1]

def load_dictionary(locale, filename=''):
    source_name = 'headings.en.json' if filename == 'headings.' else 'en.json'
    source = json.loads((LOCALES / source_name).read_text())
    target = json.loads((LOCALES / (filename + locale + '.json')).read_text())
    if set(target) != set(source):
        raise ValueError(f'{locale} {filename}: missing/extra translation keys: {set(source)^set(target)}')
    for key, value in target.items():
        if not isinstance(value, str) or not value.strip():
            raise ValueError(f'{locale} {filename}{key}: empty or non-string translation')
        if sorted(re.findall(r'\{[^{}]+\}', source[key])) != sorted(re.findall(r'\{[^{}]+\}', value)):
            raise ValueError(f'{locale} {filename}{key}: changed placeholders')
    return {normal(value): target[key] for key, value in source.items()}

def config(locale, page, translate, entry=False):
    return {
        'locale': locale,
        'entry': entry,
        'routes': {code: page_url(code, page) for code, _, _ in LANGUAGES},
        'languages': LANGUAGES,
        'counter': {
            'title': translate('Total page views (opens statistics)'),
            'alt': translate('Page views'),
            'unavailable': translate('Views unavailable'),
        },
    }

def picker_html(locale, page, translate):
    import html
    label = html.escape(translate('Language'), quote=True)
    rows = [f'<a href="{page_url(locale, page)}?lang=auto" data-global-language="auto">{html.escape(translate("Automatic (browser language)"))}</a>']
    for code, name, _ in LANGUAGES:
        current = ' aria-current="true"' if code == locale else ''
        link=page_url(code,page)+('?lang=ja' if code=='ja' else '')
        rows.append(f'<a href="{link}" hreflang="{INFO[code]["hreflang"]}" lang="{code}" dir="auto" data-global-language="{code}"{current}>{html.escape(name)}</a>')
    return (f'<details class="global-languages"><summary aria-label="{label}"><span aria-hidden="true">🌐</span><span>{html.escape(INFO[locale]["label"])}</span></summary>'
            f'<nav aria-label="{label}">{"".join(rows)}</nav></details>')

def add_locale_chrome(soup, locale, page, translate, entry=False):
    for old in soup.select('.global-languages'):
        old.decompose()
    for old in soup.select('.br-header-inner > a.lang'):
        old.decompose()
    header = soup.select_one('.br-header-inner')
    picker = BeautifulSoup(picker_html(locale, page, translate), 'html.parser').details
    menu = header.select_one('.br-menu')
    if menu:
        menu.insert_before(picker)
    else:
        header.append(picker)
    # Replace the former two-language mobile shortcut with the ordinary language menu.
    for old in soup.select('.br-menu a.lang'):
        old.decompose()
    for old in soup.select('link[rel="alternate"][hreflang]'):
        old.decompose()
    for code, _, _ in LANGUAGES:
        soup.head.append(soup.new_tag('link', rel='alternate', hreflang=INFO[code]['hreflang'], href=BASE+page_url(code,page)))
    soup.head.append(soup.new_tag('link', rel='alternate', hreflang='x-default', href=BASE+default_url(page)))
    for old in soup.select('#tf-global-locale'):
        old.decompose()
    data = soup.new_tag('script', type='application/json', id='tf-global-locale')
    data.string = json.dumps(config(locale,page,translate,entry),ensure_ascii=False,separators=(',',':')).replace('</','<\\/')
    soup.head.append(data)
    soup.head.append(soup.new_tag('link',rel='stylesheet',href='/assets/css/global-locales.css?v=20261115-1'))
    script = soup.new_tag('script', src='/assets/js/global-locale.js?v=20261115-1')
    script['defer'] = ''
    soup.head.append(script)

def rewrite_url(value, locale):
    from urllib.parse import urlsplit, urlunsplit
    url = urlsplit(value)
    if url.netloc and url.netloc != 'trailfusionai.com':
        return value
    for page in PAGES:
        if url.path == page_url('en',page):
            return urlunsplit((url.scheme,url.netloc,page_url(locale,page),url.query,url.fragment))
    return value

def translate_ld(value, locale, translate):
    if isinstance(value,list):
        return [translate_ld(x,locale,translate) for x in value]
    if not isinstance(value,dict):
        return value
    out={}
    for key,entry in value.items():
        if key == 'inLanguage':
            out[key] = locale
        elif isinstance(entry,str) and key in ('name','description','text'):
            out[key] = translate(entry)
        elif isinstance(entry,str) and key in ('url','@id'):
            out[key] = rewrite_url(entry,locale)
        elif isinstance(entry,(dict,list)):
            out[key] = translate_ld(entry,locale,translate)
        else:
            out[key] = entry
    return out

def render_page(source_html, locale, page, dictionary, headings):
    soup = BeautifulSoup(source_html,'html.parser')
    def tr(value):
        key=normal(value)
        if not eligible(key):
            return value
        if key not in dictionary:
            raise ValueError(f'{locale}/{page}: no translation key for {key!r}')
        return dictionary[key]
    whole = [(node,heading_value(node)) for node in whole_nodes(soup)]
    whole_ids = {id(node) for node,_ in whole}
    if locale != 'en':
        for node in list(text_nodes(soup)):
            if any(id(p) in whole_ids for p in node.parents):
                continue
            before=re.match(r'^\s*',str(node)).group()
            after=re.search(r'\s*$',str(node)).group()
            node.replace_with(before+tr(node)+after)
        for node,attribute in list(attr_nodes(soup)):
            node[attribute]=tr(node[attribute])
        for node,key in whole:
            if key not in headings:
                raise ValueError(f'{locale}/{page}: no whole-heading translation for {key!r}')
            node.clear()
            span=soup.new_tag('span',attrs={'class':'global-whole'})
            span.string=headings[key]
            node.append(span)
    soup.html['lang']=locale
    soup.html['dir']='rtl' if locale in ('ar','he') else 'ltr'
    soup.html['class']=['global-i18n']
    for node in soup.select('a[href]'):
        node['href']=rewrite_url(node['href'],locale)
    canonical=soup.select_one('link[rel="canonical"]')
    canonical['href']=BASE+page_url(locale,page)
    soup.select_one('meta[property="og:url"]')['content']=BASE+page_url(locale,page)
    soup.select_one('meta[property="og:locale"]')['content']=OG_LOCALES[locale]
    for block in soup.select('script[type="application/ld+json"]'):
        block.string=json.dumps(translate_ld(json.loads(block.string),locale,tr),ensure_ascii=False).replace('</','<\\/')
    counter=soup.select_one('[data-count]')
    if counter:
        counter['data-format']=tr('Apps')+': {count}'
    for script in soup.select('script[src]'):
        if script['src'].split('?')[0] in ('/assets/js/brand.js','/assets/js/visitor-counter.js'):
            script['src']=script['src'].split('?')[0]+'?v=20261115-global'
    add_locale_chrome(soup,locale,page,tr)
    return str(soup).rstrip()+'\n'

def install_japanese_entries():
    # Only navigation and language metadata on the two unprefixed entry pages change.
    # The Japanese content, Quest course pages and hobby pages remain untouched.
    translations={'Language':'言語','Automatic (browser language)':'自動（ブラウザの言語）','Total page views (opens statistics)':'このページの累計閲覧数（統計を開く）','Page views':'閲覧数','Views unavailable':'閲覧数を取得できません'}
    tr=lambda text: translations.get(text,text)
    for page in ('index.html','apps.html'):
        path=ROOT/page
        text=path.read_text()
        text=re.sub(r'<!-- global-i18n:start -->.*?<!-- global-i18n:end -->','',text,flags=re.S)
        text=re.sub(r'<link\b[^>]*rel=["\']alternate["\'][^>]*hreflang=["\'][^>]*>','',text)
        match=re.search(r'<header class="br-header">.*?</header>',text,re.S)
        header=BeautifulSoup(match.group(),'html.parser')
        for old in header.select('.global-languages, .br-header-inner > a.lang'):
            old.decompose()
        picker=BeautifulSoup(picker_html('ja',page,tr),'html.parser').details
        header.select_one('.br-menu').insert_before(picker)
        text=text[:match.start()]+str(header)+text[match.end():]
        links=''.join(f'<link rel="alternate" hreflang="{INFO[code]["hreflang"]}" href="{BASE+page_url(code,page)}">' for code,_,_ in LANGUAGES)
        links+=f'<link rel="alternate" hreflang="x-default" href="{BASE+default_url(page)}">'
        data=json.dumps(config('ja',page,tr,True),ensure_ascii=False,separators=(',',':')).replace('</','<\\/')
        block=(f'<!-- global-i18n:start -->{links}<link rel="stylesheet" href="/assets/css/global-locales.css?v=20261115-1">'
               f'<script id="tf-global-locale" type="application/json">{data}</script><script defer src="/assets/js/global-locale.js?v=20261115-1"></script><!-- global-i18n:end -->')
        text=text.replace('</head>',block+'</head>')
        path.write_text(text)
    # The eight existing Japanese detail pages need reciprocal alternates only.
    for page in PAGES:
        if page in ('index.html','apps.html'):
            continue
        relative=JA_PATHS[page]
        path=ROOT/relative.lstrip('/')
        if relative.endswith('/'):
            path=path/'index.html'
        text=path.read_text()
        text=re.sub(r'<!-- global-alternates:start -->.*?<!-- global-alternates:end -->','',text,flags=re.S)
        text=re.sub(r'<link\b[^>]*rel=["\']alternate["\'][^>]*hreflang=["\'][^>]*>','',text)
        links=''.join(f'<link rel="alternate" hreflang="{INFO[code]["hreflang"]}" href="{BASE+page_url(code,page)}">' for code,_,_ in LANGUAGES)
        links+=f'<link rel="alternate" hreflang="x-default" href="{BASE+default_url(page)}">'
        text=text.replace('</head>','<!-- global-alternates:start -->'+links+'<!-- global-alternates:end --></head>')
        path.write_text(text)

def write_sitemap(pages):
    path=ROOT/'sitemap.xml'
    text=path.read_text()
    text=re.sub(r'\s*<url><loc>https://trailfusionai.com/(?:en/fp-quest|eigo-quest)\.html</loc><lastmod>.*?</lastmod></url>','',text)
    for rel in pages:
        url=BASE+rel
        entry=f'<url><loc>{url}</loc><lastmod>2026-11-15</lastmod></url>'
        pattern=r'<url><loc>'+re.escape(url)+r'</loc><lastmod>.*?</lastmod></url>'
        if re.search(pattern,text):
            text=re.sub(pattern,lambda _:entry,text)
        else:
            text=text.replace('</urlset>','  '+entry+'\n</urlset>')
    path.write_text(text)

def render(only=None, install_entries=True):
    selected=[code for code,_,_ in LANGUAGES if code!='ja' and (only is None or code in only)]
    source={p:(ROOT/'en'/p).read_text() for p in PAGES}
    source_values=set(json.loads((LOCALES/'en.json').read_text()).values())
    missing=set(source_strings())-source_values
    if missing:
        raise ValueError(f'English source changed; add translations before publishing: {sorted(missing)}')
    generated=[]
    for locale in selected:
        dictionary=load_dictionary(locale)
        headings=load_dictionary(locale,'headings.')
        for page in PAGES:
            html=render_page(source[page],locale,page,dictionary,headings)
            dest=ROOT/INFO[locale]['slug']/page
            dest.parent.mkdir(parents=True,exist_ok=True)
            dest.write_text(html)
            generated.append(page_url(locale,page))
    if install_entries:
        install_japanese_entries()
    write_sitemap(generated)
    manifest={'version':'2026-11-15','languages':[{'code':code,**INFO[code]} for code,_,_ in LANGUAGES],
              'pages':PAGES,'japanese_paths':JA_PATHS,'generated':generated,'body_keys':len(json.loads((LOCALES/'en.json').read_text())),'heading_keys':len(json.loads((LOCALES/'headings.en.json').read_text())),
              'selection':'Explicit locale URL or choice, saved choice, browser languages, English. No IP or timezone inference.',
              'apps':{'reelmake':'6779420680','voicelink':'6746684736','quest':'6775411516','buddytalk':'6744263274'}}
    (ROOT/'docs/brand/global-locales.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'locales':len(selected),'pages':len(generated),'japanese_content':'English course links aligned; other content preserved'},ensure_ascii=False))
    return generated


if __name__ == '__main__':
    import sys
    if '--extract' in sys.argv:
        from build import new_pages
        new_pages(('en',))
        extract()
    else:
        from build import new_pages
        new_pages(('en',))
        chosen = sys.argv[sys.argv.index('--locales')+1].split(',') if '--locales' in sys.argv else None
        render(chosen)
