#!/bin/bash
# ═══════════════════════════════════════════
#  QuickClaw V3 — Launch
#  Starts gateway + dashboard, verifies both
# ═══════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ─── Resolve the real install location ───
# If .quickclaw-root exists, use it (set by installer when user chose external drive)
# This lets users double-click Launch from Downloads and it still finds the drive
if [[ -f "$SCRIPT_DIR/.quickclaw-root" ]]; then
  BASE_DIR="$(cat "$SCRIPT_DIR/.quickclaw-root")"
  if [[ -d "$BASE_DIR" ]]; then
    echo "  → Using install location: $BASE_DIR"
  else
    echo "  ⚠ Saved install path not found: $BASE_DIR"
    echo "    Is the external drive plugged in?"
    BASE_DIR="$SCRIPT_DIR"
  fi
else
  BASE_DIR="$SCRIPT_DIR"
fi

INSTALL_DIR="$BASE_DIR/openclaw"
DASHBOARD_DIR="$BASE_DIR/dashboard-files"
PID_DIR="$BASE_DIR/.pids"
LOG_DIR="$BASE_DIR/logs"
mkdir -p "$PID_DIR" "$LOG_DIR"

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'; BOLD='\033[1m'
info()  { echo -e "${CYAN}[info]${NC}  $*"; }
ok()    { echo -e "${GREEN}[  ok]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[warn]${NC}  $*"; }
fail()  { echo -e "${RED}[FAIL]${NC}  $*"; }

echo ""
echo -e "${BOLD}⚡ QuickClaw V3 — Starting...${NC}"
echo ""

# ─── Pre-flight: check Node.js ───
if ! command -v node &>/dev/null; then
  fail "Node.js not found. Please install it from https://nodejs.org"
  echo ""; exit 1
fi
info "Node.js $(node -v)"

# ─── Pre-flight: check dependencies ───
if [[ ! -d "$DASHBOARD_DIR/node_modules" ]]; then
  info "Installing dashboard dependencies..."
  cd "$DASHBOARD_DIR" && npm install --omit=dev 2>&1 | tail -1
  cd "$BASE_DIR"
fi

# ─── Clean stale PID files ───
for name in gateway dashboard; do
  pidfile="$PID_DIR/$name.pid"
  if [[ -f "$pidfile" ]]; then
    pid=$(cat "$pidfile" 2>/dev/null || true)
    if [[ -n "$pid" ]] && ! kill -0 "$pid" 2>/dev/null; then
      rm -f "$pidfile"
    fi
  fi
done

# ─── Kill anything already on our dashboard port ───
kill_port() {
  local port=$1
  local pids
  pids=$(lsof -ti tcp:$port 2>/dev/null || true)
  for p in $pids; do
    local cmd
    cmd=$(ps -p "$p" -o command= 2>/dev/null || true)
    if [[ "$cmd" == *"server.js"* || "$cmd" == *"node "* ]]; then
      kill "$p" 2>/dev/null || true
      sleep 0.5
      kill -9 "$p" 2>/dev/null || true
    fi
  done
}

# ─── All OpenClaw state lives on the external drive ───
# This is the key to portability: unplug the drive → bot is fully offline
# Plug back in → everything resumes
# Support both dir names (install uses openclaw-home, legacy uses openclaw-state)
if [[ -d "$BASE_DIR/openclaw-home" ]]; then
  OPENCLAW_HOME="$BASE_DIR/openclaw-home"
elif [[ -d "$BASE_DIR/openclaw-state" ]]; then
  OPENCLAW_HOME="$BASE_DIR/openclaw-state"
else
  OPENCLAW_HOME="$BASE_DIR/openclaw-state"
fi
mkdir -p "$OPENCLAW_HOME/logs" "$OPENCLAW_HOME/workspace"

if [[ -L "$HOME/.openclaw" ]]; then
  # Symlink exists — verify it points to us
  current=$(readlink "$HOME/.openclaw")
  if [[ "$current" != "$OPENCLAW_HOME" ]]; then
    rm "$HOME/.openclaw"
    ln -s "$OPENCLAW_HOME" "$HOME/.openclaw"
    info "Updated symlink: ~/.openclaw → $OPENCLAW_HOME"
  fi
elif [[ -d "$HOME/.openclaw" ]]; then
  # Real directory from a previous non-QuickClaw install
  # Migrate useful data, then replace with symlink
  info "Found existing ~/.openclaw — migrating to external drive..."
  # Copy config + credentials (skip large cache/log dirs)
  for item in openclaw.json .env credentials clawdbot.json agents identity skills; do
    src="$HOME/.openclaw/$item"
    [[ -e "$src" ]] && cp -a "$src" "$OPENCLAW_HOME/" 2>/dev/null && info "  Migrated $item"
  done
  # Remove the old directory
  rm -rf "$HOME/.openclaw"
  ln -s "$OPENCLAW_HOME" "$HOME/.openclaw"
  ok "Migrated and symlinked: ~/.openclaw → $OPENCLAW_HOME"
else
  # First install — create symlink
  ln -s "$OPENCLAW_HOME" "$HOME/.openclaw"
  info "Created symlink: ~/.openclaw → $OPENCLAW_HOME"
fi

# ─── Detect active profile config dir ───
# Since ~/.openclaw is symlinked to external drive, use OPENCLAW_HOME directly
export OPENCLAW_STATE_DIR="$OPENCLAW_HOME"
export OPENCLAW_CONFIG_DIR="$OPENCLAW_HOME"
export OPENCLAW_CONFIG_PATH="$OPENCLAW_HOME/openclaw.json"
export CLAWDBOT_CONFIG_DIR="$OPENCLAW_HOME"
CONFIG_DIR="$OPENCLAW_HOME"

# Check for named profiles
PROFILES_JSON="$BASE_DIR/dashboard-data/profiles.json"
if [[ -f "$PROFILES_JSON" ]]; then
  ACTIVE_ID=$(node -e "try{const p=JSON.parse(require('fs').readFileSync('$PROFILES_JSON','utf8'));const a=p.find(x=>x.active)||p[0];console.log(a?a.id:'')}catch{}" 2>/dev/null)
  if [[ -n "$ACTIVE_ID" && "$ACTIVE_ID" != "default" ]]; then
    SUFFIX="-${ACTIVE_ID#p-}"
    for base in "$OPENCLAW_HOME$SUFFIX" "$HOME/.openclaw$SUFFIX"; do
      [[ -d "$base" ]] && CONFIG_DIR="$base" && export OPENCLAW_CONFIG_DIR="$base" && export CLAWDBOT_CONFIG_DIR="$base" && break
    done
  fi
fi
info "State dir: $OPENCLAW_STATE_DIR"
info "Config dir: $CONFIG_DIR"

# ─── Start Gateway ───
GW_PID=""
if [[ -f "$PID_DIR/gateway.pid" ]] && kill -0 "$(cat "$PID_DIR/gateway.pid" 2>/dev/null)" 2>/dev/null; then
  GW_PID=$(cat "$PID_DIR/gateway.pid")
  ok "Gateway already running (PID $GW_PID)"
else
  info "Starting gateway..."
  GW_LOG="$LOG_DIR/gateway.log"
  cd "$INSTALL_DIR" 2>/dev/null || cd "$BASE_DIR"

  # Ensure node is in PATH
  NODE_BIN=$(which node 2>/dev/null)
  if [[ -n "$NODE_BIN" ]]; then
    NODE_DIR=$(dirname "$NODE_BIN")
    export PATH="$NODE_DIR:$PATH"
  fi

  OPENCLAW_BIN=""
  if [[ -x "$INSTALL_DIR/node_modules/.bin/openclaw" ]]; then
    OPENCLAW_BIN="$INSTALL_DIR/node_modules/.bin/openclaw"
  fi

  # Ensure gateway.mode=local in openclaw.json (gateway refuses to start without it)
  if [[ -f "$OPENCLAW_CONFIG_PATH" ]]; then
    python3 -c "
import json
with open('$OPENCLAW_CONFIG_PATH') as f: cfg = json.load(f)
changed = False
if cfg.get('gateway',{}).get('mode') != 'local':
    cfg.setdefault('gateway',{})['mode'] = 'local'
    changed = True
if changed:
    with open('$OPENCLAW_CONFIG_PATH','w') as f: json.dump(cfg, f, indent=2)
" 2>/dev/null
  fi

  # Remove any stale LaunchAgent (we manage the process directly)
  launchctl bootout gui/$(id -u)/ai.openclaw.gateway 2>/dev/null || true
  rm -f "$HOME/Library/LaunchAgents/ai.openclaw.gateway.plist" 2>/dev/null

  # Clean up invalid auth-profiles.json (causes warning spam, .env handles API keys)
  rm -f "$OPENCLAW_HOME/agents/main/agent/auth-profiles.json" 2>/dev/null
  rm -f "$HOME/.openclaw/agents/main/agent/auth-profiles.json" 2>/dev/null

  # Start gateway as a direct background process (more reliable than LaunchAgent for external drives)
  # Source .env file so API keys are available (needed for voice/Whisper STT)
  for envfile in "$OPENCLAW_HOME/.env" "$HOME/.openclaw/.env"; do
    if [[ -f "$envfile" ]]; then
      while IFS='=' read -r k v; do
        [[ -z "$k" || "$k" == \#* ]] && continue
        v="${v#\"}" ; v="${v%\"}" ; v="${v#\'}" ; v="${v%\'}"
        export "$k=$v" 2>/dev/null
      done < "$envfile"
      break
    fi
  done
  # Also check profile-specific .env
  if [[ -n "$CONFIG_DIR" && -f "$CONFIG_DIR/.env" ]]; then
    while IFS='=' read -r k v; do
      [[ -z "$k" || "$k" == \#* ]] && continue
      v="${v#\"}" ; v="${v%\"}" ; v="${v#\'}" ; v="${v%\'}"
      export "$k=$v" 2>/dev/null
    done < "$CONFIG_DIR/.env"
  fi

  echo "--- Gateway start: $(date) ---" >> "$GW_LOG"
  if [[ -n "$OPENCLAW_BIN" ]]; then
    nohup "$OPENCLAW_BIN" gateway --port 18789 >> "$GW_LOG" 2>&1 &
  else
    nohup npx openclaw gateway --port 18789 >> "$GW_LOG" 2>&1 &
  fi
  GW_PID=$!
  echo "$GW_PID" > "$PID_DIR/gateway.pid"
  sleep 4

  # Verify gateway is actually listening
  if lsof -ti tcp:18789 >/dev/null 2>&1; then
    ok "Gateway started and listening (PID $GW_PID)"
  elif kill -0 "$GW_PID" 2>/dev/null; then
    ok "Gateway process started (PID $GW_PID) — may take a moment to become ready"
  else
    warn "Gateway may not have started — check $GW_LOG"
    tail -5 "$GW_LOG" 2>/dev/null
    GW_PID="none"
  fi
fi

# ─── Dashboard port ───
DB_PORT=3000
EXISTING=$(lsof -ti tcp:$DB_PORT 2>/dev/null | head -n1 || true)
if [[ -n "$EXISTING" ]]; then
  CMD=$(ps -p "$EXISTING" -o command= 2>/dev/null || true)
  if [[ "$CMD" == *"server.js"* ]]; then
    info "Stopping old dashboard on :$DB_PORT..."
    kill_port $DB_PORT
    sleep 1
  else
    for p in 3001 3002 3003 3004 3005; do
      if [[ -z "$(lsof -ti tcp:$p 2>/dev/null || true)" ]]; then
        DB_PORT=$p; warn "Port 3000 in use. Using :$DB_PORT"; break
      fi
    done
  fi
fi

# Also clean the PID file
rm -f "$PID_DIR/dashboard.pid"

# ─── Start Dashboard ───
info "Starting dashboard on port $DB_PORT..."
cd "$DASHBOARD_DIR"
DB_LOG="$LOG_DIR/dashboard.log"
echo "--- Dashboard start: $(date) ---" >> "$DB_LOG"

QUICKCLAW_ROOT="$BASE_DIR" DASHBOARD_PORT="$DB_PORT" OPENCLAW_STATE_DIR="$OPENCLAW_STATE_DIR" nohup node server.js >> "$DB_LOG" 2>&1 &
DASH_PID=$!
echo "$DASH_PID" > "$PID_DIR/dashboard.pid"

# ─── Health check ───
info "Waiting for dashboard..."
HEALTHY=false
for i in $(seq 1 8); do
  sleep 1
  if ! kill -0 "$DASH_PID" 2>/dev/null; then
    echo ""
    fail "Dashboard crashed on startup!"
    echo ""
    echo -e "${YELLOW}─── Last 25 lines of dashboard.log ───${NC}"
    tail -25 "$DB_LOG" 2>/dev/null
    echo -e "${YELLOW}───────────────────────────────────────${NC}"
    echo ""
    fail "Fix the error above, then re-run this script."
    echo ""
    exit 1
  fi
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$DB_PORT/api/ping" 2>/dev/null || true)
  if [[ "$HTTP" == "200" ]]; then
    HEALTHY=true
    break
  fi
done

if $HEALTHY; then
  ok "Dashboard is live! (PID $DASH_PID)"
else
  warn "Dashboard process running but not responding yet."
  warn "It may still be loading. Check: $DB_LOG"
fi

# ─── Summary ───
echo ""
echo -e "${BOLD}═══════════════════════════════════════${NC}"
echo -e "  ${GREEN}⚡ QuickClaw V3 is ready${NC}"
echo -e "${BOLD}═══════════════════════════════════════${NC}"
echo ""
echo -e "  Gateway   : ${CYAN}http://localhost:18789${NC}  (PID ${GW_PID:-?})"
echo -e "  Dashboard : ${CYAN}http://localhost:$DB_PORT${NC}  (PID $DASH_PID)"
echo -e "  Logs      : $LOG_DIR"
echo ""

if $HEALTHY; then
  open "http://localhost:$DB_PORT" 2>/dev/null || true
fi
