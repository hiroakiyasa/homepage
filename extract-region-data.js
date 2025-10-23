const fs = require('fs');
const path = require('path');

/**
 * restaurants_dataから地域データを抽出し、座標と名前を取得
 */
function extractRegionData() {
  const restaurantsDataDir = '/Users/user/WebApp/camping_note/restaurants_data';
  const files = fs.readdirSync(restaurantsDataDir);

  const regions = [];

  // area_で始まるファイルのみ処理
  const areaFiles = files.filter(f => f.startsWith('area_') && f.endsWith('.json'));

  console.log(`📍 ${areaFiles.length}個の地域ファイルを発見`);

  for (const file of areaFiles) {
    const filePath = path.join(restaurantsDataDir, file);

    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      // レストランデータから平均座標を計算
      if (data.restaurants && data.restaurants.length > 0) {
        const validRestaurants = data.restaurants.filter(r =>
          r.latitude && r.longitude &&
          !isNaN(r.latitude) && !isNaN(r.longitude)
        );

        if (validRestaurants.length > 0) {
          const avgLat = validRestaurants.reduce((sum, r) => sum + r.latitude, 0) / validRestaurants.length;
          const avgLng = validRestaurants.reduce((sum, r) => sum + r.longitude, 0) / validRestaurants.length;

          regions.push({
            name: data.name,
            lat: avgLat,
            lng: avgLng,
            restaurantCount: data.restaurantCount || validRestaurants.length,
            fileName: file.replace('area_', '').replace('.json', '')
          });
        }
      }
    } catch (err) {
      console.error(`   ⚠️  ${file} の読み込みエラー:`, err.message);
    }
  }

  console.log(`✅ ${regions.length}個の地域データを抽出`);

  // 出力
  const outputPath = path.join(__dirname, 'data', 'regions-data.json');
  fs.writeFileSync(outputPath, JSON.stringify(regions, null, 2), 'utf8');

  console.log(`💾 保存: ${outputPath}`);

  // サンプル表示
  console.log('\n📍 地域データサンプル:');
  regions.slice(0, 10).forEach(r => {
    console.log(`   ${r.name} (${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}) - ${r.restaurantCount}店`);
  });

  return regions;
}

// 実行
extractRegionData();
