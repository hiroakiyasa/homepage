#!/usr/bin/env node
/**
 * Apps.html signature mood images generator (Cloudflare Workers AI / Flux).
 * One hero-style illustration per app to give each section a unique personality.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
if (!ACCOUNT_ID || !TOKEN) {
  console.error('Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN env vars.');
  process.exit(1);
}
const MODEL = '@cf/black-forest-labs/flux-1-schnell';
const ENDPOINT = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/${MODEL}`;
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

const JOBS = [
  {
    out: 'assets/images/ai/app-gp-teachers-hero.jpg',
    prompt: 'Warm friendly illustration of a cheerful AI English teacher avatar with glasses, smiling in a cozy virtual classroom, speech bubbles with letters and words floating around, soft pastel blue and yellow color palette, editorial magazine illustration style, chunky bold outlines, neo-brutalist, playful',
  },
  {
    out: 'assets/images/ai/app-wood-golem-hero.jpg',
    prompt: 'Cute wooden forest creature character in a magical enchanted pine forest, warm golden sunlight rays, mushrooms and puzzle sticks scattered around, whimsical storybook illustration style, vibrant greens and warm browns, hand-drawn feel with thick outlines, playful adventure vibe',
  },
  {
    out: 'assets/images/ai/app-voicelink-hero.jpg',
    prompt: 'Two people of different nationalities smiling and talking, vibrant colorful sound waves and speech bubbles with multiple languages flowing between them, purple pink and blue gradient background, modern flat illustration, neo-brutalist thick outlines, global connection vibe',
  },
  {
    out: 'assets/images/ai/app-word-blaster-hero.jpg',
    prompt: 'Retro arcade space shooter scene, cute spaceship shooting at English letter-shaped asteroids in a neon cosmic galaxy, amber orange and deep purple gradient, pixel-art-inspired illustration with clean bold outlines, energetic and playful, 80s arcade aesthetic',
  },
  {
    out: 'assets/images/ai/app-debate-master-hero.jpg',
    prompt: 'Two stylized silhouettes facing each other with dynamic speech bubbles filled with words and counterarguments, dramatic red orange and navy blue gradient backdrop, bold editorial illustration, thick neo-brutalist outlines, rhetoric chess pieces scattered, thoughtful mood',
  },
  {
    out: 'assets/images/ai/app-hacking-timer-hero.jpg',
    prompt: 'Close-up of a wrist wearing an Apple Watch showing a circular timer interface, with a blurred person working at a clean modern desk in the background, indigo and gray monochrome minimalist palette, magazine-quality product photography, focused productivity vibe',
  },
];

const SIZES = { width: 1024, height: 1024 };

async function generate({ prompt, out }) {
  const full = path.join(ROOT, out);
  await fs.mkdir(path.dirname(full), { recursive: true });
  console.log(`[gen] ${out}`);
  const body = { prompt, steps: 6, width: SIZES.width, height: SIZES.height };
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${await res.text()}`);
      const json = await res.json();
      const b64 = json?.result?.image;
      if (!b64) throw new Error(`no image: ${JSON.stringify(json).slice(0, 200)}`);
      await fs.writeFile(full, Buffer.from(b64, 'base64'));
      const stat = await fs.stat(full);
      console.log(`  ✓ ${out} (${(stat.size / 1024).toFixed(1)} KB)`);
      return;
    } catch (err) {
      console.error(`  ! attempt ${attempt} failed: ${err.message}`);
      if (attempt === 3) throw err;
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
}

async function main() {
  console.log(`Generating ${JOBS.length} app mood images...`);
  for (const job of JOBS) await generate(job);
  console.log('Done.');
}

main().catch((e) => { console.error(e); process.exit(1); });
