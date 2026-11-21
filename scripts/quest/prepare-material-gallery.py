"""Prepare exact released teaching materials and separately reviewed decorative art."""
from pathlib import Path
from PIL import Image,ImageOps
import argparse,hashlib,json,shutil
ROOT=Path(__file__).resolve().parents[2]
p=argparse.ArgumentParser()
p.add_argument('--materials',type=Path,required=True)
p.add_argument('--art-dir',type=Path,required=True)
args=p.parse_args()
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
source=json.loads(args.materials.read_text())
assert source['releasedCourseCount']==18 and len(source['courses'])==18
out=ROOT/'assets/quest/materials';out.mkdir(parents=True,exist_ok=True)
rows=[]
for course in source['courses']:
    row={k:v for k,v in course.items() if k not in ('question','atlas')}
    for kind in ('question','atlas'):
        item=course[kind]
        if item is None: row[kind]=None;continue
        row[kind]={k:v for k,v in item.items() if k!='asset'}
        asset=item.get('asset')
        if kind=='question' and course['courseId'] in ('math-ia-kyotsu-japan','chemistry-kyotsu-japan'):
            row[kind]['asset']=None
            row[kind]['rasterAvailability']='Excluded from web display after visual review: numerical labels do not match the selected question text.'
            row[kind]['excludedCandidateSourceSha256']=asset.get('sourceSha256') if asset else None
            prior=out/(course['courseId']+'-question.webp')
            if prior.exists():prior.unlink()
            continue
        if not asset or not asset.get('available'):
            row[kind]['asset']=None
            row[kind]['rasterAvailability']='No raster mapped for this representative item'
            continue
        original=Path(asset['originalPath']);assert sha(original)==asset['sourceSha256']
        image=Image.open(original);image.load();width,height=image.size
        name=course['courseId']+'-'+kind+'.webp';target=out/name
        if original.suffix.lower()=='.webp':shutil.copyfile(original,target);transform='original WebP bytes copied unchanged'
        else:
            image.save(target,'WEBP',lossless=True,method=6)
            transform='lossless WebP format conversion, original dimensions retained'
        assert Image.open(target).size==(width,height)
        kind_text='問題の図解' if kind=='question' else '図鑑'
        topic=item.get('unitTitle') if kind=='question' else item.get('title')
        src=asset['source']
        if '/production-freeze/source/'in src:src='runtime/'+src.split('/production-freeze/source/',1)[1]
        elif '/production-freeze/'in src:src='external/'+src.split('/production-freeze/',1)[1]
        row[kind]['asset']={'src':'/assets/quest/materials/'+name,'width':width,'height':height,'alt':course['title']+'「'+str(topic)+'」の'+kind_text,'source':src,'sourceSha256':asset['sourceSha256'],'sha256':sha(target),'bytes':target.stat().st_size,'transform':transform,'provenance':asset['provenance'],'runtimeReference':asset['referenceSource'],'runtimeReferenceSha256':asset['referenceSourceSha256']}
    row['primary']='question' if row['question'].get('asset') else 'atlas'
    assert row[row['primary']]['asset']
    rows.append(row)
art=[]
review=args.art_dir/'independent-visual-review.json'
assert sha(review)=='808152764ec0ed1e832c25a224d4b92fe4fab21291d5abcfb582570974f4c6a7'
for prefix,group in [('01-junior-learning','school'),('02-university-learning','university'),('03-qualification-learning','qualification')]:
    original=args.art_dir/'generated'/(prefix+'-art.png')
    image=Image.open(original);image.load();assert image.size==(1536,1024)
    variants=[]
    for width in (768,1536):
        resized=image if width==1536 else image.resize((width,width*2//3),Image.Resampling.LANCZOS)
        target=out/(prefix+'-'+str(width)+'.webp');resized.save(target,'WEBP',quality=88,method=6)
        variants.append({'src':'/assets/quest/materials/'+target.name,'width':resized.width,'height':resized.height,'sha256':sha(target),'bytes':target.stat().st_size})
    art.append({'id':prefix,'group':group,'role':'decorative learning illustration','generator':'Codex GPT-6 Luna image generation','originalSha256':sha(original),'independentReviewSha256':sha(review),'variants':variants})
manifest={'schema':'quest-material-gallery-v1','asOf':'2026-11-21','sourceCommit':source['sourceCommit'],'runtimeInputLockSha256':source['runtimeInputLockSha256'],'sourceManifestSha256':sha(args.materials),'releasedCourseCount':18,'courses':rows,'decorativeArt':art,'scope':'Representative actual question diagrams and atlas pages from released content. Decorative art is separately identified. These are teaching materials, not synthesized application screens.'}
(ROOT/'docs/quest/material-gallery.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'courses':len(rows),'questionImages':sum(bool(c['question'].get('asset'))for c in rows),'atlasImages':sum(bool(c.get('atlas')and c['atlas'].get('asset'))for c in rows),'decorativeArt':len(art),'outputBytes':sum(x.stat().st_size for x in out.glob('*'))}))
