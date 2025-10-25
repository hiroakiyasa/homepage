# コメント・いいね機能 要件定義書

## 1. 概要

車旅コンシェルジュの各地域ページに、ユーザーがコメントやいいねを付けられる機能を追加する。

### 対象ページ
- 808個の地域ページ（例: 銀座.html, 新宿西口.html, etc.）
- 各駐車場スポット
- 各レストラン（オプション）

---

## 2. 機能要件

### 2.1 いいね機能

#### 基本機能
- ✅ ユーザーは各地域ページに「いいね」を付けられる
- ✅ いいねは1ユーザー1地域につき1回まで
- ✅ いいねを取り消すことができる
- ✅ いいね総数をリアルタイムで表示
- ✅ ログイン不要で使用可能（匿名いいね）
- ✅ ローカルストレージで重複防止

#### 表示要件
- いいねボタン: ❤️ アイコン
- 未いいね時: グレー（❤️）
- いいね済み時: 赤色（❤️）
- いいね数: 数字で表示（例: 124）

### 2.2 コメント機能

#### 基本機能
- ✅ ユーザーは各地域ページにコメントを投稿できる
- ✅ コメント一覧を新着順・人気順で表示
- ✅ コメントに対して返信（ネスト1階層まで）
- ✅ コメントにいいねを付けられる
- ✅ 不適切なコメントを報告できる
- ⚠️ ログイン必須（スパム防止）

#### 入力要件
- 名前: 必須（1-30文字）
- メールアドレス: 任意（非表示、管理者のみ閲覧可）
- コメント本文: 必須（1-1000文字）
- 評価スコア: 任意（1-5つ星）

#### 表示要件
- コメント表示数: 初期表示20件
- ページネーション: 「もっと見る」ボタンで追加読み込み
- ソート: 新着順 / 人気順（いいね数）
- 表示項目:
  - ユーザー名
  - 投稿日時（相対時間: 3時間前、2日前）
  - コメント本文
  - いいね数
  - 返信数

### 2.3 認証機能

#### 認証方法（優先順位順）
1. **匿名コメント（簡易版）**
   - 名前のみ入力
   - Cookie/LocalStorageで重複投稿防止（24時間）
   - メリット: 実装が簡単、ユーザー摩擦が少ない
   - デメリット: スパムリスクあり

2. **メールアドレス認証（推奨）**
   - 名前 + メールアドレス入力
   - 確認リンクをメール送信
   - 24時間以内にリンククリックで投稿承認
   - メリット: スパム防止、匿名性保持
   - デメリット: ユーザー摩擦あり

3. **ソーシャルログイン（将来対応）**
   - Google / Twitter / GitHub OAuth
   - Supabase Authで実装
   - メリット: 本人確認済み、スパムなし
   - デメリット: 実装コスト高い

**推奨: メールアドレス認証**
- 初期はスパム防止のためメール認証を採用
- 将来的にソーシャルログイン追加

---

## 3. データベース設計（Supabase）

### 3.1 テーブル設計

#### `regions` テーブル
既存のテーブル（または新規作成）

```sql
CREATE TABLE regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                    -- 地域名（例: 銀座）
  slug TEXT UNIQUE NOT NULL,             -- URLスラッグ（例: ginza）
  lat DECIMAL(10, 8) NOT NULL,           -- 緯度
  lng DECIMAL(11, 8) NOT NULL,           -- 経度
  elevation INTEGER DEFAULT 0,           -- 標高
  restaurant_count INTEGER DEFAULT 0,    -- レストラン数
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_regions_slug ON regions(slug);
CREATE INDEX idx_regions_name ON regions(name);
```

#### `region_likes` テーブル
地域への「いいね」を管理

```sql
CREATE TABLE region_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_slug TEXT NOT NULL,             -- 地域スラッグ
  user_fingerprint TEXT,                 -- ブラウザフィンガープリント（匿名用）
  user_id UUID,                          -- ユーザーID（将来のログイン用）
  ip_address INET,                       -- IPアドレス（スパム防止）
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 制約: 1地域につき1ユーザー1いいねまで
  UNIQUE(region_slug, user_fingerprint)
);

-- インデックス
CREATE INDEX idx_region_likes_region ON region_likes(region_slug);
CREATE INDEX idx_region_likes_fingerprint ON region_likes(user_fingerprint);
CREATE INDEX idx_region_likes_created ON region_likes(created_at DESC);
```

