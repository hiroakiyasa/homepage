# コメント・いいね機能 要件定義書（会員制版）

## 1. 概要

車旅コンシェルジュに会員登録・ログイン機能を追加し、会員のみがコメント投稿できるシステムを構築する。

### 主要機能
- ✅ **会員登録・ログイン**（メール/パスワード + Google OAuth）
- ✅ **プロフィール機能**（自己紹介、アバター画像）
- ✅ **コメント投稿**（会員のみ）
- ✅ **いいね機能**（誰でも可能、ログイン不要）
- ✅ **マイページ**（自分の投稿履歴）

---

## 2. 認証・会員機能の要件

### 2.1 会員登録

#### 登録方法
1. **メールアドレス + パスワード**
   - メールアドレス
   - パスワード（8文字以上、英数字混在）
   - ユーザー名（3-20文字、ひらがな・カタカナ・漢字・英数字）
   - 利用規約への同意

2. **Googleアカウント**（OAuth 2.0）
   - Googleサインインボタンをクリック
   - Google認証画面でアカウント選択
   - 自動的にユーザー名・メールアドレス取得
   - 初回ログイン時にユーザー名編集可能

#### 登録フロー（メール/パスワード）

```
1. 登録フォーム入力
   ↓
2. メールアドレス確認メール送信
   ↓
3. 確認リンクをクリック
   ↓
4. メールアドレス認証完了
   ↓
5. プロフィール入力画面へリダイレクト
   ↓
6. 登録完了
```

#### 登録フロー（Google OAuth）

```
1. 「Googleでログイン」ボタンクリック
   ↓
2. Google認証画面（アカウント選択）
   ↓
3. 権限同意画面
   ↓
4. アカウント自動作成 + ログイン完了
   ↓
5. 初回のみプロフィール入力画面
   ↓
6. 登録完了
```

### 2.2 ログイン

#### ログイン方法
1. **メールアドレス + パスワード**
   - 通常のログインフォーム
   - 「ログイン状態を保持する」チェックボックス

2. **Googleアカウント**
   - Googleサインインボタン
   - ワンクリックでログイン

3. **パスワードリセット**
   - 「パスワードを忘れた方」リンク
   - メールアドレス入力
   - リセットリンク送信
   - 新しいパスワード設定

#### セッション管理
- **セッション有効期限**: 7日間（デフォルト）
- **ログイン状態を保持**: 30日間
- **自動ログアウト**: セキュリティ上の理由で強制ログアウト可能
- **複数デバイス対応**: 同時ログイン可能

### 2.3 プロフィール機能

#### プロフィール項目

**必須項目:**
- ユーザー名（3-20文字）
- メールアドレス（非公開、確認済み）

**任意項目:**
- 表示名（ニックネーム、3-30文字）
- アバター画像（最大2MB、JPG/PNG/GIF）
- 自己紹介（最大500文字）
- 居住地（都道府県選択）
- 好きな車中泊スポット（最大3箇所）
- Twitter/Instagram URL（SNS連携）
- ウェブサイトURL

#### プロフィール公開範囲
- **公開情報**: 表示名、アバター、自己紹介、居住地、SNS
- **非公開情報**: メールアドレス、本名（任意）

### 2.4 マイページ

#### マイページ機能
1. **投稿履歴**
   - 自分が投稿したコメント一覧
   - 地域名、投稿日時、いいね数、表示

2. **いいねした地域**
   - いいねした地域一覧
   - 地図表示機能

3. **アカウント設定**
   - プロフィール編集
   - パスワード変更
   - メールアドレス変更
   - アカウント削除

4. **統計情報**
   - 投稿数
   - 獲得いいね数（自分のコメントへのいいね）
   - 訪問した地域数

---

## 3. いいね・コメント機能の要件

### 3.1 いいね機能（ログイン不要）

#### 機能概要
- **誰でも可能**: ログイン不要で「いいね」できる
- **重複防止**: ブラウザフィンガープリント + Cookie
- **1地域1いいね**: 同一ユーザーは1地域につき1回のみ
- **取り消し可能**: いいねを取り消せる

#### 会員といいねの違い
| 項目 | 非会員 | 会員 |
|------|--------|------|
| いいね可能 | ✅ | ✅ |
| いいね履歴保存 | Cookie（30日） | アカウントに永久保存 |
| 複数デバイス同期 | ❌ | ✅ |
| マイページで確認 | ❌ | ✅ |

### 3.2 コメント機能（会員のみ）

#### 基本機能
- ✅ **コメント投稿**: 会員のみ
- ✅ **返信機能**: コメントへの返信（1階層）
- ✅ **編集・削除**: 自分のコメントのみ
- ✅ **コメントへのいいね**: 誰でも可能
- ✅ **評価スコア**: 1-5つ星
- ✅ **スパム報告**: 不適切なコメント報告

#### コメント投稿フロー（会員）

