const fs = require('fs');
const path = require('path');
const https = require('https');
const supabase = require('./src/supabaseClient');
const geolib = require('geolib');

// カラー表示用
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

// 入力ファイルパス
const ALL_RESTAURANT_SPOTS_FILE = '/Users/user/WebApp/camping_note/camping-spot-publisher/all-restaurant-spots.json';
const BACKUP_REGIONS_FILE = '/Users/user/WebApp/camping_note/camping-spot-publisher/data/regions-data.backup-2025-10-24T15-58-43-523Z.json';
const OUTPUT_DIR = '/Users/user/WebApp/camping_note/camping-spot-publisher/all-regions-output';

// テスト用: 最初の5地域のみ処理
const TEST_LIMIT = 5;

/**
 * 進捗バーを表示
 */
function showProgress(current, total, regionName) {
  const percentage = Math.floor((current / total) * 100);
  const barLength = 40;
  const filled = Math.floor((current / total) * barLength);
  const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);

  process.stdout.write(`\r${colors.cyan}[${bar}] ${percentage}% (${current}/${total})${colors.reset} ${colors.yellow}${regionName}${colors.reset}`);

  if (current === total) {
    console.log(''); // 改行
  }
}

/**
 * コンビニロゴをBase64エンコードして取得
 */
function loadConvenienceLogos() {
  const logosDir = path.join(__dirname, 'images', 'convenience_store_logos');
  const logos = {};

  const logoFiles = {
    'seveneleven.png': 'seveneleven',
    'Famiolymart.png': 'familymart',
    'LAWSON.png': 'lawson',
    'ministop.png': 'ministop',
    'Dailyyamazaki.png': 'dailyyamazaki',
    'Seikomart.png': 'seicomart'
  };

  for (const [filename, key] of Object.entries(logoFiles)) {
    const filepath = path.join(logosDir, filename);
    if (fs.existsSync(filepath)) {
      const imageBuffer = fs.readFileSync(filepath);
      const base64Image = imageBuffer.toString('base64');
      logos[key] = `data:image/png;base64,${base64Image}`;
    }
  }

  return logos;
}

/**
 * Wikimedia Commonsから背景画像を取得してBase64エンコード
 */
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

/**
 * 画像URLからBase64データをダウンロード
 */
function downloadImageAsBase64(url, callback) {
  https.get(url, (res) => {
    const chunks = [];
    res.on('data', (chunk) => chunks.push(chunk));
    res.on('end', () => {
      try {
        const buffer = Buffer.concat(chunks);
        const base64 = buffer.toString('base64');
        const mimeType = res.headers['content-type'] || 'image/jpeg';
        callback(`data:${mimeType};base64,${base64}`);
      } catch (err) {
        callback('');
      }
    });
  }).on('error', () => callback(''));
}

/**
 * Supabaseから駐車場データを取得
 */
async function fetchParkingData(latitude, longitude) {
  try {
    const { data: parkingSpots, error } = await supabase.rpc('get_parking_spots_sorted_by_fee', {
      user_lat: latitude,
      user_lng: longitude,
      radius_km: 3
    });

    if (error) throw error;
    return parkingSpots || [];
  } catch (error) {
    console.error(`${colors.red}駐車場データ取得エラー:${colors.reset}`, error.message);
    return [];
  }
}

/**
 * レストラン情報を取得
 */
async function fetchRestaurants(latitude, longitude) {
  const searchRadius = 500; // 500m
  const url = `https://overpass-api.de/api/interpreter?data=[out:json];(node["amenity"="restaurant"](around:${searchRadius},${latitude},${longitude});way["amenity"="restaurant"](around:${searchRadius},${latitude},${longitude}););out center;`;

  return new Promise((resolve) => {
    https.get(url, { timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          const restaurants = result.elements.map(el => ({
            name: el.tags?.name || '名称不明',
            cuisine: el.tags?.cuisine || '未分類',
            lat: el.lat || el.center?.lat,
            lng: el.lon || el.center?.lon
          })).filter(r => r.lat && r.lng);
          resolve(restaurants);
        } catch {
          resolve([]);
        }
      });
    }).on('error', () => resolve([]));
  });
}

