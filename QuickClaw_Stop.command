#!/bin/bash
# ═══════════════════════════════════════════
#  QuickClaw V3 — Stop
#  Cleanly stops gateway + dashboard + removes
#  the ~/.openclaw symlink so unplugging the
#  drive leaves zero traces on the Mac.
# ═══════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ─── Resolve the real install location ───
if [[ -f "$SCRIPT_DIR/.quickclaw-root" ]]; then
  BASE_DIR="$(cat "$SCRIPT_DIR/.quickclaw-root")"
  [[ ! -d "$BASE_DIR" ]] && BASE_DIR="$SCRIPT_DIR"
else
  BASE_DIR="$SCRIPT_DIR"
fi

PID_DIR="$BASE_DIR/.pids"

GREEN='\033[0;32m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'; BOLD='\033[1m'

echo ""
echo -e "${BOLD}⚡ QuickClaw V3 — Stopping...${NC}"
echo ""

stopped=0

# ─── Unload the LaunchAgent (stops the gateway service properly) ───
PLIST="$HOME/Library/LaunchAgents/ai.openclaw.gateway.plist"
if launchctl list | grep -q "ai.openclaw.gateway" 2>/dev/null; then
  echo -e "${CYAN}[info]${NC}  Unloading gateway LaunchAgent..."
  launchctl bootout "gui/$(id -u)/ai.openclaw.gateway" 2>/dev/null || true
  stopped=$((stopped + 1))
  sleep 1
fi
# Remove the plist so it doesn't auto-start on login
if [[ -f "$PLIST" ]]; then
  rm -f "$PLIST"
  echo -e "${CYAN}[info]${NC}  Removed LaunchAgent plist"
fi

# ─── Stop from PID files ───
for name in dashboard gateway; do
  pidfile="$PID_DIR/$name.pid"
  if [[ -f "$pidfile" ]]; then
    pid=$(cat "$pidfile" 2>/dev/null || true)
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      echo -e "${CYAN}[info]${NC}  Stopping $name (PID $pid)..."
      kill "$pid" 2>/dev/null || true
      sleep 1
      if kill -0 "$pid" 2>/dev/null; then
        kill -9 "$pid" 2>/dev/null || true
        sleep 0.5
      fi
      stopped=$((stopped + 1))
    fi
    rm -f "$pidfile"
  fi
done

# ─── Kill any orphan dashboard processes on common ports ───
for port in 3000 3001 3002 3003 3004 3005; do
  pids=$(lsof -ti tcp:$port 2>/dev/null || true)
  for pid in $pids; do
    cmd=$(ps -p "$pid" -o command= 2>/dev/null || true)
    if [[ "$cmd" == *"server.js"* || "$cmd" == *"dashboard-files"* ]]; then
      echo -e "${CYAN}[info]${NC}  Killing orphan dashboard on :$port (PID $pid)"
      kill "$pid" 2>/dev/null || true
      sleep 0.5
      kill -9 "$pid" 2>/dev/null || true
      stopped=$((stopped + 1))
    fi
  done
done

# ─── Kill any orphan gateway processes ───
for port in 5000 18789; do
  pids=$(lsof -ti tcp:$port 2>/dev/null || true)
  for pid in $pids; do
    cmd=$(ps -p "$pid" -o command= 2>/dev/null || true)
    if [[ "$cmd" == *"openclaw"* || "$cmd" == *"gateway"* ]]; then
      echo -e "${CYAN}[info]${NC}  Killing orphan gateway on :$port (PID $pid)"
      kill "$pid" 2>/dev/null || true
      sleep 0.5
      kill -9 "$pid" 2>/dev/null || true
      stopped=$((stopped + 1))
    fi
  done
done

# ─── Remove ~/.openclaw symlink ───
# This is the key to portability: when the drive is unplugged,
# there's no trace of OpenClaw on the Mac.
if [[ -L "$HOME/.openclaw" ]]; then
  target=$(readlink "$HOME/.openclaw")
  rm "$HOME/.openclaw"
  echo -e "${CYAN}[info]${NC}  Removed ~/.openclaw symlink (was → $target)"
elif [[ -d "$HOME/.openclaw" ]]; then
  echo -e "${CYAN}[info]${NC}  Note: ~/.openclaw is a real directory, not a symlink."
  echo -e "${CYAN}[info]${NC}  Run QuickClaw_Install to migrate it to your external drive."
fi

if [[ $stopped -eq 0 ]]; then
  echo -e "${GREEN}[  ok]${NC}  Nothing was running."
else
  echo ""
  echo -e "${GREEN}[  ok]${NC}  Stopped $stopped process(es)."
fi
echo -e "${GREEN}[  ok]${NC}  QuickClaw fully stopped. Safe to unplug the drive."
echo ""
