const fs = require('fs');
const path = require('path');
require('dotenv').config();

// generate-all-regions-full.jsの内容を読み込んで、1地域だけ生成する
const regionName = process.argv[2] || '宮崎駅';

console.log(`📍 ${regionName} のページを再生成します\n`);

// テストモードを有効にしてgenerate-all-regions-full.jsを実行
const { execSync } = require('child_process');

try {
  // generate-all-regions-full.jsを読み込む
  const scriptPath = path.join(__dirname, 'generate-all-regions-full.js');
  let scriptContent = fs.readFileSync(scriptPath, 'utf8');

  // testModeとtestRegionNameを有効にする
  scriptContent = scriptContent.replace(
    /const testMode = false;/,
    `const testMode = true;`
  );
  scriptContent = scriptContent.replace(
    /const testRegionName = '.*?';/,
    `const testRegionName = '${regionName}';`
  );

  // 一時ファイルに保存
  const tempScript = path.join(__dirname, 'temp-generate-single.js');
  fs.writeFileSync(tempScript, scriptContent, 'utf8');

  // 実行
  console.log('🔄 生成中...\n');
  const result = execSync(`node ${tempScript}`, {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024
  });
  console.log(result);

  // 一時ファイルを削除
  fs.unlinkSync(tempScript);

  console.log(`\n✅ ${regionName} のページを再生成しました`);

  // ファイルの存在確認
  const htmlPath = path.join(__dirname, 'data', 'regions', `${regionName}.html`);
  const mapPath = path.join(__dirname, 'data', 'regions', `${regionName}-map.html`);

  if (fs.existsSync(htmlPath) && fs.existsSync(mapPath)) {
    const htmlStats = fs.statSync(htmlPath);
    const mapStats = fs.statSync(mapPath);
    console.log(`\n📄 生成されたファイル:`);
    console.log(`   ${regionName}.html: ${Math.round(htmlStats.size / 1024)} KB`);
    console.log(`   ${regionName}-map.html: ${Math.round(mapStats.size / 1024)} KB`);
  } else {
    console.log(`\n⚠️  ファイルが見つかりません`);
  }

} catch (error) {
  console.error('❌ エラーが発生しました:', error.message);
  process.exit(1);
}
