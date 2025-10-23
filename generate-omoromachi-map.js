const fs = require('fs');
const path = require('path');

// データを読み込む
const dataPath = path.join(__dirname, 'data', 'omoromachi-data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

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

// コンビニロゴを事前にロード
const convenienceLogos = loadConvenienceLogos();

// コンビニロゴファイル名取得（Base64版）
function getConvenienceLogo(subType) {
  const logoMap = {
    'セブン-イレブン': 'seveneleven',
    'ファミリーマート': 'familymart',
    'ローソン': 'lawson',
    'ミニストップ': 'ministop',
    'セイコーマート': 'seikomart',
    'デイリーヤマザキ': 'dailyyamazaki'
  };
  const logoKey = logoMap[subType];
  return logoKey ? convenienceLogos[logoKey] : null;
}

// 地図HTMLを生成
function generateMapHTML() {
  const { area, parkingSpots, topRestaurants } = data;

  // マーカーデータを準備
  const markers = [];

  // エリア中心マーカー
  markers.push({
    id: 'area_center',
    type: 'center',
    lat: area.lat,
    lng: area.lng,
    title: area.name,
    description: area.description,
    color: '#d32f2f'
  });

  // 駐車場マーカー
  parkingSpots.forEach((spot, index) => {
    markers.push({
      id: `parking_${index}`,
      type: 'parking',
      lat: spot.lat,
      lng: spot.lng,
      title: spot.name,
      distance: `${spot.distance_to_center}m`,
      walking: `徒歩約${spot.walking_minutes}分`,
      color: '#1976d2',
      number: index + 1
    });

    // コンビニマーカー
    if (spot.facilities && spot.facilities.convenience_stores) {
      spot.facilities.convenience_stores.forEach((conv, convIndex) => {
        const logo = getConvenienceLogo(conv.sub_type);
        markers.push({
          id: `convenience_${index}_${convIndex}`,
          type: 'convenience',
          lat: conv.lat,
          lng: conv.lng,
          title: conv.name,
          subType: conv.sub_type,
          logo: logo,
          distance: `${conv.distance}m`,
          color: '#4caf50'
        });
      });
    }

    // トイレマーカー
    if (spot.facilities && spot.facilities.toilets) {
      spot.facilities.toilets.forEach((toilet, toiletIndex) => {
        markers.push({
          id: `toilet_${index}_${toiletIndex}`,
          type: 'toilet',
          lat: toilet.lat,
          lng: toilet.lng,
          title: toilet.name,
          distance: `${toilet.distance}m`,
          color: '#795548'
        });
      });
    }

    // 温泉マーカー
    if (spot.facilities && spot.facilities.hot_springs) {
      spot.facilities.hot_springs.forEach((spring, springIndex) => {
        markers.push({
          id: `onsen_${index}_${springIndex}`,
          type: 'onsen',
          lat: spring.lat,
          lng: spring.lng,
          title: spring.name,
          distance: `${(spring.distance / 1000).toFixed(1)}km`,
          color: '#f8bbd0' // 薄いピンクに変更
        });
      });
    }
  });

  // レストランマーカー
  topRestaurants.forEach((restaurant, index) => {
    markers.push({
      id: `restaurant_${index}`,
      type: 'restaurant',
      lat: restaurant.latitude,
      lng: restaurant.longitude,
      title: restaurant.name,
      genre: restaurant.genre || '',
      address: restaurant.address || '',
      color: '#ff9800',
      number: index + 1
    });
  });

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>おもろまち駅周辺マップ</title>
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

    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
  </style>
</head>
<body>
  <div id="map"></div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    // 地図初期化
    const map = L.map('map').setView([${area.lat}, ${area.lng}], 15);

    // OpenStreetMap タイル
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    // マーカーデータ
    const markers = ${JSON.stringify(markers, null, 2)};

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

        // ポップアップを開く
        setTimeout(() => {
          marker.openPopup();

          // マーカーにバウンスアニメーション追加
          const element = marker.getElement();
          if (element) {
            element.style.animation = 'bounce 0.5s ease';
            setTimeout(() => {
              element.style.animation = '';
            }, 500);
          }
        }, 300);
      }
    };

    // 全マーカーを表示する範囲にフィット
    const bounds = markers.map(m => [m.lat, m.lng]);
    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  </script>
</body>
</html>`;

  return html;
}

// HTMLを保存
const html = generateMapHTML();
const outputPath = path.join(__dirname, 'data', 'omoromachi-map.html');
fs.writeFileSync(outputPath, html, 'utf8');

console.log(`✅ 地図HTMLを生成しました: ${outputPath}`);
