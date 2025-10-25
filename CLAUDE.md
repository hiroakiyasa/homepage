# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **車中泊スポット自動投稿システム** (Car Camping Spot Auto-Publisher) that generates HTML pages for parking spots and camping locations across Japan. It fetches data from Supabase, integrates restaurant data from Tabelog, and creates interactive maps with Leaflet.js.

## Common Commands

### HTML Generation
```bash
# Generate index page with all region markers
npm run generate-index

# Generate all region pages with parking and restaurant data
node generate-from-json-sources.js

# Test with 5 locations only
node generate-from-json-sources.js --test

# Generate specific region pages
npm run generate-all-regions-full
npm run test-region-full  # Test mode
```

### Region-Specific Generation
```bash
# Otaru (小樽) pages
npm run update-otaru
npm run generate-otaru-html
npm run generate-otaru-map

# Omoromachi (おもろまち) pages
npm run omoromachi-all  # All-in-one: update + map + html
```

### Data Management
```bash
# Extract region data from Supabase
npm run extract-regions

# Build complete index
npm run build-index  # extract-regions + generate-index
```

### Note.com Auto-Publishing (Legacy)
```bash
npm start              # Daily auto-publish mode
npm test               # Immediate test publish
npm run publish-once   # Single publish and exit
```

## Architecture

### Data Flow

1. **Source Data**
   - `all-restaurant-spots.json`: 1,154 restaurant locations
   - `regions-data.backup-2025-10-24T15-58-43-523Z.json`: 339 region locations
   - `★all-restaurants-with-ids.json`: 18,345 restaurant details from Tabelog
   - Supabase RPC: `get_parking_spots_sorted_by_fee` for parking data

2. **Generation Pipeline**
   - Load region coordinates from JSON sources
   - Query Supabase for parking spots within radius
   - Search for restaurants within 500m (from area-specific files or global dataset)
   - Generate main HTML + map HTML for each region
   - Save to `data/regions/` folder

3. **Output Structure**
   ```
   data/
   ├── index.html           # Japan map with all markers
   ├── regions/             # Individual region pages
   │   ├── 銀座.html
   │   ├── 銀座-map.html
   │   ├── 新宿.html
   │   └── ...
   └── parking-spots/       # Temporary folder (now merged into regions/)
   ```

### Key Scripts

#### `generate-from-json-sources.js`
Master script for bulk HTML generation. Loads data from two JSON sources, checks for restaurant data in three locations (area files, top5 files, or global dataset), and generates HTML pages for regions with parking data.

**Restaurant Data Priority:**
1. `/Users/user/WebApp/camping_note/restaurants_data/area_${fileName}.json`
2. `/Users/user/WebApp/camping_note/restaurants_data_top5/top5_${fileName}.json`
3. `★all-restaurants-with-ids.json` (fallback for 843 regions without dedicated files)

#### `generate-index-html.js`
Creates the main index page with:
- Leaflet.js map of Japan
- Color-coded markers by elevation (blue=0m, red=1000m+)
- Clickable markers linking to region pages
- Fuji mountain background image from Wikimedia Commons

#### `generate-all-regions-full.js`
Original full-featured region generator with:
- WordPress-style HTML output
- Restaurant recommendations (top 5, score-sorted, randomly shuffled)
- Parking spot details with fee calculations
- Nearby facilities (convenience stores, toilets, hot springs)
- Interactive embedded maps

### Supabase Integration

**Connection:**
```javascript
const supabase = require('./src/supabaseClient');
```

**Key RPC:**
```javascript
const { data, error } = await supabase.rpc('get_parking_spots_sorted_by_fee', {
  center_lat: lat,
  center_lng: lng,
  radius_meters: 3000
});
```

Returns parking spots sorted by overnight fee (18:00-08:00), with calculated fees from:
- `max_rate_24h` (最大料金)
- `night_rate` (夜間料金)
- `rate_per_hour` (時間料金)

### HTML Generation Patterns

#### File Naming
Always sanitize file names:
```javascript
const fileName = (region.fileName || region.name).replace(/[\/\\:*?"<>|]/g, '_');
```

