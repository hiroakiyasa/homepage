const fs = require('fs');
const path = require('path');
const https = require('https');

/**
 * 標高データを取得してregions-data.jsonに追加
 */
async function fetchElevationData() {
  // regions-data.jsonを読み込む
  const regionsDataPath = path.join(__dirname, 'data', 'regions-data.json');
  const regions = JSON.parse(fs.readFileSync(regionsDataPath, 'utf8'));

  console.log(`📍 ${regions.length}地域の標高データを取得します...`);

  // Open Elevation APIは一度に多数のリクエストを処理できるので、バッチで送信
  // ただし、安全のため50件ずつに分割
  const batchSize = 50;
  const batches = [];

  for (let i = 0; i < regions.length; i += batchSize) {
    batches.push(regions.slice(i, i + batchSize));
  }

  let updatedRegions = [];

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    console.log(`   バッチ ${batchIndex + 1}/${batches.length} (${batch.length}地域) を処理中...`);

    // APIリクエスト用のデータを準備
    const locations = batch.map(r => ({
      latitude: r.lat,
      longitude: r.lng
    }));

    try {
      const elevations = await fetchElevationBatch(locations);

      // 標高データを各地域に追加
      batch.forEach((region, index) => {
        const elevation = elevations[index];
        updatedRegions.push({
          ...region,
          elevation: elevation
        });
      });

      console.log(`   ✅ バッチ ${batchIndex + 1} 完了`);

      // API制限を避けるため、少し待機
      if (batchIndex < batches.length - 1) {
        await sleep(1000);
      }
    } catch (error) {
      console.error(`   ⚠️  バッチ ${batchIndex + 1} でエラー:`, error.message);
      // エラーの場合は標高0で追加
      batch.forEach(region => {
        updatedRegions.push({
          ...region,
          elevation: 0
        });
      });
    }
  }

  // 更新したデータを保存
  fs.writeFileSync(regionsDataPath, JSON.stringify(updatedRegions, null, 2), 'utf8');

  console.log(`✅ 標高データを追加しました: ${regionsDataPath}`);

  // 統計情報を表示
  const elevations = updatedRegions.map(r => r.elevation).filter(e => e > 0);
  const minElevation = Math.min(...elevations);
  const maxElevation = Math.max(...elevations);
  const avgElevation = elevations.reduce((a, b) => a + b, 0) / elevations.length;

  console.log(`\n📊 標高統計:`);
  console.log(`   最低標高: ${minElevation.toFixed(1)}m`);
  console.log(`   最高標高: ${maxElevation.toFixed(1)}m`);
  console.log(`   平均標高: ${avgElevation.toFixed(1)}m`);
}

/**
 * Open Elevation APIから標高データを取得（バッチ処理）
 */
function fetchElevationBatch(locations) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ locations });

    const options = {
      hostname: 'api.open-elevation.com',
      port: 443,
      path: '/api/v1/lookup',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.results) {
            const elevations = result.results.map(r => Math.round(r.elevation));
            resolve(elevations);
          } else {
            reject(new Error('Invalid response format'));
          }
        } catch (error) {
          reject(error);
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

/**
 * スリープ関数
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 実行
fetchElevationData().catch(err => {
  console.error('エラー:', err);
  process.exit(1);
});
