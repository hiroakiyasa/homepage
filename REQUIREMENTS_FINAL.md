# コメント・いいね機能 最終要件定義書

## 1. 概要

車旅コンシェルジュに会員登録・ログイン機能を追加し、各地域ページにコメント投稿機能、および地域・駐車場・レストランにいいね機能を実装する。

### 機能の対象範囲

| 機能 | 地域ページ | 駐車場カード | レストランカード |
|------|-----------|-------------|----------------|
| **コメント投稿** | ✅ 会員のみ | ❌ | ❌ |
| **いいね** | ✅ 誰でも | ✅ 誰でも | ✅ 誰でも |
| **いいね数表示** | ✅ | ✅ | ✅ |

### 主要機能
- ✅ **会員登録・ログイン**（メール/パスワード + Google OAuth）
- ✅ **コメント投稿**（地域ページのみ、会員限定）
- ✅ **いいね機能**（地域・駐車場・レストラン、誰でも可能）
- ✅ **プロフィール機能**（自己紹介、アバター画像）
- ✅ **マイページ**（投稿履歴、いいね履歴）

---

## 2. 機能要件の詳細

### 2.1 いいね機能（誰でも可能、ログイン不要）

#### 対象
1. **地域ページ全体へのいいね**
   - 808個の地域ページ（例: 銀座.html、新宿西口.html）
   - ページ上部にいいねボタン配置
   - 「この地域が好き」という意味

2. **駐車場カードへのいいね**
   - 地域ページ内に表示される各駐車場カード
   - カード内にいいねボタン配置
   - 「この駐車場がおすすめ」という意味

3. **レストランカードへのいいね**
   - 地域ページ内に表示される各レストランカード
   - カード内にいいねボタン配置
   - 「このレストランに行きたい」という意味

#### 基本機能
- ✅ ログイン不要で誰でもいいね可能
- ✅ 1ユーザー1回まで（重複防止）
- ✅ いいねの取り消し可能
- ✅ いいね数をリアルタイム表示
- ✅ ブラウザフィンガープリント + Cookie で重複防止

#### 会員といいねの違い
| 項目 | 非会員 | 会員 |
|------|--------|------|
| いいね可能 | ✅ | ✅ |
| いいね履歴保存 | Cookie（30日） | アカウントに永久保存 |
| 複数デバイス同期 | ❌ | ✅ |
| マイページで確認 | ❌ | ✅ |
| いいね解除 | ✅ | ✅ |

### 2.2 コメント機能（地域ページのみ、会員限定）

#### 投稿対象
- ✅ **地域ページのみ**（808箇所）
- ❌ 駐車場ページ（投稿機能なし）
- ❌ レストランページ（投稿機能なし）

#### 基本機能
- ✅ **コメント投稿**: 会員のみ
- ✅ **返信機能**: コメントへの返信（1階層のみ）
- ✅ **編集・削除**: 自分のコメントのみ
- ✅ **コメントへのいいね**: 誰でも可能
- ✅ **評価スコア**: 1-5つ星（地域全体の評価）
- ✅ **スパム報告**: 不適切なコメント報告

#### コメント入力項目
- **コメント本文**: 必須（1-1000文字）
- **評価**: 任意（1-5つ星）
- **画像**: オプション（将来実装、最大3枚）

#### コメント表示
- **ソート**: 新着順 / 人気順（いいね数）/ 評価順
- **フィルター**: 星評価でフィルタリング
- **ページネーション**: 20件ずつ表示

---

## 3. データベース設計（Supabase）

### 3.1 テーブル設計

