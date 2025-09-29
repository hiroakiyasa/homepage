# 車中泊スポット自動投稿システム

Supabaseのデータベースから車中泊スポット情報を取得し、AIで評価して最適なスポットを毎日note.comに自動投稿するシステムです。

## 特徴

- 🤖 AIによるスポット評価（トイレ・コンビニ・温泉の近さ、料金を総合評価）
- 📸 Wikimedia Commonsから商用利用可能な画像を自動取得
- 📝 記事の自動生成（スポット情報、周辺施設、おすすめポイントを含む）
- 📅 毎日定時に自動投稿
- 🗄️ Supabaseデータベース連携

## セットアップ

1. 依存パッケージのインストール
```bash
npm install
```

2. 環境変数の設定（.envファイル）
```env
# Supabase Configuration
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key

# note.com API Configuration
NOTE_EMAIL=your-email@example.com
NOTE_PASSWORD=your-password
NOTE_USER_ID=your-note-user-id

# System Configuration
PUBLISH_HOUR=9
PUBLISH_MINUTE=0
```

## 使用方法

### 定期実行モード（毎日自動投稿）
```bash
npm start
```

### テストモード（即座に投稿）
```bash
npm test
```

### 単発実行モード（1回だけ投稿して終了）
```bash
npm run publish-once
```

## データベース構造

以下のテーブルからデータを取得：
- `parking_spots`: 駐車場・車中泊スポット
- `hot_springs`: 温泉施設
- `convenience_stores`: コンビニ
- `toilets`: トイレ
- `festivals`: お祭り・イベント

## AIスコアリング

各スポットは以下の基準で評価されます：
- トイレまでの距離（30%）
- コンビニまでの距離（20%）
- 温泉までの距離（20%）
- 駐車料金（30%）

## 投稿される記事の内容

- スポット基本情報（名称、住所、座標）
- AIスコア評価
- 駐車場情報（料金、収容台数、営業時間）
- 周辺施設情報（トイレ、コンビニ、温泉）
- 車中泊のポイント・アドバイス
- 画像（Wikimedia Commonsから取得）

## ログファイル

- `logs/publications.json`: 投稿履歴
- `logs/errors.log`: エラーログ
- `data/published_spots.json`: 投稿済みスポットID
- `drafts/`: ローカル保存された下書き（投稿失敗時）