#### `comments` テーブル
コメント本体

```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_slug TEXT NOT NULL,             -- 地域スラッグ
  parent_id UUID,                        -- 親コメントID（返信の場合）

  -- ユーザー情報
  author_name TEXT NOT NULL,             -- 表示名（例: 山田太郎）
  author_email TEXT,                     -- メールアドレス（非表示）
  author_fingerprint TEXT,               -- ブラウザフィンガープリント
  ip_address INET,                       -- IPアドレス

  -- コメント内容
  content TEXT NOT NULL,                 -- コメント本文
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),  -- 評価（1-5）

  -- ステータス
  status TEXT DEFAULT 'pending',         -- pending / approved / rejected / spam
  is_verified BOOLEAN DEFAULT FALSE,     -- メール認証済みか
  verification_token TEXT,               -- メール認証トークン
  verified_at TIMESTAMPTZ,               -- 認証完了日時

  -- メタ情報
  likes_count INTEGER DEFAULT 0,         -- いいね数（キャッシュ）
  replies_count INTEGER DEFAULT 0,       -- 返信数（キャッシュ）

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 制約
  FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
);

-- インデックス
CREATE INDEX idx_comments_region ON comments(region_slug);
CREATE INDEX idx_comments_parent ON comments(parent_id);
CREATE INDEX idx_comments_status ON comments(status);
CREATE INDEX idx_comments_created ON comments(created_at DESC);
CREATE INDEX idx_comments_likes ON comments(likes_count DESC);
```

#### `comment_likes` テーブル
コメントへの「いいね」を管理

```sql
CREATE TABLE comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL,              -- コメントID
  user_fingerprint TEXT,                 -- ブラウザフィンガープリント
  user_id UUID,                          -- ユーザーID（将来用）
  ip_address INET,                       -- IPアドレス
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 制約: 1コメントにつき1ユーザー1いいねまで
  UNIQUE(comment_id, user_fingerprint),
  FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE
);

-- インデックス
CREATE INDEX idx_comment_likes_comment ON comment_likes(comment_id);
CREATE INDEX idx_comment_likes_fingerprint ON comment_likes(user_fingerprint);
```

#### `spam_reports` テーブル
スパム報告

```sql
CREATE TABLE spam_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL,              -- 報告対象コメント
  reporter_fingerprint TEXT,             -- 報告者
  reason TEXT,                           -- 報告理由
  created_at TIMESTAMPTZ DEFAULT NOW(),

  FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE
);

-- インデックス
CREATE INDEX idx_spam_reports_comment ON spam_reports(comment_id);
```

### 3.2 Row Level Security (RLS)

#### `region_likes` テーブルのRLS

```sql
-- 有効化
ALTER TABLE region_likes ENABLE ROW LEVEL SECURITY;

-- 誰でも読み取り可能
CREATE POLICY "Anyone can view region likes"
  ON region_likes FOR SELECT
  USING (true);

-- 誰でもいいね追加可能
CREATE POLICY "Anyone can add region likes"
  ON region_likes FOR INSERT
  WITH CHECK (true);

-- 自分のいいねのみ削除可能
CREATE POLICY "Users can delete their own likes"
  ON region_likes FOR DELETE
  USING (user_fingerprint = current_setting('app.user_fingerprint', true));
```

#### `comments` テーブルのRLS

```sql
-- 有効化
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- 承認済みコメントは誰でも閲覧可能
CREATE POLICY "Anyone can view approved comments"
  ON comments FOR SELECT
  USING (status = 'approved');

-- 誰でもコメント投稿可能（pending状態で作成）
CREATE POLICY "Anyone can create comments"
  ON comments FOR INSERT
  WITH CHECK (status = 'pending');

-- 管理者のみ全コメント閲覧・編集可能
CREATE POLICY "Admins can do anything"
  ON comments
  USING (auth.role() = 'admin');
```

### 3.3 データベース関数

#### いいね数を取得

```sql
CREATE OR REPLACE FUNCTION get_region_likes_count(region_slug_param TEXT)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM region_likes
  WHERE region_slug = region_slug_param;
$$ LANGUAGE SQL STABLE;
```

