#!/usr/bin/env node

/**
 * ランキング生成スクリプト
 * Supabaseのlikesテーブルから駐車場とレストランの人気ランキングを生成し、
 * data/rankings.jsonに保存します。
 *
 * 実行方法: node generate-rankings.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const geolib = require('geolib');
const supabase = require('./src/supabaseClient');

// カラーコード
const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m'
};

/**
 * 地域データを読み込み
 */
function loadRegionsData() {
  console.log(`${colors.cyan}📍 地域データを読み込み中...${colors.reset}`);

  // dataディレクトリとルートディレクトリを検索
  const searchDirs = [
    path.join(__dirname, 'data'),
    __dirname
  ];

  let files = [];
  for (const dir of searchDirs) {
    if (fs.existsSync(dir)) {
      const dirFiles = fs.readdirSync(dir)
        .filter(f => f.startsWith('regions-data.backup-') && f.endsWith('.json'))
        .map(f => path.join(dir, f));
      files = files.concat(dirFiles);
    }
  }

  if (files.length === 0) {
    throw new Error('地域データファイルが見つかりません');
  }

  // 最新のファイルを使用
  const latestFile = files.sort().reverse()[0];
  const data = JSON.parse(fs.readFileSync(latestFile, 'utf8'));

  console.log(`   ${colors.green}✓${colors.reset} ${data.length}箇所の地域データを読み込みました (${path.basename(latestFile)})`);
  return data;
}

/**
 * 最寄りの地域を検索
 */
function findNearestRegion(lat, lng, regions) {
  let nearest = null;
  let minDistance = Infinity;

  for (const region of regions) {
    const distance = geolib.getDistance(
      { latitude: lat, longitude: lng },
      { latitude: region.lat, longitude: region.lng }
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearest = region;
    }
  }

  return {
    ...nearest,
    distance_meters: minDistance
  };
}

/**
 * 駐車場ランキングを取得
 */
async function getParkingRankings(regions) {
  console.log(`${colors.cyan}🚗 駐車場ランキングを取得中...${colors.reset}`);

  const { data, error } = await supabase.rpc('get_parking_rankings', { p_limit: 10 });

  if (error) {
    console.error(`${colors.red}エラー:${colors.reset}`, error);
    return [];
  }

  if (!data || data.length === 0) {
    console.log(`   ${colors.yellow}⚠${colors.reset} 駐車場のいいねデータがまだありません`);
    return [];
  }

  // 各スポットに最寄り地域情報を追加
  const withRegions = data.map((spot, index) => {
    const nearest = findNearestRegion(spot.latitude, spot.longitude, regions);
    return {
      rank: index + 1,
      spot_name: spot.spot_name,
      spot_id: spot.spot_id,
      latitude: spot.latitude,
      longitude: spot.longitude,
      like_count: parseInt(spot.like_count),
      nearest_region: {
        name: nearest.name,
        fileName: nearest.fileName || nearest.name,
        url: `regions/${(nearest.fileName || nearest.name).replace(/[\/\\:*?"<>|]/g, '_')}.html`,
        distance_meters: nearest.distance_meters
      }
    };
  });

  console.log(`   ${colors.green}✓${colors.reset} ${withRegions.length}件の駐車場ランキングを取得しました`);
  return withRegions;
}

/**
 * レストランランキングを取得
 */
async function getRestaurantRankings(regions) {
  console.log(`${colors.cyan}🍴 レストランランキングを取得中...${colors.reset}`);

  const { data, error } = await supabase.rpc('get_restaurant_rankings', { p_limit: 10 });

  if (error) {
    console.error(`${colors.red}エラー:${colors.reset}`, error);
    return [];
  }

  if (!data || data.length === 0) {
    console.log(`   ${colors.yellow}⚠${colors.reset} レストランのいいねデータがまだありません`);
    return [];
  }

  // 各スポットに最寄り地域情報を追加
  const withRegions = data.map((spot, index) => {
    const nearest = findNearestRegion(spot.latitude, spot.longitude, regions);
    return {
      rank: index + 1,
      spot_name: spot.spot_name,
      spot_id: spot.spot_id,
      latitude: spot.latitude,
      longitude: spot.longitude,
      like_count: parseInt(spot.like_count),
      nearest_region: {
        name: nearest.name,
        fileName: nearest.fileName || nearest.name,
        url: `regions/${(nearest.fileName || nearest.name).replace(/[\/\\:*?"<>|]/g, '_')}.html`,
        distance_meters: nearest.distance_meters
      }
    };
  });

  console.log(`   ${colors.green}✓${colors.reset} ${withRegions.length}件のレストランランキングを取得しました`);
  return withRegions;
}

