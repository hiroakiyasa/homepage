-- マイグレーション 002-004: 地域専用スキーマ（シンプル版）
-- PostGISインデックスを削除し、通常のインデックスのみ使用

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
-- 2. 地域マスタテーブル
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
comment on column public.regions.slug is 'URLで使用する一意識別子（例: aoba-street）';
comment on column public.regions.name is '地域名（例: あおば通）';
comment on column public.regions.like_count is 'いいね数（キャッシュ）';
comment on column public.regions.comment_count is 'コメント数（キャッシュ）';

-- インデックス（PostGISなし）
create index idx_regions_slug on public.regions(slug);
create index idx_regions_lat on public.regions(lat);
create index idx_regions_lng on public.regions(lng);

-- トリガー
create trigger set_regions_updated_at
  before update on public.regions
  for each row
  execute function public.handle_updated_at();

-- ==========================================
-- 3. レストランテーブル
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

-- インデックス（PostGISなし）
create index idx_restaurant_region on public.restaurants(region_slug);
create index idx_restaurant_lat on public.restaurants(lat);
create index idx_restaurant_lng on public.restaurants(lng);
create index idx_restaurant_rating on public.restaurants(rating) where rating is not null;

-- トリガー
create trigger set_restaurants_updated_at
  before update on public.restaurants
  for each row
  execute function public.handle_updated_at();

-- ==========================================
-- 4. 地域いいねテーブル
-- ==========================================
create table public.region_likes (
  id uuid default extensions.uuid_generate_v4() primary key,
  region_slug text not null references public.regions(slug) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  user_fingerprint text,
  ip_address inet,
  created_at timestamptz default now() not null,

  constraint region_likes_user_check check (
    (user_id is not null) or (user_fingerprint is not null)
  ),
  constraint unique_region_like unique nulls not distinct (
    region_slug, user_id, user_fingerprint
  )
);

comment on table public.region_likes is '地域へのいいね';
comment on column public.region_likes.user_id is '認証ユーザーID（認証済みの場合）';
comment on column public.region_likes.user_fingerprint is 'ブラウザフィンガープリント（匿名の場合）';

-- インデックス
create index idx_region_likes_slug on public.region_likes(region_slug);
create index idx_region_likes_user on public.region_likes(user_id) where user_id is not null;
create index idx_region_likes_fingerprint on public.region_likes(user_fingerprint) where user_fingerprint is not null;

-- ==========================================
-- 5. 地域コメントテーブル
-- ==========================================
create table public.region_comments (
  id uuid default extensions.uuid_generate_v4() primary key,
  region_slug text not null references public.regions(slug) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  like_count int default 0 not null,
  is_edited boolean default false not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,

  constraint region_comments_content_check check (
    char_length(content) >= 1 and char_length(content) <= 1000
  )
);

comment on table public.region_comments is '地域へのコメント（会員のみ）';
comment on column public.region_comments.content is 'コメント内容（1-1000文字）';
comment on column public.region_comments.is_edited is '編集済みフラグ';

-- インデックス
create index idx_region_comments_slug on public.region_comments(region_slug, created_at desc);
create index idx_region_comments_user on public.region_comments(user_id);

-- トリガー
create trigger set_region_comments_updated_at
  before update on public.region_comments
  for each row
  execute function public.handle_updated_at();

