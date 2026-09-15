"""One-time migration refinements; generated sources are committed after validation."""
from pathlib import Path
p=Path('scripts/site-redesign/build.py');s=p.read_text()
if 'contenthead=oldhead.extract();oldhead=None' not in s:
    s=s.replace("oldhead=soup.find('tf-lp-header') or soup.find('header')", "oldhead=soup.find('tf-lp-header') or soup.select_one('.site-head') or soup.find('header')\n    contenthead=None\n    if legal and oldhead and oldhead.find('h1'):\n        contenthead=oldhead.extract();oldhead=None\n    if oldhead:\n        for control in list(oldhead.select('select, #language-selector, #mobile-language-selector')):\n            if control.get('id') not in ['rm-lang']:\n                extra+=str(control.extract())")
    s=s.replace("for child in list(soup.body.contents):inner.append(child.extract())", "if contenthead:inner.append(contenthead)\n        for child in list(soup.body.contents):inner.append(child.extract())")
s=s.replace("+extra+'</nav><details class=\"tf-mobile-menu\"><summary>", "+'</nav>'+('<div class=\"tf-extra\">'+extra+'</div>' if extra else '')+'<details class=\"tf-mobile-menu\"><summary>")
s=s.replace("'<small>{b}</small>","'<small>{b}</small>")
s=s.replace("{b}</small></a>' for key,url,a,b in hubs", "{b if key!='diy' else '<span class=\"tf-desktop-label\">キャンピングカーDIY</span><span class=\"tf-mobile-label\">キャンパーDIY</span>'}</small></a>' for key,url,a,b in hubs")
# Avoid nested f-string quotation issues in Python 3.12 by using preformatted label values.
s=s.replace("{b if key!='diy' else '<span class=\"tf-desktop-label\">キャンピングカーDIY</span><span class=\"tf-mobile-label\">キャンパーDIY</span>'}", "{b}")
s=s.replace("('diy','/diy/','つくる','キャンピングカーDIY')", "('diy','/diy/','つくる','<span class=\"tf-desktop-label\">キャンピングカーDIY</span><span class=\"tf-mobile-label\">キャンパーDIY</span>')")
s=s.replace('理科・社会・国語を、クイズとわかりやすい解説で。<br>', '理科・社会・国語を、クイズと解説で。<br>')
s=s.replace("home=s.select_one('.brand')", "home=s.select_one('.logo')")
s=s.replace("home['href']='/travel/'", "home['href']='/travel/'\n    for navlink in s.select('.topbar a.ghost-btn'):\n        if navlink.get('href')=='../index.html':navlink['href']='/travel/';navlink.string='← 車旅トップ'")
# App-aware metadata for retained product pages (not legal documents).
anchor="    if app and app.get('apple'):\n        graph.append("
if 'retained_app_names=' not in s:
    insertion="""    retained_app_names={'car-concierge.html':('車旅コンシェルジュ','TravelApplication'),'reelmake.html':('Reel Make','MultimediaApplication'),'buddytalk.html':('BuddyTalk','EducationalApplication'),'wood-golem.html':('Wood Golem','GameApplication'),'word-blaster.html':('Word Blaster','GameApplication')}
    if app is None and path in retained_app_names:
        store=next((a.get('href') for a in soup.select('a[href]') if 'apps.apple.com/' in a.get('href','')),None)
        if store:
            aid=re.search(r'id(\\d+)',store)
            if aid:
                store='https://apps.apple.com/jp/app/id'+aid.group(1)
                graph.append({'@type':'SoftwareApplication','name':retained_app_names[path][0],'url':url,'description':description,'applicationCategory':retained_app_names[path][1],'publisher':{'@id':ORG['@id']},'operatingSystem':'iOS','installUrl':store,'sameAs':[store]})
                for el in soup.find_all('meta',attrs={'name':'apple-itunes-app'}):el.decompose()
                head.append(soup.new_tag('meta',attrs={'name':'apple-itunes-app','content':'app-id='+aid.group(1)}))
    if app and app.get('apple'):
        for el in soup.find_all('link',rel='icon'):el.decompose()
        head.append(soup.new_tag('link',rel='icon',href='/'+app['logo'].lstrip('/')))
        graph.append("""
    s=s.replace(anchor,insertion)
