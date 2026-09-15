#!/usr/bin/env bash
# macOS counterpart to launch-composer-os.ps1 — full desktop:dev from repo root.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "== Composer OS Desktop (macOS) =="
echo "Repo: $ROOT"
echo "Running apps/composer-os-desktop desktop:dev"
echo ""

npm run desktop:dev --prefix "$ROOT/apps/composer-os-desktop"
