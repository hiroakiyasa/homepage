"""Keep Japanese English-course acquisition consistent without rebuilding unrelated content."""
import json,re
from bs4 import BeautifulSoup
from brandsite import ROOT,BASE,BY,APPS,LIVE,icon
from pages import app_card

DEST='/quest/courses/english/'

def legacy_redirect():
    (ROOT/'eigo-quest.html').write_text(
        '<!doctype html>\n<html lang="ja"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1">'
        '<title>English Quest｜合格！クエストの英語教材</title>'
        '<meta name="robots" content="noindex,follow">'
        f'<link rel="canonical" href="{BASE+DEST}"><meta http-equiv="refresh" content="0; url={DEST}">'
        f'<script>location.replace({json.dumps(DEST)}+location.search+location.hash);</script>'
        '</head><body><p>English Questは合格！クエスト内の英語教材です。'
        f'<a href="{DEST}">英語教材の紹介を見る</a>。</p></body></html>\n'
    )

def refresh():
    legacy_redirect()
    for filename in ('index.html','apps.html'):
        path=ROOT/filename;text=path.read_text()
        if filename=='apps.html':
            text,n=re.subn(r'<article class="app-card" id="english-quest".*?</article>',
                          lambda _:app_card(BY['english-quest'],'ja'),text,flags=re.S)
            if n!=1:raise ValueError('Expected exactly one Japanese English course card')
            main=[a for a in APPS if a['group'] in ('main','course')]
            def chip(match):
                fragment=BeautifulSoup(match.group(),'html.parser')
                button=fragment.button;category=button['data-filter']
                chosen=[a for a in main if category=='all' or a['cat']==category]
                button.small.string=str(len({a.get('parent',a['slug']) for a in chosen}))
                return str(button)
            text=re.sub(r'<button\b[^>]*data-filter="[^"]+"[^>]*>.*?</button>',chip,text,flags=re.S)
        else:
            def mini(match):
                fragment=BeautifulSoup(match.group(),'html.parser');a=fragment.a
                a['href']=DEST
                a.find('p').string=BY['english-quest']['tag_ja']
                a.find('img').replace_with(BeautifulSoup(icon('english-quest','ja','mini-icon'),'html.parser').img)
                return str(a)
            text,n=re.subn(r'<a class="mini" href="(?:/eigo-quest.html|/quest/courses/english/)"[^>]*>.*?</a>',mini,text,flags=re.S)
            if n!=1:raise ValueError('Expected exactly one Japanese English course shortcut')
            text=re.sub(r'(<dt>公開中のアプリ</dt><dd>)\d+(</dd>)',lambda m:m[1]+str(len(LIVE))+m[2],text)
        # Remove the historical standalone app from structured data only.
        def schema(match):
            graph=json.loads(match[1])
            if '@graph' in graph:
                graph['@graph']=[x for x in graph['@graph'] if not ('6782028599' in x.get('downloadUrl',''))]
            return '<script type="application/ld+json">'+json.dumps(graph,ensure_ascii=False)+'</script>'
        text=re.sub(r'<script type="application/ld\+json">(.*?)</script>',schema,text,flags=re.S)
        text=re.sub(r'公開中の\d+本',f'公開中の{len(LIVE)}本',text)
        text=re.sub(r'/assets/js/brand\.js\?v=[^"\']+', '/assets/js/brand.js?v=20261115-global',text)
        path.write_text(text)
