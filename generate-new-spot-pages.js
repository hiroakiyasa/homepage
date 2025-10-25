const fs = require('fs');
const path = require('path');
const https = require('https');
const supabase = require('./src/supabaseClient');

console.log('🗾 おもろまち駅フォーマットで新しいスポットページを生成中...\n');

// データを読み込む
const restaurantSpotsPath = '/Users/user/WebApp/camping_note/camping-spot-publisher/all-restaurant-spots.json';
const restaurantSpotsData = JSON.parse(fs.readFileSync(restaurantSpotsPath, 'utf8'));
const allSpots = restaurantSpotsData.spots;

const regionsBackupPath = '/Users/user/WebApp/camping_note/camping-spot-publisher/data/regions-data.backup-2025-10-24T15-58-43-523Z.json';
const regionsBackupData = JSON.parse(fs.readFileSync(regionsBackupPath, 'utf8'));

// レストランデータを読み込む
const restaurantsDataPath = '/Users/user/WebApp/camping_note/★all-restaurants-with-ids.json';
const restaurantsJson = JSON.parse(fs.readFileSync(restaurantsDataPath, 'utf8'));
const allRestaurants = restaurantsJson.restaurants;

console.log(`📍 全スポット数: ${allSpots.length.toLocaleString()}`);
console.log(`🗂️ バックアップ地域数: ${regionsBackupData.length}\n`);

// Haversine公式で2点間の距離を計算（メートル単位）
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

// 安全なファイル名を生成
function sanitizeFileName(name) {
  return name
    .replace(/[\/\\:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .substring(0, 100);
}

// Wikimedia Commonsから背景画像を取得してBase64エンコード
async function fetchWikimediaImageBase64(searchTerm) {
  return new Promise((resolve) => {
    const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&format=json&list=search&srsearch=${encodeURIComponent(searchTerm)}&srnamespace=6&srlimit=1`;

    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    };

    https.get(searchUrl, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const searchResult = JSON.parse(data);
          if (!searchResult.query || !searchResult.query.search || searchResult.query.search.length === 0) {
            resolve('');
            return;
          }

          const fileName = searchResult.query.search[0].title;
          const imageUrl = `https://commons.wikimedia.org/w/api.php?action=query&format=json&titles=${encodeURIComponent(fileName)}&prop=imageinfo&iiprop=url&iiurlwidth=1280`;

          https.get(imageUrl, options, (res2) => {
            let data2 = '';
            res2.on('data', (chunk) => data2 += chunk);
            res2.on('end', () => {
              try {
                const imageResult = JSON.parse(data2);
                const pages = imageResult.query.pages;
                const pageId = Object.keys(pages)[0];
                const thumbUrl = pages[pageId].imageinfo[0].thumburl || pages[pageId].imageinfo[0].url;
                downloadImageAsBase64(thumbUrl, resolve);
              } catch (err) {
                resolve('');
              }
            });
          }).on('error', () => resolve(''));
        } catch (err) {
          resolve('');
        }
      });
    }).on('error', () => resolve(''));
  });
}

function downloadImageAsBase64(url, callback) {
  https.get(url, (res) => {
    const chunks = [];
    res.on('data', (chunk) => chunks.push(chunk));
    res.on('end', () => {
      const buffer = Buffer.concat(chunks);
      const base64 = buffer.toString('base64');
      const mimeType = res.headers['content-type'] || 'image/jpeg';
      callback(`data:${mimeType};base64,${base64}`);
    });
  }).on('error', () => callback(''));
}

// 駐車場データがあるスポットを格納
const spotsWithParking = [];

