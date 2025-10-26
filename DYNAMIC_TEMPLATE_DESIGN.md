# 動的テンプレート方式 設計書

## 1. 現在の問題点

### 問題
- **808個の地域HTMLファイル**が静的に生成されている
- すべてのファイルが**同じフォーマット**を使用
- 1箇所修正すると**808ファイル全て再生成**が必要
- 生成に時間がかかる（数分〜数十分）
- ファイルサイズが大きい（合計数百MB）

### 例
```
data/regions/
  ├── 銀座.html                 (100KB)
  ├── 銀座-map.html            (50KB)
  ├── 新宿.html                 (100KB)
  ├── 新宿-map.html            (50KB)
  └── ... (808箇所 × 2ファイル = 1,616ファイル)
```

**問題点:**
- CSS/JavaScriptを修正 → 808ファイル全て再生成
- ヘッダー・フッターを修正 → 808ファイル全て再生成
- いいねボタンを追加 → 808ファイル全て再生成

---

## 2. 解決策: 動的テンプレート方式

### コンセプト
**「1つのHTMLテンプレート + 地域ごとのJSONデータ」**

```
data/
  ├── region.html              (テンプレート: 1ファイルのみ)
  ├── region-data/             (地域データ)
  │   ├── ginza.json          (銀座のデータ)
  │   ├── shinjuku.json       (新宿のデータ)
  │   └── ... (808ファイル)
  └── regions-index.json       (全地域の一覧)
```

### メリット
✅ **1箇所修正で全地域に反映**（テンプレート1ファイル修正のみ）
✅ **ファイルサイズ削減**（HTMLテンプレート1つ + 軽量JSONデータ）
✅ **メンテナンス性向上**（修正箇所が明確）
✅ **SEO対策も可能**（後述）

---

## 3. アーキテクチャ設計

### 3.1 ファイル構成

```
camping-spot-publisher/
├── data/
│   ├── region.html                    # テンプレートHTML（1つ）
│   ├── region-data/                   # 地域ごとのJSONデータ
│   │   ├── ginza.json
│   │   ├── shinjuku.json
│   │   └── ... (808ファイル)
│   └── regions-index.json             # 全地域の一覧
│
└── scripts/
    ├── generate-region-data.js        # JSONデータ生成スクリプト
    └── template/
        ├── styles.css                 # 共通CSS
        └── app.js                     # アプリケーションロジック
```

### 3.2 URL設計

**方式A: クエリパラメータ方式（推奨）**
```
https://trailfusionai.com/camping_note/region.html?slug=ginza
https://trailfusionai.com/camping_note/region.html?slug=shinjuku
https://trailfusionai.com/camping_note/region.html?slug=shibuya
```

**メリット:**
- 実装が簡単
- サーバー不要（静的ホスティングで動作）
- クライアント側JavaScriptで完結

**方式B: パス方式（SEO最適）**
```
https://trailfusionai.com/camping_note/regions/ginza/
https://trailfusionai.com/camping_note/regions/shinjuku/
https://trailfusionai.com/camping_note/regions/shibuya/
```

**メリット:**
- SEOに有利（クリーンなURL）
- ソーシャルシェアに適している

**デメリット:**
- サーバー側設定が必要（リライトルール）
- 静的ホスティングの場合、各ディレクトリにindex.htmlが必要

---

## 4. データ構造

### 4.1 regions-index.json（全地域の一覧）

```json
{
  "regions": [
    {
      "slug": "ginza",
      "name": "銀座",
      "lat": 35.6717,
      "lng": 139.7647,
      "elevation": 5,
      "restaurant_count": 150,
      "data_file": "region-data/ginza.json"
    },
    {
      "slug": "shinjuku",
      "name": "新宿",
      "lat": 35.6895,
      "lng": 139.6917,
      "elevation": 38,
      "restaurant_count": 200,
      "data_file": "region-data/shinjuku.json"
    }
    // ... 808箇所
  ],
  "total_count": 808,
  "generated_at": "2025-10-25T12:00:00Z"
}
```

### 4.2 ginza.json（個別地域データ）

