#!/usr/bin/env bash
# Run a polyglot build when the toolchain is present; exit 0 if skipped.
set -euo pipefail
RUNTIME="${1:?usage: polyglot-build.sh dotnet|python|go}"
shift
case "$RUNTIME" in
  dotnet)
    if command -v dotnet >/dev/null 2>&1; then
      exec dotnet "$@"
    fi
    echo "[polyglot-build] skip: dotnet not installed"
    exit 0
    ;;
  python)
    if command -v python3 >/dev/null 2>&1; then
      exec python3 "$@"
    fi
    if command -v python >/dev/null 2>&1; then
      exec python "$@"
    fi
    echo "[polyglot-build] skip: python not installed"
    exit 0
    ;;
  go)
    if command -v go >/dev/null 2>&1; then
      exec go "$@"
    fi
    echo "[polyglot-build] skip: go not installed"
    exit 0
    ;;
  *)
    echo "[polyglot-build] unknown runtime: $RUNTIME" >&2
    exit 1
    ;;
esac
