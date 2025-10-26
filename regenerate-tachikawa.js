// 立川北だけを再生成するテストスクリプト
const generateScript = require('./generate-from-json-sources.js');

// テスト用の地域データ
const testRegion = {
  name: '立川北',
  lat: 35.697,
  lng: 139.414,
  fileName: '立川北',
  elevation: 100
};

console.log('立川北のHTMLを再生成します...\n');
