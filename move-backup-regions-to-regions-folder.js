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

async function main() {
  console.log(`${colors.blue}=== regions-data.backupの地域をregionsフォルダに移動 ===${colors.reset}\n`);

  // バックアップJSONファイルを読み込む
  const backupRegionsPath = path.join(__dirname, 'data', 'regions-data.backup-2025-10-24T15-58-43-523Z.json');
  const backupRegions = JSON.parse(fs.readFileSync(backupRegionsPath, 'utf8'));

  console.log(`📍 ${backupRegions.length}箇所の地域データを読み込みました\n`);

  const parkingSpotsDir = path.join(__dirname, 'data', 'parking-spots');
  const regionsDir = path.join(__dirname, 'data', 'regions');

  let movedCount = 0;
  let notFoundCount = 0;

  for (const region of backupRegions) {
    const name = region.name;
    const fileName = (region.fileName || name).replace(/[\/\\:*?"<>|]/g, '_');

    // メインHTMLファイルとマップHTMLファイルのパス
    const mainHtmlSource = path.join(parkingSpotsDir, `${fileName}.html`);
    const mapHtmlSource = path.join(parkingSpotsDir, `${fileName}-map.html`);

    const mainHtmlDest = path.join(regionsDir, `${fileName}.html`);
    const mapHtmlDest = path.join(regionsDir, `${fileName}-map.html`);

    // ファイルが存在するか確認して移動
    if (fs.existsSync(mainHtmlSource) && fs.existsSync(mapHtmlSource)) {
      // 既存ファイルがある場合は上書き
      fs.renameSync(mainHtmlSource, mainHtmlDest);
      fs.renameSync(mapHtmlSource, mapHtmlDest);

      movedCount++;
      console.log(`${colors.green}✓${colors.reset} ${fileName}: 移動完了`);
    } else {
      notFoundCount++;
      console.log(`${colors.yellow}⚠${colors.reset} ${fileName}: ファイルが見つかりません`);
    }
  }

  console.log(`\n${colors.blue}=== 移動完了 ===${colors.reset}`);
  console.log(`${colors.green}移動成功: ${movedCount}件${colors.reset}`);
  console.log(`${colors.yellow}見つからず: ${notFoundCount}件${colors.reset}`);
}

main().catch(console.error);
