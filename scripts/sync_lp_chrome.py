#!/usr/bin/env python3
"""Reuse LP logo, header and footer without modifying page content or 3D scripts."""
from pathlib import Path
import argparse, hashlib, json, re
from bs4 import BeautifulSoup
import tinycss2
MARK='lp-navigation-20260908'
NAV_CSS='''
/* LP navigation: direct camping access without hiding existing destinations. */
.site-nav{gap:clamp(.65rem,1.2vw,1.1rem)}
.site-head .in{gap:clamp(.65rem,1.2vw,1.2rem)}
.site-nav .nav-camping{padding:.4rem .8rem;background:var(--blue-l,#dcebfc);border:1px solid #b8d4f6;border-radius:999px;font-weight:700;color:var(--blue,#1273e6)}
.site-nav .nav-camping[aria-current=page]{background:var(--blue,#1273e6);color:white}
.mobile-camping-link{display:none;align-items:center;justify-content:center;white-space:nowrap;padding:.45rem .65rem;border-radius:999px;color:#1273e6;background:#edf6ff;border:1px solid #bad6f6;text-decoration:none;font:700 12px/1.4 system-ui,-apple-system,'Hiragino Sans',sans-serif;min-height:36px;margin-left:auto}
@media(max-width:1120px){.site-nav,.head-sns,.head-cta{display:none!important}.burger{display:grid}.mobile-camping-link{display:inline-flex}.drawer{overflow-y:auto;justify-content:flex-start;padding-top:clamp(1.2rem,6vh,4rem)}}
@media(min-width:1121px){.drawer{display:none!important}}
@media(max-width:360px){.site-head .in{padding-inline:12px;gap:8px}.mobile-camping-link{font-size:11px;padding-inline:8px}.brandlink .lockup{height:30px}}
'''
RESET='''
:host{display:block;color:#12243a;font-family:'Zen Kaku Gothic New',system-ui,-apple-system,'Hiragino Sans',sans-serif;font-size:16px;line-height:1.9;-webkit-font-smoothing:antialiased;line-break:strict;word-break:normal;overflow-wrap:anywhere}
*,*::before,*::after{box-sizing:border-box}img{max-width:100%;display:block}button{font:inherit}h1,h2,h3,h4{font-family:'Zen Maru Gothic',system-ui,sans-serif;margin:0;text-wrap:balance;font-weight:900;letter-spacing:.01em}p,li{text-wrap:pretty}a:focus-visible,button:focus-visible{outline:3px solid #1273e6;outline-offset:3px}
'''
HOST_CSS='''
tf-lp-header{display:block;position:sticky;top:0;z-index:100;height:64px;background:#fff}
tf-lp-footer{display:block;background:#fff}
@media(max-width:900px){tf-lp-header{height:58px}}
#hiace-atelier .hero-stage{height:calc(100svh - var(--tf-site-header-height,64px) - 168px)}
#hiace-atelier.expanded{z-index:200}
@media(max-width:767px){#hiace-atelier .hero-stage{height:calc(100svh - var(--tf-site-header-height,58px) - 155px)}}
.tf-preserved-counter{position:relative;display:flex;justify-content:flex-end;align-items:center;padding:7px 4%;min-height:34px;background:#f1f7fe}
.tf-preserved-counter a{position:static!important;display:inline-flex;align-items:center;gap:7px;font:700 11px/1.2 system-ui,sans-serif;text-decoration:none;color:#123a6b;border:1px solid #c7dffa;border-radius:999px;padding:4px 9px;background:white}
.tf-preserved-counter img{height:16px;width:auto;display:block}.tf-preserved-counter b{color:#1273e6;font-size:10px}
'''
RUNTIME=r'''
(() => {
  'use strict';
  document.querySelectorAll('tf-lp-header,tf-lp-footer').forEach(host => {
    if (!host.shadowRoot) {
      const template=host.querySelector('template');
      if(template)host.attachShadow({mode:'open'}).append(template.content.cloneNode(true));
    }
    const root=host.shadowRoot;if(!root)return;
    if(location.protocol==='file:')root.querySelectorAll('a[href]').forEach(a=>{
      const v=a.getAttribute('href');if(v&&!/^(?:[a-z]+:|#|\/\/)/i.test(v))a.href=new URL(v,'https://trailfusionai.com/').href;
    });
    const button=root.getElementById('burger'),menu=root.getElementById('drawer');
    if(!button||!menu)return;
    let previousOverflow='';
    const close=(focus=false)=>{
      if(button.getAttribute('aria-expanded')==='true')document.body.style.overflow=previousOverflow;
      button.setAttribute('aria-expanded','false');button.setAttribute('aria-label','メニューを開く');
      menu.classList.remove('open');menu.setAttribute('inert','');menu.setAttribute('aria-hidden','true');
      if(focus)button.focus();
    };
    const open=()=>{
      previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
      button.setAttribute('aria-expanded','true');button.setAttribute('aria-label','メニューを閉じる');
      menu.classList.add('open');menu.removeAttribute('inert');menu.setAttribute('aria-hidden','false');
      menu.querySelector('a')?.focus();
    };
    close();button.addEventListener('click',()=>button.getAttribute('aria-expanded')==='true'?close(true):open());
    root.addEventListener('click',e=>{if(e.target.closest('a[href]'))close();});
    root.addEventListener('keydown',e=>{
      if(button.getAttribute('aria-expanded')!=='true')return;
      if(e.key==='Escape'){e.preventDefault();close(true);}
      if(e.key==='Tab'){
        const items=[button,...menu.querySelectorAll('a[href]')],i=items.indexOf(root.activeElement);
        if(e.shiftKey&&i<=0){e.preventDefault();items.at(-1).focus();}
        else if(!e.shiftKey&&i===items.length-1){e.preventDefault();items[0].focus();}
      }
    });
    matchMedia('(min-width:1121px)').addEventListener('change',e=>{if(e.matches)close();});
    const measure=()=>document.documentElement.style.setProperty('--tf-site-header-height',host.getBoundingClientRect().height+'px');
    if(window.ResizeObserver)new ResizeObserver(measure).observe(host);measure();
  });
  // Preserve the old counter identity; do not mount a second badge or reset a count.
  const badge=document.querySelector('.tf-preserved-counter img');
  if(badge)badge.addEventListener('error',()=>{badge.hidden=true;badge.closest('a').title='訪問数サービスに接続できません。集計キーは従来のままです。';});
  window.TrailFusionLPChrome={version:'1.0.0',source:'index.html',counterKey:'trailfusionai.com/camping'};
})();
'''
def raw_node(source,node):
    if node is None:raise ValueError('Required LP element is missing')
    lines=source.splitlines(keepends=True)
    start=sum(map(len,lines[:node.sourceline-1]))+node.sourcepos
    text=source[start:];tag=node.name;depth=0
    for match in re.finditer(r'<(/?)'+re.escape(tag)+r'\b[^>]*>',text,re.I):
        depth+= -1 if match[1] else (0 if match[0].endswith('/>') else 1)
        if depth==0:return source[start:start+match.end()]
    raise ValueError('Unclosed '+tag)
