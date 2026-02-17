#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
#  QuickClaw Installer v1.0
#  One-click OpenClaw setup for macOS (local or external SSD)
#  https://guyingoldglasses.com/install
# ═══════════════════════════════════════════════════════════════════

set -e

# ─── Colors ───
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'
BLUE='\033[0;34m'; MAGENTA='\033[0;35m'; BOLD='\033[1m'; DIM='\033[2m'; NC='\033[0m'

clear
echo ""
echo -e "${CYAN}${BOLD}"
echo "  ╔══════════════════════════════════════════════════╗"
echo "  ║                                                  ║"
echo "  ║     ⚡ QuickClaw Installer v1.0                  ║"
echo "  ║     OpenClaw + Command Center Dashboard          ║"
echo "  ║                                                  ║"
echo "  ╚══════════════════════════════════════════════════╝"
echo -e "${NC}"
echo -e "  ${DIM}Your AI agent, running on your hardware.${NC}"
echo ""

# ─── Pre-flight checks ───
echo -e "${BOLD}Pre-flight checks...${NC}"
if [[ "$(uname)" != "Darwin" ]]; then
  echo -e "${RED}✕ This installer is for macOS only.${NC}"
  echo "  For VPS/Linux setup, visit: https://guyingoldglasses.com/install"
  echo ""; read -n 1 -s -r -p "Press any key to exit..."; exit 1
fi
echo -e "  ${GREEN}✓${NC} macOS $(sw_vers -productVersion) detected"

if ! command -v curl &>/dev/null; then
  echo -e "  ${RED}✕ curl not found. Please install Xcode Command Line Tools:${NC}"
  echo "    xcode-select --install"
  echo ""; read -n 1 -s -r -p "Press any key to exit..."; exit 1
fi
echo -e "  ${GREEN}✓${NC} curl available"
echo ""

# ─── Installation Mode ───
echo -e "${BOLD}Where would you like to install OpenClaw?${NC}"
echo ""
echo -e "  ${CYAN}1)${NC} This Mac ${DIM}(installs to ~/OpenClaw)${NC}"
echo -e "  ${CYAN}2)${NC} External SSD ${DIM}(portable — take it anywhere)${NC}"
echo ""
read -p "  Choose (1 or 2): " MODE
echo ""

