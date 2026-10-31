#!/usr/bin/env python3
"""Offline checks for the briefing package (standard library only).

Run after `node build/build.js`:  python3 scripts/verify.py

Each check maps to a requirement or failure criterion in the brief:
  sources      every source is numbered, linked once, and cited in the briefing
  citations    every factual paragraph, bullet and table row carries a citation
  links        every hyperlink in the DOCX points to a listed source
  quotes       every quoted phrase appears verbatim in a source excerpt (no invented quotes)
  claims       every cited source has at least one supporting excerpt in data/claims.json
  thread       5 to 8 posts, each within 280 characters by X's rules, each with a source link
  separation   analysis is labelled in the briefing and in the thread
  credit       no names, handles, signatures or "made by" lines, and no author metadata
  scope        no price talk or investment language, and nothing about private life
  length       the briefing PDF is 2 to 3 pages; the source list and thread PDFs exist
"""

import csv
import json
import re
import sys
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from check_sources import norm  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
BRIEF_MD = ROOT / "briefing/redbelly-leadership-briefing.md"
BRIEF_DOCX = ROOT / "briefing/redbelly-leadership-briefing.docx"
BRIEF_PDF = ROOT / "briefing/redbelly-leadership-briefing.pdf"
SOURCES_PDF = ROOT / "sources/source-list.pdf"
THREAD_PDF = ROOT / "x-thread/x-thread.pdf"
THREAD_TXT = ROOT / "x-thread/x-thread.txt"

results = []


def check(name, ok, detail=""):
    results.append((name, bool(ok), detail))


def x_length(text):
    """Weighted length as X counts it: each URL is 23, most other characters are 1."""
    text = re.sub(r"https?://\S+", "x" * 23, text)
    n = 0
    for ch in text:
        c = ord(ch)
        light = c <= 4351 or 8192 <= c <= 8205 or 8208 <= c <= 8223 or 8242 <= c <= 8247
        n += 1 if light else 2
    return n


