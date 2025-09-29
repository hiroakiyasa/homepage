const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');

class ImageService {
  constructor() {
    this.wikimediaBaseUrl = 'https://commons.wikimedia.org/w/api.php';
    this.mapillaryBaseUrl = 'https://graph.mapillary.com';
    this.imageDir = path.join(__dirname, '..', 'images');
    this.ensureImageDir();
  }

  async ensureImageDir() {
    try {
      await fs.mkdir(this.imageDir, { recursive: true });
    } catch (error) {
      console.error('Error creating image directory:', error);
    }
  }

  // Search Wikimedia Commons for images
  async searchWikimediaImages(searchTerm, limit = 5) {
    try {
      const params = {
        action: 'query',
        format: 'json',
        generator: 'search',
        gsrsearch: searchTerm,
        gsrnamespace: 6, // File namespace
        gsrlimit: limit,
        prop: 'imageinfo',
        iiprop: 'url|extmetadata',
        iiurlwidth: 1024
      };

      const response = await axios.get(this.wikimediaBaseUrl, { params });

      if (response.data.query && response.data.query.pages) {
        const images = [];
        for (const pageId in response.data.query.pages) {
          const page = response.data.query.pages[pageId];
          if (page.imageinfo && page.imageinfo[0]) {
            const imageInfo = page.imageinfo[0];
            const metadata = imageInfo.extmetadata || {};

            // Check license
            const license = metadata.License ? metadata.License.value : '';
            const usageTerms = metadata.UsageTerms ? metadata.UsageTerms.value : '';

            // Only use images with appropriate licenses (CC-BY, CC-BY-SA, Public Domain)
            if (this.isCommerciallyUsable(license, usageTerms)) {
              images.push({
                url: imageInfo.thumburl || imageInfo.url,
                title: page.title,
                license: license,
                credit: metadata.Artist ? metadata.Artist.value : 'Wikimedia Commons',
                source: 'wikimedia'
              });
            }
          }
        }
        return images;
      }
      return [];
    } catch (error) {
      console.error('Error searching Wikimedia images:', error);
      return [];
    }
  }

  // Check if image license allows commercial use
  isCommerciallyUsable(license, usageTerms) {
    const allowedLicenses = [
      'cc-by', 'cc-by-sa', 'cc0', 'public domain',
      'pd', 'cc by', 'cc by-sa', 'creative commons'
    ];

    const licenseString = (license + ' ' + usageTerms).toLowerCase();
    return allowedLicenses.some(allowed => licenseString.includes(allowed));
  }

  // Search for location-based images
  async searchLocationImages(lat, lng, radius = 500) {
    const images = [];

    // Try Wikimedia Commons with location-based search
    try {
      const params = {
        action: 'query',
        format: 'json',
        list: 'geosearch',
        gscoord: `${lat}|${lng}`,
        gsradius: radius,
        gslimit: 10,
        gsprop: 'type|name|dim|country|region',
        gsnamespace: 6
      };

      const response = await axios.get(this.wikimediaBaseUrl, { params });

      if (response.data.query && response.data.query.geosearch) {
        for (const item of response.data.query.geosearch) {
          // Get image details for each found file
          const imageDetails = await this.getWikimediaImageDetails(item.title);
          if (imageDetails) {
            images.push(imageDetails);
          }
        }
      }
    } catch (error) {
      console.error('Error searching location images:', error);
    }

    return images;
  }

  async getWikimediaImageDetails(title) {
    try {
      const params = {
        action: 'query',
        format: 'json',
        titles: title,
        prop: 'imageinfo',
        iiprop: 'url|extmetadata',
        iiurlwidth: 1024
      };

      const response = await axios.get(this.wikimediaBaseUrl, { params });

      if (response.data.query && response.data.query.pages) {
        const page = Object.values(response.data.query.pages)[0];
        if (page.imageinfo && page.imageinfo[0]) {
          const imageInfo = page.imageinfo[0];
          const metadata = imageInfo.extmetadata || {};

          const license = metadata.License ? metadata.License.value : '';
          const usageTerms = metadata.UsageTerms ? metadata.UsageTerms.value : '';

          if (this.isCommerciallyUsable(license, usageTerms)) {
            return {
              url: imageInfo.thumburl || imageInfo.url,
              title: page.title,
              license: license,
              credit: metadata.Artist ? metadata.Artist.value : 'Wikimedia Commons',
              source: 'wikimedia'
            };
          }
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting Wikimedia image details:', error);
      return null;
    }
  }

  // Get generic camping-related images as fallback
  async getGenericCampingImages() {
    const genericTerms = [
      '道の駅', 'roadside station Japan', '車中泊', 'camping car',
      '富山県 観光', 'Toyama tourism', '温泉 日本', 'Japanese onsen'
    ];

    const allImages = [];
    for (const term of genericTerms) {
      const images = await this.searchWikimediaImages(term, 2);
      allImages.push(...images);
      if (allImages.length >= 5) break;
    }

    return allImages;
  }

  // Download and optimize image
  async downloadAndOptimizeImage(imageUrl, spotName) {
    try {
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer'
      });

      const filename = `${spotName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.jpg`;
      const filepath = path.join(this.imageDir, filename);

      // Optimize image with sharp
      await sharp(response.data)
        .resize(1200, 800, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 85 })
        .toFile(filepath);

      return filepath;
    } catch (error) {
      console.error('Error downloading/optimizing image:', error);
      return null;
    }
  }

  // Get best image for a spot
  async getSpotImage(spot) {
    let images = [];

    // First try location-based search
    if (spot.lat && spot.lng) {
      images = await this.searchLocationImages(spot.lat, spot.lng, 1000);
    }

    // If no location images, try searching by name
    if (images.length === 0 && spot.name) {
      images = await this.searchWikimediaImages(spot.name, 3);
    }

    // If still no images, try searching by area/prefecture
    if (images.length === 0) {
      const searchTerms = [];
      if (spot.prefecture) searchTerms.push(spot.prefecture);
      if (spot.area_name) searchTerms.push(spot.area_name);
      if (spot.address) searchTerms.push(spot.address.split(' ')[0]);

      for (const term of searchTerms) {
        images = await this.searchWikimediaImages(term + ' 観光', 2);
        if (images.length > 0) break;
      }
    }

    // Fallback to generic camping images
    if (images.length === 0) {
      images = await this.getGenericCampingImages();
    }

    return images.length > 0 ? images[0] : null;
  }
}

module.exports = new ImageService();