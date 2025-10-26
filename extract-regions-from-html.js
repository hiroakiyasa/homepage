const fs = require('fs');
const path = require('path');

/**
 * data/regions/内のHTMLファイルから地域データを抽出
 */
function extractRegionsFromHTML() {
  console.log('📍 data/regions/からHTMLファイルを読み込み中...\n');

  const regionsDir = path.join(__dirname, 'data', 'regions');
  const files = fs.readdirSync(regionsDir);

  // -map.html を除外し、.html のみを対象
  const htmlFiles = files.filter(f => f.endsWith('.html') && !f.endsWith('-map.html'));

  console.log(`   ✅ ${htmlFiles.length}個のHTMLファイルを発見`);

  const regions = [];
  const regionMap = new Map(); // 重複除去用

  for (const file of htmlFiles) {
    try {
      const filePath = path.join(regionsDir, file);
      const html = fs.readFileSync(filePath, 'utf8');

      // <h1>タグから地域名を抽出
      const h1Match = html.match(/<h1[^>]*>🚗\s*([^<]+)<\/h1>/);
      if (!h1Match) continue;

      const regionName = h1Match[1].trim();

      // 地図の中心座標を抽出 (map.setView([lat, lng], zoom))
      const mapMatch = html.match(/map\.setView\(\s*\[([0-9.]+),\s*([0-9.]+)\]/);
      if (!mapMatch) continue;

      const lat = parseFloat(mapMatch[1]);
      const lng = parseFloat(mapMatch[2]);

      // レストラン数を抽出（optional）
      const restaurantMatch = html.match(/(\d+)店/);
      const restaurantCount = restaurantMatch ? parseInt(restaurantMatch[1]) : 0;

      const fileName = file.replace('.html', '');
      const key = `${regionName}_${lat}_${lng}`;

      // 重複チェック
      if (!regionMap.has(key)) {
        regionMap.set(key, true);
        regions.push({
          name: regionName,
          lat,
          lng,
          fileName,
          restaurantCount
        });
      }
    } catch (err) {
      console.error(`   ⚠️  ${file}: ${err.message}`);
    }
  }

  console.log(`   ✅ ${regions.length}個のユニーク地域を抽出\n`);

  // regions-data-unique.json として保存
  const uniquePath = path.join(__dirname, 'data', 'regions-data-unique.json');
  fs.writeFileSync(uniquePath, JSON.stringify(regions, null, 2));
  console.log(`💾 保存: ${uniquePath}\n`);

  // サンプル表示
  console.log('📍 地域データサンプル:');
  regions.slice(0, 10).forEach(r => {
    console.log(`   ${r.name} (${r.lat}, ${r.lng}) - ${r.restaurantCount}店`);
  });

  return regions;
}

// 実行
extractRegionsFromHTML();