if [[ "$MODE" == "2" ]]; then
  # ─── SSD Selection ───
  echo -e "${BOLD}Available external volumes:${NC}"
  echo ""
  VOLS=()
  i=1
  while IFS= read -r vol; do
    vname=$(basename "$vol")
    if [[ "$vname" != "Macintosh HD" && "$vname" != "Macintosh HD - Data" && "$vname" != "Preboot" && "$vname" != "Recovery" && "$vname" != "VM" && "$vname" != "Update" ]]; then
      vsize=$(df -h "$vol" 2>/dev/null | tail -1 | awk '{print $4}')
      echo -e "  ${CYAN}${i})${NC} ${vname} ${DIM}(${vsize} free)${NC}"
      VOLS+=("$vol")
      ((i++))
    fi
  done < <(ls -d /Volumes/*/ 2>/dev/null)

  if [[ ${#VOLS[@]} -eq 0 ]]; then
    echo -e "  ${YELLOW}⚠ No external drives found.${NC}"
    echo "  Please connect your SSD and try again."
    echo ""; read -n 1 -s -r -p "Press any key to exit..."; exit 1
  fi
  echo ""
  read -p "  Choose volume number: " VNUM
  SELECTED_VOL="${VOLS[$((VNUM-1))]%/}"
  INSTALL_ROOT="${SELECTED_VOL}/OpenClaw"
  INSTALL_TYPE="ssd"
  VOLUME_NAME=$(basename "${SELECTED_VOL}")
else
  INSTALL_ROOT="$HOME/OpenClaw"
  INSTALL_TYPE="local"
  VOLUME_NAME="Local"
fi

echo ""
echo -e "${BOLD}Install location:${NC} ${CYAN}${INSTALL_ROOT}${NC}"
echo ""
read -p "Continue? (y/n): " CONFIRM
if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
  echo "Cancelled."; exit 0
fi
echo ""

# ─── Create directory structure ───
echo -e "${BOLD}Setting up directories...${NC}"
mkdir -p "$INSTALL_ROOT"
mkdir -p "$INSTALL_ROOT/env/.fnm"
mkdir -p "$INSTALL_ROOT/env/.npm-global"
mkdir -p "$INSTALL_ROOT/workspace"
mkdir -p "$INSTALL_ROOT/workspace/skills"
mkdir -p "$INSTALL_ROOT/workspace/memory"
mkdir -p "$INSTALL_ROOT/dashboard/public"
mkdir -p "$INSTALL_ROOT/data"
mkdir -p "$INSTALL_ROOT/logs"
mkdir -p "$INSTALL_ROOT/backups"
echo -e "  ${GREEN}✓${NC} Directories created"

# ─── Install Node.js (portable via fnm) ───
echo ""
echo -e "${BOLD}Installing Node.js (portable)...${NC}"
FNM_DIR="$INSTALL_ROOT/env/.fnm"

if [[ -f "$FNM_DIR/fnm" ]]; then
  echo -e "  ${GREEN}✓${NC} fnm already installed"
else
  ARCH=$(uname -m)
  if [[ "$ARCH" == "arm64" ]]; then
    FNM_ASSET="fnm-macos.zip"
  else
    FNM_ASSET="fnm-macos.zip"
  fi
  echo -e "  ${DIM}Downloading fnm for ${ARCH}...${NC}"
  curl -fsSL "https://github.com/Schniz/fnm/releases/latest/download/${FNM_ASSET}" -o "$FNM_DIR/fnm.zip"
  unzip -qo "$FNM_DIR/fnm.zip" -d "$FNM_DIR"
  rm -f "$FNM_DIR/fnm.zip"
  chmod +x "$FNM_DIR/fnm"
  echo -e "  ${GREEN}✓${NC} fnm installed"
fi

# Set up portable environment
export FNM_DIR="$INSTALL_ROOT/env/.fnm"
export PATH="$FNM_DIR:$PATH"
eval "$("$FNM_DIR/fnm" env --shell bash 2>/dev/null)" 2>/dev/null || true
export PATH="$FNM_DIR/aliases/default/bin:$PATH"
export NPM_CONFIG_PREFIX="$INSTALL_ROOT/env/.npm-global"
export PATH="$NPM_CONFIG_PREFIX/bin:$PATH"

if command -v node &>/dev/null && [[ "$(node --version 2>/dev/null)" == v22* ]]; then
  echo -e "  ${GREEN}✓${NC} Node.js $(node --version) already installed"
else
  echo -e "  ${DIM}Installing Node.js 22 (this may take a minute)...${NC}"
  "$FNM_DIR/fnm" install 22 2>/dev/null
  "$FNM_DIR/fnm" default 22 2>/dev/null
  # Re-export after install
  export PATH="$FNM_DIR/aliases/default/bin:$PATH"
  echo -e "  ${GREEN}✓${NC} Node.js $(node --version) installed"
fi

# ─── Install OpenClaw ───
echo ""
echo -e "${BOLD}Installing OpenClaw...${NC}"
if command -v openclaw &>/dev/null; then
  CURRENT_VER=$(openclaw --version 2>/dev/null)
  echo -e "  ${GREEN}✓${NC} OpenClaw ${CURRENT_VER} already installed, checking for updates..."
  npm update -g openclaw 2>/dev/null
else
  echo -e "  ${DIM}Installing from npm (this may take a minute)...${NC}"
  npm install -g openclaw@latest 2>/dev/null
fi
OC_VER=$(openclaw --version 2>/dev/null)
echo -e "  ${GREEN}✓${NC} OpenClaw ${OC_VER} ready"

# ─── Install Antfarm ───
echo ""
echo -e "${BOLD}Installing Antfarm (multi-agent workflows)...${NC}"
if command -v antfarm &>/dev/null; then
  echo -e "  ${GREEN}✓${NC} Antfarm already installed"
else
  echo -e "  ${DIM}Installing from GitHub...${NC}"
  curl -fsSL https://raw.githubusercontent.com/snarktank/antfarm/v0.5.1/scripts/install.sh | bash 2>/dev/null
  if command -v antfarm &>/dev/null; then
    echo -e "  ${GREEN}✓${NC} Antfarm installed"
  else
    echo -e "  ${YELLOW}⚠${NC} Antfarm install skipped (can add later)"
  fi
fi

# ─── Configure OpenClaw ───
echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}  Configure Your Bot${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Bot name
read -p "  Give your bot a name (default: MyOpenClaw): " BOT_NAME
BOT_NAME="${BOT_NAME:-MyOpenClaw}"

# API Provider
echo ""
echo -e "  ${BOLD}Which AI provider will you use?${NC}"
echo -e "  ${CYAN}1)${NC} Anthropic (Claude) ${DIM}— recommended${NC}"
echo -e "  ${CYAN}2)${NC} OpenAI (GPT)"
echo -e "  ${CYAN}3)${NC} Both"
read -p "  Choose (1/2/3): " PROVIDER

API_KEY_ANTHROPIC=""
API_KEY_OPENAI=""
PRIMARY_MODEL=""

if [[ "$PROVIDER" == "1" || "$PROVIDER" == "3" ]]; then
  echo ""
  echo -e "  Get your Anthropic key at: ${CYAN}https://console.anthropic.com${NC}"
  read -s -p "  Anthropic API key: " API_KEY_ANTHROPIC
  echo ""
  PRIMARY_MODEL="anthropic/claude-haiku-4-5"
fi
if [[ "$PROVIDER" == "2" || "$PROVIDER" == "3" ]]; then
  echo ""
  echo -e "  Get your OpenAI key at: ${CYAN}https://platform.openai.com${NC}"
  read -s -p "  OpenAI API key: " API_KEY_OPENAI
  echo ""
  if [[ -z "$PRIMARY_MODEL" ]]; then
    PRIMARY_MODEL="openai/gpt-4o-mini"
  fi
fi

# Model selection
echo ""
echo -e "  ${BOLD}Primary model:${NC}"
if [[ "$PROVIDER" == "1" ]]; then
  echo -e "  ${CYAN}1)${NC} claude-haiku-4-5 ${DIM}— fast & cheap (recommended to start)${NC}"
  echo -e "  ${CYAN}2)${NC} claude-sonnet-4-5 ${DIM}— balanced${NC}"
  echo -e "  ${CYAN}3)${NC} claude-opus-4-5 ${DIM}— most capable${NC}"
  read -p "  Choose (1/2/3): " MSEL
  case "$MSEL" in
    2) PRIMARY_MODEL="anthropic/claude-sonnet-4-5" ;;
    3) PRIMARY_MODEL="anthropic/claude-opus-4-5" ;;
    *) PRIMARY_MODEL="anthropic/claude-haiku-4-5" ;;
  esac
elif [[ "$PROVIDER" == "2" ]]; then
  echo -e "  ${CYAN}1)${NC} gpt-4o-mini ${DIM}— fast & cheap (recommended to start)${NC}"
  echo -e "  ${CYAN}2)${NC} gpt-4o ${DIM}— balanced${NC}"
  echo -e "  ${CYAN}3)${NC} gpt-5-mini ${DIM}— most capable${NC}"
  read -p "  Choose (1/2/3): " MSEL
  case "$MSEL" in
    2) PRIMARY_MODEL="openai/gpt-4o" ;;
    3) PRIMARY_MODEL="openai/gpt-5-mini" ;;
    *) PRIMARY_MODEL="openai/gpt-4o-mini" ;;
  esac
else
  echo -e "  Using: ${CYAN}${PRIMARY_MODEL}${NC} (change anytime in dashboard)"
fi

# Telegram setup
echo ""
echo -e "  ${BOLD}Telegram Bot (optional)${NC}"
echo -e "  ${DIM}Message @BotFather on Telegram to create a bot and get a token.${NC}"
read -p "  Telegram bot token (or press Enter to skip): " TG_TOKEN

# Gateway port
GATEWAY_PORT=18789
echo ""
read -p "  Gateway port (default 18789): " CUSTOM_PORT
GATEWAY_PORT="${CUSTOM_PORT:-18789}"

# ─── Set workspace path ───
WORKSPACE="$INSTALL_ROOT/workspace"

# ─── Run openclaw configure (non-interactive fallback) ───
echo ""
echo -e "${BOLD}Writing configuration...${NC}"

# Generate auth token
AUTH_TOKEN=$(openssl rand -hex 24)

# Build config JSON
CONFIG_DIR="$HOME/.openclaw"
mkdir -p "$CONFIG_DIR/credentials"
chmod 700 "$CONFIG_DIR"
chmod 700 "$CONFIG_DIR/credentials"

cat > "$CONFIG_DIR/openclaw.json" << CONF
{
  "meta": {
    "name": "${BOT_NAME}",
    "lastTouchedVersion": "${OC_VER}",
    "lastTouchedAt": "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "${PRIMARY_MODEL}",
        "fallbacks": []
      },
      "workspace": "${WORKSPACE}",
      "compaction": {
        "mode": "safeguard"
      },
      "maxConcurrent": 4,
      "subagents": {
        "maxConcurrent": 8
      }
    }
  },
  "tools": {
    "web": {
      "search": { "enabled": false },
      "fetch": { "enabled": true }
    }
  },
  "channels": {
    "telegram": {
      "enabled": $([ -n "$TG_TOKEN" ] && echo "true" || echo "false"),
      "dmPolicy": "pairing",
      "botToken": "${TG_TOKEN}",
      "groupPolicy": "allowlist",
      "streamMode": "partial"
    }
  },
  "gateway": {
    "port": ${GATEWAY_PORT},
    "mode": "local",
    "auth": {
      "mode": "token",
      "token": "${AUTH_TOKEN}"
    }
  },
  "plugins": {
    "entries": {
      "telegram": {
        "enabled": $([ -n "$TG_TOKEN" ] && echo "true" || echo "false")
      }
    }
  }
}
CONF

# Store API keys in credentials
if [[ -n "$API_KEY_ANTHROPIC" ]]; then
  cat > "$CONFIG_DIR/credentials/anthropic.json" << CRED
{"apiKey":"${API_KEY_ANTHROPIC}"}
CRED
  chmod 600 "$CONFIG_DIR/credentials/anthropic.json"
fi
if [[ -n "$API_KEY_OPENAI" ]]; then
  cat > "$CONFIG_DIR/credentials/openai.json" << CRED
{"apiKey":"${API_KEY_OPENAI}"}
CRED
  chmod 600 "$CONFIG_DIR/credentials/openai.json"
fi

echo -e "  ${GREEN}✓${NC} Configuration saved"

# ─── Create SOUL.md ───
cat > "$WORKSPACE/SOUL.md" << 'SOUL'
# My OpenClaw Agent

You are a helpful, capable AI assistant. You have access to tools for file management, web browsing, and various skills.

## Personality
- Be concise but thorough
- Ask clarifying questions when needed
- Proactively suggest improvements
- Be honest about limitations

## Guidelines
- Always confirm before making destructive changes
- Keep responses focused and actionable
- Use markdown formatting when it helps clarity
SOUL
echo -e "  ${GREEN}✓${NC} SOUL.md created"

# ─── Install Dashboard ───
echo ""
echo -e "${BOLD}Installing Command Center Dashboard...${NC}"

DASH_DIR="$INSTALL_ROOT/dashboard"
cd "$DASH_DIR"

if [[ ! -f "$DASH_DIR/node_modules/.package-lock.json" ]]; then
  npm init -y > /dev/null 2>&1
  npm install express ws 2>/dev/null
fi

# Generate dashboard auth token
DASH_TOKEN=$(openssl rand -hex 24)
echo "$DASH_TOKEN" > "$DASH_DIR/.auth-token"
chmod 600 "$DASH_DIR/.auth-token"

echo -e "  ${GREEN}✓${NC} Dashboard dependencies installed"

# Copy dashboard files if bundled alongside installer
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "$SCRIPT_DIR/dashboard-files/server.js" ]]; then
  cp "$SCRIPT_DIR/dashboard-files/server.js" "$DASH_DIR/server.js"
  mkdir -p "$DASH_DIR/public"
  cp "$SCRIPT_DIR/dashboard-files/public/index.html" "$DASH_DIR/public/index.html"
  echo -e "  ${GREEN}✓${NC} Dashboard files installed from package"
  DASH_READY=true
elif [[ -f "$DASH_DIR/server.js" ]]; then
  echo -e "  ${GREEN}✓${NC} Dashboard files already present"
  DASH_READY=true
else
  echo -e "  ${YELLOW}⚠${NC} Dashboard files not found."
  echo -e "  ${DIM}Download the latest dashboard from:${NC}"
  echo -e "  ${CYAN}https://github.com/guyingoldglasses/quickclaw/releases${NC}"
  echo -e "  ${DIM}Place server.js and public/index.html in: ${DASH_DIR}${NC}"
  DASH_READY=false
fi

# ─── Create launcher scripts ───
echo ""
echo -e "${BOLD}Creating launcher scripts...${NC}"

# Start script — with health-check loop (no more blind sleep)
cat > "$INSTALL_ROOT/Start OpenClaw.command" << 'STARTEOF'
#!/bin/bash
clear
echo ""
echo -e "\033[0;36m\033[1m  ⚡ OpenClaw — Starting up...\033[0m"
echo ""

# ── Auto-detect install root from this script's location ──
INSTALL_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export FNM_DIR="$INSTALL_ROOT/env/.fnm"
export PATH="$INSTALL_ROOT/env/.fnm/aliases/default/bin:$PATH"
export NPM_CONFIG_PREFIX="$INSTALL_ROOT/env/.npm-global"
export PATH="$NPM_CONFIG_PREFIX/bin:$PATH"

# ── Start dashboard in background ──
DASH_PID=""
if [[ -f "$INSTALL_ROOT/dashboard/server.js" ]]; then
  echo "  📊 Starting Dashboard..."
  cd "$INSTALL_ROOT/dashboard"
  node server.js &
  DASH_PID=$!

  # Wait for dashboard to actually be ready (up to 15 seconds)
  TOKEN=$(cat "$INSTALL_ROOT/dashboard/.auth-token" 2>/dev/null)
  DASH_URL="http://localhost:18810/?token=$TOKEN"
  echo -n "     Waiting for dashboard"
  for i in $(seq 1 30); do
    if curl -sf "http://localhost:18810/api/health" > /dev/null 2>&1; then
      echo ""
      echo "  📊 Dashboard ready: $DASH_URL"
      echo ""
      open "$DASH_URL"
      break
    fi
    echo -n "."
    sleep 0.5
  done
  # If loop finished without break, warn but continue
  if ! curl -sf "http://localhost:18810/api/health" > /dev/null 2>&1; then
    echo ""
    echo "  ⚠️  Dashboard may still be starting — try opening manually:"
    echo "     $DASH_URL"
    echo ""
  fi
fi

# ── Read gateway port from config ──
GW_PORT=$(grep -o '"port": *[0-9]*' "$HOME/.openclaw/openclaw.json" 2>/dev/null | head -1 | grep -o '[0-9]*')
GW_PORT="${GW_PORT:-18789}"

# ── Start gateway (foreground) ──
echo "  🦞 Starting Gateway on port $GW_PORT..."
echo ""
cd "$INSTALL_ROOT/workspace"
openclaw gateway --port "$GW_PORT"

# ── Cleanup on exit ──
echo ""
echo "  🛑 Stopping Dashboard..."
kill $DASH_PID 2>/dev/null
echo "  ✅ All stopped."
echo ""
echo "  Press any key to close..."
read -n 1
STARTEOF
chmod +x "$INSTALL_ROOT/Start OpenClaw.command"

# Stop script
cat > "$INSTALL_ROOT/Stop OpenClaw.command" << 'STOPEOF'
#!/bin/bash
echo ""
echo "🛑 Stopping OpenClaw safely..."
echo ""

pkill -f "openclaw-gateway" 2>/dev/null
pkill -f "openclaw.gateway" 2>/dev/null
sleep 2

# Stop dashboard
pkill -f "node.*server.js" 2>/dev/null
sleep 1

if pgrep -f "openclaw-gateway" > /dev/null 2>&1; then
  pkill -9 -f "openclaw-gateway" 2>/dev/null
fi

echo "✅ All stopped."
STOPEOF

# Add SSD eject if on external drive
if [[ "$INSTALL_TYPE" == "ssd" ]]; then
  cat >> "$INSTALL_ROOT/Stop OpenClaw.command" << EJECTEOF
echo ""
echo "Ejecting SSD in 3 seconds..."
sleep 3
diskutil eject /Volumes/${VOLUME_NAME}
echo "🔌 SSD ejected. Safe to unplug!"
EJECTEOF
fi

cat >> "$INSTALL_ROOT/Stop OpenClaw.command" << 'TAILEOF'
echo ""
echo "Press any key to close..."
read -n 1
TAILEOF
chmod +x "$INSTALL_ROOT/Stop OpenClaw.command"

# Update script
cat > "$INSTALL_ROOT/Update OpenClaw.command" << 'UPDATEEOF'
#!/bin/bash
clear
echo ""
echo -e "\033[0;36m\033[1m  🔄 OpenClaw Updater\033[0m"
echo ""

INSTALL_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export FNM_DIR="$INSTALL_ROOT/env/.fnm"
export PATH="$INSTALL_ROOT/env/.fnm/aliases/default/bin:$PATH"
export NPM_CONFIG_PREFIX="$INSTALL_ROOT/env/.npm-global"
export PATH="$NPM_CONFIG_PREFIX/bin:$PATH"

echo "  Current: $(openclaw --version 2>/dev/null)"
echo "  Updating..."
npm update -g openclaw 2>/dev/null
echo "  Updated: $(openclaw --version 2>/dev/null)"
echo ""

echo "  Updating skills..."
npx clawhub@latest update --all 2>/dev/null
echo ""

echo "  ✅ Update complete!"
echo ""
echo "  Press any key to close..."
read -n 1
UPDATEEOF
chmod +x "$INSTALL_ROOT/Update OpenClaw.command"

# Backup script
cat > "$INSTALL_ROOT/Backup OpenClaw.command" << 'BACKUPEOF'
#!/bin/bash
clear
echo ""
echo -e "\033[0;36m\033[1m  💾 OpenClaw Backup\033[0m"
echo ""

INSTALL_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TS=$(date +%Y-%m-%d_%H%M%S)
BACKUP_FILE="$INSTALL_ROOT/backups/openclaw-backup-${TS}.tar.gz"
mkdir -p "$INSTALL_ROOT/backups"

echo "  Creating backup..."
tar -czf "$BACKUP_FILE" \
  -C "$HOME" .openclaw \
  -C "$INSTALL_ROOT" workspace dashboard/server.js dashboard/public 2>/dev/null

SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "  ✅ Backup saved: $BACKUP_FILE ($SIZE)"
echo ""
echo "  Press any key to close..."
read -n 1
BACKUPEOF
chmod +x "$INSTALL_ROOT/Backup OpenClaw.command"

# Terminal helper (oc command)
cat > "$INSTALL_ROOT/oc" << 'OCEOF'
#!/bin/bash
INSTALL_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export FNM_DIR="$INSTALL_ROOT/env/.fnm"
export PATH="$INSTALL_ROOT/env/.fnm/aliases/default/bin:$PATH"
export NPM_CONFIG_PREFIX="$INSTALL_ROOT/env/.npm-global"
export PATH="$NPM_CONFIG_PREFIX/bin:$PATH"
openclaw "$@"
OCEOF
chmod +x "$INSTALL_ROOT/oc"

echo -e "  ${GREEN}✓${NC} Start OpenClaw.command"
echo -e "  ${GREEN}✓${NC} Stop OpenClaw.command"
echo -e "  ${GREEN}✓${NC} Update OpenClaw.command"
echo -e "  ${GREEN}✓${NC} Backup OpenClaw.command"
echo -e "  ${GREEN}✓${NC} oc (terminal shortcut)"

# ─── Security ───
echo ""
echo -e "${BOLD}Securing installation...${NC}"
chmod 700 "$CONFIG_DIR"
chmod 700 "$CONFIG_DIR/credentials" 2>/dev/null
chmod 700 "$INSTALL_ROOT/data"
echo -e "  ${GREEN}✓${NC} Permissions hardened"

# ─── Summary ───
echo ""
echo -e "${CYAN}${BOLD}"
echo "  ╔══════════════════════════════════════════════════╗"
echo "  ║                                                  ║"
echo "  ║     ✅ Installation Complete!                    ║"
echo "  ║                                                  ║"
echo "  ╚══════════════════════════════════════════════════╝"
echo -e "${NC}"
echo -e "  ${BOLD}Bot Name:${NC}      ${BOT_NAME}"
echo -e "  ${BOLD}Model:${NC}         ${PRIMARY_MODEL}"
echo -e "  ${BOLD}Install:${NC}       ${INSTALL_ROOT}"
echo -e "  ${BOLD}Gateway:${NC}       ws://127.0.0.1:${GATEWAY_PORT}"
echo -e "  ${BOLD}Dashboard:${NC}     http://localhost:18810"
echo -e "  ${BOLD}OpenClaw:${NC}      ${OC_VER}"
echo -e "  ${BOLD}Node.js:${NC}       $(node --version 2>/dev/null)"
if [[ -n "$TG_TOKEN" ]]; then
  echo -e "  ${BOLD}Telegram:${NC}      ${GREEN}Enabled${NC}"
fi
echo ""
echo -e "  ${BOLD}Quick Start:${NC}"
echo -e "    Double-click ${CYAN}Start OpenClaw.command${NC}"
echo -e "    The dashboard will open in your browser automatically."
echo ""
echo -e "  ${BOLD}Launcher Scripts:${NC}"
echo -e "    📂 ${INSTALL_ROOT}/"
echo -e "       ├── ${GREEN}Start OpenClaw.command${NC}   — Launch everything"
echo -e "       ├── ${RED}Stop OpenClaw.command${NC}    — Shut down safely"
echo -e "       ├── ${BLUE}Update OpenClaw.command${NC}  — Update to latest"
echo -e "       ├── ${YELLOW}Backup OpenClaw.command${NC}  — Backup configs"
echo -e "       └── ${MAGENTA}oc${NC}                       — Terminal shortcut"
echo ""
echo -e "  ${DIM}Need help? Visit https://guyingoldglasses.com/install${NC}"
echo ""

# ─── Launch now? ───
echo -e "${BOLD}Would you like to launch OpenClaw now?${NC}"
read -p "  Start dashboard + gateway? (y/n): " LAUNCH_NOW
echo ""

if [[ "$LAUNCH_NOW" == "y" || "$LAUNCH_NOW" == "Y" ]]; then
  echo -e "  ${CYAN}Starting Dashboard...${NC}"

  cd "$INSTALL_ROOT/dashboard"
  node server.js &
  DASH_PID=$!

  # Health-check: wait for dashboard to respond (up to 15 seconds)
  DASH_TOKEN=$(cat "$INSTALL_ROOT/dashboard/.auth-token" 2>/dev/null)
  DASH_URL="http://localhost:18810/?token=$DASH_TOKEN"
  echo -n "  Waiting for dashboard"
  DASH_OK=false
  for i in $(seq 1 30); do
    if curl -sf "http://localhost:18810/api/health" > /dev/null 2>&1; then
      DASH_OK=true
      break
    fi
    echo -n "."
    sleep 0.5
  done
  echo ""

  if $DASH_OK; then
    echo -e "  ${GREEN}✓${NC} Dashboard is live!"
    echo -e "  ${CYAN}Opening in browser...${NC}"
    open "$DASH_URL"
  else
    echo -e "  ${YELLOW}⚠${NC} Dashboard may still be starting."
    echo -e "  ${DIM}Try opening manually: ${DASH_URL}${NC}"
  fi

  echo ""
  echo -e "  ${CYAN}Starting Gateway on port ${GATEWAY_PORT}...${NC}"
  echo -e "  ${DIM}(Press Ctrl+C to stop)${NC}"
  echo ""

  cd "$WORKSPACE"
  openclaw gateway --port "$GATEWAY_PORT"

  # Cleanup after gateway exits
  echo ""
  echo -e "  ${DIM}Stopping dashboard...${NC}"
  kill $DASH_PID 2>/dev/null
  echo -e "  ${GREEN}✓${NC} All stopped."
  echo ""
  read -n 1 -s -r -p "  Press any key to close..."
  echo ""
else
  echo -e "  ${DIM}No problem! When you're ready:${NC}"
  echo -e "  Double-click ${CYAN}Start OpenClaw.command${NC} in:"
  echo -e "  ${CYAN}${INSTALL_ROOT}/${NC}"
  echo ""
  read -n 1 -s -r -p "  Press any key to close..."
  echo ""
fi