/**
 * 温泉情報を取得
 */
async function fetchHotSprings(latitude, longitude) {
  const searchRadius = 10000; // 10km
  const url = `https://overpass-api.de/api/interpreter?data=[out:json];(node["amenity"="spa"](around:${searchRadius},${latitude},${longitude});node["leisure"="spa"](around:${searchRadius},${latitude},${longitude});node["tourism"="hotel"]["spa"="yes"](around:${searchRadius},${latitude},${longitude}););out;`;

  return new Promise((resolve) => {
    https.get(url, { timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          const hotsprings = result.elements.map(el => ({
            name: el.tags?.name || '温泉',
            lat: el.lat,
            lng: el.lon,
            distance: geolib.getDistance(
              { latitude, longitude },
              { latitude: el.lat, longitude: el.lon }
            )
          })).filter(h => h.lat && h.lng);
          resolve(hotsprings);
        } catch {
          resolve([]);
        }
      });
    }).on('error', () => resolve([]));
  });
}

/**
 * 観光地情報を取得
 */
async function fetchTouristSpots(latitude, longitude) {
  const searchRadius = 10000; // 10km
  const url = `https://overpass-api.de/api/interpreter?data=[out:json];(node["tourism"="attraction"](around:${searchRadius},${latitude},${longitude});node["historic"](around:${searchRadius},${latitude},${longitude}););out;`;

  return new Promise((resolve) => {
    https.get(url, { timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          const spots = result.elements.map(el => ({
            name: el.tags?.name || '観光地',
            type: el.tags?.tourism || el.tags?.historic || '観光地',
            lat: el.lat,
            lng: el.lon,
            distance: geolib.getDistance(
              { latitude, longitude },
              { latitude: el.lat, longitude: el.lon }
            )
          })).filter(s => s.lat && s.lng && s.name !== '観光地');
          resolve(spots);
        } catch {
          resolve([]);
        }
      });
    }).on('error', () => resolve([]));
  });
}

/**
 * 周辺施設HTMLを生成
 */
function generateNearbyFacilitiesHTML(facilities, logos) {
  if (!facilities || Object.keys(facilities).length === 0) {
    return '<div class="nearby-facilities"><p style="color: #6c757d; font-size: 0.9em;">周辺施設情報なし</p></div>';
  }

  const facilityItems = [];

  // コンビニ
  if (facilities.seveneleven > 0) {
    facilityItems.push(`<div class="facility-item"><img src="${logos.seveneleven}" alt="セブンイレブン" class="facility-logo"><span>×${facilities.seveneleven}</span></div>`);
  }
  if (facilities.familymart > 0) {
    facilityItems.push(`<div class="facility-item"><img src="${logos.familymart}" alt="ファミリーマート" class="facility-logo"><span>×${facilities.familymart}</span></div>`);
  }
  if (facilities.lawson > 0) {
    facilityItems.push(`<div class="facility-item"><img src="${logos.lawson}" alt="ローソン" class="facility-logo"><span>×${facilities.lawson}</span></div>`);
  }
  if (facilities.ministop > 0) {
    facilityItems.push(`<div class="facility-item"><img src="${logos.ministop}" alt="ミニストップ" class="facility-logo"><span>×${facilities.ministop}</span></div>`);
  }
  if (facilities.dailyyamazaki > 0) {
    facilityItems.push(`<div class="facility-item"><img src="${logos.dailyyamazaki}" alt="デイリーヤマザキ" class="facility-logo"><span>×${facilities.dailyyamazaki}</span></div>`);
  }
  if (facilities.seicomart > 0) {
    facilityItems.push(`<div class="facility-item"><img src="${logos.seicomart}" alt="セイコーマート" class="facility-logo"><span>×${facilities.seicomart}</span></div>`);
  }

  // その他の施設
  if (facilities.supermarket > 0) {
    facilityItems.push(`<div class="facility-item"><span>🏪</span><span>スーパー ×${facilities.supermarket}</span></div>`);
  }
  if (facilities.drugstore > 0) {
    facilityItems.push(`<div class="facility-item"><span>💊</span><span>ドラッグストア ×${facilities.drugstore}</span></div>`);
  }
  if (facilities.gas_station > 0) {
    facilityItems.push(`<div class="facility-item"><span>⛽</span><span>ガソリンスタンド ×${facilities.gas_station}</span></div>`);
  }
  if (facilities.hospital > 0) {
    facilityItems.push(`<div class="facility-item"><span>🏥</span><span>病院 ×${facilities.hospital}</span></div>`);
  }

  if (facilityItems.length === 0) {
    return '<div class="nearby-facilities"><p style="color: #6c757d; font-size: 0.9em;">周辺施設情報なし</p></div>';
  }

  return `
    <div class="nearby-facilities">
      <strong>🏪 周辺施設（半径500m以内）</strong>
      <div class="facility-grid">
        ${facilityItems.join('')}
      </div>
    </div>
  `;
}

