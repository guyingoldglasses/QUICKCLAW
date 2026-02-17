#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
#  QuickClaw Doctor — Health check & troubleshooter
# ═══════════════════════════════════════════════════════════════════

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'
BOLD='\033[1m'; DIM='\033[2m'; NC='\033[0m'

clear
echo ""
echo -e "${CYAN}${BOLD}  🩺 QuickClaw Doctor${NC}"
echo -e "  ${DIM}Checking your OpenClaw installation...${NC}"
echo ""

ISSUES=0
WARNINGS=0

check() {
  if eval "$2" &>/dev/null; then
    echo -e "  ${GREEN}✓${NC} $1"
  else
    echo -e "  ${RED}✕${NC} $1 — $3"
    ((ISSUES++))
  fi
}

warn() {
  if eval "$2" &>/dev/null; then
    echo -e "  ${GREEN}✓${NC} $1"
  else
    echo -e "  ${YELLOW}⚠${NC} $1 — $3"
    ((WARNINGS++))
  fi
}

# Detect install location
if [[ -d "$HOME/OpenClaw/env/.fnm" ]]; then
  ROOT="$HOME/OpenClaw"
  echo -e "  ${DIM}Install: Local Mac ($ROOT)${NC}"
else
  # Search external volumes
  for vol in /Volumes/*/OpenClaw; do
    if [[ -d "$vol/env/.fnm" ]]; then
      ROOT="$vol"
      break
    fi
  done
  if [[ -z "$ROOT" ]]; then
    echo -e "  ${RED}✕ Cannot find OpenClaw installation.${NC}"
    echo "    Expected at ~/OpenClaw or /Volumes/*/OpenClaw"
    echo ""; read -n 1 -s -r -p "Press any key to exit..."; exit 1
  fi
  echo -e "  ${DIM}Install: SSD ($ROOT)${NC}"
fi

# Source environment
export FNM_DIR="$ROOT/env/.fnm"
export PATH="$FNM_DIR/aliases/default/bin:$PATH"
export NPM_CONFIG_PREFIX="$ROOT/env/.npm-global"
export PATH="$NPM_CONFIG_PREFIX/bin:$PATH"

echo ""
echo -e "${BOLD}System${NC}"
check "macOS" "test $(uname) = Darwin" "Not macOS"
check "curl available" "command -v curl" "Install Xcode CLI tools"

echo ""
echo -e "${BOLD}Runtime${NC}"
check "fnm installed" "test -f $FNM_DIR/fnm" "Run QuickClaw Install"
check "Node.js" "command -v node" "fnm install 22"
if command -v node &>/dev/null; then
  VER=$(node --version 2>/dev/null)
  echo -e "       ${DIM}Version: $VER${NC}"
  warn "Node.js 22+" "node -e 'process.exit(parseInt(process.version.slice(1))<22?1:0)'" "Upgrade: fnm install 22"
fi
check "npm" "command -v npm" "Comes with Node.js"
check "OpenClaw CLI" "command -v openclaw" "npm install -g openclaw"
if command -v openclaw &>/dev/null; then
  echo -e "       ${DIM}Version: $(openclaw --version 2>/dev/null)${NC}"
fi
warn "Antfarm" "command -v antfarm" "Optional: curl install from GitHub"

echo ""
echo -e "${BOLD}Configuration${NC}"
check "Config dir exists" "test -d $HOME/.openclaw" "Run: openclaw configure"
check "Config file" "test -f $HOME/.openclaw/openclaw.json" "Run: openclaw configure"
check "Credentials dir" "test -d $HOME/.openclaw/credentials" "Run: openclaw configure"
warn "Config permissions (700)" "test \$(stat -f %Lp $HOME/.openclaw 2>/dev/null) = 700" "Fix: chmod 700 ~/.openclaw"
warn "Credentials permissions" "test \$(stat -f %Lp $HOME/.openclaw/credentials 2>/dev/null) = 700" "Fix: chmod 700 ~/.openclaw/credentials"

