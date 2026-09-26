# Static localization release — 2026-09-26

## Published scope

The homepage already has 15 language versions. This release adds complete static text localization of `apps.html`, `diy/index.html`, `maintenance/index.html`, and `travel/index.html`: 4 source pages × 15 languages = 60 pages, including the Japanese originals.

Supported locales: ja, en, zh-Hans, ko, es, pt-BR, fr, de, it, ru, tr, vi, th, hi, ar.

Examples: `/en/apps.html`, `/ar/apps.html`, `/fr/diy/`, `/ko/maintenance/`, `/de/travel/`.

These are overview pages. The full build guide (`camping-guide.html`), interactive 3D pages (`camping.html`, `maintenance.html`), individual app-detail and policy pages, and parking pages are not all localized. They are not declared complete by this release. Work-in-progress translation injections elsewhere are deliberately not included.

Original product screenshots and logos remain unchanged. Their visible Japanese labels document the actual app interfaces. Surrounding website text, captions, accessible labels and image alternative descriptions are translated.

## Translation and costs

The new text was written directly in ChatGPT and combined with previously ChatGPT-authored home/overview translations. The final keyed dictionaries are in `assets/i18n/apps/`. No translation service, model download or model inference API is used by the build or by the language selector. This is not a billing-account audit and says nothing about unrelated account usage.

## Navigation

An explicit `?lang=` choice takes priority; a localized URL is otherwise respected. On unprefixed pages, the saved manual choice is used first, then device timezone, then browser language, then English. Device timezone is only an approximation of region: no IP geolocation or GPS request is made. “Automatic” clears the saved choice. Tracking parameters and URL fragments are preserved.

The same preference keys are shared with the homepage. Links between completed pages keep the language. Links to not-yet-completed detail pages preserve a language query for future compatibility but do not imply those destination pages are already translated.

## Build and validation

Run `python3 scripts/build-localized-pages.py` to regenerate static HTML without network access. Generation fails if visible Japanese text remains in a non-Japanese version (Chinese is checked for leftover kana), and validates embedded structured data. The deployment pipeline checks that regeneration is reproducible before publishing.

With Playwright and Chromium already installed, run `python3 scripts/test-localized-pages.py`. The test starts a temporary local server and blocks external network resources. It checks all app-page languages at mobile and desktop widths, all overview-page languages on mobile, menus, automatic choice, stored manual choices, links from the localized homepage and English text without JavaScript. Results are recorded in `reports/localization-build.json` and `reports/localization-browser.json`.
