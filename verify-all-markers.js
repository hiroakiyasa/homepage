const fs = require('fs');
const path = require('path');

// regions-data.jsonを読み込む
const regionsDataPath = path.join(__dirname, 'data', 'regions-data.json');
const regionsData = JSON.parse(fs.readFileSync(regionsDataPath, 'utf8'));

console.log(`📋 検証対象の地域数: ${regionsData.length}\n`);

// regionsディレクトリに存在するHTMLファイルを確認
const regionsDir = path.join(__dirname, 'data', 'regions');

let successCount = 0;
let errorCount = 0;
const errors = [];

for (const region of regionsData) {
  const fileName = region.fileName || region.name;
  const htmlPath = path.join(regionsDir, `${fileName}.html`);
  const mapPath = path.join(regionsDir, `${fileName}-map.html`);

  // 詳細ページの存在確認
  if (!fs.existsSync(htmlPath)) {
    errorCount++;
    errors.push({
      region: region.name,
      fileName: fileName,
      missing: '詳細ページ',
      expectedPath: htmlPath
    });
    console.log(`❌ ${region.name}: 詳細ページが見つかりません`);
  } else if (!fs.existsSync(mapPath)) {
    errorCount++;
    errors.push({
      region: region.name,
      fileName: fileName,
      missing: 'マップページ',
      expectedPath: mapPath
    });
    console.log(`❌ ${region.name}: マップページが見つかりません`);
  } else {
    successCount++;
  }
}

console.log(`\n=== 検証結果 ===`);
console.log(`✅ 正常な地域: ${successCount}/${regionsData.length}`);
console.log(`❌ エラーのある地域: ${errorCount}/${regionsData.length}`);

if (errors.length > 0) {
  console.log(`\n🚨 エラー詳細:`);
  for (const error of errors) {
    console.log(`\n地域名: ${error.region}`);
    console.log(`ファイル名: ${error.fileName}`);
    console.log(`欠損: ${error.missing}`);
    console.log(`期待パス: ${error.expectedPath}`);
  }
} else {
  console.log(`\n🎉 すべての地域のHTMLファイルが正しく存在します！`);
}

// デプロイディレクトリも確認
console.log(`\n=== デプロイディレクトリの確認 ===`);
const deployDir = '/Users/user/WebApp/homepage/camping_note/regions';

if (fs.existsSync(deployDir)) {
  let deploySuccessCount = 0;
  let deployErrorCount = 0;

  for (const region of regionsData) {
    const fileName = region.fileName || region.name;
    const htmlPath = path.join(deployDir, `${fileName}.html`);
    const mapPath = path.join(deployDir, `${fileName}-map.html`);

    if (fs.existsSync(htmlPath) && fs.existsSync(mapPath)) {
      deploySuccessCount++;
    } else {
      deployErrorCount++;
      console.log(`❌ デプロイディレクトリに ${region.name} のファイルが見つかりません`);
    }
  }

  console.log(`✅ デプロイディレクトリ: ${deploySuccessCount}/${regionsData.length} 正常`);
  console.log(`❌ デプロイディレクトリ: ${deployErrorCount}/${regionsData.length} エラー`);
} else {
  console.log(`⚠️  デプロイディレクトリが見つかりません: ${deployDir}`);
}
