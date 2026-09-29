#!/usr/bin/env bash
# Polled every minute by launchd (see scripts/install_watcher.sh).
# Asks the refresh Worker whether someone entered the correct password on the website since the last
# refresh it handled; if so, runs scripts/refresh.sh. Only a timestamp is read; nothing remote is executed.
set -uo pipefail
export PATH="$HOME/local/bin:$HOME/homebrew/bin:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"
WORKER=https://social-dashboard-refresh.social-dashboard-refresh-worker.workers.dev
STATE_DIR="$HOME/.social-dashboard-refresh"
LOG="$HOME/Library/Logs/social-dashboard-refresh.log"
PROJECT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$STATE_DIR"

requested=$(curl -sf --max-time 20 "$WORKER/pending" | python3 -c "import json,sys; print(json.load(sys.stdin).get('requestedAt') or '')" 2>/dev/null) || exit 0
[ -n "$requested" ] || exit 0
[ "$requested" = "$(cat "$STATE_DIR/last_request" 2>/dev/null)" ] && exit 0

# single instance
mkdir "$STATE_DIR/lock" 2>/dev/null || exit 0
trap 'rmdir "$STATE_DIR/lock"' EXIT
echo "$requested" > "$STATE_DIR/last_request"   # mark first, so a failing refresh is not retried every minute

notify() { osascript -e "display notification \"$2\" with title \"Social dashboard\" subtitle \"$1\"" >/dev/null 2>&1 || true; }
{
  echo "==================== refresh requested on the website at $requested"
  notify "Refresh started" "Collecting data and rewriting the AI analysis…"
  if out=$(bash "$PROJECT/scripts/refresh.sh" 2>&1); then
    echo "$out"
    notify "Refresh finished" "$(echo "$out" | tail -1). Site updates in ~1 min."
  else
    echo "$out"
    notify "Refresh FAILED" "See ~/Library/Logs/social-dashboard-refresh.log"
  fi
} >> "$LOG" 2>&1
