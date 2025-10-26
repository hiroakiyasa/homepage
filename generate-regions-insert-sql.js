const fs = require('fs');
const path = require('path');

async function generateRegionsInsertSQL() {
  console.log('=== 地域データINSERT SQL生成 ===\n');

  // 2つのJSONファイルから地域データを読み込む
  const restaurantSpotsPath = path.join(__dirname, 'all-restaurant-spots.json');
  const backupRegionsPath = path.join(__dirname, 'data', 'regions-data.backup-2025-10-24T15-58-43-523Z.json');

  let allRegions = [];

  // all-restaurant-spots.jsonから読み込み
  if (fs.existsSync(restaurantSpotsPath)) {
    console.log('📍 all-restaurant-spots.json を読み込み中...');
    const restaurantSpotsData = JSON.parse(fs.readFileSync(restaurantSpotsPath, 'utf8'));

    if (restaurantSpotsData.spots) {
      const uniqueSpots = new Map();
      restaurantSpotsData.spots.forEach(spot => {
        const key = `${spot.name}_${spot.latitude}_${spot.longitude}`;
        if (!uniqueSpots.has(key)) {
          uniqueSpots.set(key, {
            slug: (spot.name || '').replace(/[\/\\:*?"<>|]/g, '_'),
            name: spot.name,
            lat: spot.latitude,
            lng: spot.longitude,
            description: `${spot.name}周辺のおすすめ車中泊スポット`
          });
        }
      });
      allRegions.push(...Array.from(uniqueSpots.values()));
      console.log(`   ✅ ${uniqueSpots.size}箇所のレストランスポットを読み込みました`);
    }
  }

  // regions-data.backup-*.jsonから読み込み
  if (fs.existsSync(backupRegionsPath)) {
    console.log('📍 regions-data.backup-*.json を読み込み中...');
    const backupRegions = JSON.parse(fs.readFileSync(backupRegionsPath, 'utf8'));

    backupRegions.forEach(region => {
      allRegions.push({
        slug: (region.fileName || region.name).replace(/[\/\\:*?"<>|]/g, '_'),
        name: region.name,
        lat: region.lat,
        lng: region.lng,
        description: `${region.name}周辺のおすすめ車中泊スポット`
      });
    });

    console.log(`   ✅ ${backupRegions.length}箇所の地域データを読み込みました`);
  }

  // 重複を除去
  const uniqueRegionsMap = new Map();
  allRegions.forEach(region => {
    if (!uniqueRegionsMap.has(region.slug)) {
      uniqueRegionsMap.set(region.slug, region);
    }
  });
  const uniqueRegions = Array.from(uniqueRegionsMap.values());

  console.log(`📍 合計 ${uniqueRegions.length}個の地域データを処理します\n`);

  // SQL生成
  let sql = `-- 地域データ一括INSERT
-- 生成日時: ${new Date().toISOString()}
-- 件数: ${uniqueRegions.length}件

-- RLSを一時的に無効化（管理者として実行）
ALTER TABLE public.regions DISABLE ROW LEVEL SECURITY;

-- データ挿入
INSERT INTO public.regions (slug, name, lat, lng, description)
VALUES\n`;

  const values = uniqueRegions.map(region => {
    const slug = region.slug.replace(/'/g, "''"); // シングルクォートをエスケープ
    const name = region.name.replace(/'/g, "''");
    const description = region.description.replace(/'/g, "''");
    return `  ('${slug}', '${name}', ${region.lat}, ${region.lng}, '${description}')`;
  });

  sql += values.join(',\n');
  sql += '\nON CONFLICT (slug) DO NOTHING;\n\n';
  sql += '-- RLSを再有効化\n';
  sql += 'ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;\n\n';
  sql += `-- 登録件数確認\nSELECT COUNT(*) as total_regions FROM public.regions;\n`;

  // ファイルに保存
  const outputPath = path.join(__dirname, 'supabase', 'migrations', '20251026_004_insert_all_regions.sql');
  fs.writeFileSync(outputPath, sql, 'utf8');

  console.log(`✅ SQLファイルを生成しました: ${outputPath}`);
  console.log(`\nSupabase Dashboard → SQL Editor で以下のファイルの内容を実行してください：`);
  console.log(`   ${outputPath}\n`);
}

generateRegionsInsertSQL().catch(err => {
  console.error('エラー:', err);
  process.exit(1);
});
