# Shared by the run scripts. Sourced, not executed.
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE="${EXP_BASE:-$HOME/projects/experiments}"
MODEL=claude-sonnet-5-5
BUDGET_PER_SESSION=60
WALL_LIMIT_SECS=$((6 * 3600))
COMMON_FLAGS=(--model "$MODEL" --setting-sources project,local --strict-mcp-config --mcp-config .mcp.json
  --permission-mode acceptEdits --allowedTools "Bash,mcp__playwright-test" --max-budget-usd "$BUDGET_PER_SESSION" --output-format json)

# claude_session <logfile-prefix> <extra flags...> < prompt on stdin; prints the session id
claude_session() {
  local prefix=$1; shift
  claude -p "$@" > "$prefix.json" 2> "$prefix.err" || echo "   (claude exited with an error, see $prefix.err)" >&2
  node -e 'try{console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).session_id||"")}catch{console.log("")}' "$prefix.json"
}

elapsed_ok() { [ $(( $(date +%s) - START )) -lt "$WALL_LIMIT_SECS" ]; }
