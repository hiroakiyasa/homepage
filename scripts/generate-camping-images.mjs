#!/usr/bin/env node
/**
 * Generate premium illustrations for camping.html via Cloudflare Workers AI (flux-1-schnell)
 * Outputs JPEG files into assets/images/camper/ai/
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
if (!ACCOUNT_ID || !API_TOKEN) {
  console.error('Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN before running.');
  process.exit(1);
}
const MODEL = '@cf/black-forest-labs/flux-1-schnell';
const OUT_DIR = path.resolve('assets/images/camper/ai');

// Premium editorial style prefix used for every image to keep a unified look
const STYLE = 'premium editorial photography, cinematic, high dynamic range, ultra detailed, shallow depth of field, warm natural lighting, magazine cover quality, photorealistic, 8k';

const images = [
  {
    name: 'hero-camper-sunset.jpg',
    prompt: `Cinematic hero shot of a matte black Toyota HiAce camper van parked on a wooden deck beside a serene Japanese mountain lake at golden hour, Mount Fuji blurred in the distance, atmospheric mist, film grain, ${STYLE}`,
  },
  {
    name: 'hero-interior-luxe.jpg',
    prompt: `Interior of a premium DIY camper van, warm walnut wood paneling on ceiling and walls, built-in LED strip lighting, cozy bedding, ambient golden light, small window revealing a forest at dusk, luxury campervan magazine photograph, ${STYLE}`,
  },
  {
    name: 'why-hiace.jpg',
    prompt: `Three quarter rear view of a white Toyota HiAce 200 series van silhouetted against a misty pine forest in Japan at dawn, commercial automotive photography, ${STYLE}`,
  },
  {
    name: 'body-types.jpg',
    prompt: `Clean studio photograph showing four Toyota HiAce van body variants lined up side by side on a neutral gray seamless background, technical catalog style, soft shadows, front three quarter angle, ${STYLE}`,
  },
  {
    name: 'engine-bay.jpg',
    prompt: `Detailed photograph of a modern diesel engine bay of a Toyota commercial van, chrome and black components, dramatic rim lighting, automotive editorial style, ${STYLE}`,
  },
  {
    name: 'layout-solo.jpg',
    prompt: `Interior of a camper van fitted for one solo adventurer, long surfboard and fishing rods stored sideways, fold-up side bed, minimalist plywood furniture, natural window light, editorial lifestyle photograph, ${STYLE}`,
  },
  {
    name: 'layout-nomad.jpg',
    prompt: `Inside a camper van converted into a mobile office, a rugged wooden fold-out desk with a 27 inch monitor mounted to a side window, leather office chair, cables neatly organized, late afternoon sunlight streaming in, digital nomad lifestyle photograph, ${STYLE}`,
  },
  {
    name: 'layout-couple.jpg',
    prompt: `Interior of a camper van for a couple, a fixed double bed across the rear with crisp linen, a compact kitchen galley with a sink on one side, a small dinette, warm wood tones, soft morning light through curtains, travel magazine photograph, ${STYLE}`,
  },
  {
    name: 'layout-family.jpg',
    prompt: `Family camper van interior with a bunk bed arrangement for two children on top and a double bed for parents below, soft fabric curtains, stuffed toy on pillow, golden evening light, wholesome family lifestyle photograph, ${STYLE}`,
  },
  {
    name: 'layout-mega-family.jpg',
    prompt: `Spacious super long wheelbase van camper interior configured as a two room setup with a U shaped dinette around a central table and a rear bunk area, wood paneling, large rear window showing green mountains, cinematic documentary photograph, ${STYLE}`,
  },
  {
    name: 'layout-sport.jpg',
    prompt: `Rugged camper van interior for surfers and snowboarders, wet gear hanging on the wall, skis and snowboards stored in an overhead rack, FRP floor, fold up side bed, dramatic rainy coastal light, action sports lifestyle photograph, ${STYLE}`,
  },
  {
    name: 'step-foundation.jpg',
    prompt: `Close up macro detail of black butyl sound deadening sheets being applied to the metal floor of a van, fiber glass insulation rolls in background, workshop lighting, gritty realistic DIY photograph, ${STYLE}`,
  },
  {
    name: 'step-flooring.jpg',
    prompt: `Overhead view of plywood subfloor being installed on a wooden joist framework inside a van, tools and measuring tape visible, workshop documentary photograph, ${STYLE}`,
  },
  {
    name: 'step-wiring.jpg',
    prompt: `Neatly bundled twelve volt DC wiring harness with colored cables routed along the interior chassis of a van, labeled fuses and breakers, a LiFePO4 battery in the background, technical documentary photograph, ${STYLE}`,
  },
  {
    name: 'step-ceiling.jpg',
    prompt: `Craftsman installing warm toned cedar tongue and groove planks on the ceiling of a van interior, hand holding an impact driver, dust motes in sunlight, artisan woodworking photograph, ${STYLE}`,
  },
  {
    name: 'step-wall.jpg',
    prompt: `Detail of a finished camper van wall paneled in warm walnut stained plywood with a rectangular window cutout, soft interior lighting, architectural detail photograph, ${STYLE}`,
  },
  {
    name: 'step-bed.jpg',
    prompt: `Custom plywood bed frame under construction inside a van, two by four lumber framing, storage drawers underneath, natural wood tones, hands with a cordless drill, DIY workshop photograph, ${STYLE}`,
  },
  {
    name: 'step-led.jpg',
    prompt: `Warm LED downlights recessed into a wooden camper ceiling at night, cozy ambient glow illuminating the wood grain, interior design photograph, ${STYLE}`,
  },
  {
    name: 'step-galley.jpg',
    prompt: `Compact camper van kitchen galley with a stainless steel sink, folding faucet, walnut countertop, water tank visible below, a cast iron kettle and a wooden cutting board on top, morning light, lifestyle photograph, ${STYLE}`,
  },
  {
    name: 'elec-battery.jpg',
    prompt: `Organized electrical bay inside a van containing a blue 300Ah LiFePO4 battery, a DC to DC charger, an inverter, a bus bar and colored cables, labeled switches and fuses, technical documentary photograph, ${STYLE}`,
  },
  {
    name: 'elec-solar.jpg',
    prompt: `Top down aerial view of a van roof with two large solar panels mounted on aluminum rails, clear blue sky above, commercial automotive photograph, ${STYLE}`,
  },
  {
    name: 'elec-ffheater.jpg',
    prompt: `Compact diesel FF heater unit installed under a camper van seat, visible hot air duct with chrome louver and glowing indicator light, inside the van on a cold winter night with frost on the window, documentary photograph, ${STYLE}`,
  },
  {
    name: 'registration.jpg',
    prompt: `Japanese vehicle inspection station exterior with a white HiAce camper van being inspected by an official with a clipboard, morning light, documentary photograph, ${STYLE}`,
  },
  {
    name: 'checklist-tools.jpg',
    prompt: `Flat lay top down photograph of essential DIY power tools on a wooden workbench: a cordless impact driver, a jigsaw, a circular saw, measuring tape, a carpenters square, a pencil, safety goggles and a roll of masking tape, warm wood background, craft magazine photograph, ${STYLE}`,
  },
];

async function generate(img) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/${MODEL}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt: img.prompt, steps: 8 }),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  const b64 = json.result?.image;
  if (!b64) throw new Error(`No image in response: ${JSON.stringify(json).slice(0, 200)}`);
  const buf = Buffer.from(b64, 'base64');
  const outPath = path.join(OUT_DIR, img.name);
  await fs.writeFile(outPath, buf);
  return { name: img.name, bytes: buf.length };
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  console.log(`Generating ${images.length} images into ${OUT_DIR}`);

  // Run in small parallel batches to stay within rate limits
  const BATCH = 3;
  for (let i = 0; i < images.length; i += BATCH) {
    const slice = images.slice(i, i + BATCH);
    const results = await Promise.allSettled(slice.map(generate));
    results.forEach((r, j) => {
      const name = slice[j].name;
      if (r.status === 'fulfilled') {
        console.log(`  ok  ${name}  (${r.value.bytes} bytes)`);
      } else {
        console.error(`  ERR ${name}:`, r.reason?.message || r.reason);
      }
    });
  }
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
