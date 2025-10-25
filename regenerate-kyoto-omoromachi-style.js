const fs = require('fs');
const path = require('path');
const https = require('https');
const supabase = require('./src/supabaseClient');

console.log('🗾 京都駅ページをおもろまち駅スタイルで再生成中...\n');

// all-restaurant-spots.jsonから京都駅のデータを取得
const restaurantSpotsPath = '/Users/user/WebApp/camping_note/camping-spot-publisher/all-restaurant-spots.json';
const restaurantSpotsData = JSON.parse(fs.readFileSync(restaurantSpotsPath, 'utf8'));

// 京都駅を検索
const kyotoStation = restaurantSpotsData.spots.find(spot =>
  spot.fullName && spot.fullName.includes('京都')
);

if (!kyotoStation) {
  console.error('❌ 京都駅が見つかりませんでした');
  process.exit(1);
}

console.log(`✅ 対象スポット: ${kyotoStation.fullName || kyotoStation.name}`);
console.log(`   タイプ: ${kyotoStation.type}`);
console.log(`   座標: ${kyotoStation.latitude}, ${kyotoStation.longitude}`);
console.log(`   レストラン数: ${kyotoStation.restaurantCount}`);

// レストランデータを読み込む
const restaurantsDataPath = '/Users/user/WebApp/camping_note/★all-restaurants-with-ids.json';
const restaurantsJson = JSON.parse(fs.readFileSync(restaurantsDataPath, 'utf8'));
const allRestaurants = restaurantsJson.restaurants;

// Haversine公式で2点間の距離を計算
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

async function main() {
  // 駐車場データを取得
  console.log('\n🔍 駐車場データを取得中...');

  const latDiff = 0.0045;
  const lngDiff = 0.0045;
  const parkingStart = new Date();
  parkingStart.setDate(parkingStart.getDate() + 7);
  parkingStart.setHours(18, 0, 0, 0); // 18:00
  const durationMinutes = 840; // 18:00-8:00 = 14時間

  const { data: parkingSpots, error } = await supabase.rpc('get_parking_spots_sorted_by_fee', {
    min_lat: kyotoStation.latitude - latDiff,
    max_lat: kyotoStation.latitude + latDiff,
    min_lng: kyotoStation.longitude - lngDiff,
    max_lng: kyotoStation.longitude + lngDiff,
    duration_minutes: durationMinutes,
    parking_start: parkingStart.toISOString()
  });

  if (error) {
    console.error(`❌ エラー: ${error.message}`);
    process.exit(1);
  }

  console.log(`✅ 駐車場: ${parkingSpots.length}箇所発見`);

  // トップ10のみ使用
  const top10Parking = parkingSpots.slice(0, 10);

  // 周辺レストランを取得（ランダムに20件）
  console.log('\n🍴 周辺レストランを取得中...');
  const nearbyRestaurants = allRestaurants.filter(r => {
    if (!r.latitude || !r.longitude) return false;
    const distance = calculateDistance(kyotoStation.latitude, kyotoStation.longitude, r.latitude, r.longitude);
    return distance <= 5000;
  });

  // ランダムに20件選択
  const shuffled = nearbyRestaurants.sort(() => 0.5 - Math.random());
  const topRestaurants = shuffled.slice(0, 20);

  console.log(`✅ レストラン: ${topRestaurants.length}件選択`);

  // 背景画像を取得
  console.log('\n🖼️  背景画像を取得中...');
  let backgroundImageBase64 = '';
  try {
    backgroundImageBase64 = await Promise.race([
      fetchWikimediaImageBase64('京都駅'),
      new Promise((resolve) => setTimeout(() => resolve(''), 10000))
    ]);
    if (backgroundImageBase64) {
      console.log('✅ 背景画像取得成功');
    } else {
      console.log('⚠️  背景画像なし（デフォルトカラーを使用）');
    }
  } catch (err) {
    console.log('⚠️  背景画像取得失敗');
  }

  // HTMLを生成
  console.log('\n🔨 HTMLを生成中...');
  const html = generateHTML(kyotoStation, top10Parking, topRestaurants, backgroundImageBase64);

  // 保存
  const outputPath = '/Users/user/WebApp/camping_note/camping-spot-publisher/data/new-spot-pages/JR東海_京都.html';
  fs.writeFileSync(outputPath, html, 'utf8');

  console.log(`\n✅ 完了: ${outputPath}`);
  console.log(`📁 ファイルサイズ: ${Math.round(fs.statSync(outputPath).size / 1024)} KB`);
}