def nodes(source):return BeautifulSoup(source,'html.parser')
def add_navigation(source):
    soup=nodes(source)
    for selector,label in [('.site-nav','キャンピングカーDIY'),('#drawer','キャンピングカーDIY<i>Camper DIY</i>')]:
        node=soup.select_one(selector);old=raw_node(source,node)
        if node.select_one('a[href="camping.html"]'):continue
        link='<a href="camping.html" class="nav-camping">'+label+'</a>\n'
        new=old[:old.rfind('</nav>')]+link+old[old.rfind('</nav>'):]
        source=source.replace(old,new,1);soup=nodes(source)
    if 'class="mobile-camping-link"' not in source:
        b=soup.select_one('#burger');old=raw_node(source,b)
        source=source.replace(old,'<a href="camping.html" class="mobile-camping-link">キャンピングカーDIY</a>\n    '+old,1)
    if 'id="'+MARK+'"' not in source:
        source=source.replace('</style>','</style>\n<style id="'+MARK+'">'+NAV_CSS+'</style>',1)
    return source

def chrome_css(source):
    soup=nodes(source)
    keep=re.compile(r'\.(?:site-head|site-nav|brandlink|head-cta|head-sns|burger|drawer|mobile-camping-link|site-foot|foot-[\w-]+|socials|sns[\w-]*|wrap)\b|:root')
    def filter_rules(rules):
        result=[]
        for r in rules:
            if r.type=='qualified-rule':
                selectors=tinycss2.serialize(r.prelude).strip().split(',')
                selectors=[s.strip() for s in selectors if keep.search(s)]
                if selectors:result.append(','.join(selectors).replace(':root',':host')+'{'+tinycss2.serialize(r.content)+'}')
            elif r.type=='at-rule' and r.lower_at_keyword in ('media','supports') and r.content is not None:
                body=filter_rules(tinycss2.parse_rule_list(r.content,skip_whitespace=True,skip_comments=True))
                if body:result.append('@'+r.lower_at_keyword+' '+tinycss2.serialize(r.prelude).strip()+'{'+body+'}')
        return '\n'.join(result)
    css=filter_rules(tinycss2.parse_stylesheet('\n'.join(s.get_text() for s in soup.find_all('style')),skip_comments=True,skip_whitespace=True))
    return RESET+css+'\n.site-head{position:relative;top:auto;left:auto;right:auto}.drawer{z-index:102;max-height:calc(100dvh - var(--hd));overflow-y:auto}'+NAV_CSS

def adapt_links(markup):
    markup=re.sub(r'href="(#[^"]*)"',lambda m:'href="index.html'+m[1]+'"',markup)
    return re.sub(r'(<a\b[^>]*href="camping.html")',r'\1 aria-current="page"',markup)
def script_hashes(source):
    return {m[1]:hashlib.sha256(m[2].encode()).hexdigest() for m in re.finditer(r'<script\b[^>]*id="(hiace-[^"]+)"[^>]*>([\s\S]*?)</script>',source)}

