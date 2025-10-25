const fs = require('fs');
const path = require('path');
const https = require('https');

console.log('🗾 OpenStreetMapから日本全国の市区町村データを取得中...\n');

// Overpass APIクエリ
// admin_level=7: 市町村レベル
// admin_level=8: 区レベル（東京23区、政令指定都市の区など）
const overpassQuery = `
[out:json][timeout:90];
area["ISO3166-1"="JP"][admin_level=2];
(
  relation["boundary"="administrative"]["admin_level"="7"](area);
  relation["boundary"="administrative"]["admin_level"="8"](area);
);
out center;
`;

const overpassUrl = 'https://overpass-api.de/api/interpreter';

function makeRequest(url, postData) {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(url, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function fetchCitiesFromOSM() {
  try {
    console.log('📡 Overpass APIにリクエスト送信中...');
    console.log('⏳ 日本全国のデータ取得には1-2分かかる場合があります...\n');

    const postData = `data=${encodeURIComponent(overpassQuery)}`;
    const response = await makeRequest(overpassUrl, postData);
    const data = JSON.parse(response);

    console.log(`✅ OpenStreetMapから${data.elements.length}件の行政区域を取得\n`);

    const cities = [];
    const processedNames = new Set(); // 重複除去用

    data.elements.forEach(element => {
      if (!element.center || !element.tags) {
        return;
      }

      // 名前を取得（日本語名を優先）
      const name = element.tags['name:ja'] || element.tags.name;
      if (!name) {
        return;
      }

      // 都道府県名を取得
      let prefecture = '';

      // admin_levelに応じて都道府県を特定
      if (element.tags['is_in:prefecture']) {
        prefecture = element.tags['is_in:prefecture'];
      } else if (element.tags['addr:prefecture']) {
        prefecture = element.tags['addr:prefecture'];
      }

      // 重複チェック（同じ名前+座標の組み合わせ）
      const key = `${name}_${element.center.lat}_${element.center.lon}`;
      if (processedNames.has(key)) {
        return;
      }
      processedNames.add(key);

      cities.push({
        fullName: prefecture ? `${prefecture}${name}` : name,
        cityName: name,
        prefecture: prefecture || '',
        latitude: element.center.lat,
        longitude: element.center.lon,
        adminLevel: parseInt(element.tags.admin_level),
        osmId: element.id,
        osmType: element.type
      });
    });

    console.log(`📊 処理結果: ${cities.length}件の市区町村を抽出\n`);

    // admin_levelごとの統計
    const levelCounts = {};
    cities.forEach(city => {
      levelCounts[city.adminLevel] = (levelCounts[city.adminLevel] || 0) + 1;
    });

    console.log('📈 行政レベル別の内訳:');
    Object.entries(levelCounts)
      .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
      .forEach(([level, count]) => {
        const label = level === '7' ? '市町村' : level === '8' ? '区' : `レベル${level}`;
        console.log(`   admin_level=${level} (${label}): ${count}件`);
      });

    // 名前でソート
    cities.sort((a, b) => {
      if (a.prefecture !== b.prefecture) {
        return a.prefecture.localeCompare(b.prefecture, 'ja');
      }
      return a.cityName.localeCompare(b.cityName, 'ja');
    });

    // トップ20を表示
    console.log('\n📍 取得した市区町村（最初の20件）:\n');
    cities.slice(0, 20).forEach((city, index) => {
      console.log(`${index + 1}. ${city.fullName || city.cityName} (${city.latitude.toFixed(6)}, ${city.longitude.toFixed(6)})`);
    });

    // JSONファイルに出力
    const outputPath = path.join(__dirname, 'japan-cities-from-osm.json');
    const outputData = {
      generatedAt: new Date().toISOString(),
      dataSource: 'OpenStreetMap Overpass API',
      totalCities: cities.length,
      query: overpassQuery.trim(),
      note: 'OpenStreetMapから取得した日本全国の市区町村データ。admin_level=7（市町村）とadmin_level=8（区）を含む。',
      cities: cities
    };

    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf8');

    console.log(`\n✅ 出力完了: ${outputPath}`);
    console.log(`📁 ファイルサイズ: ${Math.round(fs.statSync(outputPath).size / 1024)} KB`);

    console.log('\n📋 各市区町村データに含まれる情報:');
    console.log('   - fullName: 完全名称（都道府県+市区町村）');
    console.log('   - cityName: 市区町村名');
    console.log('   - prefecture: 都道府県名');
    console.log('   - latitude: 中心座標の緯度');
    console.log('   - longitude: 中心座標の経度');
    console.log('   - adminLevel: 行政レベル (7=市町村, 8=区)');
    console.log('   - osmId: OpenStreetMap ID');
    console.log('   - osmType: OSM要素タイプ');

    return cities;

  } catch (error) {
    console.error('❌ エラー:', error.message);
    throw error;
  }
}

// 実行
fetchCitiesFromOSM()
  .then(() => {
    console.log('\n🎉 完了！');
  })
  .catch(error => {
    console.error('\n💥 処理が失敗しました:', error);
    process.exit(1);
  });
