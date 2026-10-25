import json,hashlib,argparse
from pathlib import Path
parser=argparse.ArgumentParser(description='Import aggregate-only website facts from the release snapshot and analytics export.')
parser.add_argument('--platform-root',type=Path,required=True)
parser.add_argument('--analytics-snapshot',type=Path,required=True)
parser.add_argument('--as-of',required=True)
args=parser.parse_args()
base=args.platform_root;out=Path(__file__).resolve().parents[2]/'docs/quest'
mp=base/'content/generated/release-manifest.json';sp=base/'content/generated/release-structure.json'
m=json.loads(mp.read_text());s=json.loads(sp.read_text())['courses'];result={}
for cid,c in m['courses'].items():
 units=c['units'];q=c.get('uniqueQuestionCount')
 if q is None:
  ids=set()
  for u in units:
   raw=(base/'content/release-locks'/cid/'packs'/f"{u['id']}.json").read_bytes()
   canonical=raw[:-1] if raw.endswith(b'\n') else raw
   assert hashlib.sha256(canonical).hexdigest()==u['sha256'], 'Release pack drift: '+u['id']
   pack=json.loads(raw);ids.update(x['sourceId'] for x in pack['questions'])
  q=len(ids)
 domains=[]
 for u in units:
  key=u.get('domain','other');d=next((d for d in domains if d['id']==key),None)
  if not d:
   d={'id':key,'name':u.get('domainName',key),'units':[]};domains.append(d)
  d['units'].append({'title':u['title'],'questions':u['questionCount']})
 pages=s[cid]['pages'];assert len(pages)==len({x['key'] for x in pages})
 result[cid]={'questions':q,'unitCount':len(units),'atlasPages':len(pages),'domains':domains,'usage':None}
d={'asOf':args.as_of,'releaseGeneratedAt':m['generatedAt'],'definition':'Release manifest unique questions; unique library page keys; listed release units. Free and paid content combined. Unit question counts may overlap; do not sum them to infer unique course questions. Course-level usage unavailable.','sources':[{'file':str(p.relative_to(base)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in [mp,sp]],'courses':result}
(out/'course-stats.json').write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
a=json.loads(args.analytics_snapshot.read_text());store=a['sources']['appStoreConnect']['last12Months'];assert store['ok'];data=store['data'];app=data['apps']['shakai'];assert app['appId']=='6775411516' and not app['pending']
usage={'asOf':a['fetchedAt'],'source':'App Store Connect Sales and Trends','appId':app['appId'],'periodStart':app['daily'][0]['d']+'-01','periodEnd':data['reportThrough'],'firstDownloads':app['firstTime'],'redownloads':app['redownloads'],'scope':'同一App Store IDの旧・社会クエスト期間を含むiOSアプリの初回ダウンロード数。利用人数・教材別学習人数ではない。','courseUsageAvailable':False}
(out/'usage-summary.json').write_text(json.dumps(usage,ensure_ascii=False,indent=2)+'\n')
print('course totals',sum(x['questions'] for x in result.values()),sum(x['atlasPages'] for x in result.values()));print('usage',usage)
