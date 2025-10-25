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
 * HTMLファイルがないJSON項目を削除
 */
async function cleanupJSONWithoutHTML() {
  console.log(`${colors.blue}=== HTMLファイルがないJSON項目を削除 ===${colors.reset}\n`);

  // JSONデータを読み込む
  const jsonPath = path.join(__dirname, 'data', 'regions-data-with-elevation.json');
  const regions = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  console.log(`📍 ${regions.length}箇所の地域データを読み込みました\n`);

  // regionsフォルダのパス
  const regionsDir = path.join(__dirname, 'data', 'regions');

  // HTMLファイルが存在する地域のみをフィルタリング
  const regionsWithHTML = [];
  const regionsWithoutHTML = [];

  for (const region of regions) {
    const fileName = (region.fileName || region.name).replace(/[\/\\:*?"<>|]/g, '_');
    const htmlPath = path.join(regionsDir, `${fileName}.html`);

    if (fs.existsSync(htmlPath)) {
      regionsWithHTML.push(region);
    } else {
      regionsWithoutHTML.push({ name: region.name, fileName });
    }
  }

  console.log(`${colors.green}✅ HTMLファイルあり: ${regionsWithHTML.length}箇所${colors.reset}`);
  console.log(`${colors.red}❌ HTMLファイルなし: ${regionsWithoutHTML.length}箇所${colors.reset}\n`);

  if (regionsWithoutHTML.length > 0) {
    console.log(`${colors.yellow}=== HTMLファイルがない地域 ===${colors.reset}`);
    regionsWithoutHTML.slice(0, 20).forEach(r => {
      console.log(`  - ${r.name} (${r.fileName})`);
    });
    if (regionsWithoutHTML.length > 20) {
      console.log(`  ... and ${regionsWithoutHTML.length - 20} more`);
    }
    console.log();

    // 更新されたJSONを保存
    fs.writeFileSync(jsonPath, JSON.stringify(regionsWithHTML, null, 2), 'utf8');
    console.log(`${colors.green}✅ JSONデータを更新: ${jsonPath}${colors.reset}`);
    console.log(`${colors.blue}📍 更新後の地域数: ${regionsWithHTML.length}箇所${colors.reset}\n`);
  }

  return regionsWithHTML;
}

// 実行
cleanupJSONWithoutHTML().catch(err => {
  console.error('エラー:', err);
  process.exit(1);
});
