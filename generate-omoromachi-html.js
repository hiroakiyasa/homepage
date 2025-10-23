const fs = require('fs');
const path = require('path');
const https = require('https');

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

/**
 * Wikimedia Commonsから適切な背景画像を取得してBase64エンコード
 * @param {string} searchTerm - 検索キーワード（例: "Omoromachi Okinawa"）
 * @returns {Promise<string>} - Base64エンコードされた画像
 */
async function fetchWikimediaImageBase64(searchTerm) {
  return new Promise((resolve, reject) => {
    // Step 1: 画像を検索
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
            // フォールバック画像URLから直接ダウンロード
            downloadImageAsBase64('https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Omoromachi_DFS_Galleria_Okinawa_20070810.jpg/1280px-Omoromachi_DFS_Galleria_Okinawa_20070810.jpg', resolve);
            return;
          }

          const fileName = searchResult.query.search[0].title;

          // Step 2: 画像URLを取得
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

                // Step 3: 画像をダウンロードしてBase64エンコード
                downloadImageAsBase64(thumbUrl, resolve);
              } catch (err) {
                // エラー時はフォールバック
                downloadImageAsBase64('https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Omoromachi_DFS_Galleria_Okinawa_20070810.jpg/1280px-Omoromachi_DFS_Galleria_Okinawa_20070810.jpg', resolve);
              }
            });
          }).on('error', () => {
            downloadImageAsBase64('https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Omoromachi_DFS_Galleria_Okinawa_20070810.jpg/1280px-Omoromachi_DFS_Galleria_Okinawa_20070810.jpg', resolve);
          });
        } catch (err) {
          downloadImageAsBase64('https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Omoromachi_DFS_Galleria_Okinawa_20070810.jpg/1280px-Omoromachi_DFS_Galleria_Okinawa_20070810.jpg', resolve);
        }
      });
    }).on('error', () => {
      downloadImageAsBase64('https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Omoromachi_DFS_Galleria_Okinawa_20070810.jpg/1280px-Omoromachi_DFS_Galleria_Okinawa_20070810.jpg', resolve);
    });
  });
}

/**
 * 画像をダウンロードしてBase64エンコード
 */
function downloadImageAsBase64(url, callback) {
  const options = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
  };

  https.get(url, options, (res) => {
    // リダイレクトを処理
    if (res.statusCode === 301 || res.statusCode === 302) {
      downloadImageAsBase64(res.headers.location, callback);
      return;
    }

    if (res.statusCode !== 200) {
      console.error(`   ⚠️  画像ダウンロード失敗: ${res.statusCode}`);
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
  }).on('error', (err) => {
    console.error(`   ⚠️  画像ダウンロードエラー:`, err.message);
    callback('');
  });
}

// スタンドアロンHTMLを生成
async function generateHTML() {
  const { area, parkingSpots, topRestaurants } = data;

  // Wikimedia Commonsから背景画像を取得してBase64エンコード
  console.log('📸 Wikimedia Commonsから背景画像を取得中...');
  const backgroundImageBase64 = await fetchWikimediaImageBase64('Omoromachi Station Okinawa');
  console.log(`   ✅ 背景画像をBase64エンコードしました (サイズ: ${backgroundImageBase64.length} bytes)`);

  let html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${area.name} - 車中泊おすすめスポット</title>
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
      background: linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)),
                  url('${backgroundImageBase64}');
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
    <div class="header">
      <h1>🚗 ${area.name}</h1>
      <p>${area.description}</p>
    </div>

    <!-- 地図＋駐車場リスト -->
    <div class="section-title">🚗 車中泊におすすめの駐車場トップ10（18:00-8:00 料金順）</div>

    <div class="parking-map-fullwidth">
      <div class="map-layout-container">
        <div class="map-layout-left">
          <iframe id="parking-map-iframe" src="omoromachi-map.html"></iframe>
        </div>

        <div class="map-layout-right">
          <h4>📍 クリックして地図に表示</h4>

          <!-- エリア中心 -->
          <div class="area-center-card" onclick="showMarker('area_center')">
            <strong>🔴 エリア中心: ${area.name}</strong>
            <a href="https://www.google.com/maps?q=${area.lat},${area.lng}" target="_blank" onclick="event.stopPropagation()" class="btn-icon">🗺️</a>
          </div>

`;

  // 駐車場リスト生成
  parkingSpots.forEach((spot, index) => {
    const facilities = [];

    // バックエンドから返される周辺施設データを使用
    if (spot.nearest_convenience_store) {
      const conv = spot.nearest_convenience_store;
      const distanceM = conv.distance_m || conv.distance || 0;
      const convName = conv.name || 'コンビニ';

      // コンビニロゴを表示（sub_typeまたはnameからブランドを判定）
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

    if (spot.nearest_toilet) {
      const toilet = spot.nearest_toilet;
      const distanceM = toilet.distance_m || toilet.distance || 0;
      facilities.push(`<div class="facility-item">🚻 ${toilet.name} (${distanceM}m)</div>`);
    }

    if (spot.nearest_hotspring) {
      const onsen = spot.nearest_hotspring;
      const distanceM = onsen.distance_m || onsen.distance || 0;
      const distanceKm = (distanceM / 1000).toFixed(1);
      facilities.push(`<div class="facility-item">♨️ ${onsen.name} (${distanceKm}km)</div>`);
    }

    // 夜間料金を取得（18:00-8:00または20:00-8:00）
    let nightFee = '';
    if (spot.rates && spot.rates.length > 0) {
      const nightRate = spot.rates.find(rate =>
        rate.time_range && (rate.time_range.includes('20:00') || rate.time_range.includes('18:00'))
      );
      if (nightRate) {
        nightFee = `¥${nightRate.price}/${nightRate.minutes}分`;
      }
    }

    // ランキングアイコン
    let rankIcon = '🔵';
    if (index === 0) rankIcon = '🥇';  // 1位: 金メダル
    else if (index === 1) rankIcon = '🥈';  // 2位: 銀メダル
    else if (index === 2) rankIcon = '🥉';  // 3位: 銅メダル

    // 計算済み料金を表示（18:00-8:00の14時間駐車）
    const calculatedFeeText = spot.calculated_fee !== null && spot.calculated_fee !== undefined
      ? `¥${spot.calculated_fee.toLocaleString()} (18:00-8:00)`
      : nightFee || '料金情報なし';

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
      <div class="restaurant-grid">
`;

  // レストランカード生成
  topRestaurants.forEach((restaurant, index) => {
    // ランキングアイコン
    let rankIcon = '';
    if (index === 0) rankIcon = '🥇 1位';
    else if (index === 1) rankIcon = '🥈 2位';
    else if (index === 2) rankIcon = '🥉 3位';
    else rankIcon = `${index + 1}位`;

    html += `
        <div class="restaurant-card" onclick="showMarker('restaurant_${index}')">
          <div style="font-weight: bold; color: #ff9800; margin-bottom: 4px;">${rankIcon}</div>
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

// HTMLを保存（async対応）
(async () => {
  const html = await generateHTML();
  const outputPath = path.join(__dirname, 'data', 'omoromachi.html');
  fs.writeFileSync(outputPath, html, 'utf8');

  console.log(`✅ HTMLを生成しました: ${outputPath}`);
  console.log(`文字数: ${html.length}`);
})();
