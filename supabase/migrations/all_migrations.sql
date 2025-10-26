-- マイグレーション 001: 拡張機能の有効化
-- 説明: 必要なPostgreSQL拡張機能を有効化

-- UUID生成用
create extension if not exists "uuid-ossp"
  with schema extensions;

-- 地理空間データ用 (駐車場・レストランの位置情報)
create extension if not exists postgis
  with schema extensions;

-- コメント
comment on extension "uuid-ossp" is 'UUID生成関数を提供';
comment on extension postgis is '地理空間データ処理を提供';
-- マイグレーション 002: 基本スキーマの作成
-- 説明: プロフィール、地域、駐車場、レストラン、いいね、コメントテーブルを作成

-- ==========================================
-- 1. ヘルパー関数: updated_at自動更新
-- ==========================================
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

comment on function public.handle_updated_at() is 'レコード更新時にupdated_atを自動更新';

-- ==========================================
-- 2. プロフィールテーブル
-- ==========================================
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

comment on table public.profiles is 'ユーザープロフィール情報';
comment on column public.profiles.id is 'auth.usersテーブルと連携するユーザーID';
comment on column public.profiles.display_name is 'ユーザー表示名';
comment on column public.profiles.avatar_url is 'アバター画像URL';

-- トリガー: updated_at自動更新
create trigger set_profiles_updated_at
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
    coalesce(
      new.raw_user_meta_data->>'display_name',
      split_part(new.email, '@', 1)
    )
  );
  return new;
end;
$$;

comment on function public.handle_new_user() is '新規ユーザー作成時にプロフィールを自動生成';

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ==========================================
-- 3. 地域マスタテーブル
-- ==========================================
create table public.regions (
  id uuid default extensions.uuid_generate_v4() primary key,
  slug text unique not null,
  name text not null,
  name_en text,
  lat double precision not null,
  lng double precision not null,
  min_lat double precision,
  max_lat double precision,
  min_lng double precision,
  max_lng double precision,
  description text,
  like_count int default 0 not null,
  comment_count int default 0 not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,

  constraint regions_slug_check check (length(slug) > 0),
  constraint regions_name_check check (length(name) > 0),
  constraint regions_lat_check check (lat >= -90 and lat <= 90),
  constraint regions_lng_check check (lng >= -180 and lng <= 180)
);

comment on table public.regions is '地域マスタ（808地域）';
comment on column public.regions.slug is 'URLで使用する一意識別子（例: あおば通）';
comment on column public.regions.name is '地域名';
comment on column public.regions.like_count is 'いいね数（キャッシュ）';
comment on column public.regions.comment_count is 'コメント数（キャッシュ）';

-- インデックス
create index idx_regions_slug on public.regions(slug);
create index idx_regions_location on public.regions using gist(
  extensions.st_makepoint(lng, lat)::geography
);

-- トリガー
create trigger set_regions_updated_at
  before update on public.regions
  for each row
  execute function public.handle_updated_at();

-- ==========================================
-- 4. 駐車場テーブル
-- ==========================================
create table public.parking_spots (
  id uuid default extensions.uuid_generate_v4() primary key,
  region_slug text references public.regions(slug) on delete cascade,
  name text not null,
  lat double precision not null,
  lng double precision not null,
  address text,
  overnight_fee int,
  hourly_rate int,
  max_fee_24h int,
  facilities jsonb default '{}'::jsonb,
  like_count int default 0 not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,

  constraint parking_spots_name_check check (length(name) > 0),
  constraint parking_spots_lat_check check (lat >= -90 and lat <= 90),
  constraint parking_spots_lng_check check (lng >= -180 and lng <= 180),
  constraint parking_spots_overnight_fee_check check (overnight_fee is null or overnight_fee >= 0)
);

comment on table public.parking_spots is '駐車場情報';
comment on column public.parking_spots.region_slug is '所属する地域のslug';
comment on column public.parking_spots.overnight_fee is '18:00-8:00の料金';
comment on column public.parking_spots.facilities is '施設情報（コンビニ、トイレなど）';

-- インデックス
create index idx_parking_region on public.parking_spots(region_slug);
create index idx_parking_location on public.parking_spots using gist(
  extensions.st_makepoint(lng, lat)::geography
);
create index idx_parking_overnight_fee on public.parking_spots(overnight_fee) where overnight_fee is not null;

-- トリガー
create trigger set_parking_spots_updated_at
  before update on public.parking_spots
  for each row
  execute function public.handle_updated_at();

-- ==========================================
-- 5. レストランテーブル
-- ==========================================
create table public.restaurants (
  id uuid default extensions.uuid_generate_v4() primary key,
  region_slug text references public.regions(slug) on delete cascade,
  name text not null,
  lat double precision not null,
  lng double precision not null,
  rating numeric(2,1),
  cuisine_type text,
  address text,
  tabelog_url text,
  like_count int default 0 not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,

  constraint restaurants_name_check check (length(name) > 0),
  constraint restaurants_lat_check check (lat >= -90 and lat <= 90),
  constraint restaurants_lng_check check (lng >= -180 and lng <= 180),
  constraint restaurants_rating_check check (rating is null or (rating >= 0 and rating <= 5))
);

