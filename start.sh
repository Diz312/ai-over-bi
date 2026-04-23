#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

UV="$(command -v uv 2>/dev/null || echo "$HOME/.local/bin/uv")"
NPM="$(command -v npm 2>/dev/null || echo "/usr/local/bin/npm")"
NODE_BIN="$(dirname "$NPM")"
export PATH="$NODE_BIN:$PATH"

echo "=== AI over BI ==="
echo ""

# ── Backend setup ──────────────────────────────────────────────────────────────
echo "[backend] Checking environment..."
if [ ! -f "$ROOT_DIR/agent/.env" ]; then
    cp "$ROOT_DIR/agent/.env.example" "$ROOT_DIR/agent/.env"
    echo ""
    echo "  Created agent/.env from .env.example."
    echo "  Fill in ANTHROPIC_API_KEY, then re-run ./start.sh"
    echo ""
    exit 1
fi

echo "[backend] Syncing dependencies..."
cd "$ROOT_DIR/agent"
"$UV" sync --quiet

# Seed the database if it doesn't exist yet
DB_PATH="$ROOT_DIR/agent/src/ai_over_bi/data/store_data.db"
if [ ! -f "$DB_PATH" ]; then
    echo "[backend] Seeding synthetic store data..."
    "$UV" run ai-over-bi-seed
fi

# ── Frontend setup ─────────────────────────────────────────────────────────────
echo "[frontend] Installing dependencies..."
cd "$ROOT_DIR/frontend"
if [ ! -f ".env.local" ]; then
    cp .env.local.example .env.local
    echo ""
    echo "  Created frontend/.env.local — add your ANTHROPIC_API_KEY there."
    echo ""
fi
"$NPM" install --silent --legacy-peer-deps --ignore-scripts

# ── Start services ─────────────────────────────────────────────────────────────
echo ""
echo "[backend] Starting agent on :8000..."
cd "$ROOT_DIR/agent"
"$UV" run ai-over-bi-serve &
BACKEND_PID=$!

echo "[frontend] Starting Next.js on :3000..."
cd "$ROOT_DIR/frontend"
"$NPM" run dev &
FRONTEND_PID=$!

echo ""
echo "  Frontend : http://localhost:3000"
echo "  Backend  : http://localhost:8000"
echo "  Health   : http://localhost:8000/health"
echo "  Swagger  : http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all services."

cleanup() {
    echo ""
    echo "Stopping services..."
    kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
    exit 0
}
trap cleanup INT TERM

wait
