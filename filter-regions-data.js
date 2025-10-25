const fs = require('fs');
const path = require('path');

/**
 * 駐車場データがない地域をregions-data.jsonから削除する
 */
async function filterRegionsData() {
  // 生成されたHTMLファイルのリストを読み込む
  const generatedFiles = fs.readFileSync('generated-regions-list.txt', 'utf8')
    .trim()
    .split('\n')
    .map(f => f.replace('.html', ''));

  console.log('📄 生成されたHTMLファイル数:', generatedFiles.length);

  // regions-data.jsonを読み込む
  const regionsDataPath = path.join(__dirname, 'data', 'regions-data.json');
  const regions = JSON.parse(fs.readFileSync(regionsDataPath, 'utf8'));

  console.log('📍 現在のregions-data.json地域数:', regions.length);

  // 生成されたHTMLファイルがある地域のみをフィルタリング
  const filteredRegions = regions.filter(r => {
    const hasHtml = generatedFiles.includes(r.fileName || r.name);
    if (!hasHtml) {
      console.log('   ❌ 削除:', r.name);
    }
    return hasHtml;
  });

  console.log('\n✅ フィルタリング後の地域数:', filteredRegions.length);
  console.log('🗑️  削除された地域数:', regions.length - filteredRegions.length);

  // バックアップを作成
  fs.writeFileSync(
    path.join(__dirname, 'data', 'regions-data.backup.json'),
    JSON.stringify(regions, null, 2),
    'utf8'
  );
  console.log('\n💾 バックアップを作成しました: regions-data.backup.json');

  // 新しいデータを保存
  fs.writeFileSync(
    regionsDataPath,
    JSON.stringify(filteredRegions, null, 2),
    'utf8'
  );
  console.log('💾 regions-data.jsonを更新しました');
}

// 実行
filterRegionsData().catch(err => {
  console.error('エラー:', err);
  process.exit(1);
});
