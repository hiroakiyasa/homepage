# 明るいヒーローへの更新 — 2026-09-16

見出し：学びも、旅も、DIYも、車旅も。

白・空色・ミントを基調に、読みやすい濃色の文字と明るい画像カードを組み合わせました。既存の生成画像の元データを959×540の独立したAVIF（22,021 bytes）へ書き出し、低解像度のスプライトを縦長に拡大する方式をやめています。画像の新規生成はしていません。

元のロゴと、/quest/・/travel/story.html・/camping.html・/maintenance.htmlへの共通ナビゲーションを保持。合格クエストのボタンを主導線としています。FAQの構造化データは実際に表示する質問・回答と一致させ、llms-full.txtのトップページ要約も更新しました。

変更したヒーローのスタイルは assets/css/home-daylight.css に分離。スマートフォンの左右余白は20px（360px未満は18px）。学習アプリ・3D・地図・整備記録の機能は変更していません。

公開直前のmasterに追加されていたヒーロー関連変更も確認してから、この検証済みヒーローへ統合しました。assets/css/home-sunshine.css は削除せず履歴とともに保持していますが、新ヒーローでは読み込みません。

検証：既存625件、新規127件。Chromium・WebKit、幅320/390/430/768/1024/1440px。実機iPhoneでの検証ではありません。通常のPages公開前にも両検証を実施します。移行用の書き戻しスクリプトやワークフローは本番に含めていません。

## バックアップ
- 作業開始前：backup/pre-daylight-hero-20260916（7044a6f5b08207fa5f2c079a3999bae5fd9d581b）
- 公開直前：backup/pre-daylight-release-20260916（eef93da0a871f1ca3a74bfb09f3c13f8431c6b90）

元へ戻す場合は `feat: brighten homepage hero with requested learning travel DIY copy` という公開コミットを `git revert` して通常のpushを行います。force pushや過去の移行スクリプトの再実行は不要です。