/**
 * HTMLを生成する関数
 */
async function generateHTML(region, parkingData, restaurants, hotsprings, touristSpots, backgroundImage, convenienceLogos) {
  const regionName = region.name;
  const latitude = region.latitude || region.lat;
  const longitude = region.longitude || region.lng;

  // 駐車場カードHTML生成
  let parkingCardsHTML = '';
  if (parkingData && parkingData.length > 0) {
    parkingCardsHTML = parkingData.map((parking, index) => {
      const rank = index + 1;
      return `
        <div class="parking-card" data-lat="${parking.latitude}" data-lng="${parking.longitude}">
          <div class="parking-rank">${rank}位</div>
          <h3 class="parking-title">${parking.name || '駐車場'}</h3>
          <div class="parking-info">
            <div class="info-row">
              <span class="icon">📍</span>
              <span>${parking.address || '住所情報なし'}</span>
            </div>
            <div class="info-row">
              <span class="icon">💰</span>
              <span>料金: ${parking.price_info || '情報なし'}</span>
            </div>
            <div class="info-row">
              <span class="icon">🅿️</span>
              <span>台数: ${parking.capacity || '不明'}台</span>
            </div>
            <div class="info-row">
              <span class="icon">📏</span>
              <span>距離: ${(parking.distance / 1000).toFixed(1)}km</span>
            </div>
          </div>
          ${generateNearbyFacilitiesHTML(parking.nearby_facilities || {}, convenienceLogos)}
          <button class="map-button" onclick="showOnMap(${parking.latitude}, ${parking.longitude}, '${parking.name || '駐車場'}')">
            地図で見る
          </button>
        </div>
      `;
    }).join('');
  } else {
    parkingCardsHTML = '<p class="no-data">この地域には駐車場データがありません</p>';
  }

  // レストランHTML生成
  let restaurantsHTML = '';
  if (restaurants && restaurants.length > 0) {
    restaurantsHTML = restaurants.slice(0, 5).map((restaurant, index) => `
      <div class="restaurant-item">
        <span class="restaurant-rank">${index + 1}.</span>
        <span class="restaurant-name">${restaurant.name}</span>
        <span class="restaurant-cuisine">(${restaurant.cuisine})</span>
      </div>
    `).join('');
  } else {
    restaurantsHTML = '<p class="no-data">レストラン情報がありません</p>';
  }

  // 温泉HTML生成
  let hotspringsHTML = '';
  if (hotsprings && hotsprings.length > 0) {
    hotspringsHTML = hotsprings.slice(0, 3).map((hotspring, index) => `
      <div class="hotspring-item">
        <span class="hotspring-rank">${index + 1}.</span>
        <span class="hotspring-name">${hotspring.name}</span>
        <span class="hotspring-distance">(${(hotspring.distance / 1000).toFixed(1)}km)</span>
      </div>
    `).join('');
  } else {
    hotspringsHTML = '<p class="no-data">温泉情報がありません</p>';
  }

  // 観光地HTML生成
  let touristSpotsHTML = '';
  if (touristSpots && touristSpots.length > 0) {
    touristSpotsHTML = touristSpots.slice(0, 5).map((spot, index) => `
      <div class="tourist-item">
        <span class="tourist-rank">${index + 1}.</span>
        <span class="tourist-name">${spot.name}</span>
        <span class="tourist-type">(${spot.type})</span>
        <span class="tourist-distance"> - ${(spot.distance / 1000).toFixed(1)}km</span>
      </div>
    `).join('');
  } else {
    touristSpotsHTML = '<p class="no-data">観光地情報がありません</p>';
  }

  // 背景画像のスタイル
  const backgroundStyle = backgroundImage
    ? `background-image: url('${backgroundImage}');`
    : 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);';

  // HTMLテンプレート
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${regionName}の車中泊スポット - 駐車場・周辺施設情報</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Sans', sans-serif;
      background: #f5f7fa;
      color: #2c3e50;
      line-height: 1.6;
    }

    .header {
      ${backgroundStyle}
      background-size: cover;
      background-position: center;
      color: white;
      padding: 60px 20px;
      text-align: center;
      position: relative;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }

    .header::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.4);
      z-index: 1;
    }

    .header-content {
      position: relative;
      z-index: 2;
    }

    .header h1 {
      font-size: 2.5em;
      margin-bottom: 10px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
    }

    .header p {
      font-size: 1.2em;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
    }

    .back-button {
      display: inline-block;
      margin: 20px;
      padding: 12px 24px;
      background: white;
      color: #667eea;
      text-decoration: none;
      border-radius: 8px;
      font-weight: bold;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      transition: all 0.3s ease;
    }

    .back-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }

    .section {
      background: white;
      border-radius: 12px;
      padding: 30px;
      margin-bottom: 30px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .section h2 {
      color: #667eea;
      font-size: 1.8em;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 3px solid #667eea;
    }

    .parking-card {
      background: #f8f9fa;
      border-left: 4px solid #667eea;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
      transition: all 0.3s ease;
    }

    .parking-card:hover {
      transform: translateX(5px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .parking-rank {
      display: inline-block;
      background: #667eea;
      color: white;
      padding: 5px 15px;
      border-radius: 20px;
      font-weight: bold;
      margin-bottom: 10px;
    }

    .parking-title {
      font-size: 1.4em;
      color: #2c3e50;
      margin-bottom: 15px;
    }

    .parking-info {
      margin: 15px 0;
    }

    .info-row {
      display: flex;
      align-items: center;
      margin: 8px 0;
      font-size: 0.95em;
    }

    .info-row .icon {
      width: 30px;
      font-size: 1.2em;
    }

    .nearby-facilities {
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid #dee2e6;
    }

    .facility-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 10px;
      margin-top: 10px;
    }

    .facility-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      background: white;
      border-radius: 6px;
      font-size: 0.9em;
    }

    .facility-logo {
      width: 24px;
      height: 24px;
      object-fit: contain;
    }

    .map-button {
      background: #667eea;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 1em;
      margin-top: 10px;
      transition: background 0.3s ease;
    }

    .map-button:hover {
      background: #5568d3;
    }

    #map {
      width: 100%;
      height: 500px;
      border-radius: 12px;
      margin-top: 20px;
    }

    .restaurant-item, .hotspring-item, .tourist-item {
      padding: 12px;
      margin: 10px 0;
      background: #f8f9fa;
      border-radius: 6px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .restaurant-rank, .hotspring-rank, .tourist-rank {
      font-weight: bold;
      color: #667eea;
      min-width: 30px;
    }

    .restaurant-name, .hotspring-name, .tourist-name {
      flex: 1;
      font-weight: 500;
    }

    .restaurant-cuisine, .hotspring-distance, .tourist-type, .tourist-distance {
      color: #6c757d;
      font-size: 0.9em;
    }

    .no-data {
      color: #6c757d;
      font-style: italic;
      padding: 20px;
      text-align: center;
    }

    @media (max-width: 768px) {
      .header h1 {
        font-size: 1.8em;
      }

      .facility-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-content">
      <h1>🚗 ${regionName}の車中泊スポット</h1>
      <p>駐車場と周辺施設の情報</p>
    </div>
  </div>

  <a href="../index.html" class="back-button">← 全国の車中泊スポットマップに戻る</a>

  <div class="container">
    <!-- 注意喚起 -->
    <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 15px; margin: 20px; color: #856404;">
      <strong>⚠️ 重要なお知らせ</strong>
      <ul style="margin: 10px 0 0 20px; line-height: 1.8;">
        <li><strong>駐車料金は参考情報です：</strong>本サービスで表示される駐車料金は、あくまで参考情報であり、実際の料金と異なる場合があります。</li>
        <li><strong>最新情報の確認：</strong>ご利用前に必ず現地または公式サイトで最新の料金、営業時間、利用条件等をご確認ください。</li>
      </ul>
    </div>

    <div class="section">
      <h2>🅿️ おすすめ駐車場</h2>
      ${parkingCardsHTML}
    </div>

    <div class="section">
      <h2>🗺️ 地図</h2>
      <div id="map"></div>
    </div>

    <div class="section">
      <h2>🍴 おすすめレストラン</h2>
      ${restaurantsHTML}
    </div>

    <div class="section">
      <h2>♨️ 近くの温泉</h2>
      ${hotspringsHTML}
    </div>

    <div class="section">
      <h2>🏛️ 観光スポット</h2>
      ${touristSpotsHTML}
    </div>
  </div>

  <script>
    const regionLat = ${latitude};
    const regionLng = ${longitude};
    const parkingData = ${JSON.stringify(parkingData || [])};

    const map = L.map('map').setView([regionLat, regionLng], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // 地域マーカー
    L.marker([regionLat, regionLng], {
      icon: L.divIcon({
        className: 'custom-icon',
        html: '<div style="background: #667eea; color: white; padding: 5px 10px; border-radius: 15px; font-weight: bold;">📍 ${regionName}</div>',
        iconSize: [100, 40]
      })
    }).addTo(map);

    // 駐車場マーカー
    parkingData.forEach((parking, index) => {
      const marker = L.marker([parking.latitude, parking.longitude]).addTo(map);
      marker.bindPopup(\`
        <div style="min-width: 200px;">
          <strong>\${index + 1}位: \${parking.name || '駐車場'}</strong><br>
          📍 \${parking.address || '住所情報なし'}<br>
          💰 \${parking.price_info || '情報なし'}<br>
          🅿️ \${parking.capacity || '不明'}台
        </div>
      \`);
    });

    function showOnMap(lat, lng, name) {
      map.setView([lat, lng], 15);
      parkingData.forEach((parking, index) => {
        if (parking.latitude === lat && parking.longitude === lng) {
          const marker = L.marker([lat, lng]);
          marker.openPopup();
        }
      });
    }
  </script>
</body>
</html>`;
}

/**
 * 地域を処理してHTMLを生成
 */
async function processRegion(region, index, total, convenienceLogos) {
  const regionName = region.name;
  const latitude = region.latitude || region.lat;
  const longitude = region.longitude || region.lng;

  showProgress(index + 1, total, regionName);

  try {
    // データを並列取得
    const [parkingData, restaurants, hotsprings, touristSpots, backgroundImage] = await Promise.all([
      fetchParkingData(latitude, longitude),
      fetchRestaurants(latitude, longitude),
      fetchHotSprings(latitude, longitude),
      fetchTouristSpots(latitude, longitude),
      fetchWikimediaImageBase64(regionName)
    ]);

    // HTML生成
    const html = await generateHTML(
      region,
      parkingData,
      restaurants,
      hotsprings,
      touristSpots,
      backgroundImage,
      convenienceLogos
    );

    // ファイル名を生成（特殊文字を除去）
    const safeFileName = regionName.replace(/[\/\\?%*:|"<>]/g, '_');
    const outputPath = path.join(OUTPUT_DIR, `${safeFileName}.html`);

    // HTMLを保存
    fs.writeFileSync(outputPath, html, 'utf8');

    return {
      success: true,
      name: regionName,
      parkingCount: parkingData.length,
      restaurantCount: restaurants.length,
      hotspringCount: hotsprings.length,
      touristSpotCount: touristSpots.length
    };
  } catch (error) {
    console.error(`\n${colors.red}エラー [${regionName}]:${colors.reset}`, error.message);
    return {
      success: false,
      name: regionName,
      error: error.message
    };
  }
}

/**
 * メイン処理
 */
async function main() {
  console.log(`${colors.cyan}==================================================${colors.reset}`);
  console.log(`${colors.cyan}  テスト: 5地域HTMLページ生成${colors.reset}`);
  console.log(`${colors.cyan}==================================================${colors.reset}\n`);

  // コンビニロゴを読み込み
  const convenienceLogos = loadConvenienceLogos();

  // JSONファイルを読み込み
  console.log(`${colors.blue}JSONファイルを読み込み中...${colors.reset}`);

  let allRegions = [];

  // all-restaurant-spots.jsonを読み込み
  if (fs.existsSync(ALL_RESTAURANT_SPOTS_FILE)) {
    const restaurantData = JSON.parse(fs.readFileSync(ALL_RESTAURANT_SPOTS_FILE, 'utf8'));
    if (restaurantData.spots && Array.isArray(restaurantData.spots)) {
      allRegions = allRegions.concat(restaurantData.spots);
      console.log(`${colors.green}✓ all-restaurant-spots.json: ${restaurantData.spots.length}件のスポット${colors.reset}`);
    }
  }

  // regions-data.backup.jsonを読み込み
  if (fs.existsSync(BACKUP_REGIONS_FILE)) {
    const backupData = JSON.parse(fs.readFileSync(BACKUP_REGIONS_FILE, 'utf8'));
    if (Array.isArray(backupData)) {
      allRegions = allRegions.concat(backupData);
      console.log(`${colors.green}✓ regions-data.backup: ${backupData.length}件の地域${colors.reset}`);
    }
  }

  // 重複を除去（名前ベース）
  const uniqueRegions = [];
  const seenNames = new Set();

  for (const region of allRegions) {
    const name = region.name;
    if (!seenNames.has(name)) {
      seenNames.add(name);
      uniqueRegions.push(region);
    }
  }

  console.log(`${colors.yellow}重複除去後: ${uniqueRegions.length}件の地域${colors.reset}`);
  console.log(`${colors.yellow}テスト: 最初の${TEST_LIMIT}地域のみ処理します${colors.reset}\n`);

  // 出力ディレクトリを確認
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // テスト用に最初の5地域のみ処理
  const testRegions = uniqueRegions.slice(0, TEST_LIMIT);

  console.log(`${colors.blue}処理する地域:${colors.reset}`);
  testRegions.forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.name}`);
  });
  console.log('');

  // 各地域を処理
  const results = [];
  for (let i = 0; i < testRegions.length; i++) {
    const result = await processRegion(testRegions[i], i, testRegions.length, convenienceLogos);
    results.push(result);

    // APIレート制限を避けるため少し待機
    if (i < testRegions.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // 結果サマリー
  console.log(`\n${colors.cyan}==================================================${colors.reset}`);
  console.log(`${colors.green}✓ テスト完了!${colors.reset}\n`);

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  console.log(`${colors.green}成功: ${successCount}件${colors.reset}`);
  console.log(`${colors.red}失敗: ${failCount}件${colors.reset}`);

  console.log(`\n${colors.blue}生成されたファイル:${colors.reset}`);
  results.forEach(r => {
    if (r.success) {
      console.log(`  ${colors.green}✓${colors.reset} ${r.name}.html`);
      console.log(`    - 駐車場: ${r.parkingCount}件`);
      console.log(`    - レストラン: ${r.restaurantCount}件`);
      console.log(`    - 温泉: ${r.hotspringCount}件`);
      console.log(`    - 観光地: ${r.touristSpotCount}件`);
    } else {
      console.log(`  ${colors.red}✗${colors.reset} ${r.name}: ${r.error}`);
    }
  });

  console.log(`\n${colors.blue}出力先: ${OUTPUT_DIR}${colors.reset}`);
  console.log(`${colors.cyan}==================================================${colors.reset}\n`);
}

// 実行
main().catch(error => {
  console.error(`${colors.red}致命的エラー:${colors.reset}`, error);
  process.exit(1);
});
