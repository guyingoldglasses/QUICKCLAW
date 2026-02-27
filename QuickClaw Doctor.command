#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "QuickClaw V3 Doctor"
echo "root: $SCRIPT_DIR"
echo "node: $(command -v node || echo missing)"
lsof -i :3000 -n -P 2>/dev/null || true
lsof -i :3001 -n -P 2>/dev/null || true
lsof -i :5000 -n -P 2>/dev/null || true
tail -n 30 "$SCRIPT_DIR/logs/dashboard.log" 2>/dev/null || true
tail -n 30 "$SCRIPT_DIR/logs/gateway.log" 2>/dev/null || true
