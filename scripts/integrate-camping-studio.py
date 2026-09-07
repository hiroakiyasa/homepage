#!/usr/bin/env python3
"""Integrate the complete camping site header/footer into an exported Hiace Studio.

Usage from the repository root:
    python3 scripts/integrate-camping-studio.py /path/to/hiace-studio-v15.html

No network calls, package installation, or changes to the 3D JavaScript are made.
The existing camping.html is archived as camping-guide.html before replacement.
"""
from __future__ import annotations
import argparse
import hashlib
import re
from pathlib import Path

MARKER = 'id="camping-site-chrome"'
CANONICAL = 'https://trailfusionai.com/camping.html'

def scripts(html: str) -> dict[str, str]:
    return {m.group(1): hashlib.sha256(m.group(2).encode('utf-8')).hexdigest()
            for m in re.finditer(r'<script\b[^>]*id=[\"\'](hiace-[^\"\']+)[\"\'][^>]*>([\s\S]*?)</script\s*>', html)}

def integrate(source: str, chrome: str) -> str:
    if MARKER in source:
        raise ValueError('The site chrome is already integrated; use the unmodified studio input.')
    if 'id="hiace-atelier"' not in source:
        raise ValueError('This is not a Hiace Studio export.')
    if len(re.findall(r'<header\b[^>]*class=[\"\'][^\"\']*\bsite-header\b', source)) != 1:
        raise ValueError('Expected exactly one original studio header.')
    if len(re.findall(r'<footer\b[^>]*class=[\"\'][^\"\']*\bsite-footer\b', source)) != 1:
        raise ValueError('Expected exactly one original studio footer.')
    before = scripts(source)
    if not {'hiace-model', 'hiace-app'}.issubset(before):
        raise ValueError('Missing the expected V15 model/app scripts.')
    result = re.sub(r'<meta\b[^>]*name=[\"\']robots[\"\'][^>]*>', '', source, flags=re.I)
    metadata = '''\n<!-- Original camping page identity; original site styles stay in the chrome shadow roots. -->
<link rel="canonical" href="https://trailfusionai.com/camping.html">
<meta name="description" content="ハイエース200系のDIYキャンピングカー。触って楽しむ3D、用途別レイアウト、23の製作工程、サブバッテリーと8ナンバー取得を実車写真・動画で紹介。">
<meta name="author" content="TrailFusion AI">
<meta property="og:type" content="article">
<meta property="og:title" content="ハイエースDIYキャンピングカー｜3Dで楽しむ製作ガイド | TrailFusion AI">
<meta property="og:description" content="用途別レイアウトから製作工程、電装、8ナンバー取得まで。実車写真と動く3Dで、自分らしい車旅へ。">
<meta property="og:url" content="https://trailfusionai.com/camping.html">
<meta property="og:image" content="https://trailfusionai.com/assets/images/camper/camper_dramatic_sky%EF%BC%88%E5%A4%A7%EF%BC%89.jpg">
<meta property="og:locale" content="ja_JP">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/jpeg" href="https://trailfusionai.com/assets/images/b295aa9fa2c904bc29a0e5e438249d00.jpg">
<link rel="apple-touch-icon" href="https://trailfusionai.com/assets/images/b295aa9fa2c904bc29a0e5e438249d00.jpg">
'''
    result = result.replace('</head>', metadata + '</head>', 1)
    result = re.sub(r'<title>[\s\S]*?</title>', '<title>ハイエースDIYキャンピングカー｜3Dで楽しむ製作ガイド | TrailFusion AI</title>', result, count=1)
    embedded = '<script id="camping-site-chrome">\n' + chrome.replace('</script', '<\\/script') + '\n</script>\n'
    # Insert before the existing launch/model/app scripts, without modifying any of them.
    match = re.search(r'<script\b[^>]*id=[\"\']hiace-launch[\"\']', result)
    if not match:
        raise ValueError('Launch script position could not be established.')
    result = result[:match.start()] + embedded + result[match.start():]
    if scripts(result) != before:
        raise AssertionError('A Hiace script changed during chrome integration.')
    return result

def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('studio', type=Path)
    parser.add_argument('--output', type=Path, default=Path('camping.html'))
    parser.add_argument('--chrome', type=Path, default=Path(__file__).resolve().parents[1] / 'assets/js/camping-site-chrome.js')
    parser.add_argument('--archive', type=Path, default=Path('camping-guide.html'))
    args = parser.parse_args()
    if args.studio.resolve() == args.output.resolve():
        parser.error('Use a separate output path, not the original studio file.')
    source = args.studio.read_text(encoding='utf-8')
    result = integrate(source, args.chrome.read_text(encoding='utf-8'))
    if args.output.exists() and not args.archive.exists():
        current = args.output.read_text(encoding='utf-8')
        if 'id="hiace-atelier"' in current:
            parser.error('The output is already a studio; archive/replace it deliberately first.')
        args.archive.parent.mkdir(parents=True, exist_ok=True)
        args.archive.write_bytes(args.output.read_bytes())
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(result, encoding='utf-8')
    print(f'Created {args.output} ({len(result.encode("utf-8")):,} bytes)')
    print('All four existing Hiace scripts, their photos, the 3D model and animations are unchanged.')

if __name__ == '__main__':
    main()