```
1. コメント入力フォーム表示
   ↓
2. ログイン状態チェック
   ├─ ログイン済み → 3へ
   └─ 未ログイン → ログイン画面へリダイレクト
   ↓
3. コメント内容入力
   - 本文（1-1000文字）
   - 評価（1-5星、任意）
   ↓
4. 投稿ボタンクリック
   ↓
5. バリデーション
   ↓
6. データベースに保存（status: approved）
   ↓
7. コメント一覧に即座に反映
```

#### コメント表示
- **ソート**: 新着順 / 人気順（いいね数）/ 評価順
- **フィルター**: 星評価でフィルタリング（5つ星のみ、4つ星以上など）
- **ページネーション**: 20件ずつ表示、「もっと見る」ボタン

---

## 4. データベース設計（Supabase）

### 4.1 認証テーブル（Supabase Auth）

#### `auth.users` テーブル（Supabase管理）
Supabaseが自動管理するテーブル

```sql
-- Supabaseが自動作成
-- id, email, encrypted_password, email_confirmed_at, etc.
```

### 4.2 カスタムテーブル

#### `profiles` テーブル
ユーザープロフィール情報

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 基本情報
  username TEXT UNIQUE NOT NULL CHECK (char_length(username) >= 3 AND char_length(username) <= 20),
  display_name TEXT CHECK (char_length(display_name) >= 3 AND char_length(display_name) <= 30),
  avatar_url TEXT,                       -- アバター画像URL
  bio TEXT CHECK (char_length(bio) <= 500),  -- 自己紹介

  -- 詳細情報
  prefecture TEXT,                       -- 居住地（都道府県）
  website_url TEXT,                      -- ウェブサイト
  twitter_url TEXT,                      -- Twitter URL
  instagram_url TEXT,                    -- Instagram URL

  -- お気に入りスポット
  favorite_spots JSONB DEFAULT '[]'::jsonb,  -- 最大3箇所

  -- 統計情報（キャッシュ）
  comments_count INTEGER DEFAULT 0,     -- 投稿コメント数
  likes_received INTEGER DEFAULT 0,     -- 獲得いいね数

  -- メタ情報
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE UNIQUE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_created ON profiles(created_at DESC);

-- RLS（Row Level Security）
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 誰でもプロフィール閲覧可能
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

-- 自分のプロフィールのみ編集可能
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- 自分のプロフィールのみ削除可能
CREATE POLICY "Users can delete own profile"
  ON profiles FOR DELETE
  USING (auth.uid() = id);

