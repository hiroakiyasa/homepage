const fs = require('fs');
const path = require('path');
const { fetchAllData } = require('./src/otaruDataFetcher');

async function main() {
  try {
    console.log('=== 小樽雪あかりの路 駐車場データ更新 ===\n');

    // データ取得
    const data = await fetchAllData();

    // JSONファイルに保存
    const outputPath = path.join(__dirname, 'data', 'otaru-parking-data.json');
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf8');

    console.log(`\n✅ データ取得完了: ${outputPath}`);
    console.log(`駐車場数: ${data.parkingSpots.length}件`);
    console.log(`レストラン数: ${data.topRestaurants.length}件\n`);

    // サマリーを表示
    console.log('=== 駐車場一覧 (18:00〜8:00 料金・安い順) ===');
    data.parkingSpots.forEach((spot, index) => {
      console.log(`${index + 1}. ${spot.name}`);
      console.log(`   料金: ¥${spot.overnight_fee}`);
      console.log(`   距離: ${spot.distance_to_event}m (徒歩約${spot.walking_minutes}分)`);
      console.log(`   周辺施設: コンビニ${spot.facilities.convenience_stores.length}件, トイレ${spot.facilities.toilets.length}件, 温泉${spot.facilities.hot_springs.length}件`);
      console.log(`   レストラン: ${spot.restaurants.length}件`);
      console.log('');
    });

    console.log('=== 周辺レストラン（イベント中心から300m以内・スコア順） ===');
    data.topRestaurants.forEach((restaurant, index) => {
      console.log(`${index + 1}. ${restaurant.name}`);
      console.log(`   評価: ${restaurant.rating || 'N/A'}`);
      console.log(`   距離: ${restaurant.distance}m`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

main();
