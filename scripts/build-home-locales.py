#!/usr/bin/env python3
from pathlib import Path
import html as html_lib
import json
import re

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "index.html"
LOCALES = {
    "en": ("en", "en_US"),
    "zh-Hans": ("zh-hans", "zh_CN"),
    "ko": ("ko", "ko_KR"),
    "es": ("es", "es_ES"),
    "pt-BR": ("pt-br", "pt_BR"),
    "fr": ("fr", "fr_FR"),
    "de": ("de", "de_DE"),
    "it": ("it", "it_IT"),
    "ru": ("ru", "ru_RU"),
    "tr": ("tr", "tr_TR"),
    "vi": ("vi", "vi_VN"),
    "th": ("th", "th_TH"),
    "hi": ("hi", "hi_IN"),
    "ar": ("ar", "ar_SA"),
}
BASE_URL = "https://trailfusionai.com/"
VERSION = "20260926-1"

# Locale JSON files contain the final ChatGPT-reviewed translations.

def locale_url(slug: str) -> str:
    return f"{BASE_URL}{slug}/"


def alternates_block() -> str:
    rows = [
        '<!-- home-i18n:start -->',
        f'<link rel="alternate" hreflang="ja" href="{BASE_URL}"/>',
    ]
    for code, (slug, _) in LOCALES.items():
        rows.append(f'<link rel="alternate" hreflang="{code}" href="{locale_url(slug)}"/>')
    rows.append(f'<link rel="alternate" hreflang="x-default" href="{BASE_URL}"/>')
    rows.append(f'<script defer src="/assets/js/home-i18n.js?v={VERSION}"></script>')
    rows.append('<!-- home-i18n:end -->')
    return "".join(rows)

def prepare_root(source: str) -> str:
    source = re.sub(
        r'<!-- home-i18n:start -->.*?<!-- home-i18n:end -->',
        '',
        source,
        flags=re.S,
    )
    return source.replace('</head>', alternates_block() + '</head>', 1)


def translate_json(value, mapping, locale, canonical):
    if isinstance(value, str):
        return mapping.get(value, value)
    if isinstance(value, list):
        return [translate_json(x, mapping, locale, canonical) for x in value]
    if not isinstance(value, dict):
        return value

    out = {k: translate_json(v, mapping, locale, canonical) for k, v in value.items()}
    if "inLanguage" in out:
        out["inLanguage"] = locale
    typ = out.get("@type")
    if typ == "WebPage":
        out["@id"] = canonical + "#webpage"
        out["url"] = canonical
    elif typ == "CollectionPage":
        out["@id"] = canonical + "#collection"
        out["url"] = canonical
    return out

JSONLD_RE = re.compile(
    r'<script type="application/ld\+json">(.*?)</script>',
    re.S,
)


def render_locale(root_html: str, locale: str, slug: str, og_locale: str) -> str:
    mapping_path = ROOT / "assets" / "i18n" / "home" / f"{locale}.json"
    mapping = json.loads(mapping_path.read_text(encoding="utf-8"))

    match = JSONLD_RE.search(root_html)
    if not match:
        raise RuntimeError("JSON-LD block not found in index.html")
    json_source = match.group(1)
    work = root_html[:match.start()] + "__TF_HOME_JSONLD__" + root_html[match.end():]

    for source in sorted(mapping, key=len, reverse=True):
        target = html_lib.escape(mapping[source], quote=True)
        work = work.replace(source, target)

    attrs = f'lang="{locale}"'
    if locale == "ar":
        attrs += ' dir="rtl"'
    work = re.sub(r'<html lang="[^"]+"(?: dir="[^"]+")?>', f'<html {attrs}>', work, count=1)

    canonical = locale_url(slug)
    work = re.sub(
        r'<link href="https://trailfusionai\.com/[^"]*" rel="canonical"/>',
        f'<link href="{canonical}" rel="canonical"/>',
        work,
        count=1,
    )
    work = re.sub(
        r'<meta content="https://trailfusionai\.com/[^"]*" property="og:url"/>',
        f'<meta content="{canonical}" property="og:url"/>',
        work,
        count=1,
    )
    work = re.sub(
        r'<meta content="[^"]*" property="og:locale"/>',
        f'<meta content="{og_locale}" property="og:locale"/>',
        work,
        count=1,
    )

    schema = json.loads(json_source)
    schema = translate_json(schema, mapping, locale, canonical)
    schema_text = json.dumps(schema, ensure_ascii=False, separators=(",", ":"))
    work = work.replace(
        "__TF_HOME_JSONLD__",
        f'<script type="application/ld+json">{schema_text}</script>',
        1,
    )

    headline = mapping.get("学びも、旅も、DIYも、車旅も。")
    if headline:
        headline_html = html_lib.escape(headline)
        work = re.sub(
            r'<h1 id="daylight-title">.*?</h1>',
            f'<h1 id="daylight-title"><span class="tf-daylight__line">{headline_html}</span></h1>',
            work,
            count=1,
            flags=re.S,
        )
    return work


def update_sitemap():
    path = ROOT / "sitemap.xml"
    text = path.read_text(encoding="utf-8")
    text = re.sub(
        r'\s*<!-- home-locales:start -->.*?<!-- home-locales:end -->\s*',
        "\n",
        text,
        flags=re.S,
    )
    rows = ["<!-- home-locales:start -->"]
    for _, (slug, _) in LOCALES.items():
        rows.append(
            f"<url><loc>{locale_url(slug)}</loc>"
            "<lastmod>2026-09-23</lastmod>"
            "<changefreq>weekly</changefreq><priority>1.0</priority></url>"
        )
    rows.append("<!-- home-locales:end -->")
    block = "\n".join(rows)
    text = text.replace("</urlset>", block + "\n</urlset>", 1)
    path.write_text(text, encoding="utf-8")


def main():
    original = SOURCE.read_text(encoding="utf-8")
    root_html = prepare_root(original)
    SOURCE.write_text(root_html, encoding="utf-8")

    for locale, (slug, og_locale) in LOCALES.items():
        out_dir = ROOT / slug
        out_dir.mkdir(parents=True, exist_ok=True)
        localized = render_locale(root_html, locale, slug, og_locale)
        (out_dir / "index.html").write_text(localized, encoding="utf-8")
        print(f"{locale:8} -> /{slug}/ ({len(localized):,} chars)")

    update_sitemap()


if __name__ == "__main__":
    main()
