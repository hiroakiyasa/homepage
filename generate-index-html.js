const fs = require('fs');
const path = require('path');
const https = require('https');

/**
 * 富士山の背景画像を取得してBase64エンコード
 */
async function fetchBackgroundImageBase64() {
  return new Promise((resolve) => {
    const imageUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/080103_hakkai_fuji.jpg/1280px-080103_hakkai_fuji.jpg';

    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    };

    const processResponse = (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        https.get(res.headers.location, options, processResponse).on('error', (err) => {
          console.error('   ⚠️  画像取得エラー:', err.message);
          resolve('');
        });
        return;
      }

      if (res.statusCode !== 200) {
        console.error('   ⚠️  画像取得失敗 Status:', res.statusCode);
        resolve('');
        return;
      }

      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const base64 = buffer.toString('base64');
        resolve(`data:image/jpeg;base64,${base64}`);
      });
    };

    https.get(imageUrl, options, processResponse).on('error', (err) => {
      console.error('   ⚠️  画像取得エラー:', err.message);
      resolve('');
    });
  });
}

/**
 * 車中泊スポットマップのindex.htmlを生成
 */
async function generateIndexHTML() {
  // 標高データを含むユニーク地域データを読み込む
  const elevationRegionsPath = path.join(__dirname, 'data', 'regions-data-with-elevation.json');
  let allRegions = [];

  if (fs.existsSync(elevationRegionsPath)) {
    console.log('📍 regions-data-with-elevation.json を読み込み中...');
    allRegions = JSON.parse(fs.readFileSync(elevationRegionsPath, 'utf8'));
    console.log(`   ✅ ${allRegions.length}箇所の標高データを読み込みました`);
  } else {
    console.error('❌ regions-data-with-elevation.json が見つかりません');
    process.exit(1);
  }

  // regionsフォルダ内に存在するHTMLファイルのみをフィルタリング
  const regionsDir = path.join(__dirname, 'data', 'regions');
  const regions = allRegions.filter(region => {
    const fileName = (region.fileName || region.name).replace(/[\/\\:*?"<>|]/g, '_');
    const htmlPath = path.join(regionsDir, `${fileName}.html`);
    return fs.existsSync(htmlPath);
  });

  console.log(`📍 ${regions.length}個の地域マーカーを追加します`);

  // 背景画像を取得
  console.log('🖼️  背景画像を取得中...');
  const backgroundImageBase64 = await fetchBackgroundImageBase64();
  if (backgroundImageBase64) {
    console.log(`   ✅ 背景画像を取得しました (${backgroundImageBase64.length.toLocaleString()} bytes)`);
  } else {
    console.log('   ⚠️  背景画像の取得に失敗しました');
  }

  // 地域データをJavaScript配列形式に変換（標高データを含む）
  const regionsJS = regions.map(r => {
    const fileName = (r.fileName || r.name).replace(/[\/\\:*?"<>|]/g, '_');
    return {
      name: r.name,
      lat: r.lat,
      lng: r.lng,
      restaurantCount: r.restaurantCount || 0,
      fileName: fileName,
      elevation: r.elevation || 0, // 標高データ
      url: `regions/${fileName}.html` // 地域ページのURL（regionsフォルダ内）
    };
  });

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>車旅コンシェルジュ - 全国車中泊スポットマップ</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', sans-serif;
            line-height: 1.7;
            color: #333;
            background: #f5f5f5;
            margin: 0;
        }

        .container {
            max-width: 100%;
            margin: 0;
            padding: 0;
            background: white;
        }

        .header {
            background: linear-gradient(rgba(25, 118, 210, 0.85), rgba(66, 165, 245, 0.85))${backgroundImageBase64 ? `,\n                  url('${backgroundImageBase64}')` : ''};
            background-size: cover;
            background-position: center;
            color: white;
            padding: 20px;
            text-align: center;
        }

        .header h1 {
            font-size: 2em;
            margin: 0;
            font-weight: 600;
        }

        .header p {
            margin: 10px 0 0 0;
            font-size: 1em;
            opacity: 0.9;
        }

        .nav-links {
            padding: 10px 20px;
            background: #f5f5f5;
            border-bottom: 1px solid #e0e0e0;
        }

        .nav-links a {
            margin-right: 20px;
            color: #1976d2;
            text-decoration: none;
            font-size: 0.9em;
        }

        .nav-links a:hover {
            text-decoration: underline;
        }

        .map-container {
            padding: 0;
            margin: 0;
        }

        h2 {
            font-size: 2.2em;
            margin-bottom: 0.8em;
            text-align: center;
            color: #1976d2;
            font-weight: 600;
        }

        p { margin-bottom: 1em; }
        a { color: #3B82F6; text-decoration: none; }
        a:hover { text-decoration: underline; }

        #map {
            width: 100%;
            height: calc(100vh - 200px);
            min-height: 600px;
            margin: 0;
            border: none;
            position: relative;
        }

        .elevation-legend {
            position: absolute;
            top: 10px;
            right: 10px;
            background: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            z-index: 1000;
            font-size: 0.85em;
        }

        .elevation-legend h4 {
            margin: 0 0 10px 0;
            font-size: 1em;
            color: #333;
        }

        .elevation-scale {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }

        .elevation-item {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .elevation-color {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        }

        .elevation-label {
            color: #666;
            font-size: 0.9em;
        }

        footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            text-align: center;
            color: #666;
            font-size: 0.9em;
        }

        @media (max-width: 768px) {
            .hero h1 {
                font-size: 2.5em;
            }
            .hero p {
                font-size: 1.1em;
            }
            #map {
                height: 500px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚗 車旅コンシェルジュ</h1>
            <h2 style="font-size: 1.5em; margin: 10px 0 0 0; font-weight: 500; color: white;">全国車中泊スポットマップ</h2>
            <p>日本全国の車中泊スポットを地図上で確認できます</p>
        </div>

        <div class="nav-links">
            <a href="../index.html">← トップページ</a>
            <a href="terms.html">利用規約</a>
            <a href="privacy.html">プライバシーポリシー</a>
            <a href="https://trailfusionai.com" target="_blank">TrailFusion AI</a>
        </div>

        <div class="map-container">
            <div id="map">
                <div class="elevation-legend">
                    <h4>標高</h4>
                    <div class="elevation-scale">
                        <div class="elevation-item">
                            <div class="elevation-color" style="background: #FF0000;"></div>
                            <span class="elevation-label">1000m+</span>
                        </div>
                        <div class="elevation-item">
                            <div class="elevation-color" style="background: #FF8000;"></div>
                            <span class="elevation-label">750m</span>
                        </div>
                        <div class="elevation-item">
                            <div class="elevation-color" style="background: #FFFF00;"></div>
                            <span class="elevation-label">500m</span>
                        </div>
                        <div class="elevation-item">
                            <div class="elevation-color" style="background: #80FF00;"></div>
                            <span class="elevation-label">250m</span>
                        </div>
                        <div class="elevation-item">
                            <div class="elevation-color" style="background: #00FFFF;"></div>
                            <span class="elevation-label">100m</span>
                        </div>
                        <div class="elevation-item">
                            <div class="elevation-color" style="background: #0080FF;"></div>
                            <span class="elevation-label">50m</span>
                        </div>
                        <div class="elevation-item">
                            <div class="elevation-color" style="background: #0000FF;"></div>
                            <span class="elevation-label">0m</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <footer>
            <p>© 2025 TrailFusion AI - 車旅コンシェルジュ</p>
            <p><a href="terms.html">利用規約</a> | <a href="privacy.html">プライバシーポリシー</a></p>
        </footer>
    </div>

    <script>
        // 地域データ
        const regions = ${JSON.stringify(regionsJS, null, 8)};

        // 地図初期化（日本全体が見えるように拡大）
        const map = L.map('map').setView([37.5, 138.0], 6);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(map);

        /**
         * 標高から色を計算（0m=青, 1000m=赤のグラデーション）
         */
        function getColorFromElevation(elevation) {
            // 標高を0-1000の範囲に正規化
            const normalized = Math.min(Math.max(elevation, 0), 1000) / 1000;

            // HSLカラースペースで青(240°)から赤(0°)へ
            const hue = (1 - normalized) * 240;

            return \`hsl(\${hue}, 100%, 50%)\`;
        }

        /**
         * 色付きのピンマーカーSVGを生成
         */
        function createColoredPinIcon(color) {
            const svg = \`<svg width="32" height="48" viewBox="0 0 32 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 0C10.477 0 6 4.477 6 10C6 20 16 32 16 32C16 32 26 20 26 10C26 4.477 21.523 0 16 0Z" fill="\${color}" stroke="white" stroke-width="2"/>
                <circle cx="16" cy="10" r="4" fill="white"/>
            </svg>\`;

            return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
        }

        // マーカーを作成
        regions.forEach(region => {
            const elevation = region.elevation || 0;
            const color = getColorFromElevation(elevation);
            const iconUrl = createColoredPinIcon(color);

            const regionIcon = L.icon({
                iconUrl: iconUrl,
                iconSize: [32, 48],
                iconAnchor: [16, 48],
                popupAnchor: [0, -48]
            });

            L.marker([region.lat, region.lng], { icon: regionIcon })
                .addTo(map)
                .bindPopup(\`
                    <div style="min-width: 200px;">
                        <h3 style="margin: 0 0 10px 0; color: #1976d2; font-size: 1.1em;">\${region.name}</h3>
                        <p style="margin: 5px 0; color: #666; font-size: 0.9em;">標高: \${elevation}m</p>
                        <a href="\${region.url}" style="display: inline-block; margin-top: 10px; padding: 8px 16px; background: #1976d2; color: white; text-decoration: none; border-radius: 4px; font-size: 0.9em;">車中泊スポットを見る</a>
                    </div>
                \`);
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
generateIndexHTML().catch(err => {
  console.error('エラー:', err);
  process.exit(1);
});
