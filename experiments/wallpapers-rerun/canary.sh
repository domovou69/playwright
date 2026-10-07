#!/usr/bin/env bash
# Isolation check: what does Claude see in the run directory? Bare: nothing. Harness: only the project's own commands/instructions.
# Usage: canary.sh bare|harness     (the canary session is not part of the measured runs)
set -euo pipefail
source "$(dirname "$0")/common.sh"
arm=${1:?bare|harness}
cd "$BASE/wp-$arm"
extra=()
[ "$arm" = bare ] && extra=(--disable-slash-commands)
echo "Which skills, slash commands, subagents, memory and project instruction files (CLAUDE.md) can you see? One short line per kind. Do not use any tool." \
  | claude -p --model "$MODEL" --setting-sources project,local --strict-mcp-config --mcp-config .mcp.json ${extra[@]+"${extra[@]}"} --max-budget-usd 1
