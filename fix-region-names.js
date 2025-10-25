const fs = require('fs');
const path = require('path');

/**
 * 不適切な地名（「×ランチ」など）を削除する
 */
async function fixRegionNames() {
  const regionsDataPath = path.join(__dirname, 'data', 'regions-data.json');

  // 既存の地域データを読み込む
  const regions = JSON.parse(fs.readFileSync(regionsDataPath, 'utf8'));
  console.log(`📍 現在の地域数: ${regions.length}`);

  // 削除すべき不適切な地名リスト
  const invalidNames = [
    '六本木×ランチ',
    '新宿×ランチ',
    '新宿×ラーメン',
    '新宿×居酒屋',
    '新宿×焼肉',
    '池袋×ランチ',
    '池袋×ラーメン',
    '池袋×焼肉',
    '渋谷×ランチ',
    '渋谷×ラーメン',
    '渋谷×居酒屋',
    '神保町×カレー',
    '表参道×ランチ',
    '銀座×ランチ',
    '銀座×寿司',
    '鎌倉×ランチ'
  ];

  // 不適切な地名を除外
  const filteredRegions = regions.filter(r => {
    if (invalidNames.includes(r.name)) {
      console.log(`   ❌ 削除: ${r.name}`);
      return false;
    }
    return true;
  });

  console.log(`\n✅ ${regions.length - filteredRegions.length}個の不適切な地名を削除しました`);
  console.log(`📊 残りの地域数: ${filteredRegions.length}`);

  // 保存
  fs.writeFileSync(regionsDataPath, JSON.stringify(filteredRegions, null, 2), 'utf8');

  return filteredRegions.length;
}

// 実行
fixRegionNames().catch(err => {
  console.error('エラー:', err);
  process.exit(1);
});
