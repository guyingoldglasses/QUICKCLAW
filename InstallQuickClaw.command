#!/bin/bash
# ─────────────────────────────────────────────────────────
#  QuickClaw Installer
#  Double-click this file to install and launch QuickClaw.
# ─────────────────────────────────────────────────────────

APP="/Applications/QuickClaw.app"
DMG_URL="https://github.com/guyingoldglasses/QUICKCLAW/releases/latest/download/QuickClaw-1.0.0-arm64.dmg"
DMG_PATH="$HOME/Downloads/QuickClaw.dmg"

clear
echo ""
echo "  ⚡ QuickClaw Installer"
echo "  ─────────────────────"
echo ""

# Check if already installed
if [ -d "$APP" ]; then
    echo "  QuickClaw is already installed."
    echo "  Preparing and launching..."
    xattr -cr "$APP" 2>/dev/null
    open "$APP"
    echo ""
    echo "  ✅ QuickClaw is running!"
    echo ""
    exit 0
fi

# Download
echo "  Downloading QuickClaw..."
curl -L -# -o "$DMG_PATH" "$DMG_URL"

if [ ! -f "$DMG_PATH" ]; then
    echo ""
    echo "  ❌ Download failed. Check your internet connection and try again."
    echo ""
    read -p "  Press Enter to close..." dummy
    exit 1
fi

# Mount the DMG
echo "  Installing..."
MOUNT_DIR=$(hdiutil attach "$DMG_PATH" -nobrowse -quiet 2>/dev/null | grep "/Volumes" | awk -F'\t' '{print $NF}')

if [ -z "$MOUNT_DIR" ]; then
    echo ""
    echo "  ❌ Could not open the installer. Try downloading manually from:"
    echo "     https://github.com/guyingoldglasses/QUICKCLAW/releases"
    echo ""
    read -p "  Press Enter to close..." dummy
    exit 1
fi

# Copy to Applications
cp -R "$MOUNT_DIR/QuickClaw.app" /Applications/ 2>/dev/null

# Unmount and clean up
hdiutil detach "$MOUNT_DIR" -quiet 2>/dev/null
rm -f "$DMG_PATH"

# Clear quarantine and launch
xattr -cr "$APP" 2>/dev/null
echo "  Launching QuickClaw..."
open "$APP"

echo ""
echo "  ✅ QuickClaw has been installed to Applications and is running!"
echo "     From now on, just open QuickClaw from Applications or Spotlight."
echo ""