async function processBatch(spots, batchIndex) {
  console.log(`\n🔍 バッチ ${batchIndex + 1} を処理中 (${spots.length}件)...`);

  const results = [];

  for (let i = 0; i < spots.length; i++) {
    const spot = spots[i];

    try {
      const latDiff = 0.0045;
      const lngDiff = 0.0045;
      const parkingStart = new Date();
      parkingStart.setDate(parkingStart.getDate() + 7);
      parkingStart.setHours(12, 0, 0, 0);
      const durationMinutes = 1440;

      const { data: parkingSpots, error } = await supabase.rpc('get_parking_spots_sorted_by_fee', {
        min_lat: spot.latitude - latDiff,
        max_lat: spot.latitude + latDiff,
        min_lng: spot.longitude - lngDiff,
        max_lng: spot.longitude + lngDiff,
        duration_minutes: durationMinutes,
        parking_start: parkingStart.toISOString()
      });

      if (error) {
        console.error(`   ❌ ${spot.name}: エラー - ${error.message}`);
        continue;
      }

      if (parkingSpots && parkingSpots.length > 0) {
        // 周辺レストランを取得
        const nearbyRestaurants = allRestaurants.filter(r => {
          if (!r.latitude || !r.longitude) return false;
          const distance = calculateDistance(spot.latitude, spot.longitude, r.latitude, r.longitude);
          return distance <= 5000;
        }).slice(0, 20);

        const spotWithParking = {
          ...spot,
          parkingCount: parkingSpots.length,
          parkingSpots: parkingSpots,
          nearbyRestaurants: nearbyRestaurants
        };

        results.push(spotWithParking);

        if ((i + 1) % 10 === 0) {
          console.log(`   進捗: ${i + 1}/${spots.length} (駐車場あり: ${results.length}件)`);
        }
      }

      await new Promise(resolve => setTimeout(resolve, 200));

    } catch (err) {
      console.error(`   ❌ ${spot.name}: 例外 - ${err.message}`);
    }
  }

  console.log(`✅ バッチ ${batchIndex + 1} 完了: ${results.length}件の駐車場ありスポット`);
  return results;
}

async function generateHTML(spot, outputDir) {
  const fileName = sanitizeFileName(spot.fullName || spot.name);
  const outputPath = path.join(outputDir, `${fileName}.html`);

  const typeLabel = spot.type === '駅' ? '駅' : '市区町村';
  const displayName = spot.fullName || spot.name;

  // 背景画像を取得
  let backgroundImage = '';
  try {
    console.log(`   🖼️  ${displayName}の背景画像を取得中...`);
    backgroundImage = await fetchWikimediaImageBase64(displayName);
    if (!backgroundImage) {
      backgroundImage = await fetchWikimediaImageBase64(`${spot.prefecture || ''} ${spot.city || ''}`);
    }
  } catch (err) {
    console.log(`   ⚠️  画像取得失敗: ${err.message}`);
  }

  const html = generateHTMLContent(spot, backgroundImage, typeLabel, displayName);
  fs.writeFileSync(outputPath, html, 'utf8');
}

function generateHTMLContent(spot, backgroundImage, typeLabel, displayName) {
  const headerStyle = backgroundImage
    ? `background: linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('${backgroundImage}');`
    : `background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);`;

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${displayName} - 車中泊おすすめスポット</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f8f9fa;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 20px;
    }

    .header {
      ${headerStyle}
      background-size: cover;
      background-position: center;
      color: white;
      padding: 80px 20px;
      text-align: center;
      border-radius: 15px;
      margin-bottom: 30px;
      box-shadow: 0 8px 16px rgba(0,0,0,0.2);
    }

    .header h1 {
      font-size: 2.5em;
      margin-bottom: 10px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
    }

    .header p {
      font-size: 1.2em;
      opacity: 0.95;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
    }

    .back-button {
      display: inline-block;
      padding: 12px 24px;
      background: #667eea;
      color: white;
      text-decoration: none;
      border-radius: 25px;
      margin: 20px 0;
      transition: all 0.3s;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }

    .back-button:hover {
      background: #5568d3;
      transform: translateY(-2px);
      box-shadow: 0 6px 12px rgba(0,0,0,0.15);
    }

    .warning-box {
      background: #fff3cd;
      border: 2px solid #ffc107;
      border-radius: 10px;
      padding: 20px;
      margin: 20px 0;
      color: #856404;
    }

    .warning-box strong {
      display: block;
      margin-bottom: 12px;
      font-size: 1.1em;
    }

    .warning-box ul {
      margin: 10px 0 0 20px;
      line-height: 1.8;
    }

    .section {
      background: white;
      border-radius: 12px;
      padding: 30px;
      margin: 25px 0;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .section h2 {
      color: #667eea;
      border-bottom: 3px solid #667eea;
      padding-bottom: 12px;
      margin-bottom: 25px;
      font-size: 1.8em;
    }

    .parking-item {
      border: 1px solid #e9ecef;
      border-radius: 10px;
      padding: 20px;
      margin: 20px 0;
      transition: all 0.3s;
      background: #fafafa;
    }

    .parking-item:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      transform: translateY(-2px);
    }

    .parking-name {
      font-size: 1.3em;
      font-weight: bold;
      color: #333;
      margin-bottom: 15px;
    }

    .parking-info {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px;
      margin-top: 15px;
    }

    .info-item {
      padding: 10px;
      background: white;
      border-radius: 6px;
      border: 1px solid #dee2e6;
    }

    .info-label {
      font-weight: bold;
      color: #667eea;
      display: block;
      margin-bottom: 4px;
    }

    .restaurant-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }

    .restaurant-card {
      border: 1px solid #e9ecef;
      border-radius: 10px;
      padding: 18px;
      transition: all 0.3s;
      background: #fafafa;
    }

    .restaurant-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 6px 16px rgba(0,0,0,0.12);
    }

    .restaurant-name {
      font-weight: bold;
      color: #333;
      margin-bottom: 10px;
      font-size: 1.1em;
    }

    #map {
      height: 550px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      margin: 25px 0;
    }

    footer {
      text-align: center;
      padding: 40px 20px;
      color: #666;
      margin-top: 50px;
      border-top: 1px solid #e9ecef;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin: 25px 0;
    }

    .stat-box {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 25px;
      border-radius: 12px;
      text-align: center;
      box-shadow: 0 4px 10px rgba(0,0,0,0.15);
    }

    .stat-number {
      font-size: 2.5em;
      font-weight: bold;
      display: block;
      margin-bottom: 8px;
    }

    .stat-label {
      font-size: 0.95em;
      opacity: 0.95;
    }
  </style>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
