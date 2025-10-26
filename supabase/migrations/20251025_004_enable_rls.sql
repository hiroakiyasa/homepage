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
