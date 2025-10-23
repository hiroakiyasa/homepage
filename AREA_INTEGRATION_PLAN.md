# エリア別レストランデータ統合計画

## 📊 現状分析

### レストランデータの概要
- **場所**: `/Users/user/WebApp/camping_note/restaurants_data/`
- **エリア数**: 377エリア
- **ファイル形式**: `area_{エリア名}.json`
- **都道府県データ**: `prefecture_{都道府県名}.json`

### データ構造
```json
{
  "name": "札幌",
  "type": "area",
  "rankingUrl": "https://tabelog.com/...",
  "restaurantCount": 60,
  "below35Found": false,
  "restaurants": [
    {
      "name": "すし宮川",
      "score": 4.49,
      "latitude": 43.06213353371688,
      "longitude": 141.31762085668927,
      "genre": "寿司",
      "dinnerBudget": "￥30,000～￥39,999",
      "lunchBudget": "-",
      "address": "北海道札幌市中央区...",
      "parking": "無",
      "businessHours": [...],
      ...
    }
  ]
}
```

---

## 🎯 統合要件

### 1. エリアフィルタリング
**目的**: 車中泊スポット紹介ページを、レストランデータがあるエリアに限定

**実装内容**:
- [ ] エリアマスターリスト生成
  - restaurants_dataフォルダから全エリア名を抽出
  - エリア名とファイルパスのマッピング作成

- [ ] イベント-エリアマッピング
  - Supabase `festivals` テーブルに `area_name` カラム追加
  - イベントとエリアを紐付け（例: 小樽雪あかりの路 → 小樽）

- [ ] フィルタリングロジック
  - ページ生成時に対象エリアのレストランデータ存在チェック
  - データがない場合はスキップまたは警告

### 2. トップ5レストラン表示
**目的**: 各エリアのスコア上位5件のレストランを地図とリストに表示

**実装内容**:
- [ ] レストランデータ取得関数
  ```javascript
  // src/restaurantDataService.js
  async function getTopRestaurants(areaName, limit = 5) {
    const filePath = `/Users/user/WebApp/camping_note/restaurants_data/area_${areaName}.json`;
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return data.restaurants.slice(0, limit); // 既にスコア順
  }
  ```

- [ ] 地図マーカー追加
  - 🍴 レストランマーカー（オレンジ色）
  - クリックでポップアップ表示（名前、スコア、ジャンル、予算）

- [ ] HTMLセクション追加
  ```html
  <h3>🍴 周辺おすすめレストラン（トップ5）</h3>
  <div class="restaurant-list">
    <!-- レストランカード -->
  </div>
  ```

---

## 🛠️ 実装計画

### Phase 1: データ統合基盤
**期間**: 1-2日

#### ファイル構成
```
camping-spot-publisher/
├── src/
│   ├── restaurantDataService.js  【新規】レストランデータ取得
│   ├── areaMapper.js             【新規】エリアマッピング
│   └── otaruDataFetcher.js       【更新】レストラン統合
├── data/
│   └── area-master.json          【新規】エリアマスター
└── generate-area-master.js       【新規】エリアリスト生成
```

#### タスク
- [x] レストランデータ構造確認
- [ ] `generate-area-master.js` 作成
  - restaurants_dataフォルダをスキャン
  - エリア名抽出してJSON出力
- [ ] `restaurantDataService.js` 作成
  - getTopRestaurants(areaName, limit)
  - getRestaurantsByScore(areaName, minScore)
- [ ] `areaMapper.js` 作成
  - イベント → エリア名の変換
  - 例: "小樽雪あかりの路" → "小樽"

### Phase 2: 地図・HTML統合
**期間**: 2-3日

#### タスク
- [ ] `generate-otaru-map.js` 更新
  - レストランマーカー追加
  - カスタムアイコン（🍴）
  - ポップアップ内容設計

- [ ] `generate-otaru-html.js` 更新
  - レストランセクション追加
  - レストランカードデザイン
  - クリックで地図連動

- [ ] CSSスタイル追加
  ```css
  .restaurant-card {
    background: #fff8e1;
    border-left: 4px solid #ff9800;
    padding: 15px;
    margin-bottom: 10px;
  }

  .restaurant-score {
    font-size: 18px;
    color: #ff6f00;
    font-weight: bold;
  }
  ```

### Phase 3: 汎用化
**期間**: 3-4日

#### タスク
- [ ] テンプレート化
  - イベント/エリア情報を変数で差し替え
  - HTMLジェネレーターを汎用関数に変更

- [ ] バッチ処理対応
  - 全エリアのページ一括生成
  - エリアマスターリストをループ

- [ ] エラーハンドリング
  - レストランデータが存在しない場合
  - 座標データが不正な場合

---

## 📋 データフロー

```
[restaurants_data/area_小樽.json]
         ↓
[restaurantDataService.getTopRestaurants("小樽", 5)]
         ↓
[トップ5レストラン抽出]
         ↓
    ┌────┴────┐
    ↓         ↓
[地図生成]  [HTML生成]
🍴マーカー   レストランセクション
    ↓         ↓
[parking-map.html] [otaru-wordpress.html]
         ↓
   [WordPress投稿]
```

---

## 🗺️ 地図レイアウト（更新版）

### マーカー凡例
- 🔴 **イベント会場**（赤）
- 🔵 **駐車場**（青）
- 🏪 **コンビニ**（緑）
- 🚻 **トイレ**（茶）
- ♨️ **温泉**（ピンク）
- 🍴 **レストラン トップ5**（オレンジ）← **NEW**

