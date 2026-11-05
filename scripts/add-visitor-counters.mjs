#!/usr/bin/env node
/* Ensure every real HTML page loads the shared page-view counter.
 * Usage: node scripts/add-visitor-counters.mjs --write  (after page generators)
 *        node scripts/add-visitor-counters.mjs --check  (CI, never edits files)
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = '<script defer src="/assets/js/visitor-counter.js"></script>';
const SCRIPT_RE = /<script\b[^>]*\bsrc=["'][^"']*visitor-counter\.js(?:\?[^"']*)?["'][^>]*>/i;
const SKIP_DIRS = new Set(['.git', 'node_modules', 'archive', 'output', 'dist', 'build', '.cache']);
const args = process.argv.slice(2);
if (args.length !== 1 || !['--check', '--write'].includes(args[0])) {
  console.error('Usage: node scripts/add-visitor-counters.mjs --check|--write');
  process.exit(2);
}
const write = args[0] === '--write';

function* htmlFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) yield* htmlFiles(join(dir, entry.name));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      yield join(dir, entry.name);
    }
  }
}

let covered = 0;
let skipped = 0;
let changed = 0;
const missing = [];
for (const path of htmlFiles(ROOT)) {
  const rel = relative(ROOT, path).replaceAll('\\', '/');
  const source = readFileSync(path, 'utf8');
  // Error and immediate redirect pages aren't viewed as standalone content.
  if (rel === '404.html' || /<meta\b[^>]*http-equiv=["']?refresh\b/i.test(source)) {
    skipped++;
    continue;
  }
  if (!/<\/body\s*>/i.test(source)) throw new Error(`${rel}: missing </body>`);
  covered++;
  if (SCRIPT_RE.test(source)) continue;
  missing.push(rel);
  if (write) {
    writeFileSync(path, source.replace(/<\/body\s*>/i, `${SCRIPT}</body>`));
    changed++;
  }
}
console.log(`Page-view counter: ${covered} content pages, ${skipped} redirects/error pages, ${write ? changed + ' updated' : missing.length + ' missing'}.`);
if (!write && missing.length) {
  console.error(missing.slice(0, 25).join('\n'));
  process.exit(1);
}
