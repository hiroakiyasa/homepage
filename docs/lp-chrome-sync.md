# LP branding shared with the camping page

This update changes the actual `index.html` and `camping.html` files, not only integration helpers.

- `index.html`: adds Camping DIY to desktop navigation, mobile drawer, and a direct mobile header button. Original LP hero, footer, images, content, home counter and scripts are preserved.
- `camping.html`: uses the LP's exact logo images, complete header with SNS links, complete footer with all link groups, landscape strip, notices and legal links. Home section links resolve to `index.html#...`, not absent sections of camping.html. Header/footer styles are isolated from page content.
- The camping visit counter retains the original `trailfusionai.com/camping` hits.sh key. There is one badge; `assets/js/visitor-counter.js` is not modified.
- The existing camping article sections are retained. This commit does not publish the separately exported interactive 3D Studio body. The separately delivered Studio preview received the same chrome update without changing any of its four `hiace-*` scripts.

## Regeneration

```sh
python -m pip install beautifulsoup4==4.14.3 tinycss2==1.5.1
python scripts/sync_lp_chrome.py
# To integrate with a separately exported Studio HTML instead:
python scripts/sync_lp_chrome.py --studio /path/to/studio.html --out /path/to/output
```

The generator verifies logo identity, footer text identity, header links, counter key and unchanged Studio script hashes. It preserves raw SVG case-sensitive attributes and does not rewrite the LP body.

Local browser UI checks: desktop widths 1440, 1180, 1121, 1024, 768; mobile widths 390 and 320. Logo rendering, header/menu camping links, menu open/Escape-close, and document horizontal overflow passed for LP, existing article and Studio preview. The Studio state-only initialization passed; this test is not a GPU-rendering or real-device certification. Counter requests were stubbed during testing to avoid inflating visit counts.

Temporary review workflows and their credentials are not part of this production change.
