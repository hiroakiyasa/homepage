const fs = require('fs');
const path = require('path');
const supabase = require('./src/supabaseClient');
const geolib = require('geolib');
const restaurantDataService = require('./src/restaurantDataService');

// おもろまち駅の中心座標
const AREA_CENTER = {
  lat: 26.2188,
  lng: 127.6960,
  name: 'おもろまち駅周辺',
  description: '那覇市の中心部、ショッピングやグルメが楽しめるエリア'
};

// 距離計算関数
function calculateDistance(lat1, lng1, lat2, lng2) {
  return geolib.getDistance(
    { latitude: lat1, longitude: lng1 },
    { latitude: lat2, longitude: lng2 }
  );
}

// 徒歩時間計算（80m/分）
function calculateWalkingMinutes(distanceM) {
  return Math.ceil(distanceM / 80);
}

/**
 * 駐車場データを取得（料金順トップ10）
 *
 * フロー:
 * [1] 駐車条件を設定（18:00-8:00の14時間）
 * [2] SupabaseService.getParkingSpotsSortedByFee()
 *     ├─ RPC呼び出しパラメータ構築
 *     ├─ supabase.rpc('get_parking_spots_sorted_by_fee', {...})
 *     ↓
 * [3] PostgreSQL RPC関数: get_parking_spots_sorted_by_fee
 *     ├─ 地図範囲内の駐車場を抽出（最大600件）
 *     ├─ 各駐車場の料金を計算
 *     │   [4] calculate_simple_parking_fee(rates, entry_time, duration_minutes)
 *     │       ├─ 時間帯チェック（JST変換）
 *     │       ├─ base/progressive/max料金の抽出
 *     │       ├─ 段階的料金計算（apply_after考慮）
 *     │       └─ 最大料金キャップ適用
 *     ├─ 料金順にソート（ASC NULLS LAST）
 *     ├─ ランク付与（DENSE_RANK）
 *     └─ 上位20件を返却（LIMIT 20）
 *     ↓
 * [5] フロントエンドで上位10件のみ使用
 */
