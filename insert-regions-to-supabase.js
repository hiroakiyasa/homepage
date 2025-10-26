const fs = require('fs');
const path = require('path');
const supabase = require('./src/supabaseClient');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

async function insertRegionsToSupabase() {
  console.log(`${colors.blue}=== 地域データをSupabaseに一括登録 ===${colors.reset}\n`);

  // 2つのJSONファイルから地域データを読み込む
  const restaurantSpotsPath = path.join(__dirname, 'all-restaurant-spots.json');
  const backupRegionsPath = path.join(__dirname, 'data', 'regions-data.backup-2025-10-24T15-58-43-523Z.json');

  let allRegions = [];

  // all-restaurant-spots.jsonから読み込み
  if (fs.existsSync(restaurantSpotsPath)) {
    console.log('📍 all-restaurant-spots.json を読み込み中...');
    const restaurantSpotsData = JSON.parse(fs.readFileSync(restaurantSpotsPath, 'utf8'));

    if (restaurantSpotsData.spots) {
      // spots配列から地域データを抽出（重複を除く）
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
      console.log(`   ✅ ${uniqueSpots.size}箇所のレストランスポットを読み込みました\n`);
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

    console.log(`   ✅ ${backupRegions.length}箇所の地域データを読み込みました\n`);
  }

  if (allRegions.length === 0) {
    console.log(`${colors.red}✗ 地域データが見つかりません${colors.reset}`);
    return;
  }

  // 重複を除去（slugでユニーク化）
  const uniqueRegionsMap = new Map();
  allRegions.forEach(region => {
    if (!uniqueRegionsMap.has(region.slug)) {
      uniqueRegionsMap.set(region.slug, region);
    }
  });
  const uniqueRegions = Array.from(uniqueRegionsMap.values());

  console.log(`📍 合計 ${uniqueRegions.length}個の地域データをSupabaseに登録します\n`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  // バッチサイズ（一度に挿入する件数）
  const BATCH_SIZE = 100;

  for (let i = 0; i < uniqueRegions.length; i += BATCH_SIZE) {
    const batch = uniqueRegions.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(uniqueRegions.length / BATCH_SIZE);

    console.log(`${colors.cyan}バッチ ${batchNumber}/${totalBatches} (${batch.length}件)${colors.reset}`);

    try {
      // upsertで挿入（既存の場合は更新しない）
      const { data, error } = await supabase
        .from('regions')
        .upsert(batch, {
          onConflict: 'slug',
          ignoreDuplicates: true
        });

      if (error) {
        console.error(`   ${colors.red}✗ バッチ${batchNumber}のエラー:${colors.reset}`, error.message);
        errorCount += batch.length;
      } else {
        successCount += batch.length;
        console.log(`   ${colors.green}✓ バッチ${batchNumber}完了${colors.reset}`);
      }
    } catch (err) {
      console.error(`   ${colors.red}✗ バッチ${batchNumber}の例外:${colors.reset}`, err.message);
      errorCount += batch.length;
    }

    // API制限回避のため少し待機
    if (i + BATCH_SIZE < uniqueRegions.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log(`\n${colors.green}✅ 登録完了${colors.reset}`);
  console.log(`   成功: ${colors.green}${successCount}${colors.reset}件`);
  if (skipCount > 0) {
    console.log(`   スキップ: ${colors.yellow}${skipCount}${colors.reset}件（既存）`);
  }
  if (errorCount > 0) {
    console.log(`   失敗: ${colors.red}${errorCount}${colors.reset}件`);
  }

  // 登録後の件数確認
  const { count, error: countError } = await supabase
    .from('regions')
    .select('*', { count: 'exact', head: true });

  if (!countError) {
    console.log(`\n📊 regionsテーブルの総件数: ${colors.cyan}${count}${colors.reset}件\n`);
  }
}

// 実行
insertRegionsToSupabase().catch(err => {
  console.error(`${colors.red}エラー:${colors.reset}`, err);
  process.exit(1);
});
