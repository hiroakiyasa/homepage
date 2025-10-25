const fs = require('fs');
const path = require('path');
const https = require('https');

console.log('🚉 OpenStreetMapから日本全国の駅データを取得中...\n');

// Overpass APIクエリ
// railway=station: 鉄道駅
// railway=halt: 停留所
const overpassQuery = `
[out:json][timeout:90];
area["ISO3166-1"="JP"][admin_level=2];
(
  node["railway"="station"](area);
  node["railway"="halt"](area);
);
out body;
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

async function fetchStationsFromOSM() {
  try {
    console.log('📡 Overpass APIにリクエスト送信中...');
    console.log('⏳ 日本全国のデータ取得には1-2分かかる場合があります...\n');

    const postData = `data=${encodeURIComponent(overpassQuery)}`;
    const response = await makeRequest(overpassUrl, postData);
    const data = JSON.parse(response);

    console.log(`✅ OpenStreetMapから${data.elements.length}件の駅を取得\n`);

    const stations = [];
    const processedNames = new Set(); // 重複除去用

    data.elements.forEach(element => {
      if (!element.lat || !element.lon || !element.tags) {
        return;
      }

      // 名前を取得（日本語名を優先）
      const name = element.tags['name:ja'] || element.tags.name;
      if (!name) {
        return;
      }

      // 鉄道事業者を取得
      const operator = element.tags['operator:ja'] || element.tags.operator || '';

      // 路線名を取得
      const line = element.tags['line:ja'] || element.tags.line || '';

      // 駅のタイプ
      const railwayType = element.tags.railway; // station or halt

      // 都道府県・市区町村情報
      const prefecture = element.tags['addr:prefecture'] || element.tags['is_in:prefecture'] || '';
      const city = element.tags['addr:city'] || '';

      // 重複チェック（同じ名前+座標の組み合わせ）
      const key = `${name}_${element.lat}_${element.lon}`;
      if (processedNames.has(key)) {
        return;
      }
      processedNames.add(key);

      stations.push({
        stationName: name,
        latitude: element.lat,
        longitude: element.lon,
        operator: operator,
        line: line,
        railwayType: railwayType,
        prefecture: prefecture,
        city: city,
        osmId: element.id,
        fullName: operator ? `${operator} ${name}` : name
      });
    });

    console.log(`📊 処理結果: ${stations.length}件の駅を抽出\n`);

    // 駅タイプごとの統計
    const typeCounts = {};
    stations.forEach(station => {
      typeCounts[station.railwayType] = (typeCounts[station.railwayType] || 0) + 1;
    });

    console.log('📈 駅タイプ別の内訳:');
    Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        const label = type === 'station' ? '駅' : type === 'halt' ? '停留所' : type;
        console.log(`   ${type} (${label}): ${count}件`);
    });

    // 名前でソート
    stations.sort((a, b) => {
      return a.stationName.localeCompare(b.stationName, 'ja');
    });

    // トップ30を表示
    console.log('\n🚉 取得した駅（最初の30件）:\n');
    stations.slice(0, 30).forEach((station, index) => {
      const displayName = station.operator ? `${station.operator} ${station.stationName}` : station.stationName;
      console.log(`${index + 1}. ${displayName} (${station.latitude.toFixed(6)}, ${station.longitude.toFixed(6)})`);
    });

    // 事業者別の統計（トップ15）
    const operatorCounts = {};
    stations.forEach(station => {
      if (station.operator) {
        operatorCounts[station.operator] = (operatorCounts[station.operator] || 0) + 1;
      }
    });

    console.log('\n🚊 鉄道事業者別の駅数（トップ15）:');
    Object.entries(operatorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .forEach(([operator, count], index) => {
        console.log(`   ${index + 1}. ${operator}: ${count}駅`);
      });

    // JSONファイルに出力
    const outputPath = path.join(__dirname, 'japan-stations-from-osm.json');
    const outputData = {
      generatedAt: new Date().toISOString(),
      dataSource: 'OpenStreetMap Overpass API',
      totalStations: stations.length,
      query: overpassQuery.trim(),
      note: 'OpenStreetMapから取得した日本全国の鉄道駅データ。railway=station（駅）とrailway=halt（停留所）を含む。',
      stations: stations
    };

    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf8');

    console.log(`\n✅ 出力完了: ${outputPath}`);
    console.log(`📁 ファイルサイズ: ${Math.round(fs.statSync(outputPath).size / 1024)} KB`);

    console.log('\n📋 各駅データに含まれる情報:');
    console.log('   - stationName: 駅名');
    console.log('   - latitude: 緯度');
    console.log('   - longitude: 経度');
    console.log('   - operator: 鉄道事業者');
    console.log('   - line: 路線名');
    console.log('   - railwayType: 駅タイプ (station=駅, halt=停留所)');
    console.log('   - prefecture: 都道府県');
    console.log('   - city: 市区町村');
    console.log('   - osmId: OpenStreetMap ID');
    console.log('   - fullName: 完全名称（事業者+駅名）');

    return stations;

  } catch (error) {
    console.error('❌ エラー:', error.message);
    throw error;
  }
}

// 実行
fetchStationsFromOSM()
  .then(() => {
    console.log('\n🎉 完了！');
  })
  .catch(error => {
    console.error('\n💥 処理が失敗しました:', error);
    process.exit(1);
  });
