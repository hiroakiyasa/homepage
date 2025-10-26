const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function testTachikawa() {
  console.log('立川北の温泉データをテスト中...\n');

  const lat = 35.697;
  const lng = 139.414;

  // 温泉取得（2km以内）
  const { data: hotSprings, error } = await supabase
    .from('hot_springs')
    .select('*')
    .gte('lat', lat - 0.02)
    .lte('lat', lat + 0.02)
    .gte('lng', lng - 0.02)
    .lte('lng', lng + 0.02);

  if (error) {
    console.error('エラー:', error);
    return;
  }

  console.log(`取得した温泉数: ${hotSprings.length}\n`);

  hotSprings.forEach((spring, i) => {
    console.log(`${i + 1}. ID: ${spring.id}`);
    console.log(`   名前: ${spring.name}`);
    console.log(`   座標: (${spring.lat}, ${spring.lng})`);
    console.log(`   name === undefined: ${spring.name === undefined}`);
    console.log(`   typeof name: ${typeof spring.name}`);
    console.log('');
  });
}

testTachikawa().then(() => process.exit(0));