echo ""
echo -e "${BOLD}Workspace${NC}"
check "Workspace exists" "test -d $ROOT/workspace" "mkdir -p $ROOT/workspace"
warn "SOUL.md" "test -f $ROOT/workspace/SOUL.md" "Create a personality file"
warn "skills/ dir" "test -d $ROOT/workspace/skills" "mkdir -p $ROOT/workspace/skills"
SKILL_COUNT=$(ls -d "$ROOT/workspace/skills"/*/ 2>/dev/null | wc -l | tr -d ' ')
echo -e "       ${DIM}Skills installed: $SKILL_COUNT${NC}"

echo ""
echo -e "${BOLD}Dashboard${NC}"
check "Dashboard dir" "test -d $ROOT/dashboard" "Run QuickClaw Install"
check "server.js" "test -f $ROOT/dashboard/server.js" "Download from GitHub"
check "index.html" "test -f $ROOT/dashboard/public/index.html" "Download from GitHub"
check "node_modules" "test -d $ROOT/dashboard/node_modules" "cd dashboard && npm install"
warn "Auth token" "test -f $ROOT/dashboard/.auth-token" "Will be generated on first run"

echo ""
echo -e "${BOLD}Services${NC}"
if pgrep -f "openclaw-gateway" > /dev/null 2>&1; then
  echo -e "  ${GREEN}●${NC} Gateway: running (PID $(pgrep -f 'openclaw-gateway' | head -1))"
else
  echo -e "  ${DIM}○${NC} Gateway: stopped"
fi
if pgrep -f "node server.js" > /dev/null 2>&1; then
  echo -e "  ${GREEN}●${NC} Dashboard: running"
  TOKEN=$(cat "$ROOT/dashboard/.auth-token" 2>/dev/null)
  if [[ -n "$TOKEN" ]]; then
    echo -e "       ${DIM}http://localhost:18810/?token=$TOKEN${NC}"
  fi
else
  echo -e "  ${DIM}○${NC} Dashboard: stopped"
fi

echo ""
echo -e "${BOLD}Network${NC}"
FW=$(/usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate 2>/dev/null)
if echo "$FW" | grep -q "enabled"; then
  echo -e "  ${GREEN}✓${NC} macOS Firewall: enabled"
else
  echo -e "  ${YELLOW}⚠${NC} macOS Firewall: disabled — enable in System Settings → Network → Firewall"
  ((WARNINGS++))
fi

echo ""
echo -e "${BOLD}Storage${NC}"
if [[ "$ROOT" == /Volumes/* ]]; then
  DISK_INFO=$(df -h "$(dirname "$ROOT")" | tail -1)
  USED=$(echo "$DISK_INFO" | awk '{print $5}')
  FREE=$(echo "$DISK_INFO" | awk '{print $4}')
  echo -e "  ${DIM}SSD: ${USED} used, ${FREE} free${NC}"
else
  DISK_INFO=$(df -h "$ROOT" | tail -1)
  FREE=$(echo "$DISK_INFO" | awk '{print $4}')
  echo -e "  ${DIM}Disk: ${FREE} free${NC}"
fi

# ─── Summary ───
echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [[ $ISSUES -eq 0 && $WARNINGS -eq 0 ]]; then
  echo -e "  ${GREEN}${BOLD}✓ All checks passed! Your installation is healthy.${NC}"
elif [[ $ISSUES -eq 0 ]]; then
  echo -e "  ${YELLOW}${BOLD}⚠ ${WARNINGS} warning(s), no critical issues.${NC}"
else
  echo -e "  ${RED}${BOLD}✕ ${ISSUES} issue(s), ${WARNINGS} warning(s) found.${NC}"
  echo -e "  ${DIM}Fix the issues marked with ✕ above.${NC}"
fi
echo ""
read -n 1 -s -r -p "  Press any key to close..."
echo ""