comment on table public.restaurants is 'レストラン情報';
comment on column public.restaurants.rating is '食べログ評価';
comment on column public.restaurants.tabelog_url is '食べログURL';

-- インデックス
create index idx_restaurant_region on public.restaurants(region_slug);
create index idx_restaurant_location on public.restaurants using gist(
  extensions.st_makepoint(lng, lat)::geography
);
create index idx_restaurant_rating on public.restaurants(rating) where rating is not null;

-- トリガー
create trigger set_restaurants_updated_at
  before update on public.restaurants
  for each row
  execute function public.handle_updated_at();

-- ==========================================
-- 6. いいねテーブル（ポリモーフィック）
-- ==========================================
create table public.likes (
  id uuid default extensions.uuid_generate_v4() primary key,
  target_type text not null,
  target_id uuid not null,
  user_id uuid references auth.users(id) on delete cascade,
  user_fingerprint text,
  ip_address inet,
  created_at timestamptz default now() not null,

  constraint likes_target_type_check check (
    target_type in ('region', 'parking_spot', 'restaurant', 'comment')
  ),
  constraint likes_user_check check (
    (user_id is not null) or (user_fingerprint is not null)
  ),
  constraint unique_like unique nulls not distinct (
    target_type, target_id, user_id, user_fingerprint
  )
);

comment on table public.likes is 'いいね統合テーブル（ポリモーフィック）';
comment on column public.likes.target_type is 'いいね対象のタイプ';
comment on column public.likes.target_id is 'いいね対象のID';
comment on column public.likes.user_id is '認証ユーザーID（認証済みの場合）';
comment on column public.likes.user_fingerprint is 'ブラウザフィンガープリント（匿名の場合）';

-- インデックス
create index idx_likes_target on public.likes(target_type, target_id);
create index idx_likes_user on public.likes(user_id) where user_id is not null;
create index idx_likes_fingerprint on public.likes(user_fingerprint) where user_fingerprint is not null;

-- ==========================================
-- 7. コメントテーブル
-- ==========================================
create table public.comments (
  id uuid default extensions.uuid_generate_v4() primary key,
  region_slug text not null references public.regions(slug) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  like_count int default 0 not null,
  is_edited boolean default false not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,

  constraint comments_content_check check (
    char_length(content) >= 1 and char_length(content) <= 1000
  )
);

comment on table public.comments is 'コメント（地域ページのみ）';
comment on column public.comments.content is 'コメント内容（1-1000文字）';
comment on column public.comments.is_edited is '編集済みフラグ';

-- インデックス
create index idx_comments_region on public.comments(region_slug, created_at desc);
create index idx_comments_user on public.comments(user_id);

-- トリガー
create trigger set_comments_updated_at
  before update on public.comments
  for each row
  execute function public.handle_updated_at();
-- マイグレーション 003: トリガー関数の作成
-- 説明: いいね数・コメント数の自動更新とRealtime Broadcast

-- ==========================================
-- 1. いいね数を自動更新するトリガー関数
-- ==========================================
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
    'update public.%I set like_count = greatest(0, like_count + $1) where id = $2',
    target_table
  ) using delta, coalesce(NEW.target_id, OLD.target_id);

  return null;
end;
$$;

comment on function public.update_like_count() is 'いいね追加/削除時に対象のlike_countを自動更新';

-- トリガーを作成
create trigger update_like_count_trigger
  after insert or delete on public.likes
  for each row
  execute function public.update_like_count();

-- ==========================================
-- 2. コメント数を自動更新するトリガー関数
-- ==========================================
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
  set comment_count = greatest(0, comment_count + delta)
  where slug = coalesce(NEW.region_slug, OLD.region_slug);

  return null;
end;
$$;

comment on function public.update_comment_count() is 'コメント追加/削除時にregions.comment_countを自動更新';

-- トリガーを作成
create trigger update_comment_count_trigger
  after insert or delete on public.comments
  for each row
  execute function public.update_comment_count();

-- ==========================================
-- 3. Realtime Broadcast: いいね変更
-- ==========================================
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
    'public', -- トピック
    false -- publicチャンネル
  );
  return null;
end;
$$;

comment on function public.broadcast_like_changes() is 'いいね変更をRealtimeでブロードキャスト';

-- トリガーを作成
create trigger broadcast_like_trigger
  after insert or delete on public.likes
  for each row
  execute function public.broadcast_like_changes();

