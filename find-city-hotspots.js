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

// 住所から市区町村名を抽出
function extractCityName(address) {
  if (!address) return null;

  // パターン: 都道府県 + 市区町村
  const match = address.match(/^(.*?[都道府県])(.*?[市区町村郡])/);
  if (match) {
    return match[1] + match[2];
  }

  // 東京23区の特殊パターン
  const tokyoMatch = address.match(/^東京都(.*?区)/);
  if (tokyoMatch) {
    return '東京都' + tokyoMatch[1];
  }

  // 政令指定都市の区
  const wardMatch = address.match(/^(.*?[市])(.*?区)/);
  if (wardMatch) {
    return wardMatch[1] + wardMatch[2];
  }

  return null;
}

console.log('🗾 日本全国の市町村ホットスポットを検索中...\n');

// レストランデータを読み込む
const restaurantsDataPath = '/Users/user/WebApp/camping_note/★all-restaurants-with-ids.json';
const restaurantsJson = JSON.parse(fs.readFileSync(restaurantsDataPath, 'utf8'));
const restaurants = restaurantsJson.restaurants;

console.log(`🍴 レストラン総数: ${restaurants.length.toLocaleString()}\n`);

// 位置情報と住所があるレストランのみフィルタ
const validRestaurants = restaurants.filter(r =>
  r.latitude && r.longitude && r.address
);

console.log(`✅ 有効なレストラン: ${validRestaurants.length.toLocaleString()}\n`);

// 市区町村ごとにレストランをグループ化
const cityRestaurants = {};

validRestaurants.forEach(restaurant => {
  const cityName = extractCityName(restaurant.address);
  if (cityName) {
    if (!cityRestaurants[cityName]) {
      cityRestaurants[cityName] = [];
    }
    cityRestaurants[cityName].push(restaurant);
  }
});

const cities = Object.keys(cityRestaurants);
console.log(`📍 抽出された市区町村数: ${cities.length}\n`);

const RADIUS = 500; // 半径500メートル
const MIN_RESTAURANTS = 5; // 最低5件

const hotspots = [];

console.log('🔍 各市区町村の中心座標とレストラン密度を計算中...\n');

let processedCities = 0;

cities.forEach(cityName => {
  const cityRests = cityRestaurants[cityName];

  if (cityRests.length < MIN_RESTAURANTS) {
    return; // レストランが5件未満の市区町村はスキップ
  }

  // 市区町村の中心座標を計算（レストランの平均位置）
  let sumLat = 0;
  let sumLng = 0;

  cityRests.forEach(r => {
    sumLat += r.latitude;
    sumLng += r.longitude;
  });

  const centerLat = sumLat / cityRests.length;
  const centerLng = sumLng / cityRests.length;

  // 中心座標から半径500m以内のレストラン数を計算
  let nearbyCount = 0;

  cityRests.forEach(r => {
    const distance = calculateDistance(
      centerLat,
      centerLng,
      r.latitude,
      r.longitude
    );

    if (distance <= RADIUS) {
      nearbyCount++;
    }
  });

  // 5件以上あれば記録
  if (nearbyCount >= MIN_RESTAURANTS) {
    hotspots.push({
      cityName: cityName,
      latitude: centerLat,
      longitude: centerLng,
      restaurantCount: nearbyCount,
      totalCityRestaurants: cityRests.length
    });
  }

  processedCities++;
  if (processedCities % 100 === 0) {
    console.log(`   進捗: ${processedCities}/${cities.length}`);
  }
});

console.log('\n=== 検索結果 ===\n');
console.log(`✅ 条件に合う市区町村: ${hotspots.length}件\n`);

// レストラン密集度で降順ソート
hotspots.sort((a, b) => b.restaurantCount - a.restaurantCount);

// トップ20を表示
console.log('📊 レストラン密集度トップ20:\n');
hotspots.slice(0, 20).forEach((spot, index) => {
  console.log(`${index + 1}. ${spot.cityName}: ${spot.restaurantCount}件 (市内総数: ${spot.totalCityRestaurants}件)`);
});

// JSONファイルに出力
const outputPath = path.join(__dirname, 'city-restaurant-hotspots.json');
const outputData = {
  generatedAt: new Date().toISOString(),
  searchRadius: RADIUS,
  minimumRestaurants: MIN_RESTAURANTS,
  totalHotspots: hotspots.length,
  totalCitiesAnalyzed: cities.length,
  hotspots: hotspots
};

fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf8');

console.log(`\n✅ 出力完了: ${outputPath}`);
console.log(`📁 ファイルサイズ: ${Math.round(fs.statSync(outputPath).size / 1024)} KB`);

// 統計情報を表示
console.log('\n📈 統計情報:');
console.log(`   平均レストラン数（中心500m以内）: ${Math.round(hotspots.reduce((sum, s) => sum + s.restaurantCount, 0) / hotspots.length)}件`);
console.log(`   最大レストラン数: ${hotspots[0].restaurantCount}件 (${hotspots[0].cityName})`);
console.log(`   最小レストラン数: ${hotspots[hotspots.length - 1].restaurantCount}件`);

// 都道府県別の統計
const prefectureCounts = {};
hotspots.forEach(spot => {
  const pref = spot.cityName.match(/^(.*?[都道府県])/);
  if (pref) {
    const prefName = pref[1];
    prefectureCounts[prefName] = (prefectureCounts[prefName] || 0) + 1;
  }
});

console.log('\n📍 都道府県別ホットスポット数（トップ10）:');
Object.entries(prefectureCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .forEach(([pref, count], index) => {
    console.log(`   ${index + 1}. ${pref}: ${count}箇所`);
  });
