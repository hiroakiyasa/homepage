# サイト再構成と運用

## 構成
合格クエストをトップの主役にしつつ、学ぶ・旅する・つくる・整えるの4入口を常設。既存の商品・3D間取り・DIY記事・整備記録・地図のURLは維持。学習の3教科と英語・資格学習は用途を区別。

## 生成（初回移行専用）
通常の更新はコミット済みのHTML・CSS・JSを編集し、検証だけを実行してください。移行用スクリプトは過去の内容を基準にするため、自動デプロイや通常の修正時には再実行しません。

`python scripts/site-redesign/build.py --rebuild-from-backup`。基準コミット `b8c922f00f90f1e443b02253dd78d5f60b2de53d` の原文から旧ページを再構成するため冪等です。今後旧コンテンツを更新するときは、元ページを参照する方式を見直して新しい編集を上書きしないこと。直接編集するページと生成ページを混在運用しないでください。

## 保持対象
キャンピングカー3Dのhiace-*スクリプト、整備アプリのJS/ローカルストレージ、地図アプリの操作・データを保持。契約・プライバシー本文は変更せず周辺UIだけ更新。中学受験の3LPは日本語の静的ページとして再構築。既存の英語などのアプリ内機能を変更するものではありません。旧3LPのページ翻訳UIは新しい日本語中心の構成には移植していません。

## SEO / AI検索
静的HTMLの説明、カテゴリ内リンク、canonical、OG、BreadcrumbList、実内容と一致する構造化データを整備。robotsの既存AI検索/学習クローラー許可方針は保持し、整備ページの一律拒否を解除。llms.txt/llms-full.txtは補助索引であり表示・引用・順位の保証ではありません。

## ASOとの境界
ウェブ側の商品名・説明・実画面・ストアリンク・Smart App Bannerを整備。App Store Connect / Google Play Consoleの名称、サブタイトル、キーワード、ストアスクリーンショット、カスタムプロダクトページは変更していません。確認できていない英語クエストのストアURL、評価・DL数・問題数・最新価格は捏造しません。

## 計測
既存GA4 IDを使用。`store_click`（app_id/store/placement/page_path）、`app_detail_click`、`hub_navigation`を送信。選択ガイドの回答や学年、氏名は送信しない。ストアクリックはインストール・課金の計測ではありません。AppleのキャンペーントークンはApp Store Connectで取得し、実際のプロバイダートークンを設定する必要があります。

## 次のストア運用
実際のストア情報で対象・料金・画像を揃える。公式のプロダクトページ最適化で画像やコピーを検証。インストール後の継続・課金と合わせて評価する。自動で順位が上がるとは考えない。

## 一次資料
- https://developers.google.com/search/docs/appearance/ai-features
- https://developer.apple.com/app-store/product-page/
- https://developer.apple.com/jp/help/app-store-connect-analytics/acquisition/campaign-links
- https://developers.openai.com/api/docs/bots
