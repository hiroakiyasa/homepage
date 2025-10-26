// 豊田市のページだけを再生成
const { execSync } = require('child_process');

const regionData = {
  name: '豊田市',
  lat: 35.0872369,
  lng: 137.1562178,
  fileName: '豊田市'
};

console.log(`🔄 ${regionData.name}のページを再生成中...`);
console.log(`   座標: (${regionData.lat}, ${regionData.lng})\n`);

// すべての地域を再生成（豊田市を含む）
console.log('📝 generate-from-json-sources.jsを実行中...');
const result = execSync('node generate-from-json-sources.js 2>&1', {
  encoding: 'utf8',
  maxBuffer: 10 * 1024 * 1024  // 10MB
});

console.log(result);
console.log('\n✅ 再生成が完了しました！');
console.log('   更新されたファイル:');
console.log('   - data/regions/豊田市.html');
console.log('   - camping_note/regions/豊田市.html');
