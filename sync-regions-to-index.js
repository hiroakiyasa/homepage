const fs = require('fs');
const path = require('path');
const https = require('https');

/**
 * 生成済みHTMLファイルと一致する地域データを統合し、
 * regions-data-with-elevation.jsonを更新する
 */

// 標高取得関数
function fetchElevation(lat, lng) {
  return new Promise((resolve) => {
    const url = `https://cyberjapandata2.gsi.go.jp/general/dem/scripts/getelevation.php?lon=${lng}&lat=${lat}&outtype=JSON`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.elevation || 0);
        } catch {
          resolve(0);
        }
      });
    }).on('error', () => resolve(0));

    // タイムアウト
    setTimeout(() => resolve(0), 5000);
  });
}

async function syncRegionsToIndex() {
  console.log('🔄 地域データを統合中...\n');

  // 1. 生成済みHTMLファイル一覧を取得
  const regionsDir = path.join(__dirname, 'data', 'regions');
  const files = fs.readdirSync(regionsDir);
  const htmlFiles = files.filter(f => f.endsWith('.html') && !f.endsWith('-map.html'));
  const generatedFileNames = new Set(htmlFiles.map(f => f.replace('.html', '')));

  console.log(`   ✅ 生成済みHTMLファイル: ${generatedFileNames.size}件\n`);

  // 2. 両データソースを読み込み
  const restaurantSpotsPath = path.join(__dirname, 'all-restaurant-spots.json');
  const backupRegionsPath = path.join(__dirname, 'data', 'regions-data.backup-2025-10-24T15-58-43-523Z.json');

  let allRegions = [];

  // all-restaurant-spots.jsonから読み込み
  if (fs.existsSync(restaurantSpotsPath)) {
    const restaurantData = JSON.parse(fs.readFileSync(restaurantSpotsPath, 'utf8'));
    const spots = restaurantData.spots || [];
    console.log(`   📍 all-restaurant-spots.json: ${spots.length}件`);

    allRegions = allRegions.concat(spots.map(spot => ({
      name: spot.name,
      lat: spot.latitude,
      lng: spot.longitude,
      fileName: spot.name,
      source: 'restaurant-spots'
    })));
  }

  // regions-data.backup-*.jsonから読み込み
  if (fs.existsSync(backupRegionsPath)) {
    const backupRegions = JSON.parse(fs.readFileSync(backupRegionsPath, 'utf8'));
    console.log(`   📍 regions-data.backup: ${backupRegions.length}件`);

    allRegions = allRegions.concat(backupRegions.map(region => ({
      name: region.name,
      lat: region.lat,
      lng: region.lng,
      fileName: region.fileName || region.name,
      source: 'backup'
    })));
  }

  console.log(`   📍 統合前の総地域数: ${allRegions.length}件\n`);

  // 3. 重複除去（同一name+lat+lngの地域）
  const regionMap = new Map();
  allRegions.forEach(region => {
    const key = `${region.name}_${region.lat}_${region.lng}`;
    if (!regionMap.has(key)) {
      regionMap.set(key, region);
    }
  });

  console.log(`   ✅ 座標ベース重複除去後: ${regionMap.size}件`);

  // 4. 同一名称の地域を1つに統合（最初の1つのみ残す）
  const nameMap = new Map();
  const duplicateNames = new Map();

  for (const region of regionMap.values()) {
    if (!nameMap.has(region.name)) {
      nameMap.set(region.name, region);
    } else {
      // 重複をカウント
      if (!duplicateNames.has(region.name)) {
        duplicateNames.set(region.name, 1);
      }
      duplicateNames.set(region.name, duplicateNames.get(region.name) + 1);
    }
  }

  if (duplicateNames.size > 0) {
    console.log(`   ⚠️  同一名称の重複を発見: ${duplicateNames.size}件`);
    const examples = Array.from(duplicateNames.entries()).slice(0, 10);
    examples.forEach(([name, count]) => {
      console.log(`      ${name}: ${count + 1}個`);
    });
  }

  console.log(`   ✅ 名称ベース重複除去後: ${nameMap.size}件\n`);

  // 5. 生成済みHTMLファイルと一致する地域のみをフィルタ
  const matchedRegions = [];
  const unmatchedFiles = [];

  for (const region of nameMap.values()) {
    const sanitizedFileName = region.fileName.replace(/[\/\\:*?"<>|]/g, '_');

    if (generatedFileNames.has(sanitizedFileName)) {
      matchedRegions.push({
        name: region.name,
        lat: region.lat,
        lng: region.lng,
        fileName: sanitizedFileName
      });
    }
  }

  // 生成されたがマッチしないファイルをチェック
  for (const fileName of generatedFileNames) {
    const found = matchedRegions.some(r => r.fileName === fileName);
    if (!found) {
      unmatchedFiles.push(fileName);
    }
  }

  console.log(`   ✅ HTMLファイルと一致した地域: ${matchedRegions.length}件`);
  if (unmatchedFiles.length > 0) {
    console.log(`   ⚠️  データソースに見つからないHTML: ${unmatchedFiles.length}件`);
    console.log(`   例: ${unmatchedFiles.slice(0, 5).join(', ')}...\n`);
  } else {
    console.log(`   ✅ すべてのHTMLファイルがマッチしました\n`);
  }

  // 6. 標高データを取得
  console.log('🏔️  標高データを取得中...\n');

  const regionsWithElevation = [];
  for (let i = 0; i < matchedRegions.length; i++) {
    const region = matchedRegions[i];
    const elevation = await fetchElevation(region.lat, region.lng);

    regionsWithElevation.push({
      ...region,
      elevation
    });

    // 進捗表示
    if ((i + 1) % 50 === 0 || i === matchedRegions.length - 1) {
      const percent = Math.round((i + 1) / matchedRegions.length * 100);
      console.log(`   進捗: ${i + 1}/${matchedRegions.length} (${percent}%)`);
    }

    // API負荷軽減のため200msの遅延
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  // 7. regions-data-with-elevation.jsonに保存
  const outputPath = path.join(__dirname, 'data', 'regions-data-with-elevation.json');
  fs.writeFileSync(outputPath, JSON.stringify(regionsWithElevation, null, 2));

  console.log(`\n💾 保存完了: ${outputPath}`);
  console.log(`   📊 総地域数: ${regionsWithElevation.length}件\n`);

  // 8. サンプル表示
  console.log('📍 地域データサンプル (最初の10件):');
  regionsWithElevation.slice(0, 10).forEach(r => {
    console.log(`   ${r.name} (${r.lat}, ${r.lng}) - 標高: ${r.elevation}m`);
  });

  return regionsWithElevation;
}

// 実行
syncRegionsToIndex().catch(err => {
  console.error('❌ エラー:', err);
  process.exit(1);
});
