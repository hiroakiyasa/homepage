const fs = require('fs');
const path = require('path');
const geolib = require('geolib');

/**
 * レストランデータ取得サービス
 */
class RestaurantDataService {
  constructor() {
    this.dataDir = '/Users/user/WebApp/camping_note/restaurants_data';
  }

  /**
   * エリア名からレストランデータファイルのパスを取得
   */
  getFilePath(areaName) {
    return path.join(this.dataDir, `area_${areaName}.json`);
  }

  /**
   * エリアのレストランデータを読み込む
   */
  loadAreaData(areaName) {
    const filePath = this.getFilePath(areaName);

    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  エリアデータが見つかりません: ${areaName}`);
      return null;
    }

    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return data;
    } catch (error) {
      console.error(`❌ エリアデータの読み込みエラー: ${areaName}`, error);
      return null;
    }
  }

  /**
   * トップNレストランを取得（既にスコア順にソート済み）
   * @param {string} areaName - エリア名
   * @param {number} limit - 取得件数
   * @param {number} minScore - 最低スコア（デフォルト3.5）
   * @returns {Array} レストランリスト
   */
  getTopRestaurants(areaName, limit = 5, minScore = 3.5) {
    const data = this.loadAreaData(areaName);

    if (!data || !data.restaurants) {
      return [];
    }

    // スコアでフィルタリング
    const filtered = data.restaurants.filter(r => {
      return r.score && r.score >= minScore && r.latitude && r.longitude;
    });

    // 上位N件を返す
    return filtered.slice(0, limit);
  }

  /**
   * 指定位置から近い順にレストランを取得
   * @param {string} areaName - エリア名
   * @param {number} lat - 中心緯度
   * @param {number} lng - 中心経度
   * @param {number} limit - 取得件数
   * @param {number} maxDistance - 最大距離（メートル、デフォルト1000m）
   * @param {number} minScore - 最低スコア（デフォルト3.5）
   * @returns {Array} レストランリスト（距離情報付き）
   */
  getNearbyRestaurants(areaName, lat, lng, limit = 5, maxDistance = 1000, minScore = 3.5) {
    const data = this.loadAreaData(areaName);

    if (!data || !data.restaurants) {
      return [];
    }

    // 座標とスコアでフィルタリング
    const validRestaurants = data.restaurants.filter(r => {
      return r.score && r.score >= minScore && r.latitude && r.longitude;
    });

    // 距離を計算
    const withDistance = validRestaurants.map(restaurant => {
      const distance = geolib.getDistance(
        { latitude: lat, longitude: lng },
        { latitude: restaurant.latitude, longitude: restaurant.longitude }
      );

      return {
        ...restaurant,
        distance: distance,
        distanceKm: (distance / 1000).toFixed(2)
      };
    });

    // 距離でフィルタリング＆ソート
    const nearby = withDistance
      .filter(r => r.distance <= maxDistance)
      .sort((a, b) => {
        // 距離が同じ場合はスコア順
        if (a.distance === b.distance) {
          return b.score - a.score;
        }
        return a.distance - b.distance;
      });

    return nearby.slice(0, limit);
  }

  /**
   * スコアとジャンルでフィルタリング
   * @param {string} areaName - エリア名
   * @param {number} minScore - 最低スコア
   * @param {Array<string>} genres - ジャンルリスト（例: ['寿司', 'イタリアン']）
   * @returns {Array} レストランリスト
   */
  getRestaurantsByFilter(areaName, minScore = 3.5, genres = null) {
    const data = this.loadAreaData(areaName);

    if (!data || !data.restaurants) {
      return [];
    }

    let filtered = data.restaurants.filter(r => {
      return r.score && r.score >= minScore && r.latitude && r.longitude;
    });

    // ジャンルでフィルタリング
    if (genres && genres.length > 0) {
      filtered = filtered.filter(r => {
        return r.genre && genres.includes(r.genre);
      });
    }

    return filtered;
  }

  /**
   * エリアの統計情報を取得
   * @param {string} areaName - エリア名
   * @returns {Object} 統計情報
   */
  getAreaStats(areaName) {
    const data = this.loadAreaData(areaName);

    if (!data || !data.restaurants) {
      return null;
    }

    const validRestaurants = data.restaurants.filter(r => r.score && r.latitude && r.longitude);
    const highScoreRestaurants = validRestaurants.filter(r => r.score >= 3.5);

    // ジャンル集計
    const genreCounts = {};
    validRestaurants.forEach(r => {
      if (r.genre) {
        genreCounts[r.genre] = (genreCounts[r.genre] || 0) + 1;
      }
    });

    // スコア分布
    const scores = validRestaurants.map(r => r.score);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);

    return {
      areaName: data.name,
      totalRestaurants: data.restaurantCount || data.restaurants.length,
      validRestaurants: validRestaurants.length,
      highScoreRestaurants: highScoreRestaurants.length,
      topScore: validRestaurants[0]?.score || 0,
      avgScore: avgScore.toFixed(2),
      maxScore: maxScore,
      minScore: minScore,
      genres: genreCounts,
      topGenres: Object.entries(genreCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([genre, count]) => ({ genre, count }))
    };
  }

  /**
   * エリアデータが存在するかチェック
   * @param {string} areaName - エリア名
   * @returns {boolean}
   */
  hasAreaData(areaName) {
    const filePath = this.getFilePath(areaName);
    return fs.existsSync(filePath);
  }
}

// シングルトンインスタンス
const restaurantDataService = new RestaurantDataService();

module.exports = restaurantDataService;
