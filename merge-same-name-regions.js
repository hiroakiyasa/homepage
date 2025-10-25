const fs = require('fs');
const path = require('path');

// カラー表示用
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

/**
 * 同じ名前の地域を1つに統合（最も良いものを保持）
 */
async function mergeSameNameRegions() {
  console.log(`${colors.blue}=== 同じ名前の地域を統合 ===${colors.reset}\n`);

  // JSONデータを読み込む
  const jsonPath = path.join(__dirname, 'data', 'regions-data-with-elevation.json');
  const regions = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  console.log(`📍 ${regions.length}箇所の地域データを読み込みました\n`);

  // 名前ごとにグループ化
  const regionsByName = {};
  regions.forEach(region => {
    if (!regionsByName[region.name]) {
      regionsByName[region.name] = [];
    }
    regionsByName[region.name].push(region);
  });

  // 重複している地域名を表示
  const duplicateNames = Object.keys(regionsByName).filter(name => regionsByName[name].length > 1);
  console.log(`${colors.yellow}📊 重複している地域名: ${duplicateNames.length}件${colors.reset}\n`);

  if (duplicateNames.length > 0) {
    console.log(`${colors.yellow}=== 重複地域の詳細 ===${colors.reset}`);
    duplicateNames.forEach(name => {
      console.log(`\n${colors.yellow}${name}${colors.reset}: ${regionsByName[name].length}件`);
      regionsByName[name].forEach((r, idx) => {
        console.log(`  ${idx + 1}. lat: ${r.lat}, lng: ${r.lng}, restaurants: ${r.restaurantCount || 0}, elevation: ${r.elevation || 0}m`);
      });
    });
    console.log();
  }

  // 各名前について最も良い1件を選択
  const mergedRegions = [];
  let mergedCount = 0;

  Object.keys(regionsByName).forEach(name => {
    const group = regionsByName[name];

    if (group.length === 1) {
      // 重複なし、そのまま保持
      mergedRegions.push(group[0]);
    } else {
      // 重複あり、最も良いものを選択
      // 優先順位: 1) restaurantCount が多い, 2) 標高データがある, 3) 最初のもの
      const best = group.reduce((prev, curr) => {
        const prevScore = (prev.restaurantCount || 0) * 100 + (prev.elevation !== undefined ? 10 : 0);
        const currScore = (curr.restaurantCount || 0) * 100 + (curr.elevation !== undefined ? 10 : 0);
        return currScore > prevScore ? curr : prev;
      });

      mergedRegions.push(best);
      mergedCount += group.length - 1;
    }
  });

  console.log(`${colors.green}✅ 統合前: ${regions.length}箇所${colors.reset}`);
  console.log(`${colors.blue}📊 統合後: ${mergedRegions.length}箇所${colors.reset}`);
  console.log(`${colors.yellow}♻️  統合された地域: ${mergedCount}箇所${colors.reset}\n`);

  // 更新されたJSONを保存
  fs.writeFileSync(jsonPath, JSON.stringify(mergedRegions, null, 2), 'utf8');
  console.log(`${colors.green}✅ JSONデータを更新: ${jsonPath}${colors.reset}\n`);

  return mergedRegions;
}

// 実行
mergeSameNameRegions().catch(err => {
  console.error('エラー:', err);
  process.exit(1);
});