#### コメント数を取得

```sql
CREATE OR REPLACE FUNCTION get_comments_count(region_slug_param TEXT)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM comments
  WHERE region_slug = region_slug_param
  AND status = 'approved';
$$ LANGUAGE SQL STABLE;
```

#### コメント一覧を取得（いいね数・返信数含む）

```sql
CREATE OR REPLACE FUNCTION get_comments_with_stats(
  region_slug_param TEXT,
  limit_param INTEGER DEFAULT 20,
  offset_param INTEGER DEFAULT 0,
  sort_by TEXT DEFAULT 'created_at' -- 'created_at' or 'likes_count'
)
RETURNS TABLE (
  id UUID,
  author_name TEXT,
  content TEXT,
  rating INTEGER,
  likes_count INTEGER,
  replies_count INTEGER,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.author_name,
    c.content,
    c.rating,
    c.likes_count,
    c.replies_count,
    c.created_at
  FROM comments c
  WHERE c.region_slug = region_slug_param
  AND c.parent_id IS NULL
  AND c.status = 'approved'
  ORDER BY
    CASE WHEN sort_by = 'likes_count' THEN c.likes_count END DESC,
    CASE WHEN sort_by = 'created_at' THEN c.created_at END DESC
  LIMIT limit_param
  OFFSET offset_param;
END;
$$ LANGUAGE plpgsql STABLE;
```

---

## 4. API設計（Supabase Edge Functions）

### 4.1 いいね関連API

#### `POST /api/likes/region/:slug`
地域にいいねを追加

**リクエスト:**
```json
{
  "fingerprint": "abc123xyz789"
}
```

**レスポンス:**
```json
{
  "success": true,
  "likes_count": 125
}
```

#### `DELETE /api/likes/region/:slug`
いいねを削除

**リクエスト:**
```json
{
  "fingerprint": "abc123xyz789"
}
```

**レスポンス:**
```json
{
  "success": true,
  "likes_count": 124
}
```

#### `GET /api/likes/region/:slug/count`
いいね数を取得

**レスポンス:**
```json
{
  "count": 124
}
```

### 4.2 コメント関連API

#### `POST /api/comments`
コメントを投稿

**リクエスト:**
```json
{
  "region_slug": "ginza",
  "author_name": "山田太郎",
  "author_email": "yamada@example.com",
  "content": "とても良い場所でした！",
  "rating": 5,
  "parent_id": null,
  "fingerprint": "abc123xyz789"
}
```

**レスポンス:**
```json
{
  "success": true,
  "message": "確認メールを送信しました。メール内のリンクをクリックしてコメントを承認してください。",
  "comment_id": "uuid-here"
}
```

#### `GET /api/comments/:region_slug`
コメント一覧を取得

**クエリパラメータ:**
- `limit`: 取得件数（デフォルト: 20）
- `offset`: オフセット（デフォルト: 0）
- `sort`: ソート順（`new` or `popular`）

**レスポンス:**
```json
{
  "comments": [
    {
      "id": "uuid-1",
      "author_name": "山田太郎",
      "content": "とても良い場所でした！",
      "rating": 5,
      "likes_count": 12,
      "replies_count": 3,
      "created_at": "2025-10-20T10:30:00Z",
      "replies": [
        {
          "id": "uuid-2",
          "author_name": "佐藤花子",
          "content": "私もそう思います！",
          "likes_count": 5,
          "created_at": "2025-10-20T11:00:00Z"
        }
      ]
    }
  ],
  "total": 156,
  "has_more": true
}
```

#### `POST /api/comments/:id/verify`
メール認証トークンで承認

**リクエスト:**
```json
{
  "token": "verification-token-here"
}
```

**レスポンス:**
```json
{
  "success": true,
  "message": "コメントが承認されました。"
}
```

#### `POST /api/comments/:id/like`
コメントにいいね

**リクエスト:**
```json
{
  "fingerprint": "abc123xyz789"
}
```

**レスポンス:**
```json
{
  "success": true,
  "likes_count": 13
}
```

#### `POST /api/comments/:id/report`
コメントをスパム報告

**リクエスト:**
```json
{
  "fingerprint": "abc123xyz789",
  "reason": "スパムです"
}
```

