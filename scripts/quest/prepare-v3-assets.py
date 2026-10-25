"""Optimize the v3 Codex backgrounds, the real app icon and the Rika mascot for the Quest site.

Sources live outside the repo (Codex image store, the shakai app, the app icon). The record
docs/quest/backgrounds-v3.json keeps each source path and SHA-256 so the art can be traced.
Run: python3 scripts/quest/prepare-v3-assets.py --jyuken /Users/user/jyuken_sience
"""
import argparse, hashlib, json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets/quest'
CODEX = Path.home() / '.codex/generated_images'

# name -> (codex session/file, purpose). Portrait art is used as-is for phones.
BACKGROUNDS = {
    'hero': ('01a1716d-63c3-7cb0-a940-c89492d0abbe/exec-fcbb6b2b-00ad-4f02-bf04-5dcfabda2c19.png', 'sky, hills and a small storybook castle'),
    'hero-portrait': ('01a1716f-7f8a-70a0-aca0-61b316ab88d7/exec-0679cb78-bf9f-44be-b332-46b1c4b23890.png', 'portrait sky for phones'),
    'desk': ('01a1716d-6a49-7431-8bb6-715232a51660/exec-f98b3d4b-c69c-4c82-a26c-1a562e90a675.png', 'study desk items around the edges'),
    'meadow': ('01a1716d-63c3-7cb0-a940-c89492d0abbe/exec-21d37a5a-4315-4f79-a915-1b49a5d129ac.png', 'bright meadow'),
    'kingdom': ('01a1716d-63c3-7cb0-a940-c89492d0abbe/exec-4e780ad6-3170-48d7-a62c-509af287b7b2.png', 'storybook island kingdom'),
    'confetti': ('01a1716f-7f8a-70a0-aca0-61b316ab88d7/exec-cbadef51-5b08-4be6-841b-16d088ca4602.png', 'lemon paper with confetti edges'),
    'sky2': ('01a1716d-63c3-7cb0-a940-c89492d0abbe/exec-881f31d0-2f2a-4054-bc4e-a6e429b0e71b.png', 'sky over a hill town'),
}
# name -> (path under the shakai app mascots, output size)
MASCOTS = {
    'rika-cheer': ('rika-lv-020-cheer5.webp', 384),
    'rika-idea': ('rika-lv-040-mood5.webp', 384),
    'rika-wave': ('rika-lv-005.webp', 400),
}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def save(im, dest, quality):
    im.save(dest, 'WEBP', quality=quality, method=6)
    return list(im.size)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--jyuken', required=True, type=Path)
    args = ap.parse_args()
    (OUT / 'backgrounds').mkdir(parents=True, exist_ok=True)
    record, dims = [], json.loads((ROOT / 'docs/quest/image-dimensions.json').read_text())
    for name, (rel, purpose) in BACKGROUNDS.items():
        src = CODEX / rel
        im = Image.open(src).convert('RGB')
        if name == 'hero-portrait':
            save(im.resize((720, round(720 * im.height / im.width)), Image.LANCZOS), OUT / 'backgrounds/v3-hero-m.webp', 78)
        else:
            save(im, OUT / f'backgrounds/v3-{name}.webp', 80)
            if name != 'hero':
                save(im.resize((900, round(900 * im.height / im.width)), Image.LANCZOS), OUT / f'backgrounds/v3-{name}-m.webp', 76)
        record.append({'name': name, 'source': str(src), 'sourceSha256': sha(src), 'tool': 'codex image_gen',
                       'purpose': f'decorative website background ({purpose}); not an app screenshot'})
    for name, (file, size) in MASCOTS.items():
        src = args.jyuken / 'shakai-app/assets/images/mascots/growth' / file
        im = Image.open(src).convert('RGBA').resize((size, size), Image.LANCZOS)
        dims[name] = save(im, OUT / f'{name}.webp', 88)
        record.append({'name': name, 'source': str(src), 'sourceSha256': sha(src), 'tool': 'app mascot (Rika)', 'purpose': 'mascot illustration from the app'})
    icon = args.jyuken / 'app_store_1024.png'
    im = Image.open(icon).convert('RGB')
    dims['icon'] = save(im.resize((160, 160), Image.LANCZOS), OUT / 'icon.webp', 90)
    im.resize((180, 180), Image.LANCZOS).save(OUT / 'apple-touch-icon.png')
    record.append({'name': 'icon', 'source': str(icon), 'sourceSha256': sha(icon), 'tool': 'app icon', 'purpose': 'site logo = the real app icon'})
    (ROOT / 'docs/quest/image-dimensions.json').write_text(json.dumps(dims, ensure_ascii=False, indent=2) + '\n')
    (ROOT / 'docs/quest/backgrounds-v3.json').write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n')
    print('ok', len(record))


if __name__ == '__main__':
    main()
