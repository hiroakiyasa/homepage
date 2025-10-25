const fs = require('fs');
const path = require('path');

// Haversine公式で2点間の距離を計算（メートル単位）
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // 地球の半径（メートル）
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // メートル
}

console.log('📍 半径500m以内に5件以上のレストランがある駅を検索中...\n');

// regions-data.jsonを読み込む
const regionsDataPath = path.join(__dirname, 'data', 'regions-data.json');
const regionsData = JSON.parse(fs.readFileSync(regionsDataPath, 'utf8'));

console.log(`📊 地域数: ${regionsData.length}`);

// レストランデータを読み込む
const restaurantsDataPath = '/Users/user/WebApp/camping_note/★all-restaurants-with-ids.json';
const restaurantsJson = JSON.parse(fs.readFileSync(restaurantsDataPath, 'utf8'));
const restaurants = restaurantsJson.restaurants;

console.log(`🍴 レストラン総数: ${restaurants.length.toLocaleString()}\n`);

// 緯度経度があるレストランのみフィルタ
const validRestaurants = restaurants.filter(r => r.latitude && r.longitude);
console.log(`✅ 位置情報ありレストラン: ${validRestaurants.length.toLocaleString()}\n`);

const RADIUS = 500; // 半径500メートル
const MIN_RESTAURANTS = 5; // 最低5件

const highDensityStations = [];

console.log('🔍 検索中...\n');

// 各地域について、半径500m以内のレストラン数を計算
regionsData.forEach((region, index) => {
  if (!region.lat || !region.lng) {
    return;
  }

  // プログレス表示
  if ((index + 1) % 50 === 0) {
    console.log(`   進捗: ${index + 1}/${regionsData.length}`);
  }

  let nearbyRestaurants = 0;

  // すべてのレストランとの距離を計算
  for (const restaurant of validRestaurants) {
    const distance = calculateDistance(
      region.lat,
      region.lng,
      restaurant.latitude,
      restaurant.longitude
    );

    if (distance <= RADIUS) {
      nearbyRestaurants++;
    }
  }

  // 5件以上あれば記録
  if (nearbyRestaurants >= MIN_RESTAURANTS) {
    highDensityStations.push({
      name: region.name,
      latitude: region.lat,
      longitude: region.lng,
      restaurantCount: nearbyRestaurants,
      elevation: region.elevation || null
    });
  }
});

console.log('\n=== 検索結果 ===\n');
console.log(`✅ 条件に合う駅: ${highDensityStations.length}件\n`);

// レストラン数で降順ソート
highDensityStations.sort((a, b) => b.restaurantCount - a.restaurantCount);

// トップ10を表示
console.log('📊 レストラン密集度トップ10:\n');
highDensityStations.slice(0, 10).forEach((station, index) => {
  console.log(`${index + 1}. ${station.name}: ${station.restaurantCount}件`);
});

// JSONファイルに出力
const outputPath = path.join(__dirname, 'high-density-stations.json');
const outputData = {
  generatedAt: new Date().toISOString(),
  searchRadius: RADIUS,
  minimumRestaurants: MIN_RESTAURANTS,
  totalStations: highDensityStations.length,
  stations: highDensityStations
};

fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf8');

console.log(`\n✅ 出力完了: ${outputPath}`);
console.log(`📁 ファイルサイズ: ${Math.round(fs.statSync(outputPath).size / 1024)} KB`);

// 統計情報を表示
console.log('\n📈 統計情報:');
console.log(`   平均レストラン数: ${Math.round(highDensityStations.reduce((sum, s) => sum + s.restaurantCount, 0) / highDensityStations.length)}件`);
console.log(`   最大レストラン数: ${highDensityStations[0].restaurantCount}件 (${highDensityStations[0].name})`);
console.log(`   最小レストラン数: ${highDensityStations[highDensityStations.length - 1].restaurantCount}件`);
