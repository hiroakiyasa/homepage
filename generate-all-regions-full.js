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
    'Seikomart.png': 'seikomart'
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
            // デフォルト画像を使用
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
  const options = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
  };

  https.get(url, options, (res) => {
    if (res.statusCode === 301 || res.statusCode === 302) {
      downloadImageAsBase64(res.headers.location, callback);
      return;
    }

    if (res.statusCode !== 200) {
      callback('');
      return;
    }

    const chunks = [];
    res.on('data', (chunk) => chunks.push(chunk));
    res.on('end', () => {
      const buffer = Buffer.concat(chunks);
      const base64 = buffer.toString('base64');
      callback(`data:image/jpeg;base64,${base64}`);
    });
  }).on('error', () => callback(''));
}

/**
 * 距離計算
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  return geolib.getDistance(
    { latitude: lat1, longitude: lng1 },
    { latitude: lat2, longitude: lng2 }
  );
}

/**
 * 徒歩時間計算（80m/分）
 */
function calculateWalkingMinutes(distanceM) {
  return Math.ceil(distanceM / 80);
}

/**
 * 周辺施設を取得
 */
async function getNearbyFacilities(parkingSpot) {
  const facilities = {
    convenience_stores: [],
    toilets: [],
    hot_springs: []
  };

  try {
    // コンビニ取得（300m以内）
    const { data: convenienceStores } = await supabase
      .from('convenience_stores')
      .select('*')
      .gte('lat', parkingSpot.lat - 0.003)
      .lte('lat', parkingSpot.lat + 0.003)
      .gte('lng', parkingSpot.lng - 0.003)
      .lte('lng', parkingSpot.lng + 0.003);

    if (convenienceStores) {
      facilities.convenience_stores = convenienceStores
        .map(store => ({
          ...store,
          distance: calculateDistance(parkingSpot.lat, parkingSpot.lng, store.lat, store.lng)
        }))
        .filter(store => store.distance <= 300)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 3);
    }

    // トイレ取得（300m以内）
    const { data: toilets } = await supabase
      .from('toilets')
      .select('*')
      .gte('lat', parkingSpot.lat - 0.003)
      .lte('lat', parkingSpot.lat + 0.003)
      .gte('lng', parkingSpot.lng - 0.003)
      .lte('lng', parkingSpot.lng + 0.003);

    if (toilets) {
      facilities.toilets = toilets
        .map(toilet => ({
          ...toilet,
          distance: calculateDistance(parkingSpot.lat, parkingSpot.lng, toilet.lat, toilet.lng)
        }))
        .filter(toilet => toilet.distance <= 300)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 3);
    }

    // 温泉取得（2km以内）
    const { data: hotSprings } = await supabase
      .from('hot_springs')
      .select('*')
      .gte('lat', parkingSpot.lat - 0.02)
      .lte('lat', parkingSpot.lat + 0.02)
      .gte('lng', parkingSpot.lng - 0.02)
      .lte('lng', parkingSpot.lng + 0.02);

    if (hotSprings) {
      facilities.hot_springs = hotSprings
        .map(spring => ({
          ...spring,
          distance: calculateDistance(parkingSpot.lat, parkingSpot.lng, spring.lat, spring.lng)
        }))
        .filter(spring => spring.distance <= 2000)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 3);
    }

  } catch (error) {
    console.error(`   ⚠️  周辺施設取得エラー:`, error.message);
  }

  return facilities;
}

/**
 * 駐車場データを取得（料金順トップ10）
 */
