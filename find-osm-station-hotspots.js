const fs = require('fs');
const path = require('path');

console.log('🚉 OpenStreetMapの駅データからレストラン密集地を検索中...\n');

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

// OpenStreetMapから取得した駅データを読み込む
const osmStationsPath = path.join(__dirname, 'japan-stations-from-osm.json');
const osmStationsData = JSON.parse(fs.readFileSync(osmStationsPath, 'utf8'));
const osmStations = osmStationsData.stations;

console.log(`🚉 OpenStreetMap駅数: ${osmStations.length.toLocaleString()}\n`);

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

console.log('🔍 各駅から半径500m以内のレストラン数を計算中...\n');

let processedCount = 0;

osmStations.forEach((station, index) => {
  let nearbyCount = 0;

  // 駅座標から半径500m以内のレストラン数を計算
  validRestaurants.forEach(restaurant => {
    const distance = calculateDistance(
      station.latitude,
      station.longitude,
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
      stationName: station.stationName,
      fullName: station.fullName || station.stationName,
      operator: station.operator,
      line: station.line,
      prefecture: station.prefecture,
      city: station.city,
      latitude: station.latitude,
      longitude: station.longitude,
      restaurantCount: nearbyCount,
      railwayType: station.railwayType,
      osmId: station.osmId
    });
  }

  processedCount++;
  if (processedCount % 1000 === 0) {
    console.log(`   進捗: ${processedCount}/${osmStations.length}`);
  }
});

console.log('\n=== 検索結果 ===\n');
console.log(`✅ 条件に合う駅: ${hotspots.length}件\n`);

// レストラン密集度で降順ソート
hotspots.sort((a, b) => b.restaurantCount - a.restaurantCount);

// トップ50を表示
console.log('📊 レストラン密集度トップ50（駅から半径500m以内）:\n');
hotspots.slice(0, 50).forEach((spot, index) => {
  const displayName = spot.operator ? `${spot.operator} ${spot.stationName}` : spot.stationName;
  console.log(`${index + 1}. ${displayName}: ${spot.restaurantCount}件`);
});

// JSONファイルに出力
const outputPath = path.join(__dirname, 'osm-station-restaurant-hotspots.json');
const outputData = {
  generatedAt: new Date().toISOString(),
  dataSource: 'OpenStreetMap + レストランデータ',
  searchRadius: RADIUS,
  minimumRestaurants: MIN_RESTAURANTS,
  totalHotspots: hotspots.length,
  totalStationsAnalyzed: osmStations.length,
  totalRestaurantsAnalyzed: validRestaurants.length,
  note: 'OpenStreetMapから取得した駅の座標から半径500m以内に5件以上のレストランがある駅',
  hotspots: hotspots
};

fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf8');

console.log(`\n✅ 出力完了: ${outputPath}`);
console.log(`📁 ファイルサイズ: ${Math.round(fs.statSync(outputPath).size / 1024)} KB`);

// 統計情報を表示
console.log('\n📈 統計情報:');
console.log(`   平均レストラン数（駅から500m以内）: ${Math.round(hotspots.reduce((sum, s) => sum + s.restaurantCount, 0) / hotspots.length)}件`);
console.log(`   最大レストラン数: ${hotspots[0].restaurantCount}件 (${hotspots[0].fullName || hotspots[0].stationName})`);
console.log(`   最小レストラン数: ${hotspots[hotspots.length - 1].restaurantCount}件`);

// 都道府県別の統計
const prefectureCounts = {};
hotspots.forEach(spot => {
  const pref = spot.prefecture || '都道府県不明';
  prefectureCounts[pref] = (prefectureCounts[pref] || 0) + 1;
});

console.log('\n📍 都道府県別ホットスポット数（トップ15）:');
Object.entries(prefectureCounts)
  .filter(([pref]) => pref !== '都道府県不明' && pref !== '')
  .sort((a, b) => b[1] - a[1])
  .slice(0, 15)
  .forEach(([pref, count], index) => {
    console.log(`   ${index + 1}. ${pref}: ${count}駅`);
  });

// 鉄道事業者別の統計
const operatorCounts = {};
hotspots.forEach(spot => {
  if (spot.operator) {
    operatorCounts[spot.operator] = (operatorCounts[spot.operator] || 0) + 1;
  }
});

console.log('\n🚊 鉄道事業者別ホットスポット数（トップ15）:');
Object.entries(operatorCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 15)
  .forEach(([operator, count], index) => {
    console.log(`   ${index + 1}. ${operator}: ${count}駅`);
  });

console.log('\n🎉 完了！');
