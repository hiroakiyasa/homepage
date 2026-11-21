# 大学受験と日英語学の導線拡充（2026-11-21）

## 変更の目的

既存の中学受験の入口を保ち、大学受験の6科目をトップから見つけやすくする。国際向けの紹介は、実際に英語の解説に対応する日本語クエスト（Japanese Quest）とEnglish Questの2教材に限定する。

この作業は公開済みcommit a0c38e8ce3415f32693e789bb5e893c405433844 を基点とし、独立worktree/branchで実施する。コードと日本語・英語コピーは通常ChatGPTで作成した。既存画像を再利用し、新しい画像生成は行っていない。

## 公開対象の変更

- ブランドトップとQuestトップに「語学」の入口を追加。中学受験・大学受験・資格・就職と並べ、大学6科目への直接リンクも設置。
- Questトップの中学受験4科の紹介を保ち、その次に大学6科目のカードを追加。トップの追加教材一覧を8から14に修正し、既存の「18教材」と表示を一致させる。
- 大学ハブに科目別の収録範囲を比較できるHTML表を追加。6科目の個別LPは全単元名を保ち、科目固有の復習方法・パンくず・他科目へのリンクを追加。
- 数学ⅠAの内訳を「48学習単元＋オリジナル模試4回」と明示。全6科目の一覧は315学習単元＋模試4回＝319項目。
- 新設 /quest/languages/ と /en/quest/ は、内容が対応する日本語・英語の2教材ガイド。相互hreflangとx-defaultを設置。
- 既存 /en/japanese-quest.html と /en/eigo-quest.html はURL/title/H1/canonicalを維持して、対応する英語解説の範囲・FAQ・言語ハブへのリンク・ストア計測を追加。
- 英語トップと英語アプリ一覧の語学枠から、2教材の比較へ接続。
- llms.txtとllms-full.txtに同じ範囲を補足。過去の「in English」という見出しは、日本語の受験教材を英語で説明する要約であることを明確にする。

## 検索資産の保護

検索順位が変わらないことを技術変更だけで保証することはできない。既存の検索導線を維持するため、以下を検証する。

1. 中学受験16ページと既存FAQ・料金2ページ、計18ページのファイル全体を基点commitとバイト単位で照合。
2. 変更した既存13ページ（日本語トップ、Questトップ、大学7ページ、英語4ページ）のURL、title、H1、canonicalを同じ値で維持。
3. 既存sitemapの712URLをすべて保持。新しい語学ハブ2URLだけを追加し、合計714URL。保護対象のsitemap項目もそのまま維持。
4. URL削除、リダイレクト追加、noindex化は実施しない。
5. 全18教材の /quest/ と2教材限定の /en/quest/ を、同じ内容の翻訳としてhreflangで結びつけない。新設の日英語学ハブ同士だけを結びつける。
6. 既存中学受験ページの本文・キーワード・見出しの置き換えは行わない。

before/afterのSHA-256と保護フィールドの全文は output/quest-global-university/preservation.json に記録する。上記の18という数は、専用の受験ページ16＋その導線に使われるFAQ/料金2の内訳であり、対象を曖昧に数えていない。

## 表現の根拠と限界

大学の既存スナップショットは docs/quest/growth-release.json。今回の再照合および語学2教材のソースSHA-256は docs/quest/global-language-scope-20261121.json に記録。

- 公開対象は情報Ⅰ45、数学ⅠA52（模試4回を含む）、地理55、日本史60、化学52、物理55。
- 公共・政治経済は現在の公開ゲートに含まれないため、配信済みとして掲載しない。
- 化学・物理はrelease対象に含まれるが、他科目と同じ有料プランの販売対象とは限らない。全科目Pro対応・全内容無料とは表現しない。
- 日本語クエストは生活日本語A1〜B1、JLPT N5〜N1、JFT-Basicの学習track。学習する言語は日本語。
- English Questは語彙・文法・会話表現・読解等の教材。学習する言語は英語。ソースの古いcatalog title「Practical English」は公開ブランドに使わない。
- 両教材の代表的な問題データで英語のhint/explanationを確認。日本語教材は英語の解説、英語教材は英語・日本語の解説に対応する。
- UIに13言語の選択肢があっても、全問題・全図鑑・全UIが13言語で完全対応するという意味にはしない。英語UIにも一部日本語の表示が残るため、完全な英語UIとは主張しない。
- AI会話・音声の実サービス疎通は今回の範囲で確認していないため、新しい訴求には含めない。
- 既存図鑑画像に日本語が含まれることを画像の近くの説明文に明記し、英語に置き換えた画像として見せない。
- 現在のソース/配信設定の確認と、新しいストアバイナリが利用者全員に配信済みであることは別。今回CDN latest pointerの取得は403だったため、新しい公開版の動作保証とは扱わない。

