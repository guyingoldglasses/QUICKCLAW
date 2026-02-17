#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
#  QuickClaw Launch — Find and start your OpenClaw installation
#  Place this anywhere. It will find your install automatically.
# ═══════════════════════════════════════════════════════════════════

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'
BOLD='\033[1m'; DIM='\033[2m'; NC='\033[0m'

clear
echo ""
echo -e "${CYAN}${BOLD}  ⚡ QuickClaw Launcher${NC}"
echo ""

# ─── Search for existing OpenClaw installations ───
FOUND=()

# Check local Mac install
if [[ -f "$HOME/OpenClaw/Start OpenClaw.command" ]]; then
  FOUND+=("$HOME/OpenClaw")
fi

# Check external volumes
for vol in /Volumes/*/; do
  vname=$(basename "$vol")
  if [[ "$vname" != "Macintosh HD" && "$vname" != "Macintosh HD - Data" && "$vname" != "Preboot" && "$vname" != "Recovery" && "$vname" != "VM" && "$vname" != "Update" ]]; then
    if [[ -f "${vol}OpenClaw/Start OpenClaw.command" ]]; then
      FOUND+=("${vol}OpenClaw")
    fi
  fi
done

if [[ ${#FOUND[@]} -eq 0 ]]; then
  echo -e "  ${YELLOW}⚠ No OpenClaw installation found.${NC}"
  echo ""
  echo -e "  Run ${CYAN}QuickClaw Install.command${NC} first to set up OpenClaw."
  echo ""
  read -n 1 -s -r -p "  Press any key to close..."
  exit 1
fi

if [[ ${#FOUND[@]} -eq 1 ]]; then
  INSTALL_ROOT="${FOUND[0]}"
  echo -e "  ${GREEN}✓${NC} Found: ${CYAN}${INSTALL_ROOT}${NC}"
else
  echo -e "  ${BOLD}Multiple installations found:${NC}"
  echo ""
  i=1
  for loc in "${FOUND[@]}"; do
    echo -e "  ${CYAN}${i})${NC} ${loc}"
    ((i++))
  done
  echo ""
  read -p "  Choose (1-${#FOUND[@]}): " SEL
  INSTALL_ROOT="${FOUND[$((SEL-1))]}"
fi

echo ""

# ─── Hand off to the install's own Start script ───
START_SCRIPT="$INSTALL_ROOT/Start OpenClaw.command"
if [[ -f "$START_SCRIPT" ]]; then
  echo -e "  ${CYAN}Launching from: ${INSTALL_ROOT}${NC}"
  echo ""
  exec bash "$START_SCRIPT"
else
  echo -e "  ${RED}✕ Start script not found at:${NC}"
  echo "    $START_SCRIPT"
  echo ""
  echo "  Your installation may be incomplete. Try re-running the installer."
  echo ""
  read -n 1 -s -r -p "  Press any key to close..."
fi
