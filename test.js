// Test script to verify Supabase connection and data retrieval
require('dotenv').config();
const spotDataService = require('./src/spotDataService');
const imageService = require('./src/imageService');
const articleGenerator = require('./src/articleGenerator');

async function test() {
  console.log('Testing Supabase connection and data retrieval...\n');

  try {
    // Test 1: Get parking spots
    console.log('1. Fetching parking spots...');
    const spots = await spotDataService.getParkingSpots(null, 5);
    console.log(`   Found ${spots.length} parking spots`);

    if (spots.length > 0) {
      console.log(`   Sample spot: ${spots[0].name}`);

      // Test 2: Get nearby facilities for first spot
      console.log('\n2. Getting nearby facilities for first spot...');
      const facilities = await spotDataService.getNearbyFacilities(spots[0].lat, spots[0].lng);
      console.log(`   Toilets nearby: ${facilities.toilets ? facilities.toilets.length : 0}`);
      console.log(`   Convenience stores nearby: ${facilities.convenienceStores ? facilities.convenienceStores.length : 0}`);
      console.log(`   Hot springs nearby: ${facilities.hotSprings ? facilities.hotSprings.length : 0}`);

      // Test 3: Calculate score
      console.log('\n3. Calculating AI score...');
      const score = spotDataService.calculateSpotScore(spots[0], facilities);
      console.log(`   Score: ${(score * 10).toFixed(1)}/100`);

      // Test 4: Get top spots
      console.log('\n4. Getting top spots by score...');
      const topSpots = await spotDataService.getTopSpotsByScore(3);
      console.log(`   Top ${topSpots.length} spots:`);
      topSpots.forEach((spot, index) => {
        console.log(`   ${index + 1}. ${spot.name} - Score: ${(spot.score * 10).toFixed(1)}/100`);
      });

      // Test 5: Generate article
      if (topSpots.length > 0) {
        console.log('\n5. Generating article for top spot...');
        const topSpot = topSpots[0];
        const article = articleGenerator.generateArticle(topSpot, null);
        console.log(`   Title: ${article.title}`);
        console.log(`   Content length: ${article.content.length} characters`);
        console.log(`   Tags: ${article.tags.join(', ')}`);

        // Save sample article
        const fs = require('fs').promises;
        const path = require('path');
        const samplePath = path.join(__dirname, 'sample_article.md');
        await fs.writeFile(samplePath, `# ${article.title}\n\n${article.content}`, 'utf8');
        console.log(`   Sample article saved to: ${samplePath}`);
      }

      // Test 6: Image search (without downloading)
      console.log('\n6. Testing image search...');
      const imageData = await imageService.searchWikimediaImages('富山県 道の駅', 1);
      if (imageData && imageData.length > 0) {
        console.log(`   Found image: ${imageData[0].title}`);
        console.log(`   License: ${imageData[0].license}`);
      } else {
        console.log('   No images found');
      }

    } else {
      console.log('No parking spots found - check database connection');
    }

    console.log('\n✅ All tests completed successfully!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

test();