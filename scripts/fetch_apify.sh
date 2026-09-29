#!/usr/bin/env bash
# Re-scrape both profiles with Apify and rebuild src/data/social-data.json.
# Token: $APIFY_TOKEN, or a one-line .apify_token file in the project root (git-ignored).
#
# Usage: bash scripts/fetch_apify.sh          # daily: newest posts only (cheap), merged into existing data
#        bash scripts/fetch_apify.sh --full   # full refresh of up to 100 posts per platform
#
# Cost reference (Sep 2026): ~$0.0027 per Instagram post, ~$0.004 per TikTok video.
# Daily (25 IG + 10 TT) ≈ $0.11; full (60 IG + 20 TT today) ≈ $0.24. Free plan = $5/month.
set -euo pipefail
cd "$(dirname "$0")/.."

IG=${IG_HANDLE:-ainchors.ai.fintech}
TT=${TT_HANDLE:-ainchors.ai.fintech}
if [ "${1:-}" = "--full" ]; then IG_LIMIT=100; TT_LIMIT=100; else IG_LIMIT=${IG_LIMIT:-25}; TT_LIMIT=${TT_LIMIT:-10}; fi
TOKEN=${APIFY_TOKEN:-$(cat .apify_token 2>/dev/null || true)}
[ -n "$TOKEN" ] || { echo "Set APIFY_TOKEN or create .apify_token" >&2; exit 1; }

run() { # actor input output
  echo "→ $1 ($3)"
  curl -sf -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    "https://api.apify.com/v2/acts/$1/run-sync-get-dataset-items?timeout=290&clean=true" -d "$2" > "$3.tmp"
  n=$(python3 -c "import json; d=json.load(open('$3.tmp')); print(len(d) if isinstance(d, list) else 0)")
  echo "   $n items"
  [ "$n" -gt 0 ] || { echo "ABORT: $1 returned no items; existing data left unchanged" >&2; rm -f "$3.tmp"; exit 2; }
  mv "$3.tmp" "$3"
}

mkdir -p data-raw
run apify~instagram-scraper "{\"directUrls\":[\"https://www.instagram.com/$IG/\"],\"resultsType\":\"posts\",\"resultsLimit\":$IG_LIMIT}" data-raw/instagram.json
run apify~instagram-scraper "{\"directUrls\":[\"https://www.instagram.com/$IG/\"],\"resultsType\":\"details\",\"resultsLimit\":1}" data-raw/ig_profile.json
run clockworks~tiktok-scraper "{\"profiles\":[\"$TT\"],\"resultsPerPage\":$TT_LIMIT,\"profileScrapeSections\":[\"videos\"],\"profileSorting\":\"latest\",\"shouldDownloadVideos\":false,\"shouldDownloadCovers\":false}" data-raw/tiktok.json

python3 scripts/normalize.py
