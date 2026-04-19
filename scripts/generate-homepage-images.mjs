#!/usr/bin/env node
/**
 * Homepage images generator using Cloudflare Workers AI (Flux-1-schnell).
 * Generates Hiace-themed camper van and related imagery for index.html.
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
    out: 'assets/images/unsplash/homepage/campervan-travel.jpg',
    prompt: 'A pristine white Toyota Hiace Super Long camper van parked on a scenic Japanese coastal road at golden hour, Mount Fuji silhouetted in distance, ocean view, warm sunset light, cinematic photography, ultra realistic, 4k, professional travel magazine style',
  },
  {
    out: 'assets/images/unsplash/homepage/mountain-lake.jpg',
    prompt: 'Serene Japanese alpine lake with reflection of snow-capped mountains, dawn mist, lush green pine forest surround, vibrant blue water, peaceful, high-resolution landscape photography, no people, hasselblad style',
  },
  {
    out: 'assets/images/unsplash/homepage/ai-technology.jpg',
    prompt: 'Modern minimalist workspace with sleek laptop showing colorful AI neural network visualization, soft natural window light, potted plants, clean Japanese interior, warm wood desk, cinematic depth of field, professional product photography',
  },
  {
    out: 'assets/images/unsplash/homepage/campervan-diy.jpg',
    prompt: 'Cozy handmade camper van interior of Toyota Hiace, warm wooden cabinetry, bed with pillows, small kitchen counter, string lights glowing, panoramic side window view of Japanese forest, magazine-quality interior photography, golden hour warmth',
  },
  {
    out: 'assets/images/unsplash/homepage/ai-app.jpg',
    prompt: 'Close-up of hand holding modern smartphone displaying beautiful AI chat interface with speech bubbles and soft gradient, blurred Japanese cafe background, warm light, lifestyle tech photography, shallow depth of field, editorial style',
  },
  {
    out: 'assets/images/unsplash/homepage/hiace-maintenance.jpg',
    prompt: 'Clean Toyota Hiace diesel engine bay with visible 1KD-FTV turbo engine, mechanic tools neatly arranged, bright garage lighting, professional automotive maintenance photography, sharp detail, realistic',
  },
  {
    out: 'assets/images/unsplash/homepage/japan-landscape.jpg',
    prompt: 'Iconic Japanese rural landscape with terraced rice fields, traditional farmhouse, cherry blossom trees in full bloom, soft morning mist, distant mountains, colorful nature photography, tourism brochure style',
  },
  {
    out: 'assets/images/unsplash/homepage/mountain-view.jpg',
    prompt: 'Majestic Mount Fuji in full view on a clear blue sky day, perfectly symmetrical snow cap, cherry blossom branches in foreground soft focus, iconic Japan, landscape photograph, ultra-high detail',
  },
  {
    out: 'assets/images/unsplash/homepage/vanlife.jpg',
    prompt: 'White Toyota Hiace camper van with open rear doors revealing cozy bed, parked at Japanese mountain viewpoint at sunset, silhouette of traveler sitting watching view, warm atmospheric lighting, vanlife lifestyle photography',
  },
  {
    out: 'assets/images/unsplash/homepage/sunset-travel.jpg',
    prompt: 'Toyota Hiace camper van silhouette on Japanese coastal highway at dramatic sunset, orange pink gradient sky, ocean in distance, cinematic travel photography, wanderlust, 4k, warm color grading',
  },
  {
    out: 'assets/images/unsplash/homepage/countryside.jpg',
    prompt: 'Wide scenic view of Hokkaido countryside in summer, rolling green hills, vast lavender fields, distant mountains, single white camper van driving on quiet winding road, blue sky with cumulus clouds, aerial landscape photography',
  },
  {
    out: 'assets/images/unsplash/homepage/tech-fallback.jpg',
    prompt: 'Abstract technology background with soft gradient blue and purple, subtle geometric lines, modern minimalist design, high quality render',
  },
];

const SIZES = { width: 1024, height: 1024 };

async function generate({ prompt, out }) {
  const full = path.join(ROOT, out);
  await fs.mkdir(path.dirname(full), { recursive: true });
  console.log(`[gen] ${out}`);
  const body = {
    prompt,
    steps: 6,
    width: SIZES.width,
    height: SIZES.height,
  };
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          'Content-Type': 'application/json',
        },
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
  const filter = process.argv[2];
  const jobs = filter ? JOBS.filter((j) => j.out.includes(filter)) : JOBS;
  console.log(`Generating ${jobs.length} images...`);
  for (const job of jobs) {
    await generate(job);
  }
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
