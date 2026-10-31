#!/usr/bin/env python3
"""Live source check.

For every source in data/sources.json this script
  1. opens the link and records the HTTP status, and
  2. confirms that each verbatim excerpt listed for that source in
     data/claims.json is still present on the page.

Usage:
  python3 scripts/check_sources.py                      # check live pages
  python3 scripts/check_sources.py --report sources/verification-report.md
  python3 scripts/check_sources.py --cache DIR          # use saved <id>.html files instead

Standard library only. Exit code 1 if any openly accessible source fails.
Sources marked "manual" in data/sources.json (sites that block automated
checkers) are reported but never fail the run; open those in a browser.
"""

import argparse
import datetime as dt
import json
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
UA = "Mozilla/5.0 (compatible; briefing-source-check/1.0; link and citation checker)"

DASHES = dict.fromkeys(map(ord, "‐‑‒–—―−"), "-")
SYMBOLS = {ord("‘"): "'", ord("’"): "'", ord("‛"): "'", ord("ʼ"): "'",
           ord("“"): '"', ord("”"): '"', ord("®"): None, ord("™"): None,
           ord("​"): None}


def norm(text):
    """Compare text ignoring case, whitespace, quote style and dash style."""
    text = unicodedata.normalize("NFKC", text).translate(DASHES).translate(SYMBOLS)
    return re.sub(r"\s+", "", text).lower()


class _Text(HTMLParser):
    SKIP = {"script", "style", "noscript", "svg", "template"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts, self.skip = [], 0

    def handle_starttag(self, tag, attrs):
        if tag in self.SKIP:
            self.skip += 1

    def handle_endtag(self, tag):
        if tag in self.SKIP and self.skip:
            self.skip -= 1

    def handle_data(self, data):
        if not self.skip:
            self.parts.append(data)


def page_text(html):
    parser = _Text()
    parser.feed(html)
    return " ".join(parser.parts)


def fetch(url, timeout, tries=3):
    req = urllib.request.Request(url, headers={
        "User-Agent": UA, "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-AU,en;q=0.9", "Accept-Encoding": "identity"})
    last = None
    for attempt in range(tries):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                charset = resp.headers.get_content_charset() or "utf-8"
                return resp.status, resp.read().decode(charset, errors="replace"), resp.geturl()
        except urllib.error.HTTPError as err:
            return err.code, "", url
        except Exception as err:  # network errors: retry with backoff
            last = err
            time.sleep(2 ** attempt)
    return None, f"{type(last).__name__}: {last}", url


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--cache", type=Path, help="read <id>.html from this folder instead of fetching")
    ap.add_argument("--save", type=Path, help="save fetched pages as <id>.html in this folder")
    ap.add_argument("--report", type=Path, help="write a Markdown report to this path")
    ap.add_argument("--timeout", type=int, default=30)
    args = ap.parse_args()

    sources = json.loads((ROOT / "data/sources.json").read_text())["sources"]
    claims = json.loads((ROOT / "data/claims.json").read_text())["claims"]
    numbers = {}
    csv_path = ROOT / "sources/sources.csv"
    if csv_path.exists():
        for line in csv_path.read_text().splitlines()[1:]:
            n, sid = re.match(r'"(\d+)","([^"]+)"', line).groups()
            numbers[sid] = int(n)
    excerpts = {}
    for claim in claims:
        for sup in claim["support"]:
            if sup.get("excerpt"):
                excerpts.setdefault(sup["source"], []).append(sup["excerpt"])

    if args.save:
        args.save.mkdir(parents=True, exist_ok=True)
    rows, failures = [], 0
    for src in sorted(sources, key=lambda s: numbers.get(s["id"], 999)):
        sid, manual = src["id"], src.get("access") == "manual"
        if args.cache:
            path = args.cache / f"{sid}.html"
            status, html = (200, path.read_text(errors="replace")) if path.exists() else (None, "not in cache")
        else:
            status, html, _ = fetch(src["url"], args.timeout)
        if args.save and status == 200:
            (args.save / f"{sid}.html").write_text(html)
        text = norm(page_text(html)) if status == 200 else ""
        wanted = excerpts.get(sid, [])
        missing = [e for e in wanted if norm(e) not in text]
        if status == 200 and not missing:
            result = "OK"
        elif manual:
            result = "MANUAL"
        else:
            result = "FAIL"
            failures += 1
        found = len(wanted) - len(missing) if status == 200 else 0
        rows.append((numbers.get(sid, "?"), sid, result, status, found, len(wanted), missing, src["url"], src["publisher"]))
        detail = f"{found}/{len(wanted)} excerpts" if wanted else "link only"
        print(f"[{rows[-1][0]:>2}] {result:<6} {str(status):<4} {sid:<13} {detail}")
        for miss in missing if status == 200 else []:
            print(f"       missing: {miss[:100]}")
        if result == "MANUAL":
            print(f"       open in a browser: {src['url']}")

    ok = sum(r[2] == "OK" for r in rows)
    manual = sum(r[2] == "MANUAL" for r in rows)
    total_ex = sum(r[5] for r in rows)
    found_ex = sum(r[4] for r in rows)
    summary = (f"{ok}/{len(rows)} sources OK, {manual} to check by hand, {failures} failed; "
               f"{found_ex}/{total_ex} supporting excerpts found on the pages.")
    print("\n" + summary)

    if args.report:
        try:
            from zoneinfo import ZoneInfo
            stamp = dt.datetime.now(ZoneInfo("Australia/Sydney")).strftime("%d %B %Y, %H:%M %Z")
        except Exception:
            stamp = dt.datetime.now(dt.timezone.utc).strftime("%d %B %Y, %H:%M UTC")
        lines = ["# Source verification report", "",
                 f"Generated by `scripts/check_sources.py` on {stamp}" + (" from cached pages." if args.cache else " against the live pages."), "",
                 f"**{summary}**", "",
                 "| # | Source | Result | HTTP | Excerpts found |", "|---:|---|---|---|---|"]
        for n, sid, result, status, found, want, missing, url, publisher in rows:
            lines.append(f"| {n} | [{publisher}]({url}) `{sid}` | {result} | {status or '-'} | {found}/{want} |")
        lines += ["", "OK means the link opened and every verbatim excerpt listed for that source in "
                  "`data/claims.json` was found on the page. MANUAL means the site blocks automated "
                  "checkers; open it in a browser.", ""]
        args.report.write_text("\n".join(lines))
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