#### Dual HTML Output
Each region generates two files:
- `${fileName}.html` - Main content page
- `${fileName}-map.html` - Embedded interactive map

#### Restaurant Section
When restaurant data exists:
- Show top 5 restaurants within 500m
- Sort by score, then randomize for variety
- Display: name, genre, address, Google Maps/Search links
- Number markers 1-5 for easy reference

#### Parking Section
- Calculate 14-hour overnight fee (18:00-08:00)
- Show nearby facilities within 300m (convenience stores, toilets)
- Show hot springs within 2km
- Include walking time calculations (80m/min)

### Environment Variables

Required in `.env`:
```
SUPABASE_URL=              # Supabase project URL
SUPABASE_ANON_KEY=         # Supabase anonymous key
NOTE_EMAIL=                # (Optional) note.com credentials
NOTE_PASSWORD=             # (Optional)
NOTE_USER_ID=              # (Optional)
PUBLISH_HOUR=9             # Auto-publish time
PUBLISH_MINUTE=0
```

## Data Structures

### Region Object
```javascript
{
  name: "銀座",              // Display name
  lat: 35.6717,             // Latitude
  lng: 139.7647,            // Longitude
  fileName: "銀座",          // Used for HTML file name
  restaurantCount: 150,     // (Optional)
  elevation: 5              // Meters above sea level
}
```

### Restaurant Object (from Tabelog)
```javascript
{
  id: 1,
  name: "さわ田",
  score: 4.71,
  genre: "寿司",
  latitude: 35.68193,
  longitude: 139.78492,
  address: "東京都中央区...",
  dinnerBudget: "￥40,000～￥49,999"
}
```

### Parking Spot Object (from Supabase)
```javascript
{
  name: "タイムズ銀座",
  latitude: 35.6717,
  longitude: 139.7647,
  overnight_fee: 1500,      // Calculated 14-hour fee
  max_rate_24h: 2000,
  night_rate: 800,
  rate_per_hour: 400,
  business_hours: "24時間"
}
```

## Important Patterns

### Handling Missing Data
- **No parking data**: Skip region entirely (179 regions skipped)
- **No restaurant data**: Falls back to global dataset (★all-restaurants-with-ids.json)
- **No specific amenity**: Show "なし" or omit section

### Distance Calculations
Uses `geolib` library:
```javascript
const distance = geolib.getDistance(
  { latitude: regionLat, longitude: regionLng },
  { latitude: facilityLat, longitude: facilityLng }
);
```

### Progress Tracking
All bulk operations show progress bars:
```javascript
showProgress(currentIndex + 1, totalCount, regionName);
```

### API Rate Limiting
Add delays between Supabase calls:
```javascript
await new Promise(resolve => setTimeout(resolve, 200)); // 200ms delay
```

## Known Issues & Solutions

### Issue: 843 Regions Failed (No Restaurant Data)
**Solution:** Modified to search global dataset (★all-restaurants-with-ids.json) as fallback.

### Issue: Duplicate Regions
**Solution:** Use Map with composite key:
```javascript
const key = `${spot.name}_${spot.latitude}_${spot.longitude}`;
```

### Issue: File Name Conflicts
**Solution:** Sanitize all special characters before saving:
```javascript
.replace(/[\/\\:*?"<>|]/g, '_')
```

### Issue: 179 Regions Skipped
**Cause:** No parking data in Supabase for these coordinates (e.g., 北新地, 西梅田, 博多).
**Not fixable** without adding parking data to database.

## File Organization

- `src/` - Core services (Supabase client, data fetchers, note.com publisher)
- `data/regions/` - Generated HTML pages (1,352 files + maps)
- `images/convenience_store_logos/` - Logo files for 6 convenience store chains
- `logs/` - Publication history and error logs
- Root `*.js` files - Generation scripts and utilities
- `*.md` files - Documentation and specifications

## Notes for Future Development

- Restaurant data is split across multiple folders; consider consolidating
- Consider caching Supabase results to reduce API calls
- The elevation color-coding system expects 0-1000m range
- WordPress HTML output is in the `-full.js` scripts; standard output is simpler
- Index page uses different styling than region pages (intentionally)
