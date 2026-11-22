#!/usr/bin/env node
/**
 * Place static, keyboard-accessible links to TrailFusion AI's five official social
 * profiles on every browsable HTML page. The quick menu stays visible while
 * scrolling; each page also has directly clickable links in its footer.
 *
 * Usage:
 *   node scripts/add-social-links.mjs --write
 *   node scripts/add-social-links.mjs --check
 *
 * Like add-visitor-counters.mjs, immediate redirects and 404 aren't content pages.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SKIP_DIRS = new Set(['.git', 'node_modules', 'archive', 'output', 'dist', 'build', '.cache', '.venv', 'reports']);
export const SOCIALS = Object.freeze([
  ['Instagram', 'instagram', 'https://www.instagram.com/trailfusionai/'],
  ['Threads', 'threads', 'https://www.threads.com/@shevchenkofun'],
  ['X', 'x', 'https://x.com/trailfusionai'],
  ['YouTube', 'youtube', 'https://www.youtube.com/@VAN_OASIS'],
  ['TikTok', 'tiktok', 'https://www.tiktok.com/@trailfusionai'],
]);
const CSS = '<link rel="stylesheet" href="/assets/css/social-nav.css?v=20261122" data-tf-social-styles>';
const external = ([label, id, href]) =>
  `<a class="tf-social-link" data-platform="${id}" href="${href}" target="_blank" rel="noopener noreferrer" aria-label="${label}の公式プロフィールを新しいタブで開く">${label}</a>`;
const socialLinks = SOCIALS.map(external).join('');
const QUICK = '<!-- tf-social-quick:start -->' +
  '<details class="tf-social-quick" data-tf-social-quick>' +
  '<summary aria-label="公式SNSリンクを表示">SNS</summary>' +
  '<nav aria-label="TrailFusion AIの公式SNS">' + socialLinks + '</nav>' +
  '</details><!-- tf-social-quick:end -->';
const FOOTER = '<!-- tf-social-footer:start -->' +
  '<nav class="tf-social-footer" aria-label="TrailFusion AI公式SNS一覧">' +
  '<span class="tf-social-heading">公式SNS</span>' + socialLinks +
  '</nav><!-- tf-social-footer:end -->';

export function shouldSkip(rel, source) {
  return rel === '404.html' || /<meta\b[^>]*http-equiv=["']?refresh\b/i.test(source);
}

export function installSocialLinks(source) {
  const complete = [source.includes('data-tf-social-styles'),
                    source.includes('data-tf-social-quick'),
                    source.includes('class="tf-social-footer"')];
  if (complete.every(Boolean)) {
    const quick = source.match(/<!-- tf-social-quick:start -->([\s\S]*?)<!-- tf-social-quick:end -->/);
    const footer = source.match(/<!-- tf-social-footer:start -->([\s\S]*?)<!-- tf-social-footer:end -->/);
    if (!quick || !footer) throw new Error('Official social navigation markers missing');
    for (const [label, id, url] of SOCIALS) {
      const link = external([label, id, url]);
      if (!quick[1].includes(link) || !footer[1].includes(link)) {
        throw new Error('Official social navigation has an incorrect destination: ' + label);
      }
    }
    return source;
  }
  if (complete.some(Boolean)) throw new Error('Partial or inconsistent social-link installation');
  if (!/<\/head\s*>/i.test(source) || !/<body\b/i.test(source) || !/<\/body\s*>/i.test(source)) {
    throw new Error('HTML must have head, body and closing body');
  }

  let out = source.replace(/<\/head\s*>/i, CSS + '</head>');
  const top = /<header\b[^>]*>[\s\S]*?<\/header\s*>/i;
  if (top.test(out)) {
    out = out.replace(top, match => match + QUICK);
  } else {
    out = out.replace(/<body\b[^>]*>/i, match => match + QUICK);
  }

  const lastFooter = [...out.matchAll(/<\/footer\s*>/gi)].at(-1);
  if (lastFooter) {
    const index = lastFooter.index;
    out = out.slice(0, index) + FOOTER + out.slice(index);
  } else {
    out = out.replace(/<\/body\s*>/i,
      '<footer class="tf-social-standalone-footer">' + FOOTER + '</footer></body>');
  }
  return out;
}

function* htmlFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) yield* htmlFiles(join(dir, entry.name));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      yield join(dir, entry.name);
    }
  }
}

function main() {
  const mode = process.argv[2];
  if (process.argv.length !== 3 || !['--check', '--write'].includes(mode)) {
    console.error('Usage: node scripts/add-social-links.mjs --check|--write');
    process.exit(2);
  }
  const write = mode === '--write';
  let covered = 0, skipped = 0, changed = 0;
  const missing = [];
  for (const path of htmlFiles(ROOT)) {
    const rel = relative(ROOT, path).replaceAll('\\', '/');
    const source = readFileSync(path, 'utf8');
    if (shouldSkip(rel, source)) { skipped++; continue; }
    covered++;
    let expected;
    try { expected = installSocialLinks(source); }
    catch (error) { throw new Error(`${rel}: ${error.message}`); }
    if (expected === source) continue;
    if (write) { writeFileSync(path, expected); changed++; }
    else missing.push(rel);
  }
  console.log(`Official social navigation: ${covered} content pages, ${skipped} skipped redirects/errors, ${write ? changed + ' updated' : missing.length + ' missing'}.`);
  if (!write && missing.length) {
    console.error(missing.slice(0, 25).join('\n'));
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
