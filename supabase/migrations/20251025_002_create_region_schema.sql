-- マイグレーション 002: 地域専用スキーマの作成
-- 説明: 地域、レストラン、地域いいね、地域コメントテーブルを作成
-- 既存のuser_profiles, parking_spotsを活用

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

-- インデックス
create index idx_regions_slug on public.regions(slug);
create index idx_regions_location on public.regions using gist(
  st_makepoint(lng, lat)::geography
);

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

-- インデックス
create index idx_restaurant_region on public.restaurants(region_slug);
create index idx_restaurant_location on public.restaurants using gist(
  st_makepoint(lng, lat)::geography
);
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