-- プロフィール作成時の自動挿入トリガー
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substring(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガー作成
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

#### `regions` テーブル
地域マスタ

```sql
CREATE TABLE regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,             -- URLスラッグ（例: ginza）
  name TEXT NOT NULL,                    -- 地域名（例: 銀座）
  lat DECIMAL(10, 8) NOT NULL,           -- 緯度
  lng DECIMAL(11, 8) NOT NULL,           -- 経度
  elevation INTEGER DEFAULT 0,           -- 標高
  restaurant_count INTEGER DEFAULT 0,    -- レストラン数

  -- 統計情報（キャッシュ）
  likes_count INTEGER DEFAULT 0,         -- いいね数
  comments_count INTEGER DEFAULT 0,      -- コメント数
  avg_rating DECIMAL(3, 2),              -- 平均評価

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE UNIQUE INDEX idx_regions_slug ON regions(slug);
CREATE INDEX idx_regions_name ON regions(name);
CREATE INDEX idx_regions_likes ON regions(likes_count DESC);
```

#### `region_likes` テーブル
地域への「いいね」（ログイン不要）

```sql
CREATE TABLE region_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_slug TEXT NOT NULL,             -- 地域スラッグ

  -- ユーザー識別（どちらか必須）
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,  -- 会員の場合
  user_fingerprint TEXT,                 -- 非会員の場合（ブラウザフィンガープリント）

  ip_address INET,                       -- IPアドレス（スパム防止）
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 制約: 1地域につき1ユーザー1いいねまで
  CONSTRAINT unique_user_like UNIQUE NULLS NOT DISTINCT (region_slug, user_id, user_fingerprint)
);

-- インデックス
CREATE INDEX idx_region_likes_region ON region_likes(region_slug);
CREATE INDEX idx_region_likes_user ON region_likes(user_id);
CREATE INDEX idx_region_likes_fingerprint ON region_likes(user_fingerprint);
CREATE INDEX idx_region_likes_created ON region_likes(created_at DESC);

-- RLS
ALTER TABLE region_likes ENABLE ROW LEVEL SECURITY;

-- 誰でも閲覧可能
CREATE POLICY "Anyone can view region likes"
  ON region_likes FOR SELECT
  USING (true);

-- 誰でもいいね追加可能
CREATE POLICY "Anyone can add region likes"
  ON region_likes FOR INSERT
  WITH CHECK (true);

-- 自分のいいねのみ削除可能（会員）
CREATE POLICY "Users can delete own likes"
  ON region_likes FOR DELETE
  USING (auth.uid() = user_id);

-- 非会員も自分のフィンガープリントなら削除可能
CREATE POLICY "Guests can delete own likes by fingerprint"
  ON region_likes FOR DELETE
  USING (user_id IS NULL);
```

#### `comments` テーブル
コメント（会員のみ投稿可能）

```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_slug TEXT NOT NULL,             -- 地域スラッグ
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,  -- 親コメント（返信の場合）

  -- 投稿者（必須: 会員のみ）
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- コメント内容
  content TEXT NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 1000),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),  -- 評価（1-5）

  -- 統計情報（キャッシュ）
  likes_count INTEGER DEFAULT 0,         -- いいね数
  replies_count INTEGER DEFAULT 0,       -- 返信数

  -- ステータス
  status TEXT DEFAULT 'approved' CHECK (status IN ('approved', 'rejected', 'spam')),
  is_edited BOOLEAN DEFAULT FALSE,       -- 編集済みフラグ
  edited_at TIMESTAMPTZ,                 -- 編集日時

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_comments_region ON comments(region_slug);
CREATE INDEX idx_comments_user ON comments(user_id);
CREATE INDEX idx_comments_parent ON comments(parent_id);
CREATE INDEX idx_comments_status ON comments(status);
CREATE INDEX idx_comments_created ON comments(created_at DESC);
CREATE INDEX idx_comments_likes ON comments(likes_count DESC);
CREATE INDEX idx_comments_rating ON comments(rating DESC);

-- RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- 承認済みコメントは誰でも閲覧可能
CREATE POLICY "Anyone can view approved comments"
  ON comments FOR SELECT
  USING (status = 'approved');

-- 会員のみコメント投稿可能
CREATE POLICY "Authenticated users can create comments"
  ON comments FOR INSERT
  WITH CHECK (auth.uid() = user_id AND status = 'approved');

-- 自分のコメントのみ編集可能
CREATE POLICY "Users can update own comments"
  ON comments FOR UPDATE
  USING (auth.uid() = user_id);

-- 自分のコメントのみ削除可能
CREATE POLICY "Users can delete own comments"
  ON comments FOR DELETE
  USING (auth.uid() = user_id);
```

#### `comment_likes` テーブル
コメントへの「いいね」（誰でも可能）

```sql
CREATE TABLE comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,

  -- ユーザー識別（どちらか必須）
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,  -- 会員の場合
  user_fingerprint TEXT,                 -- 非会員の場合

  ip_address INET,                       -- IPアドレス
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 制約: 1コメントにつき1ユーザー1いいねまで
  CONSTRAINT unique_comment_like UNIQUE NULLS NOT DISTINCT (comment_id, user_id, user_fingerprint)
);

-- インデックス
CREATE INDEX idx_comment_likes_comment ON comment_likes(comment_id);
CREATE INDEX idx_comment_likes_user ON comment_likes(user_id);

-- RLS
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

-- 誰でも閲覧・追加・削除可能
CREATE POLICY "Anyone can manage comment likes"
  ON comment_likes FOR ALL
  USING (true)
  WITH CHECK (true);
```

#### `spam_reports` テーブル
スパム報告

```sql
CREATE TABLE spam_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,

  -- 報告者
  reporter_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reporter_fingerprint TEXT,

  reason TEXT CHECK (reason IN ('spam', 'inappropriate', 'offensive', 'other')),
  description TEXT,                      -- 詳細説明

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_spam_reports_comment ON spam_reports(comment_id);

-- RLS
ALTER TABLE spam_reports ENABLE ROW LEVEL SECURITY;

-- 誰でも報告可能
CREATE POLICY "Anyone can report spam"
  ON spam_reports FOR INSERT
  WITH CHECK (true);
```

### 4.3 データベース関数

#### プロフィール取得（ユーザー名から）

```sql
CREATE OR REPLACE FUNCTION get_profile_by_username(username_param TEXT)
RETURNS TABLE (
  id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  prefecture TEXT,
  comments_count INTEGER,
  likes_received INTEGER,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.bio,
    p.prefecture,
    p.comments_count,
    p.likes_received,
    p.created_at
  FROM profiles p
  WHERE p.username = username_param;
END;
$$ LANGUAGE plpgsql STABLE;
```

#### コメント一覧取得（プロフィール付き）

```sql
CREATE OR REPLACE FUNCTION get_comments_with_profiles(
  region_slug_param TEXT,
  limit_param INTEGER DEFAULT 20,
  offset_param INTEGER DEFAULT 0,
  sort_by TEXT DEFAULT 'created_at'
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  rating INTEGER,
  likes_count INTEGER,
  replies_count INTEGER,
  is_edited BOOLEAN,
  created_at TIMESTAMPTZ,
  user_id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.content,
    c.rating,
    c.likes_count,
    c.replies_count,
    c.is_edited,
    c.created_at,
    c.user_id,
    p.username,
    p.display_name,
    p.avatar_url
  FROM comments c
  JOIN profiles p ON c.user_id = p.id
  WHERE c.region_slug = region_slug_param
  AND c.parent_id IS NULL
  AND c.status = 'approved'
  ORDER BY
    CASE WHEN sort_by = 'likes' THEN c.likes_count END DESC,
    CASE WHEN sort_by = 'rating' THEN c.rating END DESC,
    CASE WHEN sort_by = 'created_at' THEN c.created_at END DESC
  LIMIT limit_param
  OFFSET offset_param;
END;
$$ LANGUAGE plpgsql STABLE;
```

#### ユーザーの投稿履歴取得

```sql
CREATE OR REPLACE FUNCTION get_user_comments(
  user_id_param UUID,
  limit_param INTEGER DEFAULT 20,
  offset_param INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  region_slug TEXT,
  region_name TEXT,
  content TEXT,
  rating INTEGER,
  likes_count INTEGER,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.region_slug,
    r.name AS region_name,
    c.content,
    c.rating,
    c.likes_count,
    c.created_at
  FROM comments c
  LEFT JOIN regions r ON c.region_slug = r.slug
  WHERE c.user_id = user_id_param
  AND c.status = 'approved'
  ORDER BY c.created_at DESC
  LIMIT limit_param
  OFFSET offset_param;
END;
$$ LANGUAGE plpgsql STABLE;
```

---

## 5. API設計（Supabase Edge Functions + Client SDK）

### 5.1 認証API（Supabase Auth）

#### メールアドレス登録

```javascript
// クライアント側
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'secure_password',
  options: {
    data: {
      username: 'yamada_taro',
      display_name: '山田太郎'
    },
    emailRedirectTo: 'https://trailfusionai.com/camping_note/auth/confirm'
  }
});
```

#### Googleサインイン

```javascript
// クライアント側
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: 'https://trailfusionai.com/camping_note/auth/callback',
    queryParams: {
      access_type: 'offline',
      prompt: 'consent'
    }
  }
});
```

#### ログイン

```javascript
// メール/パスワードでログイン
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'secure_password'
});
```

#### ログアウト

```javascript
const { error } = await supabase.auth.signOut();
```

#### パスワードリセット

```javascript
// リセットメール送信
const { data, error } = await supabase.auth.resetPasswordForEmail(
  'user@example.com',
  {
    redirectTo: 'https://trailfusionai.com/camping_note/auth/reset-password'
  }
);

// 新しいパスワード設定
const { data, error } = await supabase.auth.updateUser({
  password: 'new_secure_password'
});
```

### 5.2 プロフィールAPI

#### プロフィール取得

```javascript
// 自分のプロフィール
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .single();

// 他人のプロフィール（ユーザー名から）
const { data: profile } = await supabase
  .rpc('get_profile_by_username', { username_param: 'yamada_taro' });
```

#### プロフィール更新

```javascript
const { data, error } = await supabase
  .from('profiles')
  .update({
    display_name: '山田太郎',
    bio: 'キャンプと車中泊が大好きです！',
    prefecture: '東京都',
    website_url: 'https://example.com'
  })
  .eq('id', user.id);
```

#### アバター画像アップロード

```javascript
// 画像をアップロード
const { data: uploadData, error: uploadError } = await supabase.storage
  .from('avatars')
  .upload(`${user.id}/avatar.jpg`, file, {
    cacheControl: '3600',
    upsert: true
  });

// プロフィールのavatar_urlを更新
const { data: publicURL } = supabase.storage
  .from('avatars')
  .getPublicUrl(`${user.id}/avatar.jpg`);

await supabase
  .from('profiles')
  .update({ avatar_url: publicURL.data.publicUrl })
  .eq('id', user.id);
```

### 5.3 いいねAPI

#### 地域にいいね

```javascript
// 会員の場合
const { data, error } = await supabase
  .from('region_likes')
  .insert({
    region_slug: 'ginza',
    user_id: user.id
  });

// 非会員の場合
const { data, error } = await supabase
  .from('region_likes')
  .insert({
    region_slug: 'ginza',
    user_fingerprint: fingerprint
  });
```

#### いいね削除

```javascript
// 会員
const { error } = await supabase
  .from('region_likes')
  .delete()
  .eq('region_slug', 'ginza')
  .eq('user_id', user.id);

// 非会員
const { error } = await supabase
  .from('region_likes')
  .delete()
  .eq('region_slug', 'ginza')
  .eq('user_fingerprint', fingerprint);
```

### 5.4 コメントAPI

#### コメント投稿（会員のみ）

```javascript
const { data, error } = await supabase
  .from('comments')
  .insert({
    region_slug: 'ginza',
    user_id: user.id,
    content: 'とても良い場所でした！',
    rating: 5
  })
  .select();
```

#### コメント一覧取得

```javascript
const { data: comments } = await supabase
  .rpc('get_comments_with_profiles', {
    region_slug_param: 'ginza',
    limit_param: 20,
    offset_param: 0,
    sort_by: 'created_at'  // 'created_at', 'likes', 'rating'
  });
```

#### コメント編集

```javascript
const { data, error } = await supabase
  .from('comments')
  .update({
    content: '編集後のコメント',
    is_edited: true,
    edited_at: new Date().toISOString()
  })
  .eq('id', commentId)
  .eq('user_id', user.id);
```

#### コメント削除

```javascript
const { error } = await supabase
  .from('comments')
  .delete()
  .eq('id', commentId)
  .eq('user_id', user.id);
```

---

## 6. フロントエンド設計

### 6.1 技術スタック

**追加ライブラリ:**
```html
<!-- Supabaseクライアント（認証機能含む） -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

<!-- フィンガープリント生成 -->
<script src="https://cdn.jsdelivr.net/npm/@fingerprintjs/fingerprintjs@3/dist/fp.min.js"></script>

<!-- 日付フォーマット -->
<script src="https://cdn.jsdelivr.net/npm/dayjs@1/dayjs.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/dayjs@1/plugin/relativeTime.js"></script>
<script src="https://cdn.jsdelivr.net/npm/dayjs@1/locale/ja.js"></script>

<!-- Google Sign-In -->
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

### 6.2 UIコンポーネント

#### ヘッダーナビゲーション

```html
<header class="site-header">
  <div class="container">
    <div class="logo">
      <a href="/camping_note/index.html">🚗 車旅コンシェルジュ</a>
    </div>

    <nav class="main-nav">
      <a href="/camping_note/index.html">ホーム</a>
      <a href="/camping_note/map.html">地図</a>

      <!-- ログイン前 -->
      <div id="auth-buttons-logged-out">
        <a href="/camping_note/auth/login.html" class="btn-login">ログイン</a>
        <a href="/camping_note/auth/register.html" class="btn-register">新規登録</a>
      </div>

      <!-- ログイン後 -->
      <div id="auth-buttons-logged-in" style="display: none;">
        <div class="user-menu">
          <button class="user-menu-toggle">
            <img src="" alt="" class="avatar" id="user-avatar">
            <span id="user-display-name"></span>
          </button>
          <div class="user-dropdown">
            <a href="/camping_note/profile/me.html">マイページ</a>
            <a href="/camping_note/profile/edit.html">プロフィール編集</a>
            <a href="/camping_note/profile/settings.html">設定</a>
            <hr>
            <a href="#" id="logout-btn">ログアウト</a>
          </div>
        </div>
      </div>
    </nav>
  </div>
</header>
```

#### 会員登録フォーム

```html
<div class="auth-page">
  <div class="auth-container">
    <h1>新規会員登録</h1>

    <!-- Google サインイン -->
    <button class="btn-google-signin" id="google-signin-btn">
      <img src="/images/google-icon.svg" alt="Google">
      Googleアカウントで登録
    </button>

    <div class="divider">または</div>

    <!-- メールアドレス登録 -->
    <form id="register-form">
      <div class="form-group">
        <label for="username">ユーザー名 *</label>
        <input type="text" id="username" required
               minlength="3" maxlength="20"
               pattern="^[a-zA-Z0-9_ぁ-んァ-ヶー一-龠]+$"
               placeholder="yamada_taro">
        <small>3-20文字、英数字・ひらがな・カタカナ・漢字が使えます</small>
      </div>

      <div class="form-group">
        <label for="display-name">表示名 *</label>
        <input type="text" id="display-name" required
               minlength="3" maxlength="30"
               placeholder="山田太郎">
      </div>

      <div class="form-group">
        <label for="email">メールアドレス *</label>
        <input type="email" id="email" required
               placeholder="you@example.com">
      </div>

      <div class="form-group">
        <label for="password">パスワード *</label>
        <input type="password" id="password" required
               minlength="8"
               placeholder="8文字以上">
        <small id="password-strength"></small>
      </div>

      <div class="form-group">
        <label for="password-confirm">パスワード（確認） *</label>
        <input type="password" id="password-confirm" required>
      </div>

      <div class="form-group checkbox">
        <label>
          <input type="checkbox" id="agree-terms" required>
          <a href="/camping_note/terms.html" target="_blank">利用規約</a>と
          <a href="/camping_note/privacy.html" target="_blank">プライバシーポリシー</a>に同意します
        </label>
      </div>

      <button type="submit" class="btn-primary">登録する</button>
    </form>

    <p class="auth-footer">
      既にアカウントをお持ちの方は
      <a href="/camping_note/auth/login.html">ログイン</a>
    </p>
  </div>
</div>
```

#### ログインフォーム

```html
<div class="auth-page">
  <div class="auth-container">
    <h1>ログイン</h1>

    <!-- Google サインイン -->
    <button class="btn-google-signin" id="google-signin-btn">
      <img src="/images/google-icon.svg" alt="Google">
      Googleアカウントでログイン
    </button>

    <div class="divider">または</div>

    <!-- メールアドレスログイン -->
    <form id="login-form">
      <div class="form-group">
        <label for="email">メールアドレス</label>
        <input type="email" id="email" required>
      </div>

      <div class="form-group">
        <label for="password">パスワード</label>
        <input type="password" id="password" required>
      </div>

      <div class="form-group checkbox">
        <label>
          <input type="checkbox" id="remember-me">
          ログイン状態を保持する（30日間）
        </label>
      </div>

      <button type="submit" class="btn-primary">ログイン</button>
    </form>

    <p class="auth-footer">
      <a href="/camping_note/auth/forgot-password.html">パスワードを忘れた方</a>
    </p>

    <p class="auth-footer">
      アカウントをお持ちでない方は
      <a href="/camping_note/auth/register.html">新規登録</a>
    </p>
  </div>
</div>
```

#### プロフィールページ

```html
<div class="profile-page">
  <div class="profile-header">
    <img src="" alt="" class="profile-avatar" id="profile-avatar">
    <div class="profile-info">
      <h1 id="profile-display-name"></h1>
      <p class="username">@<span id="profile-username"></span></p>
      <p class="bio" id="profile-bio"></p>

      <div class="profile-meta">
        <span>📍 <span id="profile-prefecture"></span></span>
        <span>📅 登録日: <span id="profile-created"></span></span>
      </div>

      <div class="profile-stats">
        <div class="stat">
          <span class="stat-value" id="comments-count">0</span>
          <span class="stat-label">投稿</span>
        </div>
        <div class="stat">
          <span class="stat-value" id="likes-received">0</span>
          <span class="stat-label">いいね</span>
        </div>
      </div>

      <!-- 自分のプロフィールの場合 -->
      <div id="edit-profile-btn-container" style="display: none;">
        <a href="/camping_note/profile/edit.html" class="btn-primary">プロフィール編集</a>
      </div>
    </div>
  </div>

  <div class="profile-tabs">
    <button class="tab active" data-tab="comments">投稿したコメント</button>
    <button class="tab" data-tab="likes">いいねした地域</button>
  </div>

  <div class="tab-content active" id="tab-comments">
    <!-- コメント一覧 -->
  </div>

  <div class="tab-content" id="tab-likes">
    <!-- いいねした地域一覧 -->
  </div>
</div>
```

#### コメントセクション（地域ページ）

```html
<div class="comments-section">
  <!-- コメント投稿フォーム -->
  <div class="comment-form-container">
    <!-- ログイン済み -->
    <div id="comment-form-logged-in" style="display: none;">
      <h3>コメントを投稿</h3>
      <form id="comment-form">
        <div class="form-group">
          <label for="rating">評価（任意）</label>
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
                    placeholder="この場所の感想を教えてください..."></textarea>
          <small><span id="char-count">0</span> / 1000</small>
        </div>

        <button type="submit" class="btn-primary">投稿する</button>
      </form>
    </div>

    <!-- 未ログイン -->
    <div id="comment-form-logged-out">
      <p class="login-prompt">
        コメントを投稿するには
        <a href="/camping_note/auth/login.html">ログイン</a>または
        <a href="/camping_note/auth/register.html">新規登録</a>してください
      </p>
    </div>
  </div>

  <!-- コメント一覧 -->
  <div class="comments-header">
    <h3>コメント (<span id="comment-count">0</span>)</h3>
    <div class="sort-buttons">
      <button class="sort-btn active" data-sort="created_at">新着順</button>
      <button class="sort-btn" data-sort="likes">人気順</button>
      <button class="sort-btn" data-sort="rating">評価順</button>
    </div>
  </div>

  <div id="comments-list">
    <!-- コメントアイテム -->
  </div>

  <button id="load-more" class="load-more-btn">もっと見る</button>
</div>
```

### 6.3 JavaScript実装

#### 認証管理

```javascript
// auth.js - 認証関連の共通処理

// Supabaseクライアント初期化
const supabase = window.supabase.createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_SUPABASE_ANON_KEY'
);