**レスポンス:**
```json
{
  "success": true,
  "message": "報告を受け付けました。"
}
```

---

## 5. フロントエンド設計

### 5.1 技術スタック

**現状:**
- 静的HTML生成
- Vanilla JavaScript
- Leaflet.js（地図）

**追加するライブラリ:**
```html
<!-- フィンガープリント生成 -->
<script src="https://cdn.jsdelivr.net/npm/@fingerprintjs/fingerprintjs@3/dist/fp.min.js"></script>

<!-- Supabaseクライアント -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

<!-- 日付フォーマット -->
<script src="https://cdn.jsdelivr.net/npm/dayjs@1/dayjs.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/dayjs@1/plugin/relativeTime.js"></script>
<script src="https://cdn.jsdelivr.net/npm/dayjs@1/locale/ja.js"></script>
```

### 5.2 UIコンポーネント設計

#### いいねボタン

```html
<div class="like-button">
  <button id="like-btn" aria-label="いいね">
    <svg class="heart-icon" viewBox="0 0 24 24">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
    </svg>
  </button>
  <span id="like-count">124</span>
</div>
```

**CSS:**
```css
.like-button {
  display: flex;
  align-items: center;
  gap: 8px;
}

.like-button button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  transition: transform 0.2s;
}

.like-button button:hover {
  transform: scale(1.1);
}

.heart-icon {
  width: 24px;
  height: 24px;
  fill: #ccc;
  transition: fill 0.3s;
}

.heart-icon.liked {
  fill: #e74c3c;
  animation: heartbeat 0.3s;
}

@keyframes heartbeat {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}
```

#### コメントフォーム

```html
<div class="comment-form">
  <h3>コメントを投稿</h3>
  <form id="comment-form">
    <div class="form-group">
      <label for="author-name">名前 *</label>
      <input type="text" id="author-name" required maxlength="30">
    </div>

    <div class="form-group">
      <label for="author-email">メールアドレス（非表示）</label>
      <input type="email" id="author-email" placeholder="確認メールの送信に使用">
      <small>※コメント承認のため、メールアドレスの入力を推奨します</small>
    </div>

    <div class="form-group">
      <label for="rating">評価</label>
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
      <label for="comment-content">コメント *</label>
      <textarea id="comment-content" required maxlength="1000" rows="5"></textarea>
      <small><span id="char-count">0</span> / 1000</small>
    </div>

    <button type="submit" class="submit-btn">投稿する</button>
  </form>
</div>
```

#### コメント一覧

```html
<div class="comments-section">
  <div class="comments-header">
    <h3>コメント (<span id="comment-count">156</span>)</h3>
    <div class="sort-buttons">
      <button class="sort-btn active" data-sort="new">新着順</button>
      <button class="sort-btn" data-sort="popular">人気順</button>
    </div>
  </div>

  <div id="comments-list">
    <!-- コメントアイテム -->
    <div class="comment-item" data-comment-id="uuid-1">
      <div class="comment-header">
        <div class="author-info">
          <span class="author-name">山田太郎</span>
          <div class="rating">★★★★★</div>
        </div>
        <span class="comment-time">3時間前</span>
      </div>

      <div class="comment-body">
        <p>とても良い場所でした！駐車場も広くて停めやすいです。</p>
      </div>

      <div class="comment-footer">
        <button class="comment-like-btn" data-comment-id="uuid-1">
          ❤️ <span class="like-count">12</span>
        </button>
        <button class="reply-btn">返信</button>
        <button class="report-btn">報告</button>
      </div>

      <!-- 返信一覧 -->
      <div class="replies">
        <div class="comment-item reply">
          <div class="comment-header">
            <span class="author-name">佐藤花子</span>
            <span class="comment-time">2時間前</span>
          </div>
          <div class="comment-body">
            <p>私もそう思います！</p>
          </div>
          <div class="comment-footer">
            <button class="comment-like-btn" data-comment-id="uuid-2">
              ❤️ <span class="like-count">5</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <button id="load-more" class="load-more-btn">もっと見る</button>
</div>
```

### 5.3 JavaScript実装

#### 初期化

