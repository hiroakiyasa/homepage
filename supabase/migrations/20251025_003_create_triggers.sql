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