-- ==========================================
-- 4. Realtime Broadcast: コメント変更
-- ==========================================
create or replace function public.broadcast_comment_changes()
returns trigger
language plpgsql
security definer
as $$
begin
  perform realtime.send(
    jsonb_build_object(
      'comment_id', coalesce(NEW.id, OLD.id),
      'region_slug', coalesce(NEW.region_slug, OLD.region_slug),
      'operation', TG_OP,
      'timestamp', now()
    ),
    'comment_change', -- イベント名
    'region:' || coalesce(NEW.region_slug, OLD.region_slug), -- トピック
    false -- publicチャンネル
  );
  return null;
end;
$$;

comment on function public.broadcast_comment_changes() is 'コメント変更をRealtimeでブロードキャスト';

-- トリガーを作成
create trigger broadcast_comment_trigger
  after insert or update or delete on public.comments
  for each row
  execute function public.broadcast_comment_changes();
-- マイグレーション 004: Row Level Security (RLS) の設定
-- 説明: すべてのテーブルでRLSを有効化し、ポリシーを設定

-- ==========================================
-- 1. RLSを有効化
-- ==========================================
alter table public.profiles enable row level security;
alter table public.regions enable row level security;
alter table public.parking_spots enable row level security;
alter table public.restaurants enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;

-- ==========================================
-- 2. プロフィールポリシー
-- ==========================================

-- 誰でも閲覧可能
create policy "Anyone can view profiles"
  on public.profiles
  for select
  using (true);

comment on policy "Anyone can view profiles" on public.profiles is
  '誰でもプロフィールを閲覧可能';

-- 自分のプロフィールのみ更新可能
create policy "Users can update own profile"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

comment on policy "Users can update own profile" on public.profiles is
  '認証ユーザーは自分のプロフィールのみ更新可能';

-- ==========================================
-- 3. 地域・駐車場・レストランポリシー
-- ==========================================

-- 誰でも閲覧可能
create policy "Anyone can view regions"
  on public.regions
  for select
  using (true);

create policy "Anyone can view parking spots"
  on public.parking_spots
  for select
  using (true);

create policy "Anyone can view restaurants"
  on public.restaurants
  for select
  using (true);

comment on policy "Anyone can view regions" on public.regions is
  '誰でも地域を閲覧可能';
comment on policy "Anyone can view parking spots" on public.parking_spots is
  '誰でも駐車場を閲覧可能';
comment on policy "Anyone can view restaurants" on public.restaurants is
  '誰でもレストランを閲覧可能';

-- ==========================================
-- 4. いいねポリシー
-- ==========================================

-- 誰でも閲覧可能
create policy "Anyone can view likes"
  on public.likes
  for select
  using (true);

comment on policy "Anyone can view likes" on public.likes is
  '誰でもいいねを閲覧可能';

-- 誰でもいいね追加可能（認証・匿名両方）
create policy "Anyone can add likes"
  on public.likes
  for insert
  with check (true);

comment on policy "Anyone can add likes" on public.likes is
  '認証ユーザーも匿名ユーザーもいいねを追加可能';

-- 認証ユーザーは自分のいいねのみ削除可能
create policy "Users can delete own likes"
  on public.likes
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

comment on policy "Users can delete own likes" on public.likes is
  '認証ユーザーは自分のいいねのみ削除可能';

-- 匿名ユーザーは自分のfingerprintのいいねのみ削除可能
create policy "Anonymous can delete own fingerprint likes"
  on public.likes
  for delete
  to anon
  using (user_id is null);

comment on policy "Anonymous can delete own fingerprint likes" on public.likes is
  '匿名ユーザーはuser_idがnullのいいねを削除可能（fingerprintはフロントエンドで制御）';

-- ==========================================
-- 5. コメントポリシー
-- ==========================================

-- 誰でもコメント閲覧可能
create policy "Anyone can view comments"
  on public.comments
  for select
  using (true);

comment on policy "Anyone can view comments" on public.comments is
  '誰でもコメントを閲覧可能';

-- 認証ユーザーのみコメント投稿可能
create policy "Authenticated users can insert comments"
  on public.comments
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

comment on policy "Authenticated users can insert comments" on public.comments is
  '認証ユーザーのみコメントを投稿可能';

-- 自分のコメントのみ更新可能
create policy "Users can update own comments"
  on public.comments
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

comment on policy "Users can update own comments" on public.comments is
  '認証ユーザーは自分のコメントのみ更新可能';

-- 自分のコメントのみ削除可能
create policy "Users can delete own comments"
  on public.comments
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

comment on policy "Users can delete own comments" on public.comments is
  '認証ユーザーは自分のコメントのみ削除可能';

-- ==========================================
-- 6. RLSパフォーマンス最適化用インデックス
-- ==========================================

-- いいねテーブル: user_idでフィルタリング高速化
create index idx_likes_user_id_auth on public.likes(user_id)
  where user_id is not null;

-- コメントテーブル: user_idでフィルタリング高速化
create index idx_comments_user_id_auth on public.comments(user_id);

comment on index idx_likes_user_id_auth is 'RLSポリシーによるuser_idフィルタリングを高速化';
comment on index idx_comments_user_id_auth is 'RLSポリシーによるuser_idフィルタリングを高速化';
