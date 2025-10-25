const fs = require('fs');
const path = require('path');

// 住所から市区町村名を抽出（詳細版）
function extractCityInfo(address) {
  if (!address) return null;

  // 都道府県を抽出
  const prefMatch = address.match(/^(北海道|.*?[都道府県])/);
  if (!prefMatch) return null;

  const prefecture = prefMatch[1];
  const afterPref = address.substring(prefecture.length);

  // 市区町村を抽出
  // パターン1: ○○市、○○区、○○町、○○村
  const cityMatch = afterPref.match(/^(.*?[市区町村])/);
  if (cityMatch) {
    return {
      prefecture: prefecture,
      city: cityMatch[1],
      fullName: prefecture + cityMatch[1]
    };
  }

  // パターン2: 郡 + 町村
  const gunMatch = afterPref.match(/^(.*?郡)(.*?[町村])/);
  if (gunMatch) {
    return {
      prefecture: prefecture,
      city: gunMatch[1] + gunMatch[2],
      fullName: prefecture + gunMatch[1] + gunMatch[2]
    };
  }

  return null;
}

console.log('🗾 レストランデータから全国の市区町村を抽出中...\n');

// レストランデータを読み込む
const restaurantsDataPath = '/Users/user/WebApp/camping_note/★all-restaurants-with-ids.json';
const restaurantsJson = JSON.parse(fs.readFileSync(restaurantsDataPath, 'utf8'));
const restaurants = restaurantsJson.restaurants;

console.log(`🍴 レストラン総数: ${restaurants.length.toLocaleString()}\n`);

// 市区町村ごとにレストランをグループ化
const cityData = {};

let processedCount = 0;
let validAddressCount = 0;

restaurants.forEach((restaurant, index) => {
  if (!restaurant.address || !restaurant.latitude || !restaurant.longitude) {
    return;
  }

  validAddressCount++;

  const cityInfo = extractCityInfo(restaurant.address);
  if (!cityInfo) {
    return;
  }

  const key = cityInfo.fullName;

  if (!cityData[key]) {
    cityData[key] = {
      prefecture: cityInfo.prefecture,
      cityName: cityInfo.city,
      fullName: cityInfo.fullName,
      restaurants: [],
      latSum: 0,
      lngSum: 0
    };
  }

  cityData[key].restaurants.push({
    lat: restaurant.latitude,
    lng: restaurant.longitude
  });
  cityData[key].latSum += restaurant.latitude;
  cityData[key].lngSum += restaurant.longitude;

  processedCount++;

  if ((index + 1) % 5000 === 0) {
    console.log(`   進捗: ${index + 1}/${restaurants.length}`);
  }
});

console.log(`\n✅ 有効な住所: ${validAddressCount.toLocaleString()}件`);
console.log(`✅ 抽出した市区町村数: ${Object.keys(cityData).length}箇所\n`);

// 中心座標を計算
const allCities = Object.values(cityData).map(city => {
  const count = city.restaurants.length;
  return {
    prefecture: city.prefecture,
    cityName: city.cityName,
    fullName: city.fullName,
    latitude: city.latSum / count,
    longitude: city.lngSum / count,
    restaurantCount: count
  };
});

// レストラン数でソート
allCities.sort((a, b) => b.restaurantCount - a.restaurantCount);

console.log('📊 レストラン数トップ20の市区町村:\n');
allCities.slice(0, 20).forEach((city, index) => {
  console.log(`${index + 1}. ${city.fullName}: ${city.restaurantCount}件`);
});

// 都道府県別の統計
const prefectureCounts = {};
allCities.forEach(city => {
  prefectureCounts[city.prefecture] = (prefectureCounts[city.prefecture] || 0) + 1;
});

console.log('\n📍 都道府県別の市区町村数（トップ15）:\n');
Object.entries(prefectureCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 15)
  .forEach(([pref, count]) => {
    console.log(`   ${pref}: ${count}箇所`);
  });

// JSONファイルに出力
const outputPath = path.join(__dirname, 'japan-all-cities-complete.json');
const outputData = {
  generatedAt: new Date().toISOString(),
  totalCities: allCities.length,
  totalPrefectures: Object.keys(prefectureCounts).length,
  dataSource: 'レストラン住所から抽出',
  note: 'レストランが存在する全市区町村のデータ。中心座標はその市区町村内の全レストランの平均位置です。',
  cities: allCities
};

fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf8');

console.log(`\n✅ 出力完了: ${outputPath}`);
console.log(`📁 ファイルサイズ: ${Math.round(fs.statSync(outputPath).size / 1024)} KB`);

console.log('\n📋 各市区町村データに含まれる情報:');
console.log('   - prefecture: 都道府県名');
console.log('   - cityName: 市区町村名');
console.log('   - fullName: 完全名称（都道府県+市区町村）');
console.log('   - latitude: 中心座標の緯度（市内全レストランの平均）');
console.log('   - longitude: 中心座標の経度（市内全レストランの平均）');
console.log('   - restaurantCount: その市区町村内のレストラン数');

console.log('\n📈 統計:');
console.log(`   総市区町村数: ${allCities.length}箇所`);
console.log(`   総都道府県数: ${Object.keys(prefectureCounts).length}箇所`);
console.log(`   平均レストラン数: ${Math.round(allCities.reduce((sum, c) => sum + c.restaurantCount, 0) / allCities.length)}件/市区町村`);
