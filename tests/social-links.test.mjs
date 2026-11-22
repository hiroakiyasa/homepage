import test from 'node:test';
import assert from 'node:assert/strict';
import { installSocialLinks, shouldSkip, SOCIALS } from '../scripts/add-social-links.mjs';

const sample = (header = '<header class="br-header">Menu</header>',
                footer = '<footer class="br-footer">Contact</footer>') =>
  '<!doctype html><html lang="ja"><head><title>Sample</title></head>' +
  '<body>' + header + '<main>Content</main>' + footer + '</body></html>';

test('all five official links are directly accessible in a quick menu and in the footer', () => {
  const original = sample();
  const actual = installSocialLinks(original);
  assert.notEqual(actual, original);
  assert.match(actual, /data-tf-social-styles/);
  assert.match(actual, /<details class="tf-social-quick"/);
  assert.match(actual, /<nav class="tf-social-footer"/);
  assert.match(actual, /target="_blank" rel="noopener noreferrer"/);
  assert.match(actual, /aria-label="公式SNSリンクを表示"/);
  for (const [label, id, url] of SOCIALS) {
    assert.equal(actual.split(`href="${url}"`).length - 1, 2, label);
    assert.equal(actual.split(`data-platform="${id}"`).length - 1, 2, label);
  }
  assert.equal(installSocialLinks(actual), actual, 'injection must be idempotent');
  assert.ok(actual.indexOf('tf-social-quick:start') > actual.indexOf('</header>'));
  assert.ok(actual.indexOf('tf-social-footer:start') < actual.indexOf('</footer>'));
});

test('pages without a site header or footer still get social navigation', () => {
  const actual = installSocialLinks(sample('', ''));
  assert.match(actual, /<body><!\-\- tf-social-quick:start/);
  assert.match(actual, /<footer class="tf-social-standalone-footer"/);
  assert.match(actual, /Instagram/);
  assert.equal(installSocialLinks(actual), actual);
});

test('partial installations are rejected rather than silently duplicated', () => {
  assert.throws(() => installSocialLinks(sample() + '<span data-tf-social-quick>'), /Partial/);
});

test('installed links must still point to verified accounts on both navigation surfaces', () => {
  const valid = installSocialLinks(sample());
  const tampered = valid.replace('https://www.tiktok.com/@trailfusionai', 'https://www.tiktok.com/@somebody-else');
  assert.throws(() => installSocialLinks(tampered), /incorrect destination: TikTok/);
});

test('redirects and error pages are excluded from the public content-page contract', () => {
  assert.equal(shouldSkip('404.html', sample()), true);
  assert.equal(shouldSkip('diy/index.html', '<meta http-equiv="refresh" content="0;url=/camping.html">'), true);
  assert.equal(shouldSkip('about/index.html', sample()), false);
});