/**
 * 地域ランキングを取得
 * likesテーブルのいいね数に基づいてランキングを生成
 */
async function getRegionRankings(regions) {
  console.log(`${colors.cyan}🗾 地域ランキングを生成中...${colors.reset}`);

  // likesテーブルから地域のいいね数を集計
  const { data, error } = await supabase
    .from('likes')
    .select('spot_name, latitude, longitude')
    .eq('spot_type', 'region');

  if (error) {
    console.error(`${colors.red}エラー:${colors.reset}`, error);
    return [];
  }

  if (!data || data.length === 0) {
    console.log(`   ${colors.yellow}⚠${colors.reset} 地域のいいねデータがまだありません`);
    return [];
  }

  // spot_nameごとにいいね数を集計
  const likeCounts = {};
  data.forEach(like => {
    const key = like.spot_name;
    if (!likeCounts[key]) {
      likeCounts[key] = {
        spot_name: like.spot_name,
        latitude: like.latitude,
        longitude: like.longitude,
        like_count: 0
      };
    }
    likeCounts[key].like_count++;
  });

  // いいね数でソート
  const sorted = Object.values(likeCounts)
    .sort((a, b) => b.like_count - a.like_count)
    .slice(0, 10);

  // 各地域に詳細情報を追加
  const withDetails = sorted.map((spot, index) => {
    // 地域データから詳細情報を検索
    const regionData = regions.find(r =>
      r.name === spot.spot_name ||
      Math.abs(r.lat - spot.latitude) < 0.001 && Math.abs(r.lng - spot.longitude) < 0.001
    );

    return {
      rank: index + 1,
      region_name: spot.spot_name,
      file_name: regionData?.fileName || spot.spot_name,
      latitude: spot.latitude,
      longitude: spot.longitude,
      like_count: spot.like_count,
      restaurant_count: regionData?.restaurantCount || 0,
      elevation: regionData?.elevation || 0,
      url: `regions/${(regionData?.fileName || spot.spot_name).replace(/[\/\\:*?"<>|]/g, '_')}.html`
    };
  });

  console.log(`   ${colors.green}✓${colors.reset} ${withDetails.length}件の地域ランキングを生成しました`);
  return withDetails;
}

/**
 * メイン処理
 */
async function main() {
  console.log(`${colors.blue}=== ランキング生成 ===${colors.reset}\n`);

  try {
    // 地域データ読み込み
    const regions = loadRegionsData();

    // ランキング取得
    const parkingRankings = await getParkingRankings(regions);
    const restaurantRankings = await getRestaurantRankings(regions);
    const regionRankings = await getRegionRankings(regions);

    // 出力データ作成
    const output = {
      generated_at: new Date().toISOString(),
      parking: parkingRankings,
      restaurant: restaurantRankings,
      region: regionRankings
    };

    // camping_note/rankings.jsonに保存
    const outputPath = path.join(__dirname, 'camping_note', 'rankings.json');

    // camping_noteディレクトリが存在しない場合は作成
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');

    console.log(`\n${colors.green}✅ ランキング生成完了${colors.reset}`);
    console.log(`   出力先: ${colors.cyan}${outputPath}${colors.reset}`);
    console.log(`   生成日時: ${colors.cyan}${new Date().toLocaleString('ja-JP')}${colors.reset}`);
    console.log(`\n${colors.blue}📊 ランキング内容:${colors.reset}`);
    console.log(`   🚗 駐車場: ${parkingRankings.length}件`);
    console.log(`   🍴 レストラン: ${restaurantRankings.length}件`);
    console.log(`   🗾 地域: ${regionRankings.length}件`);

  } catch (error) {
    console.error(`\n${colors.red}❌ エラー:${colors.reset}`, error.message);
    process.exit(1);
  }
}

// 実行
if (require.main === module) {
  main();
}

module.exports = { main };
