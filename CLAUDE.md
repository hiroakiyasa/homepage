# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**車中泊スポット自動投稿システム** (Car Camping Spot Auto-Publisher) - Generates static HTML pages for parking spots and camping locations across Japan. Fetches data from Supabase, integrates restaurant data from Tabelog, and creates interactive maps with Leaflet.js. Deployed to GitHub Pages.

## Common Commands

```bash
# Generate all region pages from JSON sources (main generation script)
node generate-from-json-sources.js
node generate-from-json-sources.js --test  # Test with 5 locations

# Generate index page with Japan map
npm run generate-index

# Full generation pipeline
npm run generate-all-regions-full
npm run test-region-full  # Test mode

# Update rankings (also runs daily via GitHub Actions)
npm run generate-rankings

# Extract region data from Supabase
npm run extract-regions
npm run build-index  # extract-regions + generate-index

# Region-specific (example: Omoromachi)
npm run omoromachi-all  # All-in-one: update + map + html

# Legacy note.com auto-publishing
npm start              # Daily auto-publish mode
npm run publish-once   # Single publish
```

## Architecture

### Data Flow

1. **Source Data**
   - `all-restaurant-spots.json`: Restaurant locations
   - `regions-data.backup-*.json`: Region locations
   - `★all-restaurants-with-ids.json`: Tabelog restaurant details (fallback)
   - Supabase RPC `get_parking_spots_sorted_by_fee`: Parking data

2. **Generation Pipeline**
   - Load region coordinates from JSON
   - Query Supabase for parking spots within radius
   - Search restaurants within 500m
   - Generate main HTML + map HTML per region
   - Output to `data/regions/`

3. **Restaurant Data Priority** (checked in order):
   - `../camping_note/restaurants_data/area_${fileName}.json`
   - `../camping_note/restaurants_data_top5/top5_${fileName}.json`
   - `★all-restaurants-with-ids.json` (global fallback)

### Key Scripts

| Script | Purpose |
|--------|---------|
| `generate-from-json-sources.js` | Master bulk HTML generator |
| `generate-index-html.js` | Japan map with color-coded markers |
| `generate-all-regions-full.js` | WordPress-style full-featured output |
| `generate-rankings.js` | Daily rankings update |

### Output Structure

```
data/
├── index.html           # Japan map with all markers
└── regions/             # Individual region pages
    ├── {region}.html
    └── {region}-map.html
```

## Supabase Integration

```javascript
const supabase = require('./src/supabaseClient');

// Key RPC for parking spots sorted by overnight fee (18:00-08:00)
const { data } = await supabase.rpc('get_parking_spots_sorted_by_fee', {
  center_lat: lat,
  center_lng: lng,
  radius_meters: 3000
});
```

Overnight fee calculated from: `max_rate_24h`, `night_rate`, or `rate_per_hour`

## CI/CD

- **Deploy to GitHub Pages** (`.github/workflows/deploy.yml`): Auto-deploys on push to main/master
- **Update Rankings Daily** (`.github/workflows/update-rankings.yml`): Runs at JST 9:00 (UTC 0:00)

**Required GitHub Secrets:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`

## Key Patterns

### File Naming
Always sanitize: `.replace(/[\/\\:*?"<>|]/g, '_')`

### Dual HTML Output
Each region generates `{fileName}.html` (content) + `{fileName}-map.html` (interactive map)

### Distance Calculations
Uses `geolib.getDistance()` - restaurants within 500m, facilities within 300m, hot springs within 2km

### API Rate Limiting
Add 200ms delay between Supabase calls in bulk operations

### Missing Data Handling
- No parking data: Skip region entirely
- No restaurant data: Falls back to global dataset
- No amenity: Show "なし" or omit section

## Environment Variables

```
SUPABASE_URL=              # Required
SUPABASE_ANON_KEY=         # Required
NOTE_EMAIL=                # Optional: note.com credentials
NOTE_PASSWORD=
NOTE_USER_ID=
PUBLISH_HOUR=9             # Auto-publish time
PUBLISH_MINUTE=0
```

## File Organization

- `src/` - Core services (Supabase client, data fetchers, note.com publisher)
- `data/regions/` - Generated HTML pages
- `camping_note/` - Rankings and camping-related static files
- `images/` - Convenience store logos
- Root `*.js` - Generation scripts and utilities
