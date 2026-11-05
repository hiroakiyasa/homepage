import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../assets/js/visitor-counter.js', import.meta.url), 'utf8');

function el(tag) {
  return {
    tag,
    children: [],
    attributes: {},
    events: {},
    parentNode: null,
    appendChild(child) {
      child.parentNode = this;
      this.children.push(child);
    },
    append(...children) { children.forEach((child) => this.appendChild(child)); },
    insertBefore(child, before) {
      const index = this.children.indexOf(before);
      assert.ok(index >= 0);
      child.parentNode = this;
      this.children.splice(index, 0, child);
    },
    setAttribute(name, value) { this.attributes[name] = value; },
    removeAttribute(name) { delete this.attributes[name]; },
    addEventListener(name, callback) { this.events[name] = callback; },
    replaceWith(replacement) {
      const siblings = this.parentNode.children;
      siblings.splice(siblings.indexOf(this), 1, replacement);
      replacement.parentNode = this.parentNode;
    }
  };
}

function descendants(node) {
  return [node, ...node.children.flatMap(descendants)];
}

function execute(path, { lang = 'ja', footer = true, topbar = false, preserved = false, manual = false } = {}) {
  const head = el('head');
  const body = el('body');
  const pageFooter = footer ? el('footer') : null;
  const pageTopbar = topbar ? el('div') : null;
  if (pageTopbar) body.appendChild(pageTopbar);
  if (pageFooter) body.appendChild(pageFooter);
  const document = {
    head,
    body,
    readyState: 'complete',
    documentElement: { lang },
    createElement: el,
    getElementById(id) { return descendants(head).find((node) => node.id === id) ?? null; },
    querySelector(selector) {
      if (selector === '[data-tf-page-views]') {
        return descendants(body).find((node) => node.attributes['data-tf-page-views']) ?? null;
      }
      if (selector === '.tf-preserved-counter img, a.tf-counter img') {
        return preserved || manual ? el('img') : null;
      }
      if (selector === '.topbar') return pageTopbar;
      if (selector === 'footer') return pageFooter;
      return null;
    }
  };
  const window = { location: { pathname: path } };
  const context = { window, document, decodeURI, encodeURIComponent };
  runInNewContext(source, context);
  return { body, head, context, slot: document.querySelector('[data-tf-page-views]'), pageFooter, pageTopbar };
}

function badge(page) {
  assert.ok(page.slot, 'counter appears');
  const link = descendants(page.slot).find((node) => node.tag === 'a');
  const img = descendants(page.slot).find((node) => node.tag === 'img');
  assert.ok(link && img, 'badge includes a link and image');
  return { link, img };
}

test('root shares its historical home counter with /index.html', () => {
  for (const path of ['/', '/index.html']) {
    const page = execute(path);
    assert.equal(page.slot.attributes['data-tf-page-views'], 'home');
    const { link, img } = badge(page);
    assert.equal(link.href, 'https://hits.sh/trailfusionai.com/home/');
    assert.match(img.src, /trailfusionai\.com\/home\.svg\?/);
    assert.equal(img.loading, 'eager');
    assert.equal(img.referrerPolicy, 'no-referrer');
    assert.ok(page.body.children.indexOf(page.slot) < page.body.children.indexOf(page.pageFooter));
  }
});

test('each ordinary page uses its own normalized path, not the homepage count', () => {
  const examples = [
    ['/apps.html', 'apps'],
    ['/quest/', 'quest'],
    ['/quest/index.html', 'quest'],
    ['/en/apps.html', 'en/apps'],
    ['/car-concierge/parking/aichi/toyota/', 'car-concierge/parking/aichi/toyota'],
    ['/%E6%97%A5%E6%9C%AC/index.html', '日本']
  ];
  for (const [path, expected] of examples) {
    const page = execute(path);
    assert.equal(page.slot.attributes['data-tf-page-views'], expected);
    assert.ok(badge(page).img.src.includes(expected === '日本' ? '%E6%97%A5%E6%9C%AC' : expected));
  }
});

test('existing camping and travel badges are never duplicated', () => {
  assert.equal(execute('/camping.html', { preserved: true }).slot, null);
  assert.equal(execute('/travel/story.html', { manual: true }).slot, null);
});

test('fullscreen route map places the compact badge in the top bar', () => {
  const page = execute('/drive-routes/index.html', { topbar: true });
  assert.equal(page.slot.attributes['data-tf-page-views'], 'drive-routes');
  assert.equal(page.slot.parentNode, page.pageTopbar);
});

test('English accessibility and a graceful image error', () => {
  const page = execute('/en/', { lang: 'en' });
  const { link, img } = badge(page);
  assert.match(link.attributes['aria-label'], /Total page views/);
  assert.equal(img.alt, 'Page views');
  img.events.error();
  assert.equal(link.attributes.href, undefined);
  assert.equal(link.children[1].textContent, 'Views unavailable');
  runInNewContext(source, page.context);
  assert.equal(descendants(page.body).filter((node) => node.attributes['data-tf-page-views']).length, 1);
});
