# About page: 12-part illustrated developer story

This directory contains the public-facing source copy and a deterministic renderer for `/about/`.

## Updating the editorial copy

1. Edit `story-data.json` (12 numbered episodes and four chapters).
2. Run `python3 scripts/about/build-story.py` from the site repository root.
3. Run `node --test tests/about-story.test.mjs tests/visitor-counter.test.mjs`.
4. Preview `/about/` at desktop and mobile viewports; check all 12 images and anchor links.
5. Commit the generated `about/index.html`, `sitemap.xml`, and any changed image or CSS assets together.

The renderer only edits the About page and the About sitemap date. It intentionally preserves all existing founder, camping, travel, partnership and legal sections.

## Images and content boundaries

- `assets/brand/about/journey-01.webp` through `journey-12.webp` are optimized copies of 12 numbered, user-supplied illustrations. The original iCloud Drive files were not modified.
- The illustrations portray **imagined people and scenes**, not actual family photographs or verified UI screenshots. Captions and the story introduction disclose this.
- `journey-10.webp` deliberately masks unverified GA4 quantities in the artwork. Do not unmask them until the underlying property, month, user metric and session definitions are verified. The editorial text does not imply improved grades or guaranteed exam success.
- Avoid publishing the children's names, images, school or the developer's confidential employment material.
- The original personal interview and marketing logs are private and must never be added to this public repository.
- The story offers the flagship learning app as an optional next step; it is not an exam result testimonial or a 12-day promotion page.