```json
{
  "region": {
    "slug": "ginza",
    "name": "銀座",
    "lat": 35.6717,
    "lng": 139.7647,
    "elevation": 5,
    "description": "銀座は東京の中心地で、高級ショッピングエリアとして有名です。"
  },
  "parking_spots": [
    {
      "id": "uuid-1",
      "name": "タイムズ銀座",
      "lat": 35.6717,
      "lng": 139.7647,
      "overnight_fee": 1500,
      "walking_minutes": 4,
      "walking_distance": 284,
      "convenience_distance": 153,
      "hot_spring_name": "なし",
      "hot_spring_distance": null
    }
    // ... 他の駐車場
  ],
  "restaurants": [
    {
      "id": "uuid-1",
      "name": "すきやばし次郎",
      "score": 4.71,
      "genre": "寿司",
      "address": "東京都中央区銀座4-2-15",
      "lat": 35.6719,
      "lng": 139.7646,
      "dinner_budget": "¥40,000～¥49,999"
    }
    // ... 他のレストラン
  ],
  "generated_at": "2025-10-25T12:00:00Z"
}
```

---

## 5. HTMLテンプレート実装

### 5.1 region.html（テンプレート）

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title id="page-title">車旅コンシェルジュ</title>
  <meta name="description" content="" id="page-description">

  <!-- 共通CSS -->
  <link rel="stylesheet" href="styles.css">

  <!-- Leaflet.js（地図） -->
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

  <!-- Supabase（いいね機能用） -->
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

  <!-- FingerprintJS -->
  <script src="https://cdn.jsdelivr.net/npm/@fingerprintjs/fingerprintjs@3/dist/fp.min.js"></script>
</head>
<body>
  <!-- ローディング画面 -->
  <div id="loading">
    <div class="spinner"></div>
    <p>読み込み中...</p>
  </div>

  <!-- メインコンテンツ -->
  <div id="app" style="display: none;">
    <!-- ヘッダー -->
    <header class="site-header">
      <div class="container">
        <h1>🚗 <span id="region-name">...</span>の車中泊スポット</h1>
        <p class="breadcrumb">
          <a href="../index.html">トップ</a> &gt;
          <span id="region-name-breadcrumb">...</span>
        </p>
      </div>
    </header>

    <!-- 地域情報 -->
    <section class="region-info">
      <div class="container">
        <div class="region-stats">
          <div class="stat">
            <span class="stat-label">標高</span>
            <span class="stat-value" id="region-elevation">0</span>m
          </div>
          <div class="stat">
            <span class="stat-label">駐車場</span>
            <span class="stat-value" id="parking-count">0</span>箇所
          </div>
          <div class="stat">
            <span class="stat-label">レストラン</span>
            <span class="stat-value" id="restaurant-count">0</span>件
          </div>
        </div>

        <!-- いいねボタン（地域全体） -->
        <div class="region-like">
          <button id="region-like-btn" class="like-button">
            <svg class="heart-icon" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <span class="like-count" id="region-like-count">0</span>
          </button>
        </div>
      </div>
    </section>

    <!-- 駐車場リスト -->
    <section class="parking-spots">
      <div class="container">
        <h2>🅿️ 駐車場一覧</h2>
        <div id="parking-list">
          <!-- JavaScriptで動的に生成 -->
        </div>
      </div>
    </section>

    <!-- レストランリスト -->
    <section class="restaurants">
      <div class="container">
        <h2>🍴 おすすめレストラン</h2>
        <div id="restaurant-list">
          <!-- JavaScriptで動的に生成 -->
        </div>
      </div>
    </section>

    <!-- コメントセクション -->
    <section class="comments">
      <div class="container">
        <h2>💬 コメント</h2>
        <div id="comments-container">
          <!-- JavaScriptで動的に生成 -->
        </div>
      </div>
    </section>

    <!-- フッター -->
    <footer class="site-footer">
      <div class="container">
        <p>© 2025 TrailFusion AI - 車旅コンシェルジュ</p>
        <p>
          <a href="../terms.html">利用規約</a> |
          <a href="../privacy.html">プライバシーポリシー</a>
        </p>
      </div>
    </footer>
  </div>

  <!-- エラー画面 -->
  <div id="error" style="display: none;">
    <div class="error-container">
      <h1>エラー</h1>
      <p id="error-message"></p>
      <a href="../index.html" class="btn-primary">トップページに戻る</a>
    </div>
  </div>

  <!-- アプリケーションスクリプト -->
  <script src="app.js"></script>
