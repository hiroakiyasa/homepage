"""Keep reviewed public copy aligned without regenerating the marketing site.

The 2026-10-25 course-stats snapshot remains the source for its historical unit
list. Current aggregate counts come from the released material-gallery evidence.
Run after growth/material_gallery, or use --check as a read-only CI gate.
"""
from pathlib import Path
from datetime import date
import argparse
import json
import re

ROOT = Path(__file__).resolve().parents[2]
COUNTS = json.loads((ROOT / 'docs/quest/released-gallery-counts.json').read_text())['courses']
GALLERY = json.loads((ROOT / 'docs/quest/material-gallery.json').read_text())
day = date.fromisoformat(GALLERY['asOf'])
COUNT_DATE_JA = f'{day.year}年{day.month}月{day.day}日'
MIGRATION_NOTE = '購入・学習記録の扱いはアプリや購入商品によって異なります。アプリ内の案内と料金・購入ガイドをご確認ください。'
SCIENCE_DETAIL_NOTE = (
    f'収録総数は{COUNT_DATE_JA}確認の統合版データです。'
    '以下の単元名と各単元の問題数は2026年10月25日時点の一覧で、追加単元は含みません。'
    '無料・Pro対象を含みます。問題数は教材内の重複IDを除いた件数、図鑑は収録ページ数です。'
    '配信版・OSにより利用範囲が異なる場合があります。'
)


def course_counts(cid):
    """Use the old renderer's field names without changing its historical data."""
    d = COUNTS[cid]
    return {'questions': d['uniqueQuestionCount'], 'atlasPages': d['pageCount'], 'unitCount': d['unitCount']}


def _number_block(match):
    text = match.group(0)
    for label, value in [('問題', COUNTS['junior-science']['uniqueQuestionCount']),
                         ('図鑑', COUNTS['junior-science']['pageCount']),
                         ('単元', COUNTS['junior-science']['unitCount']),
                         ('学習', COUNTS['junior-science']['unitCount'])]:
        text = re.sub(r'(<dt>' + label + r'</dt><dd>)[\d,]+', lambda m: m[1] + f'{value:,}', text)
    return text


