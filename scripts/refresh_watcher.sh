#!/usr/bin/env bash
# Polled every minute by launchd (see scripts/install_watcher.sh).
# Looks for a new run of the "Request refresh" GitHub workflow — started from the website's Refresh
# button, which only repository collaborators can run — and, if there is one, runs scripts/refresh.sh.
# Nothing from GitHub is executed here: the run is only a signal.
set -uo pipefail
export PATH="$HOME/local/bin:$HOME/homebrew/bin:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"
REPO=white22266/social-dashboard
WORKFLOW=request-refresh.yml
STATE_DIR="$HOME/.social-dashboard-refresh"
LOG="$HOME/Library/Logs/social-dashboard-refresh.log"
PROJECT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$STATE_DIR"

latest=$(gh run list -R "$REPO" --workflow "$WORKFLOW" --limit 1 --json databaseId --jq '.[0].databaseId' 2>/dev/null) || exit 0
[ -n "$latest" ] || exit 0
[ "$latest" = "$(cat "$STATE_DIR/last_run_id" 2>/dev/null)" ] && exit 0

# single instance
mkdir "$STATE_DIR/lock" 2>/dev/null || exit 0
trap 'rmdir "$STATE_DIR/lock"' EXIT
echo "$latest" > "$STATE_DIR/last_run_id"   # mark first, so a failing refresh is not retried every minute

notify() { osascript -e "display notification \"$2\" with title \"Social dashboard\" subtitle \"$1\"" >/dev/null 2>&1 || true; }
{
  echo "==================== refresh requested (GitHub run $latest)"
  notify "Refresh started" "Collecting data and rewriting the AI analysis…"
  if out=$(bash "$PROJECT/scripts/refresh.sh" 2>&1); then
    echo "$out"
    notify "Refresh finished" "$(echo "$out" | tail -1). Site updates in ~1 min."
  else
    echo "$out"
    notify "Refresh FAILED" "See ~/Library/Logs/social-dashboard-refresh.log"
  fi
} >> "$LOG" 2>&1