-- ==========================================
-- 6. コメントいいねテーブル
-- ==========================================
create table public.comment_likes (
  id uuid default extensions.uuid_generate_v4() primary key,
  comment_id uuid not null references public.region_comments(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  user_fingerprint text,
  created_at timestamptz default now() not null,

  constraint comment_likes_user_check check (
    (user_id is not null) or (user_fingerprint is not null)
  ),
  constraint unique_comment_like unique nulls not distinct (
    comment_id, user_id, user_fingerprint
  )
);

comment on table public.comment_likes is 'コメントへのいいね';

-- インデックス
create index idx_comment_likes_comment on public.comment_likes(comment_id);
create index idx_comment_likes_user on public.comment_likes(user_id) where user_id is not null;

-- ==========================================
-- トリガー関数: いいね数・コメント数の自動更新
-- ==========================================

-- 地域いいね数を自動更新
create or replace function public.update_region_like_count()
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
  set like_count = greatest(0, like_count + delta)
  where slug = coalesce(NEW.region_slug, OLD.region_slug);

  return null;
end;
$$;

create trigger update_region_like_count_trigger
  after insert or delete on public.region_likes
  for each row
  execute function public.update_region_like_count();

-- 地域コメント数を自動更新
create or replace function public.update_region_comment_count()
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

create trigger update_region_comment_count_trigger
  after insert or delete on public.region_comments
  for each row
  execute function public.update_region_comment_count();

-- コメントいいね数を自動更新
create or replace function public.update_comment_like_count()
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

  update public.region_comments
  set like_count = greatest(0, like_count + delta)
  where id = coalesce(NEW.comment_id, OLD.comment_id);

  return null;
end;
$$;

create trigger update_comment_like_count_trigger
  after insert or delete on public.comment_likes
  for each row
  execute function public.update_comment_like_count();

-- Realtime Broadcast: 地域いいね変更
create or replace function public.broadcast_region_like_changes()
returns trigger
language plpgsql
security definer
as $$
begin
  perform realtime.send(
    jsonb_build_object(
      'region_slug', coalesce(NEW.region_slug, OLD.region_slug),
      'operation', TG_OP,
      'user_id', coalesce(NEW.user_id, OLD.user_id),
      'timestamp', now()
    ),
    'region_like_change',
    'region:' || coalesce(NEW.region_slug, OLD.region_slug),
    false
  );
  return null;
end;
$$;

create trigger broadcast_region_like_trigger
  after insert or delete on public.region_likes
  for each row
  execute function public.broadcast_region_like_changes();

-- Realtime Broadcast: 地域コメント変更
create or replace function public.broadcast_region_comment_changes()
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
    'region_comment_change',
    'region:' || coalesce(NEW.region_slug, OLD.region_slug),
    false
  );
  return null;
end;
$$;

create trigger broadcast_region_comment_trigger
  after insert or update or delete on public.region_comments
  for each row
  execute function public.broadcast_region_comment_changes();

-- ==========================================
-- RLS有効化とポリシー設定
-- ==========================================

alter table public.regions enable row level security;
alter table public.restaurants enable row level security;
alter table public.region_likes enable row level security;
alter table public.region_comments enable row level security;
alter table public.comment_likes enable row level security;

-- 地域・レストランポリシー
create policy "Anyone can view regions" on public.regions for select using (true);
create policy "Anyone can view restaurants" on public.restaurants for select using (true);

-- 地域いいねポリシー
create policy "Anyone can view region likes" on public.region_likes for select using (true);
create policy "Anyone can add region likes" on public.region_likes for insert with check (true);
create policy "Users can delete own region likes" on public.region_likes for delete to authenticated using ((select auth.uid()) = user_id);
create policy "Anonymous can delete own fingerprint region likes" on public.region_likes for delete to anon using (user_id is null);

-- 地域コメントポリシー
create policy "Anyone can view region comments" on public.region_comments for select using (true);
create policy "Authenticated users can insert region comments" on public.region_comments for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update own region comments" on public.region_comments for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete own region comments" on public.region_comments for delete to authenticated using ((select auth.uid()) = user_id);

-- コメントいいねポリシー
create policy "Anyone can view comment likes" on public.comment_likes for select using (true);
create policy "Anyone can add comment likes" on public.comment_likes for insert with check (true);
create policy "Users can delete own comment likes" on public.comment_likes for delete to authenticated using ((select auth.uid()) = user_id);
create policy "Anonymous can delete own fingerprint comment likes" on public.comment_likes for delete to anon using (user_id is null);

-- RLSパフォーマンス最適化用インデックス
create index idx_region_likes_user_id_auth on public.region_likes(user_id) where user_id is not null;
create index idx_region_comments_user_id_auth on public.region_comments(user_id);
create index idx_comment_likes_user_id_auth on public.comment_likes(user_id) where user_id is not null;
