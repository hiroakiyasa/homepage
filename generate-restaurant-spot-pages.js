const fs = require('fs');
const path = require('path');
const supabase = require('./src/supabaseClient');

console.log('🗾 レストランスポット周辺の駐車場を検索してHTMLページを生成中...\n');

// スポットデータを読み込む
const spotsDataPath = '/Users/user/WebApp/camping_note/camping-spot-publisher/all-restaurant-spots.json';
const spotsData = JSON.parse(fs.readFileSync(spotsDataPath, 'utf8'));
const allSpots = spotsData.spots;

console.log(`📍 全スポット数: ${allSpots.length.toLocaleString()}\n`);

// レストランデータを読み込む
const restaurantsDataPath = '/Users/user/WebApp/camping_note/★all-restaurants-with-ids.json';
const restaurantsJson = JSON.parse(fs.readFileSync(restaurantsDataPath, 'utf8'));
const allRestaurants = restaurantsJson.restaurants;

// 温泉データを読み込む（オプショナル）
let allOnsen = [];
try {
  const onsenDataPath = '/Users/user/WebApp/camping_note/★all-onsen.json';
  const onsenJson = JSON.parse(fs.readFileSync(onsenDataPath, 'utf8'));
  allOnsen = onsenJson.onsen;
  console.log(`♨️ 温泉データ: ${allOnsen.length.toLocaleString()}件\n`);
} catch (err) {
  console.log('⚠️ 温泉データが見つかりません（スキップします）\n');
}

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

// 駐車場データがあるスポットを格納
const spotsWithParking = [];

async function processBatch(spots, batchIndex) {
  console.log(`\n🔍 バッチ ${batchIndex + 1} を処理中 (${spots.length}件)...`);

  const results = [];

  for (let i = 0; i < spots.length; i++) {
    const spot = spots[i];

    try {
      // 半径500m ≈ 0.0045度の矩形範囲を計算
      const latDiff = 0.0045;
      const lngDiff = 0.0045;

      // 現在時刻から1週間後の仮の駐車時刻
      const parkingStart = new Date();
      parkingStart.setDate(parkingStart.getDate() + 7);
      parkingStart.setHours(12, 0, 0, 0);
      const durationMinutes = 1440; // 24時間

      // Supabaseから矩形範囲内の駐車場を検索
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
        // 駐車場データを追加
        const spotWithParking = {
          ...spot,
          parkingCount: parkingSpots.length,
          parkingSpots: parkingSpots
        };

        results.push(spotWithParking);

        if ((i + 1) % 10 === 0) {
          console.log(`   進捗: ${i + 1}/${spots.length} (駐車場あり: ${results.length}件)`);
        }
      }

      // レート制限を避けるため待つ
      await new Promise(resolve => setTimeout(resolve, 200));

    } catch (err) {
      console.error(`   ❌ ${spot.name}: 例外 - ${err.message}`);
    }
  }

  console.log(`✅ バッチ ${batchIndex + 1} 完了: ${results.length}件の駐車場ありスポット`);
  return results;
}

async function main() {
  // スポットを10件ずつのバッチに分割
  const batchSize = 100;
  const batches = [];

  for (let i = 0; i < allSpots.length; i += batchSize) {
    batches.push(allSpots.slice(i, i + batchSize));
  }

  console.log(`📦 ${batches.length}個のバッチに分割しました\n`);

  // 各バッチを順次処理
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

  // 駐車場数でソート
  spotsWithParking.sort((a, b) => b.parkingCount - a.parkingCount);

  // トップ20を表示
  console.log('📊 駐車場数トップ20:\n');
  spotsWithParking.slice(0, 20).forEach((spot, index) => {
    const typeLabel = spot.type === '駅' ? '🚉' : '📍';
    console.log(`${index + 1}. ${typeLabel} ${spot.fullName || spot.name}: ${spot.parkingCount}箇所`);
  });

  // HTMLページを生成
  console.log('\n\n🔨 HTMLページを生成中...\n');

  const outputDir = path.join(__dirname, 'data', 'restaurant-spots');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let generatedCount = 0;

  for (const spot of spotsWithParking) {
    const fileName = sanitizeFileName(spot.fullName || spot.name);
    const outputPath = path.join(outputDir, `${fileName}.html`);

    // 周辺施設を検索
    const nearbyRestaurants = allRestaurants.filter(r => {
      if (!r.latitude || !r.longitude) return false;
      const distance = calculateDistance(spot.latitude, spot.longitude, r.latitude, r.longitude);
      return distance <= 5000;
    }).slice(0, 20);

    const nearbyOnsen = allOnsen.filter(o => {
      if (!o.latitude || !o.longitude) return false;
      const distance = calculateDistance(spot.latitude, spot.longitude, o.latitude, o.longitude);
      return distance <= 5000;
    }).slice(0, 10);

    const html = generateHTML(spot, nearbyRestaurants, nearbyOnsen);
    fs.writeFileSync(outputPath, html, 'utf8');

    generatedCount++;
    if (generatedCount % 50 === 0) {
      console.log(`   進捗: ${generatedCount}/${spotsWithParking.length}`);
    }
  }

  console.log(`\n✅ ${generatedCount}件のHTMLページを生成しました`);
  console.log(`📁 出力先: ${outputDir}`);

  // インデックスページを生成
  generateIndexPage(spotsWithParking, outputDir);
}

