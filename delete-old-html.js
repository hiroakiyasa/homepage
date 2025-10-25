const fs = require('fs');
const path = require('path');

const regionsDir = path.join(__dirname, 'data', 'regions');

// 基準日時: 2025-10-25 00:43:00
const cutoffDate = new Date('2025-10-25T00:43:00');

console.log(`📅 基準日時: ${cutoffDate.toLocaleString('ja-JP')}`);
console.log('この日時より前のHTMLファイルを削除します\n');

const allFiles = fs.readdirSync(regionsDir).filter(f => f.endsWith('.html'));

let deletedCount = 0;
const deletedRegions = new Set();

for (const file of allFiles) {
  const filePath = path.join(regionsDir, file);
  const stats = fs.statSync(filePath);

  if (stats.mtime < cutoffDate) {
    // 地域名を抽出
    const regionName = file.replace(/-map\.html$/, '').replace(/\.html$/, '');

    // 削除
    fs.unlinkSync(filePath);
    deletedCount++;

    if (!deletedRegions.has(regionName)) {
      console.log(`   ❌ ${regionName} (${stats.mtime.toLocaleString('ja-JP')})`);
      deletedRegions.add(regionName);
    }
  }
}

console.log(`\n✅ ${deletedCount}個のファイルを削除しました`);
console.log(`📍 削除した地域数: ${deletedRegions.size}`);

// 削除後の状態を確認
const remainingFiles = fs.readdirSync(regionsDir).filter(f => f.endsWith('.html'));
const remainingRegions = new Set();
for (const file of remainingFiles) {
  const regionName = file.replace(/-map\.html$/, '').replace(/\.html$/, '');
  remainingRegions.add(regionName);
}

console.log(`\n📁 残りのHTMLファイル数: ${remainingFiles.length}`);
console.log(`📍 残りの地域数: ${remainingRegions.size}`);