```javascript
// Supabaseクライアント初期化
const supabase = window.supabase.createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_SUPABASE_ANON_KEY'
);

// フィンガープリント取得
let userFingerprint = null;

async function initFingerprint() {
  const fp = await FingerprintJS.load();
  const result = await fp.get();
  userFingerprint = result.visitorId;
}

// ページ読み込み時
document.addEventListener('DOMContentLoaded', async () => {
  await initFingerprint();
  await loadLikesCount();
  await loadComments();
  initEventListeners();
});
```

#### いいね機能

```javascript
// いいね数を読み込み
async function loadLikesCount() {
  const regionSlug = getRegionSlug(); // URLから取得

  const { data, error } = await supabase
    .rpc('get_region_likes_count', { region_slug_param: regionSlug });

  if (!error) {
    document.getElementById('like-count').textContent = data;
  }

  // 既にいいね済みかチェック
  checkIfLiked();
}

// いいね状態をチェック
async function checkIfLiked() {
  const regionSlug = getRegionSlug();

  const { data } = await supabase
    .from('region_likes')
    .select('id')
    .eq('region_slug', regionSlug)
    .eq('user_fingerprint', userFingerprint)
    .single();

  if (data) {
    document.querySelector('.heart-icon').classList.add('liked');
  }
}

// いいねボタンクリック
async function toggleLike() {
  const regionSlug = getRegionSlug();
  const heartIcon = document.querySelector('.heart-icon');
  const isLiked = heartIcon.classList.contains('liked');

  if (isLiked) {
    // いいね削除
    await supabase
      .from('region_likes')
      .delete()
      .eq('region_slug', regionSlug)
      .eq('user_fingerprint', userFingerprint);

    heartIcon.classList.remove('liked');
  } else {
    // いいね追加
    await supabase
      .from('region_likes')
      .insert({
        region_slug: regionSlug,
        user_fingerprint: userFingerprint
      });

    heartIcon.classList.add('liked');
  }

  // いいね数を再読み込み
  await loadLikesCount();
}
```

#### コメント機能

```javascript
// コメント一覧を読み込み
async function loadComments(sortBy = 'new', offset = 0) {
  const regionSlug = getRegionSlug();

  const { data, error } = await supabase
    .rpc('get_comments_with_stats', {
      region_slug_param: regionSlug,
      limit_param: 20,
      offset_param: offset,
      sort_by: sortBy === 'new' ? 'created_at' : 'likes_count'
    });

  if (!error && data) {
    renderComments(data);
  }
}

// コメントをレンダリング
function renderComments(comments) {
  const commentsList = document.getElementById('comments-list');

  comments.forEach(comment => {
    const commentHTML = `
      <div class="comment-item" data-comment-id="${comment.id}">
        <div class="comment-header">
          <div class="author-info">
            <span class="author-name">${escapeHtml(comment.author_name)}</span>
            ${comment.rating ? renderStars(comment.rating) : ''}
          </div>
          <span class="comment-time">${formatRelativeTime(comment.created_at)}</span>
        </div>
        <div class="comment-body">
          <p>${escapeHtml(comment.content)}</p>
        </div>
        <div class="comment-footer">
          <button class="comment-like-btn" onclick="likeComment('${comment.id}')">
            ❤️ <span class="like-count">${comment.likes_count}</span>
          </button>
          <button class="reply-btn" onclick="showReplyForm('${comment.id}')">返信</button>
          <button class="report-btn" onclick="reportComment('${comment.id}')">報告</button>
        </div>
      </div>
    `;
    commentsList.insertAdjacentHTML('beforeend', commentHTML);
  });
}

// コメント投稿
async function submitComment(event) {
  event.preventDefault();

  const formData = {
    region_slug: getRegionSlug(),
    author_name: document.getElementById('author-name').value,
    author_email: document.getElementById('author-email').value || null,
    content: document.getElementById('comment-content').value,
    rating: document.querySelector('input[name="rating"]:checked')?.value || null,
    fingerprint: userFingerprint
  };

  // Edge Functionにリクエスト
  const response = await fetch('/api/comments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData)
  });

  const result = await response.json();

  if (result.success) {
    alert(result.message);
    document.getElementById('comment-form').reset();
  }
}

// ヘルパー関数
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatRelativeTime(timestamp) {
  dayjs.locale('ja');
  return dayjs(timestamp).fromNow();
}

function renderStars(rating) {
  return '<div class="rating">' + '★'.repeat(rating) + '☆'.repeat(5 - rating) + '</div>';
}

function getRegionSlug() {
  const fileName = window.location.pathname.split('/').pop().replace('.html', '');
  return fileName;
}
```

