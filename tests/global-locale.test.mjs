import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../assets/js/global-locale.js',import.meta.url),'utf8');
const codes=['ja','en','ar','he','ko','de','fr','pt','zh-Hans','zh-Hant','fil','id','nb'];
const routes=Object.fromEntries(codes.map(code=>[code,code==='ja'?'/':'/'+(code==='pt'?'pt-br':code.toLowerCase())+'/']));

function run({locale='ja',entry=true,languages=['en-US'],language='en-US',saved=null,search='',hash='',blocked=false,ua='Test browser'}={}) {
  const location={href:'https://trailfusionai.com'+routes[locale]+search+hash,
    replace(value){this.replaced=value;},assign(value){this.assigned=value;}};
  const values=new Map(saved?[['tf_site_language',saved]]:[]);
  const localStorage={
    getItem(key){if(blocked)throw Error('blocked');return values.get(key)||null;},
    setItem(key,value){if(blocked)throw Error('blocked');values.set(key,value);},
    removeItem(key){if(blocked)throw Error('blocked');values.delete(key);}
  };
  const window={};
  const document={
    readyState:'complete',
    getElementById(){return {textContent:JSON.stringify({locale,entry,routes})};},
    querySelectorAll(){return [];},
    addEventListener(){}
  };
  const history={replaceState(_a,_b,value){location.href=value;}};
  runInNewContext(source,{window,document,localStorage,location,history,navigator:{languages,language,userAgent:ua},URL});
  return {location,values,window};
}

test('unprefixed entry follows browser language and retains campaign and section',()=>{
  const result=run({languages:['fr-CA'],search:'?utm_source=demo',hash:'#learn'});
  assert.equal(result.location.replaced,'https://trailfusionai.com/fr/?utm_source=demo#learn');
});

test('saved manual choice wins over browser language at an entry',()=>{
  assert.equal(run({saved:'ko',languages:['de-DE']}).location.replaced,'https://trailfusionai.com/ko/');
});

test('an explicit locale URL is never replaced by saved or inferred preferences',()=>{
  const result=run({locale:'fr',entry:false,saved:'ko',languages:['ar-SA']});
  assert.equal(result.location.replaced,undefined);
  assert.equal(result.window.__TF_LOCALE_READY,'fr');
});

test('Japanese explicit selection remains reliable with storage disabled',()=>{
  const result=run({languages:['de-DE'],search:'?lang=ja&utm_source=demo',blocked:true});
  assert.equal(result.location.replaced,undefined);
  assert.equal(new URL(result.location.href).searchParams.get('lang'),'ja');
  assert.equal(new URL(result.location.href).searchParams.get('utm_source'),'demo');
  assert.equal(result.window.__TF_LOCALE_READY,'ja');
});

test('an explicit query can select a language and is removed at the locale URL',()=>{
  assert.equal(run({locale:'en',entry:false,search:'?lang=tl&utm_source=demo'}).location.replaced,'https://trailfusionai.com/fil/?utm_source=demo');
});

test('automatic mode clears saved preferences',()=>{
  const result=run({locale:'pt',entry:false,languages:['en-GB'],saved:'fr',search:'?lang=auto'});
  assert.equal(result.location.replaced,'https://trailfusionai.com/en/');
  assert.equal(result.values.size,0);
});

test('Chinese scripts and regional preferences resolve distinctly',()=>{
  for(const tag of ['zh-TW','zh-HK','zh-MO','zh-Hant','zh-Hant-HK','zh-Hant-CN']) {
    assert.equal(run({languages:[tag]}).location.replaced,'https://trailfusionai.com/zh-hant/',tag);
  }
  for(const tag of ['zh-CN','zh-SG','zh-Hans','zh','zh-Hans-HK','zh-Hans-TW']) {
    assert.equal(run({languages:[tag]}).location.replaced,'https://trailfusionai.com/zh-hans/',tag);
  }
});

test('all browser preferences are considered before the English fallback',()=>{
  assert.equal(run({languages:['xx-YY','ko-KR']}).location.replaced,'https://trailfusionai.com/ko/');
  assert.equal(run({languages:['xx-YY']}).location.replaced,'https://trailfusionai.com/en/');
});

test('common legacy language codes normalize to supported locales',()=>{
  for(const [tag,slug] of [['no-NO','nb'],['iw-IL','he'],['in-ID','id'],['pt-PT','pt-br']]) {
    assert.equal(run({languages:[tag]}).location.replaced,'https://trailfusionai.com/'+slug+'/',tag);
  }
});

test('crawlers can read the ordinary language entry and its alternate links',()=>{
  const result=run({languages:['de-DE'],ua:'Googlebot'});
  assert.equal(result.location.replaced,undefined);
  assert.equal(result.window.__TF_LOCALE_READY,'ja');
});


test('an empty languages list falls back to navigator.language',()=>{
  assert.equal(run({languages:[],language:'fr-FR'}).location.replaced,'https://trailfusionai.com/fr/');
});
