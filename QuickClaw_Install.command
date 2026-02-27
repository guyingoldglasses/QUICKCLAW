#!/bin/bash
SCRIPT_DIR_ORIG="$(cd "$(dirname "$0")" && pwd)"
GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'; BOLD='\033[1m'
info()  { echo -e "${CYAN}[info]${NC}  $*"; }
ok()    { echo -e "${GREEN}[  ok]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[warn]${NC}  $*"; }

echo ""
echo "⚡ QuickClaw V3 — Installer"
echo ""

# ─── Choose install location ───
EXT=(); i=1
echo "Choose install location:"
for v in /Volumes/*/; do
  n=$(basename "$v")
  case "$n" in "Macintosh HD"|"Macintosh HD - Data"|"Recovery"|"Preboot"|"VM"|"Update"|com.apple*) continue;; esac
  [[ -w "$v" ]] || continue
  EXT+=("$v"); echo "  $i) $n"; i=$((i+1))
done
echo "  $i) Current folder"
read -p "Choose [${i}]: " ch; ch=${ch:-$i}

if [[ "$ch" == "$i" ]]; then
  BASE_DIR="$SCRIPT_DIR_ORIG"
else
  idx=$((ch-1))
  BASE_DIR="${EXT[$idx]}QuickClaw"
  mkdir -p "$BASE_DIR"
  cp "$SCRIPT_DIR_ORIG"/*.command "$BASE_DIR" 2>/dev/null || true
  cp "$SCRIPT_DIR_ORIG"/START_HERE.html "$BASE_DIR" 2>/dev/null || true
  cp "$SCRIPT_DIR_ORIG"/README.md "$BASE_DIR" 2>/dev/null || true
  cp -R "$SCRIPT_DIR_ORIG"/dashboard-files "$BASE_DIR" 2>/dev/null || true
  chmod +x "$BASE_DIR"/*.command 2>/dev/null || true
  xattr -dr com.apple.quarantine "$BASE_DIR" 2>/dev/null || true
fi

OPENCLAW_HOME="$BASE_DIR/openclaw-state"
DATA_DIR="$BASE_DIR/dashboard-data"

# ─── Check for existing dashboard data ───
if [[ -f "$DATA_DIR/settings.json" ]]; then
  echo ""
  warn "Found existing dashboard settings."
  read -p "   Reset for a fresh start? (y/N): " reset_data
  if [[ "$reset_data" == "y" || "$reset_data" == "Y" ]]; then
    rm -rf "$DATA_DIR.bak" 2>/dev/null; mv "$DATA_DIR" "$DATA_DIR.bak" 2>/dev/null || true
    mkdir -p "$DATA_DIR"; ok "Dashboard data reset!"
  fi
fi
mkdir -p "$DATA_DIR"

# ─── Handle OpenClaw data: migrate to drive ───
echo ""
HAS_MAC_DATA=false; HAS_DRIVE_DATA=false
[[ -d "$HOME/.openclaw" && ! -L "$HOME/.openclaw" ]] && HAS_MAC_DATA=true
[[ -d "$OPENCLAW_HOME" && -f "$OPENCLAW_HOME/openclaw.json" ]] && HAS_DRIVE_DATA=true

if $HAS_MAC_DATA || $HAS_DRIVE_DATA; then
  echo -e "${YELLOW}Found existing OpenClaw data:${NC}"
  $HAS_MAC_DATA && echo "  • On your Mac: ~/.openclaw/"
  $HAS_DRIVE_DATA && echo "  • On this drive: $OPENCLAW_HOME/"
  echo ""
  echo "  1) Fresh start — wipe everything (recommended for clean test)"
  echo "  2) Keep drive data, clear Mac data"
  $HAS_MAC_DATA && ! $HAS_DRIVE_DATA && echo "  3) Migrate Mac → drive"
  echo "  4) Keep everything"
  read -p "  Choose [1]: " dc; dc=${dc:-1}
  case "$dc" in
    1)
      info "Wiping all OpenClaw data..."
      if $HAS_MAC_DATA; then rm -rf "$HOME/.openclaw.old" 2>/dev/null; mv "$HOME/.openclaw" "$HOME/.openclaw.old" 2>/dev/null || rm -rf "$HOME/.openclaw"; fi
      [[ -L "$HOME/.openclaw" ]] && rm "$HOME/.openclaw"
      if $HAS_DRIVE_DATA; then rm -rf "$OPENCLAW_HOME.old" 2>/dev/null; mv "$OPENCLAW_HOME" "$OPENCLAW_HOME.old" 2>/dev/null || rm -rf "$OPENCLAW_HOME"; fi
      rm -f "$HOME/Library/LaunchAgents/ai.openclaw.gateway.plist" 2>/dev/null
      launchctl bootout "gui/$(id -u)/ai.openclaw.gateway" 2>/dev/null || true
      ok "Clean slate!"
      ;;
    2)
      if $HAS_MAC_DATA; then rm -rf "$HOME/.openclaw.old" 2>/dev/null; mv "$HOME/.openclaw" "$HOME/.openclaw.old" 2>/dev/null || rm -rf "$HOME/.openclaw"; fi
      [[ -L "$HOME/.openclaw" ]] && rm "$HOME/.openclaw"
      ok "Mac data cleared."
      ;;
    3)
      if $HAS_MAC_DATA && ! $HAS_DRIVE_DATA; then
        mkdir -p "$OPENCLAW_HOME"; cp -a "$HOME/.openclaw/." "$OPENCLAW_HOME/" 2>/dev/null; rm -rf "$HOME/.openclaw"
        ok "Migrated to drive."
      fi
      ;;
    4) info "Keeping everything.";;
  esac
else
  info "No existing OpenClaw data — fresh install!"
fi

# ─── Create openclaw-state on drive + symlink ───
mkdir -p "$OPENCLAW_HOME"
if [[ -L "$HOME/.openclaw" ]]; then
  current=$(readlink "$HOME/.openclaw")
  if [[ "$current" != "$OPENCLAW_HOME" ]]; then
    rm "$HOME/.openclaw"; ln -s "$OPENCLAW_HOME" "$HOME/.openclaw"
    ok "Updated symlink: ~/.openclaw → $OPENCLAW_HOME"
  else
    ok "Symlink correct: ~/.openclaw → $OPENCLAW_HOME"
  fi
elif [[ -d "$HOME/.openclaw" ]]; then
  warn "~/.openclaw is still a directory — migrating to drive..."
  cp -a "$HOME/.openclaw/." "$OPENCLAW_HOME/" 2>/dev/null; rm -rf "$HOME/.openclaw"
  ln -s "$OPENCLAW_HOME" "$HOME/.openclaw"
  ok "Migrated + symlinked"
else
  ln -s "$OPENCLAW_HOME" "$HOME/.openclaw"
  ok "Created symlink: ~/.openclaw → $OPENCLAW_HOME"
fi

echo ""
ok "All OpenClaw data stored on this drive."
info "Unplug drive = bot fully off, zero traces on Mac."
echo ""

rm -f "$DATA_DIR/.setup-complete" 2>/dev/null

# ─── Install deps ───
INSTALL_DIR="$BASE_DIR/openclaw"; DASHBOARD_DIR="$BASE_DIR/dashboard-files"; LOG_DIR="$BASE_DIR/logs"
mkdir -p "$INSTALL_DIR" "$LOG_DIR"
echo "$BASE_DIR" > "$BASE_DIR/.quickclaw-root"
[[ "$BASE_DIR" != "$SCRIPT_DIR_ORIG" ]] && echo "$BASE_DIR" > "$SCRIPT_DIR_ORIG/.quickclaw-root"
[[ -f /opt/homebrew/bin/brew ]] && eval "$(/opt/homebrew/bin/brew shellenv)"
command -v brew >/dev/null || /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
command -v node >/dev/null || brew install node
cd "$INSTALL_DIR"
[[ -f package.json ]] || echo '{"name":"quickclaw-v3-openclaw","private":true,"dependencies":{}}' > package.json
npm install --no-fund --no-audit openclaw || true
mkdir -p "$INSTALL_DIR/config"
[[ -f "$INSTALL_DIR/config/default.yaml" ]] || cat > "$INSTALL_DIR/config/default.yaml" <<'YAML'
gateway:
  port: 5000
  host: 0.0.0.0
YAML
cd "$DASHBOARD_DIR"
[[ -f package.json ]] || echo '{"name":"quickclaw-v3-dashboard","private":true,"scripts":{"start":"node server.js"},"dependencies":{"express":"^4.18.2"}}' > package.json
npm install --production --no-fund --no-audit
bash "$BASE_DIR/QuickClaw_Launch.command"