function generateHTML(spot, restaurants, onsen) {
  const typeLabel = spot.type === '駅' ? '駅' : '市区町村';
  const displayName = spot.fullName || spot.name;

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${displayName}周辺の駐車場スポット | 車中泊・駐車場情報</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    h1 { font-size: 2em; margin-bottom: 10px; }
    .subtitle { opacity: 0.9; font-size: 1.1em; }
    .back-button { display: inline-block; margin: 20px 0; padding: 10px 20px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; transition: background 0.3s; }
    .back-button:hover { background: #5568d3; }
    .warning-box { background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 15px; margin: 20px 0; color: #856404; }
    .warning-box strong { display: block; margin-bottom: 10px; }
    .warning-box ul { margin: 10px 0 0 20px; line-height: 1.8; }
    #map { height: 500px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin: 20px 0; }
    .section { background: white; border-radius: 10px; padding: 25px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .section h2 { color: #667eea; border-bottom: 3px solid #667eea; padding-bottom: 10px; margin-bottom: 20px; }
    .parking-item { border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; margin: 15px 0; transition: box-shadow 0.3s; }
    .parking-item:hover { box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
    .parking-name { font-size: 1.2em; font-weight: bold; color: #333; margin-bottom: 10px; }
    .parking-info { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-top: 10px; }
    .info-item { padding: 8px; background: #f8f9fa; border-radius: 4px; }
    .info-label { font-weight: bold; color: #667eea; }
    .restaurant-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 15px; margin-top: 15px; }
    .restaurant-card { border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; transition: transform 0.2s, box-shadow 0.2s; }
    .restaurant-card:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.15); }
    .restaurant-name { font-weight: bold; color: #333; margin-bottom: 8px; }
    .onsen-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px; margin-top: 15px; }
    .onsen-card { border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; transition: transform 0.2s, box-shadow 0.2s; }
    .onsen-card:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.15); }
    footer { text-align: center; padding: 30px 20px; color: #666; margin-top: 40px; }
  </style>
</head>
<body>
  <header>
    <h1>${displayName}周辺の駐車場スポット</h1>
    <p class="subtitle">${typeLabel} | ${spot.restaurantCount}件のレストラン | ${spot.parkingCount}箇所の駐車場</p>
  </header>

  <div class="container">
    <a href="index.html" class="back-button">← 全国のスポット一覧に戻る</a>

    <div class="warning-box">
      <strong>⚠️ 重要なお知らせ</strong>
      <ul>
        <li><strong>駐車料金は参考情報です：</strong>本サービスで表示される駐車料金は、あくまで参考情報であり、実際の料金と異なる場合があります。</li>
        <li><strong>最新情報の確認：</strong>ご利用前に必ず現地または公式サイトで最新の料金、営業時間、利用条件等をご確認ください。</li>
      </ul>
    </div>

    <div id="map"></div>

    <div class="section">
      <h2>📍 周辺の駐車場スポット (${spot.parkingCount}箇所)</h2>
      ${spot.parkingSpots.map((parking, index) => `
        <div class="parking-item">
          <div class="parking-name">${index + 1}. ${parking.parking_name || '駐車場'}</div>
          <div class="parking-info">
            <div class="info-item">
              <span class="info-label">住所:</span> ${parking.address || '不明'}
            </div>
            <div class="info-item">
              <span class="info-label">距離:</span> 約${Math.round(parking.distance)}m
            </div>
            ${parking.capacity ? `
            <div class="info-item">
              <span class="info-label">収容台数:</span> ${parking.capacity}台
            </div>
            ` : ''}
            ${parking.price_info ? `
            <div class="info-item">
              <span class="info-label">料金:</span> ${parking.price_info}
            </div>
            ` : ''}
            ${parking.available_time ? `
            <div class="info-item">
              <span class="info-label">利用時間:</span> ${parking.available_time}
            </div>
            ` : ''}
          </div>
        </div>
      `).join('')}
    </div>

    ${restaurants.length > 0 ? `
    <div class="section">
      <h2>🍴 おすすめレストラン</h2>
      <div class="restaurant-grid">
        ${restaurants.map(restaurant => `
          <div class="restaurant-card">
            <div class="restaurant-name">${restaurant.name}</div>
            <div style="color: #666; font-size: 0.9em; margin-top: 5px;">
              ${restaurant.address || ''}
            </div>
            ${restaurant.rating ? `
            <div style="color: #f39c12; margin-top: 5px;">
              ⭐ ${restaurant.rating}
            </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}

    ${onsen.length > 0 ? `
    <div class="section">
      <h2>♨️ 周辺の温泉</h2>
      <div class="onsen-grid">
        ${onsen.map(o => `
          <div class="onsen-card">
            <div style="font-weight: bold; margin-bottom: 8px;">${o.name}</div>
            <div style="color: #666; font-size: 0.9em;">
              ${o.address || ''}
            </div>
            ${o.access_info ? `
            <div style="margin-top: 8px; font-size: 0.9em;">
              🚗 ${o.access_info}
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
  </footer>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
  <script>
    const map = L.map('map').setView([${spot.latitude}, ${spot.longitude}], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // 中心地マーカー
    const centerIcon = L.divIcon({
      html: '<div style="background: #e74c3c; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
      iconSize: [20, 20],
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
          html: '<div style="background: #3498db; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
          iconSize: [16, 16],
          className: ''
        });

        L.marker([parking.latitude, parking.longitude], { icon: icon })
          .addTo(map)
          .bindPopup(\`
            <b>\${parking.parking_name || '駐車場'}</b><br>
            \${parking.address || ''}<br>
            距離: 約\${Math.round(parking.distance)}m
            \${parking.capacity ? '<br>収容: ' + parking.capacity + '台' : ''}
            \${parking.price_info ? '<br>料金: ' + parking.price_info : ''}
          \`);
      }
    });
  </script>
</body>
</html>`;
}

function generateIndexPage(spots, outputDir) {
  console.log('\n📄 インデックスページを生成中...');

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>全国のレストラン周辺駐車場スポット | 車中泊・駐車場情報</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
    .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
    header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    h1 { font-size: 2.5em; margin-bottom: 15px; }
    .subtitle { opacity: 0.9; font-size: 1.2em; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
    .stat-card { background: white; border-radius: 10px; padding: 20px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .stat-number { font-size: 2.5em; font-weight: bold; color: #667eea; }
    .stat-label { color: #666; margin-top: 5px; }
    .filter-section { background: white; border-radius: 10px; padding: 20px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .search-box { width: 100%; padding: 12px; font-size: 1em; border: 2px solid #e0e0e0; border-radius: 5px; margin: 10px 0; }
    .filter-buttons { display: flex; gap: 10px; flex-wrap: wrap; margin: 10px 0; }
    .filter-btn { padding: 8px 16px; border: 2px solid #667eea; background: white; color: #667eea; border-radius: 20px; cursor: pointer; transition: all 0.3s; }
    .filter-btn:hover, .filter-btn.active { background: #667eea; color: white; }
    .spots-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 20px; margin: 20px 0; }
    .spot-card { background: white; border-radius: 10px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: transform 0.2s, box-shadow 0.2s; cursor: pointer; }
    .spot-card:hover { transform: translateY(-4px); box-shadow: 0 6px 12px rgba(0,0,0,0.15); }
    .spot-title { font-size: 1.3em; font-weight: bold; color: #333; margin-bottom: 10px; }
    .spot-type { display: inline-block; padding: 4px 12px; background: #667eea; color: white; border-radius: 12px; font-size: 0.85em; margin-bottom: 10px; }
    .spot-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
    .spot-stat { padding: 8px; background: #f8f9fa; border-radius: 5px; text-align: center; }
    .spot-stat-number { font-size: 1.5em; font-weight: bold; color: #667eea; }
    .spot-stat-label { font-size: 0.85em; color: #666; }
    footer { text-align: center; padding: 30px 20px; color: #666; margin-top: 40px; }
  </style>
</head>
<body>
  <header>
    <h1>🚗 全国のレストラン周辺駐車場スポット</h1>
    <p class="subtitle">レストランと駐車場が両方ある便利なスポット情報</p>
  </header>

  <div class="container">
    <div class="stats">
      <div class="stat-card">
        <div class="stat-number">${spots.length}</div>
        <div class="stat-label">総スポット数</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${spots.filter(s => s.type === '駅').length}</div>
        <div class="stat-label">駅</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${spots.filter(s => s.type === '市区町村').length}</div>
        <div class="stat-label">市区町村</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${spots.reduce((sum, s) => sum + s.parkingCount, 0)}</div>
        <div class="stat-label">総駐車場数</div>
      </div>
    </div>

    <div class="filter-section">
      <h2 style="margin-bottom: 15px;">🔍 検索・フィルター</h2>
      <input type="text" id="searchBox" class="search-box" placeholder="スポット名で検索...">
      <div class="filter-buttons">
        <button class="filter-btn active" onclick="filterByType('all')">すべて</button>
        <button class="filter-btn" onclick="filterByType('駅')">駅のみ</button>
        <button class="filter-btn" onclick="filterByType('市区町村')">市区町村のみ</button>
      </div>
    </div>

    <div class="spots-grid" id="spotsGrid">
      ${spots.map(spot => {
        const fileName = sanitizeFileName(spot.fullName || spot.name);
        return `
        <div class="spot-card" data-type="${spot.type}" data-name="${spot.fullName || spot.name}" onclick="location.href='${fileName}.html'">
          <div class="spot-type">${spot.type}</div>
          <div class="spot-title">${spot.fullName || spot.name}</div>
          ${spot.prefecture || spot.city ? `
          <div style="color: #666; font-size: 0.9em; margin: 5px 0;">
            ${spot.prefecture || ''} ${spot.city || ''}
          </div>
          ` : ''}
          <div class="spot-stats">
            <div class="spot-stat">
              <div class="spot-stat-number">${spot.parkingCount}</div>
              <div class="spot-stat-label">駐車場</div>
            </div>
            <div class="spot-stat">
              <div class="spot-stat-number">${spot.restaurantCount}</div>
              <div class="spot-stat-label">レストラン</div>
            </div>
          </div>
        </div>
        `;
      }).join('')}
    </div>
  </div>

  <footer>
    <p>&copy; 2025 車中泊スポット情報. All rights reserved.</p>
  </footer>

  <script>
    const allCards = document.querySelectorAll('.spot-card');
    const searchBox = document.getElementById('searchBox');
    let currentFilter = 'all';

    searchBox.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase();
      filterCards(searchTerm, currentFilter);
    });

    function filterByType(type) {
      currentFilter = type;
      const buttons = document.querySelectorAll('.filter-btn');
      buttons.forEach(btn => btn.classList.remove('active'));
      event.target.classList.add('active');

      const searchTerm = searchBox.value.toLowerCase();
      filterCards(searchTerm, type);
    }

    function filterCards(searchTerm, type) {
      allCards.forEach(card => {
        const cardType = card.getAttribute('data-type');
        const cardName = card.getAttribute('data-name').toLowerCase();

        const matchesType = type === 'all' || cardType === type;
        const matchesSearch = cardName.includes(searchTerm);

        if (matchesType && matchesSearch) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      });
    }
  </script>
</body>
</html>`;

  const indexPath = path.join(outputDir, 'index.html');
  fs.writeFileSync(indexPath, html, 'utf8');
  console.log(`✅ インデックスページを生成: ${indexPath}`);
}

main().catch(error => {
  console.error('\n💥 エラーが発生しました:', error);
  process.exit(1);
});
