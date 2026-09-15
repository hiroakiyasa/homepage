# サイト再構成・更新ガイド

更新日：2026-09-16

## 公開サイトの構成

トップ `/` は合格クエストを主役にしながら、車旅・DIY・整備の3カードを早い位置に掲載します。共通ナビには4つの入口を常設します。

| 分野 | 入口 | 詳細ページ |
| --- | --- | --- |
| 学ぶ | `/quest/` | 理科・社会・国語の各LP、英語・資格学習の案内、`/parents/`、`/choose/`、`/study/` |
| 旅する | `/travel/` | `/car-concierge.html`、`/drive-routes/`、`/travel/story.html` |
| つくる | `/diy/` | `/camping.html` の3D間取り、`/camping-guide.html` の制作ガイド |
| 整える | `/maintenance/` | `/maintenance.html` の3D解説とローカル整備記録 |

`/apps.html` は11アプリの分類付きカタログです。配信が確認できないアプリも、案内ページとして掲載しています。カタログの掲載数と現在ダウンロード可能なアプリ数は同じではありません。

## 通常のページ更新

コミット済みのHTML・`assets/css/site-v2.css`・`assets/js/site-v2.js`を編集してください。今回の生成処理は初回移行専用です。

**`scripts/site-redesign/build.py` を通常のデプロイや更新で再実行しないでください。** 過去の基準コミットからページを再構成するため、後日の編集を上書きします。意図的な再移行だけ、`--rebuild-from-backup` を付けて実行できる安全ガードがあります。

CIは生成も自動コミットも行わず、確定済みHTMLを読み取り検証します。Pages公開は検証成功後だけ実行します。以前のページを自動復元する2つの旧ワークフローは削除済みです。

検証環境の例（Python 3.12、Git、Chromiumの動作する環境）：

```sh
python -m pip install beautifulsoup4==4.13.4 pillow==11.3.0 playwright==1.55.0
python -m playwright install --with-deps chromium
python scripts/site-redesign/validate.py
```

レポートは `/tmp/site-redesign-results/validation-report.json`、画像は同ディレクトリの `screenshots/` に出力されます。検証対象・移行前の識別情報は `docs/site-redesign-manifest.json` にあります。3Dを意図的に変更する場合には、保持用ハッシュ検証もレビューのうえ更新してください。CIのソフトウェアGPUでは3Dの画像保存のみタイムアウトする場合があります。画像保存の警告と動作検証の失敗は区別しています。

## 保持した内容

キャンピングカーの `hiace-*` スクリプト、整備アプリのJavaScriptとローカルストレージ、地図の操作・データを維持しています。契約・プライバシーの本文は変えず、周辺ナビを更新しています。整備記録は利用者のブラウザ内のデータであり、Gitバックアップに含まれません。利用者はJSON書き出しで別途保存してください。

中学受験の理科・社会・国語LPは日本語中心の静的ページとして再制作しました。これら3LPの旧多言語切替UIは移植していません。他アプリ・規約ページの既存言語切替は保持しています。アプリそのものの言語機能は変更していません。

## SEO・AI検索

説明文を静的HTMLにし、意味のあるカテゴリ内リンク、canonical、OG画像、パンくず、実内容に一致するJSON-LDを整備しました。robotsの既存AI検索・学習クローラーの設定は保持し、整備ページへの一律の拒否を解除しました。

`llms.txt` と `llms-full.txt` は、公式情報に辿り着くための任意の索引です。AI検索への掲載、引用、順位を保証する仕組みではありません。料金・配信状況・内容を変更するときは、HTML、構造化データ、`assets/data/products.json`、LLM用索引を一緒に更新してください。新ページの公開・廃止時はサイトマップも更新します。

## ASOで今回変更した範囲

ウェブの商品名・説明・紹介画像・ストアへの導線・Smart App Bannerを整備しました。ストアURLは既存の公式サイトを根拠に保持しています。最新バージョンや各地域の実配信を保証するものではありません。

App Store Connect / Google Play Console側の名称、サブタイトル、キーワード、スクリーンショット、カスタムプロダクトページ、実験設定は変更していません。英語クエストの正式ストアURLは確認できていないため、問い合わせ導線のみです。未確認の評価、ダウンロード数、問題数、現在価格は追加していません。

掲載する画像は既存のアプリ紹介画像です。画面・問題数などが最新版と異なる可能性があるため、次回のアプリ更新とあわせて実画面を確認してください。英語クエストは英語・資格学習の領域で、中学受験の主要3教科とは区別しています。

## 計測とプライバシー

既存GA4の測定IDを維持し、以下のウェブ内イベントを追加しました。

- `store_click`：app_id / store / placement / page_path
- `app_detail_click`：app_id / placement / page_path
- `hub_navigation`：hub / placement / page_path

選択ガイドの回答・学年・氏名は送信せず、画面内で処理します。遷移先の通常のページ計測は行われます。ストアボタンクリックはインストール数や課金数ではありません。Appleのキャンペーン計測は、実際のプロバイダートークンをApp Store Connectで取得して設定する必要があります。

## バックアップ・復元

`backup/pre-site-restructure-20260915` が改修前の保存ブランチです。基準コミットは `b8c922f00f90f1e443b02253dd78d5f60b2de53d`。復元は `docs/ROLLBACK-SITE-20260916.md` に従い、公開コミットを `git revert` してください。force pushは不要です。旧自動書き戻し処理の停止は、公開コミットの親に分離しているため、ページを戻しても停止状態を維持できます。

## 参考にした一次資料

- https://developers.google.com/search/docs/appearance/ai-features
- https://developer.apple.com/app-store/product-page/
- https://developer.apple.com/jp/help/app-store-connect-analytics/acquisition/campaign-links
- https://developers.openai.com/api/docs/bots
- https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows
- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
