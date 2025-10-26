const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jhqnypyxrkwdrgutzttf.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocW55cHl4cmt3ZHJndXR6dHRmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTE1OTkyMiwiZXhwIjoyMDcwNzM1OTIyfQ.RYzOyy09wv5G2tB4u2ykZMgBUY_uh7vJP030wAFwpmw';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function fixToyotaParkingFees() {
  console.log('🔧 豊田市の駐車場料金を修正中...\n');

  // 第1駐車場 (ID: 6676)
  const parking1Rates = [
    { type: 'base', price: 150, minutes: 30 },
    { type: 'max', price: 250, minutes: 330, time_range: '1:00～6:30' }
  ];

  console.log('📍 第1駐車場 (ID: 6676) を更新中...');
  const { data: data1, error: error1 } = await supabase
    .from('parking_spots')
    .update({ rates: parking1Rates })
    .eq('id', 6676)
    .select();

  if (error1) {
    console.error('❌ 第1駐車場の更新エラー:', error1);
  } else {
    console.log('✅ 第1駐車場を更新しました');
    console.log('   料金: 150円/30分、夜間最大250円（1:00-6:30）\n');
  }

  // 第2駐車場 (ID: 6677)
  const parking2Rates = [
    { type: 'base', price: 150, minutes: 30, time_range: '7:00～23:00' },
    { type: 'max', price: 400, minutes: 480, time_range: '23:00～7:00' }
  ];

  console.log('📍 第2駐車場 (ID: 6677) を更新中...');
  const { data: data2, error: error2 } = await supabase
    .from('parking_spots')
    .update({ rates: parking2Rates })
    .eq('id', 6677)
    .select();

  if (error2) {
    console.error('❌ 第2駐車場の更新エラー:', error2);
  } else {
    console.log('✅ 第2駐車場を更新しました');
    console.log('   料金: 150円/30分（7:00-23:00）、夜間最大400円（23:00-7:00）\n');
  }

  // 若宮駐車場 (ID: 38432)
  const wakamiyaRates = [
    { type: 'base', price: 150, minutes: 30, time_range: '7:00～23:00' },
    { type: 'max', price: 400, minutes: 480, time_range: '23:00～7:00' }
  ];

  console.log('📍 若宮駐車場 (ID: 38432) を更新中...');
  const { data: data3, error: error3 } = await supabase
    .from('parking_spots')
    .update({ rates: wakamiyaRates })
    .eq('id', 38432)
    .select();

  if (error3) {
    console.error('❌ 若宮駐車場の更新エラー:', error3);
  } else {
    console.log('✅ 若宮駐車場を更新しました');
    console.log('   料金: 150円/30分（7:00-23:00）、夜間最大400円（23:00-7:00）\n');
  }

  // 更新結果を確認
  console.log('📊 更新結果を確認中...\n');
  const { data: results, error: queryError } = await supabase
    .from('parking_spots')
    .select('id, name, rates')
    .in('id', [6676, 6677, 38432])
    .order('id');

  if (queryError) {
    console.error('❌ 確認クエリエラー:', queryError);
  } else {
    console.log('✅ 更新後のデータ:');
    results.forEach(parking => {
      console.log(`\n   ${parking.name} (ID: ${parking.id}):`);
      console.log('   料金体系:', JSON.stringify(parking.rates, null, 2));
    });
  }

  console.log('\n✅ すべての更新が完了しました！');
}

fixToyotaParkingFees().catch(err => {
  console.error('❌ エラー:', err);
  process.exit(1);
});
