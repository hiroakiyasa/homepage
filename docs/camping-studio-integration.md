# Hiace Studio: complete original header and footer

## What this commit contains

- `assets/js/camping-site-chrome.js`: the complete header and footer from the original camping page, including desktop navigation, the mobile menu, all 11 chapter links, other-page links, copyright year and scroll-to-top button.
- `scripts/integrate-camping-studio.py`: a standard-library-only generator which adds that chrome to the exported V15 studio. All original `hiace-*` script hashes are verified unchanged.
- `camping-guide.html`: a byte-for-byte archive of the original `camping.html` (Git blob `91a09582c6ebc1450cdfc2addac9361dbd258bd7`). Long original chapters remain accessible here.

**This commit does not replace `camping.html` with the new studio. The self-contained studio export is a separate input and is not included in this commit.** The integrated `camping.html` is provided as a conversation artifact. Publishing that HTML is a separate remaining step.

## Generate the integrated page

From the repository root, using the unmodified V15 export:

```sh
python3 scripts/integrate-camping-studio.py /path/to/hiace-studio-v15.html
```

The script writes `camping.html`, preserves an existing old guide if no archive is present, removes the preview-only `noindex`, and adds the page title, canonical URL, social metadata and site icons. It refuses an already-integrated input. No dependencies, network access or changes to the 3D model are required.

The exact V15 input used for verification had SHA-256:

```text
8209ee169a89ac533b9fbbc74d8122eb412ff17b9b3235e376c947d7e6488e86
```

The generated standalone HTML had SHA-256:

```text
7e9626782beadf9d6c7da78f5aa817e42096806a8ee4c848ef2c2bdf07271b16
```

After reviewing the generated page, publishing it requires committing and pushing `camping.html` itself. Do not infer that a commit of this integration tooling has already deployed the V15/V16 3D page.

## Integration behavior

The original site styles are loaded within two Shadow DOM roots so the Tailwind reset, site navigation typography and footer styles cannot change the 3D UI. Critical CSS provides a layout before the original shared CSS arrives. Fonts, logo and icons use the original site's resources; they require a network connection.

The original header and footer links are retained. Roadmap opens the 23-stage assembly mode; layout navigation opens the interior selector. Electrical and registration links select the relevant compact summary. Foundation, furniture, climate and cost links select the matching V15 summary. The original introduction and vehicle-selection chapters link to the archived guide instead of nonexistent anchors.

The header height is measured for the hero viewport, avoiding an extra stacked hero. Mobile navigation supports its toggle, Escape, outside click and desktop resize. Expanded 3D mode continues to cover the header.

## Verification

A Chromium state/UI test loaded the integrated HTML and checked:

- 15 header anchors and 16 footer anchors, with exactly one header and footer;
- menu open/close and Escape on mobile widths;
- viewport widths 320, 390, 768, 900, 1024, 1280 and 1440 with no horizontal page overflow;
- electrical/registration summaries, assembly roadmap and layout navigation;
- the four original Hiace scripts are byte-for-byte unchanged; no JavaScript page errors in the tested state/UI mode.

The test environment blocked external network requests. It rendered the critical chrome CSS, not the online fonts/logo/shared styles. Browser WebGL rendering, the live site's complete online styling, and real-device Safari remain unverified. Existing V15 model features and media were not modified by this integration.
