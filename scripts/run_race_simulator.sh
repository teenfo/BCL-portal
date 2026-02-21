#!/bin/bash
# scripts/run_race_simulator.sh
# Launch the Race Server in simulator mode on port 8001
# Usage: ./scripts/run_race_simulator.sh [LANE_COUNT]

LANE_COUNT=${1:-9}
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
RACE_DIR="$PROJECT_DIR/race"

echo "🎮 Starting Race Server (port 8001) ..."
echo "   Lanes: $LANE_COUNT"
echo ""
echo "   Simulator endpoints:"
echo "   POST http://localhost:8001/api/sim/start  — Start simulation"
echo "   POST http://localhost:8001/api/sim/stop   — Stop simulation"
echo "   POST http://localhost:8001/api/sim/reset  — Reset all"
echo "   GET  http://localhost:8001/api/sim/status — Check status"
echo "   GET  http://localhost:8001/api/race/live   — Live data"
echo ""

cd "$RACE_DIR"

# Install deps if needed
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
    .venv/bin/pip install -r requirements.txt
fi

# Source .env.local for Supabase keys
if [ -f "$PROJECT_DIR/.env.local" ]; then
    set -a
    source "$PROJECT_DIR/.env.local"
    set +a
    export SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL"
fi

.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8001 --reload
