const fs = require('fs');
const path = require('path');

/**
 * 車中泊スポットマップのindex.htmlを生成
 */
function generateIndexHTML() {
  // 地域データを読み込む
  const regionsDataPath = path.join(__dirname, 'data', 'regions-data.json');
  const regions = JSON.parse(fs.readFileSync(regionsDataPath, 'utf8'));

  console.log(`📍 ${regions.length}個の地域マーカーを追加します`);

  // 地域データをJavaScript配列形式に変換
  const regionsJS = regions.map(r => ({
    name: r.name,
    lat: r.lat,
    lng: r.lng,
    restaurantCount: r.restaurantCount,
    fileName: r.fileName,
    url: `${r.fileName}.html` // 地域ページのURL
  }));

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Camping Note - 全国車中泊スポットマップ</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', sans-serif;
            line-height: 1.7;
            color: #333;
            background: #f5f5f5;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
            background: white;
        }
        h1, h2, h3 { margin-top: 1.5em; margin-bottom: 0.5em; }
        h1 { font-size: 2em; }
        h2 { font-size: 1.5em; }
        p { margin-bottom: 1em; }
        a { color: #3B82F6; text-decoration: none; }
        a:hover { text-decoration: underline; }

        #map {
            width: 100%;
            height: 600px;
            margin: 30px 0;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .region-list {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 15px;
            margin-top: 30px;
        }

        .region-card {
            background: #fff;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 15px;
            transition: all 0.3s ease;
            cursor: pointer;
        }

        .region-card:hover {
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transform: translateY(-2px);
        }

        .region-card h3 {
            margin-top: 0;
            color: #1976d2;
            font-size: 1.1em;
        }

        .region-info {
            color: #666;
            font-size: 0.9em;
            margin-top: 8px;
        }

        .stats {
            display: flex;
            gap: 20px;
            margin: 20px 0;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
        }

        .stat-item {
            flex: 1;
            text-align: center;
        }

        .stat-number {
            font-size: 2em;
            font-weight: bold;
            color: #1976d2;
        }

        .stat-label {
            color: #666;
            font-size: 0.9em;
            margin-top: 5px;
        }

        footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            text-align: center;
            color: #666;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="container">
        <p><a href="../index.html">← トップページに戻る</a> | <a href="https://trailfusionai.com">TrailFusion AI</a></p>

        <h1>🚗 全国車中泊スポットマップ</h1>
        <p>日本全国の車中泊スポットを地図上で確認できます。マーカーをクリックして各地域の詳細ページへ。</p>

        <div class="stats">
            <div class="stat-item">
                <div class="stat-number">${regions.length}</div>
                <div class="stat-label">対応地域</div>
            </div>
            <div class="stat-item">
                <div class="stat-number">${regions.reduce((sum, r) => sum + r.restaurantCount, 0).toLocaleString()}</div>
                <div class="stat-label">レストラン情報</div>
            </div>
        </div>

        <div id="map"></div>

        <h2>📍 地域一覧</h2>
        <div id="region-list" class="region-list"></div>

        <footer>
            © 2025 TrailFusion AI - Camping Note
        </footer>
    </div>

    <script>
        // 地域データ
        const regions = ${JSON.stringify(regionsJS, null, 8)};

        // 地図初期化
        const map = L.map('map').setView([37.5, 138.0], 5);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(map);

        // 地域マーカーアイコン
        const regionIcon = L.divIcon({
            html: '<div style="background: linear-gradient(135deg, #1976d2 0%, #42a5f5 100%); color: white; width: 35px; height: 35px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; box-shadow: 0 4px 12px rgba(25,118,210,0.5); border: 3px solid white;">🚗</div>',
            iconSize: [35, 35],
            iconAnchor: [17, 35],
            popupAnchor: [0, -35],
            className: 'region-icon'
        });

        const regionListEl = document.getElementById('region-list');

        // マーカーとカードを作成
        regions.forEach(region => {
            // マーカー追加
            const marker = L.marker([region.lat, region.lng], { icon: regionIcon })
                .addTo(map)
                .bindPopup(\`
                    <div style="min-width: 200px;">
                        <h3 style="margin: 0 0 10px 0; color: #1976d2; font-size: 1.1em;">\${region.name}</h3>
                        <p style="margin: 5px 0; color: #666; font-size: 0.9em;">🍴 レストラン: \${region.restaurantCount}店</p>
                        <a href="\${region.url}" style="display: inline-block; margin-top: 10px; padding: 8px 16px; background: #1976d2; color: white; text-decoration: none; border-radius: 4px; font-size: 0.9em;">車中泊スポットを見る</a>
                    </div>
                \`);

            // 地域カード追加
            const card = document.createElement('div');
            card.className = 'region-card';
            card.innerHTML = \`
                <h3>\${region.name}</h3>
                <div class="region-info">🍴 レストラン: \${region.restaurantCount}店</div>
            \`;
            card.addEventListener('click', () => {
                map.setView([region.lat, region.lng], 13);
                marker.openPopup();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
            regionListEl.appendChild(card);
        });
    </script>
</body>
</html>`;

  // 出力
  const outputPath = path.join(__dirname, 'data', 'index.html');
  fs.writeFileSync(outputPath, html, 'utf8');

  console.log(`✅ index.htmlを生成しました: ${outputPath}`);
  console.log(`   HTMLサイズ: ${html.length.toLocaleString()} bytes`);
}

// 実行
generateIndexHTML();