### ポップアップ内容
```javascript
// レストランマーカー
{
  title: "すし宮川",
  content: `
    <strong>すし宮川</strong><br>
    ⭐ 4.49点<br>
    🍽️ ジャンル: 寿司<br>
    💰 ディナー: ￥30,000～￥39,999<br>
    📍 <a href="https://tabelog.com/hokkaido/A0101/A010101/1073214/" target="_blank">食べログで見る</a>
  `
}
```

---

## 📝 HTMLセクション（レストラン）

```html
<hr class="wp-block-separator"/>

<div class="wp-block-group alignfull has-global-padding">
  <h2 class="wp-block-heading has-text-align-center has-xl-font-size">
    🍴 周辺おすすめレストラン（評価トップ5）
  </h2>

  <p class="has-text-align-center has-text-color has-md-font-size">
    イベント周辺の高評価レストランをご紹介。車中泊の夕食・朝食におすすめです。
  </p>

  <div class="restaurant-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-top: 30px;">

    <!-- レストランカード1 -->
    <div class="restaurant-card" style="background: #fff8e1; border-radius: 8px; padding: 20px; border-left: 4px solid #ff9800;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <h3 style="margin: 0; font-size: 18px;">すし宮川</h3>
        <span class="restaurant-score" style="font-size: 20px; color: #ff6f00; font-weight: bold;">⭐ 4.49</span>
      </div>

      <div style="font-size: 14px; color: #666; margin-bottom: 8px;">
        <span style="background: #ff9800; color: white; padding: 2px 8px; border-radius: 4px; margin-right: 6px;">寿司</span>
        <span>💰 ディナー: ￥30,000～￥39,999</span>
      </div>

      <p style="font-size: 13px; color: #888; margin-bottom: 10px;">
        📍 北海道札幌市中央区北四条西25-2-2
      </p>

      <div style="display: flex; gap: 8px;">
        <a href="https://www.google.com/maps?q=43.06213353371688,141.31762085668927" target="_blank"
           style="background: #3B82F6; color: white; padding: 8px 12px; text-decoration: none; border-radius: 6px; font-size: 12px;">
          🗺️ 地図
        </a>
        <a href="https://tabelog.com/hokkaido/A0101/A010101/1073214/" target="_blank"
           style="background: #22D3EE; color: white; padding: 8px 12px; text-decoration: none; border-radius: 6px; font-size: 12px;">
          🔍 詳細
        </a>
        <button onclick="document.getElementById('parking-map-iframe').contentWindow.showMarker('restaurant_0')"
                style="background: #ff9800; color: white; padding: 8px 12px; border: none; border-radius: 6px; font-size: 12px; cursor: pointer;">
          📍 地図で表示
        </button>
      </div>
    </div>

    <!-- 残り4つのレストランカード... -->

  </div>
</div>
```

---

## 🔄 統合後のワークフロー

### 現在（小樽専用）
```
1. update-otaru-data.js 実行
   → 駐車場・周辺施設データ取得

2. generate-otaru-html.js 実行
   → WordPress HTML生成

3. generate-otaru-map.js 実行
   → 地図HTML生成

4. 手動でWordPressに投稿
```

### 統合後（汎用）
```
1. node generate-area-master.js
   → エリアマスターリスト生成（初回のみ）

2. node update-event-data.js --area=小樽
   → 駐車場・周辺施設・レストラン統合取得

3. node generate-event-page.js --area=小樽 --event=小樽雪あかりの路
   → HTML + 地図を一括生成

4. node publish-to-wordpress.js --area=小樽
   → WordPress API経由で自動投稿
```

---

## 📊 期待される成果

### ユーザー体験向上
- ✅ 車中泊＋食事の情報が1ページで完結
- ✅ 高評価レストランが一目でわかる
- ✅ 地図でレストラン位置を確認可能
- ✅ 予算・ジャンルで事前に選択できる

### SEO効果
- ✅ コンテンツの充実度アップ
- ✅ 「小樽 車中泊 レストラン」等のロングテールキーワード対応
- ✅ 滞在時間の増加

### 運用効率化
- ✅ 377エリア分のレストランデータを活用
- ✅ 手動でレストラン情報を探す必要なし
- ✅ 自動更新により常に最新情報を提供

---

## ⚠️ 注意事項・制約

### データ品質
- [ ] レストランの座標データ精度確認
- [ ] スコア3.5未満のデータ除外検討
- [ ] 閉店情報の定期更新が必要

### パフォーマンス
- [ ] 地図にマーカーが多すぎる場合の対処
  - 駐車場10 + コンビニ3 + トイレ3 + 温泉3 + レストラン5 = 最大24マーカー
  - クラスタリング導入を検討

### 著作権・利用規約
- [ ] Tabelogデータの二次利用規約確認
- [ ] 出典明記（「※レストラン情報は食べログより取得」）
- [ ] 商業利用の可否確認

---

## 🚀 次のアクション

### 即座に実装
1. ✅ レストランデータ構造確認（完了）
2. [ ] `generate-area-master.js` 作成
3. [ ] `restaurantDataService.js` 作成
4. [ ] 小樽ページにレストランセクション追加（テスト）

### 1週間以内
5. [ ] 地図にレストランマーカー追加
6. [ ] HTMLデザイン完成
7. [ ] 他エリアでテスト（札幌、函館など）

### 2週間以内
8. [ ] 汎用化（全エリア対応）
9. [ ] バッチ処理実装
10. [ ] WordPress API連携

---

## 📚 参考資料

- Tabelogデータ: `/Users/user/WebApp/camping_note/restaurants_data/`
- 既存実装: `/Users/user/WebApp/camping_note/camping-spot-publisher/src/otaruDataFetcher.js`
- WordPress HTML: `/Users/user/WebApp/camping_note/camping-spot-publisher/generate-otaru-html.js`