#### `profiles` テーブル
ユーザープロフィール

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 基本情報
  username TEXT UNIQUE NOT NULL CHECK (char_length(username) >= 3 AND char_length(username) <= 20),
  display_name TEXT CHECK (char_length(display_name) >= 3 AND char_length(display_name) <= 30),
  avatar_url TEXT,
  bio TEXT CHECK (char_length(bio) <= 500),

  -- 詳細情報
  prefecture TEXT,
  website_url TEXT,
  twitter_url TEXT,
  instagram_url TEXT,

  -- 統計情報（キャッシュ）
  comments_count INTEGER DEFAULT 0,
  likes_given INTEGER DEFAULT 0,        -- いいねした数
  likes_received INTEGER DEFAULT 0,     -- 獲得いいね数

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_created ON profiles(created_at DESC);
```

#### `regions` テーブル
地域マスタ

```sql
CREATE TABLE regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,             -- URLスラッグ（例: ginza）
  name TEXT NOT NULL,                    -- 地域名（例: 銀座）
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  elevation INTEGER DEFAULT 0,
  restaurant_count INTEGER DEFAULT 0,

  -- 統計情報（キャッシュ）
  likes_count INTEGER DEFAULT 0,         -- 地域へのいいね数
  comments_count INTEGER DEFAULT 0,      -- コメント数
  avg_rating DECIMAL(3, 2),              -- 平均評価

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_regions_slug ON regions(slug);
CREATE INDEX idx_regions_likes ON regions(likes_count DESC);
```

#### `parking_spots` テーブル
駐車場マスタ

```sql
CREATE TABLE parking_spots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_slug TEXT NOT NULL,             -- 所属地域
  name TEXT NOT NULL,                    -- 駐車場名
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,

  -- 料金情報
  overnight_fee INTEGER,                 -- 車中泊料金（概算）
  max_rate_24h INTEGER,
  night_rate INTEGER,
  rate_per_hour INTEGER,

  -- 統計情報
  likes_count INTEGER DEFAULT 0,         -- いいね数

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_parking_spots_region ON parking_spots(region_slug);
CREATE INDEX idx_parking_spots_likes ON parking_spots(likes_count DESC);
```

#### `restaurants` テーブル
レストランマスタ

```sql
CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_slug TEXT NOT NULL,             -- 所属地域
  name TEXT NOT NULL,                    -- レストラン名
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,

  -- Tabelog情報
  score DECIMAL(3, 2),                   -- スコア（例: 4.71）
  genre TEXT,                            -- ジャンル
  address TEXT,
  dinner_budget TEXT,

  -- 統計情報
  likes_count INTEGER DEFAULT 0,         -- いいね数

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_restaurants_region ON restaurants(region_slug);
CREATE INDEX idx_restaurants_score ON restaurants(score DESC);
CREATE INDEX idx_restaurants_likes ON restaurants(likes_count DESC);
```

#### `likes` テーブル（統合版）
地域・駐車場・レストランすべてのいいねを管理

```sql
CREATE TABLE likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- いいね対象（いずれか1つ）
  target_type TEXT NOT NULL CHECK (target_type IN ('region', 'parking_spot', 'restaurant', 'comment')),
  target_id UUID NOT NULL,               -- 対象のID（region_id, parking_spot_id, etc.）

  -- ユーザー識別（どちらか必須）
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,      -- 会員の場合
  user_fingerprint TEXT,                 -- 非会員の場合

  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 制約: 1対象につき1ユーザー1いいねまで
  CONSTRAINT unique_like UNIQUE NULLS NOT DISTINCT (target_type, target_id, user_id, user_fingerprint)
);

CREATE INDEX idx_likes_target ON likes(target_type, target_id);
CREATE INDEX idx_likes_user ON likes(user_id);
CREATE INDEX idx_likes_fingerprint ON likes(user_fingerprint);
CREATE INDEX idx_likes_created ON likes(created_at DESC);
```

#### `comments` テーブル
コメント（地域ページのみ）

```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_slug TEXT NOT NULL,             -- 地域スラッグ（地域ページのみ）
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,

  -- 投稿者（必須: 会員のみ）
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- コメント内容
  content TEXT NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 1000),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),

  -- 統計情報
  likes_count INTEGER DEFAULT 0,
  replies_count INTEGER DEFAULT 0,

  -- ステータス
  status TEXT DEFAULT 'approved' CHECK (status IN ('approved', 'rejected', 'spam')),
  is_edited BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comments_region ON comments(region_slug);
CREATE INDEX idx_comments_user ON comments(user_id);
CREATE INDEX idx_comments_parent ON comments(parent_id);
CREATE INDEX idx_comments_likes ON comments(likes_count DESC);
CREATE INDEX idx_comments_rating ON comments(rating DESC);
```

### 3.2 Row Level Security (RLS)

#### `likes` テーブルのRLS

```sql
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- 誰でも閲覧可能
CREATE POLICY "Anyone can view likes"
  ON likes FOR SELECT
  USING (true);

