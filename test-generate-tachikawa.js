// 立川北のHTMLだけを生成するテストスクリプト
require('dotenv').config();
const fs = require('fs');

// 地域データを読み込み
const regionsData = JSON.parse(fs.readFileSync('data/regions-data.backup-2024-10-25.json', 'utf8'));

// 立川北を探す
const region = regionsData.find(r => r.name === '立川北');

if (!region) {
  console.error('立川北が見つかりません');
  process.exit(1);
}

console.log('立川北のデータ:', region);

// generate-from-json-sources.jsから関数をインポート
const generateModule = require('./generate-from-json-sources.js');

console.log('HTMLを生成中...');
