"""Collect the real app icons / screenshots and the Codex brand art for the TrailFusion site.

Public apps: official App Store artwork and screenshots (iTunes lookup, Japan store).
合格！クエスト: the app icon chosen by the owner and real in-app screens already on the site.
もちのへや (in review): icon and store images from the app project.
Backgrounds: Codex image generation (no text, no people). Provenance -> docs/brand/assets.json.
Run: python3 scripts/brand/prepare-assets.py --jyuken /Users/user/jyuken_sience --mochi ~/swift/MochiPet
"""
import argparse, hashlib, io, json, urllib.request
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets/brand'
CODEX = Path.home() / '.codex/generated_images'

STORE_APPS = {  # slug -> App Store id (all published by the same developer account)
    'quest': 6775411516,
    'car-concierge': 6751795223, 'reelmake': 6779420680, 'voicelink': 6746684736,
    'buddytalk': 6744263274, 'wood-golem': 6739466549, 'word-blaster': 6745741796,
    'hacking-timer': 6746063846, 'english-quest': 6782028599, 'fp-quest': 6812542387,
    'rika-quest': 6772644144, 'kokugo-quest': 6780125916,
}
SHOTS = 6  # per store and language, for the detail-page galleries
D, E, F, G = (  # Codex sessions of the 2026-10-25 background batches
    '01a1720b-e360-7253-8d9c-559a56ba0b5b', '01a1720b-e362-7412-a266-f746514dc84f', '01a1720b-e361-79b3-80e2-34e04fe4e7f0',
                 '01a1720b-e361-7db2-ace4-e7f675db801b')
BACKGROUNDS = {
    'hero': ('01a171dc-c4c1-7bd2-8658-754d949d2e18/exec-758576f8-6c0e-43ec-9e7a-2b1cc136a8bc.png', 'trail across hills to small destinations'),
    'hero-portrait': ('01a171dc-c4c1-7bd2-8658-754d949d2e18/exec-1e71ec0e-a845-41d2-b82d-0c91885c5bf7.png', 'portrait trail for phones'),
    'dawn': ('01a171dc-c4c1-7bd2-8658-754d949d2e18/exec-e49375cb-bcc8-4e73-a518-5a07a101a079.png', 'pale dawn sky'),
    'room': ('01a171dc-de13-7c70-a330-429326c2e56e/exec-06545e17-39a0-46e3-a935-c0f66bf13bc8.png', 'soft peach room'),
    'coast': ('01a171dc-de13-7c70-a330-429326c2e56e/exec-f5f403e6-4920-4d9a-80e8-c53977f328ac.png', 'coastal road with a van'),
    'garage': ('01a171de-9029-7401-9176-981362b87b9c/exec-5f532fe8-7010-416d-bea7-080b0d55c442.png', 'sunny garage workbench'),
    'world': (D + '/exec-a4faeb12-02a8-4d0e-bd58-d3ad69150933.png', 'watercolour world map with flight paths (VoiceLink)'),
    'studio': (D + '/exec-d9986e3e-5a99-41b2-bda4-b9af2e41cdca.png', 'creator desk with photos and film (Reel Make)'),
    'cafe': (D + '/exec-0d467e88-130a-4f8a-bdb8-224340bdeb31.png', 'cafe terrace with cups and a sprout (BuddyTalk)'),
    'library': (D + '/exec-f299e80c-018c-4d13-a6ec-f93cdbaebe1e.png', 'bright library (English Quest)'),
    'timer': (E + '/exec-c70853d1-cbd5-416e-8516-e14a0a0bdd17.png', 'morning desk with an hourglass (Hacking Timer)'),
    'space': (E + '/exec-dfe2cb3b-7c97-4660-8206-f08ae065f7ea.png', 'pastel space (Word Blaster)'),
    'forest': (E + '/exec-b07959f9-e1a7-48e0-a3bc-c73af8222519.png', 'forest with a pile of sticks (Wood Golem)'),
    'money': (E + '/exec-8f5b8a5d-010a-466a-91f0-b93d35021c54.png', 'piggy bank and a small house (FP Quest)'),
    'science': (F + '/exec-c492e26d-b963-4d46-b642-f92c922b456b.png', 'field desk with a microscope (science)'),
    'kokugo': (F + '/exec-b10c8413-203f-4286-9195-db5b04900882.png', 'brush, inkstone and a blank book (Japanese language)'),
    'planes': (F + '/exec-f58da349-e35b-4a9d-ba49-c7a2da3bfbeb.png', 'paper planes in the sky (FAQ)'),
    'desk': (F + '/exec-c44cdf31-a92c-41d2-b166-cf3b4ba0571c.png', 'maker desk by a window'),
    'kites': (G + '/exec-7d659c3d-2d1c-48fc-90a4-509dca170b80.png', 'kites over a meadow'),
    'mailbox': (G + '/exec-c7bfc2be-2787-4953-a1be-2b4ba6c2d2f2.png', 'post box on a hill path'),
    'camper': (G + '/exec-3d1af77d-6dc2-4cad-bb73-9d9c068f3800.png', 'camper van interior by the sea'),
}


def fetch(url):
    with urllib.request.urlopen(url, timeout=30) as r:
        return r.read()


def sha(b):
    return hashlib.sha256(b).hexdigest()


