#!/usr/bin/env bash
# Re-scrape both profiles with Apify and rebuild src/data/social-data.json.
# Token: $APIFY_TOKEN, or a one-line .apify_token file in the project root (git-ignored).
# Usage: bash scripts/fetch_apify.sh [instagram_handle] [tiktok_handle] [limit]
set -euo pipefail
cd "$(dirname "$0")/.."

IG=${1:-ainchors.ai.fintech}
TT=${2:-ainchors.ai.fintech}
LIMIT=${3:-100}
TOKEN=${APIFY_TOKEN:-$(cat .apify_token 2>/dev/null || true)}
[ -n "$TOKEN" ] || { echo "Set APIFY_TOKEN or create .apify_token" >&2; exit 1; }

run() { # actor input output
  echo "→ $1"
  curl -sf -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    "https://api.apify.com/v2/acts/$1/run-sync-get-dataset-items?timeout=290&clean=true" -d "$2" > "$3"
  python3 -c "import json,sys; d=json.load(open('$3')); print('  ', len(d), 'items')"
}

mkdir -p data-raw
run apify~instagram-scraper "{\"directUrls\":[\"https://www.instagram.com/$IG/\"],\"resultsType\":\"posts\",\"resultsLimit\":$LIMIT}" data-raw/instagram.json
run apify~instagram-scraper "{\"directUrls\":[\"https://www.instagram.com/$IG/\"],\"resultsType\":\"details\",\"resultsLimit\":1}" data-raw/ig_profile.json
run clockworks~tiktok-scraper "{\"profiles\":[\"$TT\"],\"resultsPerPage\":$LIMIT,\"profileScrapeSections\":[\"videos\"],\"profileSorting\":\"latest\",\"shouldDownloadVideos\":false,\"shouldDownloadCovers\":false}" data-raw/tiktok.json

python3 scripts/normalize.py