</head>
<body>
  <div class="container">
    <a href="../index.html" class="back-button">← 全国の車中泊スポットマップに戻る</a>

    <div class="header">
      <h1>${displayName}</h1>
      <p>${typeLabel} | ${spot.restaurantCount}件のレストラン | ${spot.parkingCount}箇所の駐車場</p>
    </div>

    <div class="stats-grid">
      <div class="stat-box">
        <span class="stat-number">${spot.parkingCount}</span>
        <span class="stat-label">駐車場スポット</span>
      </div>
      <div class="stat-box">
        <span class="stat-number">${spot.restaurantCount}</span>
        <span class="stat-label">周辺レストラン</span>
      </div>
      <div class="stat-box">
        <span class="stat-number">${spot.prefecture || spot.city || typeLabel}</span>
        <span class="stat-label">エリア</span>
      </div>
    </div>

    <div class="warning-box">
      <strong>⚠️ 重要なお知らせ</strong>
      <ul>
        <li><strong>駐車料金は参考情報です：</strong>本サービスで表示される駐車料金は、あくまで参考情報であり、実際の料金と異なる場合があります。</li>
        <li><strong>最新情報の確認：</strong>ご利用前に必ず現地または公式サイトで最新の料金、営業時間、利用条件等をご確認ください。</li>
        <li><strong>車中泊のマナー：</strong>周辺住民の迷惑にならないよう、静かに利用しましょう。ゴミは必ず持ち帰りましょう。</li>
      </ul>
    </div>

    <div id="map"></div>

    <div class="section">
      <h2>🅿️ 周辺の駐車場スポット (${spot.parkingCount}箇所)</h2>
      ${spot.parkingSpots.map((parking, index) => `
        <div class="parking-item">
          <div class="parking-name">${index + 1}. ${parking.parking_name || '駐車場'}</div>
          <div class="parking-info">
            <div class="info-item">
              <span class="info-label">📍 住所:</span>
              ${parking.address || '情報なし'}
            </div>
            <div class="info-item">
              <span class="info-label">📏 距離:</span>
              約${Math.round(calculateDistance(spot.latitude, spot.longitude, parking.latitude, parking.longitude))}m
            </div>
            ${parking.capacity ? `
            <div class="info-item">
              <span class="info-label">🚗 収容台数:</span>
              ${parking.capacity}台
            </div>
            ` : ''}
            ${parking.price_info ? `
            <div class="info-item">
              <span class="info-label">💰 料金:</span>
              ${parking.price_info}
            </div>
            ` : ''}
            ${parking.available_time ? `
            <div class="info-item">
              <span class="info-label">🕐 利用時間:</span>
              ${parking.available_time}
            </div>
            ` : ''}
          </div>
        </div>
      `).join('')}
    </div>

    ${spot.nearbyRestaurants && spot.nearbyRestaurants.length > 0 ? `
    <div class="section">
      <h2>🍴 おすすめレストラン</h2>
      <div class="restaurant-grid">
        ${spot.nearbyRestaurants.map(restaurant => `
          <div class="restaurant-card">
            <div class="restaurant-name">${restaurant.name}</div>
            <div style="color: #666; font-size: 0.9em; margin-top: 8px;">
              ${restaurant.address || ''}
            </div>
            ${restaurant.rating ? `
            <div style="color: #f39c12; margin-top: 8px;">
              ⭐ ${restaurant.rating}
            </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}
  </div>

  <footer>
    <p>&copy; 2025 車中泊スポット情報. All rights reserved.</p>
    <p style="margin-top: 10px; font-size: 0.9em;">このページの情報は参考情報です。実際の利用前に必ず現地や公式サイトで最新情報をご確認ください。</p>
  </footer>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map').setView([${spot.latitude}, ${spot.longitude}], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // 中心地マーカー
    const centerIcon = L.divIcon({
      html: '<div style="background: #e74c3c; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4);"></div>',
      iconSize: [24, 24],
      className: ''
    });

    L.marker([${spot.latitude}, ${spot.longitude}], { icon: centerIcon })
      .addTo(map)
      .bindPopup('<b>${displayName}</b><br>${typeLabel}');

    // 駐車場マーカー
    const parkingData = ${JSON.stringify(spot.parkingSpots)};

    parkingData.forEach(parking => {
      if (parking.latitude && parking.longitude) {
        const icon = L.divIcon({
          html: '<div style="background: #3498db; width: 18px; height: 18px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
          iconSize: [18, 18],
          className: ''
        });

        L.marker([parking.latitude, parking.longitude], { icon: icon })
          .addTo(map)
          .bindPopup(\`
            <b>\${parking.parking_name || '駐車場'}</b><br>
            \${parking.address || ''}<br>
            \${parking.capacity ? '収容: ' + parking.capacity + '台<br>' : ''}
            \${parking.price_info ? '料金: ' + parking.price_info : ''}
          \`);
      }
    });
  </script>
</body>
</html>`;
}

async function main() {
  const batchSize = 100;
  const batches = [];

  for (let i = 0; i < allSpots.length; i += batchSize) {
    batches.push(allSpots.slice(i, i + batchSize));
  }

  console.log(`📦 ${batches.length}個のバッチに分割しました\n`);

  for (let i = 0; i < batches.length; i++) {
    const batchResults = await processBatch(batches[i], i);
    spotsWithParking.push(...batchResults);
  }

  console.log(`\n\n=== 検索完了 ===`);
  console.log(`✅ 駐車場があるスポット: ${spotsWithParking.length}/${allSpots.length}件\n`);

  if (spotsWithParking.length === 0) {
    console.log('⚠️ 駐車場があるスポットが見つかりませんでした。');
    return;
  }

  spotsWithParking.sort((a, b) => b.parkingCount - a.parkingCount);

  console.log('📊 駐車場数トップ20:\n');
  spotsWithParking.slice(0, 20).forEach((spot, index) => {
    const typeLabel = spot.type === '駅' ? '🚉' : '📍';
    console.log(`${index + 1}. ${typeLabel} ${spot.fullName || spot.name}: ${spot.parkingCount}箇所`);
  });

  // 新しいフォルダを作成
  const outputDir = path.join(__dirname, 'data', 'new-spot-pages');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`\n\n🔨 HTMLページを生成中...\n`);
  console.log(`📁 出力先: ${outputDir}\n`);

  let generatedCount = 0;

  for (const spot of spotsWithParking) {
    await generateHTML(spot, outputDir);

    generatedCount++;
    if (generatedCount % 10 === 0) {
      console.log(`   進捗: ${generatedCount}/${spotsWithParking.length}`);
    }
  }

  console.log(`\n✅ ${generatedCount}件のHTMLページを生成しました`);
  console.log(`📁 出力先: ${outputDir}`);
}

main().catch(error => {
  console.error('\n💥 エラーが発生しました:', error);
  process.exit(1);
});
