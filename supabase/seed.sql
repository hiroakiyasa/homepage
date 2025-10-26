-- テストデータ投入スクリプト
-- 説明: 開発・テスト用のサンプルデータを投入

-- ==========================================
-- 1. テスト用地域データ
-- ==========================================
insert into public.regions (slug, name, name_en, lat, lng, min_lat, max_lat, min_lng, max_lng, description) values
  ('aoba-street', 'あおば通', 'Aoba Street', 38.2585, 140.8724, 38.25, 38.27, 140.86, 140.88, '仙台市のビジネス街'),
  ('sendai-station', '仙台駅', 'Sendai Station', 38.2605, 140.8821, 38.25, 38.27, 140.87, 140.89, '仙台の中心駅'),
  ('kyoto-station', '京都駅', 'Kyoto Station', 34.9851, 135.7584, 34.98, 35.00, 135.74, 135.76, '京都の玄関口')
on conflict (slug) do nothing;

-- ==========================================
-- 2. テスト用駐車場データ
-- ==========================================
insert into public.parking_spots (region_slug, name, lat, lng, address, overnight_fee, hourly_rate, max_fee_24h, facilities) values
  ('aoba-street', '名鉄協商あおば通第1', 38.2590, 140.8730, '仙台市青葉区', 800, 200, 1500, '{"convenience_store": true, "toilet": true}'::jsonb),
  ('aoba-street', '三井のリパークあおば通駅前', 38.2580, 140.8720, '仙台市青葉区', 1000, 300, 2000, '{"convenience_store": false, "toilet": true}'::jsonb),
  ('sendai-station', 'タイムズ仙台駅東口', 38.2610, 140.8830, '仙台市宮城野区', 1200, 400, 2400, '{"convenience_store": true, "toilet": false}'::jsonb)
on conflict do nothing;

-- ==========================================
-- 3. テスト用レストランデータ
-- ==========================================
insert into public.restaurants (region_slug, name, lat, lng, rating, cuisine_type, address, tabelog_url) values
  ('aoba-street', '牛たん炭焼 利久 あおば通店', 38.2588, 140.8728, 3.5, '和食', '仙台市青葉区中央1丁目', 'https://tabelog.com/miyagi/A0401/A040101/4000001/'),
  ('aoba-street', 'すし処 松乃', 38.2592, 140.8735, 3.8, '寿司', '仙台市青葉区中央2丁目', 'https://tabelog.com/miyagi/A0401/A040101/4000002/'),
  ('sendai-station', '伊達の牛たん本舗', 38.2608, 140.8825, 3.6, '和食', '仙台駅3階', 'https://tabelog.com/miyagi/A0401/A040101/4000003/')
on conflict do nothing;

-- ==========================================
-- 4. サマリー表示
-- ==========================================
do $$
begin
  raise notice '=== テストデータ投入完了 ===';
  raise notice '地域: % 件', (select count(*) from public.regions);
  raise notice '駐車場: % 件', (select count(*) from public.parking_spots);
  raise notice 'レストラン: % 件', (select count(*) from public.restaurants);
end $$;
