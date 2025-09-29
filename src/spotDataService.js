const supabase = require('./supabaseClient');
const geolib = require('geolib');

class SpotDataService {
  async getNearbyFacilities(lat, lng, radius = 5000) {
    try {
      const facilities = {};

      // Get nearby hot springs
      const { data: hotSprings } = await supabase
        .from('hot_springs')
        .select('*');

      // Get nearby convenience stores
      const { data: convenienceStores } = await supabase
        .from('convenience_stores')
        .select('*');

      // Get nearby toilets
      const { data: toilets } = await supabase
        .from('toilets')
        .select('*');

      // Get nearby festivals
      const { data: festivals } = await supabase
        .from('festivals')
        .select('*');

      // Calculate distances and filter by radius
      facilities.hotSprings = this.filterByDistance(hotSprings || [], lat, lng, radius);
      facilities.convenienceStores = this.filterByDistance(convenienceStores || [], lat, lng, radius);
      facilities.toilets = this.filterByDistance(toilets || [], lat, lng, radius);
      facilities.festivals = this.filterByDistance(festivals || [], lat, lng, radius);

      return facilities;
    } catch (error) {
      console.error('Error fetching nearby facilities:', error);
      return null;
    }
  }

  filterByDistance(facilities, centerLat, centerLng, radius) {
    if (!facilities || !Array.isArray(facilities)) return [];

    return facilities
      .map(facility => {
        const distance = geolib.getDistance(
          { latitude: centerLat, longitude: centerLng },
          { latitude: facility.lat, longitude: facility.lng }
        );
        return { ...facility, distance };
      })
      .filter(facility => facility.distance <= radius)
      .sort((a, b) => a.distance - b.distance);
  }

  async getParkingSpots(prefecture = null, limit = 10) {
    try {
      let query = supabase
        .from('parking_spots')
        .select('*');

      if (prefecture) {
        query = query.eq('prefecture', prefecture);
      }

      const { data, error } = await query.limit(limit);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching parking spots:', error);
      return [];
    }
  }

  async getSpotDetails(spotId) {
    try {
      const { data, error } = await supabase
        .from('parking_spots')
        .select('*')
        .eq('id', spotId)
        .single();

      if (error) throw error;

      if (data) {
        // Get nearby facilities
        const facilities = await this.getNearbyFacilities(data.lat, data.lng);
        data.nearbyFacilities = facilities;
      }

      return data;
    } catch (error) {
      console.error('Error fetching spot details:', error);
      return null;
    }
  }

  async getTopSpotsByScore(limit = 5) {
    try {
      const spots = await this.getParkingSpots(null, 50);
      const scoredSpots = [];

      for (const spot of spots) {
        const facilities = await this.getNearbyFacilities(spot.lat, spot.lng);
        const score = this.calculateSpotScore(spot, facilities);
        scoredSpots.push({ ...spot, score, nearbyFacilities: facilities });
      }

      // Sort by score and return top spots
      scoredSpots.sort((a, b) => b.score - a.score);
      return scoredSpots.slice(0, limit);
    } catch (error) {
      console.error('Error getting top spots:', error);
      return [];
    }
  }

  calculateSpotScore(spot, facilities) {
    let score = 0;
    const weights = {
      toilet: 0.3,
      convenienceStore: 0.2,
      hotSpring: 0.2,
      price: 0.3
    };

    // Toilet proximity score (0-10)
    if (facilities && facilities.toilets && facilities.toilets.length > 0) {
      const nearestToilet = facilities.toilets[0];
      score += weights.toilet * (10 - Math.min(nearestToilet.distance / 500, 10));
    }

    // Convenience store proximity score (0-10)
    if (facilities && facilities.convenienceStores && facilities.convenienceStores.length > 0) {
      const nearestStore = facilities.convenienceStores[0];
      score += weights.convenienceStore * (10 - Math.min(nearestStore.distance / 1000, 10));
    }

    // Hot spring proximity score (0-10)
    if (facilities && facilities.hotSprings && facilities.hotSprings.length > 0) {
      const nearestHotSpring = facilities.hotSprings[0];
      score += weights.hotSpring * (10 - Math.min(nearestHotSpring.distance / 2000, 10));
    }

    // Price score (0-10) - free parking gets full score
    if (!spot.original_fees || spot.original_fees === '無料' || spot.original_fees === '0') {
      score += weights.price * 10;
    } else if (spot.rates) {
      // Parse rates if available
      try {
        const rateValue = typeof spot.rates === 'object' ?
          Object.values(spot.rates)[0] : parseInt(spot.rates);
        if (!isNaN(rateValue)) {
          score += weights.price * Math.max(0, 10 - rateValue / 100);
        }
      } catch (e) {
        score += weights.price * 5; // Default middle score if can't parse
      }
    }

    return score;
  }
}

module.exports = new SpotDataService();