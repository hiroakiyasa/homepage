const fs = require('fs');
const path = require('path');

/**
 * 駐車場が2個以下の地域をregions-data.jsonから削除
 */
async function removeLowParkingRegions() {
  const regionsDataPath = path.join(__dirname, 'data', 'regions-data.json');
  const regions = JSON.parse(fs.readFileSync(regionsDataPath, 'utf8'));

  // 駐車場が2個以下の地域リストを読み込む
  const lowParkingRegions = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'low-parking-regions.json'), 'utf8')
  );

  const lowParkingNames = new Set(lowParkingRegions.map(r => r.name));

  console.log('📍 現在の地域数:', regions.length);
  console.log('❌ 削除する地域数:', lowParkingRegions.length);
  console.log('');

  // フィルタリング
  const filteredRegions = regions.filter(r => {
    if (lowParkingNames.has(r.name)) {
      console.log(`   ❌ 削除: ${r.name}`);
      return false;
    }
    return true;
  });

  console.log('');
  console.log('✅ 残りの地域数:', filteredRegions.length);

  // バックアップを作成
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.writeFileSync(
    path.join(__dirname, 'data', `regions-data.backup-${timestamp}.json`),
    JSON.stringify(regions, null, 2),
    'utf8'
  );
  console.log(`💾 バックアップを作成しました: regions-data.backup-${timestamp}.json`);

  // 保存
  fs.writeFileSync(
    regionsDataPath,
    JSON.stringify(filteredRegions, null, 2),
    'utf8'
  );
  console.log('💾 regions-data.jsonを更新しました');
}

// 実行
removeLowParkingRegions().catch(err => {
  console.error('エラー:', err);
  process.exit(1);
});
