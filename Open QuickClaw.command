#!/bin/bash
# ─────────────────────────────────────────────────
#  QuickClaw Launcher
#  Double-click this file the FIRST time you open
#  QuickClaw after downloading. After that, you can
#  open QuickClaw directly from Applications.
# ─────────────────────────────────────────────────

APP="/Applications/QuickClaw.app"

if [ ! -d "$APP" ]; then
    echo ""
    echo "  QuickClaw is not in your Applications folder yet."
    echo "  Please drag QuickClaw.app into Applications first,"
    echo "  then double-click this file again."
    echo ""
    read -p "  Press Enter to close..." dummy
    exit 1
fi

echo ""
echo "  Preparing QuickClaw for first launch..."
xattr -cr "$APP" 2>/dev/null
echo "  Done! Launching QuickClaw..."
echo ""

open "$APP"