function generateHTML(spot, parkingSpots, topRestaurants, backgroundImageBase64) {
  const regionData = {
    name: spot.fullName || spot.name,
    lat: spot.latitude,
    lng: spot.longitude,
    fileName: 'kyoto'
  };

  let html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${regionData.name} - 車中泊おすすめスポット</title>
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
      background: linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5))${backgroundImageBase64 ? `,\n                  url('${backgroundImageBase64}')` : ''};
      background-size: cover;
      background-position: center;
      padding: 50px 30px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .header h1 {
      font-size: 28px;
      color: #fff;
      margin-bottom: 8px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
    }

    .header p {
      color: #fff;
      font-size: 16px;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
    }

    .back-button {
      display: inline-block;
      padding: 10px 20px;
      background: #1976d2;
      color: white !important;
      text-decoration: none;
      border-radius: 4px;
      font-size: 14px;
      transition: background 0.3s, transform 0.2s;
    }

    .back-button:hover {
      background: #1565c0;
      transform: translateY(-2px);
    }

    .section-title {
      font-size: 20px;
      font-weight: bold;
      margin-bottom: 15px;
      color: #333;
    }

    /* 地図とリストのレイアウト */
    .parking-map-fullwidth {
      width: 100%;
      background: #f8f9fa;
      margin-bottom: 30px;
    }

    .map-layout-container {
      display: flex;
      gap: 0;
      width: 100%;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .map-layout-left {
      flex: 0 0 60%;
      min-width: 0;
      height: 700px;
    }

    #map {
      width: 100%;
      height: 100%;
      border: none;
      display: block;
    }

    .map-layout-right {
      flex: 0 0 40%;
      min-width: 0;
      max-height: 700px;
      overflow-y: auto;
      background: white;
      padding: 20px;
    }

    .map-layout-right h4 {
      margin: 0 0 15px 0;
      font-size: 14px;
      color: #666;
    }

    /* エリア中心カード */
    .area-center-card {
      background: #fff3e0;
      padding: 12px;
      border-radius: 6px;
      margin-bottom: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .area-center-card strong {
      color: #d32f2f;
      font-size: 13px;
    }

    /* 駐車場カード */
    .parking-card {
      background: #e3f2fd;
      padding: 10px;
      border-radius: 6px;
      margin-bottom: 8px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .parking-card:hover {
      background: #bbdefb;
    }

    .parking-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6px;
    }

    .parking-card-header strong {
      color: #1976d2;
      font-size: 14px;
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .parking-card-buttons {
      display: flex;
      gap: 4px;
    }

    .btn-icon {
      background: #3B82F6;
      color: white;
      padding: 6px 10px;
      text-decoration: none;
      border-radius: 4px;
      font-size: 18px;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: opacity 0.2s;
    }

    .btn-icon:hover {
      opacity: 0.8;
    }

    .btn-search {
      background: #22D3EE;
    }

    .parking-info {
      display: flex;
      gap: 10px;
      font-size: 12px;
      align-items: flex-start;
    }

    .parking-info-left {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex-shrink: 0;
    }

    .parking-info-left div {
      color: #666;
    }

    .parking-fee {
      color: #d32f2f !important;
      font-weight: bold;
    }

    /* レストランセクション */
    .restaurant-section {
      margin-top: 30px;
    }

    .restaurant-section h2 {
      font-size: 20px;
      font-weight: bold;
      margin-bottom: 15px;
      color: #333;
    }

    .restaurant-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 15px;
    }

    .restaurant-card {
      background: #fff8e1;
      border-radius: 6px;
      padding: 12px;
      border-left: 4px solid #ff9800;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .restaurant-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .restaurant-card h3 {
      color: #ff9800;
      font-size: 14px;
      margin-bottom: 8px;
      font-weight: bold;
    }

    .restaurant-genre {
      background: #ff9800;
      color: white;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      display: inline-block;
      margin-bottom: 8px;
    }

    .restaurant-address {
      font-size: 11px;
      color: #666;
      margin-bottom: 10px;
      line-height: 1.4;
    }

    .restaurant-buttons {
      display: flex;
      gap: 4px;
    }

    .restaurant-buttons .btn-icon {
      font-size: 14px;
      padding: 5px 8px;
    }

    @media (max-width: 1200px) {
      .map-layout-container {
        flex-direction: column;
      }

      .map-layout-left {
        flex: 0 0 100%;
        height: 500px;
      }

      .map-layout-right {
        flex: 0 0 100%;
        max-height: none;
      }

      .restaurant-grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    @media (max-width: 768px) {
      .map-layout-left {
        height: 400px;
      }

      .restaurant-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 480px) {
      .restaurant-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css" />
</head>
<body>
  <div class="container">
    <div style="margin-bottom: 20px;">
      <a href="../index.html" class="back-button">← 全国の車中泊スポットマップに戻る</a>
    </div>

    <div class="header">
      <h1>🚗 ${regionData.name}</h1>
      <p>周辺のおすすめ車中泊スポット</p>
    </div>

    <!-- 注意喚起 -->
    <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 15px; margin: 20px; color: #856404;">
      <strong>⚠️ 重要なお知らせ</strong>
      <ul style="margin: 10px 0 0 20px; line-height: 1.8;">
        <li><strong>駐車料金は参考情報です：</strong>本サービスで表示される駐車料金は、あくまで参考情報であり、実際の料金と異なる場合があります。</li>
        <li><strong>最新情報の確認：</strong>ご利用前に必ず現地または公式サイトで最新の料金、営業時間、利用条件等をご確認ください。</li>
      </ul>
    </div>

    <!-- 地図＋駐車場リスト -->
    <div class="section-title">🚗 車中泊におすすめの駐車場トップ10（18:00-8:00 料金順）</div>

    <div class="parking-map-fullwidth">
      <div class="map-layout-container">
        <div class="map-layout-left">
          <div id="map"></div>
        </div>

        <div class="map-layout-right">
          <h4>📍 クリックして地図に表示</h4>

          <!-- エリア中心 -->
          <div class="area-center-card" onclick="centerMap()">
            <strong>🔴 エリア中心: ${regionData.name}</strong>
            <a href="https://www.google.com/maps?q=${regionData.lat},${regionData.lng}" target="_blank" onclick="event.stopPropagation()" class="btn-icon">🗺️</a>
          </div>

`;

  // 駐車場リスト生成
  parkingSpots.forEach((spot, index) => {
    // ランキングアイコン
    let rankIcon = '🔵';
    if (index === 0) rankIcon = '🥇';
    else if (index === 1) rankIcon = '🥈';
    else if (index === 2) rankIcon = '🥉';

    // 計算済み料金を表示
    const calculatedFeeText = spot.calculated_fee !== null && spot.calculated_fee !== undefined
      ? `¥${spot.calculated_fee.toLocaleString()} (18:00-8:00)`
      : '料金情報なし';

    // 徒歩時間を計算（時速4.8kmで計算）
    const distanceKm = spot.distance_to_center ? spot.distance_to_center / 1000 : 0;
    const walkingMinutes = Math.round(distanceKm / 4.8 * 60);

    html += `
          <!-- 駐車場${index + 1} -->
          <div class="parking-card" onclick="showParking(${index})">
            <div class="parking-card-header">
              <strong>${rankIcon} ${index + 1}位: ${spot.name}</strong>
              <div class="parking-card-buttons">
                <a href="https://www.google.com/maps?q=${spot.lat},${spot.lng}" target="_blank" onclick="event.stopPropagation()" class="btn-icon">🗺️</a>
                <a href="https://www.google.com/search?q=${encodeURIComponent(spot.name)}" target="_blank" onclick="event.stopPropagation()" class="btn-icon btn-search">🔍</a>
              </div>
            </div>

            <div class="parking-info">
              <div class="parking-info-left">
                <div>📍 徒歩約${walkingMinutes}分 (${Math.round(spot.distance_to_center || 0)}m)</div>
                <div class="parking-fee">💰 ${calculatedFeeText}</div>
              </div>
            </div>
          </div>
`;
  });

  html += `
        </div>
      </div>
    </div>

    <!-- レストランセクション -->
    <div class="restaurant-section">
      <h2>🍴 おすすめレストラン</h2>
      <div class="restaurant-grid">
`;

  // レストランカード生成
  topRestaurants.forEach((restaurant, index) => {
    const number = index + 1;

    html += `
        <div class="restaurant-card">
          <div style="font-weight: bold; color: #ff9800; margin-bottom: 4px;">${number}</div>
          <h3>${restaurant.name}</h3>
`;

    if (restaurant.genre) {
      html += `
          <span class="restaurant-genre">${restaurant.genre}</span>
`;
    }

    if (restaurant.address) {
      html += `
          <div class="restaurant-address">📍 ${restaurant.address}</div>
`;
    }

    html += `
          <div class="restaurant-buttons">
            <a href="https://www.google.com/maps?q=${restaurant.latitude},${restaurant.longitude}" target="_blank" onclick="event.stopPropagation()" class="btn-icon">🗺️</a>
            <a href="https://www.google.com/search?q=${encodeURIComponent(restaurant.name)}" target="_blank" onclick="event.stopPropagation()" class="btn-icon btn-search">🔍</a>
          </div>
        </div>
`;
  });

  html += `
      </div>
    </div>

  </div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
  <script>
    const map = L.map('map').setView([${regionData.lat}, ${regionData.lng}], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // エリア中心マーカー
    const centerIcon = L.divIcon({
      html: '<div style="background: #d32f2f; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
      iconSize: [20, 20],
      className: ''
    });

    const centerMarker = L.marker([${regionData.lat}, ${regionData.lng}], { icon: centerIcon })
      .addTo(map)
      .bindPopup('<b>🔴 ${regionData.name}</b><br>エリア中心');

    // 駐車場マーカー
    const parkingData = ${JSON.stringify(parkingSpots)};
    const parkingMarkers = [];

    parkingData.forEach((parking, index) => {
      if (parking.lat && parking.lng) {
        const icon = L.divIcon({
          html: '<div style="background: #1976d2; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
          iconSize: [16, 16],
          className: ''
        });

        const fee = parking.calculated_fee !== null && parking.calculated_fee !== undefined
          ? \`¥\${parking.calculated_fee.toLocaleString()}\`
          : '料金情報なし';

        const marker = L.marker([parking.lat, parking.lng], { icon: icon })
          .addTo(map)
          .bindPopup(\`
            <b>\${index + 1}. \${parking.name}</b><br>
            💰 \${fee} (18:00-8:00)<br>
            📍 \${Math.round(parking.distance_to_center || 0)}m
          \`);

        parkingMarkers.push(marker);
      }
    });

    function centerMap() {
      map.setView([${regionData.lat}, ${regionData.lng}], 14);
      centerMarker.openPopup();
    }

    function showParking(index) {
      if (parkingMarkers[index]) {
        const marker = parkingMarkers[index];
        map.setView(marker.getLatLng(), 16);
        marker.openPopup();
      }
    }
  </script>
</body>
</html>`;

  return html;
}

main().catch(error => {
  console.error('\n💥 エラーが発生しました:', error);
  process.exit(1);
});
