#!/bin/bash
# ═══════════════════════════════════════════
#  QuickClaw — Telegram Diagnostic
#  Run this in Terminal to diagnose why the
#  bot isn't responding to messages
# ═══════════════════════════════════════════

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'; BOLD='\033[1m'
info()  { echo -e "${CYAN}[info]${NC}  $*"; }
ok()    { echo -e "${GREEN}[  ok]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[warn]${NC}  $*"; }
fail()  { echo -e "${RED}[FAIL]${NC}  $*"; }
hr()    { echo -e "${CYAN}────────────────────────────────────────${NC}"; }

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OC_DIR="$HOME/.openclaw"
CB_DIR="$HOME/.clawdbot"
INSTALL_DIR="$SCRIPT_DIR/openclaw"

echo ""
echo -e "${BOLD}🔍 QuickClaw Telegram Diagnostic${NC}"
echo ""

# ═══ 1. Find config dir ═══
hr
info "1. Config Directory"
CONFIG_DIR=""
for d in "$OC_DIR" "$CB_DIR"; do
  if [[ -d "$d" ]]; then
    CONFIG_DIR="$d"
    ok "Found: $d"
    ls -la "$d/" 2>/dev/null | head -20
    break
  fi
done
[[ -z "$CONFIG_DIR" ]] && fail "No .openclaw or .clawdbot dir found in $HOME"

# ═══ 2. Check clawdbot.json ═══
hr
info "2. clawdbot.json contents"
CONFIG_JSON="$CONFIG_DIR/clawdbot.json"
if [[ -f "$CONFIG_JSON" ]]; then
  ok "Found: $CONFIG_JSON"
  echo -e "${YELLOW}--- Full contents: ---${NC}"
  cat "$CONFIG_JSON" | python3 -m json.tool 2>/dev/null || cat "$CONFIG_JSON"
  echo ""
else
  fail "No clawdbot.json at $CONFIG_JSON"
fi

# ═══ 3. Check .env ═══
hr
info "3. .env file"
ENV_FILE="$CONFIG_DIR/.env"
if [[ -f "$ENV_FILE" ]]; then
  ok "Found: $ENV_FILE"
  echo -e "${YELLOW}--- Contents (tokens masked): ---${NC}"
  while IFS= read -r line; do
    if [[ "$line" == *TOKEN* || "$line" == *KEY* || "$line" == *SECRET* ]]; then
      key="${line%%=*}"
      val="${line#*=}"
      echo "$key=${val:0:8}••••${val: -4}"
    else
      echo "$line"
    fi
  done < "$ENV_FILE"
  echo ""
else
  warn "No .env at $ENV_FILE"
fi

# ═══ 4. Check LaunchAgent plist ═══
hr
info "4. LaunchAgent plist"
PLIST="$HOME/Library/LaunchAgents/ai.openclaw.gateway.plist"
if [[ -f "$PLIST" ]]; then
  ok "Found: $PLIST"
  echo -e "${YELLOW}--- Contents: ---${NC}"
  cat "$PLIST"
  echo ""
  
  # Check if it references the right node
  if grep -q '/usr/bin/env' "$PLIST"; then
    warn "Plist uses /usr/bin/env (may not find node)"
  fi
  NODE_IN_PLIST=$(grep -A1 'ProgramArguments' "$PLIST" | grep '<string>' | head -1 | sed 's/.*<string>//;s/<\/string>.*//')
  info "Binary in plist: $NODE_IN_PLIST"
  
  # Check EnvironmentVariables
  if grep -q 'EnvironmentVariables' "$PLIST"; then
    ok "Plist has EnvironmentVariables"
  else
    warn "Plist has NO EnvironmentVariables (config dir may not be set)"
  fi

  # Check if OPENCLAW_CONFIG_DIR is set in plist
  if grep -q 'OPENCLAW_CONFIG_DIR' "$PLIST"; then
    CONFIG_IN_PLIST=$(grep -A1 'OPENCLAW_CONFIG_DIR' "$PLIST" | grep '<string>' | sed 's/.*<string>//;s/<\/string>.*//')
    info "Config dir in plist: $CONFIG_IN_PLIST"
  else
    warn "No OPENCLAW_CONFIG_DIR in plist — gateway uses default ~/.openclaw"
  fi
else
  fail "No plist at $PLIST"
fi

# ═══ 5. Gateway process ═══
hr
info "5. Gateway Process"
GW_PIDS=$(pgrep -f "openclaw.*gateway" 2>/dev/null)
if [[ -n "$GW_PIDS" ]]; then
  ok "Gateway processes found:"
  for pid in $GW_PIDS; do
    ps -p "$pid" -o pid,ppid,stat,command 2>/dev/null
  done
else
  warn "No openclaw gateway processes running"
fi

# Check ports
for port in 18789 5000; do
  PID_ON_PORT=$(lsof -ti tcp:$port 2>/dev/null)
  if [[ -n "$PID_ON_PORT" ]]; then
    ok "Port $port in use by PID: $PID_ON_PORT"
  else
    info "Port $port: free"
  fi
done

# LaunchAgent status
echo ""
info "LaunchAgent status:"
launchctl print gui/$(id -u)/ai.openclaw.gateway 2>&1 | head -30

# ═══ 6. OpenClaw's own gateway log ═══
hr
info "6. OpenClaw Gateway Runtime Log"
for logpath in "$CONFIG_DIR/logs/gateway.log" "/tmp/openclaw/openclaw-$(date +%Y-%m-%d).log" "$CONFIG_DIR/gateway.log"; do
  if [[ -f "$logpath" ]]; then
    ok "Found: $logpath ($(wc -l < "$logpath") lines)"
    echo -e "${YELLOW}--- Last 30 lines: ---${NC}"
    tail -30 "$logpath"
    echo ""
  fi
done

# ═══ 7. Test gateway WebSocket ═══
hr
info "7. Testing Gateway WebSocket"
# Try connecting to the gateway and sending a simple message
if command -v node &>/dev/null; then
  node -e "
const ws = new (require('ws'))('ws://127.0.0.1:18789');
const timeout = setTimeout(() => { console.log('TIMEOUT: No response in 5s'); process.exit(1); }, 5000);
ws.on('open', () => { console.log('CONNECTED to ws://127.0.0.1:18789'); ws.close(); clearTimeout(timeout); process.exit(0); });
ws.on('error', (e) => { console.log('WS ERROR:', e.message); clearTimeout(timeout); process.exit(1); });
" 2>/dev/null
  if [[ $? -eq 0 ]]; then
    ok "WebSocket connection successful"
  else
    warn "Could not connect to WebSocket — trying without ws module..."
    # Try with curl as fallback
    curl -s --max-time 3 -o /dev/null -w "HTTP %{http_code}" http://127.0.0.1:18789/ 2>/dev/null
    echo ""
  fi
else
  warn "Node.js not found, skipping WebSocket test"
fi

# ═══ 8. Test openclaw CLI directly ═══
hr
info "8. OpenClaw CLI test"
OPENCLAW_BIN=""
if [[ -x "$INSTALL_DIR/node_modules/.bin/openclaw" ]]; then
  OPENCLAW_BIN="$INSTALL_DIR/node_modules/.bin/openclaw"
elif command -v openclaw &>/dev/null; then
  OPENCLAW_BIN="openclaw"
fi

if [[ -n "$OPENCLAW_BIN" ]]; then
  ok "CLI: $OPENCLAW_BIN"
  echo -e "${YELLOW}--- openclaw version: ---${NC}"
  "$OPENCLAW_BIN" --version 2>&1 || true
  echo ""
  echo -e "${YELLOW}--- openclaw gateway status: ---${NC}"
  "$OPENCLAW_BIN" gateway status 2>&1 || true
  echo ""
  
  # Check what config openclaw actually reads
  echo -e "${YELLOW}--- openclaw config dir check: ---${NC}"
  OPENCLAW_CONFIG_DIR="$CONFIG_DIR" "$OPENCLAW_BIN" gateway status 2>&1 || true
else
  fail "openclaw CLI not found"
fi

# ═══ 9. Validate token with Telegram API ═══
hr
info "9. Telegram API Check"
# Extract token from clawdbot.json
TOKEN=""
if [[ -f "$CONFIG_JSON" ]]; then
  TOKEN=$(python3 -c "
import json
with open('$CONFIG_JSON') as f: c = json.load(f)
t = c.get('channels',{}).get('telegram',{}).get('botToken','')
print(t)
" 2>/dev/null)
fi
# Fallback to .env
if [[ -z "$TOKEN" && -f "$ENV_FILE" ]]; then
  TOKEN=$(grep 'TELEGRAM_BOT_TOKEN' "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2)
fi

if [[ -n "$TOKEN" ]]; then
  info "Token found: ${TOKEN:0:8}••••${TOKEN: -4}"
  
  echo -e "${YELLOW}--- getMe: ---${NC}"
  curl -s "https://api.telegram.org/bot${TOKEN}/getMe" | python3 -m json.tool 2>/dev/null
  
  echo ""
  echo -e "${YELLOW}--- getUpdates (pending messages): ---${NC}"
  curl -s "https://api.telegram.org/bot${TOKEN}/getUpdates?limit=5&timeout=0" | python3 -m json.tool 2>/dev/null
  
  echo ""
  echo -e "${YELLOW}--- getWebhookInfo (webhook vs polling): ---${NC}"
  WEBHOOK_INFO=$(curl -s "https://api.telegram.org/bot${TOKEN}/getWebhookInfo")
  echo "$WEBHOOK_INFO" | python3 -m json.tool 2>/dev/null
  
  # Check if a webhook is set (which would prevent polling!)
  WEBHOOK_URL=$(echo "$WEBHOOK_INFO" | python3 -c "import json,sys; print(json.load(sys.stdin).get('result',{}).get('url',''))" 2>/dev/null)
  if [[ -n "$WEBHOOK_URL" && "$WEBHOOK_URL" != "" ]]; then
    fail "WEBHOOK IS SET: $WEBHOOK_URL"
    warn "This prevents polling! The gateway can't get messages via getUpdates while a webhook is active."
    echo ""
    echo -e "${BOLD}To fix, run:${NC}"
    echo "  curl -s \"https://api.telegram.org/bot${TOKEN}/deleteWebhook\""
    echo ""
    read -p "Delete webhook now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      RESULT=$(curl -s "https://api.telegram.org/bot${TOKEN}/deleteWebhook")
      echo "$RESULT" | python3 -m json.tool 2>/dev/null
      ok "Webhook deleted. Gateway should start polling now."
    fi
  else
    ok "No webhook set — gateway should be able to poll via getUpdates"
  fi
else
  fail "No Telegram token found in config"
fi

# ═══ Summary ═══
hr
echo ""
echo -e "${BOLD}📋 Summary${NC}"
echo ""
echo "Config dir:     ${CONFIG_DIR:-NOT FOUND}"
echo "Config JSON:    ${CONFIG_JSON:-NOT FOUND}"
echo "Plist:          ${PLIST}"
echo "OpenClaw CLI:   ${OPENCLAW_BIN:-NOT FOUND}"
echo "Token:          ${TOKEN:+${TOKEN:0:8}••••${TOKEN: -4}}"
echo ""
echo -e "${CYAN}Copy everything above and share it for debugging.${NC}"
echo ""