async function getParkingSpots(regionData) {
  try {
    // 駐車条件を設定（18:00-8:00の14時間）
    const parkingStart = new Date();
    parkingStart.setHours(18, 0, 0, 0);
    const durationMinutes = 840; // 14時間

    // 地域の座標から検索範囲を計算（±0.0045度 ≈ 約500m）
    const region = {
      minLat: regionData.lat - 0.0045,
      maxLat: regionData.lat + 0.0045,
      minLng: regionData.lng - 0.0045,
      maxLng: regionData.lng + 0.0045
    };

    // Supabase RPC呼び出し
    const { data: parkingSpots, error } = await supabase.rpc('get_parking_spots_sorted_by_fee', {
      min_lat: region.minLat,
      max_lat: region.maxLat,
      min_lng: region.minLng,
      max_lng: region.maxLng,
      duration_minutes: durationMinutes,
      parking_start: parkingStart.toISOString()
    });

    if (error) {
      console.error(`   ⚠️  RPC関数エラー:`, error.message);
      return [];
    }

    if (!parkingSpots || parkingSpots.length === 0) {
      return [];
    }

    // 返却されたデータを処理
    const processed = await Promise.all(parkingSpots.map(async spot => {
      const lat = spot.latitude || spot.lat;
      const lng = spot.longitude || spot.lng;

      const distance = calculateDistance(
        regionData.lat, regionData.lng,
        lat, lng
      );

      const walkingMinutes = calculateWalkingMinutes(distance);

      // 周辺施設データをパース
      let nearest_convenience_store = null;
      let nearest_hotspring = null;
      let nearest_toilet = spot.nearest_toilet;

      if (spot.nearest_convenience_store) {
        if (typeof spot.nearest_convenience_store === 'string') {
          try {
            nearest_convenience_store = JSON.parse(spot.nearest_convenience_store);
          } catch (e) {
            // パースエラーは無視
          }
        } else {
          nearest_convenience_store = spot.nearest_convenience_store;
        }
      }

      if (spot.nearest_hotspring) {
        if (typeof spot.nearest_hotspring === 'string') {
          try {
            nearest_hotspring = JSON.parse(spot.nearest_hotspring);
          } catch (e) {
            // パースエラーは無視
          }
        } else {
          nearest_hotspring = spot.nearest_hotspring;
        }
      }

      // 地図マーカー用に座標付きの施設データを取得
      const facilities = await getNearbyFacilities({ lat, lng });

      // バックエンドからnearest_toiletが返されない場合、フロントエンドで取得したデータを使用
      if (!nearest_toilet && facilities.toilets.length > 0) {
        const closestToilet = facilities.toilets[0];
        nearest_toilet = {
          name: closestToilet.name,
          distance_m: closestToilet.distance,
          lat: closestToilet.lat,
          lng: closestToilet.lng
        };
      }

      // バックエンドからnearest_hotsringが返されない場合、フロントエンドで取得したデータを使用
      if (!nearest_hotspring && facilities.hot_springs.length > 0) {
        const closestOnsen = facilities.hot_springs[0];
        nearest_hotspring = {
          name: closestOnsen.name,
          distance_m: closestOnsen.distance,
          lat: closestOnsen.lat,
          lng: closestOnsen.lng
        };
      }

      return {
        ...spot,
        lat,
        lng,
        distance_to_center: distance,
        walking_minutes: walkingMinutes,
        nearest_convenience_store,
        nearest_hotspring,
        nearest_toilet,
        facilities
      };
    }));

    // 半径500m以内の駐車場のみフィルタリング
    const filtered = processed.filter(spot => spot.distance_to_center <= 500);

    // バックエンドで既に料金順にソート済みなので、上位10件のみ取得
    return filtered.slice(0, 10);
  } catch (error) {
    console.error(`   ⚠️  駐車場データ取得エラー:`, error.message);
    return [];
  }
}

/**
 * 地図HTMLを生成
 */