// 現在のユーザー情報
let currentUser = null;
let currentProfile = null;

// 初期化
async function initAuth() {
  // セッション確認
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    currentUser = session.user;
    await loadUserProfile();
    updateUIForLoggedIn();
  } else {
    updateUIForLoggedOut();
  }

  // 認証状態変更を監視
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') {
      currentUser = session.user;
      loadUserProfile();
      updateUIForLoggedIn();
    } else if (event === 'SIGNED_OUT') {
      currentUser = null;
      currentProfile = null;
      updateUIForLoggedOut();
    }
  });
}

// プロフィール読み込み
async function loadUserProfile() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', currentUser.id)
    .single();

  if (!error) {
    currentProfile = data;
  }
}

// UI更新（ログイン済み）
function updateUIForLoggedIn() {
  document.getElementById('auth-buttons-logged-out').style.display = 'none';
  document.getElementById('auth-buttons-logged-in').style.display = 'block';

  // ユーザー情報表示
  document.getElementById('user-avatar').src = currentProfile?.avatar_url || '/images/default-avatar.svg';
  document.getElementById('user-display-name').textContent = currentProfile?.display_name || currentUser.email;

  // コメントフォーム表示
  document.getElementById('comment-form-logged-in')?.style.removeProperty('display');
  document.getElementById('comment-form-logged-out')?.style.setProperty('display', 'none');
}

