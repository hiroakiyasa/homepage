"""Finalize the one-time migration, before switching to read-only validation."""
from pathlib import Path
p=Path('scripts/site-redesign/build.py');s=p.read_text()
s=s.replace('<span>© 2026 TrailFusion AI</span>','<span>© <span id="year">2026</span> TrailFusion AI</span>')
s=s.replace('このページには、確認できた正式なストアURLが揃うまではダウンロードボタンを掲載しません。最新の配信先・対応端末についてはサポートにお問い合わせください。','最新の配信先・対応端末については、サポート窓口へお問い合わせください。ご利用前に、学習内容とお使いの端末の対応をご確認ください。')
s=s.replace('確認できていない利用者数・評価・学習成果を、実績として掲載することはしません。','ご利用者からの声をもとに、問題や解説、使い勝手の改善を続けていきます。')
s=s.replace('実際のアプリ画面。表示はバージョンにより異なります。','アプリの紹介画像。画面・収録内容はバージョンにより異なります。')
s=s.replace('実際の画面で、学びをイメージ。','紹介画像で、学びをイメージ。')
s=s.replace('単元や問題の収録状況は、アプリの最新版でご確認ください。','単元や問題の収録状況は、アプリの最新版でご確認ください。掲載画像は紹介用のため、収録内容や表示が最新版と異なる場合があります。')
# A migration helper must never silently restore old content during routine maintenance.
if 'Explicit migration opt-in' not in s:
    s=s.replace("DOMAIN='https://trailfusionai.com'", "# Explicit migration opt-in: normal CI validates committed HTML without regenerating it.\nif '--rebuild-from-backup' not in sys.argv:\n    raise SystemExit('One-time migration helper: use --rebuild-from-backup deliberately. Normal page edits do not require regeneration.')\nDOMAIN='https://trailfusionai.com'")
s=s.replace('python scripts/site-redesign/build.py`','python scripts/site-redesign/build.py --rebuild-from-backup`')
s=s.replace('## 生成\\n','## 生成（初回移行専用）\\n通常の更新はコミット済みのHTML・CSS・JSを編集し、検証だけを実行してください。移行用スクリプトは過去の内容を基準にするため、自動デプロイや通常の修正時には再実行しません。\\n\\n')
s=s.replace('公開コミットを取り消す場合は、','公開コミットを取り消すと、元のページ内容へ戻り、旧自動上書き処理の停止は維持されます。公開コミットを取り消す場合は、')
if "write('docs/site-redesign-manifest.json'" not in s:
    s=s.replace("(OUT/'build-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))", "write('docs/site-redesign-manifest.json',json.dumps(report,ensure_ascii=False,indent=2)+'\\n')\n(OUT/'build-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))")
# Sharing cards follow the selected learning app instead of one generic card.
s=s.replace("('learn' if active not in ['travel','diy','care'] else active)", "(app['id'] if app and app.get('id') else ('learn' if active not in ['travel','diy','care'] else active))")
s=s.replace("for key in ['learn','travel','diy','care']:", "for key in ['learn','travel','diy','care','rika','social','kokugo']:")
s=s.replace("'care':['KNOW','YOUR HIACE.']", "'care':['KNOW','YOUR HIACE.'],'rika':['SCIENCE','QUEST'],'social':['SOCIAL','QUEST'],'kokugo':['JAPANESE','QUEST']")
s=s.replace("if key=='learn':\n            for i,a in enumerate(APPS):", "if key in ['learn','rika','social','kokugo']:\n            for i,a in enumerate(APPS if key=='learn' else [a for a in APPS if a['id']==key]):")
p.write_text(s)
p=Path('scripts/site-redesign/validate.py');s=p.read_text()
s=s.replace("report=json.loads((OUT/'build-report.json').read_text());errors=[]", "manifest=OUT/'build-report.json'\nif not manifest.is_file():manifest=ROOT/'docs/site-redesign-manifest.json'\nreport=json.loads(manifest.read_text());errors=[]")
if 'Ensure the preservation baseline' not in s:
    s=s.replace("def orig(path):return", "# Ensure the preservation baseline is available in shallow read-only CI.\ntry:subprocess.check_call(['git','cat-file','-e',BASE+'^{commit}'],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)\nexcept subprocess.CalledProcessError:subprocess.check_call(['git','fetch','--depth=1','origin',BASE],cwd=ROOT)\ndef orig(path):return")
p.write_text(s)
