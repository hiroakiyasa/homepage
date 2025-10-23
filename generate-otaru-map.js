const fs = require('fs');
const path = require('path');

// データを読み込む
const dataPath = path.join(__dirname, 'data', 'otaru-parking-data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// 地図HTMLを生成
function generateMapHTML() {
  const { event, parkingSpots } = data;

  // マーカーデータを生成
  const markers = [];

  // イベントマーカー
  markers.push({
    id: 'festival',
    name: event.name,
    lat: event.lat,
    lng: event.lon,
    type: 'festival',
    icon: 'festival'
  });

  // 駐車場マーカー（番号付き）
  parkingSpots.forEach((spot, index) => {
    markers.push({
      id: `parking_${index}`,
      name: spot.name,
      lat: spot.lat,
      lng: spot.lng,
      type: 'parking',
      rank: index + 1,
      fee: spot.overnight_fee,
      walkingMinutes: spot.walking_minutes
    });

    // 周辺施設マーカー
    if (spot.facilities.convenience_stores && spot.facilities.convenience_stores.length > 0) {
      const conv = spot.facilities.convenience_stores[0];
      markers.push({
        id: `convenience_${index}`,
        name: conv.name,
        lat: conv.lat,
        lng: conv.lng,
        type: 'convenience',
        distance: conv.distance
      });
    }

    if (spot.facilities.toilets && spot.facilities.toilets.length > 0) {
      const toilet = spot.facilities.toilets[0];
      markers.push({
        id: `toilet_${index}`,
        name: toilet.name,
        lat: toilet.lat,
        lng: toilet.lng,
        type: 'toilet',
        distance: toilet.distance
      });
    }

    if (spot.facilities.hot_springs && spot.facilities.hot_springs.length > 0) {
      const onsen = spot.facilities.hot_springs[0];
      markers.push({
        id: `onsen_${index}`,
        name: onsen.name,
        lat: onsen.lat,
        lng: onsen.lng,
        type: 'onsen',
        distance: onsen.distance
      });
    }
  });

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${event.name} - 駐車場マップ</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    #map { width: 100%; height: 100vh; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    // 地図の初期化
    const map = L.map('map').setView([${event.lat}, ${event.lon}], 14);

    // タイルレイヤーを追加
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    // マーカーデータ
    const markersData = ${JSON.stringify(markers, null, 2)};

    // マーカーを格納するオブジェクト
    const markers = {};

    // カスタムアイコンを作成
    function createCustomIcon(type, number) {
      if (type === 'festival') {
        return L.divIcon({
          html: '<div style="background: #d32f2f; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: bold; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">🎉</div>',
          className: '',
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        });
      } else if (type === 'parking') {
        return L.divIcon({
          html: \`<div style="background: #1976d2; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">\${number}</div>\`,
          className: '',
          iconSize: [36, 36],
          iconAnchor: [18, 18]
        });
      } else if (type === 'convenience') {
        return L.divIcon({
          html: '<div style="background: #4caf50; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">🏪</div>',
          className: '',
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });
      } else if (type === 'toilet') {
        return L.divIcon({
          html: '<div style="background: #9c27b0; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">🚻</div>',
          className: '',
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });
      } else if (type === 'onsen') {
        return L.divIcon({
          html: '<div style="background: #ff9800; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">♨️</div>',
          className: '',
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });
      }
      return L.divIcon({
        html: '<div style="background: #757575; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px;">•</div>',
        className: '',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
    }

    // マーカーを作成
    markersData.forEach(markerData => {
      const icon = createCustomIcon(markerData.type, markerData.rank);
      const marker = L.marker([markerData.lat, markerData.lng], { icon: icon });

      // ポップアップを作成
      let popupContent = \`<div style="min-width: 200px;">
        <h3 style="margin: 0 0 8px 0; font-size: 14px;">\${markerData.name}</h3>\`;

      if (markerData.type === 'parking') {
        const feeText = markerData.fee === 0 ? '無料' : \`¥\${markerData.fee.toLocaleString()}\`;
        popupContent += \`
          <p style="margin: 4px 0; font-size: 12px;">🔢 駐車場\${markerData.rank}</p>
          <p style="margin: 4px 0; font-size: 12px;">💰 18:00〜8:00: \${feeText}</p>
          <p style="margin: 4px 0; font-size: 12px;">📍 徒歩約\${markerData.walkingMinutes}分</p>\`;
      }

      if (markerData.distance !== undefined) {
        popupContent += \`<p style="margin: 4px 0; font-size: 12px;">📏 \${markerData.distance}m</p>\`;
      }

      popupContent += '</div>';
      marker.bindPopup(popupContent);
      marker.addTo(map);

      // マーカーを保存
      markers[markerData.id] = marker;
    });

    // マーカーを表示する関数（外部から呼び出し可能）
    window.showMarker = function(markerId) {
      const marker = markers[markerId];
      if (marker) {
        map.setView(marker.getLatLng(), 16);
        marker.openPopup();
      }
    };
  </script>
</body>
</html>`;

  return html;
}

// HTMLを保存
const html = generateMapHTML();
const outputPath = path.join(__dirname, 'data', 'parking-map.html');
fs.writeFileSync(outputPath, html, 'utf8');

console.log(`✅ 地図HTMLを生成しました: ${outputPath}`);
console.log(`マーカー数: ${data.parkingSpots.length} 駐車場 + 周辺施設`);
