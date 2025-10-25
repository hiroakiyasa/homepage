const fs = require('fs');
const path = require('path');

/**
 * 駐車場が2個以下の地域を洗い出す
 */
async function findLowParkingRegions() {
  const regionsDataPath = path.join(__dirname, 'data', 'regions-data.json');
  const regions = JSON.parse(fs.readFileSync(regionsDataPath, 'utf8'));

  console.log('📍 現在の地域数:', regions.length);
  console.log('\n🔍 駐車場数をチェック中...\n');

  const lowParkingRegions = [];

  for (const region of regions) {
    // Supabaseから駐車場データを取得する代わりに、
    // 生成されたHTMLファイルから駐車場数を数える
    const htmlPath = path.join(__dirname, 'data', 'regions', `${region.fileName || region.name}.html`);

    if (!fs.existsSync(htmlPath)) {
      console.log(`⚠️  ${region.name}: HTMLファイルなし`);
      continue;
    }

    const htmlContent = fs.readFileSync(htmlPath, 'utf8');

    // HTMLから駐車場情報のセクションを抽出
    const parkingMatches = htmlContent.match(/<div class="parking-card[^>]*>/g);
    const parkingCount = parkingMatches ? parkingMatches.length : 0;

    if (parkingCount <= 2) {
      lowParkingRegions.push({
        name: region.name,
        fileName: region.fileName || region.name,
        parkingCount: parkingCount
      });
      console.log(`❌ ${region.name}: 駐車場${parkingCount}個`);
    }
  }

  console.log('\n📊 結果:');
  console.log(`   駐車場2個以下の地域: ${lowParkingRegions.length}個`);
  console.log(`   残りの地域: ${regions.length - lowParkingRegions.length}個`);

  // リストを保存
  fs.writeFileSync(
    path.join(__dirname, 'low-parking-regions.json'),
    JSON.stringify(lowParkingRegions, null, 2),
    'utf8'
  );
  console.log('\n💾 リストを保存しました: low-parking-regions.json');

  return lowParkingRegions;
}

// 実行
findLowParkingRegions().catch(err => {
  console.error('エラー:', err);
  process.exit(1);
});