## ストアと計測

大学のApple CTAは標準ページを利用する。未承認の大学CPPへ接続しない。既存の資格A/BのCTAは前回確認したapproved CPPのまま。Google Playの未公開カスタム掲載には接続しない。

語学CTAは同じ統合アプリのApple ID 6775411516、Android package com.gokakushakaiquest.app を使う。Appleのct/mt、Google Playのreferrer/hlを追加。Appleのprovider tokenがないため、これだけでAppleのインストール計測が完結したとは扱わない。

言語リンクは quest_audience_route、ストアCTAは quest_store_click を使い、audience=language とcourseを記録する。既存ブランドイベントは維持し、同じQuestイベントを二重発火させない。GA4への実通信・取り込みはローカルQAでは行わない。Webクリックはダウンロード数ではない。

Search Consoleの既存ベースラインはroot担当が2026-11-21に取得済み（10/22〜11/18）。変更公開後の比較は同じ期間幅・ページ・国・端末・検索語の条件を揃え、中学受験の既存ページを継続して確認する。

## 検索とAI検索の整備方針

Googleの一次資料を2026-11-21に確認した。

- AI features and your website: https://developers.google.com/search/docs/appearance/ai-features
- Localized versions: https://developers.google.com/search/docs/specialty/international/localized-versions
- General structured data guidelines: https://developers.google.com/search/docs/appearance/structured-data/sd-policies

公開HTMLに本文・単元一覧・FAQ・内部リンクがあり、JavaScriptなしでも読むことができる。構造化データは表示した内容と一致させ、架空の評価や試験得点は追加しない。国際ページは同一内容の日英ページ同士で相互参照する。

llms.txtは補助資料であり、Google AI検索に必要な特別なファイルとも、順位を上げる保証とも説明しない。FAQ JSON-LDの特別表示も保証しない。

## 再生成・検証

- /opt/homebrew/bin/python3.13 scripts/quest/growth.py
- /opt/homebrew/bin/python3.13 scripts/brand/check-static.py
- node scripts/add-visitor-counters.mjs --check
- node --test tests/visitor-counter.test.mjs tests/global-locale.test.mjs
- /opt/homebrew/bin/python3.13 scripts/quest/validate-growth.py
- /opt/homebrew/bin/python3.13 scripts/quest/validate-global-university.py
- git diff --check

新しい拡張処理は scripts/quest/growth_enrichment.py。既存growth.pyの末尾と、ブランドの英語更新処理の末尾から再適用する。再生成の再実行で19の対象出力ファイルに追加差分がないことを確認する。

画面確認はインストール済みChromeで320/390/1440px。画像の破損、ページ横方向のはみ出し、FAQ、ストアイベント、JavaScriptを無効にした場合を確認する。WebKitは環境に未インストールで、Safari・実機iPhone確認とは表現しない。スクリーンショットとJSON証跡は output/quest-global-university/ に保存する。

## 公開と切り戻し

この文書の作成時点では実装とローカル検証まで。独立レビューで差分・画像・保護結果を確認し、rootの公開GO後に対象commitだけを公開する。

公開時にはorigin/masterの最新を取得し、基点から進んでいれば衝突・差分をレビューしてから進める。他担当の変更を上書きしない。push後はGitHub Pagesの成功と、変更した公開URLの内容・canonical・言語リンク・ストアリンクを確認する。

問題が発生した場合は今回の公開commitだけをrevertして再デプロイする。既存a0c38e8cや他担当commitを巻き戻すreset/force pushは行わない。新しい語学URLを検索に登録後に取り下げる場合は、単純削除せず適切な案内/転送方針を別途レビューする。