def integrate(index,camping):
    soup=nodes(index);css=chrome_css(index)
    header=raw_node(index,soup.select_one('.site-head'))
    drawer=raw_node(index,soup.select_one('#drawer'))
    footer=raw_node(index,soup.select_one('.site-foot'))
    grad=soup.find(id='ig-grad');gradient=raw_node(index,grad.find_parent('svg')) if grad else ''
    header,drawer,footer=map(adapt_links,(header,drawer,footer))
    def wrap(tag,html):return '<'+tag+'><template shadowrootmode="open"><style>'+css+'</style>'+gradient+html+'</template></'+tag+'>'
    before=script_hashes(camping)
    camping=re.sub(r'<script\b[^>]*id="(?:camping-site-chrome|lp-site-chrome-runtime)"[^>]*>[\s\S]*?</script>','',camping)
    camping=re.sub(r'<style\b[^>]*id="lp-chrome-host"[^>]*>[\s\S]*?</style>','',camping)
    target=nodes(camping)
    for selector,tag,html in [('tf-lp-header, header.site-header, body > header','tf-lp-header',header+drawer),('tf-lp-footer, footer.site-footer, body > footer','tf-lp-footer',footer)]:
        node=target.select_one(selector);old=raw_node(camping,node)
        camping=camping.replace(old,wrap(tag,html),1);target=nodes(camping)
    camping=re.sub(r"<script>document\.getElementById\('year'\)\.textContent = new Date\(\)\.getFullYear\(\);</script>",'',camping)
    font='https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@500;700;900&family=Zen+Kaku+Gothic+New:wght@400;500;700;900&display=swap'
    if font not in camping:camping=camping.replace('</head>','<link rel="stylesheet" href="'+font+'"/>\n</head>',1)
    camping=camping.replace('</head>','<style id="lp-chrome-host">'+HOST_CSS+'</style>\n</head>',1)
    if 'class="tf-preserved-counter"' not in camping:
        counter='<div class="tf-preserved-counter"><a class="tf-visitor-counter" href="https://hits.sh/trailfusionai.com/camping/" target="_blank" rel="noopener noreferrer" aria-label="キャンピングカーDIYの訪問数"><b>VISITS</b><img src="https://hits.sh/trailfusionai.com/camping.svg?style=flat-square&amp;label=VISITS&amp;color=ff6b5b&amp;labelColor=1f2e4d" alt="キャンピングカーDIY 訪問数" decoding="async"/></a></div>'
        if '<section' in camping:
            pos=camping.find('<section');camping=camping[:pos]+counter+camping[pos:]
    runtime='<script id="lp-site-chrome-runtime">'+RUNTIME+'</script>'
    if '<script id="hiace-launch"' in camping:camping=camping.replace('<script id="hiace-launch"',runtime+'\n<script id="hiace-launch"',1)
    else:camping=camping.replace('</body>',runtime+'\n</body>',1)
    assert before==script_hashes(camping),'Studio scripts must remain unchanged'
    return camping

def verify(index,camping):
    src=nodes(index);dest=nodes(camping)
    assert src.select_one('.site-nav a[href="camping.html"]')
    assert src.select_one('#drawer a[href="camping.html"]')
    assert src.select_one('.mobile-camping-link[href="camping.html"]')
    assert len(dest.select('tf-lp-header'))==1 and len(dest.select('tf-lp-footer'))==1
    def txt(n):return re.sub(r'\s+',' ',nodes(str(n)).get_text(' ',strip=True)).strip()
    assert txt(src.select_one('.site-foot'))==txt(dest.select_one('.site-foot')),'Footer content must match LP'
    assert src.select_one('.brandlink img')['src']==dest.select_one('.brandlink img')['src'],'Logo differs'
    assert src.select_one('.foot-lockup')['src']==dest.select_one('.foot-lockup')['src'],'Footer logo differs'
    assert len(dest.select('.tf-preserved-counter'))==1
    assert 'https://hits.sh/trailfusionai.com/camping.svg?' in camping
    for a in dest.select('tf-lp-header a[href],tf-lp-footer a[href]'):assert not a['href'].startswith('#'),'Home anchors must target index.html'
    return {'header_links':len(dest.select('tf-lp-header a')),'footer_links':len(dest.select('tf-lp-footer a')),'identical_logo':True,'identical_footer_text':True,'studio_scripts':script_hashes(camping),'counter_key':'trailfusionai.com/camping'}

def main():
    p=argparse.ArgumentParser();p.add_argument('--root',default='.');p.add_argument('--studio');p.add_argument('--out');a=p.parse_args()
    root=Path(a.root);out=Path(a.out) if a.out else root;out.mkdir(parents=True,exist_ok=True)
    idx=add_navigation((root/'index.html').read_text())
    before=Path(a.studio).read_text() if a.studio else (root/'camping.html').read_text()
    camp=integrate(idx,before);report=verify(idx,camp)
    (out/'index.html').write_text(idx);(out/'camping.html').write_text(camp)
    (out/'lp-chrome-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print(json.dumps(report,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
