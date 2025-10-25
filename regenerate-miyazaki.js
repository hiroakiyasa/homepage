const fs = require('fs');
const path = require('path');

// regions-data.jsonを読み込む
const regionsDataPath = path.join(__dirname, 'data', 'regions-data.json');
const regionsData = JSON.parse(fs.readFileSync(regionsDataPath, 'utf8'));

console.log(`📍 宮崎駅のページを再生成します\n`);

// 宮崎駅のデータを見つける
const miyazakiData = regionsData.find(r => r.name === '宮崎駅');

if (!miyazakiData) {
  console.error('❌ 宮崎駅のデータが見つかりません');
  process.exit(1);
}

// 一時的なregions-data.jsonを作成（宮崎駅のみ）
const tempRegionsData = [miyazakiData];
const tempRegionsDataPath = path.join(__dirname, 'data', 'regions-data-temp.json');
fs.writeFileSync(tempRegionsDataPath, JSON.stringify(tempRegionsData, null, 2), 'utf8');

console.log('✅ 一時データファイルを作成しました\n');

// generate-all-regions-full.jsを読み込んで実行
const scriptPath = path.join(__dirname, 'generate-all-regions-full.js');
let scriptContent = fs.readFileSync(scriptPath, 'utf8');

// regions-data.jsonのパスを一時ファイルに置き換える
scriptContent = scriptContent.replace(
  "path.join(__dirname, 'data', 'regions-data.json')",
  "path.join(__dirname, 'data', 'regions-data-temp.json')"
);

// 一時スクリプトを作成
const tempScriptPath = path.join(__dirname, 'temp-generate-miyazaki.js');
fs.writeFileSync(tempScriptPath, scriptContent, 'utf8');

console.log('🔄 生成中...\n');

// 実行
const { execSync } = require('child_process');
try {
  const result = execSync(`node ${tempScriptPath}`, {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
    cwd: __dirname
  });
  console.log(result);

  // 一時ファイルを削除
  fs.unlinkSync(tempScriptPath);
  fs.unlinkSync(tempRegionsDataPath);

  console.log('\n✅ 宮崎駅のページを再生成しました\n');

  // ファイルの存在確認
  const htmlPath = path.join(__dirname, 'data', 'regions', '宮崎駅.html');
  const mapPath = path.join(__dirname, 'data', 'regions', '宮崎駅-map.html');

  if (fs.existsSync(htmlPath) && fs.existsSync(mapPath)) {
    const htmlStats = fs.statSync(htmlPath);
    const mapStats = fs.statSync(mapPath);
    console.log('📄 生成されたファイル:');
    console.log(`   宮崎駅.html: ${Math.round(htmlStats.size / 1024)} KB (${htmlStats.mtime.toLocaleString('ja-JP')})`);
    console.log(`   宮崎駅-map.html: ${Math.round(mapStats.size / 1024)} KB (${mapStats.mtime.toLocaleString('ja-JP')})`);
  } else {
    console.log('⚠️  ファイルが見つかりません');
  }

} catch (error) {
  // エラーが発生しても一時ファイルを削除
  if (fs.existsSync(tempScriptPath)) fs.unlinkSync(tempScriptPath);
  if (fs.existsSync(tempRegionsDataPath)) fs.unlinkSync(tempRegionsDataPath);

  console.error('\n❌ エラーが発生しました:', error.message);
  process.exit(1);
}
