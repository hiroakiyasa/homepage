const supabase = require('./supabaseClient');
const geolib = require('geolib');

// イベント中心座標
const EVENT_CENTER = { lat: 43.1907, lng: 140.9947 };

// 駐車料金計算関数（18:00〜8:00の14時間）
function calculateOvernightFee(rates) {
  if (!rates || rates.length === 0) return 0;

  const OVERNIGHT_HOURS = 14; // 18:00〜8:00
  const OVERNIGHT_MINUTES = OVERNIGHT_HOURS * 60;

  // 最大料金を探す
  const maxRate = rates.find(r => r.type === 'max');
  if (maxRate && maxRate.minutes >= OVERNIGHT_MINUTES) {
    return maxRate.price || 0;
  }

  // 夜間専用料金を探す
  const nightRate = rates.find(r =>
    r.time_range &&
    (r.time_range.includes('22:00') || r.time_range.includes('夜間'))
  );

  if (nightRate) {
    if (nightRate.type === 'base') {
      // 夜間基本料金がある場合
      const periods = Math.ceil(OVERNIGHT_MINUTES / nightRate.minutes);
      return nightRate.price * periods;
    }
  }

  // 通常料金で計算
  const baseRate = rates.find(r => r.type === 'base');
  if (baseRate) {
    const periods = Math.ceil(OVERNIGHT_MINUTES / baseRate.minutes);
    return baseRate.price * periods;
  }

  return 0;
}

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

// 駐車場データを取得
async function getOvernightParkingSpots() {
  try {
    // 小樽周辺の駐車場を取得
    const { data: parkingSpots, error } = await supabase
      .from('parking_spots')
      .select('*')
      .gte('lat', 43.15)
      .lte('lat', 43.25)
      .gte('lng', 140.95)
      .lte('lng', 141.05);

    if (error) throw error;

    // 各駐車場の料金計算と距離計算
    const processed = parkingSpots.map(spot => {
      const distance = calculateDistance(
        EVENT_CENTER.lat, EVENT_CENTER.lng,
        spot.lat, spot.lng
      );

      const overnightFee = calculateOvernightFee(spot.rates);
      const walkingMinutes = calculateWalkingMinutes(distance);

      return {
        ...spot,
        distance_to_event: distance,
        overnight_fee: overnightFee,
        walking_minutes: walkingMinutes
      };
    });

    // 距離1km以内でフィルタリング
    const nearbySpots = processed.filter(s => s.distance_to_event <= 1000);

    // 料金で安い順にソート
    const sorted = nearbySpots.sort((a, b) => {
      if (a.overnight_fee === b.overnight_fee) {
        return a.distance_to_event - b.distance_to_event;
      }
      return a.overnight_fee - b.overnight_fee;
    });

    // 上位10件を返す
    return sorted.slice(0, 10);
  } catch (error) {
    console.error('Error fetching parking spots:', error);
    return [];
  }
}

// 周辺施設を取得（半径300m以内）
async function getNearbyFacilities(lat, lng, radius = 300) {
  try {
    // コンビニ取得
    const { data: convenienceStores } = await supabase
      .from('convenience_stores')
      .select('*');

    // トイレ取得
    const { data: toilets } = await supabase
      .from('toilets')
      .select('*');

    // 温泉取得
    const { data: hotSprings } = await supabase
      .from('hot_springs')
      .select('*');

    // 距離計算してフィルタリング
    const filterByDistance = (facilities) => {
      if (!facilities) return [];

      return facilities
        .map(f => ({
          ...f,
          distance: calculateDistance(lat, lng, f.lat, f.lng)
        }))
        .filter(f => f.distance <= radius)
        .sort((a, b) => a.distance - b.distance);
    };

    return {
      convenience_stores: filterByDistance(convenienceStores),
      toilets: filterByDistance(toilets),
      hot_springs: filterByDistance(hotSprings)
    };
  } catch (error) {
    console.error('Error fetching nearby facilities:', error);
    return {
      convenience_stores: [],
      toilets: [],
      hot_springs: []
    };
  }
}

// レストランを取得（半径300m以内、スコア順）
async function getTopRestaurants(lat, lng, radius = 300, limit = 5) {
  try {
    const { data: restaurants } = await supabase
      .from('restaurants')
      .select('*');

    if (!restaurants) return [];

    // 距離計算とフィルタリング
    const nearby = restaurants
      .map(r => ({
        ...r,
        distance: calculateDistance(lat, lng, r.lat, r.lng)
      }))
      .filter(r => r.distance <= radius);

    // スコア順にソート（評価が高い順）
    const sorted = nearby.sort((a, b) => {
      const scoreA = a.rating || 0;
      const scoreB = b.rating || 0;
      if (scoreB === scoreA) {
        return a.distance - b.distance;
      }
      return scoreB - scoreA;
    });

    return sorted.slice(0, limit);
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    return [];
  }
}

// 全データを取得
async function fetchAllData() {
  console.log('小樽雪あかりの路の駐車場データを取得中...');

  // 駐車場データを取得
  const parkingSpots = await getOvernightParkingSpots();
  console.log(`駐車場 ${parkingSpots.length}件 取得完了`);

  // 各駐車場の周辺施設とレストランを取得
  for (let i = 0; i < parkingSpots.length; i++) {
    const spot = parkingSpots[i];
    console.log(`[${i + 1}/${parkingSpots.length}] ${spot.name} の周辺施設を取得中...`);

    // 周辺施設（300m以内）
    const facilities = await getNearbyFacilities(spot.lat, spot.lng, 300);
    spot.facilities = facilities;

    // レストラン（300m以内、上位5件）
    const restaurants = await getTopRestaurants(spot.lat, spot.lng, 300, 5);
    spot.restaurants = restaurants;

    // ランク付け
    spot.rank = i + 1;
  }

  // イベント周辺のレストラン上位5件も取得
  const topRestaurants = await getTopRestaurants(
    EVENT_CENTER.lat,
    EVENT_CENTER.lng,
    300,
    5
  );

  return {
    event: {
      name: '小樽雪あかりの路',
      lat: EVENT_CENTER.lat,
      lon: EVENT_CENTER.lng
    },
    parkingSpots: parkingSpots,
    topRestaurants: topRestaurants,
    generatedAt: new Date().toISOString()
  };
}

module.exports = {
  fetchAllData,
  getOvernightParkingSpots,
  getNearbyFacilities,
  getTopRestaurants,
  calculateOvernightFee
};
