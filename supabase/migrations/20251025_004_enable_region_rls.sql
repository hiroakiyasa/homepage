-- マイグレーション 004: Row Level Security (RLS) の設定
-- 説明: 地域関連テーブルでRLSを有効化し、ポリシーを設定

-- ==========================================
-- 1. RLSを有効化
-- ==========================================
alter table public.regions enable row level security;
alter table public.restaurants enable row level security;
alter table public.region_likes enable row level security;
alter table public.region_comments enable row level security;
alter table public.comment_likes enable row level security;

-- ==========================================
-- 2. 地域・レストランポリシー
-- ==========================================

-- 誰でも閲覧可能
create policy "Anyone can view regions"
  on public.regions
  for select
  using (true);

create policy "Anyone can view restaurants"
  on public.restaurants
  for select
  using (true);

comment on policy "Anyone can view regions" on public.regions is
  '誰でも地域を閲覧可能';
comment on policy "Anyone can view restaurants" on public.restaurants is
  '誰でもレストランを閲覧可能';

-- ==========================================
-- 3. 地域いいねポリシー
-- ==========================================

-- 誰でも閲覧可能
create policy "Anyone can view region likes"
  on public.region_likes
  for select
  using (true);

comment on policy "Anyone can view region likes" on public.region_likes is
  '誰でも地域いいねを閲覧可能';

-- 誰でもいいね追加可能（認証・匿名両方）
create policy "Anyone can add region likes"
  on public.region_likes
  for insert
  with check (true);

comment on policy "Anyone can add region likes" on public.region_likes is
  '認証ユーザーも匿名ユーザーも地域いいねを追加可能';

-- 認証ユーザーは自分のいいねのみ削除可能
create policy "Users can delete own region likes"
  on public.region_likes
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

comment on policy "Users can delete own region likes" on public.region_likes is
  '認証ユーザーは自分のいいねのみ削除可能';

-- 匿名ユーザーは自分のfingerprintのいいねのみ削除可能
create policy "Anonymous can delete own fingerprint region likes"
  on public.region_likes
  for delete
  to anon
  using (user_id is null);

comment on policy "Anonymous can delete own fingerprint region likes" on public.region_likes is
  '匿名ユーザーはuser_idがnullのいいねを削除可能（fingerprintはフロントエンドで制御）';

-- ==========================================
-- 4. 地域コメントポリシー
-- ==========================================

-- 誰でもコメント閲覧可能
create policy "Anyone can view region comments"
  on public.region_comments
  for select
  using (true);

comment on policy "Anyone can view region comments" on public.region_comments is
  '誰でも地域コメントを閲覧可能';

-- 認証ユーザーのみコメント投稿可能
create policy "Authenticated users can insert region comments"
  on public.region_comments
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

comment on policy "Authenticated users can insert region comments" on public.region_comments is
  '認証ユーザーのみ地域コメントを投稿可能';

-- 自分のコメントのみ更新可能
create policy "Users can update own region comments"
  on public.region_comments
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

comment on policy "Users can update own region comments" on public.region_comments is
  '認証ユーザーは自分のコメントのみ更新可能';

-- 自分のコメントのみ削除可能
create policy "Users can delete own region comments"
  on public.region_comments
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

comment on policy "Users can delete own region comments" on public.region_comments is
  '認証ユーザーは自分のコメントのみ削除可能';

-- ==========================================
-- 5. コメントいいねポリシー
-- ==========================================

-- 誰でも閲覧可能
create policy "Anyone can view comment likes"
  on public.comment_likes
  for select
  using (true);

-- 誰でもいいね追加可能
create policy "Anyone can add comment likes"
  on public.comment_likes
  for insert
  with check (true);

-- 認証ユーザーは自分のいいねのみ削除可能
create policy "Users can delete own comment likes"
  on public.comment_likes
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- 匿名ユーザーは自分のfingerprintのいいねのみ削除可能
create policy "Anonymous can delete own fingerprint comment likes"
  on public.comment_likes
  for delete
  to anon
  using (user_id is null);

-- ==========================================
-- 6. RLSパフォーマンス最適化用インデックス
-- ==========================================

-- 地域いいねテーブル: user_idでフィルタリング高速化
create index idx_region_likes_user_id_auth on public.region_likes(user_id)
  where user_id is not null;

-- 地域コメントテーブル: user_idでフィルタリング高速化
create index idx_region_comments_user_id_auth on public.region_comments(user_id);

-- コメントいいねテーブル: user_idでフィルタリング高速化
create index idx_comment_likes_user_id_auth on public.comment_likes(user_id)
  where user_id is not null;

comment on index idx_region_likes_user_id_auth is 'RLSポリシーによるuser_idフィルタリングを高速化';
comment on index idx_region_comments_user_id_auth is 'RLSポリシーによるuser_idフィルタリングを高速化';
comment on index idx_comment_likes_user_id_auth is 'RLSポリシーによるuser_idフィルタリングを高速化';
