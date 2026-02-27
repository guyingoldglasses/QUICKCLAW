#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_DIR="$SCRIPT_DIR/.pids"

PASS=0
WARN=0
FAIL=0

pass(){ echo "[PASS] $1"; PASS=$((PASS+1)); }
warn(){ echo "[WARN] $1"; WARN=$((WARN+1)); }
fail(){ echo "[FAIL] $1"; FAIL=$((FAIL+1)); }

echo "QuickClaw V3 Verify"
echo "Root: $SCRIPT_DIR"
echo ""

[[ -d "$SCRIPT_DIR/openclaw" ]] && pass "openclaw directory exists" || fail "openclaw directory missing"
[[ -f "$SCRIPT_DIR/openclaw/config/default.yaml" ]] && pass "default config exists" || warn "default config missing"
[[ -f "$SCRIPT_DIR/dashboard-files/server.js" ]] && pass "dashboard server.js exists" || fail "dashboard server.js missing"

if command -v node >/dev/null 2>&1; then
  pass "node available: $(node -v)"
else
  fail "node is not installed"
fi

if command -v npm >/dev/null 2>&1; then
  pass "npm available: $(npm -v)"
else
  fail "npm is not installed"
fi

if [[ -f "$PID_DIR/gateway.pid" ]] && kill -0 "$(cat "$PID_DIR/gateway.pid" 2>/dev/null)" 2>/dev/null; then
  pass "gateway process running (PID $(cat "$PID_DIR/gateway.pid"))"
else
  warn "gateway process not running"
fi

if [[ -f "$PID_DIR/dashboard.pid" ]] && kill -0 "$(cat "$PID_DIR/dashboard.pid" 2>/dev/null)" 2>/dev/null; then
  pass "dashboard process running (PID $(cat "$PID_DIR/dashboard.pid"))"
else
  warn "dashboard process not running"
fi

if lsof -i :5000 -n -P >/dev/null 2>&1; then
  pass "gateway port 5000 is listening"
else
  warn "gateway port 5000 is not listening"
fi

if lsof -i :3000 -n -P >/dev/null 2>&1 || lsof -i :3001 -n -P >/dev/null 2>&1; then
  pass "dashboard port 3000/3001 is listening"
else
  warn "dashboard port 3000/3001 is not listening"
fi

echo ""
echo "Summary: PASS=$PASS WARN=$WARN FAIL=$FAIL"
if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
