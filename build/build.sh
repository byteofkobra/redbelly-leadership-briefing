#!/usr/bin/env bash
# Rebuild every deliverable from build/content.js and data/*.json, then run the offline checks.
# Needs: Node 18+ (with `npm install`), LibreOffice (soffice), Poppler (pdftoppm, pdftotext), Python 3.9+.
set -euo pipefail
cd "$(dirname "$0")/.."

node build/build.js
soffice --headless --convert-to pdf --outdir briefing briefing/redbelly-leadership-briefing.docx >/dev/null
pdftoppm -r 90 -png -f 1 -l 3 briefing/redbelly-leadership-briefing.pdf assets/page
python3 scripts/verify.py