// UI更新（未ログイン）
function updateUIForLoggedOut() {
  document.getElementById('auth-buttons-logged-out').style.display = 'block';
  document.getElementById('auth-buttons-logged-in').style.display = 'none';

  // コメントフォーム非表示
  document.getElementById('comment-form-logged-in')?.style.setProperty('display', 'none');
  document.getElementById('comment-form-logged-out')?.style.removeProperty('display');
}

// ページ読み込み時
document.addEventListener('DOMContentLoaded', initAuth);
```

#### 会員登録

```javascript
// register.js

// メール/パスワードで登録
async function handleRegister(event) {
  event.preventDefault();

  const username = document.getElementById('username').value;
  const displayName = document.getElementById('display-name').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const passwordConfirm = document.getElementById('password-confirm').value;

  // パスワード確認
  if (password !== passwordConfirm) {
    alert('パスワードが一致しません');
    return;
  }

  // 登録
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        display_name: displayName
      },
      emailRedirectTo: `${window.location.origin}/camping_note/auth/confirm`
    }
  });

  if (error) {
    alert(`登録エラー: ${error.message}`);
  } else {
    alert('確認メールを送信しました。メールをご確認ください。');
    window.location.href = '/camping_note/auth/check-email.html';
  }
}

// Googleサインイン
async function handleGoogleSignIn() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/camping_note/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent'
      }
    }
  });

  if (error) {
    alert(`Google認証エラー: ${error.message}`);
  }
}

