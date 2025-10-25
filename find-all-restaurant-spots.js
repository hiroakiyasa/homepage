const fs = require('fs');
const path = require('path');

console.log('🗾 全国の市区町村と駅からレストラン密集地を検索中...\n');

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

console.log(`📍 市区町村数: ${osmCities.length.toLocaleString()}`);

// OpenStreetMapから取得した駅データを読み込む
const osmStationsPath = path.join(__dirname, 'japan-stations-from-osm.json');
const osmStationsData = JSON.parse(fs.readFileSync(osmStationsPath, 'utf8'));
const osmStations = osmStationsData.stations;

console.log(`🚉 駅数: ${osmStations.length.toLocaleString()}`);

// レストランデータを読み込む
const restaurantsDataPath = '/Users/user/WebApp/camping_note/★all-restaurants-with-ids.json';
const restaurantsJson = JSON.parse(fs.readFileSync(restaurantsDataPath, 'utf8'));
const restaurants = restaurantsJson.restaurants;

console.log(`🍴 レストラン総数: ${restaurants.length.toLocaleString()}`);

// 位置情報があるレストランのみフィルタ
const validRestaurants = restaurants.filter(r =>
  r.latitude && r.longitude
);

console.log(`✅ 有効なレストラン: ${validRestaurants.length.toLocaleString()}\n`);

const RADIUS = 500; // 半径500メートル
const MIN_RESTAURANTS = 2; // 最低2件

const allSpots = [];

// === 1. 市区町村の分析 ===
console.log('🔍 市区町村を分析中...\n');

let cityProcessedCount = 0;

osmCities.forEach((city, index) => {
  let nearbyCount = 0;

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

  // 2件以上あれば記録
  if (nearbyCount >= MIN_RESTAURANTS) {
    allSpots.push({
      type: '市区町村',
      name: city.cityName,
      fullName: city.fullName || city.cityName,
      prefecture: city.prefecture,
      latitude: city.latitude,
      longitude: city.longitude,
      restaurantCount: nearbyCount,
      adminLevel: city.adminLevel,
      osmId: city.osmId
    });
  }

  cityProcessedCount++;
  if (cityProcessedCount % 200 === 0) {
    console.log(`   市区町村進捗: ${cityProcessedCount}/${osmCities.length}`);
  }
});

console.log(`✅ 市区町村: ${allSpots.filter(s => s.type === '市区町村').length}件が条件に合致\n`);

// === 2. 駅の分析 ===
console.log('🔍 駅を分析中...\n');

let stationProcessedCount = 0;

osmStations.forEach((station, index) => {
  let nearbyCount = 0;

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

  // 2件以上あれば記録
  if (nearbyCount >= MIN_RESTAURANTS) {
    allSpots.push({
      type: '駅',
      name: station.stationName,
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

  stationProcessedCount++;
  if (stationProcessedCount % 1000 === 0) {
    console.log(`   駅進捗: ${stationProcessedCount}/${osmStations.length}`);
  }
});

console.log(`✅ 駅: ${allSpots.filter(s => s.type === '駅').length}件が条件に合致\n`);

console.log('\n=== 検索結果 ===\n');
console.log(`✅ 合計: ${allSpots.length.toLocaleString()}件\n`);

// レストラン密集度で降順ソート
allSpots.sort((a, b) => b.restaurantCount - a.restaurantCount);

// トップ50を表示
console.log('📊 レストラン密集度トップ50（半径500m以内）:\n');
allSpots.slice(0, 50).forEach((spot, index) => {
  const typeLabel = spot.type === '駅' ? '🚉' : '📍';
  const displayName = spot.fullName || spot.name;
  console.log(`${index + 1}. ${typeLabel} ${displayName}: ${spot.restaurantCount}件 (${spot.type})`);
});

// JSONファイルに出力
const outputPath = path.join(__dirname, 'all-restaurant-spots.json');
const outputData = {
  generatedAt: new Date().toISOString(),
  dataSource: 'OpenStreetMap + レストランデータ',
  searchRadius: RADIUS,
  minimumRestaurants: MIN_RESTAURANTS,
  totalSpots: allSpots.length,
  totalCitiesAnalyzed: osmCities.length,
  totalStationsAnalyzed: osmStations.length,
  totalRestaurantsAnalyzed: validRestaurants.length,
  spotsByCities: allSpots.filter(s => s.type === '市区町村').length,
  spotsByStations: allSpots.filter(s => s.type === '駅').length,
  note: 'OpenStreetMapから取得した市区町村と駅の座標から半径500m以内に2件以上のレストランがある場所',
  spots: allSpots
};

fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf8');

console.log(`\n✅ 出力完了: ${outputPath}`);
console.log(`📁 ファイルサイズ: ${Math.round(fs.statSync(outputPath).size / 1024)} KB`);

// 統計情報を表示
console.log('\n📈 統計情報:');
console.log(`   平均レストラン数（500m以内）: ${Math.round(allSpots.reduce((sum, s) => sum + s.restaurantCount, 0) / allSpots.length)}件`);
console.log(`   最大レストラン数: ${allSpots[0].restaurantCount}件 (${allSpots[0].fullName || allSpots[0].name})`);
console.log(`   最小レストラン数: ${allSpots[allSpots.length - 1].restaurantCount}件`);

// タイプ別の統計
console.log('\n📋 タイプ別の内訳:');
console.log(`   市区町村: ${allSpots.filter(s => s.type === '市区町村').length}件`);
console.log(`   駅: ${allSpots.filter(s => s.type === '駅').length}件`);

// 都道府県別の統計（トップ15）
const prefectureCounts = {};
allSpots.forEach(spot => {
  const pref = spot.prefecture || '都道府県不明';
  if (pref && pref !== '都道府県不明' && pref !== '') {
    prefectureCounts[pref] = (prefectureCounts[pref] || 0) + 1;
  }
});

if (Object.keys(prefectureCounts).length > 0) {
  console.log('\n📍 都道府県別スポット数（トップ15）:');
  Object.entries(prefectureCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([pref, count], index) => {
      console.log(`   ${index + 1}. ${pref}: ${count}箇所`);
    });
}

console.log('\n🎉 完了！');
