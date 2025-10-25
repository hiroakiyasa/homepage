const fs = require('fs');
const path = require('path');

// regions-data.jsonを読み込む
const regionsDataPath = path.join(__dirname, 'data', 'regions-data.json');
const regionsData = JSON.parse(fs.readFileSync(regionsDataPath, 'utf8'));

// 有効な地域名のリストを作成
const validRegionNames = new Set(regionsData.map(r => r.fileName || r.name));

console.log(`📋 有効な地域数: ${validRegionNames.size}`);

// regionsディレクトリのすべてのHTMLファイルを取得
const regionsDir = path.join(__dirname, 'data', 'regions');
const allFiles = fs.readdirSync(regionsDir).filter(f => f.endsWith('.html'));

console.log(`📁 現在のHTMLファイル数: ${allFiles.length}`);

// 削除するファイルのリスト
const filesToDelete = [];

for (const file of allFiles) {
  // ファイル名から地域名を抽出（-map.htmlを除去）
  const regionName = file.replace(/-map\.html$/, '').replace(/\.html$/, '');

  // 有効な地域リストにない場合は削除対象
  if (!validRegionNames.has(regionName)) {
    filesToDelete.push(file);
  }
}

console.log(`\n🗑️  削除対象ファイル数: ${filesToDelete.length}\n`);

if (filesToDelete.length > 0) {
  console.log('削除する地域:');
  const deletedRegions = new Set();
  for (const file of filesToDelete) {
    const regionName = file.replace(/-map\.html$/, '').replace(/\.html$/, '');
    if (!deletedRegions.has(regionName)) {
      console.log(`   ❌ ${regionName}`);
      deletedRegions.add(regionName);
    }
  }

  console.log('\n削除を実行しています...');
  for (const file of filesToDelete) {
    const filePath = path.join(regionsDir, file);
    fs.unlinkSync(filePath);
  }

  console.log(`\n✅ ${filesToDelete.length}個のファイルを削除しました`);

  // 削除後のファイル数を確認
  const remainingFiles = fs.readdirSync(regionsDir).filter(f => f.endsWith('.html'));
  const remainingRegions = new Set();
  for (const file of remainingFiles) {
    const regionName = file.replace(/-map\.html$/, '').replace(/\.html$/, '');
    remainingRegions.add(regionName);
  }
  console.log(`📁 残りのHTMLファイル数: ${remainingFiles.length}`);
  console.log(`📍 残りの地域数: ${remainingRegions.size}`);
} else {
  console.log('✅ 削除する必要のあるファイルはありません');
}
