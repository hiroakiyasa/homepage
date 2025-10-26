const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function testRPC() {
  console.log('RPCの温泉データをテスト中...\n');

  const minLat = 35.677;
  const maxLat = 35.717;
  const minLng = 139.394;
  const maxLng = 139.434;

  const parkingStart = new Date();
  parkingStart.setHours(18, 0, 0, 0);
  const durationMinutes = 840; // 14時間

  const { data: parkingSpots, error } = await supabase.rpc('get_parking_spots_sorted_by_fee', {
    min_lat: minLat,
    max_lat: maxLat,
    min_lng: minLng,
    max_lng: maxLng,
    duration_minutes: durationMinutes,
    parking_start: parkingStart.toISOString()
  });

  if (error) {
    console.error('RPCエラー:', error);
    return;
  }

  console.log(`取得した駐車場数: ${parkingSpots.length}\n`);

  // 最初の3つの駐車場の温泉情報を確認
  parkingSpots.slice(0, 10).forEach((spot, i) => {
    console.log(`${i + 1}. ${spot.name}`);
    console.log(`   nearest_hotspring:`, spot.nearest_hotspring);

    if (spot.nearest_hotspring) {
      const onsen = spot.nearest_hotspring;
      console.log(`   温泉タイプ: ${typeof onsen}`);

      if (typeof onsen === 'string') {
        console.log(`   温泉は文字列（JSON）です`);
        try {
          const parsed = JSON.parse(onsen);
          console.log(`   パース後:`, parsed);
          console.log(`   パース後のname: ${parsed.name}`);
        } catch (e) {
          console.log(`   パースエラー:`, e.message);
        }
      } else {
        console.log(`   温泉name: ${onsen.name}`);
        console.log(`   温泉id: ${onsen.id}`);
      }
    }
    console.log('');
  });
}

testRPC().then(() => process.exit(0));
