-- マイグレーション 001: 拡張機能の有効化
-- 説明: 必要なPostgreSQL拡張機能を有効化

-- UUID生成用
create extension if not exists "uuid-ossp"
  with schema extensions;

-- 地理空間データ用 (駐車場・レストランの位置情報)
create extension if not exists postgis
  with schema extensions;

-- コメント
comment on extension "uuid-ossp" is 'UUID生成関数を提供';
comment on extension postgis is '地理空間データ処理を提供';
