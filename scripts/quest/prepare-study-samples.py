from pathlib import Path
from PIL import Image
import argparse,json,hashlib,shutil
parser=argparse.ArgumentParser()
parser.add_argument('--input-dir',required=True)
parser.add_argument('--source',required=True)
args=parser.parse_args()
b=Path(args.input_dir);r=Path(__file__).resolve().parents[2];src=Path(args.source)
sha=lambda z:hashlib.sha256(z).hexdigest()
samples=json.loads((b/'real-sample-questions.json').read_text())
assert sha((b/'real-sample-questions.json').read_bytes())=='b924bc18f3bb314ccf72b7b14b11766e75b59da4fedca13992c3a8cfdeed3c8c'
visuals={q['sourceId']:q for q in json.loads((b/'sample-materials-source.json').read_text())['rows']}
for page in samples['pages']:
 for q in page['questions']:
  a=visuals[q['sourceId']]['asset'];original=Path(a['originalPath'])
  assert sha(original.read_bytes())==a['sourceSha256']
  dest=r/'assets/quest/materials'/('sample-'+q['sourceId']+'.webp')
  im=Image.open(original);w,h=im.size
  if original.suffix.lower()=='.webp':
   shutil.copyfile(original,dest);mode='unchanged original WebP bytes'
  else:
   im.save(dest,'WEBP',lossless=True,method=6);mode='lossless encoding conversion, original dimensions'
  q['websiteImage']={'src':'/'+str(dest.relative_to(r)),'width':w,'height':h,'alt':{'science-observation':'中学受験理科','information-binary':'情報Ⅰ','bookkeeping-journal':'簿記3級'}[page['slug']]+'「'+q['unitTitle']+'」の問題の図解','sourceSha256':a['sourceSha256'],'sha256':sha(dest.read_bytes()),'transform':mode,'provenance':a['provenance']}
  q['sourcePackPath']='runtime/'+str(Path(q['sourcePackPath']).relative_to(src))
samples['source']='Current production source commit fb3473df88d2431a1b35b46f0f818ffdc0647693'
samples['sourceSamplesSha256']=sha((b/'real-sample-questions.json').read_bytes())
samples['visualReview']={'allNineSourceReferencesMatch':True,'diagramContentInspected':True,'nativeScreenReconstruction':False}
(r/'docs/quest/study-samples.json').write_text(json.dumps(samples,ensure_ascii=False,indent=2)+'\n')
copybytes=(b/'website-study-pages-copy.json').read_bytes()
assert sha(copybytes)=='2d3f57999da48209fee763cc3ed39bf3d6a3541c14c86d67601dabd21ebe46e2'
text=copybytes.decode();needle='必要な種類数を超える最小の桁数'
assert needle in text
text=text.replace(needle,'必要な種類数以上を表せる最小の桁数')
reviewed=json.loads(text)
reviewed['sourceSamples']={'path':'docs/quest/study-samples.json','originalInputSha256':samples['sourceSamplesSha256'],'questions':9}
reviewed['editorialReview']={'reviewer':'website_update','originalCopySha256':sha(copybytes),'corrections':[{'before':needle,'after':'必要な種類数以上を表せる最小の桁数','reason':'Includes exact powers of two. Approved by root; original question data unchanged.'}]}
(r/'docs/quest/study-pages-copy.json').write_text(json.dumps(reviewed,ensure_ascii=False,indent=2)+'\n')
mf=src/'content/generated/release-manifest.json';structure=src/'content/generated/release-structure.json'
m=json.loads(mf.read_text())['courses'];s=json.loads(structure.read_text())['courses']
def unique_count(cid,c):
 if c.get('uniqueQuestionCount') is not None:return c['uniqueQuestionCount']
 ids=[]
 for unit in c['units']:
  pack=json.loads((src/'apps/mobile/public/course-packs/v1'/unit['packPath']).read_text())
  for question in pack['questions']:
   identifier=question.get('sourceId') or question.get('id')
   assert identifier,cid+' question without source identifier'
   ids.append(identifier)
 return len(set(ids))
counts={'sourceCommit':samples['source'].split()[-1],'releaseManifestSha256':sha(mf.read_bytes()),'releaseStructureSha256':sha(structure.read_bytes()),'courses':{cid:{'unitCount':len(c['units']),'uniqueQuestionCount':unique_count(cid,c),'pageCount':len(s[cid].get('pages',[]))} for cid,c in m.items()}}
(r/'docs/quest/released-gallery-counts.json').write_text(json.dumps(counts,ensure_ascii=False,indent=2)+'\n')
print('Prepared 9 source-exact questions/images, 18 current course counts and reviewed copy.')