// イベントリスナー
document.getElementById('register-form').addEventListener('submit', handleRegister);
document.getElementById('google-signin-btn').addEventListener('click', handleGoogleSignIn);
```

#### コメント投稿・表示

```javascript
// comments.js

// コメント投稿
async function submitComment(event) {
  event.preventDefault();

  if (!currentUser) {
    alert('コメントを投稿するにはログインしてください');
    window.location.href = '/camping_note/auth/login.html';
    return;
  }

  const content = document.getElementById('comment-content').value;
  const rating = document.querySelector('input[name="rating"]:checked')?.value || null;
  const regionSlug = getRegionSlug();

  const { data, error } = await supabase
    .from('comments')
    .insert({
      region_slug: regionSlug,
      user_id: currentUser.id,
      content,
      rating: rating ? parseInt(rating) : null
    })
    .select();

  if (error) {
    alert(`投稿エラー: ${error.message}`);
  } else {
    alert('コメントを投稿しました！');
    document.getElementById('comment-form').reset();
    await loadComments();
  }
}

// コメント一覧読み込み
async function loadComments(sortBy = 'created_at', offset = 0) {
  const regionSlug = getRegionSlug();

  const { data: comments, error } = await supabase
    .rpc('get_comments_with_profiles', {
      region_slug_param: regionSlug,
      limit_param: 20,
      offset_param: offset,
      sort_by: sortBy
    });

  if (!error && comments) {
    renderComments(comments);
  }
}