</body>
</html>
```

### 5.2 app.js（アプリケーションロジック）

```javascript
// app.js - 地域ページのメインスクリプト

// URLパラメータから地域スラッグを取得
function getRegionSlug() {
  const params = new URLSearchParams(window.location.search);
  return params.get('slug');
}

// 地域データを読み込み
async function loadRegionData(slug) {
  try {
    const response = await fetch(`region-data/${slug}.json`);
    if (!response.ok) {
      throw new Error('地域データが見つかりません');
    }
    return await response.json();
  } catch (error) {
    console.error('データ読み込みエラー:', error);
    throw error;
  }
}

// ページタイトル・メタ情報を設定
function setPageMeta(region) {
  document.getElementById('page-title').textContent =
    `${region.name}の車中泊スポット | 車旅コンシェルジュ`;

  document.getElementById('page-description').content =
    `${region.name}の車中泊スポット情報。駐車場、レストラン、周辺施設の情報をまとめて掲載。`;
}

// 地域情報を表示
function renderRegionInfo(region) {
  document.getElementById('region-name').textContent = region.name;
  document.getElementById('region-name-breadcrumb').textContent = region.name;
  document.getElementById('region-elevation').textContent = region.elevation || 0;
}

// 駐車場リストを表示
function renderParkingSpots(parkingSpots) {
  const container = document.getElementById('parking-list');
  document.getElementById('parking-count').textContent = parkingSpots.length;

  parkingSpots.forEach((parking, index) => {
    const card = createParkingCard(parking, index);
    container.appendChild(card);
  });
}

// 駐車場カードを生成
function createParkingCard(parking, index) {
  const div = document.createElement('div');
  div.className = 'parking-spot-card';
  div.dataset.parkingId = parking.id;

  const rankIcon = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`;

  div.innerHTML = `
    <div class="parking-header">
      <div class="parking-title">
        <span class="ranking-icon">${rankIcon}</span>
        <span class="ranking-text">${index + 1}位:</span>
        <span class="parking-name">${parking.name}</span>
      </div>
      <div class="card-buttons">
        <button class="btn-like" onclick="toggleParkingLike('${parking.id}')" aria-label="いいね">
          <svg class="heart-icon" viewBox="0 0 24 24" width="20" height="20">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
          <span class="like-count">0</span>
        </button>
        <button class="btn-map" onclick="openMap(${parking.lat}, ${parking.lng})">🗺️</button>
        <button class="btn-search" onclick="searchLocation('${parking.name}')">🔍</button>
      </div>
    </div>
    <div class="parking-info">
      <div class="info-row">
        <div class="info-item">
          <span class="info-icon">📍</span>
          <span class="info-text">徒歩約${parking.walking_minutes}分（${parking.walking_distance}m）</span>
        </div>
        <div class="info-divider">|</div>
        <div class="info-item">
          <span class="info-icon">🏪</span>
          <span class="info-text">コンビニ（${parking.convenience_distance}m）</span>
        </div>
      </div>
      <div class="info-row">
        <div class="info-item">
          <span class="info-icon">💰</span>
          <span class="info-text fee-highlight">¥${parking.overnight_fee || '---'}（18:00-8:00）</span>
        </div>
        <div class="info-divider">|</div>
        <div class="info-item">
          <span class="info-icon">🔥</span>
          <span class="info-text">${parking.hot_spring_name || 'なし'}${parking.hot_spring_distance ? `（${parking.hot_spring_distance}km）` : ''}</span>
        </div>
      </div>
    </div>
  `;

  return div;
}

// レストランリストを表示
function renderRestaurants(restaurants) {
  const container = document.getElementById('restaurant-list');
  document.getElementById('restaurant-count').textContent = restaurants.length;

  restaurants.forEach((restaurant, index) => {
    const card = createRestaurantCard(restaurant, index);
    container.appendChild(card);
  });
}

// レストランカードを生成
function createRestaurantCard(restaurant, index) {
  const div = document.createElement('div');
  div.className = 'restaurant-card';
  div.dataset.restaurantId = restaurant.id;

  div.innerHTML = `
    <div class="card-stripe"></div>
    <div class="card-content">
      <div class="card-header">
        <span class="card-number">${index + 1}</span>
        <button class="btn-like-compact" onclick="toggleRestaurantLike('${restaurant.id}')" aria-label="いいね">
          <svg class="heart-icon" viewBox="0 0 24 24" width="20" height="20">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
          <span class="like-count">0</span>
        </button>
      </div>
      <h3 class="restaurant-name">${restaurant.name}</h3>
      <div class="restaurant-genre">
        <span class="genre-tag">${restaurant.genre}</span>
      </div>
      <p class="restaurant-address">📍 ${restaurant.address}</p>
      <div class="card-actions">
        <button class="btn-map" onclick="openMap(${restaurant.lat}, ${restaurant.lng})">🗺️ 地図</button>
        <button class="btn-search" onclick="searchLocation('${restaurant.name}')">🔍 検索</button>
      </div>
    </div>
  `;

  return div;
}

// 地図を開く
function openMap(lat, lng) {
  window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
}

// 検索
function searchLocation(name) {
  window.open(`https://www.google.com/search?q=${encodeURIComponent(name)}`, '_blank');
}