def transform(rel, text):
    """Only change known copy/number blocks; leave layout, URLs and metadata IDs intact."""
    if not re.search(r'<html\b[^>]*\blang=[\"\']ja[\"\']', text):
        return text
    replacements = {
        '中学受験の4科から、資格・語学まで。12教材をひとつのアプリで。': '中学受験・大学受験・資格・語学を、ひとつのアプリで。',
        '現在は12教材をまとめた「合格！クエスト」でも理科を学べます。': '現在は「合格！クエスト」でも理科を学べます。',
        '学習記録と購入は、合格！クエストへ引き継げます。引き継ぎ方は合格！クエストの料金・購入ガイドをご覧ください。': MIGRATION_NOTE,
        '理科・国語の単科アプリは、学習記録と購入を合格！クエストへ引き継げます。お使いの方はアプリ内の案内か、料金・購入ガイドをご覧ください。': MIGRATION_NOTE,
        '学習記録と購入は「合格！クエスト」へ引き継げます。': MIGRATION_NOTE,
        '単体アプリの購入と学習記録は、アプリ内の案内に沿って統合版へ引き継げます。': MIGRATION_NOTE,
        '単体アプリの購入と学習記録は、アプリ内の案内に沿って合格！クエストへ引き継げます。単体アプリは当面そのまま使えます。': MIGRATION_NOTE,
        '以前の理科の単科アプリ。学習記録と購入は合格！クエストへ引き継げます。': '以前の理科の単科アプリ。購入・学習記録の扱いはアプリ内の案内をご確認ください。',
        '以前の国語の単科アプリ。学習記録と購入は合格！クエストへ引き継げます。': '以前の国語の単科アプリ。購入・学習記録の扱いはアプリ内の案内をご確認ください。',
    }
    for old, new in replacements.items():
        text = text.replace(old, new)

    if rel in {'index.html', 'about/index.html'}:
        count = len(json.loads((ROOT / 'docs/brand/store-snapshot.json').read_text())['apps'])
        text = re.sub(r'<dt>公開中のアプリ</dt><dd><span class="num">\d+</span><small>すべて無料でダウンロード</small>',
                      f'<dt>App Store掲載数</dt><dd><span class="num">{count}</span><small>2026/10/25時点・日本</small>', text)
        text = re.sub(r'<dt>公開中のアプリ</dt><dd>\d+</dd>',
                      f'<dt>App Store掲載数<br><small>2026/10/25時点・日本</small></dt><dd>{count}</dd>', text)
    if rel == 'apps.html':
        text = re.sub(r'App Store で公開中の\d+本と、審査中の1本。', 'App Storeで公開中のアプリと、審査中のアプリ。', text)

    if not rel.startswith('quest/'):
        return text

    science = COUNTS['junior-science']
    q, units = f'{science["uniqueQuestionCount"]:,}', science['unitCount']
    for old, new in {
        '12教材をすべて見る': '教材一覧を見る',
        '12教材を見る': '教材一覧を見る',
        '12教材のどれからでも。': '',
        '中学受験4科から資格・語学まで12教材': '中学受験・大学受験・資格・語学など18教材',
        '36単元7,742問': f'{units}単元{q}問',
        '36単元・7,742問': f'{units}単元・{q}問',
        '理科7,742問': f'理科{q}問',
        '生命ほか4分野。7,742問。': f'生命ほか4分野。{q}問。',
        f'{units}単元・{q}問です（2026年10月25日確認': f'{units}単元・{q}問です（{COUNT_DATE_JA}確認',
        f'{units}単元・{q}問（2026年10月25日確認）': f'{units}単元・{q}問（{COUNT_DATE_JA}確認）',
        '問題の数は2026年10月25日確認の収録データ': f'問題の数は{COUNT_DATE_JA}確認の収録データ',
        '理科の問題数は同じです。': '収録内容はアプリや配信バージョンにより異なります。',
        '国語の問題数は同じです。': '収録内容はアプリや配信バージョンにより異なります。',
        '合格！クエストは同じ理科に加えて': '合格！クエストは理科に加えて',
        'も、<br>同じ内容です。': 'は、<br>単体アプリです。',
    }.items():
        text = text.replace(old, new)

    # Course cards can appear on several related pages. Match their destination,
    # rather than replacing the standalone science app's historical 36 units.
    text = re.sub(r'<a class="ccard"[^>]*href="/quest/courses/science/"[^>]*>.*?</a>', _number_block, text, flags=re.S)
    if rel in {'quest/courses/science/index.html', 'quest/juken/science/index.html'}:
        text = re.sub(r'<dl class="course-numbers">.*?</dl>', _number_block, text, flags=re.S)
        text = re.sub(r'<p class="count-note">.*?</p>', '<p class="count-note">' + SCIENCE_DETAIL_NOTE + '</p>', text, count=1, flags=re.S)
    if rel == 'quest/index.html':
        def school_card(match):
            card = match.group(0)
            card = re.sub(r'(<h3>理科</h3><p><b>)[\d,]+', lambda m: m[1] + q, card)
            card = re.sub(r'<b>\d+</b>単元', f'<b>{units}</b>単元', card)
            # The current release verifies totals, not an updated domain breakdown.
            return re.sub(r'(<li>[^<]+)<small>\d+</small>(</li>)', r'\1\2', card)
        text = re.sub(r'<article class="subj"[^>]*>\s*<header><h3>理科</h3>.*?</article>', school_card, text, flags=re.S)
    if rel == 'quest/juken/index.html':
        text = re.sub(r'(<a href="/quest/juken/science/">理科</a></th><td>)\d+単元</td><td>[\d,]+問',
                      lambda m: m[1] + f'{units}単元</td><td>{q}問', text)
        text = text.replace('合格！クエストの中学受験4科（2026年10月25日確認', f'合格！クエストの中学受験4科（{COUNT_DATE_JA}確認')
    if rel.startswith('quest/juken/') or rel == 'quest/faq/index.html':
        # These are in-app difficulty labels, not measured mock-exam scores.
        text = text.replace('難易度は偏差値の目安で40・50・60・70に分かれており', '難易度は40・50・60・70の4段階を目安としており')
        text = text.replace('偏差値の目安', '難易度の目安').replace('偏差値40', '難易度40').replace('偏差値50', '難易度50')
    return text


def apply(write=True):
    paths = [*ROOT.glob('*.html'), ROOT / 'about/index.html', *(ROOT / 'quest').rglob('*.html')]
    changed = []
    for path in sorted(set(paths)):
        rel = path.relative_to(ROOT).as_posix()
        before = path.read_text()
        after = transform(rel, before)
        if before != after:
            changed.append(rel)
            if write:
                path.write_text(after)
    return changed


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--check', action='store_true', help='Report inconsistent copy without writing files')
    mode.add_argument('--write', action='store_true', help='Apply only reviewed copy/number corrections')
    args = parser.parse_args()
    changed = apply(write=args.write)
    print(json.dumps({'mode': 'write' if args.write else 'check', 'changed': changed}, ensure_ascii=False))
    raise SystemExit(1 if args.check and changed else 0)
