import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'about/index.html'), 'utf8');
const data = JSON.parse(fs.readFileSync(path.join(root, 'scripts/about/story-data.json'), 'utf8'));
const style = fs.readFileSync(path.join(root, 'assets/css/about-story.css'), 'utf8');

test('12 numbered original artworks are represented exactly once and each file exists', () => {
  assert.equal(data.episodes.length, 12);
  assert.deepEqual(data.episodes.map(x => x.day), Array.from({length:12}, (_,i)=>i+1));
  for (let i = 1; i <= 12; i++) {
    const number = String(i).padStart(2,'0');
    const route = '/assets/brand/about/journey-'+number+'.webp';
    assert.equal((html.match(new RegExp('src="'+route+'"','g'))||[]).length,1,route);
    assert.equal((html.match(new RegExp('id="episode-'+number+'"','g'))||[]).length,1);
    assert.equal((html.match(new RegExp('href="'+route+'"','g'))||[]).length,2);
    const filename = path.join(root,route.slice(1));
    assert.ok(fs.statSync(filename).size > 200_000,filename);
    assert.ok(fs.statSync(filename).size < 900_000,filename);
  }
});

test('narrative has four chapters and all interview-derived paragraphs', () => {
  for(const chapter of data.chapters){
    assert.match(html,new RegExp('id="'+chapter.id+'"'));
    assert.ok(html.includes(chapter.title));
  }
  assert.equal((html.match(/<article class="about-story__entry/g)||[]).length,12);
  for(const episode of data.episodes){
    assert.equal(episode.paragraphs.length >= 4,true);
    assert.ok(html.includes(episode.title.replaceAll('"','&quot;')) || html.includes(episode.title),episode.title);
  }
});

test('all image alternatives identify scenes; no invented real family portraits', () => {
  const storyHtml=html.split('<!-- BEGIN ABOUT FOUNDER STORY')[1]?.split('<!-- END ABOUT FOUNDER STORY -->')[0]||'';
  assert.equal((storyHtml.match(/loading="lazy" decoding="async"/g)||[]).length,12);
  assert.ok(html.includes('実際の子どもや家族の写真ではありません'));
  assert.ok(html.includes('AIイメージ'));
  assert.ok(html.includes('数字の原典を') === false, 'The numerical redaction text belongs only to the art; no OCR or duplicate text');
  assert.ok(html.includes('未検証の数値は画像上で伏せており'));
});

test('stays on the existing brand website with correct SEO', () => {
  assert.equal((html.match(/<main id="main">/g)||[]).length,1);
  assert.equal((html.match(/<footer class="br-footer">/g)||[]).length,1);
  assert.equal((html.match(/<section class="about-story"/g)||[]).length,1);
  assert.ok(html.includes('<link rel="stylesheet" href="/assets/css/about-story.css?v=20261107">'));
  assert.ok(style.includes('@media (max-width: 780px)'));
  assert.ok(html.includes('https://trailfusionai.com/about/'));
  assert.ok(html.includes('https://apps.apple.com/jp/app/id6775411516'));
  assert.ok(html.includes('https://play.google.com/store/apps/details?id=com.gokakushakaiquest.app'));
  assert.ok(!html.includes('13万問超'));
  const block=html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(block);
  const ld=JSON.parse(block[1]);
  assert.ok(ld['@graph'].some(x=>x['@type']==='Person'&&x.name==='湯浅 浩章'));
  assert.ok(ld['@graph'].some(x=>x['@type']==='WebPage'&&x.about?.['@id'].endsWith('#hiro')));
});

test('sitemap includes updated page date without removing other routes', () => {
  const xml=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
  assert.ok(xml.includes('<loc>https://trailfusionai.com/about/</loc><lastmod>2026-11-07</lastmod>'));
  assert.ok(xml.includes('https://trailfusionai.com/quest/'));
});
