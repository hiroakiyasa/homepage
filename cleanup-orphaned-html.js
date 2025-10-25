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
 * JSONにない孤立HTMLファイルを削除
 */
async function cleanupOrphanedHTML() {
  console.log(`${colors.blue}=== 孤立HTMLファイルのクリーンアップ ===${colors.reset}\n`);

  // JSONデータを読み込む
  const jsonPath = path.join(__dirname, 'data', 'regions-data-with-elevation.json');
  const regions = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  console.log(`📍 ${regions.length}箇所の地域データを読み込みました\n`);

  // 有効なファイル名のセットを作成
  const validFileNames = new Set();
  regions.forEach(region => {
    const fileName = (region.fileName || region.name).replace(/[\/\\:*?"<>|]/g, '_');
    validFileNames.add(fileName);
  });

  console.log(`${colors.blue}✓ ${validFileNames.size}個の有効なファイル名${colors.reset}\n`);

  // regionsフォルダ内の全HTMLファイルをチェック
  const regionsDir = path.join(__dirname, 'data', 'regions');
  const allFiles = fs.readdirSync(regionsDir).filter(f => f.endsWith('.html'));

  console.log(`${colors.yellow}📁 ${allFiles.length}個のHTMLファイルをチェック中...${colors.reset}\n`);

  let deletedCount = 0;

  for (const file of allFiles) {
    // ファイル名から-map.htmlを除去してベース名を取得
    const baseName = file.replace(/-map\.html$/, '').replace(/\.html$/, '');

    if (!validFileNames.has(baseName)) {
      const filePath = path.join(regionsDir, file);
      fs.unlinkSync(filePath);
      deletedCount++;
      console.log(`${colors.red}✗${colors.reset} ${file} を削除`);
    }
  }

  console.log(`\n${colors.green}✅ ${deletedCount}個の孤立HTMLファイルを削除しました${colors.reset}`);

  // 残りのファイル数を確認
  const remainingFiles = fs.readdirSync(regionsDir).filter(f => f.endsWith('.html'));
  console.log(`${colors.blue}📁 残りHTMLファイル: ${remainingFiles.length}個${colors.reset}`);
  console.log(`${colors.blue}📍 期待値: ${validFileNames.size * 2}個（各地域に main + map）${colors.reset}\n`);
}

// 実行
cleanupOrphanedHTML().catch(err => {
  console.error('エラー:', err);
  process.exit(1);
});
