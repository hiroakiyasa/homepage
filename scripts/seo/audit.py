#!/usr/bin/env python3
"""Read-only SEO checks for the committed, indexable site. Standard library only.

This is a source audit, not proof of indexing, rankings, traffic or Core Web Vitals.
Run after the brand/Quest generators and before publishing. No network or writes
occur unless --output explicitly names a local report destination.
"""
from __future__ import annotations

import argparse
from collections import defaultdict
from datetime import datetime, timezone
from html.parser import HTMLParser
import json
from pathlib import Path
from urllib.parse import unquote, urlsplit
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
ORIGIN = "https://trailfusionai.com"


class Metadata(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.titles: list[str] = []
        self.descriptions: list[str] = []
        self.canonicals: list[str] = []
        self.alternates: list[tuple[str, str]] = []
        self.robots: list[str] = []
        self.ld: list[str] = []
        self.h1 = 0
        self._title: list[str] | None = None
        self._ld: list[str] | None = None

    def handle_starttag(self, tag: str, attrs) -> None:
        a = dict(attrs)
        if tag == "h1":
            self.h1 += 1
        elif tag == "title":
            self._title = []
        elif tag == "meta":
            name = (a.get("name") or "").lower()
            if name == "description":
                self.descriptions.append(a.get("content") or "")
            elif name in ("robots", "googlebot"):
                self.robots.append((a.get("content") or "").lower())
        elif tag == "link":
            rel = (a.get("rel") or "").lower().split()
            if "canonical" in rel:
                self.canonicals.append(a.get("href") or "")
            if "alternate" in rel and a.get("hreflang"):
                self.alternates.append((a["hreflang"], a.get("href") or ""))
        elif tag == "script" and a.get("type") == "application/ld+json":
            self._ld = []

    def handle_data(self, data: str) -> None:
        if self._title is not None:
            self._title.append(data)
        if self._ld is not None:
            self._ld.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag == "title" and self._title is not None:
            self.titles.append("".join(self._title).strip())
            self._title = None
        if tag == "script" and self._ld is not None:
            self.ld.append("".join(self._ld))
            self._ld = None


def local_file(root: Path, url: str) -> Path:
    path = unquote(urlsplit(url).path)
    candidate = root / path.lstrip("/")
    if path.endswith("/") or candidate.is_dir():
        candidate /= "index.html"
    if not candidate.resolve().is_relative_to(root.resolve()):
        raise ValueError("URL resolves outside the site root")
    return candidate


def contains_rating(value) -> bool:
    if isinstance(value, dict):
        return "aggregateRating" in value or any(contains_rating(v) for v in value.values())
    if isinstance(value, list):
        return any(contains_rating(v) for v in value)
    return False


def audit(root: Path) -> dict:
    findings: list[dict] = []
    documents: dict[str, Metadata] = {}
    urls = [el.text.strip() for el in ET.parse(root / "sitemap.xml").iter()
            if el.tag.rsplit("}", 1)[-1] == "loc" and el.text]

    def add(level: str, code: str, url: str, evidence) -> None:
        findings.append({"severity": level, "code": code, "url": url, "evidence": evidence})

    if len(urls) != len(set(urls)):
        add("error", "duplicate_sitemap_url", ORIGIN + "/sitemap.xml", len(urls) - len(set(urls)))
    for url in dict.fromkeys(urls):
        if not url.startswith(ORIGIN + "/"):
            add("error", "unexpected_sitemap_origin", url, "Expected canonical HTTPS origin")
            continue
        file = local_file(root, url)
        if not file.is_file():
            add("error", "missing_sitemap_file", url, file.relative_to(root).as_posix())
            continue
        doc = Metadata()
        doc.feed(file.read_text(encoding="utf-8"))
        documents[url] = doc
        if len(doc.titles) != 1 or not doc.titles[0]:
            add("error", "title", url, doc.titles)
        if len(doc.descriptions) != 1 or not doc.descriptions[0].strip():
            add("error", "description", url, doc.descriptions)
        if doc.canonicals != [url]:
            add("error", "canonical", url, doc.canonicals)
        if any("noindex" in rule or "none" in rule.split(",") for rule in doc.robots):
            add("error", "sitemap_noindex", url, doc.robots)
        if doc.h1 != 1:
            add("warning", "h1_count", url, doc.h1)
        for block in doc.ld:
            try:
                data = json.loads(block)
            except ValueError as exc:
                add("error", "invalid_json_ld", url, str(exc))
                continue
            # This site currently displays sourced store ratings but does not
            # collect first-party reviews. Do not republish those as own ratings.
            if contains_rating(data):
                add("error", "rating_provenance", url,
                    "aggregateRating requires eligible first-party review evidence; store ratings stay visible only")

    for url, doc in documents.items():
        seen_codes: set[str] = set()
        for code, alternate in doc.alternates:
            if code in seen_codes:
                add("error", "duplicate_hreflang", url, code)
            seen_codes.add(code)
            target = documents.get(alternate)
            if target is None:
                add("warning", "hreflang_target_not_in_sitemap", url, {"language": code, "target": alternate})
                continue
            if code == "x-default" or alternate == url:
                continue
            if not any(back == url for lang, back in target.alternates if lang != "x-default"):
                add("error", "hreflang_missing_return", url, {"language": code, "target": alternate})

    titles: dict[str, list[str]] = defaultdict(list)
    for url, doc in documents.items():
        if doc.titles:
            titles[doc.titles[0]].append(url)
    for title, pages in titles.items():
        if len(pages) > 1:
            add("warning", "shared_title", pages[0], {"title": title, "pages": pages})

    return {
        "checked_at": datetime.now(timezone.utc).isoformat(),
        "scope": "Committed HTML for every URL in sitemap.xml; no live crawl or search measurements",
        "sitemap_urls": len(urls), "parsed_pages": len(documents),
        "error_count": sum(f["severity"] == "error" for f in findings),
        "warning_count": sum(f["severity"] == "warning" for f in findings),
        "findings": findings,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--output", type=Path, help="Optional local JSON report; analytics data must not be committed")
    parser.add_argument("--json", action="store_true", help="Print the full machine-readable report")
    args = parser.parse_args()
    result = audit(args.root.resolve())
    payload = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(payload, encoding="utf-8")
    if args.json:
        print(payload, end="")
    else:
        print(f"SEO source audit: {result['parsed_pages']}/{result['sitemap_urls']} pages, "
              f"{result['error_count']} errors, {result['warning_count']} warnings")
        for row in result["findings"]:
            print(f"{row['severity'].upper()} {row['code']} {row['url']}: {row['evidence']}")
    return int(result["error_count"] > 0)


if __name__ == "__main__":
    raise SystemExit(main())
