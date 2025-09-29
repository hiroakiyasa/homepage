const cron = require('node-cron');
const spotDataService = require('./spotDataService');
const imageService = require('./imageService');
const articleGenerator = require('./articleGenerator');
const notePublisher = require('./notePublisher');
const fs = require('fs').promises;
const path = require('path');

class CampingSpotPublisher {
  constructor() {
    this.publishedSpotsFile = path.join(__dirname, '..', 'data', 'published_spots.json');
    this.publishedSpots = [];
    this.loadPublishedSpots();
  }

  async loadPublishedSpots() {
    try {
      const data = await fs.readFile(this.publishedSpotsFile, 'utf8');
      this.publishedSpots = JSON.parse(data);
    } catch (error) {
      // File doesn't exist yet, that's okay
      this.publishedSpots = [];
    }
  }

  async savePublishedSpots() {
    try {
      await fs.writeFile(
        this.publishedSpotsFile,
        JSON.stringify(this.publishedSpots, null, 2)
      );
    } catch (error) {
      console.error('Error saving published spots:', error);
    }
  }

  async publishDailySpot() {
    console.log('===================================');
    console.log(`Starting daily publication - ${new Date().toLocaleString('ja-JP')}`);
    console.log('===================================');

    try {
      // Get top spots by AI score
      console.log('1. Fetching top camping spots from database...');
      const topSpots = await spotDataService.getTopSpotsByScore(10);

      if (!topSpots || topSpots.length === 0) {
        console.error('No spots found in database');
        return;
      }

      // Find an unpublished spot
      let selectedSpot = null;
      for (const spot of topSpots) {
        if (!this.publishedSpots.includes(spot.id)) {
          selectedSpot = spot;
          break;
        }
      }

      // If all top spots are published, select a random one
      if (!selectedSpot) {
        console.log('All top spots have been published, selecting from broader list...');
        const allSpots = await spotDataService.getParkingSpots(null, 100);
        const unpublishedSpots = allSpots.filter(s => !this.publishedSpots.includes(s.id));

        if (unpublishedSpots.length > 0) {
          // Get details for a random unpublished spot
          const randomSpot = unpublishedSpots[Math.floor(Math.random() * unpublishedSpots.length)];
          const facilities = await spotDataService.getNearbyFacilities(randomSpot.lat, randomSpot.lng);
          const score = spotDataService.calculateSpotScore(randomSpot, facilities);
          selectedSpot = { ...randomSpot, score, nearbyFacilities: facilities };
        } else {
          console.log('All spots have been published. Resetting publication list.');
          this.publishedSpots = [];
          selectedSpot = topSpots[0];
        }
      }

      console.log(`2. Selected spot: ${selectedSpot.name} (Score: ${(selectedSpot.score * 10).toFixed(1)})`);

      // Get image for the spot
      console.log('3. Searching for appropriate images...');
      const imageData = await imageService.getSpotImage(selectedSpot);

      let imageUrl = null;
      if (imageData) {
        console.log(`   Found image: ${imageData.title}`);
        imageUrl = imageData.url;

        // Try to download and optimize the image
        if (imageUrl) {
          const localImagePath = await imageService.downloadAndOptimizeImage(imageUrl, selectedSpot.name);
          if (localImagePath) {
            console.log(`   Image downloaded and optimized: ${localImagePath}`);
          }
        }
      } else {
        console.log('   No suitable image found, proceeding without image');
      }

      // Generate article
      console.log('4. Generating article content...');
      const article = articleGenerator.generateArticle(selectedSpot, imageUrl);
      console.log(`   Article generated: ${article.title}`);

      // Publish to note
      console.log('5. Publishing to note.com...');
      const published = await notePublisher.publishArticle(article, imageUrl);

      if (published) {
        console.log('   ✅ Article published successfully!');

        // Mark as published
        this.publishedSpots.push(selectedSpot.id);
        await this.savePublishedSpots();

        // Log success
        await this.logPublication({
          spotId: selectedSpot.id,
          spotName: selectedSpot.name,
          articleTitle: article.title,
          publishedAt: new Date().toISOString(),
          noteId: published.id || 'local_draft',
          imageUsed: imageUrl ? true : false
        });
      } else {
        console.log('   ⚠️ Article saved as draft (publishing failed)');
      }

      console.log('===================================');
      console.log('Daily publication completed');
      console.log('===================================\n');

    } catch (error) {
      console.error('Error in daily publication:', error);
      await this.logError(error);
    }
  }

  async logPublication(data) {
    try {
      const logFile = path.join(__dirname, '..', 'logs', 'publications.json');

      // Ensure logs directory exists
      await fs.mkdir(path.dirname(logFile), { recursive: true });

      // Load existing logs
      let logs = [];
      try {
        const existingLogs = await fs.readFile(logFile, 'utf8');
        logs = JSON.parse(existingLogs);
      } catch (error) {
        // File doesn't exist yet
      }

      // Add new log
      logs.push(data);

      // Save logs
      await fs.writeFile(logFile, JSON.stringify(logs, null, 2));
    } catch (error) {
      console.error('Error logging publication:', error);
    }
  }

  async logError(error) {
    try {
      const errorFile = path.join(__dirname, '..', 'logs', 'errors.log');

      // Ensure logs directory exists
      await fs.mkdir(path.dirname(errorFile), { recursive: true });

      const errorLog = `[${new Date().toISOString()}] ${error.message}\n${error.stack}\n\n`;

      await fs.appendFile(errorFile, errorLog);
    } catch (logError) {
      console.error('Error writing to error log:', logError);
    }
  }

  startScheduler() {
    // Get publish time from environment or use defaults
    const publishHour = process.env.PUBLISH_HOUR || 9;
    const publishMinute = process.env.PUBLISH_MINUTE || 0;

    // Schedule daily publication
    const cronExpression = `${publishMinute} ${publishHour} * * *`;
    console.log(`📅 Scheduler started - Will publish daily at ${publishHour}:${String(publishMinute).padStart(2, '0')}`);

    cron.schedule(cronExpression, () => {
      this.publishDailySpot();
    });

    // Also set up a manual trigger for testing
    console.log('To manually trigger publication, press Ctrl+P');
  }

  async testPublish() {
    console.log('\n🧪 TEST MODE - Publishing immediately...\n');
    await this.publishDailySpot();
  }
}

// Main execution
async function main() {
  console.log('🚐 Camping Spot Publisher Starting...\n');

  const publisher = new CampingSpotPublisher();

  // Check command line arguments
  const args = process.argv.slice(2);

  if (args.includes('--test') || args.includes('-t')) {
    // Test mode: publish immediately
    await publisher.testPublish();
  } else if (args.includes('--once') || args.includes('-o')) {
    // One-time mode: publish once and exit
    await publisher.publishDailySpot();
  } else {
    // Normal mode: start scheduler
    publisher.startScheduler();

    // Keep the process running
    console.log('Press Ctrl+C to stop the scheduler\n');

    // Handle manual trigger
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', async (key) => {
      if (key.toString() === '\u0010') { // Ctrl+P
        await publisher.testPublish();
      }
      if (key.toString() === '\u0003') { // Ctrl+C
        process.exit();
      }
    });
  }
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

// Start the application
if (require.main === module) {
  main().catch(console.error);
}

module.exports = CampingSpotPublisher;