#!/usr/bin/env node
// Compute representative fees for every coin parking with the app's own server function
// (calculate_parking_fee_v2, the one used by get_parking_spots_sorted_by_fee).
//
// Runs read-only SELECTs through the Supabase CLI (`supabase db query --linked`), so it needs a
// logged-in CLI linked to the project. Results go to the git-ignored cache only:
//   .cache/parking-areas/spot-fees.json   { "<spot id>": [hour, day, night] }
//
// Usage: node scripts/parking-areas/compute-fees.mjs [--workdir <dir with supabase/ linked>]

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(ROOT, '.cache', 'parking-areas', 'spot-fees.json');
const workdirIndex = process.argv.indexOf('--workdir');
const WORKDIR = workdirIndex > -1 ? process.argv[workdirIndex + 1] : process.cwd();
const BATCH_IDS = 2500;
const PARALLEL = 2;

// Keep in sync with SCENARIOS in export-stats.mjs.
const FEE_COLUMNS = [
  "calculate_parking_fee_v2(rates,'2026-09-16T12:00:00+09:00',60) h",
  "calculate_parking_fee_v2(rates,'2026-09-16T10:00:00+09:00',1440) d",
  "calculate_parking_fee_v2(rates,'2026-09-16T18:00:00+09:00',840) n",
].join(', ');
const COIN_FILTER =
  "type='コインパーキング' and jsonb_typeof(rates)='array' and jsonb_array_length(rates)>0";

async function query(sql) {
  const { stdout } = await run('npx', ['supabase', 'db', 'query', '--linked', '-o', 'json', sql], {
    cwd: WORKDIR,
    maxBuffer: 256 * 1024 * 1024,
  });
  return JSON.parse(stdout.slice(stdout.indexOf('{'))).rows;
}

async function main() {
  mkdirSync(dirname(OUT), { recursive: true });
  const fees = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};
  const [{ lo, hi }] = await query(`select min(id) lo, max(id) hi from parking_spots where ${COIN_FILTER}`);
  const ranges = [];
  for (let start = lo; start <= hi; start += BATCH_IDS) ranges.push([start, start + BATCH_IDS - 1]);
  const pending = ranges.filter(([a, b]) => !fees[`range:${a}-${b}`]);
  console.log(`id ${lo}..${hi}: ${ranges.length} batches, ${pending.length} pending`);

  const worker = async () => {
    while (pending.length) {
      const [a, b] = pending.shift();
      const rows = await query(
        `select id, ${FEE_COLUMNS} from parking_spots where ${COIN_FILTER} and id between ${a} and ${b}`,
      );
      for (const r of rows) fees[r.id] = [r.h, r.d, r.n];
      fees[`range:${a}-${b}`] = true;
      writeFileSync(OUT, JSON.stringify(fees));
      console.log(`  ${a}-${b}: ${rows.length} rows (${pending.length} left)`);
    }
  };
  await Promise.all(Array.from({ length: PARALLEL }, worker));
  console.log('done');
}

main().catch((e) => {
  console.error(e.stderr || e);
  process.exit(1);
});