---

## 6. セキュリティ要件

### 6.1 スパム対策

1. **レート制限**
   - 同一IPから1分間に最大3回のコメント投稿
   - 同一フィンガープリントから1時間に最大10回の投稿

2. **メール認証**
   - コメント投稿時にメール認証を推奨
   - 未認証コメントは24時間後に自動削除

3. **フィンガープリント**
   - ブラウザフィンガープリントで重複検出
   - Cookie + LocalStorage + Fingerprint の三重チェック

4. **NGワードフィルター**
   - 不適切な単語を検出して自動却下
   - 管理者に通知

### 6.2 XSS対策

1. **入力サニタイズ**
   - すべてのユーザー入力をエスケープ
   - HTMLタグを許可しない

2. **CSP（Content Security Policy）**
```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self' https://cdn.jsdelivr.net https://unpkg.com;">
```

### 6.3 プライバシー保護

1. **メールアドレス**
   - データベースに保存するが表示しない
   - 管理者のみ閲覧可能

2. **IPアドレス**
   - ハッシュ化して保存
   - スパム検出にのみ使用

---

## 7. パフォーマンス要件

### 7.1 キャッシング戦略

1. **いいね数**
   - Redis/Upstashでキャッシュ（TTL: 5分）
   - 更新時にキャッシュ無効化

2. **コメント一覧**
   - CDN経由で配信
   - 新規コメント投稿時にキャッシュクリア

### 7.2 最適化

1. **画像遅延読み込み**
   - アバター画像（将来実装時）

2. **無限スクロール**
   - Intersection Observer APIで実装
   - 20件ずつ読み込み

3. **リアルタイム更新**
   - Supabase Realtimeで新着コメント通知
   - ポーリング間隔: 30秒

---

## 8. 実装フェーズ

### フェーズ1: MVP（2-3週間）
- ✅ データベース設計・構築
- ✅ いいね機能（地域ページ）
- ✅ コメント投稿・表示（匿名）
- ✅ 基本的なスパム対策

### フェーズ2: 機能拡張（2週間）
- ✅ メール認証
- ✅ コメント返信機能
- ✅ コメントへのいいね
- ✅ ソート機能（新着順・人気順）

### フェーズ3: 管理機能（1週間）
- ✅ 管理画面（コメント承認・削除）
- ✅ スパム報告処理
- ✅ ダッシュボード

### フェーズ4: 最適化（1週間）
- ✅ パフォーマンス改善
- ✅ キャッシング実装
- ✅ リアルタイム更新

---

## 9. 見積もりコスト

### Supabase料金（Free Tier）
- データベース容量: 500MB（十分）
- Edge Functions: 500K呼び出し/月
- 認証: 50,000 MAU
- ストレージ: 1GB

**予想トラフィック:**
- 月間訪問者: 10,000人
- コメント投稿: 500件/月
- いいね: 5,000回/月

→ **Free Tierで十分カバー可能**

### 将来的なアップグレード（Pro: $25/月）
- 月間訪問者が50,000人を超える場合
- データベース容量が500MBを超える場合

---

## 10. 代替案・将来の拡張

### 代替案1: Disqusを使用
**メリット:**
- 実装が簡単（埋め込みコード追加のみ）
- スパム対策が充実
- 無料プランあり

**デメリット:**
- デザインカスタマイズが制限される
- 広告が表示される（無料プラン）
- データが外部サービスに保存される

### 将来の拡張
1. 画像アップロード機能
2. ソーシャル共有ボタン
3. 通知機能（新規返信時にメール通知）
4. ランキング機能（人気スポットTOP10）
5. ユーザープロフィールページ

---

## まとめ

この要件定義に基づいて実装を進めることで、ユーザーエンゲージメントの高い車中泊スポットマップを構築できます。

**次のステップ:**
1. データベーススキーマの作成
2. Supabase Edge Functionsの実装
3. フロントエンドUIの実装
4. テスト・デバッグ
5. 本番環境へのデプロイ

ご確認ください！