function generateMapHTML(regionData, parkingSpots, topRestaurants, convenienceLogos) {
  const markers = [];

  // エリア中心マーカー
  markers.push({
    type: 'center',
    id: 'area_center',
    lat: regionData.lat,
    lng: regionData.lng,
    title: regionData.name,
    description: '周辺のおすすめ車中泊スポット',
    color: '#d32f2f'
  });

  // 駐車場マーカー
  parkingSpots.forEach((spot, index) => {
    markers.push({
      type: 'parking',
      id: `parking_${index}`,
      lat: spot.lat,
      lng: spot.lng,
      title: spot.name,
      number: index + 1,  // 順位（1, 2, 3...）
      distance: `${spot.distance_to_center}m`,
      walking: `徒歩約${spot.walking_minutes}分`,
      color: '#1976d2'
    });

    // 駐車場の周辺施設マーカー
    if (spot.facilities) {
      // コンビニマーカー
      spot.facilities.convenience_stores.forEach((store, i) => {
        const subType = store.sub_type || store.name || '';
        let logoKey = null;
        if (subType.includes('セブン') || subType.includes('7')) logoKey = 'seveneleven';
        else if (subType.includes('ファミ') || subType.includes('Family')) logoKey = 'familymart';
        else if (subType.includes('ローソン') || subType.includes('Lawson')) logoKey = 'lawson';
        else if (subType.includes('ミニストップ')) logoKey = 'ministop';
        else if (subType.includes('デイリー')) logoKey = 'dailyyamazaki';
        else if (subType.includes('セイコ')) logoKey = 'seikomart';

        markers.push({
          type: 'convenience',
          id: `convenience_${index}_${i}`,
          lat: store.lat,
          lng: store.lng,
          title: store.name,
          subType: subType,
          logo: logoKey && convenienceLogos[logoKey] ? convenienceLogos[logoKey] : null
        });
      });

      // トイレマーカー
      spot.facilities.toilets.forEach((toilet, i) => {
        markers.push({
          type: 'toilet',
          id: `toilet_${index}_${i}`,
          lat: toilet.lat,
          lng: toilet.lng,
          title: toilet.name,
          distance: `${toilet.distance}m`,
          color: '#795548'
        });
      });

      // 温泉マーカー
      spot.facilities.hot_springs.forEach((onsen, i) => {
        markers.push({
          type: 'onsen',
          id: `onsen_${index}_${i}`,
          lat: onsen.lat,
          lng: onsen.lng,
          title: onsen.name,
          distance: `${(onsen.distance / 1000).toFixed(1)}km`,
          color: '#f8bbd0'
        });
      });
    }
  });

  // レストランマーカー
  topRestaurants.forEach((restaurant, index) => {
    markers.push({
      type: 'restaurant',
      id: `restaurant_${index}`,
      lat: restaurant.latitude,
      lng: restaurant.longitude,
      title: restaurant.name,
      number: index + 1,  // 順位（1, 2, 3, 4, 5）
      genre: restaurant.genre,
      address: restaurant.address,
      color: '#ff9800'
    });
  });

  const mapHTML = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${regionData.name} - 地図</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { height: 100%; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    #map { width: 100%; height: 100%; }

    .custom-marker {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: bold;
      cursor: pointer;
      transition: transform 0.2s;
    }

    .custom-marker:hover {
      transform: scale(1.2);
      z-index: 1000;
    }

    /* コンビニロゴマーカー */
    .convenience-logo-marker {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      background: white;
      border: 2px solid #4caf50;
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
      padding: 4px;
      cursor: pointer;
      transition: transform 0.2s;
    }

    .convenience-logo-marker:hover {
      transform: scale(1.2);
      z-index: 1000;
    }

    .convenience-logo-marker img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .marker-center { background: #d32f2f; }
    .marker-parking { background: #1976d2; }
    .marker-toilet { background: #795548; }
    .marker-onsen { background: #f8bbd0; }
    .marker-restaurant { background: #ff9800; }

    .leaflet-popup-content { min-width: 200px; }
    .popup-title { font-weight: bold; font-size: 14px; margin-bottom: 6px; }
    .popup-info { font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    // 地図初期化
    const map = L.map('map').setView([${regionData.lat}, ${regionData.lng}], 15);

    // OpenStreetMap タイル
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    // マーカーデータ
    const markers = ${JSON.stringify(markers, null, 4)};

    // マーカーオブジェクトを保存
    const markerObjects = {};

    // アイコン取得関数
    function getMarkerIcon(type, number) {
      if (type === 'parking' && number) {
        return number;
      }
      if (type === 'restaurant' && number) {
        return number;
      }
      const icons = {
        center: '📍',
        parking: '🅿️',
        toilet: '🚻',
        onsen: '♨️',
        restaurant: '🍴'
      };
      return icons[type] || '📌';
    }

    // マーカーを作成
    markers.forEach(markerData => {
      let icon;
      let zIndexOffset = 0;

      // z-indexの設定（駐車場を最前面に）
      if (markerData.type === 'parking') {
        zIndexOffset = 1000;
      } else if (markerData.type === 'center') {
        zIndexOffset = 900;
      } else if (markerData.type === 'restaurant') {
        zIndexOffset = 800;
      } else if (markerData.type === 'convenience') {
        zIndexOffset = 700;
      } else if (markerData.type === 'toilet') {
        zIndexOffset = 600;
      } else if (markerData.type === 'onsen') {
        zIndexOffset = 500;
      }

      // コンビニの場合はロゴ画像を使用（Base64埋め込み）
      if (markerData.type === 'convenience' && markerData.logo) {
        icon = L.divIcon({
          className: 'custom-icon',
          html: \`<div class="convenience-logo-marker"><img src="\${markerData.logo}" alt="\${markerData.subType}"></div>\`,
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        });
      } else {
        // その他のマーカーは従来通り
        icon = L.divIcon({
          className: 'custom-icon',
          html: \`<div class="custom-marker marker-\${markerData.type}" style="background-color: \${markerData.color}">\${getMarkerIcon(markerData.type, markerData.number)}</div>\`,
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        });
      }

      // マーカー作成（zIndexOffsetを指定）
      const marker = L.marker([markerData.lat, markerData.lng], {
        icon: icon,
        zIndexOffset: zIndexOffset
      }).addTo(map);

      // ポップアップ内容
      let popupContent = \`<div class="popup-title">\${markerData.title}</div>\`;

      if (markerData.subType) {
        popupContent += \`<div class="popup-info">🏪 \${markerData.subType}</div>\`;
      }
      if (markerData.description) {
        popupContent += \`<div class="popup-info">\${markerData.description}</div>\`;
      }
      if (markerData.distance) {
        popupContent += \`<div class="popup-info">📍 \${markerData.distance}</div>\`;
      }
      if (markerData.walking) {
        popupContent += \`<div class="popup-info">🚶 \${markerData.walking}</div>\`;
      }
      if (markerData.genre) {
        popupContent += \`<div class="popup-info">🍽️ \${markerData.genre}</div>\`;
      }
      if (markerData.address) {
        popupContent += \`<div class="popup-info" style="margin-top: 4px;">\${markerData.address}</div>\`;
      }

      marker.bindPopup(popupContent);

      // マーカーオブジェクトを保存
      markerObjects[markerData.id] = marker;
    });

    // 外部から呼び出せる関数
    window.showMarker = function(markerId) {
      const marker = markerObjects[markerId];
      if (marker) {
        // アニメーションで地図を移動
        map.setView(marker.getLatLng(), 17, {
          animate: true,
          duration: 0.5
        });
        marker.openPopup();
      }
    };
  </script>
</body>
</html>`;

  return mapHTML;
}

/**
 * メインHTMLを生成
 */
async function generateMainHTML(regionData, parkingSpots, topRestaurants, convenienceLogos) {
  // 背景画像を取得（タイムアウト付き）
  let backgroundImageBase64 = '';
  try {
    backgroundImageBase64 = await Promise.race([
      fetchWikimediaImageBase64(regionData.name),
      new Promise((resolve) => setTimeout(() => resolve(''), 5000)) // 5秒タイムアウト
    ]);
  } catch (err) {
    // エラー時は空文字列を使用
  }

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

    .map-layout-left iframe {
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

    .parking-facilities {
      color: #555;
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: 11px;
      flex-wrap: wrap;
    }

    .facility-item {
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
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
          <iframe id="parking-map-iframe" src="${regionData.fileName}-map.html"></iframe>
        </div>

        <div class="map-layout-right">
          <h4>📍 クリックして地図に表示</h4>

          <!-- エリア中心 -->
          <div class="area-center-card" onclick="showMarker('area_center')">
            <strong>🔴 エリア中心: ${regionData.name}</strong>
            <a href="https://www.google.com/maps?q=${regionData.lat},${regionData.lng}" target="_blank" onclick="event.stopPropagation()" class="btn-icon">🗺️</a>
          </div>

`;

  // 駐車場リスト生成
  parkingSpots.forEach((spot, index) => {
    const facilities = [];

    // コンビニ
    if (spot.nearest_convenience_store) {
      const conv = spot.nearest_convenience_store;
      const distanceM = conv.distance_m || conv.distance || 0;
      const convName = conv.name || 'コンビニ';
      const subType = conv.sub_type || convName;

      let logoKey = null;
      if (subType.includes('セブン') || subType.includes('7')) logoKey = 'seveneleven';
      else if (subType.includes('ファミ') || subType.includes('Family')) logoKey = 'familymart';
      else if (subType.includes('ローソン') || subType.includes('Lawson')) logoKey = 'lawson';
      else if (subType.includes('ミニストップ')) logoKey = 'ministop';
      else if (subType.includes('デイリー')) logoKey = 'dailyyamazaki';
      else if (subType.includes('セイコ')) logoKey = 'seikomart';

      const logoHtml = (logoKey && convenienceLogos[logoKey])
        ? `<img src="${convenienceLogos[logoKey]}" alt="${subType}" style="height: 16px; width: auto; margin-right: 4px;">`
        : '🏪';

      facilities.push(`<div class="facility-item">${logoHtml} ${convName} (${distanceM}m)</div>`);
    }

    // トイレ
    if (spot.nearest_toilet) {
      const toilet = spot.nearest_toilet;
      const distanceM = toilet.distance_m || toilet.distance || 0;
      facilities.push(`<div class="facility-item">🚻 ${toilet.name} (${distanceM}m)</div>`);
    }

    // 温泉
    if (spot.nearest_hotspring) {
      const onsen = spot.nearest_hotspring;
      const distanceM = onsen.distance_m || onsen.distance || 0;
      const distanceKm = (distanceM / 1000).toFixed(1);
      facilities.push(`<div class="facility-item">♨️ ${onsen.name} (${distanceKm}km)</div>`);
    }

    // ランキングアイコン
    let rankIcon = '🔵';
    if (index === 0) rankIcon = '🥇';
    else if (index === 1) rankIcon = '🥈';
    else if (index === 2) rankIcon = '🥉';

    // 計算済み料金を表示
    const calculatedFeeText = spot.calculated_fee !== null && spot.calculated_fee !== undefined
      ? `¥${spot.calculated_fee.toLocaleString()} (18:00-8:00)`
      : '料金情報なし';

    html += `
          <!-- 駐車場${index + 1} -->
          <div class="parking-card" onclick="showMarker('parking_${index}')">
            <div class="parking-card-header">
              <strong>${rankIcon} ${index + 1}位: ${spot.name}</strong>
              <div class="parking-card-buttons">
                <a href="https://www.google.com/maps?q=${spot.lat},${spot.lng}" target="_blank" onclick="event.stopPropagation()" class="btn-icon">🗺️</a>
                <a href="https://www.google.com/search?q=${encodeURIComponent(spot.name)}" target="_blank" onclick="event.stopPropagation()" class="btn-icon btn-search">🔍</a>
              </div>
            </div>

            <div class="parking-info">
              <div class="parking-info-left">
                <div>📍 徒歩約${spot.walking_minutes}分 (${spot.distance_to_center}m)</div>
                <div class="parking-fee">💰 ${calculatedFeeText}</div>
              </div>

`;

    if (facilities.length > 0) {
      html += `
              <div style="color: #666; flex-shrink: 0;">|</div>
              <div class="parking-facilities">
                ${facilities.join('\n                ')}
              </div>
`;
    }

    html += `
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

  // レストランカード生成（連番で表示、順番はランダム）
  topRestaurants.forEach((restaurant, index) => {
    const number = index + 1; // 1, 2, 3, 4, 5

    html += `
        <div class="restaurant-card" onclick="showMarker('restaurant_${index}')">
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

  <script>
    function showMarker(markerId) {
      const iframe = document.getElementById('parking-map-iframe');
      if (iframe && iframe.contentWindow && iframe.contentWindow.showMarker) {
        iframe.contentWindow.showMarker(markerId);
        // 地図までスクロール
        iframe.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  </script>
</body>
</html>`;

  return html;
}

/**
 * 1地域の完全なHTMLを生成
 */
async function generateRegionFullHTML(regionData, convenienceLogos, outputDir) {
  const { name, fileName } = regionData;

  try {
    // レストランデータを読み込む（restaurants_dataとrestaurants_data_top5の両方をチェック）
    let restaurantDataPath = `/Users/user/WebApp/camping_note/restaurants_data/area_${fileName}.json`;
    let restaurantData;

    if (fs.existsSync(restaurantDataPath)) {
      // restaurants_dataフォルダから読み込み
      restaurantData = JSON.parse(fs.readFileSync(restaurantDataPath, 'utf8'));
    } else {
      // restaurants_data_top5フォルダから読み込み
      restaurantDataPath = `/Users/user/WebApp/camping_note/restaurants_data_top5/top5_${fileName}.json`;

      if (!fs.existsSync(restaurantDataPath)) {
        console.log(`   ${colors.red}✗${colors.reset} ${fileName}: レストランデータが見つかりません`);
        return { success: false, reason: 'レストランデータなし' };
      }

      restaurantData = JSON.parse(fs.readFileSync(restaurantDataPath, 'utf8'));
    }

    // エリア中心から500m以内のレストランをフィルタリング
    const restaurantsWithDistance = restaurantData.restaurants.map(restaurant => {
      // レストランデータはlatitude/longitudeフィールドを使用
      const restLat = restaurant.latitude || restaurant.lat;
      const restLng = restaurant.longitude || restaurant.lng;

      if (!restLat || !restLng) {
        return null;
      }

      const distance = geolib.getDistance(
        { latitude: regionData.lat, longitude: regionData.lng },
        { latitude: restLat, longitude: restLng }
      );

      return {
        ...restaurant,
        lat: restLat,  // 地図表示用にlatフィールドも追加
        lng: restLng,  // 地図表示用にlngフィールドも追加
        distance
      };
    }).filter(r => r !== null && r.distance <= 500);

    // スコアでソート（スコアが高い順）して上位5件を取得し、ランダムに並び替える
    const topRestaurants = restaurantsWithDistance
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 5)
      .sort(() => Math.random() - 0.5); // ランダムソート

    // 駐車場データを取得（Supabase RPC経由）
    const parkingSpots = await getParkingSpots(regionData);

    if (parkingSpots.length === 0) {
      console.log(`   ${colors.yellow}⚠${colors.reset}  ${fileName}: 駐車場データが見つかりません（スキップ）`);
      return { success: false, reason: '駐車場データなし' };
    }

    // 地図HTMLを生成
    const mapHTML = generateMapHTML(regionData, parkingSpots, topRestaurants, convenienceLogos);
    const mapPath = path.join(outputDir, `${fileName}-map.html`);
    fs.writeFileSync(mapPath, mapHTML, 'utf8');

    // メインHTMLを生成
    const mainHTML = await generateMainHTML(regionData, parkingSpots, topRestaurants, convenienceLogos);
    const mainPath = path.join(outputDir, `${fileName}.html`);
    fs.writeFileSync(mainPath, mainHTML, 'utf8');

    return {
      success: true,
      parkingCount: parkingSpots.length,
      restaurantCount: topRestaurants.length
    };

  } catch (err) {
    console.log(`   ${colors.red}✗${colors.reset} ${fileName}: ${err.message}`);
    return { success: false, reason: err.message };
  }
}

/**
 * メイン処理
 */
async function main() {
  const testMode = process.argv.includes('--test');

  console.log(`${colors.blue}=== ${testMode ? 'テスト: 1地域のHTML生成' : '298地域の完全版HTML自動生成'} ===${colors.reset}\n`);

  // コンビニロゴを事前にロード
  console.log('🏪 コンビニロゴを読み込み中...');
  const convenienceLogos = loadConvenienceLogos();
  console.log(`   ✅ ${Object.keys(convenienceLogos).length}種類のロゴを読み込みました\n`);

  // 地域データを読み込む
  const regionsDataPath = path.join(__dirname, 'data', 'regions-data.json');
  const allRegions = JSON.parse(fs.readFileSync(regionsDataPath, 'utf8'));

  // テストモードの場合はおもろまち駅のみ
  const regions = testMode
    ? allRegions.filter(r => r.fileName === 'おもろまち駅')
    : allRegions;

  if (testMode && regions.length === 0) {
    console.log(`${colors.red}✗ テスト対象の地域「おもろまち駅」が見つかりません${colors.reset}`);
    return;
  }

  console.log(`📍 ${regions.length}個の地域のHTMLを生成します\n`);

  // 出力ディレクトリ
  const outputDir = path.join(__dirname, 'data', 'regions');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  // 各地域のHTMLを生成
  for (let i = 0; i < regions.length; i++) {
    const region = regions[i];

    if (!testMode) {
      showProgress(i + 1, regions.length, region.name);
    } else {
      console.log(`${colors.cyan}生成中: ${region.name}${colors.reset}`);
    }

    const result = await generateRegionFullHTML(region, convenienceLogos, outputDir);

    if (result.success) {
      successCount++;
      if (testMode) {
        console.log(`   ${colors.green}✓${colors.reset} 駐車場: ${result.parkingCount}件, レストラン: ${result.restaurantCount}件`);
      }
    } else if (result.reason === '駐車場データなし') {
      skipCount++;
    } else {
      errorCount++;
    }

    // API制限回避のため少し待機
    if (i < regions.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  console.log(`\n${colors.green}✅ 生成完了${colors.reset}`);
  console.log(`   成功: ${colors.green}${successCount}${colors.reset}件`);
  console.log(`   スキップ: ${colors.yellow}${skipCount}${colors.reset}件（駐車場データなし）`);
  console.log(`   失敗: ${colors.red}${errorCount}${colors.reset}件`);
  console.log(`   出力先: ${colors.cyan}${outputDir}${colors.reset}\n`);

  if (testMode && successCount > 0) {
    const testRegion = regions[0];
    const testFile = path.join(outputDir, `${testRegion.fileName}.html`);
    console.log(`${colors.blue}テストファイル: file://${testFile}${colors.reset}\n`);
  }
}

// 実行
main().catch(err => {
  console.error(`${colors.red}エラー:${colors.reset}`, err);
  process.exit(1);
});
