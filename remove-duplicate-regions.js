const fs = require('fs');
const path = require('path');
const geolib = require('geolib');

// カラー表示用
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

/**
 * 重複地域を検出して削除
 */
async function removeDuplicateRegions() {
  console.log(`${colors.blue}=== 重複地域の検出と削除 ===${colors.reset}\n`);

  // 標高データを含むファイルから読み込む
  const elevationRegionsPath = path.join(__dirname, 'data', 'regions-data-with-elevation.json');
  let allRegions = [];

  if (fs.existsSync(elevationRegionsPath)) {
    console.log('📍 regions-data-with-elevation.json を読み込み中...');
    allRegions = JSON.parse(fs.readFileSync(elevationRegionsPath, 'utf8'));
    console.log(`   ✅ ${allRegions.length}箇所の標高データを読み込みました\n`);
  } else {
    console.error('❌ regions-data-with-elevation.json が見つかりません');
    process.exit(1);
  }

  console.log(`📊 合計: ${allRegions.length}箇所の地域データ\n`);

  // 重複検出（同じ地名で200m以内の地点）
  const uniqueRegions = [];
  const duplicates = [];
  const regionsDir = path.join(__dirname, 'data', 'regions');

  for (const region of allRegions) {
    const fileName = (region.fileName || region.name).replace(/[\/\\:*?"<>|]/g, '_');
    const htmlPath = path.join(regionsDir, `${fileName}.html`);

    // HTMLファイルが存在しない場合はスキップ
    if (!fs.existsSync(htmlPath)) {
      continue;
    }

    // 同じ名前で座標が近い地点を探す
    const existingSame = uniqueRegions.find(u => {
      if (u.name !== region.name) return false;

      const distance = geolib.getDistance(
        { latitude: u.lat, longitude: u.lng },
        { latitude: region.lat, longitude: region.lng }
      );

      return distance <= 200; // 200m以内（同じ駅名の場合）
    });

    if (existingSame) {
      duplicates.push({
        region,
        fileName,
        distance: geolib.getDistance(
          { latitude: existingSame.lat, longitude: existingSame.lng },
          { latitude: region.lat, longitude: region.lng }
        )
      });
    } else {
      uniqueRegions.push({
        ...region,
        fileName
      });
    }
  }

  console.log(`${colors.green}✅ ユニーク地域: ${uniqueRegions.length}箇所${colors.reset}`);
  console.log(`${colors.red}❌ 重複地域: ${duplicates.length}箇所${colors.reset}\n`);

  // 重複の詳細を表示
  if (duplicates.length > 0) {
    console.log(`${colors.yellow}=== 重複地域の詳細 ===${colors.reset}\n`);

    const duplicatesByName = {};
    duplicates.forEach(dup => {
      if (!duplicatesByName[dup.region.name]) {
        duplicatesByName[dup.region.name] = [];
      }
      duplicatesByName[dup.region.name].push(dup);
    });

    for (const [name, dups] of Object.entries(duplicatesByName)) {
      console.log(`${colors.yellow}${name}${colors.reset}: ${dups.length}件の重複`);
      dups.forEach(dup => {
        console.log(`  - ${dup.fileName} (距離: ${dup.distance}m)`);
      });
    }
    console.log();

    // 重複ファイルを削除
    console.log(`${colors.blue}=== 重複ファイルを削除中 ===${colors.reset}\n`);
    let deletedCount = 0;

    for (const dup of duplicates) {
      const mainHtmlPath = path.join(regionsDir, `${dup.fileName}.html`);
      const mapHtmlPath = path.join(regionsDir, `${dup.fileName}-map.html`);

      if (fs.existsSync(mainHtmlPath)) {
        fs.unlinkSync(mainHtmlPath);
        deletedCount++;
        console.log(`${colors.red}✗${colors.reset} ${dup.fileName}.html を削除`);
      }

      if (fs.existsSync(mapHtmlPath)) {
        fs.unlinkSync(mapHtmlPath);
        console.log(`${colors.red}✗${colors.reset} ${dup.fileName}-map.html を削除`);
      }
    }

    console.log(`\n${colors.green}✅ ${deletedCount}ペアのHTMLファイルを削除しました${colors.reset}\n`);
  }

  // 統合後のregions-data.jsonを保存（標高データ含む）
  const outputPath = path.join(__dirname, 'data', 'regions-data-with-elevation.json');
  fs.writeFileSync(outputPath, JSON.stringify(uniqueRegions, null, 2), 'utf8');
  console.log(`${colors.green}✅ ユニーク地域データを保存: ${outputPath}${colors.reset}\n`);

  return uniqueRegions;
}

// 実行
removeDuplicateRegions().catch(err => {
  console.error('エラー:', err);
  process.exit(1);
});
