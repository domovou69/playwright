#!/usr/bin/env bash
# Resume run 1 (plain Claude) after the owner stopped it by hand at about T+01:25: the same session conversation continues with the
# fixed text, at most 3 times, then the result is committed. Counts as interventions (continues), like any restart.
set -uo pipefail
source "$(dirname "$0")/common.sh"
DIR="$BASE/wp-bare"; LOGS="$HERE/logs/bare"; mkdir -p "$LOGS"
cd "$DIR"; START=$(date +%s)
FLAGS=("${COMMON_FLAGS[@]}" --effort medium --disable-slash-commands)
echo "[$(date +%T)] bare: resuming after a manual stop"
n=1
while [ ! -f RUN-SUMMARY.md ] && [ "$n" -le 3 ] && elapsed_ok; do
  n=$((n + 1))
  echo "[$(date +%T)] bare: continue $((n - 1))"
  sid=$(echo "Continue until RUN-SUMMARY.md is complete." | claude_session "$LOGS/session-resume-$n" --continue "${FLAGS[@]}"); echo "$sid" >> "$LOGS/sessions.txt"
done
echo "continues after the manual stop: $((n - 1))" > "$LOGS/interventions.txt"
git add -A && git -c user.name=experiment -c user.email=experiment@example.com commit -q -m "result" || true
echo "[$(date +%T)] bare: done in $(( ($(date +%s) - $(date -d "$(cat "$LOGS/started.txt")" +%s 2>/dev/null || date -j -u -f %Y-%m-%dT%H:%M:%SZ "$(cat "$LOGS/started.txt")" +%s)) / 60 )) min wall since the original start; summary file: $([ -f RUN-SUMMARY.md ] && echo yes || echo NO)"
