# いいね機能 UI設計書（既存カードデザイン対応）

## 1. 既存カードデザインの維持

現在の車旅コンシェルジュでは、以下のカードデザインを使用しています：
- オレンジの左側ストライプ
- ベージュ/クリーム色の背景
- 番号付きカード
- 地図・検索ボタン

**このデザインを維持しつつ、いいねボタンといいね数のみを追加します。**

---

## 2. レストランカードのいいね機能追加

### 2.1 現在のデザイン

```
┌───────────────────────────────────────┐
│ 1                                     │
│                                       │
│ 醤油と貝と麺 そして人と夢            │
│                                       │
│ [ラーメン]                            │
│                                       │
│ 📍 大阪府大阪市西淀川区柏里3-12-22    │
│                                       │
│ [🗺️ 地図] [🔍 検索]                   │
└───────────────────────────────────────┘
```

### 2.2 いいね追加後のデザイン（案A: 右上配置）

```
┌───────────────────────────────────────┐
│ 1                        ❤️ 24        │
│                                       │
│ 醤油と貝と麺 そして人と夢            │
│                                       │
│ [ラーメン]                            │
│                                       │
│ 📍 大阪府大阪市西淀川区柏里3-12-22    │
│                                       │
│ [🗺️ 地図] [🔍 検索]                   │
└───────────────────────────────────────┘
```

**配置位置:** カード右上（番号の反対側）
**メリット:** 視認性が高く、既存レイアウトを崩さない

### 2.3 いいね追加後のデザイン（案B: ボタン行配置）

```
┌───────────────────────────────────────┐
│ 1                                     │
│                                       │
│ 醤油と貝と麺 そして人と夢            │
│                                       │
│ [ラーメン]                            │
│                                       │
│ 📍 大阪府大阪市西淀川区柏里3-12-22    │
│                                       │
│ [🗺️ 地図] [🔍 検索] [❤️ 24]          │
└───────────────────────────────────────┘
```

**配置位置:** 地図・検索ボタンの横
**メリット:** ボタン群としてまとまる

---

## 3. HTML実装（案A: 右上配置 - 推奨）

### 3.1 レストランカード

```html
<div class="restaurant-card" data-restaurant-id="uuid-123">
  <!-- 左側のオレンジストライプ -->
  <div class="card-stripe"></div>

  <!-- カード内容 -->
  <div class="card-content">
    <!-- ヘッダー行（番号 + いいねボタン） -->
    <div class="card-header">
      <span class="card-number">1</span>
      <button class="like-btn" onclick="toggleRestaurantLike('uuid-123')" aria-label="いいね">
        <svg class="heart-icon" viewBox="0 0 24 24" width="20" height="20">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
        <span class="like-count">24</span>
      </button>
    </div>

    <!-- レストラン名 -->
    <h3 class="restaurant-name">醤油と貝と麺 そして人と夢</h3>

    <!-- ジャンル -->
    <div class="restaurant-genre">
      <span class="genre-tag">ラーメン</span>
    </div>

    <!-- 住所 -->
    <p class="restaurant-address">
      📍 大阪府大阪市西淀川区柏里3-12-22
    </p>

    <!-- ボタン群 -->
    <div class="card-actions">
      <a href="#" class="btn-map" onclick="openMap(event, lat, lng)">
        🗺️ 地図
      </a>
      <a href="#" class="btn-search" target="_blank">
        🔍 検索
      </a>
    </div>
  </div>
</div>
```

### 3.2 駐車場カード

```html
<div class="parking-card" data-parking-id="uuid-456">
  <!-- 左側のオレンジストライプ -->
  <div class="card-stripe"></div>

  <!-- カード内容 -->
  <div class="card-content">
    <!-- ヘッダー行（番号 + いいねボタン） -->
    <div class="card-header">
      <span class="card-number">1</span>
      <button class="like-btn" onclick="toggleParkingLike('uuid-456')" aria-label="いいね">
        <svg class="heart-icon" viewBox="0 0 24 24" width="20" height="20">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
        <span class="like-count">12</span>
      </button>
    </div>

    <!-- 駐車場名 -->
    <h3 class="parking-name">タイムズ銀座</h3>

    <!-- 料金情報 -->
    <div class="parking-fee">
      <span class="fee-label">車中泊料金（概算）</span>
      <span class="fee-value">¥1,500</span>
    </div>

    <!-- 住所 -->
    <p class="parking-address">
      📍 東京都中央区銀座4-1-1
    </p>

    <!-- 営業時間 -->
    <p class="parking-hours">
      🕒 24時間営業
    </p>

    <!-- ボタン群 -->
    <div class="card-actions">
      <a href="#" class="btn-map" onclick="openMap(event, lat, lng)">
        🗺️ 地図
      </a>
      <a href="#" class="btn-details">
        📋 詳細
      </a>
    </div>
  </div>
</div>
```