// コメント表示
function renderComments(comments) {
  const commentsList = document.getElementById('comments-list');
  if (offset === 0) commentsList.innerHTML = '';

  comments.forEach(comment => {
    const isOwnComment = currentUser && comment.user_id === currentUser.id;

    const commentHTML = `
      <div class="comment-item" data-comment-id="${comment.id}">
        <div class="comment-header">
          <a href="/camping_note/profile/${comment.username}.html" class="author-link">
            <img src="${comment.avatar_url || '/images/default-avatar.svg'}"
                 alt="${comment.display_name}" class="avatar">
            <span class="author-name">${escapeHtml(comment.display_name || comment.username)}</span>
          </a>
          ${comment.rating ? renderStars(comment.rating) : ''}
          <span class="comment-time">${formatRelativeTime(comment.created_at)}</span>
          ${comment.is_edited ? '<span class="edited-badge">編集済み</span>' : ''}
        </div>

        <div class="comment-body">
          <p>${escapeHtml(comment.content)}</p>
        </div>

        <div class="comment-footer">
          <button class="comment-like-btn" onclick="toggleCommentLike('${comment.id}')">
            ❤️ <span class="like-count">${comment.likes_count}</span>
          </button>
          <button class="reply-btn" onclick="showReplyForm('${comment.id}')">返信</button>
          ${isOwnComment ? `
            <button class="edit-btn" onclick="editComment('${comment.id}')">編集</button>
            <button class="delete-btn" onclick="deleteComment('${comment.id}')">削除</button>
          ` : `
            <button class="report-btn" onclick="reportComment('${comment.id}')">報告</button>
          `}
        </div>
      </div>
    `;

    commentsList.insertAdjacentHTML('beforeend', commentHTML);
  });
}