// メイン処理
async function init() {
  const slug = getRegionSlug();

  if (!slug) {
    showError('地域が指定されていません');
    return;
  }

  try {
    // データ読み込み
    const data = await loadRegionData(slug);

    // ページ情報設定
    setPageMeta(data.region);
    renderRegionInfo(data.region);

    // コンテンツ表示
    renderParkingSpots(data.parking_spots);
    renderRestaurants(data.restaurants);

    // ローディング非表示、コンテンツ表示
    document.getElementById('loading').style.display = 'none';
    document.getElementById('app').style.display = 'block';

    // いいね機能初期化
    await initLikes();

  } catch (error) {
    showError('地域データの読み込みに失敗しました');
  }
}

// エラー表示
function showError(message) {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('error').style.display = 'block';
  document.getElementById('error-message').textContent = message;
}

// ページ読み込み時に実行
document.addEventListener('DOMContentLoaded', init);
```

---

## 6. データ生成スクリプト

### 6.1 generate-region-data.js

```javascript
// generate-region-data.js - 地域JSONデータ生成スクリプト

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function generateRegionData() {
  // regions-data-with-elevation.json を読み込み
  const regions = JSON.parse(
    fs.readFileSync('./data/regions-data-with-elevation.json', 'utf8')
  );

  console.log(`📊 ${regions.length}箇所の地域データを生成します\n`);

  // region-dataフォルダ作成
  const regionDataDir = path.join(__dirname, 'data', 'region-data');
  if (!fs.existsSync(regionDataDir)) {
    fs.mkdirSync(regionDataDir, { recursive: true });
  }

  // 各地域のJSONデータを生成
  for (const region of regions) {
    const slug = region.fileName || region.name.replace(/[\/\\:*?"<>|]/g, '_');

    try {
      // Supabaseから駐車場データ取得
      const { data: parkingSpots } = await supabase
        .rpc('get_parking_spots_sorted_by_fee', {
          center_lat: region.lat,
          center_lng: region.lng,
          radius_meters: 3000
        });

      // レストランデータ読み込み
      const restaurantDataPath = `/Users/user/WebApp/camping_note/restaurants_data/area_${slug}.json`;
      let restaurants = [];

      if (fs.existsSync(restaurantDataPath)) {
        const restaurantData = JSON.parse(fs.readFileSync(restaurantDataPath, 'utf8'));
        restaurants = restaurantData.restaurants || [];
      }

      // JSONデータ作成
      const regionData = {
        region: {
          slug,
          name: region.name,
          lat: region.lat,
          lng: region.lng,
          elevation: region.elevation || 0,
          restaurant_count: restaurants.length
        },
        parking_spots: parkingSpots || [],
        restaurants: restaurants.slice(0, 20), // 上位20件
        generated_at: new Date().toISOString()
      };

      // ファイル保存
      const outputPath = path.join(regionDataDir, `${slug}.json`);
      fs.writeFileSync(outputPath, JSON.stringify(regionData, null, 2), 'utf8');

      console.log(`✅ ${region.name} (${slug}.json)`);

    } catch (error) {
      console.error(`❌ ${region.name}: ${error.message}`);
    }

    // API制限対策
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // regions-index.json を生成
  const indexData = {
    regions: regions.map(r => ({
      slug: r.fileName || r.name.replace(/[\/\\:*?"<>|]/g, '_'),
      name: r.name,
      lat: r.lat,
      lng: r.lng,
      elevation: r.elevation || 0,
      data_file: `region-data/${r.fileName || r.name.replace(/[\/\\:*?"<>|]/g, '_')}.json`
    })),
    total_count: regions.length,
    generated_at: new Date().toISOString()
  };

  fs.writeFileSync(
    path.join(__dirname, 'data', 'regions-index.json'),
    JSON.stringify(indexData, null, 2),
    'utf8'
  );

  console.log(`\n🎉 完了: ${regions.length}箇所のJSONデータを生成しました`);
}

generateRegionData().catch(console.error);
```

---

## 7. SEO対策（オプション）

### 7.1 プリレンダリング方式

動的テンプレートはJavaScriptで生成されるため、検索エンジンのクローラーが正しく読み取れない場合があります。

**解決策:**
- **Puppeteer**や**Playwright**でプリレンダリング
- 静的HTMLを生成してSEO用に配信

### 7.2 サーバーサイドレンダリング（SSR）

Node.js + Expressで動的にHTMLを生成し、完全なHTMLをクライアントに送信。

---

## 8. 移行手順

### Step 1: JSONデータ生成スクリプト作成
```bash
node generate-region-data.js
```

### Step 2: HTMLテンプレート作成
- `region.html` を作成
- `app.js` を作成
- `styles.css` を作成

### Step 3: テスト
```bash
# ローカルサーバー起動
npx http-server data -p 8080

# ブラウザで確認
open http://localhost:8080/region.html?slug=ginza
```

### Step 4: デプロイ
```bash
# GitHub Pagesにプッシュ
git add data/region.html data/region-data/ data/app.js
git commit -m "動的テンプレート方式に移行"
git push origin main
```

---

## 9. メリット・デメリット比較

| 項目 | 静的HTML方式（現状） | 動的テンプレート方式 |
|------|---------------------|---------------------|
| **ファイル数** | 1,616ファイル | 810ファイル（1テンプレート + 808 JSON + 1 index） |
| **ファイルサイズ** | 数百MB | 数十MB |
| **修正箇所** | 808ファイル全て再生成 | 1ファイル（テンプレート）のみ |
| **生成時間** | 数分〜数十分 | 数秒〜数分 |
| **SEO** | ✅ 完全対応 | ⚠️ プリレンダリング必要 |
| **初回表示速度** | ✅ 高速 | ⚠️ JSON読み込み分遅い（0.5秒程度） |
| **メンテナンス性** | ❌ 低い | ✅ 高い |

---

## 10. 推奨アプローチ

### 最終推奨: **ハイブリッド方式**

1. **開発時**: 動的テンプレート方式
   - 1つのHTMLテンプレート + JSONデータ
   - 修正が簡単

2. **デプロイ時**: 静的HTML生成
   - Puppeteerで各ページをプリレンダリング
   - SEO対策完璧
   - 表示速度も高速

**ベストオブボスワールド！**

```javascript
// build.js - デプロイ前に実行
const puppeteer = require('puppeteer');

async function prerender() {
  const browser = await puppeteer.launch();
  const regions = JSON.parse(fs.readFileSync('data/regions-index.json'));

  for (const region of regions.regions) {
    const page = await browser.newPage();
    await page.goto(`http://localhost:8080/region.html?slug=${region.slug}`);
    await page.waitForSelector('#app');

    const html = await page.content();
    fs.writeFileSync(`data/regions/${region.slug}.html`, html);

    console.log(`✅ ${region.name}`);
  }

  await browser.close();
}
```

この方針で実装を進めますか？
