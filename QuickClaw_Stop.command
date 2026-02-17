#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
#  QuickClaw Stop — Shut down OpenClaw and safely eject SSD
# ═══════════════════════════════════════════════════════════════════

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'
BOLD='\033[1m'; DIM='\033[2m'; NC='\033[0m'

clear
echo ""
echo -e "${RED}${BOLD}  🛑 QuickClaw — Shutting Down${NC}"
echo ""

# ─── Stop gateway ───
if pgrep -f "openclaw.gateway" > /dev/null 2>&1; then
  echo -e "  ${DIM}Stopping gateway...${NC}"
  pkill -f "openclaw-gateway" 2>/dev/null
  pkill -f "openclaw.gateway" 2>/dev/null
  sleep 2
  # Force kill if still running
  if pgrep -f "openclaw.gateway" > /dev/null 2>&1; then
    pkill -9 -f "openclaw-gateway" 2>/dev/null
    sleep 1
  fi
  echo -e "  ${GREEN}✓${NC} Gateway stopped"
else
  echo -e "  ${DIM}Gateway not running${NC}"
fi

# ─── Stop dashboard ───
if pgrep -f "node.*server.js" > /dev/null 2>&1; then
  echo -e "  ${DIM}Stopping dashboard...${NC}"
  pkill -f "node.*server.js" 2>/dev/null
  sleep 1
  echo -e "  ${GREEN}✓${NC} Dashboard stopped"
else
  echo -e "  ${DIM}Dashboard not running${NC}"
fi

# ─── Stop antfarm daemon if running ───
if pgrep -f "antfarm.*daemon" > /dev/null 2>&1; then
  echo -e "  ${DIM}Stopping Antfarm...${NC}"
  pkill -f "antfarm.*daemon" 2>/dev/null
  sleep 1
  echo -e "  ${GREEN}✓${NC} Antfarm stopped"
fi

echo ""
echo -e "  ${GREEN}✅ All services stopped.${NC}"

# ─── Find and eject SSD ───
FOUND_SSD=""
for vol in /Volumes/*/; do
  vname=$(basename "$vol")
  if [[ "$vname" != "Macintosh HD" && "$vname" != "Macintosh HD - Data" && "$vname" != "Preboot" && "$vname" != "Recovery" && "$vname" != "VM" && "$vname" != "Update" ]]; then
    if [[ -d "${vol}OpenClaw" ]]; then
      FOUND_SSD="$vname"
      break
    fi
  fi
done

if [[ -n "$FOUND_SSD" ]]; then
  echo ""
  echo -e "  ${BOLD}Eject SSD '${FOUND_SSD}'?${NC}"
  read -p "  (y/n): " EJECT
  if [[ "$EJECT" == "y" || "$EJECT" == "Y" ]]; then
    echo ""
    echo -e "  ${DIM}Ejecting in 3 seconds...${NC}"
    sleep 3
    diskutil eject "/Volumes/${FOUND_SSD}"
    echo ""
    echo -e "  ${GREEN}🔌 SSD ejected. Safe to unplug!${NC}"
  fi
fi

echo ""
read -n 1 -s -r -p "  Press any key to close..."
echo ""
