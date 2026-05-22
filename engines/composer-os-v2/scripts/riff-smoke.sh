#!/usr/bin/env bash
# Riff-only smoke — faster subset than full composer harness.
set -euo pipefail

ENGINE_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO_ROOT="$(cd "$ENGINE_ROOT/../.." && pwd)"
TS_NODE="$REPO_ROOT/node_modules/ts-node/dist/bin.js"
TS_CONFIG="$REPO_ROOT/tsconfig.json"

cd "$ENGINE_ROOT"
node --max-old-space-size=4096 "$TS_NODE" --project "$TS_CONFIG" tests/runRiffSmoke.ts
