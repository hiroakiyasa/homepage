-- 46,034件の駐車場のnearest_hotspringに温泉名を追加
-- 実行前の件数確認
SELECT COUNT(*) as count_without_name
FROM parking_spots
WHERE nearest_hotspring IS NOT NULL
  AND nearest_hotspring NOT LIKE '%"name"%';

-- 温泉名を追加
UPDATE parking_spots p
SET nearest_hotspring = jsonb_set(
  p.nearest_hotspring::jsonb,
  '{name}',
  to_jsonb(h.name)
)::text
FROM hot_springs h
WHERE p.nearest_hotspring IS NOT NULL
  AND p.nearest_hotspring NOT LIKE '%"name"%'
  AND h.id = (p.nearest_hotspring::jsonb->>'id');

-- 実行後の件数確認
SELECT COUNT(*) as count_without_name_after
FROM parking_spots
WHERE nearest_hotspring IS NOT NULL
  AND nearest_hotspring NOT LIKE '%"name"%';

-- サンプル確認
SELECT
  id,
  name as parking_name,
  nearest_hotspring
FROM parking_spots
WHERE nearest_hotspring IS NOT NULL
  AND nearest_hotspring LIKE '%"name"%'
LIMIT 5;