---

## 4. CSS実装

### 4.1 既存スタイルの維持

```css
/* カード基本スタイル（既存） */
.restaurant-card,
.parking-card {
  position: relative;
  background: #FFF8DC; /* ベージュ/クリーム色 */
  border-radius: 8px;
  margin-bottom: 20px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

/* 左側のオレンジストライプ（既存） */
.card-stripe {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 6px;
  background: #FF8C00; /* オレンジ */
}

/* カード内容エリア */
.card-content {
  margin-left: 10px; /* ストライプ分の余白 */
}
```

### 4.2 いいねボタンの追加スタイル

```css
/* ヘッダー行（番号 + いいねボタン） */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

/* カード番号（既存） */
.card-number {
  font-size: 2em;
  font-weight: bold;
  color: #FF8C00;
  line-height: 1;
}

/* いいねボタン */
.like-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 20px;
  transition: all 0.2s;
}

.like-btn:hover {
  background: rgba(255, 140, 0, 0.1);
  transform: scale(1.05);
}

.like-btn:active {
  transform: scale(0.95);
}

/* ハートアイコン */
.heart-icon {
  fill: #ccc;
  transition: fill 0.3s;
}

.heart-icon.liked {
  fill: #e74c3c;
  animation: heartbeat 0.4s ease-in-out;
}

@keyframes heartbeat {
  0%, 100% {
    transform: scale(1);
  }
  25% {
    transform: scale(1.2);
  }
  50% {
    transform: scale(1.1);
  }
  75% {
    transform: scale(1.15);
  }
}

/* いいね数 */
.like-count {
  font-size: 14px;
  color: #666;
  font-weight: 600;
  min-width: 20px;
  text-align: left;
}

/* いいね済み時の数字の色 */
.like-btn .heart-icon.liked ~ .like-count {
  color: #e74c3c;
}
```

### 4.3 レストラン名・駐車場名（既存スタイル維持）

```css
.restaurant-name,
.parking-name {
  font-size: 1.3em;
  font-weight: bold;
  color: #333;
  margin: 0 0 12px 0;
  line-height: 1.4;
}

.restaurant-genre {
  margin-bottom: 12px;
}

.genre-tag {
  display: inline-block;
  background: #FF8C00;
  color: white;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 0.9em;
  font-weight: 500;
}

.restaurant-address,
.parking-address {
  font-size: 0.95em;
  color: #666;
  margin: 8px 0;
  line-height: 1.5;
}

.parking-fee {
  background: rgba(255, 140, 0, 0.1);
  padding: 12px;
  border-radius: 6px;
  margin: 12px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.fee-label {
  font-size: 0.9em;
  color: #666;
}

.fee-value {
  font-size: 1.4em;
  font-weight: bold;
  color: #FF8C00;
}
```

### 4.4 ボタン群（既存スタイル維持）

```css
.card-actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}

.btn-map,
.btn-search,
.btn-details {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  background: #4285f4;
  color: white;
  text-decoration: none;
  border-radius: 6px;
  font-size: 0.9em;
  font-weight: 500;
  transition: background 0.2s;
}

.btn-map:hover,
.btn-search:hover,
.btn-details:hover {
  background: #3367d6;
}

.btn-search {
  background: #34a853;
}

.btn-search:hover {
  background: #2d8e47;
}

.btn-details {
  background: #fbbc04;
  color: #333;
}

.btn-details:hover {
  background: #f9ab00;
}
```

---

## 5. JavaScript実装

### 5.1 いいね機能

