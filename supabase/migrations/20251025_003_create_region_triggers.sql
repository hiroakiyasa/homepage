-- マイグレーション 003: 地域関連トリガー関数の作成
-- 説明: いいね数・コメント数の自動更新とRealtime Broadcast

-- ==========================================
-- 1. 地域いいね数を自動更新するトリガー関数
-- ==========================================
create or replace function public.update_region_like_count()
returns trigger
language plpgsql
security definer
as $$
declare
  delta int;
begin
  -- 増減を計算
  if TG_OP = 'INSERT' then
    delta := 1;
  elsif TG_OP = 'DELETE' then
    delta := -1;
  else
    return null;
  end if;

  -- 地域のいいね数を更新
  update public.regions
  set like_count = greatest(0, like_count + delta)
  where slug = coalesce(NEW.region_slug, OLD.region_slug);

  return null;
end;
$$;

comment on function public.update_region_like_count() is '地域いいね追加/削除時にregions.like_countを自動更新';

-- トリガーを作成
create trigger update_region_like_count_trigger
  after insert or delete on public.region_likes
  for each row
  execute function public.update_region_like_count();

-- ==========================================
-- 2. 地域コメント数を自動更新するトリガー関数
-- ==========================================
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

comment on function public.update_region_comment_count() is 'コメント追加/削除時にregions.comment_countを自動更新';

-- トリガーを作成
create trigger update_region_comment_count_trigger
  after insert or delete on public.region_comments
  for each row
  execute function public.update_region_comment_count();

-- ==========================================
-- 3. コメントいいね数を自動更新するトリガー関数
-- ==========================================
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

comment on function public.update_comment_like_count() is 'コメントいいね数を自動更新';

-- トリガーを作成
create trigger update_comment_like_count_trigger
  after insert or delete on public.comment_likes
  for each row
  execute function public.update_comment_like_count();

-- ==========================================
-- 4. Realtime Broadcast: 地域いいね変更
-- ==========================================
create or replace function public.broadcast_region_like_changes()
returns trigger
language plpgsql
security definer
as $$
begin
  -- いいね数の変更をBroadcast
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

comment on function public.broadcast_region_like_changes() is '地域いいね変更をRealtimeでブロードキャスト';

-- トリガーを作成
create trigger broadcast_region_like_trigger
  after insert or delete on public.region_likes
  for each row
  execute function public.broadcast_region_like_changes();

-- ==========================================
-- 5. Realtime Broadcast: 地域コメント変更
-- ==========================================
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

comment on function public.broadcast_region_comment_changes() is '地域コメント変更をRealtimeでブロードキャスト';

-- トリガーを作成
create trigger broadcast_region_comment_trigger
  after insert or update or delete on public.region_comments
  for each row
  execute function public.broadcast_region_comment_changes();
