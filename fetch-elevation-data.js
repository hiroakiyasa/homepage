const fs = require('fs');
const path = require('path');
const https = require('https');

// カラー表示用
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

/**
 * 国土地理院の標高APIから標高を取得
 */
function getElevation(lat, lng) {
  return new Promise((resolve) => {
    const url = `https://cyberjapandata2.gsi.go.jp/general/dem/scripts/getelevation.php?lon=${lng}&lat=${lat}&outtype=JSON`;

    https.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          // elevation が null の場合は 0 を返す
          const elevation = result.elevation !== null && result.elevation !== '-----'
            ? Math.round(parseFloat(result.elevation))
            : 0;
          resolve(elevation);
        } catch (err) {
          console.error(`   ${colors.red}✗${colors.reset} 標高取得エラー (${lat}, ${lng}):`, err.message);
          resolve(0);
        }
      });
    }).on('error', (err) => {
      console.error(`   ${colors.red}✗${colors.reset} API接続エラー:`, err.message);
      resolve(0);
    });
  });
}

/**
 * プログレスバーを表示
 */
function showProgress(current, total, regionName) {
  const percentage = ((current / total) * 100).toFixed(1);
  const barLength = 30;
  const filledLength = Math.round((current / total) * barLength);
  const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);

  process.stdout.write(`\r${colors.blue}[${bar}]${colors.reset} ${percentage}% (${current}/${total}) ${regionName.substring(0, 20)}...`);

  if (current === total) {
    process.stdout.write('\n');
  }
}

/**
 * 全地域の標高データを取得
 */
async function fetchElevationData() {
  console.log(`${colors.blue}=== 標高データ取得 ===${colors.reset}\n`);

  // ユニーク地域データを読み込む
  const uniqueRegionsPath = path.join(__dirname, 'data', 'regions-data-unique.json');

  if (!fs.existsSync(uniqueRegionsPath)) {
    console.error(`${colors.red}❌ regions-data-unique.json が見つかりません${colors.reset}`);
    process.exit(1);
  }

  const regions = JSON.parse(fs.readFileSync(uniqueRegionsPath, 'utf8'));
  console.log(`📍 ${regions.length}箇所の地域データを読み込みました\n`);

  console.log(`${colors.yellow}⏳ 標高データを取得中...（API制限のため時間がかかります）${colors.reset}\n`);

  // 標高データを取得
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < regions.length; i++) {
    const region = regions[i];

    try {
      const elevation = await getElevation(region.lat, region.lng);
      region.elevation = elevation;

      if (elevation > 0) {
        successCount++;
      } else {
        failCount++;
      }

      // プログレス表示
      showProgress(i + 1, regions.length, region.name);

      // API制限対策：200msの待機
      await new Promise(resolve => setTimeout(resolve, 200));

    } catch (err) {
      console.error(`\n${colors.red}✗${colors.reset} ${region.name}: ${err.message}`);
      region.elevation = 0;
      failCount++;
    }
  }

  console.log(`\n${colors.green}✅ 標高取得成功: ${successCount}箇所${colors.reset}`);
  console.log(`${colors.yellow}⚠️  標高取得失敗（海上など）: ${failCount}箇所${colors.reset}\n`);

  // 標高データを含むJSONを保存
  const outputPath = path.join(__dirname, 'data', 'regions-data-with-elevation.json');
  fs.writeFileSync(outputPath, JSON.stringify(regions, null, 2), 'utf8');
  console.log(`${colors.green}✅ 標高データを保存: ${outputPath}${colors.reset}\n`);

  // 標高の統計情報を表示
  const elevations = regions.map(r => r.elevation).filter(e => e > 0);
  if (elevations.length > 0) {
    const maxElevation = Math.max(...elevations);
    const minElevation = Math.min(...elevations);
    const avgElevation = Math.round(elevations.reduce((a, b) => a + b, 0) / elevations.length);

    console.log(`${colors.blue}=== 標高統計 ===${colors.reset}`);
    console.log(`  最高標高: ${maxElevation}m`);
    console.log(`  最低標高: ${minElevation}m`);
    console.log(`  平均標高: ${avgElevation}m\n`);
  }

  return regions;
}

// 実行
fetchElevationData().catch(err => {
  console.error('エラー:', err);
  process.exit(1);
});