```javascript
// likes.js

// フィンガープリント
let userFingerprint = null;

// フィンガープリント初期化
async function initFingerprint() {
  const fp = await FingerprintJS.load();
  const result = await fp.get();
  userFingerprint = result.visitorId;
}

// レストランへのいいね切り替え
async function toggleRestaurantLike(restaurantId) {
  const card = document.querySelector(`[data-restaurant-id="${restaurantId}"]`);
  const likeBtn = card.querySelector('.like-btn');
  const heartIcon = likeBtn.querySelector('.heart-icon');
  const likeCount = likeBtn.querySelector('.like-count');
  const isLiked = heartIcon.classList.contains('liked');

  try {
    if (isLiked) {
      // いいね削除
      await supabase
        .from('likes')
        .delete()
        .eq('target_type', 'restaurant')
        .eq('target_id', restaurantId)
        .eq(currentUser ? 'user_id' : 'user_fingerprint',
            currentUser ? currentUser.id : userFingerprint);

      heartIcon.classList.remove('liked');
    } else {
      // いいね追加
      await supabase
        .from('likes')
        .insert({
          target_type: 'restaurant',
          target_id: restaurantId,
          user_id: currentUser?.id || null,
          user_fingerprint: currentUser ? null : userFingerprint
        });

      heartIcon.classList.add('liked');
    }

    // いいね数を再取得
    const { data: count } = await supabase
      .rpc('get_likes_count', {
        target_type_param: 'restaurant',
        target_id_param: restaurantId
      });

    likeCount.textContent = count || 0;

  } catch (error) {
    console.error('いいねエラー:', error);
    alert('いいねに失敗しました');
  }
}

// 駐車場へのいいね切り替え
async function toggleParkingLike(parkingId) {
  const card = document.querySelector(`[data-parking-id="${parkingId}"]`);
  const likeBtn = card.querySelector('.like-btn');
  const heartIcon = likeBtn.querySelector('.heart-icon');
  const likeCount = likeBtn.querySelector('.like-count');
  const isLiked = heartIcon.classList.contains('liked');

  try {
    if (isLiked) {
      // いいね削除
      await supabase
        .from('likes')
        .delete()
        .eq('target_type', 'parking_spot')
        .eq('target_id', parkingId)
        .eq(currentUser ? 'user_id' : 'user_fingerprint',
            currentUser ? currentUser.id : userFingerprint);

      heartIcon.classList.remove('liked');
    } else {
      // いいね追加
      await supabase
        .from('likes')
        .insert({
          target_type: 'parking_spot',
          target_id: parkingId,
          user_id: currentUser?.id || null,
          user_fingerprint: currentUser ? null : userFingerprint
        });

      heartIcon.classList.add('liked');
    }

    // いいね数を再取得
    const { data: count } = await supabase
      .rpc('get_likes_count', {
        target_type_param: 'parking_spot',
        target_id_param: parkingId
      });

    likeCount.textContent = count || 0;

  } catch (error) {
    console.error('いいねエラー:', error);
    alert('いいねに失敗しました');
  }
}

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', async () => {
  await initFingerprint();
  await loadLikeStates();
});

// いいね状態を読み込み
async function loadLikeStates() {
  const regionSlug = getRegionSlug();

  // レストランのいいね状態を読み込み
  const restaurantCards = document.querySelectorAll('.restaurant-card');
  for (const card of restaurantCards) {
    const restaurantId = card.dataset.restaurantId;

    // いいね数を取得
    const { data: count } = await supabase
      .rpc('get_likes_count', {
        target_type_param: 'restaurant',
        target_id_param: restaurantId
      });

    card.querySelector('.like-count').textContent = count || 0;

    // ユーザーが既にいいね済みかチェック
    const { data: liked } = await supabase
      .rpc('check_user_liked', {
        target_type_param: 'restaurant',
        target_id_param: restaurantId,
        user_id_param: currentUser?.id || null,
        fingerprint_param: userFingerprint
      });

    if (liked) {
      card.querySelector('.heart-icon').classList.add('liked');
    }
  }

  // 駐車場のいいね状態も同様に読み込み
  const parkingCards = document.querySelectorAll('.parking-card');
  for (const card of parkingCards) {
    const parkingId = card.dataset.parkingId;

    const { data: count } = await supabase
      .rpc('get_likes_count', {
        target_type_param: 'parking_spot',
        target_id_param: parkingId
      });

    card.querySelector('.like-count').textContent = count || 0;

    const { data: liked } = await supabase
      .rpc('check_user_liked', {
        target_type_param: 'parking_spot',
        target_id_param: parkingId,
        user_id_param: currentUser?.id || null,
        fingerprint_param: userFingerprint
      });

    if (liked) {
      card.querySelector('.heart-icon').classList.add('liked');
    }
  }
}

// URLから地域スラッグを取得
function getRegionSlug() {
  const path = window.location.pathname;
  const fileName = path.split('/').pop().replace('.html', '');
  return fileName;
}
```

---

## 6. レスポンシブデザイン

### 6.1 モバイル対応

```css
/* モバイル（768px以下） */
@media (max-width: 768px) {
  .restaurant-card,
  .parking-card {
    padding: 16px;
  }

  .card-number {
    font-size: 1.5em;
  }

  .restaurant-name,
  .parking-name {
    font-size: 1.1em;
  }

  .like-btn {
    padding: 4px 8px;
  }

  .heart-icon {
    width: 18px;
    height: 18px;
  }

  .like-count {
    font-size: 13px;
  }

  .card-actions {
    flex-direction: column;
  }

  .btn-map,
  .btn-search,
  .btn-details {
    width: 100%;
    justify-content: center;
  }
}
```

