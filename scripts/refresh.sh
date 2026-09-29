#!/usr/bin/env bash
# Full refresh: scrape → AI commentary (Ollama) → verify → push → GitHub Pages redeploys.
# Run by scripts/refresh_watcher.sh when the website's Refresh button is used, or by hand.
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/local/bin:$HOME/homebrew/bin:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"

log() { echo "[$(date '+%F %T')] $*"; }

# never mix unattended commits with someone's local edits
if [ -n "$(git status --porcelain)" ]; then
  log "ABORT: the working tree has uncommitted changes:"; git status --short; exit 10
fi
git pull --ff-only -q
[ -d node_modules ] || npm ci --silent

log "1/4 collecting data from Apify"
bash scripts/fetch_apify.sh --full

log "2/4 AI commentary (Ollama)"
ai_status=0
python3 scripts/ai_refresh.py || ai_status=$?
case $ai_status in
  0) ai_note="AI commentary rewritten" ;;
  3) ai_note="AI commentary kept from the previous refresh (drafts failed validation)" ;;
  *) ai_note="AI commentary step errored (exit $ai_status); previous commentary kept"
     git checkout -- src/data/insights.json 2>/dev/null || true ;;
esac
log "   $ai_note"

log "3/4 verifying (typecheck, lint, build)"
npx tsc -b
npm run -s lint
npm run -s build >/dev/null

log "4/4 publishing"
git add src/data public/thumbnails public/data-version.json
if git diff --cached --quiet; then
  log "nothing changed; nothing to publish"
else
  git commit -q -m "Refresh data and analysis ($(date +%F))" -m "$ai_note"
  git push -q
  log "pushed $(git rev-parse --short HEAD); GitHub Pages will redeploy in about a minute"
fi
echo "$ai_note"
