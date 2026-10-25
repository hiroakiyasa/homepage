# 合格！Quest 統合版サイト

2026-10-25。既存の `/quest/` はアプリ一覧への転送のみだったため、統合版の専用サイトに置き換えた。対象はホームページであり、アプリ本体・課金商品・ストア本文は変更しない。

## 構成と意図

- `/quest/`：図鑑と王国を同時に見せるトップ。学び方、12教材、王国、体験問題、家庭での使い方、FAQ、ダウンロード。
- `/quest/courses/{slug}/`：公開対象12教材それぞれの詳細。対象者、学習内容3項目、実教材画像と拡大表示、使い方、関連教材。
- `/quest/kingdom/`：王国の実画面、街／領地の表示切り替え、コイン・建築・ランク・名所。
- `/quest/rika-shakai/`・`/quest/school4/`：中学受験の検索・紹介向けの入口。
- `/quest/plans/`：無料・単科・4科・全科目の違い、契約管理、購入済みユーザーの復元。
- `/gokaku-quest.html`：専用トップへの互換転送。クエリとハッシュを保持。
- 旧社会・理科・国語・ITページは本文を保存し、統合版の教材・復元案内への導線を追加。

受験家庭だけに閉じず、資格・就職、語学、暮らしの学習者も自分の教材を見つけられる構成。教材を絞り込めるが、JavaScriptが無効でも全12教材とストアリンクを表示する。

## 確認した情報

| 確認先 | 発見 | 設計への反映 |
| --- | --- | --- |
| [既存のQuest入口](https://trailfusionai.com/quest/) | 調査時はアプリ一覧へ転送 | 統合版の専用トップにする |
| [旧社会のページ](https://trailfusionai.com/social-quest.html) | 単科アプリとして案内。同じストアIDが統合版の掲載先 | SEOの入口を残し、統合版と購入済みユーザーへの案内を追加 |
| [App Store](https://apps.apple.com/jp/app/id6775411516) | 本文は12科目、16領地の王国、建築を案内。商品一覧には新全科目月3,980円・年34,800円と旧商品が併存 | 公開iOS版の12教材を基準にする。購入可能な価格は商品一覧から断定しない |
| [Google Play](https://play.google.com/store/apps/details?id=com.gokakushakaiquest.app) | 本文に単科・4科・全科目の料金。全科目は月1,980円・年14,800円の旧説明 | Androidも同じ料金・機能と断言しない。価格は実購入画面に統一して案内 |
| [スタディサプリ小学講座](https://studysapuri.jp/course/elementary/) | 対象者への価値、無料体験、料金への導線を明確に提示 | 最初の画面に目的と行動を置き、無料と有料を区別 |
| [StudyCrew](https://studycrew.jp/) | 保護者の復習負担、使い方、実画面を中心に構成 | 家庭での具体的な利用場面と実教材を提示。競合のAI機能をQuestの機能と混同しない |
| [CHIZU QUEST](https://chizu.shukudan.com/) | 実際に触れる地図・クイズと単元への直接導線 | ページ内の一問体験、教材への直接リンク、画像の拡大表示 |
| ローカル `quest_platform/config/release-scope.v1.json` | 公開対象は12教材。開発中の教材は別 | AWS・PMPなど開発側に存在する未公開教材を販売対象にしない |
| ローカル `quest_platform/config/course-bindings.json` | 各教材の説明・対象分野 | 12教材の紹介内容の根拠 |
| ローカル `quest_platform/config/monetization.v1.json` | 新旧商品、復元ポリシー、単科・4科・全科目の区分 | 新規購入と既存権利を分ける |

公開ページとローカル実装を比較しており、iOS/Androidの実購入フローを今回操作したわけではない。売上・利用者数・有料転換率の効果検証も未実施。合格率・正解率・利用者の声を創作していない。提案文のKPI・収益モデルは実績として掲載していない。

## 素材

`assets.json` は、各図鑑の正本参照キー・元SHA-256・採用画像を記録。`questions.json` は問題用イラストの出典問題を記録。図鑑は統合版の同梱スターター参照から採取し、元ファイルには変更を加えていない。画像はWebPへ縮小し、拡大表示でも読める解像度を保持。

問題画面は `quest_platform/output/playwright/starter-delivery/` の実画面から、画像が欠落していないものを使用。ITパスポートと運転免許には同梱の問題用イラストを掲載。SPI3と英語は図鑑と王国画面を掲載し、存在しない問題画面を作っていない。

王国は `output/playwright/night-tuning-20261024/` および `apps/mobile/assets/city/manual/` の実画面。発展済み画面を初期状態と誤解させない注記を付けた。サイト用のてこ問題はアプリ画面の再現ではなく、明示した独立の体験問題。

元教材の再監修・独立QAではない。今回の確認範囲はサイト上の掲載内容、出典の照合、画像の表示とページ操作。

## ビルドと検証

```sh
python3 scripts/quest/build.py
node --check assets/quest/quest.js
# Pythonの検証用環境に beautifulsoup4 / playwright / pillow が必要
python3 scripts/quest/validate.py
```

生成は標準ライブラリだけで実行できる。検証はChromeとWebKitで実ページを起動し、外部通信を遮断する。画面と結果は `output/playwright/quest/` に保存。生成したHTMLは静的配信でき、追加のビルドサービスは不要。

リポジトリの `npm test` は「no test specified」のプレースホルダー。Quest用のJS構文確認、リンク・構造化データ、実ブラウザのレスポンシブ・操作検証を行う。既存の全サイト生成スクリプトは過去の全サイト再構築用なので実行しない。そこから `/quest/` を上書きする行だけ外した。

## 計測

既存GA4設定を利用。`quest_store_click` は store / placement / course / page_path、`quest_course_filter` は category を送る。問題の回答・名前・学習履歴は送らない。検証では外部送信を遮断し、イベント生成をローカルで確認する。GA4管理画面での実受信、ストアからDL・初回学習・購入への接続は別工程。

## 公開前後の確認点

- ストアの説明と実購入画面の不一致は、Webサイトだけでは解消できない。価格改定や契約条件変更はしていない。
- App Store掲載スクリーンショットには本文と異なる教材数があるため、その数字をサイトへ転載していない。
- ストアへの導線は統合版の実IDを使用する。購入操作・広告出稿は行わない。
- GitHub Pagesはmasterへのpushで公開される。実装ブランチのpushだけでは公開されない。
