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

    // 温泉取得（3km以内）
    const { data: hotSprings } = await supabase
      .from('hot_springs')
      .select('*')
      .gte('lat', parkingSpot.lat - 0.03)
      .lte('lat', parkingSpot.lat + 0.03)
      .gte('lng', parkingSpot.lng - 0.03)
      .lte('lng', parkingSpot.lng + 0.03);

    if (hotSprings) {
      facilities.hot_springs = hotSprings
        .map(spring => ({
          ...spring,
          distance: calculateDistance(parkingSpot.lat, parkingSpot.lng, spring.lat, spring.lng)
        }))
        .filter(spring => spring.distance <= 3000)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 3);
    }

  } catch (err) {
    console.error('施設取得エラー:', err);
  }

  return facilities;
}

/**
 * 駐車場データを取得（Supabase RPC）
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
        distance,
        walkingMinutes,
        nearest_convenience_store,
        nearest_hotspring,
        nearest_toilet,
        facilities  // 地図表示用の座標付き施設データ
      };
    }));

    // 距離でソート
    return processed.sort((a, b) => a.distance - b.distance);

  } catch (err) {
    console.error('駐車場取得エラー:', err);
    return [];
  }
}

/**
 * 地図HTMLを生成
 */
function generateMapHTML(regionData, parkingSpots, convenienceLogos) {
  const parkingMarkers = parkingSpots.map((spot, index) => {
    const convenienceInfo = spot.nearest_convenience_store
      ? `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #ddd;">
           <strong>🏪 コンビニ:</strong> ${spot.nearest_convenience_store.name || '不明'} (${Math.round(spot.nearest_convenience_store.distance_m)}m)
         </div>`
      : '';

    const toiletInfo = spot.nearest_toilet
      ? `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #ddd;">
           <strong>🚻 トイレ:</strong> ${spot.nearest_toilet.name || '公衆トイレ'} (${Math.round(spot.nearest_toilet.distance_m)}m)
         </div>`
      : '';

    const hotspringInfo = spot.nearest_hotspring
      ? `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #ddd;">
           <strong>♨️ 温泉:</strong> ${spot.nearest_hotspring.name || '不明'} (${(spot.nearest_hotspring.distance_m / 1000).toFixed(1)}km)
         </div>`
      : '';

    return `
      {
        id: 'parking_${index}',
        lat: ${spot.lat},
        lng: ${spot.lng},
        name: '${(spot.name || spot.parking_name || '駐車場').replace(/'/g, "\\'")}',
        info: \`
          <div style="max-width: 300px; font-size: 12px; line-height: 1.6;">
            <strong style="font-size: 14px; color: #1976d2;">${(spot.name || spot.parking_name || '駐車場').replace(/'/g, "\\'")}</strong>
            <div style="margin: 8px 0;">
              <div><strong>💰 料金:</strong> ${spot.total_fee ? spot.total_fee.toLocaleString() + '円' : '不明'} <span style="font-size: 11px; color: #666;">(18:00-8:00)</span></div>
              <div><strong>🚶 徒歩:</strong> 約${spot.walkingMinutes}分 (${Math.round(spot.distance)}m)</div>
            </div>
            ${convenienceInfo}
            ${toiletInfo}
            ${hotspringInfo}
          </div>
        \`,
        type: 'parking'
      }`;
  }).join(',\n      ');

  // 地図マーカー用の周辺施設
  const convenienceMarkers = parkingSpots.flatMap((spot, parkingIndex) => {
    if (!spot.facilities || !spot.facilities.convenience_stores) return [];
    return spot.facilities.convenience_stores.slice(0, 3).map((store, index) => {
      return `
      {
        id: 'convenience_${parkingIndex}_${index}',
        lat: ${store.lat},
        lng: ${store.lng},
        name: '${(store.name || 'コンビニ').replace(/'/g, "\\'")}',
        info: \`
          <div style="max-width: 200px; font-size: 12px;">
            <strong style="color: #4CAF50;">🏪 ${(store.name || 'コンビニ').replace(/'/g, "\\'")}</strong>
            <div style="margin-top: 4px;">${Math.round(store.distance)}m</div>
          </div>
        \`,
        type: 'convenience'
      }`;
    });
  }).join(',\n      ');

  const toiletMarkers = parkingSpots.flatMap((spot, parkingIndex) => {
    if (!spot.facilities || !spot.facilities.toilets) return [];
    return spot.facilities.toilets.slice(0, 3).map((toilet, index) => {
      return `
      {
        id: 'toilet_${parkingIndex}_${index}',
        lat: ${toilet.lat},
        lng: ${toilet.lng},
        name: '${(toilet.name || '公衆トイレ').replace(/'/g, "\\'")}',
        info: \`
          <div style="max-width: 200px; font-size: 12px;">
            <strong style="color: #2196F3;">🚻 ${(toilet.name || '公衆トイレ').replace(/'/g, "\\'")}</strong>
            <div style="margin-top: 4px;">${Math.round(toilet.distance)}m</div>
          </div>
        \`,
        type: 'toilet'
      }`;
    });
  }).join(',\n      ');

  const hotspringMarkers = parkingSpots.flatMap((spot, parkingIndex) => {
    if (!spot.facilities || !spot.facilities.hot_springs) return [];
    return spot.facilities.hot_springs.slice(0, 3).map((spring, index) => {
      return `
      {
        id: 'hotspring_${parkingIndex}_${index}',
        lat: ${spring.lat},
        lng: ${spring.lng},
        name: '${(spring.name || '温泉').replace(/'/g, "\\'")}',
        info: \`
          <div style="max-width: 200px; font-size: 12px;">
            <strong style="color: #FF9800;">♨️ ${(spring.name || '温泉').replace(/'/g, "\\'")}</strong>
            <div style="margin-top: 4px;">${(spring.distance / 1000).toFixed(1)}km</div>
          </div>
        \`,
        type: 'hotspring'
      }`;
    });
  }).join(',\n      ');

  const mapHTML = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${regionData.name} - 駐車場マップ</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body { margin: 0; padding: 0; }
    #map { width: 100%; height: 100vh; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const map = L.map('map').setView([${regionData.lat}, ${regionData.lng}], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    const markers = {};

    // エリア中心マーカー
    const centerMarker = L.marker([${regionData.lat}, ${regionData.lng}], {
      icon: L.divIcon({
        className: 'custom-marker',
        html: '<div style="background: #d32f2f; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">📍</div>',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      })
    }).addTo(map);
    centerMarker.bindPopup(\`
      <div style="max-width: 200px; font-size: 12px;">
        <strong style="color: #d32f2f; font-size: 14px;">${regionData.name}</strong>
        <div style="margin-top: 4px; color: #666;">エリア中心</div>
      </div>
    \`);

    // 駐車場マーカー
    const parkingData = [
      ${parkingMarkers}
    ];

    parkingData.forEach(data => {
      const marker = L.marker([data.lat, data.lng], {
        icon: L.divIcon({
          className: 'custom-marker',
          html: '<div style="background: #1976d2; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">🅿️</div>',
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        })
      }).addTo(map);
      marker.bindPopup(data.info);
      markers[data.id] = marker;
    });

    // コンビニマーカー
    const convenienceData = [
      ${convenienceMarkers}
    ];

    convenienceData.forEach(data => {
      const marker = L.marker([data.lat, data.lng], {
        icon: L.divIcon({
          className: 'custom-marker',
          html: '<div style="background: #4CAF50; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">🏪</div>',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        })
      }).addTo(map);
      marker.bindPopup(data.info);
      markers[data.id] = marker;
    });

    // トイレマーカー
    const toiletData = [
      ${toiletMarkers}
    ];

    toiletData.forEach(data => {
      const marker = L.marker([data.lat, data.lng], {
        icon: L.divIcon({
          className: 'custom-marker',
          html: '<div style="background: #2196F3; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">🚻</div>',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        })
      }).addTo(map);
      marker.bindPopup(data.info);
      markers[data.id] = marker;
    });

    // 温泉マーカー
    const hotspringData = [
      ${hotspringMarkers}
    ];

    hotspringData.forEach(data => {
      const marker = L.marker([data.lat, data.lng], {
        icon: L.divIcon({
          className: 'custom-marker',
          html: '<div style="background: #FF9800; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">♨️</div>',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        })
      }).addTo(map);
      marker.bindPopup(data.info);
      markers[data.id] = marker;
    });

    // マーカー表示関数（親ウィンドウから呼び出される）
    window.showMarker = function(markerId) {
      const marker = markers[markerId];
      if (marker) {
        map.setView(marker.getLatLng(), 17);
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
async function generateMainHTML(regionData, parkingSpots, convenienceLogos) {
  const parkingCardsHTML = parkingSpots.map((spot, index) => {
    const convenienceLogo = spot.nearest_convenience_store?.brand
      ? convenienceLogos[spot.nearest_convenience_store.brand.toLowerCase()]
      : null;

    const convenienceHTML = spot.nearest_convenience_store
      ? `<div class="facility-item" onclick="showMarker('convenience_0_${index}')">
           ${convenienceLogo
        ? `<img src="${convenienceLogo}" alt="${spot.nearest_convenience_store.name}" style="height: 16px; width: auto; object-fit: contain;">`
        : `🏪 ${spot.nearest_convenience_store.name || 'コンビニ'}`
      } ${Math.round(spot.nearest_convenience_store.distance_m)}m
         </div>`
      : '';

    const toiletHTML = spot.nearest_toilet
      ? `<div class="facility-item" onclick="showMarker('toilet_0_${index}')">
           🚻 ${spot.nearest_toilet.name || '公衆トイレ'} ${Math.round(spot.nearest_toilet.distance_m)}m
         </div>`
      : '';

    const hotspringHTML = spot.nearest_hotspring
      ? `<div class="facility-item" onclick="showMarker('hotspring_0_${index}')">
           ♨️ ${spot.nearest_hotspring.name || '温泉'} ${(spot.nearest_hotspring.distance_m / 1000).toFixed(1)}km
         </div>`
      : '';

    return `
      <div class="parking-card" onclick="showMarker('parking_${index}')">
        <div class="parking-card-header">
          <strong>${spot.name || spot.parking_name || '駐車場'}</strong>
          <div class="parking-card-buttons">
            <a href="https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}" class="btn-icon" target="_blank" onclick="event.stopPropagation();">🧭</a>
            <a href="https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lng}" class="btn-icon btn-search" target="_blank" onclick="event.stopPropagation();">🔍</a>
          </div>
        </div>
        <div class="parking-info">
          <div class="parking-info-left">
            <div class="parking-fee">${spot.total_fee ? spot.total_fee.toLocaleString() + '円' : '料金不明'}</div>
            <div>🚶 約${spot.walkingMinutes}分 (${Math.round(spot.distance)}m)</div>
          </div>
          <div class="parking-facilities">
            ${convenienceHTML}
            ${toiletHTML}
            ${hotspringHTML}
          </div>
        </div>
      </div>`;
  }).join('\n      ');

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
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 50px 30px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .header h1 {
      font-size: 28px;
      color: #fff;
      margin-bottom: 8px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
    }

    .header p {
      color: #fff;
      font-size: 16px;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
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

    @media (max-width: 1200px) {
      .map-layout-container {
        flex-direction: column;
      }

      .map-layout-left {
        flex: 0 0 auto;
        width: 100%;
        height: 500px;
      }

      .map-layout-right {
        flex: 0 0 auto;
        width: 100%;
        max-height: 600px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚗 ${regionData.name}</h1>
      <p>車中泊おすすめスポット</p>
    </div>

    <div class="parking-map-fullwidth">
      <div class="map-layout-container">
        <div class="map-layout-left">
          <iframe id="parking-map-iframe" src="${regionData.fileName}-map.html"></iframe>
        </div>

        <div class="map-layout-right">
          <h4>📍 クリックして地図で確認</h4>

          <div class="area-center-card" onclick="showMarker('center')">
            <strong>📍 ${regionData.name}</strong>
            <span style="font-size: 11px; color: #666;">エリア中心</span>
          </div>

          ${parkingCardsHTML}
        </div>
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
  const { name } = regionData;
  // ファイル名を生成（特殊文字を除去）
  const fileName = (regionData.fileName || name).replace(/[\/\\:*?"<>|]/g, '_');

  try {
    // 駐車場データを取得（Supabase RPC経由）
    const parkingSpots = await getParkingSpots(regionData);

    if (parkingSpots.length === 0) {
      console.log(`   ${colors.yellow}⚠${colors.reset}  ${fileName}: 駐車場データが見つかりません（スキップ）`);
      return { success: false, reason: '駐車場データなし' };
    }

    // 地図HTMLを生成
    const mapHTML = generateMapHTML(regionData, parkingSpots, convenienceLogos);
    const mapPath = path.join(outputDir, `${fileName}-map.html`);
    fs.writeFileSync(mapPath, mapHTML, 'utf8');

    // メインHTMLを生成
    const mainHTML = await generateMainHTML(regionData, parkingSpots, convenienceLogos);
    const mainPath = path.join(outputDir, `${fileName}.html`);
    fs.writeFileSync(mainPath, mainHTML, 'utf8');

    return {
      success: true,
      parkingCount: parkingSpots.length
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
  const testLimit = testMode ? 5 : null;

  console.log(`${colors.blue}=== ${testMode ? 'テスト: 5地域のHTML生成' : 'すべての地域の駐車場スポットHTML生成'} ===${colors.reset}\n`);

  // コンビニロゴを事前にロード
  console.log('🏪 コンビニロゴを読み込み中...');
  const convenienceLogos = loadConvenienceLogos();
  console.log(`   ✅ ${Object.keys(convenienceLogos).length}種類のロゴを読み込みました\n`);

  // 2つのJSONファイルを読み込む
  const restaurantSpotsPath = path.join(__dirname, 'all-restaurant-spots.json');
  const backupRegionsPath = path.join(__dirname, 'data', 'regions-data.backup-2025-10-24T15-58-43-523Z.json');

  let allLocations = [];

  // all-restaurant-spots.jsonから読み込み
  if (fs.existsSync(restaurantSpotsPath)) {
    console.log('📍 all-restaurant-spots.json を読み込み中...');
    const restaurantSpotsData = JSON.parse(fs.readFileSync(restaurantSpotsPath, 'utf8'));

    if (restaurantSpotsData.spots) {
      // spots配列から地域データを抽出
      const uniqueSpots = new Map();
      restaurantSpotsData.spots.forEach(spot => {
        const key = `${spot.name}_${spot.latitude}_${spot.longitude}`;
        if (!uniqueSpots.has(key)) {
          uniqueSpots.set(key, {
            name: spot.name,
            lat: spot.latitude,
            lng: spot.longitude,
            fileName: spot.name,
            restaurantCount: spot.restaurantCount || 0
          });
        }
      });
      allLocations.push(...Array.from(uniqueSpots.values()));
      console.log(`   ✅ ${uniqueSpots.size}箇所のレストランスポットを読み込みました\n`);
    }
  }

  // regions-data.backup-*.jsonから読み込み
  if (fs.existsSync(backupRegionsPath)) {
    console.log('📍 regions-data.backup-*.json を読み込み中...');
    const backupRegions = JSON.parse(fs.readFileSync(backupRegionsPath, 'utf8'));
    allLocations.push(...backupRegions);
    console.log(`   ✅ ${backupRegions.length}箇所の地域データを読み込みました\n`);
  }

  if (allLocations.length === 0) {
    console.log(`${colors.red}✗ 地域データが見つかりません${colors.reset}`);
    return;
  }

  // テストモードの場合は最初の5件のみ
  const regions = testMode ? allLocations.slice(0, testLimit) : allLocations;

  console.log(`📍 ${regions.length}個の地域のHTMLを生成します\n`);

  // 出力ディレクトリ
  const outputDir = path.join(__dirname, 'data', 'parking-spots');
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
        console.log(`   ${colors.green}✓${colors.reset} 駐車場: ${result.parkingCount}件`);
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
    const testRegion = regions.find(r => fs.existsSync(path.join(outputDir, `${(r.fileName || r.name).replace(/[\/\\:*?"<>|]/g, '_')}.html`)));
    if (testRegion) {
      const fileName = (testRegion.fileName || testRegion.name).replace(/[\/\\:*?"<>|]/g, '_');
      const testFile = path.join(outputDir, `${fileName}.html`);
      console.log(`${colors.blue}テストファイル: file://${testFile}${colors.reset}\n`);
    }
  }
}

// 実行
main().catch(err => {
  console.error(`${colors.red}エラー:${colors.reset}`, err);
  process.exit(1);
});
