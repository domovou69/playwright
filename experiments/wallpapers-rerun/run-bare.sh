#!/usr/bin/env bash
# Run 1: plain Claude, no harness. One session with the task text, up to 3 "continue" sessions. Commits the result at the end.
set -uo pipefail
source "$(dirname "$0")/common.sh"
DIR="$BASE/wp-bare"; LOGS="$HERE/logs/bare"; mkdir -p "$LOGS"
cd "$DIR"; START=$(date +%s); date -u +%Y-%m-%dT%H:%M:%SZ > "$LOGS/started.txt"
FLAGS=("${COMMON_FLAGS[@]}" --effort medium --disable-slash-commands)

echo "[$(date +%T)] bare: session 1"
sid=$(claude_session "$LOGS/session-1" "${FLAGS[@]}" < "$HERE/brief.md"); echo "$sid" >> "$LOGS/sessions.txt"
n=1
while [ ! -f RUN-SUMMARY.md ] && [ "$n" -le 3 ] && elapsed_ok; do
  n=$((n + 1))
  echo "[$(date +%T)] bare: continue $((n - 1)) (RUN-SUMMARY.md not there yet)"
  sid=$(echo "Continue until RUN-SUMMARY.md is complete." | claude_session "$LOGS/session-$n" --continue "${FLAGS[@]}"); echo "$sid" >> "$LOGS/sessions.txt"
done
echo "continues: $((n - 1))" > "$LOGS/interventions.txt"
git add -A && git -c user.name=experiment -c user.email=experiment@example.com commit -q -m "result" || true
echo "[$(date +%T)] bare: done in $(( ($(date +%s) - START) / 60 )) min wall; summary file: $([ -f RUN-SUMMARY.md ] && echo yes || echo NO)"