async function getParkingSpots() {
  try {
    console.log('📍 駐車場データを取得中（料金順トップ10）...');

    // [1] 駐車条件を設定
    // 夜間駐車: 18:00 入庫 → 翌朝 8:00 出庫 = 14時間 = 840分
    const parkingStart = new Date();
    parkingStart.setHours(18, 0, 0, 0); // 18:00に設定
    const durationMinutes = 840; // 14時間（18:00-翌8:00）

    console.log(`   📅 駐車条件:`);
    console.log(`      入庫時刻: ${parkingStart.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })} (18:00)`);
    console.log(`      駐車時間: ${durationMinutes}分 (14時間)`);
    console.log(`      出庫時刻: 翌朝 8:00`);

    // おもろまち周辺の地図範囲を設定
    const region = {
      minLat: 26.19,
      maxLat: 26.25,
      minLng: 127.67,
      maxLng: 127.72
    };

    console.log(`   🗺️  検索範囲: 緯度 ${region.minLat}～${region.maxLat}, 経度 ${region.minLng}～${region.maxLng}`);

    // [2] バックエンドのRPC関数を呼び出し
    // 料金計算とソートはすべてPostgreSQLのサーバー側で実行される
    console.log(`   🔄 RPC関数呼び出し: get_parking_spots_sorted_by_fee`);

    const { data: parkingSpots, error } = await supabase.rpc('get_parking_spots_sorted_by_fee', {
      min_lat: region.minLat,
      max_lat: region.maxLat,
      min_lng: region.minLng,
      max_lng: region.maxLng,
      duration_minutes: durationMinutes,
      parking_start: parkingStart.toISOString() // ISO 8601形式でUTC時刻を送信
    });

    if (error) {
      console.error('   ❌ RPC関数エラー:', error);
      throw error;
    }

    console.log(`   ✅ RPC関数から返却: ${parkingSpots ? parkingSpots.length : 0}件（上位20件まで）`);

    if (!parkingSpots || parkingSpots.length === 0) {
      console.log('   ⚠️  駐車場が見つかりませんでした');
      return [];
    }

    // [3] 返却されたデータを処理
    // バックエンドは latitude/longitude で返すので、lat/lng に変換
    // また、距離と徒歩時間を計算
    const processed = await Promise.all(parkingSpots.map(async spot => {
      const lat = spot.latitude || spot.lat;
      const lng = spot.longitude || spot.lng;

      const distance = calculateDistance(
        AREA_CENTER.lat, AREA_CENTER.lng,
        lat, lng
      );

      const walkingMinutes = calculateWalkingMinutes(distance);

      // バックエンドから返される周辺施設データをパース
      let nearest_convenience_store = null;
      let nearest_hotspring = null;
      let nearest_toilet = spot.nearest_toilet; // これは既にオブジェクト

      // nearest_convenience_store が文字列の場合はパース
      if (spot.nearest_convenience_store) {
        if (typeof spot.nearest_convenience_store === 'string') {
          try {
            nearest_convenience_store = JSON.parse(spot.nearest_convenience_store);
          } catch (e) {
            console.error('コンビニデータのパースエラー:', e);
          }
        } else {
          nearest_convenience_store = spot.nearest_convenience_store;
        }
      }

      // nearest_hotspring が文字列の場合はパース
      if (spot.nearest_hotspring) {
        if (typeof spot.nearest_hotspring === 'string') {
          try {
            nearest_hotspring = JSON.parse(spot.nearest_hotspring);
          } catch (e) {
            console.error('温泉データのパースエラー:', e);
          }
        } else {
          nearest_hotspring = spot.nearest_hotspring;
        }
      }

      // 地図マーカー用に座標付きの施設データを取得
      const facilities = await getNearbyFacilities({ lat, lng });

      return {
        ...spot,
        lat,  // 地図マーカー用
        lng,  // 地図マーカー用
        distance_to_center: distance,
        walking_minutes: walkingMinutes,
        nearest_convenience_store,
        nearest_hotspring,
        nearest_toilet,
        facilities  // 地図マーカー用（座標付き）
        // calculated_fee はバックエンドから計算済みで返される
      };
    }));

    // [4] 上位10件のみ取得（仕様: トップ10を表示）
    const top10 = processed.slice(0, 10);

    console.log(`   🏆 料金順トップ10:`);
    top10.forEach((spot, index) => {
      const rank = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}位`;
      console.log(`      ${rank} ¥${spot.calculated_fee.toLocaleString()} - ${spot.name} (徒歩${spot.walking_minutes}分/${spot.distance_to_center}m)`);
    });

    return top10;
  } catch (error) {
    console.error('❌ 駐車場データ取得エラー:', error);
    console.error('   詳細:', error.message);
    return [];
  }
}

// 周辺施設を取得
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
    console.error('❌ 周辺施設取得エラー:', error);
  }

  return facilities;
}

// メイン処理
async function main() {
  try {
    console.log('=== おもろまち駅周辺データ更新 ===\n');

    // 駐車場取得（周辺施設データも含む）
    const parkingSpots = await getParkingSpots();

    console.log('\n✅ 周辺施設データもバックエンドから取得済み');

    // レストラントップ5を取得
    console.log('\n🍴 レストランデータを取得中...');
    const topRestaurants = restaurantDataService.getTopRestaurants('おもろまち駅', 5, 3.5);
    console.log(`   ✅ ${topRestaurants.length}件のレストランを取得`);

    // 全データを統合
    const allData = {
      area: AREA_CENTER,
      parkingSpots: parkingSpots,
      topRestaurants: topRestaurants,
      generatedAt: new Date().toISOString()
    };

    // JSONファイルに保存
    const outputPath = path.join(__dirname, 'data', 'omoromachi-data.json');
    const dataDir = path.dirname(outputPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(allData, null, 2), 'utf8');

    console.log(`\n✅ データ取得完了: ${outputPath}`);
    console.log(`駐車場数: ${parkingSpots.length}件`);
    console.log(`レストラン数: ${topRestaurants.length}件\n`);

    // サマリーを表示
    console.log('=== 駐車場一覧（料金順・安い順） ===');
    parkingSpots.forEach((spot, index) => {
      console.log(`${index + 1}. ${spot.name}`);
      console.log(`   料金: ¥${spot.calculated_fee} (14時間)`);
      console.log(`   距離: ${spot.distance_to_center}m (徒歩約${spot.walking_minutes}分)`);

      const hasConvenience = spot.nearest_convenience_store ? '○' : '×';
      const hasToilet = spot.nearest_toilet ? '○' : '×';
      const hasHotspring = spot.nearest_hotspring ? '○' : '×';
      console.log(`   周辺施設: コンビニ${hasConvenience}, トイレ${hasToilet}, 温泉${hasHotspring}`);

      if (spot.nearest_convenience_store) {
        console.log(`     - コンビニ: ${spot.nearest_convenience_store.name} (${spot.nearest_convenience_store.distance_m}m)`);
      }
      if (spot.nearest_toilet) {
        console.log(`     - トイレ: ${spot.nearest_toilet.name} (${spot.nearest_toilet.distance_m}m)`);
      }
      if (spot.nearest_hotspring) {
        console.log(`     - 温泉: ${spot.nearest_hotspring.name} (${spot.nearest_hotspring.distance_m}m)`);
      }
      console.log('');
    });

    console.log('=== レストラントップ5 ===');
    topRestaurants.forEach((restaurant, index) => {
      console.log(`${index + 1}. ${restaurant.name}`);
      console.log(`   ジャンル: ${restaurant.genre || 'N/A'}`);
      console.log(`   住所: ${restaurant.address || 'N/A'}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

main();
