#!/usr/bin/env node
// Build area-level parking statistics for the /car-concierge/parking/ landing pages.
//
// Only aggregated numbers are written to the repository (data/parking-areas/areas.json).
// Raw rows (names, rates) stay in the git-ignored .cache/ directory because the rate data is
// partly sourced from third parties and must not be republished on the website.
//
// Usage:
//   1. node scripts/parking-areas/compute-fees.mjs --workdir <dir linked to the Supabase project>
//   2. SUPABASE_URL=... SUPABASE_ANON_KEY=... node scripts/parking-areas/export-stats.mjs
//   3. node scripts/parking-areas/build-pages.mjs
// The Supabase variables are only needed while the raw-row caches are missing.
//
// Fees come from .cache/parking-areas/spot-fees.json, computed by compute-fees.mjs with the same
// server function the app's ranking RPC uses (calculate_parking_fee_v2).

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CACHE_DIR = join(ROOT, '.cache', 'parking-areas');
const OUT_FILE = join(ROOT, 'data', 'parking-areas', 'areas.json');
const MUNICIPALITY_URL =
  'https://raw.githubusercontent.com/smartnews-smri/japan-topography/master/data/municipality/geojson/s0010/N03-21_210101.json';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const MAX_PLAUSIBLE_FEE = 50000;
const MIN_COIN_PARKING = 80;
const MIN_PRICED = 60;

const PREF_SLUGS = {
  '01': 'hokkaido', '02': 'aomori', '03': 'iwate', '04': 'miyagi', '05': 'akita',
  '06': 'yamagata', '07': 'fukushima', '08': 'ibaraki', '09': 'tochigi', '10': 'gunma',
  '11': 'saitama', '12': 'chiba', '13': 'tokyo', '14': 'kanagawa', '15': 'niigata',
  '16': 'toyama', '17': 'ishikawa', '18': 'fukui', '19': 'yamanashi', '20': 'nagano',
  '21': 'gifu', '22': 'shizuoka', '23': 'aichi', '24': 'mie', '25': 'shiga',
  '26': 'kyoto', '27': 'osaka', '28': 'hyogo', '29': 'nara', '30': 'wakayama',
  '31': 'tottori', '32': 'shimane', '33': 'okayama', '34': 'hiroshima', '35': 'yamaguchi',
  '36': 'tokushima', '37': 'kagawa', '38': 'ehime', '39': 'kochi', '40': 'fukuoka',
  '41': 'saga', '42': 'nagasaki', '43': 'kumamoto', '44': 'oita', '45': 'miyazaki',
  '46': 'kagoshima', '47': 'okinawa',
};


const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const writeJson = (path, value) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value));
};

async function cached(name, load) {
  const path = join(CACHE_DIR, name);
  if (existsSync(path)) return readJson(path);
  const value = await load();
  writeJson(path, value);
  return value;
}

