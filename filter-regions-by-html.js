const fs = require('fs');
const path = require('path');

// regions-data.jsonを読み込む
const regionsDataPath = path.join(__dirname, 'data', 'regions-data.json');
const regionsData = JSON.parse(fs.readFileSync(regionsDataPath, 'utf8'));

console.log(`📋 regions-data.json の地域数: ${regionsData.length}`);

// regionsディレクトリに存在するHTMLファイルを取得
const regionsDir = path.join(__dirname, 'data', 'regions');
const htmlFiles = fs.readdirSync(regionsDir)
  .filter(f => f.endsWith('.html') && !f.endsWith('-map.html'))
  .map(f => f.replace('.html', ''));

console.log(`📁 実際に存在するHTMLファイル数: ${htmlFiles.length}`);

// HTMLファイルが存在する地域のみをフィルタリング
const filteredRegions = regionsData.filter(region => {
  const fileName = region.fileName || region.name;
  const hasHtml = htmlFiles.includes(fileName);

  if (!hasHtml) {
    console.log(`   ❌ HTMLなし: ${region.name}`);
  }

  return hasHtml;
});

console.log(`\n✅ フィルタリング後の地域数: ${filteredRegions.length}`);

// バックアップを作成
const backupPath = path.join(__dirname, 'data', `regions-data.backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
fs.writeFileSync(backupPath, JSON.stringify(regionsData, null, 2), 'utf8');
console.log(`💾 バックアップを作成: ${path.basename(backupPath)}`);

// フィルタリング後のデータを保存
fs.writeFileSync(regionsDataPath, JSON.stringify(filteredRegions, null, 2), 'utf8');
console.log(`✅ regions-data.json を更新しました`);

console.log(`\n📊 削除した地域数: ${regionsData.length - filteredRegions.length}`);
