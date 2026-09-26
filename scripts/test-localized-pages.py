#!/usr/bin/env python3
"""Offline browser checks for static locales, menus and locale selection."""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
import functools, json, re
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
LOCALES={'ja':'','en':'en','zh-Hans':'zh-hans','ko':'ko','es':'es','pt-BR':'pt-br','fr':'fr','de':'de','it':'it','ru':'ru','tr':'tr','vi':'vi','th':'th','hi':'hi','ar':'ar'}
class Handler(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT)))
Thread(target=server.serve_forever,daemon=True).start()
BASE=f'http://127.0.0.1:{server.server_port}'
OUT=ROOT/'reports/localization-screenshots';OUT.mkdir(parents=True,exist_ok=True)
results=[]
def text_nodes(page):
    return page.evaluate("""() => {const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n,out=[];while(n=w.nextNode()){if(!n.parentElement.closest('script,style,.tf-page-language')&&n.textContent.trim())out.push(n.textContent.trim())}return out}""")
def offline(route):
    if route.request.url.startswith(BASE):route.continue_()
    else:route.fulfill(status=204,body='')
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True)
        for lang,slug in LOCALES.items():
            for width in (390,1280):
                ctx=browser.new_context(viewport={'width':width,'height':844},locale='ja-JP',timezone_id='Asia/Tokyo')
                ctx.route('**/*',offline);page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
                url=BASE+('/'+slug if slug else '')+'/apps.html'
                response=page.goto(url,wait_until='domcontentloaded');page.wait_for_selector('#tf-page-language')
                assert response.status==200
                assert page.locator('html').get_attribute('lang')==lang
                assert page.locator('#tf-page-language option').count()==16
                words=text_nodes(page)
                pattern=r'[\u3041-\u3096\u30a1-\u30fa\u30fc]' if lang=='zh-Hans' else r'[\u3041-\u3096\u30a1-\u30fa\u30fc\u3400-\u9fff]'
                leftovers=[t for t in words if re.search(pattern,t)] if lang!='ja' else []
                assert not leftovers,(lang,leftovers)
                size=page.evaluate('({w:innerWidth,s:document.documentElement.scrollWidth})')
                assert size['s']<=size['w']+1,(lang,width,size)
                for sel in ('#tf-page-language','#burger'):
                    box=page.locator(sel).bounding_box()
                    if box: assert box['x'] >= -1 and box['x']+box['width'] <= width+1, (lang,width,sel,box)
                if width==390:
                    page.locator('#burger').click()
                    assert page.locator('#burger').get_attribute('aria-expanded')=='true'
                    d=json.loads((ROOT/f'assets/i18n/apps/{lang}.json').read_text())
                    assert page.locator('#burger').get_attribute('aria-label')==d['メニューを閉じる']
                    page.keyboard.press('Escape')
                    assert page.locator('#burger').get_attribute('aria-expanded')=='false'
                if width==390 and lang in ('ja','en','ar'):
                    page.screenshot(path=str(OUT/f'apps-{lang}-mobile.png'))
                assert not errors,(lang,errors)
                results.append({'locale':lang,'width':width,'status':'PASS','japanese_leftovers':0,'menu':width==390})
                print('PASS',lang,width,flush=True);ctx.close()
        for lang,slug in LOCALES.items():
            ctx=browser.new_context(viewport={'width':390,'height':844},locale='ja-JP',timezone_id='Asia/Tokyo')
            ctx.route('**/*',offline);page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
            for section in ('diy','maintenance','travel'):
                response=page.goto(BASE+('/'+slug if slug else '')+'/'+section+'/',wait_until='domcontentloaded')
                page.wait_for_selector('#tf-page-language')
                assert response.status==200
                assert page.locator('html').get_attribute('lang')==lang
                pattern=r'[\u3041-\u3096\u30a1-\u30fa\u30fc]' if lang=='zh-Hans' else r'[\u3041-\u3096\u30a1-\u30fa\u30fc\u3400-\u9fff]'
                leftovers=[t for t in text_nodes(page) if re.search(pattern,t)] if lang!='ja' else []
                assert not leftovers,(lang,section,leftovers)
                size=page.evaluate('({w:innerWidth,s:document.documentElement.scrollWidth})')
                assert size['s']<=size['w']+1,(lang,section,size)
                box=page.locator('#tf-page-language').bounding_box()
                assert box and box['x']>=-1 and box['x']+box['width']<=391,(lang,section,box)
                summary=page.locator('.tf-mobile-menu summary')
                summary.click();assert page.locator('.tf-mobile-menu').get_attribute('open') is not None
                page.keyboard.press('Escape');assert page.locator('.tf-mobile-menu').get_attribute('open') is None
                if lang in ('en','ar'):page.screenshot(path=str(OUT/f'{section}-{lang}-mobile.png'))
                assert not errors,(lang,section,errors)
                results.append({'locale':lang,'page':section,'width':390,'status':'PASS','japanese_leftovers':0})
                print('PASS HUB',lang,section,flush=True)
            ctx.close()
        cases=[('Japan','Asia/Tokyo','en-US','ja'),('US','America/New_York','ja-JP','en'),('France','Europe/Paris','en-US','fr'),('Brazil','America/Sao_Paulo','en-US','pt-BR'),('UAE','Asia/Dubai','en-US','ar')]
        for name,zone,locale,expected in cases:
            ctx=browser.new_context(locale=locale,timezone_id=zone);ctx.route('**/*',offline);page=ctx.new_page()
            page.goto(BASE+'/apps.html?utm_source=qa#study',wait_until='domcontentloaded');page.wait_for_selector('#tf-page-language')
            assert page.locator('html').get_attribute('lang')==expected,(name,page.url)
            assert 'utm_source=qa' in page.url and page.url.endswith('#study')
            results.append({'scenario':name,'locale':expected,'status':'PASS'});ctx.close()
        ctx=browser.new_context(locale='ja-JP',timezone_id='Asia/Tokyo');ctx.route('**/*',offline);page=ctx.new_page()
        page.goto(BASE+'/apps.html',wait_until='domcontentloaded');page.wait_for_selector('#tf-page-language')
        page.select_option('#tf-page-language','en');page.wait_for_url('**/en/apps.html');page.wait_for_selector('#tf-page-language')
        assert page.locator('html').get_attribute('lang')=='en'
        page.goto(BASE+'/apps.html',wait_until='domcontentloaded');page.wait_for_url('**/en/apps.html');page.wait_for_selector('#tf-page-language')
        page.select_option('#tf-page-language','auto');page.wait_for_url(BASE+'/apps.html');page.wait_for_selector('#tf-page-language')
        assert page.locator('html').get_attribute('lang')=='ja'
        results.append({'scenario':'manual choice, persistence and automatic reset','status':'PASS'});ctx.close()
        ctx=browser.new_context(java_script_enabled=False);ctx.route('**/*',offline);page=ctx.new_page()
        page.goto(BASE+'/en/apps.html',wait_until='domcontentloaded')
        assert 'Ten apps.' in page.locator('h1').inner_text()
        results.append({'scenario':'English content without JavaScript','status':'PASS'});ctx.close()
        ctx=browser.new_context(locale='ja-JP',timezone_id='Asia/Tokyo');ctx.route('**/*',offline);page=ctx.new_page()
        page.goto(BASE+'/en/',wait_until='domcontentloaded');page.wait_for_selector('#tf-home-language')
        links=page.locator('a[href="/en/apps.html"]')
        assert links.count()>0,'Localized homepage did not link to localized apps'
        links.first.click();page.wait_for_url('**/en/apps.html');page.wait_for_selector('#tf-page-language')
        assert page.locator('html').get_attribute('lang')=='en'
        results.append({'scenario':'English home to English apps in Japanese browser','status':'PASS'});ctx.close()
        browser.close()
finally:
    server.shutdown();server.server_close()
(ROOT/'reports/localization-browser.json').write_text(json.dumps({'checks':len(results),'results':results},ensure_ascii=False,indent=2)+'\n')
print('ALL PASS',len(results))
