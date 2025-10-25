const fs = require('fs');
const path = require('path');

/**
 * restaurants_data_top5フォルダから新しい地域データを読み込んで
 * regions-data.jsonに追加する
 */
async function addNewRegions() {
  const restaurantsDataDir = '/Users/user/WebApp/camping_note/restaurants_data_top5';
  const regionsDataPath = path.join(__dirname, 'data', 'regions-data.json');

  // 既存の地域データを読み込む
  const existingRegions = JSON.parse(fs.readFileSync(regionsDataPath, 'utf8'));
  console.log(`📍 既存の地域数: ${existingRegions.length}`);

  // 既存の地域名をセットに保存（重複チェック用）
  const existingNames = new Set(existingRegions.map(r => r.name));

  // restaurants_data_top5フォルダのファイルを読み込む
  const files = fs.readdirSync(restaurantsDataDir)
    .filter(f => f.startsWith('top5_') && f.endsWith('.json'));

  console.log(`📂 新しい地域ファイル数: ${files.length}`);

  let addedCount = 0;
  const newRegions = [];

  for (const file of files) {
    const filePath = path.join(restaurantsDataDir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // 地域名を取得（top5_プレフィックスを除去）
    let regionName = data.name;

    // 既に存在する場合はスキップ
    if (existingNames.has(regionName)) {
      console.log(`   ⏭️  スキップ: ${regionName}（既に存在）`);
      continue;
    }

    // レストランデータから中心座標を計算
    if (!data.restaurants || data.restaurants.length === 0) {
      console.log(`   ⚠️  スキップ: ${regionName}（レストランデータなし）`);
      continue;
    }

    const validRestaurants = data.restaurants.filter(r => r.latitude && r.longitude);
    if (validRestaurants.length === 0) {
      console.log(`   ⚠️  スキップ: ${regionName}（有効な座標なし）`);
      continue;
    }

    // 中心座標を計算（全レストランの平均）
    const avgLat = validRestaurants.reduce((sum, r) => sum + r.latitude, 0) / validRestaurants.length;
    const avgLng = validRestaurants.reduce((sum, r) => sum + r.longitude, 0) / validRestaurants.length;

    // 新しい地域データを作成
    const newRegion = {
      name: regionName,
      lat: avgLat,
      lng: avgLng,
      restaurantCount: data.restaurants.length,
      fileName: regionName,
      elevation: 0 // 後で取得
    };

    newRegions.push(newRegion);
    existingNames.add(regionName);
    addedCount++;
    console.log(`   ✅ 追加: ${regionName} (${data.restaurants.length}件のレストラン)`);
  }

  // 既存の地域データと統合
  const updatedRegions = [...existingRegions, ...newRegions];

  // 保存
  fs.writeFileSync(regionsDataPath, JSON.stringify(updatedRegions, null, 2), 'utf8');

  console.log(`\n✅ ${addedCount}個の新しい地域を追加しました`);
  console.log(`📊 合計地域数: ${updatedRegions.length}`);

  return addedCount;
}

// 実行
addNewRegions().catch(err => {
  console.error('エラー:', err);
  process.exit(1);
});
