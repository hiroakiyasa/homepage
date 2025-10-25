const fs = require('fs');
const path = require('path');

// カラー表示用
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

async function main() {
  console.log(`${colors.blue}=== 日本地図インデックスページ生成 ===${colors.reset}\n`);

  // 2つのJSONファイルから地域データを読み込む
  const restaurantSpotsPath = path.join(__dirname, 'all-restaurant-spots.json');
  const backupRegionsPath = path.join(__dirname, 'data', 'regions-data.backup-2025-10-24T15-58-43-523Z.json');

  let allRegions = [];

  // all-restaurant-spots.jsonから読み込み
  if (fs.existsSync(restaurantSpotsPath)) {
    console.log('📍 all-restaurant-spots.json を読み込み中...');
    const restaurantSpotsData = JSON.parse(fs.readFileSync(restaurantSpotsPath, 'utf8'));

    if (restaurantSpotsData.spots) {
      const uniqueSpots = new Map();
      restaurantSpotsData.spots.forEach(spot => {
        const key = `${spot.name}_${spot.latitude}_${spot.longitude}`;
        if (!uniqueSpots.has(key)) {
          uniqueSpots.set(key, {
            name: spot.name,
            lat: spot.latitude,
            lng: spot.longitude,
            fileName: spot.name
          });
        }
      });
      allRegions.push(...Array.from(uniqueSpots.values()));
      console.log(`   ✅ ${uniqueSpots.size}箇所のレストランスポットを読み込みました\n`);
    }
  }

  // regions-data.backup-*.jsonから読み込み
  if (fs.existsSync(backupRegionsPath)) {
    console.log('📍 regions-data.backup-*.json を読み込み中...');
    const backupRegions = JSON.parse(fs.readFileSync(backupRegionsPath, 'utf8'));
    allRegions.push(...backupRegions);
    console.log(`   ✅ ${backupRegions.length}箇所の地域データを読み込みました\n`);
  }

  // regionsフォルダ内に存在するHTMLファイルのみをフィルタリング
  const regionsDir = path.join(__dirname, 'data', 'regions');
  const existingRegions = allRegions.filter(region => {
    const fileName = (region.fileName || region.name).replace(/[\/\\:*?"<>|]/g, '_');
    const htmlPath = path.join(regionsDir, `${fileName}.html`);
    return fs.existsSync(htmlPath);
  });

  console.log(`📍 HTMLファイルが存在する地域: ${existingRegions.length}箇所\n`);

  // 日本地図インデックスHTMLを生成
  const indexHTML = generateIndexHTML(existingRegions);
  const indexPath = path.join(__dirname, 'data', 'index.html');
  fs.writeFileSync(indexPath, indexHTML, 'utf8');

  console.log(`${colors.green}✅ 日本地図インデックスページを生成しました${colors.reset}`);
  console.log(`   📄 ${indexPath}`);
  console.log(`   📍 ${existingRegions.length}箇所のマーカーを配置\n`);
}

function generateIndexHTML(regions) {
  // 地域データをJSON形式で埋め込む
  const regionsJSON = JSON.stringify(regions.map(r => ({
    name: r.name,
    lat: r.lat,
    lng: r.lng,
    fileName: (r.fileName || r.name).replace(/[\/\\:*?"<>|]/g, '_')
  })));

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>全国の駐車スポット・車中泊スポット | 日本地図</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', Meiryo, sans-serif;
      background: #f5f5f5;
    }

    header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      text-align: center;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }

    header h1 {
      font-size: 28px;
      margin-bottom: 8px;
    }

    header p {
      font-size: 14px;
      opacity: 0.9;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 20px;
    }

    .stats {
      display: flex;
      gap: 15px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }

    .stat-card {
      background: white;
      padding: 20px;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      flex: 1;
      min-width: 200px;
    }

    .stat-card h3 {
      font-size: 14px;
      color: #666;
      margin-bottom: 8px;
    }

    .stat-card .number {
      font-size: 32px;
      font-weight: bold;
      color: #667eea;
    }

    #map {
      width: 100%;
      height: 700px;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }

    .search-box {
      background: white;
      padding: 20px;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }

    .search-box input {
      width: 100%;
      padding: 12px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 16px;
      transition: border-color 0.3s;
    }

    .search-box input:focus {
      outline: none;
      border-color: #667eea;
    }

    .leaflet-popup-content {
      text-align: center;
      min-width: 150px;
    }

    .popup-title {
      font-size: 18px;
      font-weight: bold;
      color: #333;
      margin-bottom: 10px;
    }

    .popup-link {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 8px 20px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: bold;
      transition: transform 0.2s;
    }

    .popup-link:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 10px rgba(102, 126, 234, 0.3);
    }

    .region-list {
      background: white;
      padding: 20px;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      margin-top: 20px;
      max-height: 500px;
      overflow-y: auto;
    }

    .region-list h2 {
      margin-bottom: 15px;
      color: #333;
    }

    .region-item {
      padding: 12px;
      border-bottom: 1px solid #e0e0e0;
      cursor: pointer;
      transition: background 0.2s;
    }

    .region-item:hover {
      background: #f9f9f9;
    }

    .region-item:last-child {
      border-bottom: none;
    }

    .region-item a {
      color: #667eea;
      text-decoration: none;
      font-weight: 500;
    }

    .region-item a:hover {
      text-decoration: underline;
    }

    @media (max-width: 768px) {
      header h1 {
        font-size: 22px;
      }

      #map {
        height: 500px;
      }

      .stat-card {
        min-width: 150px;
      }
    }
  </style>