s=s.replace('<link rel="icon" href="/assets/images/rika-quest/rika-quest-logo.png">','<link rel="icon" href="/assets/icons/trailfusion.svg" type="image/svg+xml">')
s=s.replace("build_new();build_preserved();og_images();machine_files();docs()", "write('assets/icons/trailfusion.svg','<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\"><rect width=\"64\" height=\"64\" rx=\"18\" fill=\"#172b3a\"/><path d=\"M12 19h25v5H27v24h-5V24H12zm27 0h17v5H44v8h10v5H44v11h-5z\" fill=\"white\"/></svg>')\nbuild_new();build_preserved();og_images();machine_files();docs()")
s=s.replace("lines.append('  <url><loc>'+esc(u)+'</loc><lastmod>'+DATE+'</lastmod></url>')", "modified=DATE if u in {DOMAIN+'/'+p.removesuffix('index.html') for p in paths if p.endswith('.html')} else olddates.get(u,DATE)\n        lines.append('  <url><loc>'+esc(u)+'</loc><lastmod>'+modified+'</lastmod></url>')")
p.write_text(s)
p=Path('scripts/site-redesign/validate.py');s=p.read_text()
s=s.replace("tab.fill('#record-date','2026-09-16')", "tab.fill('#record-date',tab.locator('#record-date').get_attribute('max'))")
s=s.replace("tab.screenshot(path=str(OUT/'screenshots/camping-interactive-1440.png'),full_page=True,animations='disabled')", "tab.screenshot(path=str(OUT/'screenshots/camping-interactive-1440.png'),full_page=False,animations='disabled',timeout=60000)")
# Save structure and interactions first; screenshots never enlarge the live WebGL canvas.
if 'Legacy language selector works' not in s:
    insertion="""    context=browser.new_context(viewport={'width':390,'height':900},locale='ja-JP',reduced_motion='reduce')
    tab=context.new_page();legacy_errors=[];tab.on('pageerror',lambda e:legacy_errors.append(str(e)))
    for p in report['preservation']:
        if p in ['camping.html','maintenance.html']:continue
        legacy_errors.clear()
        try:
            tab.goto(origin+p,wait_until='domcontentloaded',timeout=30000);tab.wait_for_timeout(400)
            check(not legacy_errors,p+': retained page JavaScript '+str(legacy_errors))
            check(tab.locator('.tf-header .tf-hubs a').count()==4,p+': four visible section entrances')
            if tab.locator('#languageSelector').count():
                tab.select_option('#languageSelector','en');tab.wait_for_timeout(50)
                check(not legacy_errors,p+': Legacy language selector works')
            if p in ['car-concierge.html','camping-guide.html','reelmake.html','buddytalk.html','eigo-quest-terms.html']:
                tab.screenshot(path=str(OUT/'screenshots'/f'legacy-{p.replace("/","_")}-390.png'),full_page=False,animations='disabled')
        except Exception as e:errors.append(p+': legacy browser '+str(e)[:240])
    context.close()
    """
    s=s.replace("    # No-JavaScript crawlability and fallback.\n",insertion+"# No-JavaScript crawlability and fallback.\n")
p.write_text(s)
p=Path('assets/css/site-v2.css');s=p.read_text()
s=s.replace("'Yu Gothic',Meiryo", "'Yu Gothic','Noto Sans CJK JP',Meiryo")
extra='''\n/* Retained language controls remain usable on both phone and desktop. */\n.tf-header{height:auto!important;padding:0!important;min-height:0!important}.tf-extra{display:flex;align-items:center;gap:8px;margin-left:auto}.tf-extra select{max-width:135px;min-height:38px;border:1px solid #dce4e8;border-radius:8px;background:#fff;color:#172b3a;font:12px/1.5 sans-serif;padding:5px}.tf-extra #language-selector{display:block!important}.tf-extra #mobile-language-selector{display:none!important}.tf-local-links{position:relative;z-index:2}.tf-final .tf-store-note{color:#d2dee9}.tf-final .tf-button.secondary{background:white}.tf-legal-content>header{position:static}.tf-footer .tf-brand{color:#172b3a}.tf-mobile-label{display:none}\n@media(max-width:760px){.tf-header:has(.tf-extra) .tf-brand{font-size:14px;gap:7px}.tf-header:has(.tf-extra) .tf-brand-mark{width:27px;height:27px;font-size:13px}.tf-extra{max-width:112px}.tf-extra select{max-width:100px}.tf-extra a{display:none}.tf-header:has(.tf-extra) .tf-top{gap:8px}.tf-extra #language-selector{font-size:11px}.tf-desktop-label{display:none}.tf-mobile-label{display:inline}}\n'''
if 'Retained language controls remain usable' not in s:s+=extra
p.write_text(s)
