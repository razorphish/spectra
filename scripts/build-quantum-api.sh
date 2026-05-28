#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../apps/services/quantum-api"
if ! command -v python3 >/dev/null 2>&1; then
  echo "[quantum-api:build] skip: python3 not installed"
  exit 0
fi
if ! python3 -m pip --version >/dev/null 2>&1; then
  echo "[quantum-api:build] skip: pip not available for python3"
  exit 0
fi
python3 -m pip install -e . -q
python3 -c "import quantum_api"
echo "[quantum-api:build] ok"