async function fetchTable(table, columns) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY are required to refill the cache (anon key only; never the service role key).');
  }
  const headers = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` };
  const rows = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const url = `${SUPABASE_URL}/rest/v1/${table}?select=${columns}&order=id.asc`;
    const res = await fetch(url, { headers: { ...headers, Range: `${from}-${from + pageSize - 1}` } });
    if (!res.ok) throw new Error(`${table} ${res.status}: ${await res.text()}`);
    const page = await res.json();
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

// ---- Geometry -------------------------------------------------------------------------------

function ringContains(ring, x, y) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const polygonContains = (polygon, x, y) =>
  ringContains(polygon[0], x, y) && !polygon.slice(1).some((hole) => ringContains(hole, x, y));

function toArea(feature) {
  const p = feature.properties;
  const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
  const xs = polygons.flatMap((poly) => poly[0].map((c) => c[0]));
  const ys = polygons.flatMap((poly) => poly[0].map((c) => c[1]));
  const isWard = Boolean(p.N03_003 && p.N03_004 && p.N03_004.endsWith('区') && p.N03_003.endsWith('市'));
  return {
    code: p.N03_007,
    pref: p.N03_001,
    prefCode: p.N03_007.slice(0, 2),
    name: isWard ? `${p.N03_003}${p.N03_004}` : p.N03_004,
    shortName: p.N03_004,
    parentCity: isWard ? p.N03_003 : null,
    polygons,
    bbox: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)],
  };
}

function buildLocator(features) {
  const byCode = new Map();
  for (const f of features) {
    if (!f.properties.N03_007 || !f.geometry) continue;
    const area = toArea(f);
    const prev = byCode.get(area.code);
    if (prev) {
      prev.polygons.push(...area.polygons);
      prev.bbox = [
        Math.min(prev.bbox[0], area.bbox[0]), Math.min(prev.bbox[1], area.bbox[1]),
        Math.max(prev.bbox[2], area.bbox[2]), Math.max(prev.bbox[3], area.bbox[3]),
      ];
    } else byCode.set(area.code, area);
  }
  const areas = [...byCode.values()];
  // 0.1-degree grid index of bounding boxes.
  const grid = new Map();
  const key = (gx, gy) => `${gx}:${gy}`;
  for (const a of areas) {
    for (let gx = Math.floor(a.bbox[0] * 10); gx <= Math.floor(a.bbox[2] * 10); gx++)
      for (let gy = Math.floor(a.bbox[1] * 10); gy <= Math.floor(a.bbox[3] * 10); gy++) {
        const k = key(gx, gy);
        if (!grid.has(k)) grid.set(k, []);
        grid.get(k).push(a);
      }
  }
  const locate = (lng, lat) => {
    const candidates = grid.get(key(Math.floor(lng * 10), Math.floor(lat * 10))) ?? [];
    return candidates.find(
      (a) => lng >= a.bbox[0] && lng <= a.bbox[2] && lat >= a.bbox[1] && lat <= a.bbox[3] &&
        a.polygons.some((poly) => polygonContains(poly, lng, lat)),
    ) ?? null;
  };
  return { areas, locate };
}

// ---- Rate features ---------------------------------------------------------------------------

const startHour = (range) => {
  const m = /^(\d{1,2}):?(\d{2})?\s*[～~\-]\s*(\d{1,2})/.exec(range ?? '');
  return m ? { from: Number(m[1]), to: Number(m[3]) } : null;
};

function rateFeatures(rates) {
  const list = Array.isArray(rates) ? rates : [];
  const maxRates = list.filter((r) => r?.type === 'max');
  const hasNightMax = maxRates.some((r) => {
    if (/夜間/.test(r.day_type ?? '')) return true;
    const h = startHour(r.time_range);
    if (!h || (h.from === 0 && h.to === 24)) return false;
    return h.from >= 17 || h.from > h.to;
  });
  return { hasMax: maxRates.length > 0, hasNightMax };
}

// ---- Statistics ------------------------------------------------------------------------------

function quantile(sorted, q) {
  if (!sorted.length) return null;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}
const round10 = (v) => (v == null ? null : Math.round(v / 10) * 10);
const pct = (n, d) => (d ? Math.round((n / d) * 1000) / 10 : null);

function feeStats(values) {
  const sorted = values.filter((v) => Number.isFinite(v) && v > 0 && v <= MAX_PLAUSIBLE_FEE).sort((a, b) => a - b);
  return {
    n: sorted.length,
    median: round10(quantile(sorted, 0.5)),
    p25: round10(quantile(sorted, 0.25)),
    p75: round10(quantile(sorted, 0.75)),
  };
}

// spot-fees.json stores [hour, day, night] per spot id.
const FEE_INDEX = { hour: 0, day: 1, night: 2 };

const HOUR_BUCKETS = [200, 300, 400, 600];
function hourHistogram(values) {
  const counts = new Array(HOUR_BUCKETS.length + 1).fill(0);
  for (const v of values) {
    if (!(v > 0 && v <= MAX_PLAUSIBLE_FEE)) continue;
    const i = HOUR_BUCKETS.findIndex((b) => v <= b);
    counts[i === -1 ? HOUR_BUCKETS.length : i]++;
  }
  return counts;
}

function summarize(spots, fees, extras) {
  const coin = spots.filter((s) => s.type === 'コインパーキング');
  const priced = coin.filter((s) => Array.isArray(s.rates) && s.rates.length);
  const feats = priced.map((s) => rateFeatures(s.rates));
  const values = (k) => priced.map((s) => fees[s.id]?.[FEE_INDEX[k]]).filter((v) => v != null);
  const hour = values('hour');
  const typeCount = (t) => spots.filter((s) => s.type === t).length;
  return {
    coinParking: coin.length,
    priced: priced.length,
    maxShare: pct(feats.filter((f) => f.hasMax).length, priced.length),
    nightMaxCount: feats.filter((f) => f.hasNightMax).length,
    structure: {
      flat: coin.filter((s) => s.structure_type === '平面').length,
      multiStorey: coin.filter((s) => s.structure_type === '自走式立体').length,
      mechanical: coin.filter((s) => ['タワー式', '機械式'].includes(s.structure_type)).length,
    },
    otherSpots: {
      free: typeCount('無料駐車場'),
      rvPark: typeCount('RVパーク'),
      camp: typeCount('キャンプ場'),
      saPa: typeCount('SA/PA'),
    },
    hour: feeStats(hour),
    hourHistogram: hourHistogram(hour),
    day: feeStats(values('day')),
    night: feeStats(values('night')),
    ...extras,
  };
}

// ---- Main -------------------------------------------------------------------------------------

async function main() {
  mkdirSync(CACHE_DIR, { recursive: true });
  const municipalities = await cached('municipalities.json', async () => {
    const res = await fetch(MUNICIPALITY_URL);
    if (!res.ok) throw new Error(`municipality geojson ${res.status}`);
    return res.json();
  });
  const { areas, locate } = buildLocator(municipalities.features);
  console.log(`areas: ${areas.length}`);

  const spots = await cached('parking_spots.json', () => fetchTable('parking_spots', 'id,lat,lng,type,structure_type,rates'));
  const chargers = await cached('charging_stations.json', () => fetchTable('charging_stations', 'id,lat,lng'));
  const michi = await cached('michi_no_eki.json', () => fetchTable('michi_no_eki', 'id,lat,lng'));
  console.log(`spots: ${spots.length}, chargers: ${chargers.length}, michi_no_eki: ${michi.length}`);

  const byArea = new Map();
  const bucket = (code) => {
    if (!byArea.has(code)) byArea.set(code, { spots: [], chargers: 0, michi: 0 });
    return byArea.get(code);
  };
  let unassigned = 0;
  for (const s of spots) {
    const a = Number.isFinite(s.lat) && Number.isFinite(s.lng) ? locate(s.lng, s.lat) : null;
    if (!a) { unassigned++; continue; }
    s.hasRates = Array.isArray(s.rates) && s.rates.length > 0;
    bucket(a.code).spots.push(s);
  }
  for (const c of chargers) { const a = locate(c.lng, c.lat); if (a) bucket(a.code).chargers++; }
  for (const m of michi) { const a = locate(m.lng, m.lat); if (a) bucket(a.code).michi++; }
  console.log(`unassigned spots: ${unassigned}`);

  const areaByCode = new Map(areas.map((a) => [a.code, a]));
  const selected = [...byArea.entries()]
    .map(([code, v]) => ({ area: areaByCode.get(code), ...v }))
    .filter((x) => x.spots.filter((s) => s.type === 'コインパーキング' && s.hasRates).length >= MIN_COIN_PARKING);

  if (process.env.PREVIEW) {
    const counts = [...byArea.values()]
      .map((v) => v.spots.filter((s) => s.type === 'コインパーキング' && s.hasRates).length)
      .sort((a, b) => b - a);
    for (const t of [50, 80, 100, 120, 150, 200]) console.log(`>=${t}: ${counts.filter((c) => c >= t).length}`);
    return;
  }

  const feePath = join(CACHE_DIR, 'spot-fees.json');
  if (!existsSync(feePath)) throw new Error(`${feePath} is missing; run compute-fees.mjs first.`);
  const fees = readJson(feePath);
  const selectedPrefs = new Set(selected.map((x) => x.area.prefCode));

  const prefAgg = new Map();
  for (const [code, v] of byArea) {
    const p = code.slice(0, 2);
    if (!selectedPrefs.has(p)) continue;
    if (!prefAgg.has(p)) prefAgg.set(p, { spots: [], chargers: 0, michi: 0, name: areaByCode.get(code).pref });
    const agg = prefAgg.get(p);
    agg.spots.push(...v.spots);
    agg.chargers += v.chargers;
    agg.michi += v.michi;
  }

  const areaRows = selected
    .map(({ area, spots: s, chargers: c, michi: m }) => ({
      code: area.code,
      prefCode: area.prefCode,
      prefSlug: PREF_SLUGS[area.prefCode],
      pref: area.pref,
      name: area.name,
      parentCity: area.parentCity,
      center: [Math.round(((area.bbox[1] + area.bbox[3]) / 2) * 1e4) / 1e4, Math.round(((area.bbox[0] + area.bbox[2]) / 2) * 1e4) / 1e4],
      stats: summarize(s, fees, { evChargers: c, michiNoEki: m }),
    }))
    .filter((a) => a.stats.hour.n >= MIN_PRICED && a.stats.day.n >= MIN_PRICED)
    .sort((a, b) => a.code.localeCompare(b.code));

  const prefectures = [...prefAgg.entries()]
    .filter(([p]) => areaRows.some((a) => a.prefCode === p))
    .map(([p, agg]) => ({
      prefCode: p,
      prefSlug: PREF_SLUGS[p],
      name: agg.name,
      stats: summarize(agg.spots, fees, { evChargers: agg.chargers, michiNoEki: agg.michi }),
    }))
    .sort((a, b) => a.prefCode.localeCompare(b.prefCode));

  const national = summarize(
    [...byArea.values()].flatMap((v) => v.spots),
    fees,
    {},
  );

  writeJson(OUT_FILE, {
    generatedAt: new Date().toISOString().slice(0, 10),
    definitions: {
      hour: '平日（水曜）12:00〜13:00に1時間停めた場合の料金',
      scenarioDate: '2026-09-16',
      day: '平日（水曜）10:00から24時間停めた場合の料金',
      night: '平日（水曜）18:00〜翌8:00に停めた場合の料金',
      calculation: 'アプリのランキングと同じサーバー関数 calculate_parking_fee_v2 で計算',
      boundaries: '国土数値情報（行政区域データ, N03-21）を smartnews-smri/japan-topography が簡略化したもの',
      thresholds: { minCoinParking: MIN_COIN_PARKING, minPriced: MIN_PRICED },
      hourBuckets: HOUR_BUCKETS,
    },
    national: { hour: national.hour, day: national.day, night: national.night, maxShare: national.maxShare },
    prefectures,
    areas: areaRows,
  });
  console.log(`wrote ${areaRows.length} areas / ${prefectures.length} prefectures → ${OUT_FILE}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
