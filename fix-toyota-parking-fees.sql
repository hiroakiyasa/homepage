-- 豊田市の駐車場料金を修正
-- 第1駐車場、第2駐車場、若宮駐車場が無料（price: 0）となっているのを正しい料金に更新

-- 第1駐車場 (ID: 6676)
-- 料金: 150円/30分、夜間最大250円（1:00-6:30）
UPDATE parking_spots
SET rates = '[
  {"type": "base", "price": 150, "minutes": 30},
  {"type": "max", "price": 250, "minutes": 330, "time_range": "1:00～6:30"}
]'::jsonb
WHERE id = 6676;

-- 第2駐車場 (ID: 6677)
-- 料金: 150円/30分（7:00-23:00）、夜間最大400円（23:00-7:00）
UPDATE parking_spots
SET rates = '[
  {"type": "base", "price": 150, "minutes": 30, "time_range": "7:00～23:00"},
  {"type": "max", "price": 400, "minutes": 480, "time_range": "23:00～7:00"}
]'::jsonb
WHERE id = 6677;

-- 若宮駐車場 (ID: 38432)
-- 料金: 150円/30分（7:00-23:00）、夜間最大400円（23:00-7:00）
UPDATE parking_spots
SET rates = '[
  {"type": "base", "price": 150, "minutes": 30, "time_range": "7:00～23:00"},
  {"type": "max", "price": 400, "minutes": 480, "time_range": "23:00～7:00"}
]'::jsonb
WHERE id = 38432;

-- 更新結果を確認
SELECT id, name, rates
FROM parking_spots
WHERE id IN (6676, 6677, 38432)
ORDER BY id;
