-- regionsテーブルへのINSERTを許可（サービスロール用）

-- まず、既存のポリシーを確認
-- SELECT * FROM pg_policies WHERE tablename = 'regions';

-- サービスロール（anon/authenticated）がregionsテーブルにINSERTできるようにする
-- ただし、実際には管理者のみが地域データを追加すべきなので、一時的に許可してデータ投入後に削除する方法もあります

-- オプション1: 誰でもINSERTできるようにする（一時的）
DROP POLICY IF EXISTS "Allow anon insert regions" ON public.regions;
CREATE POLICY "Allow anon insert regions" ON public.regions
  FOR INSERT
  WITH CHECK (true);

-- オプション2: 認証ユーザーのみINSERTできるようにする
-- DROP POLICY IF EXISTS "Authenticated users can insert regions" ON public.regions;
-- CREATE POLICY "Authenticated users can insert regions" ON public.regions
--   FOR INSERT
--   WITH CHECK (auth.role() = 'authenticated');
