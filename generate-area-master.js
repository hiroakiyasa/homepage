const fs = require('fs');
const path = require('path');

/**
 * restaurants_dataフォルダから全エリア情報を抽出してマスターリストを生成
 */
async function generateAreaMaster() {
  console.log('=== エリアマスターリスト生成 ===\n');

  const restaurantsDataDir = '/Users/user/WebApp/camping_note/restaurants_data';
  const outputPath = path.join(__dirname, 'data', 'area-master.json');

  // dataディレクトリを作成
  const dataDir = path.dirname(outputPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // area_*.jsonファイルを取得
  const files = fs.readdirSync(restaurantsDataDir)
    .filter(f => f.startsWith('area_') && f.endsWith('.json'))
    .sort();

  console.log(`📂 ${files.length}個のエリアファイルを検出\n`);

  const areas = [];
  let totalRestaurants = 0;

  // 各ファイルを読み込んで情報を抽出
  for (const file of files) {
    try {
      const filePath = path.join(restaurantsDataDir, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      // エリア名を抽出（area_小樽.json → 小樽）
      const areaName = file.replace('area_', '').replace('.json', '');

      // レストランデータが存在し、スコア3.5以上のレストランがあるかチェック
      const highScoreRestaurants = data.restaurants
        ? data.restaurants.filter(r => r.score && r.score >= 3.5)
        : [];

      if (highScoreRestaurants.length > 0) {
        areas.push({
          name: areaName,
          displayName: data.name || areaName,
          type: data.type || 'area',
          filePath: `area_${areaName}.json`,
          restaurantCount: data.restaurantCount || data.restaurants.length,
          highScoreCount: highScoreRestaurants.length,
          topScore: highScoreRestaurants[0]?.score || 0,
          rankingUrl: data.rankingUrl || null,
          hasData: true
        });

        totalRestaurants += highScoreRestaurants.length;
      }
    } catch (error) {
      console.error(`⚠️  ${file} の読み込みエラー:`, error.message);
    }
  }

  // スコア順にソート
  areas.sort((a, b) => b.topScore - a.topScore);

  // マスターリスト作成
  const masterData = {
    generatedAt: new Date().toISOString(),
    totalAreas: areas.length,
    totalRestaurants: totalRestaurants,
    dataSource: restaurantsDataDir,
    areas: areas
  };

  // JSON保存
  fs.writeFileSync(outputPath, JSON.stringify(masterData, null, 2), 'utf8');

  console.log('✅ エリアマスターリスト生成完了\n');
  console.log(`📊 統計情報:`);
  console.log(`   - 有効エリア数: ${areas.length}`);
  console.log(`   - 総レストラン数（3.5以上）: ${totalRestaurants}`);
  console.log(`   - 出力先: ${outputPath}\n`);

  // トップ10エリアを表示
  console.log('📍 トップスコアエリア（上位10件）:');
  areas.slice(0, 10).forEach((area, index) => {
    console.log(`   ${index + 1}. ${area.displayName} (⭐${area.topScore}) - ${area.highScoreCount}件`);
  });

  console.log('\n');

  return masterData;
}

// 実行
if (require.main === module) {
  generateAreaMaster()
    .then(() => {
      console.log('✅ 完了');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ エラー:', error);
      process.exit(1);
    });
}

module.exports = { generateAreaMaster };
