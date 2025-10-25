const fs = require('fs');
const path = require('path');

console.log('🗾 OpenStreetMapの市区町村データからレストラン密集地を検索中...\n');

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

// OpenStreetMapから取得した市区町村データを読み込む
const osmCitiesPath = path.join(__dirname, 'japan-cities-from-osm.json');
const osmCitiesData = JSON.parse(fs.readFileSync(osmCitiesPath, 'utf8'));
const osmCities = osmCitiesData.cities;

console.log(`📍 OpenStreetMap市区町村数: ${osmCities.length.toLocaleString()}\n`);

// レストランデータを読み込む
const restaurantsDataPath = '/Users/user/WebApp/camping_note/★all-restaurants-with-ids.json';
const restaurantsJson = JSON.parse(fs.readFileSync(restaurantsDataPath, 'utf8'));
const restaurants = restaurantsJson.restaurants;

console.log(`🍴 レストラン総数: ${restaurants.length.toLocaleString()}\n`);

// 位置情報があるレストランのみフィルタ
const validRestaurants = restaurants.filter(r =>
  r.latitude && r.longitude
);

console.log(`✅ 有効なレストラン: ${validRestaurants.length.toLocaleString()}\n`);

const RADIUS = 500; // 半径500メートル
const MIN_RESTAURANTS = 5; // 最低5件

const hotspots = [];

console.log('🔍 各市区町村の中心から半径500m以内のレストラン数を計算中...\n');

let processedCount = 0;

osmCities.forEach((city, index) => {
  let nearbyCount = 0;

  // 中心座標から半径500m以内のレストラン数を計算
  validRestaurants.forEach(restaurant => {
    const distance = calculateDistance(
      city.latitude,
      city.longitude,
      restaurant.latitude,
      restaurant.longitude
    );

    if (distance <= RADIUS) {
      nearbyCount++;
    }
  });

  // 5件以上あれば記録
  if (nearbyCount >= MIN_RESTAURANTS) {
    hotspots.push({
      cityName: city.cityName,
      fullName: city.fullName || city.cityName,
      prefecture: city.prefecture,
      latitude: city.latitude,
      longitude: city.longitude,
      restaurantCount: nearbyCount,
      adminLevel: city.adminLevel,
      osmId: city.osmId
    });
  }

  processedCount++;
  if (processedCount % 200 === 0) {
    console.log(`   進捗: ${processedCount}/${osmCities.length}`);
  }
});

console.log('\n=== 検索結果 ===\n');
console.log(`✅ 条件に合う市区町村: ${hotspots.length}件\n`);

// レストラン密集度で降順ソート
hotspots.sort((a, b) => b.restaurantCount - a.restaurantCount);

// トップ30を表示
console.log('📊 レストラン密集度トップ30（中心から半径500m以内）:\n');
hotspots.slice(0, 30).forEach((spot, index) => {
  const displayName = spot.fullName || spot.cityName;
  console.log(`${index + 1}. ${displayName}: ${spot.restaurantCount}件`);
});

// JSONファイルに出力
const outputPath = path.join(__dirname, 'osm-city-restaurant-hotspots.json');
const outputData = {
  generatedAt: new Date().toISOString(),
  dataSource: 'OpenStreetMap + レストランデータ',
  searchRadius: RADIUS,
  minimumRestaurants: MIN_RESTAURANTS,
  totalHotspots: hotspots.length,
  totalCitiesAnalyzed: osmCities.length,
  totalRestaurantsAnalyzed: validRestaurants.length,
  note: 'OpenStreetMapから取得した市区町村の中心座標から半径500m以内に5件以上のレストランがある地域',
  hotspots: hotspots
};

fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf8');

console.log(`\n✅ 出力完了: ${outputPath}`);
console.log(`📁 ファイルサイズ: ${Math.round(fs.statSync(outputPath).size / 1024)} KB`);

// 統計情報を表示
console.log('\n📈 統計情報:');
console.log(`   平均レストラン数（中心500m以内）: ${Math.round(hotspots.reduce((sum, s) => sum + s.restaurantCount, 0) / hotspots.length)}件`);
console.log(`   最大レストラン数: ${hotspots[0].restaurantCount}件 (${hotspots[0].fullName || hotspots[0].cityName})`);
console.log(`   最小レストラン数: ${hotspots[hotspots.length - 1].restaurantCount}件`);

// 都道府県別の統計
const prefectureCounts = {};
hotspots.forEach(spot => {
  const pref = spot.prefecture || '都道府県不明';
  prefectureCounts[pref] = (prefectureCounts[pref] || 0) + 1;
});

console.log('\n📍 都道府県別ホットスポット数（トップ15）:');
Object.entries(prefectureCounts)
  .filter(([pref]) => pref !== '都道府県不明')
  .sort((a, b) => b[1] - a[1])
  .slice(0, 15)
  .forEach(([pref, count], index) => {
    console.log(`   ${index + 1}. ${pref}: ${count}箇所`);
  });

console.log('\n🎉 完了！');
