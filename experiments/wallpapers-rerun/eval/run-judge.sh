#!/usr/bin/env bash
# One headless judge session (Opus) over the blind folders. Run after blind-pack.mjs. Results land in eval/judge-report.md and
# eval/judge-scores.json. Usage: experiments/wallpapers-rerun/eval/run-judge.sh
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
BASE="${EXP_BASE:-$HOME/projects/experiments}"
J="$BASE/judge"
rm -rf "$J"; mkdir -p "$J"
cp -R "$HERE/blind/." "$J/"
cp "$HERE/known-bugs.md" "$J/known-bugs.md"
printf '%s\n' '{"mcpServers":{"playwright-test":{"command":"npx","args":["playwright","run-test-mcp-server","--headless"]}}}' > "$J/.mcp.json"
cd "$J"
claude -p --model claude-opus-5-5 --setting-sources project,local --strict-mcp-config --mcp-config .mcp.json --disable-slash-commands \
  --permission-mode acceptEdits --allowedTools "Bash,mcp__playwright-test" --max-budget-usd 40 --output-format json \
  < "$HERE/judge-prompt.md" > "$HERE/judge-session.json" 2> "$HERE/judge-session.err" || echo "judge exited with an error, see judge-session.err"
cp -f judge-report.md judge-scores.json "$HERE/" 2>/dev/null || echo "judge did not write its files"