-- 誰でもいいね追加可能
CREATE POLICY "Anyone can add likes"
  ON likes FOR INSERT
  WITH CHECK (true);

-- 自分のいいねのみ削除可能（会員）
CREATE POLICY "Users can delete own likes"
  ON likes FOR DELETE
  USING (auth.uid() = user_id OR user_id IS NULL);
```

#### `parking_spots` テーブルのRLS

```sql
ALTER TABLE parking_spots ENABLE ROW LEVEL SECURITY;

-- 誰でも閲覧可能
CREATE POLICY "Anyone can view parking spots"
  ON parking_spots FOR SELECT
  USING (true);

-- 管理者のみ編集可能
CREATE POLICY "Only admins can modify parking spots"
  ON parking_spots FOR ALL
  USING (auth.role() = 'admin');
```

#### `restaurants` テーブルのRLS

```sql
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;

-- 誰でも閲覧可能
CREATE POLICY "Anyone can view restaurants"
  ON restaurants FOR SELECT
  USING (true);

-- 管理者のみ編集可能
CREATE POLICY "Only admins can modify restaurants"
  ON restaurants FOR ALL
  USING (auth.role() = 'admin');
```

### 3.3 データベース関数

#### いいね数を取得（対象別）

```sql
CREATE OR REPLACE FUNCTION get_likes_count(
  target_type_param TEXT,
  target_id_param UUID
)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM likes
  WHERE target_type = target_type_param
  AND target_id = target_id_param;
$$ LANGUAGE SQL STABLE;
```

#### いいね状態を確認（ユーザーが既にいいね済みか）

```sql
CREATE OR REPLACE FUNCTION check_user_liked(
  target_type_param TEXT,
  target_id_param UUID,
  user_id_param UUID,
  fingerprint_param TEXT
)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM likes
    WHERE target_type = target_type_param
    AND target_id = target_id_param
    AND (
      (user_id_param IS NOT NULL AND user_id = user_id_param)
      OR
      (fingerprint_param IS NOT NULL AND user_fingerprint = fingerprint_param)
    )
  );
