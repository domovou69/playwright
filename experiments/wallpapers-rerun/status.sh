#!/usr/bin/env bash
# Read-only snapshot of both runs: elapsed, finished sessions, last driver line, files produced, cost so far. Touches nothing.
HERE="$(cd "$(dirname "$0")" && pwd)"; BASE="${EXP_BASE:-$HOME/projects/experiments}"; ROOT="$HERE/../.."
for arm in bare harness; do
  logs="$HERE/logs/$arm"; dir="$BASE/wp-$arm"
  started=$(cat "$logs/started.txt" 2>/dev/null)
  mins=$(( ( $(date +%s) - $(date -j -u -f %Y-%m-%dT%H:%M:%SZ "$started" +%s 2>/dev/null || echo "$(date +%s)") ) / 60 ))
  if [ -f "$logs/resumed.txt" ]; then
    r=$(cat "$logs/resumed.txt"); mins=$(( $(cat "$logs/minutes-before-stop.txt") + ( $(date +%s) - $(date -j -u -f %Y-%m-%dT%H:%M:%SZ "$r" +%s) ) / 60 ))
  fi
  enc=$(echo "$dir" | sed 's|[/.]|-|g')
  cost=$(cd "$ROOT" && node scripts/session-cost.mjs --all --from "$started" --project-dir "$HOME/.claude/projects/$enc" --json 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const a=JSON.parse(s);console.log("$"+a.reduce((n,x)=>n+x.apiUsd,0).toFixed(1)+", active "+Math.round(a.reduce((n,x)=>n+x.activeMin,0))+" min, "+a.length+" sessions, MCP calls "+a.reduce((n,x)=>n+Object.values(x.mcp||{}).reduce((m,y)=>m+y.calls,0),0))}catch{console.log("n/a")}})')
  running=$(pgrep -f "claude -p" | wc -l | tr -d ' ')
  done_line=$(grep -m1 "done in" "$logs/driver.log" 2>/dev/null)
  if [ -n "$done_line" ]; then
    total=$(echo "$done_line" | sed -E 's/.*done in ([0-9]+) min.*/\1/')
    if [ -f "$logs/resumed.txt" ]; then
      r=$(date -j -u -f %Y-%m-%dT%H:%M:%SZ "$(cat "$logs/resumed.txt")" +%s)
      total=$(( $(cat "$logs/minutes-before-stop.txt") + ( $(stat -f %m "$logs/driver.log") - r ) / 60 ))
    fi
    clock="FINISHED, total $(printf 'T+%02d:%02d' $((total / 60)) $((total % 60)))"
  else
    clock="$(printf 'T+%02d:%02d' $((mins / 60)) $((mins % 60))) (running)"
  fi
  echo "== $arm: $clock; claude -p processes (both arms): $running"
  echo "   last driver line: $(tail -1 "$logs/driver.log" 2>/dev/null)"
  echo "   cost so far: $cost"
  echo "   tests: $(find "$dir/tests" -name '*.spec.ts' 2>/dev/null | wc -l | tr -d ' ') spec files, page objects: $(find "$dir" -path "$dir/node_modules" -prune -o -path '*/pages/*.ts' -print 2>/dev/null | wc -l | tr -d ' ') files, summary: $([ -f "$dir/RUN-SUMMARY.md" ] && echo yes || echo no)"
  [ -f "$dir/tickets/tickets.json" ] && echo "   tickets: $(node -e 'const d=JSON.parse(require("fs").readFileSync(process.argv[1]));const v=Object.values(d.issues);const c=t=>v.filter(i=>i.type===t).length;console.log("story "+c("Story")+", subtasks "+c("Subtask")+" (done-ish "+v.filter(i=>i.labels.includes("impl-ready-for-review")).length+"), bugs "+c("Bug"))' "$dir/tickets/tickets.json")"
  echo "   commits: $(git -C "$dir" log --oneline 2>/dev/null | wc -l | tr -d ' ')"
done
