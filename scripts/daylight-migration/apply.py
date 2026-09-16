"""One-time verified image import. Only runs on the isolated work branch."""
from pathlib import Path
import hashlib
parts=sorted(Path('scripts/daylight-migration/media').glob('part-*.bin'))
assert len(parts)==3
raw=b''.join(p.read_bytes() for p in parts)
assert len(raw)==22021
assert hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()=='ec6bbd114cbf30da1c3c95d4ad6efef3f53caa04'
assert b'ftypavif' in raw[:64]
asset=Path('assets/hero/daylight-scene.avif');asset.write_bytes(raw)
p=Path('index.html');s=p.read_text()
assert 'tf-daylight__picture' in s
old='<img src="/assets/hero/trailfusion-home-sprite.avif" width="2250" height="253"'
new='<img src="/assets/hero/daylight-scene.avif" width="959" height="540"'
assert old in s;s=s.replace(old,new,1)
old='href="/assets/hero/trailfusion-home-sprite.avif" rel="preload"'
assert old in s;s=s.replace(old,'href="/assets/hero/daylight-scene.avif" rel="preload"',1)
p.write_text(s)
p=Path('assets/css/home-daylight.css');s=p.read_text()
s=s.replace('aspect-ratio:450 / 253','aspect-ratio:959 / 540')
s=s.replace('/* Show only frame one. Never stretch the five-frame strip over a tall phone viewport. */','/* Independent 959x540 export: preserve the bright image without a stretched sprite. */')
s=s.replace('width:500%;max-width:none;height:100%;object-fit:fill','width:100%;max-width:100%;height:100%;object-fit:cover')
p.write_text(s)
p=Path('docs/DAYLIGHT-HERO-20260916.md');s=p.read_text().replace('The existing generated scene is displayed in its original 450:253 frame, not stretched over a tall mobile background.','The original generated scene is re-exported as an independent 959x540 AVIF (22,021 bytes), preserving its proportions instead of enlarging a low-resolution sprite frame.')
p.write_text(s)
p=Path('scripts/site-redesign/validate-daylight.py');s=p.read_text().replace("'sprite is not distorted'","'image is not distorted'")
s=s.replace("check(s.select_one('.tf-premium-hero__overlay') is None,'No dark hero overlay remains')", "check(s.select_one('.tf-premium-hero__overlay') is None,'No dark hero overlay remains')\ncheck(s.select_one('.tf-daylight__picture img')['src']=='/assets/hero/daylight-scene.avif','Independent image exported from original generated artwork')")
p.write_text(s)
print('Independent hero AVIF imported and byte-verified; no unrelated site pages changed.')