// イベントリスナー
document.getElementById('comment-form')?.addEventListener('submit', submitComment);
document.addEventListener('DOMContentLoaded', () => loadComments());
```

---

## 7. セキュリティ要件

### 7.1 認証セキュリティ

1. **パスワード要件**
   - 最低8文字
   - 英数字混在を推奨（強制ではない）
   - bcryptでハッシュ化（Supabaseが自動処理）

2. **メール確認**
   - 登録時に確認メール送信
   - 24時間以内にリンククリック
   - 未確認アカウントは7日後に自動削除

3. **セッション管理**
   - JWT（JSON Web Token）使用
   - リフレッシュトークン: 7日間
   - アクセストークン: 1時間

4. **レート制限**
   - ログイン試行: 5回/5分
   - パスワードリセット: 3回/時間
   - コメント投稿: 10回/時間

### 7.2 Google OAuth設定

**Google Cloud Console設定:**
1. OAuth 2.0クライアントID作成
2. 承認済みリダイレクトURI:
   - `https://YOUR_SUPABASE_PROJECT.supabase.co/auth/v1/callback`
   - `http://localhost:3000/auth/callback`（開発用）
3. スコープ: `email`, `profile`

**Supabase設定:**
```
Authentication → Providers → Google
- Client ID: (Google Cloudから取得)
- Client Secret: (Google Cloudから取得)
- Redirect URL: https://trailfusionai.com/camping_note/auth/callback
```

### 7.3 データ保護

1. **Row Level Security (RLS)**
   - すべてのテーブルでRLS有効化
   - 自分のデータのみ編集可能

2. **個人情報保護**
   - メールアドレス: 非公開
   - IPアドレス: ハッシュ化して保存
   - パスワード: bcryptハッシュ（Supabaseが自動処理）

3. **XSS対策**
   - すべてのユーザー入力をエスケープ
   - Content Security Policy (CSP) 設定

---

## 8. 実装フェーズ

### Phase 1: 認証機能（2週間）
- ✅ Supabase Auth設定
- ✅ Google OAuth設定
- ✅ 会員登録・ログインUI
- ✅ プロフィールテーブル作成
- ✅ 基本的なプロフィールページ

### Phase 2: コメント機能（2週間）
- ✅ コメント投稿（会員のみ）
- ✅ コメント表示・編集・削除
- ✅ 返信機能
- ✅ ソート・フィルター

### Phase 3: いいね機能（1週間）
- ✅ 地域へのいいね（誰でも可能）
- ✅ コメントへのいいね
- ✅ マイページにいいね履歴表示

### Phase 4: プロフィール拡張（1週間）
- ✅ アバター画像アップロード
- ✅ プロフィール詳細編集
- ✅ 投稿履歴・統計情報

### Phase 5: 管理機能（1週間）
- ✅ スパム報告処理
- ✅ 管理者ダッシュボード
- ✅ ユーザー管理

### Phase 6: 最適化（1週間）
- ✅ パフォーマンス改善
- ✅ SEO対策
- ✅ リアルタイム更新

---

## 9. コスト見積もり

### Supabase料金

**Free Tier（$0/月）**
- データベース容量: 500MB
- ストレージ: 1GB
- 認証ユーザー: 50,000 MAU
- Edge Functions: 500K呼び出し/月

**予想トラフィック:**
- 月間訪問者: 10,000人
- 会員登録: 500人/月
- コメント投稿: 1,000件/月
- いいね: 10,000回/月

→ **Free Tierで十分カバー可能**

**Pro Plan（$25/月）への移行タイミング:**
- 会員数が10,000人を超えた場合
- データベース容量が500MBを超えた場合
- ストレージ使用量が1GBを超えた場合（アバター画像）

### Google Cloud（OAuth）

**無料枠:**
- OAuth 2.0認証: 完全無料
- 制限なし

---

## 10. まとめ

この要件定義に基づいて実装することで、以下を実現できます:

### ✅ 実現できること

1. **会員制コミュニティ**
   - メール/パスワードまたはGoogleアカウントで登録
   - プロフィール機能で自己紹介
   - 会員のみコメント投稿可能

2. **誰でも参加できる「いいね」**
   - ログイン不要でいいね可能
   - 会員はマイページでいいね履歴確認可能

3. **安全で信頼性の高いシステム**
   - Supabase Authで堅牢な認証
   - Row Level Securityでデータ保護
   - スパム対策・報告機能

4. **無料で運用開始**
   - Supabase Free Tierで十分
   - Google OAuth無料
   - 月間1万訪問者まで対応可能

### 📋 次のステップ

1. **Supabaseプロジェクト作成**
2. **データベーススキーマ実装**
3. **Google OAuth設定**
4. **フロントエンドUI実装**
5. **テスト・デバッグ**
6. **本番環境デプロイ**

ご確認ください！実装を開始しますか？