</head>
<body>
  <header>
    <h1>🚗 全国の駐車スポット・車中泊スポット</h1>
    <p>日本全国の駐車場情報とおすすめレストランを掲載</p>
  </header>

  <div class="container">
    <div class="stats">
      <div class="stat-card">
        <h3>📍 掲載地域数</h3>
        <div class="number" id="region-count">0</div>
      </div>
      <div class="stat-card">
        <h3>🗾 都道府県</h3>
        <div class="number">47</div>
      </div>
      <div class="stat-card">
        <h3>🅿️ 駐車場情報</h3>
        <div class="number">充実</div>
      </div>
      <div class="stat-card">
        <h3>🍴 レストラン情報</h3>
        <div class="number">18,345</div>
      </div>
    </div>

    <div class="search-box">
      <input type="text" id="search-input" placeholder="地域名で検索...（例：銀座、新宿、渋谷）">
    </div>

    <div id="map"></div>

    <div class="region-list">
      <h2>📋 全地域リスト</h2>
      <div id="region-list-content"></div>
    </div>
  </div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    // 地域データ
    const regions = ${regionsJSON};

    // 地域数を表示
    document.getElementById('region-count').textContent = regions.length;

    // 日本地図を初期化（中心：日本の中央付近）
    const map = L.map('map').setView([36.5, 138], 6);

    // タイルレイヤーを追加
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18
    }).addTo(map);

    // マーカーを保存する配列
    const markers = [];

    // 各地域にマーカーを配置
    regions.forEach(region => {
      const marker = L.marker([region.lat, region.lng]).addTo(map);

      marker.bindPopup(\`
        <div class="popup-title">\${region.name}</div>
        <a href="regions/\${region.fileName}.html" class="popup-link" target="_blank">詳細を見る</a>
      \`);

      marker.region = region;
      markers.push(marker);
    });

    // 地域リストを生成
    const regionListContent = document.getElementById('region-list-content');
    regions
      .sort((a, b) => a.name.localeCompare(b.name, 'ja'))
      .forEach(region => {
        const item = document.createElement('div');
        item.className = 'region-item';
        item.innerHTML = \`
          <a href="regions/\${region.fileName}.html" target="_blank">\${region.name}</a>
        \`;

        // リスト項目クリックで地図を移動
        item.addEventListener('click', (e) => {
          if (e.target.tagName !== 'A') {
            map.setView([region.lat, region.lng], 13);
            const marker = markers.find(m => m.region.name === region.name);
            if (marker) {
              marker.openPopup();
            }
          }
        });

        regionListContent.appendChild(item);
      });

    // 検索機能
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      const items = document.querySelectorAll('.region-item');

      items.forEach(item => {
        const text = item.textContent.toLowerCase();
        if (text.includes(query)) {
          item.style.display = 'block';
        } else {
          item.style.display = 'none';
        }
      });

      // マーカーのフィルタリング
      markers.forEach(marker => {
        const name = marker.region.name.toLowerCase();
        if (query === '' || name.includes(query)) {
          marker.setOpacity(1);
        } else {
          marker.setOpacity(0.2);
        }
      });
    });

    console.log(\`✅ \${regions.length}箇所のマーカーを配置しました\`);
  </script>
</body>
</html>`;
}

main().catch(console.error);
