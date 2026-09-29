#!/usr/bin/env bash
# Install (or remove with --uninstall) the launchd agent that runs refresh_watcher.sh every minute.
set -euo pipefail
LABEL=com.ainchors.social-dashboard-refresh
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
PROJECT="$(cd "$(dirname "$0")/.." && pwd)"

launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
if [ "${1:-}" = "--uninstall" ]; then
  rm -f "$PLIST"; echo "removed $LABEL"; exit 0
fi

# start from the current request (if any) so an old one is not replayed
mkdir -p "$HOME/.social-dashboard-refresh"
curl -sf --max-time 20 https://social-dashboard-refresh.social-dashboard-refresh-worker.workers.dev/pending \
  | python3 -c "import json,sys; print(json.load(sys.stdin).get('requestedAt') or '')" > "$HOME/.social-dashboard-refresh/last_request" 2>/dev/null || true

mkdir -p "$HOME/Library/LaunchAgents" "$HOME/Library/Logs"
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array><string>/bin/bash</string><string>$PROJECT/scripts/refresh_watcher.sh</string></array>
  <key>StartInterval</key><integer>60</integer>
  <key>RunAtLoad</key><true/>
  <key>StandardErrorPath</key><string>$HOME/Library/Logs/social-dashboard-refresh.err.log</string>
</dict>
</plist>
EOF
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "installed $LABEL (checks for refresh requests every 60s)"