---

## 7. 既存HTMLファイルへの統合方法

### 7.1 generate-from-json-sources.js の修正

既存のHTML生成スクリプトに、いいねボタンを追加するコードを挿入します。

```javascript
// レストランカード生成部分を修正

function generateRestaurantCard(restaurant, index) {
  return `
    <div class="restaurant-card" data-restaurant-id="${restaurant.id}">
      <div class="card-stripe"></div>
      <div class="card-content">
        <div class="card-header">
          <span class="card-number">${index + 1}</span>
          <button class="like-btn" onclick="toggleRestaurantLike('${restaurant.id}')" aria-label="いいね">
            <svg class="heart-icon" viewBox="0 0 24 24" width="20" height="20">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <span class="like-count">0</span>
          </button>
        </div>

        <h3 class="restaurant-name">${escapeHtml(restaurant.name)}</h3>

        <div class="restaurant-genre">
          <span class="genre-tag">${escapeHtml(restaurant.genre)}</span>
        </div>

        <p class="restaurant-address">
          📍 ${escapeHtml(restaurant.address)}
        </p>

        <div class="card-actions">
          <a href="#" class="btn-map" onclick="openMap(event, ${restaurant.latitude}, ${restaurant.longitude})">
            🗺️ 地図
          </a>
          <a href="https://www.google.com/search?q=${encodeURIComponent(restaurant.name)}"
             class="btn-search" target="_blank">
            🔍 検索
          </a>
        </div>
      </div>
    </div>
  `;
}

// 駐車場カード生成部分も同様に修正
function generateParkingCard(parking, index) {
  return `
    <div class="parking-card" data-parking-id="${parking.id}">
      <div class="card-stripe"></div>
      <div class="card-content">
        <div class="card-header">
          <span class="card-number">${index + 1}</span>
          <button class="like-btn" onclick="toggleParkingLike('${parking.id}')" aria-label="いいね">
            <svg class="heart-icon" viewBox="0 0 24 24" width="20" height="20">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <span class="like-count">0</span>
          </button>
        </div>

        <h3 class="parking-name">${escapeHtml(parking.name)}</h3>

        <div class="parking-fee">
          <span class="fee-label">車中泊料金（概算）</span>
          <span class="fee-value">¥${parking.overnight_fee?.toLocaleString() || '---'}</span>
        </div>

        <p class="parking-address">
          📍 ${escapeHtml(parking.address || '住所情報なし')}
        </p>

        <p class="parking-hours">
          🕒 ${parking.business_hours || '24時間営業'}
        </p>

        <div class="card-actions">
          <a href="#" class="btn-map" onclick="openMap(event, ${parking.latitude}, ${parking.longitude})">
            🗺️ 地図
          </a>
          <a href="#" class="btn-details">
            📋 詳細
          </a>
        </div>
      </div>
    </div>
  `;
}
```

### 7.2 HTMLテンプレートへのスクリプト追加

```javascript
// generate-from-json-sources.js のHTMLテンプレート部分

const htmlTemplate = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <!-- 既存のhead内容 -->

  <!-- Supabase Client -->
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

  <!-- FingerprintJS -->
  <script src="https://cdn.jsdelivr.net/npm/@fingerprintjs/fingerprintjs@3/dist/fp.min.js"></script>

  <!-- いいね機能CSS -->
  <style>
    ${likeButtonStyles}
  </style>
</head>
<body>
  <!-- 既存のbody内容 -->

  <!-- いいね機能JavaScript -->
  <script>
    // Supabaseクライアント初期化
    const supabase = window.supabase.createClient(
      'YOUR_SUPABASE_URL',
      'YOUR_SUPABASE_ANON_KEY'
    );

    ${likeButtonScript}
  </script>
</body>
</html>
`;
```

---

## 8. まとめ

### ✅ デザイン方針

1. **既存デザインを完全維持**
   - オレンジストライプ
   - ベージュ背景
   - 番号表示
   - 地図・検索ボタン

2. **いいねボタンは最小限の追加**
   - カード右上に配置（案A推奨）
   - ハートアイコン + 数字
   - クリックでアニメーション

3. **レスポンシブ対応**
   - モバイルでも見やすく
   - タッチ操作に最適化

### 📋 実装の流れ

1. CSSにいいねボタンスタイル追加
2. HTMLカード生成スクリプト修正
3. JavaScriptいいね機能実装
4. Supabaseデータベース連携
5. 808箇所の地域ページを再生成

この設計で問題なければ、実装を開始できます！
