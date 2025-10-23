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
            downloadImageAsBase64('https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Omoromachi_DFS_Galleria_Okinawa_20070810.jpg/1280px-Omoromachi_DFS_Galleria_Okinawa_20070810.jpg', resolve);
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
  }).on('error', () => {
    callback('');
  });
}

/**
 * レストランデータから地域のHTMLを生成
 */
async function generateRegionHTML(regionData, convenienceLogos, outputDir) {
  const { name, fileName } = regionData;

  // レストランデータを読み込む
  const restaurantDataPath = `/Users/user/WebApp/camping_note/restaurants_data/area_${fileName}.json`;

  if (!fs.existsSync(restaurantDataPath)) {
    console.log(`   ${colors.red}✗${colors.reset} ${fileName}: レストランデータが見つかりません`);
    return false;
  }

  const restaurantData = JSON.parse(fs.readFileSync(restaurantDataPath, 'utf8'));
  const topRestaurants = restaurantData.restaurants.slice(0, 5);

  // 背景画像を取得（簡易版 - デフォルト画像使用）
  const backgroundImageBase64 = '';

  // 簡易的なHTMLを生成（駐車場データなし版）
  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name} - 車中泊おすすめスポット</title>
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
      background: linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), #1976d2;
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
    @media (max-width: 1200px) {
      .restaurant-grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }
    @media (max-width: 768px) {
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
      <h1>🚗 ${name}</h1>
      <p>周辺のおすすめレストラン情報</p>
    </div>

    <!-- レストランセクション -->
    <div class="restaurant-section">
      <h2>🍴 おすすめレストラントップ5</h2>
      <div class="restaurant-grid">
${topRestaurants.map((restaurant, index) => {
  const rankIcon = index === 0 ? '🥇 1位' : index === 1 ? '🥈 2位' : index === 2 ? '🥉 3位' : `${index + 1}位`;
  return `        <div class="restaurant-card">
          <div style="font-weight: bold; color: #ff9800; margin-bottom: 4px;">${rankIcon}</div>
          <h3>${restaurant.name}</h3>
          ${restaurant.genre ? `<span class="restaurant-genre">${restaurant.genre}</span>` : ''}
          ${restaurant.address ? `<div class="restaurant-address">📍 ${restaurant.address}</div>` : ''}
        </div>`;
}).join('\n')}
      </div>
    </div>

  </div>
</body>
</html>`;

  // HTMLを保存
  const outputPath = path.join(outputDir, `${fileName}.html`);
  fs.writeFileSync(outputPath, html, 'utf8');

  return true;
}

/**
 * メイン処理
 */
async function main() {
  console.log(`${colors.blue}=== 298地域のHTML自動生成 ===${colors.reset}\n`);

  // コンビニロゴを事前にロード
  console.log('🏪 コンビニロゴを読み込み中...');
  const convenienceLogos = loadConvenienceLogos();
  console.log(`   ✅ ${Object.keys(convenienceLogos).length}種類のロゴを読み込みました\n`);

  // 地域データを読み込む
  const regionsDataPath = path.join(__dirname, 'data', 'regions-data.json');
  const regions = JSON.parse(fs.readFileSync(regionsDataPath, 'utf8'));

  console.log(`📍 ${regions.length}個の地域のHTMLを生成します\n`);

  // 出力ディレクトリ
  const outputDir = path.join(__dirname, 'data', 'regions');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let successCount = 0;
  let errorCount = 0;

  // 各地域のHTMLを生成
  for (let i = 0; i < regions.length; i++) {
    const region = regions[i];
    showProgress(i + 1, regions.length, region.name);

    try {
      const success = await generateRegionHTML(region, convenienceLogos, outputDir);
      if (success) {
        successCount++;
      } else {
        errorCount++;
      }
    } catch (err) {
      console.log(`\n   ${colors.red}✗${colors.reset} ${region.name}: ${err.message}`);
      errorCount++;
    }

    // API制限回避のため少し待機
    if (i < regions.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log(`\n${colors.green}✅ 生成完了${colors.reset}`);
  console.log(`   成功: ${colors.green}${successCount}${colors.reset}件`);
  console.log(`   失敗: ${colors.red}${errorCount}${colors.reset}件`);
  console.log(`   出力先: ${colors.cyan}${outputDir}${colors.reset}\n`);
}

// 実行
main().catch(err => {
  console.error(`${colors.red}エラー:${colors.reset}`, err);
  process.exit(1);
});