$$ LANGUAGE SQL STABLE;
```

#### 駐車場一覧を取得（いいね数含む）

```sql
CREATE OR REPLACE FUNCTION get_parking_spots_with_likes(
  region_slug_param TEXT,
  user_id_param UUID DEFAULT NULL,
  fingerprint_param TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  lat DECIMAL,
  lng DECIMAL,
  overnight_fee INTEGER,
  likes_count INTEGER,
  user_liked BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ps.id,
    ps.name,
    ps.lat,
    ps.lng,
    ps.overnight_fee,
    ps.likes_count,
    EXISTS(
      SELECT 1 FROM likes l
      WHERE l.target_type = 'parking_spot'
      AND l.target_id = ps.id
      AND (
        (user_id_param IS NOT NULL AND l.user_id = user_id_param)
        OR
        (fingerprint_param IS NOT NULL AND l.user_fingerprint = fingerprint_param)
      )
    ) AS user_liked
  FROM parking_spots ps
  WHERE ps.region_slug = region_slug_param
  ORDER BY ps.overnight_fee ASC NULLS LAST;
END;
$$ LANGUAGE plpgsql STABLE;
```

#### レストラン一覧を取得（いいね数含む）

```sql
CREATE OR REPLACE FUNCTION get_restaurants_with_likes(
  region_slug_param TEXT,
  user_id_param UUID DEFAULT NULL,
  fingerprint_param TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  score DECIMAL,
  genre TEXT,
  address TEXT,
  likes_count INTEGER,
  user_liked BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.name,
    r.score,
    r.genre,
    r.address,
    r.likes_count,
    EXISTS(
      SELECT 1 FROM likes l
      WHERE l.target_type = 'restaurant'
      AND l.target_id = r.id
      AND (
        (user_id_param IS NOT NULL AND l.user_id = user_id_param)
        OR
        (fingerprint_param IS NOT NULL AND l.user_fingerprint = fingerprint_param)
      )
    ) AS user_liked
  FROM restaurants r
  WHERE r.region_slug = region_slug_param
  ORDER BY r.score DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql STABLE;
```

#### トリガー: いいね数をキャッシュ更新

```sql
-- いいね追加時にカウント更新
CREATE OR REPLACE FUNCTION update_likes_count_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.target_type = 'region' THEN
    UPDATE regions SET likes_count = likes_count + 1 WHERE id = NEW.target_id;
  ELSIF NEW.target_type = 'parking_spot' THEN
    UPDATE parking_spots SET likes_count = likes_count + 1 WHERE id = NEW.target_id;
  ELSIF NEW.target_type = 'restaurant' THEN
    UPDATE restaurants SET likes_count = likes_count + 1 WHERE id = NEW.target_id;
  ELSIF NEW.target_type = 'comment' THEN
    UPDATE comments SET likes_count = likes_count + 1 WHERE id = NEW.target_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER likes_insert_trigger
  AFTER INSERT ON likes
  FOR EACH ROW EXECUTE FUNCTION update_likes_count_on_insert();

-- いいね削除時にカウント更新
CREATE OR REPLACE FUNCTION update_likes_count_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.target_type = 'region' THEN
    UPDATE regions SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.target_id;
  ELSIF OLD.target_type = 'parking_spot' THEN
    UPDATE parking_spots SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.target_id;
  ELSIF OLD.target_type = 'restaurant' THEN
    UPDATE restaurants SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.target_id;
  ELSIF OLD.target_type = 'comment' THEN
    UPDATE comments SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.target_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER likes_delete_trigger
  AFTER DELETE ON likes
  FOR EACH ROW EXECUTE FUNCTION update_likes_count_on_delete();
```

---

## 4. API設計

### 4.1 いいねAPI（地域・駐車場・レストラン共通）

#### いいねを追加

**エンドポイント**: `POST /api/likes`

**リクエスト**:
```json
{
  "target_type": "parking_spot",        // 'region', 'parking_spot', 'restaurant', 'comment'
  "target_id": "uuid-here",
  "user_id": "uuid-here",               // 会員の場合（任意）
  "fingerprint": "abc123xyz789"         // 非会員の場合（任意）
}
```

**レスポンス**:
```json
{
  "success": true,
  "likes_count": 125
}
```

#### いいねを削除

**エンドポイント**: `DELETE /api/likes`

**リクエスト**:
```json
{
  "target_type": "parking_spot",
  "target_id": "uuid-here",
  "user_id": "uuid-here",               // または
  "fingerprint": "abc123xyz789"
}
```

**レスポンス**:
```json
{
  "success": true,
  "likes_count": 124
}
```

#### いいね数を取得

**エンドポイント**: `GET /api/likes/:type/:id/count`

**レスポンス**:
```json
{
  "count": 124
}
```

### 4.2 駐車場・レストラン取得API

#### 駐車場一覧（いいね情報含む）

**クライアント側**:
```javascript
const { data: parkingSpots } = await supabase
  .rpc('get_parking_spots_with_likes', {
    region_slug_param: 'ginza',
    user_id_param: currentUser?.id || null,
    fingerprint_param: userFingerprint
  });
```

**レスポンス例**:
```json
[
  {
    "id": "uuid-1",
    "name": "タイムズ銀座",
    "overnight_fee": 1500,
    "likes_count": 24,
    "user_liked": true
  },
  {
    "id": "uuid-2",
    "name": "三井のリパーク銀座",
    "overnight_fee": 2000,
    "likes_count": 18,
    "user_liked": false
  }
]
```

#### レストラン一覧（いいね情報含む）

**クライアント側**:
```javascript
const { data: restaurants } = await supabase
  .rpc('get_restaurants_with_likes', {
    region_slug_param: 'ginza',
    user_id_param: currentUser?.id || null,
    fingerprint_param: userFingerprint
  });
```

**レスポンス例**:
```json
[
  {
    "id": "uuid-1",
    "name": "すきやばし次郎",
    "score": 4.71,
    "genre": "寿司",
    "address": "東京都中央区銀座...",
    "likes_count": 156,
    "user_liked": false
  }
]
```

---

## 5. フロントエンド設計

### 5.1 UIコンポーネント

#### 地域ページのいいねボタン（ページ上部）

```html
<div class="region-header">
  <h1>🚗 銀座の車中泊スポット</h1>

  <div class="region-stats">
    <div class="stat-item">
      <span class="stat-label">駐車場</span>
      <span class="stat-value" id="parking-count">12</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">レストラン</span>
      <span class="stat-value" id="restaurant-count">150</span>
    </div>
  </div>

  <!-- 地域へのいいねボタン -->
  <div class="region-like">
    <button id="region-like-btn" class="like-button" onclick="toggleRegionLike()">
      <svg class="heart-icon" viewBox="0 0 24 24">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
      </svg>
    </button>
    <span id="region-like-count">124</span>
  </div>
</div>
```

#### 駐車場カード（いいねボタン付き）

```html
<div class="parking-card" data-parking-id="uuid-1">
  <div class="parking-header">
    <h3 class="parking-name">タイムズ銀座</h3>
    <div class="parking-like">
      <button class="like-button-small" onclick="toggleParkingLike('uuid-1')">
        <svg class="heart-icon-small" viewBox="0 0 24 24">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
        <span class="like-count">24</span>
      </button>
    </div>
  </div>

  <div class="parking-body">
    <div class="parking-fee">
      <span class="fee-label">車中泊料金</span>
      <span class="fee-value">¥1,500</span>
    </div>
    <div class="parking-info">
      <p>📍 東京都中央区銀座...</p>
      <p>🕒 24時間営業</p>
    </div>
  </div>

  <div class="parking-footer">
    <a href="#" class="btn-map">地図で見る</a>
  </div>
</div>
```

#### レストランカード（いいねボタン付き）

```html
<div class="restaurant-card" data-restaurant-id="uuid-1">
  <div class="restaurant-header">
    <div class="restaurant-info">
      <h3 class="restaurant-name">すきやばし次郎</h3>
      <div class="restaurant-meta">
        <span class="score">⭐ 4.71</span>
        <span class="genre">寿司</span>
      </div>
    </div>
    <div class="restaurant-like">
      <button class="like-button-small" onclick="toggleRestaurantLike('uuid-1')">
        <svg class="heart-icon-small" viewBox="0 0 24 24">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
        <span class="like-count">156</span>
      </button>
    </div>
  </div>

  <div class="restaurant-body">
    <p class="address">📍 東京都中央区銀座4-2-15</p>
    <p class="budget">💰 ¥40,000～¥49,999</p>
  </div>

  <div class="restaurant-footer">
    <a href="#" class="btn-tabelog" target="_blank">食べログで見る</a>
    <a href="#" class="btn-map">地図で見る</a>
  </div>
</div>
```

#### コメントセクション（地域ページのみ）

```html
<div class="comments-section">
  <h2>💬 コメント (<span id="comment-count">156</span>)</h2>

  <!-- コメント投稿フォーム（会員のみ） -->
  <div id="comment-form-container">
    <!-- ログイン済み -->
    <div id="comment-form-logged-in" style="display: none;">
      <h3>この地域の感想を投稿</h3>
      <form id="comment-form">
        <div class="form-group">
          <label>評価（任意）</label>
          <div class="star-rating">
            <input type="radio" name="rating" value="5" id="star5">
            <label for="star5">★</label>
            <input type="radio" name="rating" value="4" id="star4">
            <label for="star4">★</label>
            <input type="radio" name="rating" value="3" id="star3">
            <label for="star3">★</label>
            <input type="radio" name="rating" value="2" id="star2">
            <label for="star2">★</label>
            <input type="radio" name="rating" value="1" id="star1">
            <label for="star1">★</label>
          </div>
        </div>

        <div class="form-group">
          <textarea id="comment-content" required
                    maxlength="1000" rows="5"
                    placeholder="この地域の車中泊スポットとしての感想を教えてください..."></textarea>
          <small><span id="char-count">0</span> / 1000</small>
        </div>

        <button type="submit" class="btn-primary">投稿する</button>
      </form>
    </div>

    <!-- 未ログイン -->
    <div id="comment-form-logged-out">
      <div class="login-prompt">
        <p>この地域についてコメントを投稿するには</p>
        <a href="/camping_note/auth/login.html" class="btn-login">ログイン</a>
        <span>または</span>
        <a href="/camping_note/auth/register.html" class="btn-register">新規登録</a>
      </div>
    </div>
  </div>

  <!-- コメント一覧 -->
  <div class="comments-list" id="comments-list">
    <!-- コメントアイテム -->
  </div>
</div>
```

### 5.2 CSS設計

```css
/* いいねボタン共通スタイル */
.like-button, .like-button-small {
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px;
  transition: transform 0.2s;
}

.like-button:hover, .like-button-small:hover {
  transform: scale(1.1);
}

.heart-icon, .heart-icon-small {
  fill: #ccc;
  transition: fill 0.3s;
}

.heart-icon {
  width: 32px;
  height: 32px;
}

.heart-icon-small {
  width: 20px;
  height: 20px;
}

.heart-icon.liked, .heart-icon-small.liked {
  fill: #e74c3c;
  animation: heartbeat 0.3s;
}

@keyframes heartbeat {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

.like-count {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

/* 駐車場カード */
.parking-card {
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-bottom: 16px;
}

.parking-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.parking-name {
  font-size: 1.2em;
  margin: 0;
  color: #1976d2;
}

.parking-fee {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 4px;
  margin-bottom: 8px;
}

.fee-value {
  font-size: 1.5em;
  font-weight: bold;
  color: #2ecc71;
}

/* レストランカード */
.restaurant-card {
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-bottom: 16px;
}

.restaurant-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.restaurant-name {
  font-size: 1.2em;
  margin: 0 0 4px 0;
  color: #1976d2;
}

.restaurant-meta {
  display: flex;
  gap: 12px;
  font-size: 0.9em;
}

.score {
  color: #f39c12;
  font-weight: 600;
}

.genre {
  color: #666;
}
```

### 5.3 JavaScript実装

#### いいね機能の実装

```javascript
// likes.js - いいね機能の共通処理

// フィンガープリント
let userFingerprint = null;

// フィンガープリント初期化
async function initFingerprint() {
  const fp = await FingerprintJS.load();
  const result = await fp.get();
  userFingerprint = result.visitorId;
}

// 汎用いいね切り替え関数
async function toggleLike(targetType, targetId, buttonElement) {
  const heartIcon = buttonElement.querySelector('.heart-icon, .heart-icon-small');
  const likeCountElement = buttonElement.querySelector('.like-count');
  const isLiked = heartIcon.classList.contains('liked');

  try {
    if (isLiked) {
      // いいね削除
      await supabase
        .from('likes')
        .delete()
        .eq('target_type', targetType)
        .eq('target_id', targetId)
        .eq(currentUser ? 'user_id' : 'user_fingerprint', currentUser ? currentUser.id : userFingerprint);

      heartIcon.classList.remove('liked');
    } else {
      // いいね追加
      await supabase
        .from('likes')
        .insert({
          target_type: targetType,
          target_id: targetId,
          user_id: currentUser?.id || null,
          user_fingerprint: currentUser ? null : userFingerprint
        });

      heartIcon.classList.add('liked');
    }

    // いいね数を再取得
    const { data: count } = await supabase
      .rpc('get_likes_count', {
        target_type_param: targetType,
        target_id_param: targetId
      });

    likeCountElement.textContent = count || 0;

  } catch (error) {
    console.error('いいねエラー:', error);
    alert('いいねに失敗しました');
  }
}

// 地域へのいいね
async function toggleRegionLike() {
  const regionSlug = getRegionSlug();
  const button = document.getElementById('region-like-btn');

  // region_slugからregion_idを取得
  const { data: region } = await supabase
    .from('regions')
    .select('id')
    .eq('slug', regionSlug)
    .single();

  if (region) {
    await toggleLike('region', region.id, button);
  }
}

// 駐車場へのいいね
async function toggleParkingLike(parkingId) {
  const button = document.querySelector(`[data-parking-id="${parkingId}"] .like-button-small`);
  await toggleLike('parking_spot', parkingId, button);
}

// レストランへのいいね
async function toggleRestaurantLike(restaurantId) {
  const button = document.querySelector(`[data-restaurant-id="${restaurantId}"] .like-button-small`);
  await toggleLike('restaurant', restaurantId, button);
}

// コメントへのいいね
async function toggleCommentLike(commentId) {
  const button = document.querySelector(`[data-comment-id="${commentId}"] .comment-like-btn`);
  await toggleLike('comment', commentId, button);
}

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', async () => {
  await initFingerprint();
  await loadLikeStates();
});

// いいね状態を読み込み
async function loadLikeStates() {
  const regionSlug = getRegionSlug();

  // 地域のいいね状態
  const { data: region } = await supabase
    .from('regions')
    .select('id, likes_count')
    .eq('slug', regionSlug)
    .single();

  if (region) {
    document.getElementById('region-like-count').textContent = region.likes_count || 0;

    // ユーザーが既にいいね済みかチェック
    const { data: liked } = await supabase
      .rpc('check_user_liked', {
        target_type_param: 'region',
        target_id_param: region.id,
        user_id_param: currentUser?.id || null,
        fingerprint_param: userFingerprint
      });

    if (liked) {
      document.querySelector('#region-like-btn .heart-icon').classList.add('liked');
    }
  }

  // 駐車場・レストランのいいね状態も同様に読み込み
  await loadParkingSpotsWithLikes();
  await loadRestaurantsWithLikes();
}

// 駐車場一覧を読み込み（いいね情報含む）
async function loadParkingSpotsWithLikes() {
  const regionSlug = getRegionSlug();

  const { data: parkingSpots } = await supabase
    .rpc('get_parking_spots_with_likes', {
      region_slug_param: regionSlug,
      user_id_param: currentUser?.id || null,
      fingerprint_param: userFingerprint
    });

  renderParkingSpots(parkingSpots);
}

// レストラン一覧を読み込み（いいね情報含む）
async function loadRestaurantsWithLikes() {
  const regionSlug = getRegionSlug();

  const { data: restaurants } = await supabase
    .rpc('get_restaurants_with_likes', {
      region_slug_param: regionSlug,
      user_id_param: currentUser?.id || null,
      fingerprint_param: userFingerprint
    });

  renderRestaurants(restaurants);
}
```

---

## 6. データ移行・初期セットアップ

### 6.1 既存データの移行

**現状:**
- 808個の地域HTMLファイル
- regions-data-with-elevation.json（地域データ）
- Supabase: parking_spotsテーブル（駐車場データ）
- ★all-restaurants-with-ids.json（18,345件のレストランデータ）

**移行手順:**

#### Step 1: regionsテーブルにデータ投入

```javascript
// migrate-regions.js

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function migrateRegions() {
  // JSONデータを読み込み
  const regions = JSON.parse(
    fs.readFileSync('./data/regions-data-with-elevation.json', 'utf8')
  );

  // Supabaseに挿入
  for (const region of regions) {
    const slug = region.fileName || region.name.replace(/[\/\\:*?"<>|]/g, '_');

    await supabase
      .from('regions')
      .upsert({
        slug,
        name: region.name,
        lat: region.lat,
        lng: region.lng,
        elevation: region.elevation || 0,
        restaurant_count: region.restaurantCount || 0,
        likes_count: 0,
        comments_count: 0
      }, {
        onConflict: 'slug'
      });

    console.log(`✅ ${region.name} を移行しました`);
  }

  console.log('🎉 全地域の移行が完了しました');
}

migrateRegions();
```

#### Step 2: restaurantsテーブルにデータ投入

```javascript
// migrate-restaurants.js

async function migrateRestaurants() {
  // 全レストランデータを読み込み
  const allRestaurants = JSON.parse(
    fs.readFileSync('../★all-restaurants-with-ids.json', 'utf8')
  );

  // 地域データを読み込み
  const regions = JSON.parse(
    fs.readFileSync('./data/regions-data-with-elevation.json', 'utf8')
  );

  for (const region of regions) {
    const regionSlug = region.fileName || region.name.replace(/[\/\\:*?"<>|]/g, '_');

    // この地域の500m以内のレストランを抽出
    const nearbyRestaurants = allRestaurants.restaurants.filter(r => {
      const distance = geolib.getDistance(
        { latitude: region.lat, longitude: region.lng },
        { latitude: r.latitude, longitude: r.longitude }
      );
      return distance <= 500;
    });

    // Supabaseに挿入
    for (const restaurant of nearbyRestaurants) {
      await supabase
        .from('restaurants')
        .upsert({
          region_slug: regionSlug,
          name: restaurant.name,
          lat: restaurant.latitude,
          lng: restaurant.longitude,
          score: restaurant.score,
          genre: restaurant.genre,
          address: restaurant.address,
          dinner_budget: restaurant.dinnerBudget,
          likes_count: 0
        });
    }

    console.log(`✅ ${region.name} のレストラン ${nearbyRestaurants.length}件を移行しました`);
  }

  console.log('🎉 全レストランの移行が完了しました');
}

migrateRestaurants();
```

#### Step 3: parking_spotsテーブルにregion_slugを追加

```sql
-- 既存のparking_spotsテーブルにregion_slug列を追加
ALTER TABLE parking_spots ADD COLUMN IF NOT EXISTS region_slug TEXT;
ALTER TABLE parking_spots ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;

-- 既存データに対してregion_slugを設定（最も近い地域を割り当て）
-- これはSupabase関数として実装
CREATE OR REPLACE FUNCTION assign_region_to_parking_spots()
RETURNS void AS $$
DECLARE
  parking RECORD;
  nearest_region RECORD;
BEGIN
  FOR parking IN SELECT * FROM parking_spots WHERE region_slug IS NULL LOOP
    -- 最も近い地域を検索
    SELECT slug INTO nearest_region
    FROM regions
    ORDER BY ST_Distance(
      ST_MakePoint(lng, lat)::geography,
      ST_MakePoint(parking.lng, parking.lat)::geography
    ) ASC
    LIMIT 1;

    -- region_slugを更新
    UPDATE parking_spots
    SET region_slug = nearest_region.slug
    WHERE id = parking.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 実行
SELECT assign_region_to_parking_spots();
```

---

## 7. 実装フェーズ

### Phase 1: データベース構築（1週間）
- ✅ Supabaseプロジェクト作成
- ✅ テーブル作成（profiles, regions, parking_spots, restaurants, likes, comments）
- ✅ RLS設定
- ✅ データベース関数作成
- ✅ トリガー設定

### Phase 2: データ移行（1週間）
- ✅ regions テーブルにデータ投入（808箇所）
- ✅ parking_spots テーブルに region_slug 追加
- ✅ restaurants テーブルにデータ投入
- ✅ データ検証

### Phase 3: 認証機能（2週間）
- ✅ Supabase Auth設定
- ✅ Google OAuth設定
- ✅ 会員登録・ログインUI
- ✅ プロフィールページ

### Phase 4: いいね機能（2週間）
- ✅ 地域ページにいいねボタン追加
- ✅ 駐車場カードにいいねボタン追加
- ✅ レストランカードにいいねボタン追加
- ✅ いいね数のリアルタイム更新
- ✅ マイページにいいね履歴表示

### Phase 5: コメント機能（2週間）
- ✅ 地域ページにコメント投稿フォーム追加（会員のみ）
- ✅ コメント表示・編集・削除
- ✅ 返信機能
- ✅ ソート・フィルター機能

### Phase 6: テスト・最適化（1週間）
- ✅ 機能テスト
- ✅ パフォーマンス最適化
- ✅ セキュリティ検証
- ✅ デプロイ

---

## 8. まとめ

### ✅ 実現する機能

| 対象 | いいね | コメント投稿 | 閲覧 |
|------|--------|-------------|------|
| **地域ページ** | 誰でも | 会員のみ | 誰でも |
| **駐車場カード** | 誰でも | ❌ | 誰でも |
| **レストランカード** | 誰でも | ❌ | 誰でも |

### 📊 データ規模

- **地域**: 808箇所
- **駐車場**: 数千箇所（Supabase既存データ）
- **レストラン**: 18,345件（★all-restaurants-with-ids.jsonから抽出）
- **予想会員数**: 初期500人/月、1年後5,000人

### 💰 コスト

**Supabase Free Tier で運用可能**
- 月間1万訪問者まで
- データベース500MB
- ストレージ1GB
- 認証50,000 MAU

### 🚀 次のステップ

1. Supabaseプロジェクト作成
2. データベーススキーマ実装
3. 既存データの移行
4. フロントエンド実装
5. テスト・デプロイ

この要件定義で問題ないかご確認ください！