def webp(im, dest, width, quality=84):
    im = im.convert('RGBA' if im.mode in ('RGBA', 'LA', 'P') else 'RGB')
    if im.width > width:
        im = im.resize((width, round(width * im.height / im.width)), Image.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, 'WEBP', quality=quality, method=6)
    return [im.width, im.height]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--jyuken', type=Path, required=True)
    ap.add_argument('--mochi', type=Path, required=True)
    ap.add_argument('--shelf', help='codex session/file for the shelf background')
    a = ap.parse_args()
    record, dims, meta = [], {}, {}
    for slug, app_id in STORE_APPS.items():
        data = json.loads(fetch(f'https://itunes.apple.com/lookup?id={app_id}&country=jp'))['results'][0]
        meta[slug] = {'id': app_id, 'name': data['trackName'], 'version': data.get('version'),
                      'rating': round(data.get('averageUserRating') or 0, 2), 'ratings': data.get('userRatingCount') or 0,
                      'updated': (data.get('currentVersionReleaseDate') or '')[:10], 'released': (data.get('releaseDate') or '')[:10]}
        url = data['artworkUrl512'].rsplit('/', 1)[0] + '/512x512bb.png'
        raw = fetch(url)
        dims[f'{slug}/icon'] = webp(Image.open(io.BytesIO(raw)), OUT / slug / 'icon.webp', 256, 90)
        record.append({'asset': f'assets/brand/{slug}/icon.webp', 'source': url, 'sha256': sha(raw), 'kind': 'App Store icon'})
        us = json.loads(fetch(f'https://itunes.apple.com/lookup?id={app_id}&country=us'))['results']
        sets = [('shot-', data)] + ([('shot-en-', us[0])] if us and slug not in ('quest', 'rika-quest', 'kokugo-quest', 'fp-quest') else [])
        for prefix, src in sets if slug != 'quest' else []:
            for i, shot in enumerate(src.get('screenshotUrls', [])[:SHOTS], 1):
                url = shot.rsplit('/', 1)[0] + '/700x0w.jpg'
                raw = fetch(url)
                dims[f'{slug}/{prefix}{i}'] = webp(Image.open(io.BytesIO(raw)), OUT / slug / f'{prefix}{i}.webp', 600)
                record.append({'asset': f'assets/brand/{slug}/{prefix}{i}.webp', 'source': url, 'sha256': sha(raw), 'kind': 'App Store screenshot'})
    icon = a.jyuken / 'app_store_1024.png'
    dims['quest/icon'] = webp(Image.open(icon), OUT / 'quest/icon.webp', 256, 90)
    record.append({'asset': 'assets/brand/quest/icon.webp', 'source': str(icon), 'sha256': sha(icon.read_bytes()), 'kind': 'app icon'})
    micon = a.mochi / 'MochiPet/Assets.xcassets/AppIcon.appiconset/AppIcon.png'
    dims['mochi/icon'] = webp(Image.open(micon), OUT / 'mochi/icon.webp', 256, 90)
    record.append({'asset': 'assets/brand/mochi/icon.webp', 'source': str(micon), 'sha256': sha(micon.read_bytes()), 'kind': 'app icon'})
    for lang, prefix in (('ja', 'shot-'), ('en', 'shot-en-')):
        for i, name in enumerate(['1-room', '2-talk', '3-words', '4-memories', '5-wardrobe', '7-shop'], 1):
            src = a.mochi / f'Reports/store/final/iphone/{lang}/{name}.png'
            dims[f'mochi/{prefix}{i}'] = webp(Image.open(src), OUT / f'mochi/{prefix}{i}.webp', 600)
            record.append({'asset': f'assets/brand/mochi/{prefix}{i}.webp', 'source': str(src), 'sha256': sha(src.read_bytes()), 'kind': 'store image (in review)'})
    bgs = dict(BACKGROUNDS)
    if a.shelf:
        bgs['shelf'] = (a.shelf, 'shelf of miniatures (apps catalog)')
    for name, (rel, purpose) in bgs.items():
        src = CODEX / rel
        im = Image.open(src).convert('RGB')
        if name == 'hero-portrait':
            dims['bg/hero-m'] = webp(im, OUT / 'bg/hero-m.webp', 760, 78)
        else:
            dims[f'bg/{name}'] = webp(im, OUT / f'bg/{name}.webp', 1672, 80)
            dims[f'bg/{name}-m'] = webp(im, OUT / f'bg/{name}-m.webp', 900, 76)
        record.append({'asset': f'assets/brand/bg/{name}.webp', 'source': str(src), 'sha256': sha(src.read_bytes()),
                       'kind': 'Codex image generation', 'purpose': f'decorative background ({purpose}); not an app screen'})
    docs = ROOT / 'docs/brand'
    docs.mkdir(parents=True, exist_ok=True)
    (docs / 'assets.json').write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n')
    (docs / 'image-dimensions.json').write_text(json.dumps(dims, ensure_ascii=False, indent=2) + '\n')
    (docs / 'store-snapshot.json').write_text(json.dumps({'store': 'App Store Japan (iTunes lookup)', 'apps': meta}, ensure_ascii=False, indent=2) + '\n')
    print('assets', len(record))


if __name__ == '__main__':
    main()
