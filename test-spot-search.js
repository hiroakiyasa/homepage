const fs = require('fs');
const supabase = require('./src/supabaseClient');

console.log('🗾 テスト: 最初の10件のスポットを処理中...\n');

// スポットデータを読み込む
const spotsDataPath = '/Users/user/WebApp/camping_note/camping-spot-publisher/all-restaurant-spots.json';
const spotsData = JSON.parse(fs.readFileSync(spotsDataPath, 'utf8'));
const allSpots = spotsData.spots.slice(0, 10); // 最初の10件のみ

console.log(`📍 テスト対象: ${allSpots.length}件\n`);

async function test() {
  for (let i = 0; i < allSpots.length; i++) {
    const spot = allSpots[i];
    console.log(`${i + 1}. ${spot.name} (${spot.type}) - 処理中...`);

    try {
      const latDiff = 0.0045;
      const lngDiff = 0.0045;
      const parkingStart = new Date();
      parkingStart.setDate(parkingStart.getDate() + 7);
      parkingStart.setHours(12, 0, 0, 0);
      const durationMinutes = 1440;

      const { data: parkingSpots, error } = await supabase.rpc('get_parking_spots_sorted_by_fee', {
        min_lat: spot.latitude - latDiff,
        max_lat: spot.latitude + latDiff,
        min_lng: spot.longitude - lngDiff,
        max_lng: spot.longitude + lngDiff,
        duration_minutes: durationMinutes,
        parking_start: parkingStart.toISOString()
      });

      if (error) {
        console.log(`   ❌ エラー: ${error.message}`);
        continue;
      }

      if (parkingSpots && parkingSpots.length > 0) {
        console.log(`   ✅ 駐車場: ${parkingSpots.length}箇所`);
      } else {
        console.log(`   ⚠️  駐車場なし`);
      }

      await new Promise(resolve => setTimeout(resolve, 200));

    } catch (err) {
      console.log(`   ❌ 例外: ${err.message}`);
    }
  }
}

test().then(() => {
  console.log('\n✅ テスト完了！');
  process.exit(0);
}).catch(err => {
  console.error('\n❌ テスト失敗:', err);
  process.exit(1);
});
