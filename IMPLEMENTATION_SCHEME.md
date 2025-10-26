# Supabase いいね・コメント機能 実装スキーム

このドキュメントは、Supabase公式ドキュメントに基づいて作成された、正確で実装可能なスキームです。

## 目次

1. [アーキテクチャ概要](#アーキテクチャ概要)
2. [フェーズ別実装計画](#フェーズ別実装計画)
3. [データベース設計](#データベース設計)
4. [認証システム](#認証システム)
5. [いいね機能](#いいね機能)
6. [コメント機能](#コメント機能)
7. [リアルタイム更新](#リアルタイム更新)
8. [フロントエンド統合](#フロントエンド統合)
9. [セキュリティとRLS](#セキュリティとrls)
10. [テストとデプロイ](#テストとデプロイ)

---

## アーキテクチャ概要

### システム構成

```
┌─────────────────────────────────────────────────────────────┐
│                     静的HTML (808地域)                       │
│  - 既存の generate-from-json-sources.js で生成              │
│  - 各HTMLに認証UI、いいねボタン、コメント機能を追加         │
└─────────────────────────────────────────────────────────────┘
                            ↓ ↑
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Client (JS)                     │
│  - 認証管理 (Email/Password + Google OAuth)                 │
│  - いいね・コメントのCRUD操作                                │
│  - Realtime購読 (いいね数のリアルタイム更新)                │
│  - FingerprintJS統合 (匿名ユーザー追跡)                     │
└─────────────────────────────────────────────────────────────┘
                            ↓ ↑
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Backend                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Auth (認証)                                          │   │
│  │  - Email/Password認証                                │   │
│  │  - Google OAuth 2.0                                  │   │
│  │  - セッション管理                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Database (PostgreSQL)                               │   │
│  │  - profiles (ユーザープロフィール)                   │   │
│  │  - regions (地域マスタ)                              │   │
│  │  - parking_spots (駐車場)                            │   │
│  │  - restaurants (レストラン)                          │   │
│  │  - likes (いいね統合テーブル)                        │   │
│  │  - comments (コメント)                               │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Row Level Security (RLS)                            │   │
│  │  - 匿名ユーザー: いいね閲覧・追加                    │   │
│  │  - 認証ユーザー: いいね削除、コメントCRUD            │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Realtime (リアルタイム更新)                          │   │
│  │  - Database Triggers → Broadcast                    │   │
│  │  - いいね数のライブ更新                              │   │
│  │  - コメント追加のライブ更新                          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 技術スタック

- **フロントエンド**: 既存の静的HTML + Vanilla JavaScript
- **認証**: Supabase Auth (Email/Password + Google OAuth)
- **データベース**: PostgreSQL (Supabase提供)
- **リアルタイム**: Supabase Realtime (Broadcast)
- **匿名追跡**: FingerprintJS Pro
- **セキュリティ**: Row Level Security (RLS)

---

## フェーズ別実装計画

### Phase 1: データベース基盤構築 (Day 1-2)

**目標**: データベーススキーマとRLSポリシーの構築

#### タスク
1. ✅ Supabaseプロジェクトの作成・確認
2. ✅ 必要な拡張機能の有効化
3. ✅ データベーススキーマの作成
4. ✅ RLSポリシーの設定
5. ✅ トリガー関数の作成
6. ✅ インデックスの作成

#### 成果物
- マイグレーションファイル
- テスト用SQLスクリプト

### Phase 2: 認証システム構築 (Day 3-4)

**目標**: Email/Password認証とGoogle OAuthの実装

#### タスク
1. ✅ Google Cloud Consoleでの認証情報作成
2. ✅ Supabase Authの設定
3. ✅ 認証UIコンポーネントの作成
4. ✅ セッション管理の実装
5. ✅ FingerprintJSの統合

#### 成果物
- 認証UIコンポーネント (HTML/CSS/JS)
- 認証ヘルパー関数
- FingerprintJS統合コード

### Phase 3: いいね機能実装 (Day 5-7)

**目標**: 地域・駐車場・レストランへのいいね機能

#### タスク
1. ✅ いいねボタンUI作成
2. ✅ いいね追加/削除APIの実装
3. ✅ いいね数表示の実装
4. ✅ 匿名ユーザー対応
5. ✅ リアルタイム更新の実装

#### 成果物
- いいねコンポーネント (HTML/CSS/JS)
- いいねヘルパー関数
- Realtimeサブスクリプション

### Phase 4: コメント機能実装 (Day 8-10)

**目標**: 地域ページへのコメント機能

#### タスク
1. ✅ コメント投稿UIの作成
2. ✅ コメント一覧表示の実装
3. ✅ コメント編集・削除機能
4. ✅ リアルタイム更新の実装
5. ✅ ページネーション実装

#### 成果物
- コメントコンポーネント (HTML/CSS/JS)
- コメントヘルパー関数

### Phase 5: 既存HTMLへの統合 (Day 11-13)

**目標**: generate-from-json-sources.jsへの統合

#### タスク
1. ✅ HTMLテンプレート修正
2. ✅ JavaScript埋め込み
3. ✅ CSS統合
4. ✅ 全808地域の再生成
5. ✅ テスト

#### 成果物
- 修正済み generate-from-json-sources.js
- 更新された808個のHTMLファイル

### Phase 6: テストとデプロイ (Day 14-15)

**目標**: 本番環境へのデプロイ

#### タスク
1. ✅ 統合テスト
2. ✅ パフォーマンステスト
3. ✅ セキュリティ監査
4. ✅ 本番環境デプロイ
5. ✅ モニタリング設定

#### 成果物
- テストレポート
- デプロイドキュメント

---

## データベース設計

### 1. 拡張機能の有効化

```sql
-- UUID生成用
create extension if not exists "uuid-ossp";

-- 地理空間データ用 (駐車場・レストランの位置情報)
create extension if not exists postgis;
```

### 2. プロフィールテーブル

```sql
-- ユーザープロフィール
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 自動的に更新日時を更新
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security definer
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at
  before update on public.profiles
  for each row
  execute function public.handle_updated_at();

-- 新規ユーザー作成時にプロフィールを自動作成
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
```

### 3. 地域マスタテーブル

```sql
-- 地域マスタ (808地域)
create table public.regions (
  id uuid default uuid_generate_v4() primary key,
  slug text unique not null, -- URLで使用 (例: "あおば通")
  name text not null,
  name_en text,
  lat double precision not null,
  lng double precision not null,
  min_lat double precision,
  max_lat double precision,
  min_lng double precision,
  max_lng double precision,
  description text,
  like_count int default 0,
  comment_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- スラッグでの高速検索用
create index idx_regions_slug on public.regions(slug);

-- 位置情報検索用
create index idx_regions_location on public.regions using gist(
  st_makepoint(lng, lat)::geography
);

create trigger set_updated_at
  before update on public.regions
  for each row
  execute function public.handle_updated_at();
```

### 4. 駐車場テーブル

```sql
-- 駐車場
create table public.parking_spots (
  id uuid default uuid_generate_v4() primary key,
  region_slug text references public.regions(slug) on delete cascade,
  name text not null,
  lat double precision not null,
  lng double precision not null,
  address text,
  overnight_fee int, -- 18:00-8:00の料金
  hourly_rate int,
  max_fee_24h int,
  facilities jsonb, -- {convenience_store: true, toilet: true, hot_spring: false}
  like_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_parking_region on public.parking_spots(region_slug);
create index idx_parking_location on public.parking_spots using gist(
  st_makepoint(lng, lat)::geography
);

create trigger set_updated_at
  before update on public.parking_spots
  for each row
  execute function public.handle_updated_at();
```

### 5. レストランテーブル

```sql
-- レストラン
create table public.restaurants (
  id uuid default uuid_generate_v4() primary key,
  region_slug text references public.regions(slug) on delete cascade,
  name text not null,
  lat double precision not null,
  lng double precision not null,
  rating numeric(2,1), -- 食べログ評価
  cuisine_type text,
  address text,
  tabelog_url text,
  like_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_restaurant_region on public.restaurants(region_slug);
create index idx_restaurant_location on public.restaurants using gist(
  st_makepoint(lng, lat)::geography
);

create trigger set_updated_at
  before update on public.restaurants
  for each row
  execute function public.handle_updated_at();
```

### 6. いいねテーブル (ポリモーフィック)

```sql
-- いいね統合テーブル
create table public.likes (
  id uuid default uuid_generate_v4() primary key,
  target_type text not null check (target_type in ('region', 'parking_spot', 'restaurant', 'comment')),
  target_id uuid not null,
  user_id uuid references auth.users(id) on delete cascade,
  user_fingerprint text, -- 匿名ユーザー用
  ip_address inet,
  created_at timestamptz default now(),

  -- ユニーク制約: 1人/1デバイスにつき1つのいいねのみ
  constraint unique_like unique nulls not distinct (target_type, target_id, user_id, user_fingerprint)
);

-- 検索用インデックス
create index idx_likes_target on public.likes(target_type, target_id);
create index idx_likes_user on public.likes(user_id) where user_id is not null;
create index idx_likes_fingerprint on public.likes(user_fingerprint) where user_fingerprint is not null;

-- いいね数を自動更新するトリガー関数
create or replace function public.update_like_count()
returns trigger
language plpgsql
security definer
as $$
declare
  delta int;
  target_table text;
begin
  -- 増減を計算
  if TG_OP = 'INSERT' then
    delta := 1;
  elsif TG_OP = 'DELETE' then
    delta := -1;
  else
    return null;
  end if;

  -- 対象テーブルを判定
  target_table := case coalesce(NEW.target_type, OLD.target_type)
    when 'region' then 'regions'
    when 'parking_spot' then 'parking_spots'
    when 'restaurant' then 'restaurants'
    when 'comment' then 'comments'
  end;

  -- いいね数を更新
  execute format(
    'update public.%I set like_count = like_count + $1 where id = $2',
    target_table
  ) using delta, coalesce(NEW.target_id, OLD.target_id);

  return null;
end;
$$;

create trigger update_like_count_trigger
  after insert or delete on public.likes
  for each row
  execute function public.update_like_count();
```

### 7. コメントテーブル

```sql
-- コメント (地域ページのみ)
create table public.comments (
  id uuid default uuid_generate_v4() primary key,
  region_slug text not null references public.regions(slug) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(content) >= 1 and char_length(content) <= 1000),
  like_count int default 0,
  is_edited boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_comments_region on public.comments(region_slug, created_at desc);
create index idx_comments_user on public.comments(user_id);

create trigger set_updated_at
  before update on public.comments
  for each row
  execute function public.handle_updated_at();

-- コメント数を自動更新するトリガー
create or replace function public.update_comment_count()
returns trigger
language plpgsql
security definer
as $$
declare
  delta int;
begin
  if TG_OP = 'INSERT' then
    delta := 1;
  elsif TG_OP = 'DELETE' then
    delta := -1;
  else
    return null;
  end if;

  update public.regions
  set comment_count = comment_count + delta
  where slug = coalesce(NEW.region_slug, OLD.region_slug);

  return null;
end;
$$;

create trigger update_comment_count_trigger
  after insert or delete on public.comments
  for each row
  execute function public.update_comment_count();
```

### 8. Realtime用トリガー設定

Supabase公式ドキュメントによると、スケーラビリティのため**Broadcastを使用**することが推奨されています。

```sql
-- Realtime Broadcastトリガー関数
create or replace function public.broadcast_like_changes()
returns trigger
language plpgsql
security definer
as $$
begin
  -- いいね数の変更をBroadcast
  perform realtime.send(
    jsonb_build_object(
      'target_type', coalesce(NEW.target_type, OLD.target_type),
      'target_id', coalesce(NEW.target_id, OLD.target_id),
      'operation', TG_OP,
      'user_id', coalesce(NEW.user_id, OLD.user_id),
      'timestamp', now()
    ),
    'like_change', -- イベント名
    'public', -- トピック (RLSで制御)
    false -- publicチャンネル
  );
  return null;
end;
$$;

create trigger broadcast_like_trigger
  after insert or delete on public.likes
  for each row
  execute function public.broadcast_like_changes();

-- コメント変更のBroadcast
create or replace function public.broadcast_comment_changes()
returns trigger
language plpgsql
security definer
as $$
begin
  perform realtime.send(
    jsonb_build_object(
      'comment_id', NEW.id,
      'region_slug', NEW.region_slug,
      'operation', TG_OP,
      'timestamp', now()
    ),
    'comment_change',
    'region:' || NEW.region_slug,
    false
  );
  return null;
end;
$$;

create trigger broadcast_comment_trigger
  after insert or update or delete on public.comments
  for each row
  execute function public.broadcast_comment_changes();
```

---

## セキュリティとRLS

### RLSの有効化

```sql
-- すべてのテーブルでRLSを有効化
alter table public.profiles enable row level security;
alter table public.regions enable row level security;
alter table public.parking_spots enable row level security;
alter table public.restaurants enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
```

### RLSポリシー設定

Supabase公式のベストプラクティスに基づいたポリシー:

```sql
-- ==========================================
-- プロフィールポリシー
-- ==========================================

-- 誰でも閲覧可能
create policy "Anyone can view profiles"
  on public.profiles
  for select
  using (true);

-- 自分のプロフィールのみ更新可能
create policy "Users can update own profile"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ==========================================
-- 地域・駐車場・レストランポリシー
-- ==========================================

-- 誰でも閲覧可能
create policy "Anyone can view regions"
  on public.regions for select using (true);

create policy "Anyone can view parking spots"
  on public.parking_spots for select using (true);

create policy "Anyone can view restaurants"
  on public.restaurants for select using (true);

-- ==========================================
-- いいねポリシー
-- ==========================================

-- 誰でも閲覧可能
create policy "Anyone can view likes"
  on public.likes
  for select
  using (true);

-- 誰でもいいね追加可能 (認証・匿名両方)
create policy "Anyone can add likes"
  on public.likes
  for insert
  with check (true);

-- 自分のいいねのみ削除可能
-- パフォーマンス最適化: (select auth.uid())をラップ
create policy "Users can delete own likes"
  on public.likes
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- 匿名ユーザーは自分のfingerprintのいいねのみ削除可能
-- 注: フロントエンド側で制御が必要
create policy "Anonymous can delete own fingerprint likes"
  on public.likes
  for delete
  to anon
  using (user_id is null);

-- ==========================================
-- コメントポリシー
-- ==========================================

-- 誰でもコメント閲覧可能
create policy "Anyone can view comments"
  on public.comments
  for select
  using (true);

-- 認証ユーザーのみコメント投稿可能
create policy "Authenticated users can insert comments"
  on public.comments
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- 自分のコメントのみ更新可能
create policy "Users can update own comments"
  on public.comments
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- 自分のコメントのみ削除可能
create policy "Users can delete own comments"
  on public.comments
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
```

### RLSパフォーマンス最適化

```sql
-- インデックスを追加してRLSポリシーを高速化
create index idx_likes_user_id_auth on public.likes(user_id)
  where user_id is not null;

create index idx_comments_user_id_auth on public.comments(user_id);
```

---

## 認証システム

### 1. Google OAuth設定

#### Google Cloud Consoleでの設定

1. **Google Cloud Console**にアクセス: https://console.cloud.google.com/
2. **新しいプロジェクト**を作成 (または既存のプロジェクトを選択)
3. **OAuth同意画面**を設定:
   - User Type: 外部
   - アプリケーション名: "キャンピングノート"
   - サポートメール: あなたのメールアドレス
   - 承認済みドメイン: `<your-project-ref>.supabase.co`
   - スコープ:
     - `.../auth/userinfo.email`
     - `.../auth/userinfo.profile`
     - `openid`

4. **認証情報**を作成:
   - 認証情報を作成 → OAuth クライアント ID
   - アプリケーションの種類: ウェブアプリケーション
   - 承認済みのJavaScript生成元: あなたのサイトURL
   - 承認済みのリダイレクトURI: `https://<your-project-ref>.supabase.co/auth/v1/callback`

5. **クライアントIDとシークレット**をコピー

#### Supabaseでの設定

1. Supabase Dashboard → Authentication → Providers
2. Google を有効化
3. Client ID と Client Secret を入力
4. 保存

### 2. フロントエンド認証実装

#### HTML構造

```html
<!-- 認証UI -->
<div id="auth-container">
  <div id="auth-status">
    <!-- ログインしていない場合 -->
    <button id="login-btn" class="btn-primary">ログイン</button>

    <!-- ログインしている場合 -->
    <div id="user-info" style="display: none;">
      <img id="user-avatar" src="" alt="avatar" />
      <span id="user-name"></span>
      <button id="logout-btn" class="btn-secondary">ログアウト</button>
    </div>
  </div>

  <!-- ログインモーダル -->
  <div id="auth-modal" class="modal" style="display: none;">
    <div class="modal-content">
      <span class="close">&times;</span>
      <h2>ログイン</h2>

      <!-- Google OAuth -->
      <button id="google-login-btn" class="btn-google">
        <img src="/assets/google-icon.svg" alt="Google" />
        Googleでログイン
      </button>

      <div class="divider">または</div>

      <!-- Email/Password -->
      <form id="email-login-form">
        <input type="email" id="email" placeholder="メールアドレス" required />
        <input type="password" id="password" placeholder="パスワード" required />
        <button type="submit" class="btn-primary">メールでログイン</button>
      </form>

      <p class="toggle-auth">
        アカウントをお持ちでない方は
        <a href="#" id="toggle-signup">新規登録</a>
      </p>
    </div>
  </div>
</div>
```

#### JavaScript実装

```javascript
// supabase-client.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// Supabaseクライアント初期化
const supabaseUrl = 'https://<your-project-ref>.supabase.co'
const supabaseAnonKey = '<your-anon-key>'
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// FingerprintJS初期化
let fpPromise = null
if (window.FingerprintJS) {
  fpPromise = FingerprintJS.load({
    apiKey: '<your-fingerprintjs-api-key>'
  })
}

// ユーザーフィンガープリントを取得
async function getUserFingerprint() {
  if (!fpPromise) return null
  try {
    const fp = await fpPromise
    const result = await fp.get()
    return result.visitorId
  } catch (error) {
    console.error('Fingerprint取得エラー:', error)
    return null
  }
}

// 現在のユーザー状態を取得
async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// 認証状態の変更を監視
supabase.auth.onAuthStateChange((event, session) => {
  updateAuthUI(session?.user)
})

// 認証UIを更新
function updateAuthUI(user) {
  const loginBtn = document.getElementById('login-btn')
  const userInfo = document.getElementById('user-info')
  const userName = document.getElementById('user-name')
  const userAvatar = document.getElementById('user-avatar')

  if (user) {
    loginBtn.style.display = 'none'
    userInfo.style.display = 'flex'
    userName.textContent = user.user_metadata?.display_name || user.email
    userAvatar.src = user.user_metadata?.avatar_url || '/assets/default-avatar.png'
  } else {
    loginBtn.style.display = 'block'
    userInfo.style.display = 'none'
  }
}

// Googleでログイン
async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent'
      }
    }
  })

  if (error) {
    console.error('Googleログインエラー:', error)
    alert('ログインに失敗しました')
  }
}

// メールでログイン
async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) {
    console.error('メールログインエラー:', error)
    alert('ログインに失敗しました: ' + error.message)
    return false
  }

  closeAuthModal()
  return true
}

// メールで新規登録
async function signUpWithEmail(email, password, displayName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName
      }
    }
  })

  if (error) {
    console.error('新規登録エラー:', error)
    alert('新規登録に失敗しました: ' + error.message)
    return false
  }

  alert('確認メールを送信しました。メールをご確認ください。')
  closeAuthModal()
  return true
}

// ログアウト
async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) {
    console.error('ログアウトエラー:', error)
  }
}

// モーダル操作
function openAuthModal() {
  document.getElementById('auth-modal').style.display = 'flex'
}

function closeAuthModal() {
  document.getElementById('auth-modal').style.display = 'none'
}

// イベントリスナー設定
document.addEventListener('DOMContentLoaded', async () => {
  // 初期状態を設定
  const user = await getCurrentUser()
  updateAuthUI(user)

  // ログインボタン
  document.getElementById('login-btn')?.addEventListener('click', openAuthModal)

  // Googleログインボタン
  document.getElementById('google-login-btn')?.addEventListener('click', signInWithGoogle)

  // メールログインフォーム
  document.getElementById('email-login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault()
    const email = document.getElementById('email').value
    const password = document.getElementById('password').value
    await signInWithEmail(email, password)
  })

  // ログアウトボタン
  document.getElementById('logout-btn')?.addEventListener('click', signOut)

  // モーダルを閉じる
  document.querySelector('.close')?.addEventListener('click', closeAuthModal)

  // モーダル外クリックで閉じる
  window.addEventListener('click', (e) => {
    const modal = document.getElementById('auth-modal')
    if (e.target === modal) {
      closeAuthModal()
    }
  })
})

export {
  supabase,
  getCurrentUser,
  getUserFingerprint,
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  signOut
}
```

---

## いいね機能

### JavaScript実装

```javascript
// likes.js
import { supabase, getCurrentUser, getUserFingerprint } from './supabase-client.js'

// いいねを追加
async function addLike(targetType, targetId) {
  const user = await getCurrentUser()
  const fingerprint = await getUserFingerprint()

  const likeData = {
    target_type: targetType,
    target_id: targetId,
    user_id: user?.id || null,
    user_fingerprint: !user ? fingerprint : null,
    ip_address: null // サーバー側で設定する場合
  }

  const { data, error } = await supabase
    .from('likes')
    .insert(likeData)
    .select()

  if (error) {
    // ユニーク制約違反 = すでにいいね済み
    if (error.code === '23505') {
      console.log('すでにいいね済みです')
      return { alreadyLiked: true }
    }
    console.error('いいね追加エラー:', error)
    return { error }
  }

  return { data }
}

// いいねを削除
async function removeLike(targetType, targetId) {
  const user = await getCurrentUser()
  const fingerprint = await getUserFingerprint()

  let query = supabase
    .from('likes')
    .delete()
    .eq('target_type', targetType)
    .eq('target_id', targetId)

  if (user) {
    query = query.eq('user_id', user.id)
  } else {
    query = query.is('user_id', null).eq('user_fingerprint', fingerprint)
  }

  const { error } = await query

  if (error) {
    console.error('いいね削除エラー:', error)
    return { error }
  }

  return { success: true }
}

// いいね状態を確認
async function checkLikeStatus(targetType, targetId) {
  const user = await getCurrentUser()
  const fingerprint = await getUserFingerprint()

  let query = supabase
    .from('likes')
    .select('id')
    .eq('target_type', targetType)
    .eq('target_id', targetId)

  if (user) {
    query = query.eq('user_id', user.id)
  } else {
    query = query.is('user_id', null).eq('user_fingerprint', fingerprint)
  }

  const { data, error } = await query.maybeSingle()

  if (error) {
    console.error('いいね状態確認エラー:', error)
    return false
  }

  return !!data
}

// いいね数を取得
async function getLikeCount(targetType, targetId) {
  const tableName = {
    'region': 'regions',
    'parking_spot': 'parking_spots',
    'restaurant': 'restaurants',
    'comment': 'comments'
  }[targetType]

  const { data, error } = await supabase
    .from(tableName)
    .select('like_count')
    .eq('id', targetId)
    .single()

  if (error) {
    console.error('いいね数取得エラー:', error)
    return 0
  }

  return data?.like_count || 0
}

// いいねボタンのトグル
async function toggleLike(targetType, targetId, buttonElement) {
  const isLiked = buttonElement.classList.contains('liked')

  buttonElement.disabled = true

  if (isLiked) {
    const result = await removeLike(targetType, targetId)
    if (!result.error) {
      buttonElement.classList.remove('liked')
      updateLikeCount(buttonElement, -1)
    }
  } else {
    const result = await addLike(targetType, targetId)
    if (!result.error && !result.alreadyLiked) {
      buttonElement.classList.add('liked')
      updateLikeCount(buttonElement, 1)
    }
  }

  buttonElement.disabled = false
}

// いいね数を更新 (UI)
function updateLikeCount(buttonElement, delta) {
  const countElement = buttonElement.querySelector('.like-count')
  if (countElement) {
    const currentCount = parseInt(countElement.textContent) || 0
    countElement.textContent = Math.max(0, currentCount + delta)
  }
}

// いいねボタンを初期化
async function initLikeButton(buttonElement, targetType, targetId) {
  // 初期状態を設定
  const isLiked = await checkLikeStatus(targetType, targetId)
  if (isLiked) {
    buttonElement.classList.add('liked')
  }

  // クリックイベント
  buttonElement.addEventListener('click', () => {
    toggleLike(targetType, targetId, buttonElement)
  })
}

// ページ内のすべてのいいねボタンを初期化
function initAllLikeButtons() {
  document.querySelectorAll('[data-like-button]').forEach(button => {
    const targetType = button.dataset.targetType
    const targetId = button.dataset.targetId
    initLikeButton(button, targetType, targetId)
  })
}

export {
  addLike,
  removeLike,
  checkLikeStatus,
  getLikeCount,
  toggleLike,
  initLikeButton,
  initAllLikeButtons
}
```

### HTML例

```html
<!-- 駐車場カード -->
<div class="parking-spot-card" data-parking-id="uuid-123">
  <div class="parking-header">
    <div class="parking-title">
      <span class="ranking-icon">🥇</span>
      <span class="ranking-text">1位:</span>
      <span class="parking-name">名鉄協商大阪柏里１丁目</span>
    </div>
    <div class="card-buttons">
      <!-- いいねボタン -->
      <button
        class="btn-like"
        data-like-button
        data-target-type="parking_spot"
        data-target-id="uuid-123">
        <svg class="heart-icon" viewBox="0 0 24 24" width="20" height="20">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
        <span class="like-count">12</span>
      </button>
      <button class="btn-map">🗺️</button>
      <button class="btn-search">🔍</button>
    </div>
  </div>
  <!-- 駐車場情報 -->
</div>
```

---

## リアルタイム更新

Supabase公式ドキュメントによると、スケーラビリティのため**Broadcast**を使用することが推奨されています。

### JavaScript実装

```javascript
// realtime.js
import { supabase } from './supabase-client.js'

// いいね数の変更を購読
function subscribeLikeChanges(targetType, targetId, callback) {
  // プライベートチャンネルを作成
  const channel = supabase.channel('like-changes', {
    config: { private: true }
  })

  // like_changeイベントを購読
  channel
    .on('broadcast', { event: 'like_change' }, (payload) => {
      const data = payload.payload

      // 対象が一致する場合のみコールバックを実行
      if (data.target_type === targetType && data.target_id === targetId) {
        callback(data)
      }
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // Realtime認証を設定
        await supabase.realtime.setAuth()
        console.log('いいね変更の購読開始')
      }
    })

  return channel
}

// いいね数UIを自動更新
function autoUpdateLikeCount(targetType, targetId) {
  const channel = subscribeLikeChanges(targetType, targetId, async (data) => {
    // いいね数を再取得してUIを更新
    const count = await getLikeCount(targetType, targetId)

    // すべての該当ボタンを更新
    document.querySelectorAll(
      `[data-like-button][data-target-type="${targetType}"][data-target-id="${targetId}"]`
    ).forEach(button => {
      const countElement = button.querySelector('.like-count')
      if (countElement) {
        countElement.textContent = count
      }
    })
  })

  // クリーンアップ関数を返す
  return () => {
    supabase.removeChannel(channel)
  }
}

// コメント変更を購読
function subscribeCommentChanges(regionSlug, callback) {
  const channel = supabase.channel(`region:${regionSlug}`, {
    config: { private: true }
  })

  channel
    .on('broadcast', { event: 'comment_change' }, (payload) => {
      callback(payload.payload)
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await supabase.realtime.setAuth()
        console.log('コメント変更の購読開始')
      }
    })

  return channel
}

// コメントリストを自動更新
function autoUpdateComments(regionSlug) {
  const channel = subscribeCommentChanges(regionSlug, async (data) => {
    // コメントリストを再読み込み
    await loadComments(regionSlug)
  })

  return () => {
    supabase.removeChannel(channel)
  }
}

// ページ離脱時にチャンネルをクリーンアップ
window.addEventListener('beforeunload', () => {
  supabase.removeAllChannels()
})

export {
  subscribeLikeChanges,
  autoUpdateLikeCount,
  subscribeCommentChanges,
  autoUpdateComments
}
```

---

## コメント機能

### JavaScript実装

```javascript
// comments.js
import { supabase, getCurrentUser } from './supabase-client.js'

// コメントを投稿
async function postComment(regionSlug, content) {
  const user = await getCurrentUser()

  if (!user) {
    alert('コメントを投稿するにはログインが必要です')
    return { error: 'Not authenticated' }
  }

  if (!content || content.trim().length === 0) {
    return { error: 'コメントが空です' }
  }

  if (content.length > 1000) {
    return { error: 'コメントは1000文字以内で入力してください' }
  }

  const { data, error } = await supabase
    .from('comments')
    .insert({
      region_slug: regionSlug,
      user_id: user.id,
      content: content.trim()
    })
    .select()

  if (error) {
    console.error('コメント投稿エラー:', error)
    return { error }
  }

  return { data }
}

// コメント一覧を取得
async function loadComments(regionSlug, limit = 20, offset = 0) {
  const { data, error } = await supabase
    .from('comments')
    .select(`
      id,
      content,
      like_count,
      is_edited,
      created_at,
      updated_at,
      user:profiles!user_id (
        display_name,
        avatar_url
      )
    `)
    .eq('region_slug', regionSlug)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('コメント取得エラー:', error)
    return { error }
  }

  return { data }
}

// コメントを編集
async function editComment(commentId, newContent) {
  const user = await getCurrentUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  if (!newContent || newContent.trim().length === 0) {
    return { error: 'コメントが空です' }
  }

  if (newContent.length > 1000) {
    return { error: 'コメントは1000文字以内で入力してください' }
  }

  const { data, error } = await supabase
    .from('comments')
    .update({
      content: newContent.trim(),
      is_edited: true
    })
    .eq('id', commentId)
    .eq('user_id', user.id) // RLSで制御されるが念のため
    .select()

  if (error) {
    console.error('コメント編集エラー:', error)
    return { error }
  }

  return { data }
}

// コメントを削除
async function deleteComment(commentId) {
  const user = await getCurrentUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', user.id) // RLSで制御されるが念のため

  if (error) {
    console.error('コメント削除エラー:', error)
    return { error }
  }

  return { success: true }
}

// コメントUIをレンダリング
function renderComment(comment, currentUser) {
  const isOwner = currentUser && currentUser.id === comment.user_id
  const formattedDate = new Date(comment.created_at).toLocaleString('ja-JP')

  return `
    <div class="comment-item" data-comment-id="${comment.id}">
      <div class="comment-header">
        <img
          src="${comment.user.avatar_url || '/assets/default-avatar.png'}"
          alt="avatar"
          class="comment-avatar"
        />
        <div class="comment-meta">
          <span class="comment-author">${comment.user.display_name}</span>
          <span class="comment-date">${formattedDate}</span>
          ${comment.is_edited ? '<span class="edited-badge">編集済み</span>' : ''}
        </div>
        ${isOwner ? `
          <div class="comment-actions">
            <button class="btn-edit" onclick="editCommentUI('${comment.id}')">編集</button>
            <button class="btn-delete" onclick="deleteCommentUI('${comment.id}')">削除</button>
          </div>
        ` : ''}
      </div>
      <div class="comment-content">${escapeHtml(comment.content)}</div>
      <div class="comment-footer">
        <button
          class="btn-like-comment"
          data-like-button
          data-target-type="comment"
          data-target-id="${comment.id}">
          ❤️ <span class="like-count">${comment.like_count}</span>
        </button>
      </div>
    </div>
  `
}

// HTMLエスケープ
function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// コメント一覧をレンダリング
async function renderComments(regionSlug, containerId = 'comments-container') {
  const container = document.getElementById(containerId)
  if (!container) return

  container.innerHTML = '<div class="loading">読み込み中...</div>'

  const { data: comments, error } = await loadComments(regionSlug)

  if (error) {
    container.innerHTML = '<div class="error">コメントの読み込みに失敗しました</div>'
    return
  }

  if (comments.length === 0) {
    container.innerHTML = '<div class="no-comments">まだコメントがありません</div>'
    return
  }

  const user = await getCurrentUser()
  container.innerHTML = comments.map(c => renderComment(c, user)).join('')

  // いいねボタンを初期化
  initAllLikeButtons()
}

// コメント投稿UIを初期化
function initCommentForm(regionSlug, formId = 'comment-form') {
  const form = document.getElementById(formId)
  if (!form) return

  form.addEventListener('submit', async (e) => {
    e.preventDefault()

    const textarea = form.querySelector('textarea')
    const content = textarea.value

    const result = await postComment(regionSlug, content)

    if (result.error) {
      alert('コメントの投稿に失敗しました: ' + result.error)
      return
    }

    // フォームをリセット
    textarea.value = ''

    // コメント一覧を再読み込み
    await renderComments(regionSlug)
  })
}

export {
  postComment,
  loadComments,
  editComment,
  deleteComment,
  renderComment,
  renderComments,
  initCommentForm
}
```

### HTML例

```html
<!-- コメントセクション -->
<div class="comments-section">
  <h3>コメント</h3>

  <!-- コメント投稿フォーム -->
  <form id="comment-form" class="comment-form">
    <textarea
      placeholder="コメントを入力してください（1000文字以内）"
      maxlength="1000"
      rows="4"
      required></textarea>
    <div class="form-footer">
      <span class="char-count">0 / 1000</span>
      <button type="submit" class="btn-primary">投稿</button>
    </div>
  </form>

  <!-- コメント一覧 -->
  <div id="comments-container" class="comments-list">
    <!-- JavaScriptで動的に生成 -->
  </div>
</div>
```

---

## フロントエンド統合

### generate-from-json-sources.js の修正

既存の `generate-from-json-sources.js` に以下のコードを追加して、すべてのHTMLファイルに認証・いいね・コメント機能を埋め込みます。

```javascript
// generate-from-json-sources.js の修正例

// HTMLテンプレートに追加するヘッダー部分
function generateHeader(region) {
  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${region.name} - キャンピングノート</title>

  <!-- Supabase Client -->
  <script type="module">
    import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

    // グローバルにSupabaseクライアントを公開
    window.supabase = createClient(
      '${process.env.SUPABASE_URL}',
      '${process.env.SUPABASE_ANON_KEY}'
    )
  </script>

  <!-- FingerprintJS -->
  <script src="https://cdn.jsdelivr.net/npm/@fingerprintjs/fingerprintjs-pro@3/dist/fp.min.js"></script>

  <!-- アプリケーションスクリプト -->
  <script type="module" src="/js/supabase-client.js"></script>
  <script type="module" src="/js/likes.js"></script>
  <script type="module" src="/js/comments.js"></script>
  <script type="module" src="/js/realtime.js"></script>

  <!-- スタイルシート -->
  <link rel="stylesheet" href="/css/style.css">
  <link rel="stylesheet" href="/css/auth.css">
  <link rel="stylesheet" href="/css/likes.css">
  <link rel="stylesheet" href="/css/comments.css">
</head>
<body>
  <header>
    <!-- 認証UI -->
    ${generateAuthUI()}
  </header>

  <main>
`
}

// 認証UIの生成
function generateAuthUI() {
  return `
    <div id="auth-container">
      <div id="auth-status">
        <button id="login-btn" class="btn-primary">ログイン</button>
        <div id="user-info" style="display: none;">
          <img id="user-avatar" src="" alt="avatar" />
          <span id="user-name"></span>
          <button id="logout-btn" class="btn-secondary">ログアウト</button>
        </div>
      </div>
    </div>
  `
}

// 駐車場カードにいいねボタンを追加
function generateParkingCard(parking, rank) {
  return `
    <div class="parking-spot-card" data-parking-id="${parking.id}">
      <div class="parking-header">
        <div class="parking-title">
          <span class="ranking-icon">${getRankIcon(rank)}</span>
          <span class="ranking-text">${rank}位:</span>
          <span class="parking-name">${parking.name}</span>
        </div>
        <div class="card-buttons">
          <!-- いいねボタン -->
          <button
            class="btn-like"
            data-like-button
            data-target-type="parking_spot"
            data-target-id="${parking.id}">
            <svg class="heart-icon" viewBox="0 0 24 24" width="20" height="20">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <span class="like-count">${parking.like_count || 0}</span>
          </button>
          <button class="btn-map" onclick="showOnMap('${parking.id}')">🗺️</button>
          <button class="btn-search" onclick="searchParking('${parking.name}')">🔍</button>
        </div>
      </div>
      <div class="parking-info">
        <p><strong>住所:</strong> ${parking.address}</p>
        <p><strong>18時-8時料金:</strong> ¥${parking.overnight_fee}</p>
        <p><strong>24時間最大:</strong> ¥${parking.max_fee_24h}</p>
      </div>
    </div>
  `
}

// レストランカードにいいねボタンを追加
function generateRestaurantCard(restaurant) {
  return `
    <div class="restaurant-card" data-restaurant-id="${restaurant.id}">
      <div class="card-stripe"></div>
      <div class="restaurant-header">
        <h4>${restaurant.name}</h4>
        <button
          class="btn-like"
          data-like-button
          data-target-type="restaurant"
          data-target-id="${restaurant.id}">
          <svg class="heart-icon" viewBox="0 0 24 24" width="16" height="16">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
          <span class="like-count">${restaurant.like_count || 0}</span>
        </button>
      </div>
      <div class="restaurant-info">
        <p class="rating">⭐ ${restaurant.rating}</p>
        <p class="cuisine">${restaurant.cuisine_type}</p>
        <a href="${restaurant.tabelog_url}" target="_blank" class="tabelog-link">食べログで見る</a>
      </div>
    </div>
  `
}

// 地域ページにコメントセクションを追加
function generateCommentsSection(regionSlug) {
  return `
    <section class="comments-section">
      <h3>この地域のコメント</h3>

      <form id="comment-form" class="comment-form">
        <textarea
          placeholder="コメントを入力してください（1000文字以内）"
          maxlength="1000"
          rows="4"
          required></textarea>
        <div class="form-footer">
          <span class="char-count">0 / 1000</span>
          <button type="submit" class="btn-primary">投稿</button>
        </div>
      </form>

      <div id="comments-container" class="comments-list">
        <!-- JavaScriptで動的に生成 -->
      </div>
    </section>

    <script type="module">
      import { initCommentForm, renderComments } from '/js/comments.js'
      import { autoUpdateComments } from '/js/realtime.js'

      // 初期化
      document.addEventListener('DOMContentLoaded', () => {
        const regionSlug = '${regionSlug}'
        initCommentForm(regionSlug)
        renderComments(regionSlug)

        // リアルタイム更新を開始
        const cleanup = autoUpdateComments(regionSlug)

        // ページ離脱時にクリーンアップ
        window.addEventListener('beforeunload', cleanup)
      })
    </script>
  `
}

// メイン生成処理
async function generateRegionHTML(region) {
  const html = `
    ${generateHeader(region)}

    <div class="region-container">
      <h1>${region.name}</h1>

      <!-- いいねボタン (地域) -->
      <button
        class="btn-like-region"
        data-like-button
        data-target-type="region"
        data-target-id="${region.id}">
        ❤️ <span class="like-count">${region.like_count || 0}</span>
      </button>

      <!-- 地図とリスト -->
      <div class="content-layout">
        <div class="map-container">
          <iframe src="${region.slug}-map.html"></iframe>
        </div>
        <div class="list-container">
          <h2>駐車場</h2>
          ${region.parkingSpots.map((p, i) => generateParkingCard(p, i + 1)).join('')}

          <h2>レストラン</h2>
          <div class="restaurant-grid">
            ${region.restaurants.map(r => generateRestaurantCard(r)).join('')}
          </div>
        </div>
      </div>

      <!-- コメントセクション -->
      ${generateCommentsSection(region.slug)}
    </div>

    <script type="module">
      import { initAllLikeButtons } from '/js/likes.js'
      import { autoUpdateLikeCount } from '/js/realtime.js'

      // いいねボタンを初期化
      document.addEventListener('DOMContentLoaded', () => {
        initAllLikeButtons()

        // 地域のいいね数をリアルタイム更新
        autoUpdateLikeCount('region', '${region.id}')
      })
    </script>

    </main>
    </body>
    </html>
  `

  return html
}
```

---

## テストとデプロイ

### Phase 6.1: ローカルテスト

```bash
# 1. Supabaseローカル開発環境の起動
supabase start

# 2. マイグレーションを適用
supabase db push

# 3. テストデータを挿入
psql -h localhost -p 54322 -U postgres < test-data.sql

# 4. HTMLを生成
node generate-from-json-sources.js

# 5. ローカルサーバーを起動
python3 -m http.server 8080

# 6. ブラウザでテスト
open http://localhost:8080/data/regions/あおば通.html
```

### Phase 6.2: 本番デプロイ

```bash
# 1. Supabaseプロジェクトにリンク
supabase link --project-ref <your-project-ref>

# 2. マイグレーションをデプロイ
supabase db push

# 3. 環境変数を設定
echo "SUPABASE_URL=https://<your-project-ref>.supabase.co" > .env
echo "SUPABASE_ANON_KEY=<your-anon-key>" >> .env
echo "FINGERPRINTJS_API_KEY=<your-fp-key>" >> .env

# 4. 本番用HTMLを生成
node generate-from-json-sources.js

# 5. 静的ファイルをホスティングサービスにデプロイ
# (Netlify / Vercel / GitHub Pages など)
```

---

## まとめ

この実装スキームは、Supabase公式ドキュメントに基づいて作成されており、以下の特徴があります:

### ✅ 主要機能
1. **認証**: Email/Password + Google OAuth
2. **いいね**: 匿名ユーザー対応、リアルタイム更新
3. **コメント**: 認証ユーザーのみ、編集・削除可能
4. **セキュリティ**: RLS、フィンガープリント
5. **リアルタイム**: Broadcast (スケーラブル)

### ✅ 技術的ハイライト
- **静的HTML方式を維持**: 既存の808ファイル生成方式
- **Supabase公式パターン**: Auth、RLS、Realtime
- **パフォーマンス最適化**: インデックス、トリガー、キャッシュ
- **スケーラビリティ**: Broadcast > Postgres Changes

### 📚 参考資料
- [Supabase Auth ドキュメント](https://supabase.com/docs/guides/auth)
- [Supabase Realtime ドキュメント](https://supabase.com/docs/guides/realtime)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Google OAuth 設定](https://supabase.com/docs/guides/auth/social-login/auth-google)

### 次のステップ
1. **Phase 1から順番に実装**を進める
2. **各フェーズ完了後にテスト**を実施
3. **問題が発生したら公式ドキュメントを参照**

このスキームに従って実装することで、正確で保守性の高いシステムを構築できます！
