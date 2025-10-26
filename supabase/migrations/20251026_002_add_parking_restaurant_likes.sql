-- 駐車場といいね機能を追加

-- parking_spot_likesテーブル作成
CREATE TABLE IF NOT EXISTS public.parking_spot_likes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  parking_spot_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(parking_spot_id, user_id)
);

-- restaurant_likesテーブル作成
CREATE TABLE IF NOT EXISTS public.restaurant_likes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id integer NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(restaurant_id, user_id)
);

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_parking_spot_likes_spot ON public.parking_spot_likes(parking_spot_id);
CREATE INDEX IF NOT EXISTS idx_parking_spot_likes_user ON public.parking_spot_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_likes_restaurant ON public.restaurant_likes(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_likes_user ON public.restaurant_likes(user_id);

-- RLSポリシー設定
ALTER TABLE public.parking_spot_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_likes ENABLE ROW LEVEL SECURITY;

-- 誰でも読める
CREATE POLICY "Anyone can view parking spot likes" ON public.parking_spot_likes
  FOR SELECT USING (true);

CREATE POLICY "Anyone can view restaurant likes" ON public.restaurant_likes
  FOR SELECT USING (true);

-- 認証ユーザーは自分のいいねを追加できる
CREATE POLICY "Authenticated users can add parking spot likes" ON public.parking_spot_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can add restaurant likes" ON public.restaurant_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 認証ユーザーは自分のいいねを削除できる
CREATE POLICY "Users can delete their own parking spot likes" ON public.parking_spot_likes
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own restaurant likes" ON public.restaurant_likes
  FOR DELETE USING (auth.uid() = user_id);

COMMENT ON TABLE public.parking_spot_likes IS '駐車場へのいいね';
COMMENT ON TABLE public.restaurant_likes IS 'レストランへのいいね';
