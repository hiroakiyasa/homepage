# Daylight hero refresh — 2026-09-16

Headline: 学びも、旅も、DIYも、車旅も。

The homepage hero uses a pale sky/mint/daylight background with dark readable typography. The existing generated scene is displayed in its original 450:253 frame, not stretched over a tall mobile background. No new generated image is claimed. Original brand artwork and direct destinations (/quest/, /travel/story.html, /camping.html, /maintenance.html) are preserved. The learning-series CTA remains primary. FAQ structured data matches visible content and the readable homepage summary is refreshed.

Styles are isolated in assets/css/home-daylight.css. Existing home-premium.css and app/3D/maintenance pages are unchanged. Mobile gutters are 20px (18px below 360px). Existing site regression checks and scripts/site-redesign/validate-daylight.py cover the change. The latter checks Chromium and WebKit, not a physical iPhone.

Backup: backup/pre-daylight-hero-20260916 at 7044a6f5b08207fa5f2c079a3999bae5fd9d581b.

To undo publication, revert the single publication commit titled `feat: brighten homepage hero with requested learning travel DIY copy` and push normally. Do not force-push, and do not rerun legacy migration scripts.