def main():
    data = json.loads((ROOT / "data/sources.json").read_text())
    sources = {s["id"]: s for s in data["sources"]}
    reviewed_urls = {r["url"] for r in data.get("reviewed_not_cited", [])}
    claims = json.loads((ROOT / "data/claims.json").read_text())["claims"]
    rows = list(csv.DictReader((ROOT / "sources/sources.csv").open()))
    by_num = {int(r["number"]): r for r in rows}
    urls = {r["url"] for r in rows}

    # sources
    check("sources: numbered 1..N without gaps", sorted(by_num) == list(range(1, len(rows) + 1)), f"{len(rows)} sources")
    check("sources: CSV matches data/sources.json", {r["id"] for r in rows} == set(sources))
    check("sources: every URL is unique", len(urls) == len(rows))
    check("sources: every URL uses https", all(u.startswith("https://") for u in urls))

    md = BRIEF_MD.read_text()
    body = md.split("## Source list")[0]
    cited = {int(n): u for n, u in re.findall(r"\[\[(\d+)\]\]\((https?://[^)]+)\)", body)}
    check("sources: every source is cited in the briefing", set(cited) == set(by_num),
          f"uncited: {sorted(set(by_num) - set(cited))}")
    check("sources: each citation number links to its own source",
          all(by_num[n]["url"] == u for n, u in cited.items()))

    # citations: every factual line in sections 1-5 carries at least one citation
    factual = "## 1." + body.split("## 1.")[1].split("## 6.")[0]
    lines, prev = factual.splitlines(), ""
    uncited = []
    for i, line in enumerate(lines):
        s = line.strip()
        nxt = lines[i + 1].strip() if i + 1 < len(lines) else ""
        is_header_row = s.startswith("|") and nxt.startswith("|---")
        skip = (not s or s.startswith(("#", "<", "|---", "> *", "> [!", "> **")) or s == ">"
                or is_header_row or s.startswith("| |"))
        if not skip and "[[" not in s:
            uncited.append(s[:70])
    check("citations: every factual paragraph, bullet and table row is cited", not uncited, "; ".join(uncited))
    glance = body.split("### At a glance")[1].split("## 1.")[0]
    glance_rows = [l for l in glance.splitlines() if l.startswith("| **")]
    check("citations: every 'At a glance' row is cited", glance_rows and all("[[" in l for l in glance_rows))

    # links inside the DOCX
    with zipfile.ZipFile(BRIEF_DOCX) as z:
        rels = z.read("word/_rels/document.xml.rels").decode()
        core = z.read("docProps/core.xml").decode()
        doc_xml = z.read("word/document.xml").decode()
    targets = set(re.findall(r'Target="(https?://[^"]+)"\s+TargetMode="External"', rels))
    targets |= set(re.findall(r'TargetMode="External"\s+Target="(https?://[^"]+)"', rels))
    targets = {t.replace("&amp;", "&") for t in targets}
    check("links: DOCX hyperlinks all point to listed sources", targets <= urls | reviewed_urls,
          f"unexpected: {sorted(targets - urls - reviewed_urls)}")
    check("links: every source is hyperlinked in the DOCX", urls <= targets, f"missing: {sorted(urls - targets)}")

    # quotes: nothing in curly double quotes unless it is verbatim in a source excerpt
    pool = norm(" || ".join(s["excerpt"] for c in claims for s in c["support"] if s.get("excerpt")))
    thread_txt = THREAD_TXT.read_text()
    quoted = re.findall(r"“([^”]+)”", body) + re.findall(r"“([^”]+)”", thread_txt)
    bad = [q for q in quoted if norm(q.strip().rstrip(",.;:")) not in pool]
    check("quotes: every quotation is verbatim from a source", not bad, "; ".join(bad))
    check("quotes: quotations were found to test", len(quoted) >= 10, f"{len(quoted)} quotations checked")

    # claims
    supported = {s["source"] for c in claims for s in c["support"] if s.get("excerpt") or s.get("manual")}
    check("claims: every cited source has a supporting excerpt", set(sources) <= supported,
          f"no excerpt: {sorted(set(sources) - supported)}")
    check("claims: every claim names a known source", all(s["source"] in sources for c in claims for s in c["support"]))

    # thread
    posts = [p.strip() for p in thread_txt.split("\n----\n") if p.strip()]
    check("thread: 5 to 8 posts", 5 <= len(posts) <= 8, f"{len(posts)} posts")
    for i, post in enumerate(posts, 1):
        head, text = post.split("\n", 1)
        post_urls = re.findall(r"https?://\S+", text)
        n = x_length(text)
        check(f"thread: post {i} within 280 ({n})", n <= 280 and head.endswith(f"{n}/280"))
        check(f"thread: post {i} links only to listed sources", post_urls and set(post_urls) <= urls)
        check(f"thread: post {i} is numbered", f"({i}/{len(posts)})" in text)

    # separation of fact and analysis
    analysis = body.split("## 5.")[1].split("## 6.")[0]
    check("separation: analysis section is labelled", "ANALYSIS, NOT FACT" in analysis and "Analysis, not fact" in analysis)
    check("separation: sections 1-4 are labelled as fact", body.count("<kbd>SOURCED FACT</kbd>") == 4)
    check("separation: analytical post in the thread is labelled", posts[-1].split("\n", 1)[1].startswith("Analysis, not fact"))
    check("separation: DOCX carries the fact and analysis labels", "SOURCED FACT" in doc_xml and "ANALYSIS, NOT FACT" in doc_xml)

    # personal credit and metadata
    deliverables = md + thread_txt + (ROOT / "x-thread/x-thread.md").read_text() + (ROOT / "sources/sources.md").read_text() \
        + (ROOT / "sources/claim-check.md").read_text() + re.sub(r"<[^>]+>", " ", doc_xml)
    credit = re.findall(r"(?i)made by|prepared by|written by|compiled by|\bauthor\b|byteofkobra|\bclaude\b|anthropic|chatgpt|openai|generated (?:by|with)|(?<![\w/])@\w{2,}", deliverables)
    check("credit: no names, handles or 'made by' lines in the deliverables", not credit, ", ".join(sorted(set(credit))))
    creator = re.search(r"<dc:creator>(.*?)</dc:creator>", core)
    modified = re.search(r"<cp:lastModifiedBy>(.*?)</cp:lastModifiedBy>", core)
    check("credit: DOCX has no author metadata", not (creator and creator.group(1).strip()) and not (modified and modified.group(1).strip()))
    empty = (None, b"()", b"<>", b"<FEFF>", b"<feff>")
    for pdf_path in (BRIEF_PDF, SOURCES_PDF, THREAD_PDF):
        if pdf_path.exists():
            author = re.search(rb"/Author\s*(\((?:[^)\\]|\\.)*\)|<[0-9A-Fa-f]*>)", pdf_path.read_bytes())
            check(f"credit: {pdf_path.name} has no author metadata", author is None or author.group(1) in empty)

    # scope: no price talk, investment language or private life
    text = md + thread_txt
    money = re.findall(r"(?i)\b(price[sd]?|pricing|buy|sell|returns?|profit|yield|bullish|bearish|pump|moon|rbnt|roi|invest in|investment advice|undervalued|upside)\b", text)
    check("scope: no price talk or investment language", not money, ", ".join(sorted(set(money))))
    private = re.findall(r"(?i)\b(wife|husband|married|marriage|children|kids|daughter|son|family|born|birthday|hobby|hobbies|religion|religious|lives in|home town|military service)\b", text)
    check("scope: nothing about private life or family", not private, ", ".join(sorted(set(private))))

    # length and completeness
    for pdf_path, label in ((BRIEF_PDF, "briefing PDF"), (SOURCES_PDF, "source list PDF"), (THREAD_PDF, "X thread PDF")):
        check(f"deliverables: {label} exists", pdf_path.exists())
    if BRIEF_PDF.exists():
        pages = len(re.findall(rb"/Type\s*/Page(?![s\w])", BRIEF_PDF.read_bytes()))
        check("length: briefing PDF is 2 to 3 pages", 2 <= pages <= 3, f"{pages} pages")

    width = max(len(n) for n, _, _ in results)
    for name, ok, detail in results:
        print(f"{'PASS' if ok else 'FAIL'}  {name:<{width}}  {detail if (detail and not ok) or 'checked' in detail or 'sources' in detail or 'posts' in detail or 'pages' in detail else ''}".rstrip())
    failed = [n for n, ok, _ in results if not ok]
    print(f"\n{len(results) - len(failed)}/{len(results)} checks passed.")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
