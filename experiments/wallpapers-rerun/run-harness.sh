#!/usr/bin/env bash
# Run 2: full harness. /scout-feature, /create-story, then /implement-ticket for the Story and for every Subtask, each command in
# its own fresh session. Gates are approved in advance. Commits the result at the end.
set -uo pipefail
source "$(dirname "$0")/common.sh"
DIR="$BASE/wp-harness"; LOGS="$HERE/logs/harness"; mkdir -p "$LOGS"
cd "$DIR"; START=$(date +%s); date -u +%Y-%m-%dT%H:%M:%SZ > "$LOGS/started.txt"
FLAGS=("${COMMON_FLAGS[@]}")
interventions=0

NOTES='Run notes for this run (they replace nothing in the command, they only adapt it to an environment without Jira and GitHub):
- There is no remote and no Jira. Skip git push, gh pr create, gh pr diff and gh pr comment. Commit on the ticket branch as the command says; self-review the local diff (git diff main...HEAD) and write the self-review result into the Subtask comment instead of a PR comment.
- Every gate is approved in advance: gate: plan approved, gate: file bug, gate: extend. Do not stop to ask for approval or for an "ok" on the Story text; decide yourself whether something is a bug.
- Tickets are files in tickets/ (the Jira scripts are stand-ins with the same commands). The format reference plan is specs/notification-sounds.plan.md; the area wallpapers (prefix WP, tag @wallpapers) is already in the Areas table and no wallpapers plan exists yet.'

task=$(cat "$HERE/brief.md")
step=0
run() { # run <name> <prompt>
  step=$((step + 1))
  echo "[$(date +%T)] harness: $1"
  last_sid=$(printf '%s\n\n%s\n\nTask text:\n%s\n' "$2" "$NOTES" "$task" | claude_session "$LOGS/$(printf '%02d' $step)-$1" "${FLAGS[@]}")
  echo "$last_sid $1" >> "$LOGS/sessions.txt"
}

query() { node -e '
const fs=require("fs");const db=JSON.parse(fs.readFileSync("tickets/tickets.json","utf8"));const all=Object.values(db.issues);
const mode=process.argv[1];
if(mode==="story"){console.log((all.find(i=>i.type==="Story")||{}).key||"")}
if(mode==="todo"){console.log(all.filter(i=>i.type==="Subtask"&&!i.labels.includes("impl-ready-for-review")).map(i=>i.key).join(" "))}
if(mode==="blocked"){console.log(all.filter(i=>i.type==="Subtask"&&i.status==="Blocked").map(i=>i.key).join(" "))}
' "$1"; }

# The human steps of the loop that have no PR here: commit the plan after the scout, squash-merge a finished group into main.
commit_all() { git add -A && git -c user.name=experiment -c user.email=experiment@example.com commit -q -m "$1" || true; }
merged=" "
merge_done() {
  for key in $(node -e '
const db=JSON.parse(require("fs").readFileSync("tickets/tickets.json","utf8"));
console.log(Object.values(db.issues).filter(i=>i.type==="Subtask"&&i.labels.includes("impl-ready-for-review")).map(i=>i.key).join(" "))'); do
    [[ "$merged" == *" $key "* ]] && continue
    branch=$(git branch --format='%(refname:short)' --list "$key-*" | head -1)
    [ -z "$branch" ] && continue
    echo "[$(date +%T)] harness: squash-merging $branch into main"
    git checkout -q main && git merge --squash "$branch" > /dev/null 2>&1 && commit_all "$key merged (squash)"
    merged="$merged$key "
  done
}

run scout "/scout-feature wallpapers /wallpapers"
git checkout -q main 2>/dev/null; commit_all "add: wallpapers plan"
run create-story "/create-story specs/wallpapers.plan.md"
git checkout -q main 2>/dev/null; commit_all "add: tickets and plan updates"
story=$(query story)
if [ -z "$story" ]; then echo "no Story was created, stopping"; exit 1; fi

run "implement-$story" "/implement-ticket $story"
merge_done
tried=" "
for round in 1 2 3 4 5 6 7 8 9 10 11 12; do
  elapsed_ok || { echo "wall-clock limit reached"; break; }
  next=""
  for key in $(query todo); do [[ "$tried" == *" $key "* ]] || { next=$key; break; }; done
  [ -z "$next" ] && break
  tried="$tried$next "
  run "implement-$next" "/implement-ticket $next"
  if [[ " $(query blocked) " == *" $next "* ]]; then
    echo "[$(date +%T)] harness: $next is Blocked, answering gate: extend once"
    interventions=$((interventions + 1))
    step=$((step + 1))
    sid=$(echo "gate: extend" | claude_session "$LOGS/$(printf '%02d' $step)-extend-$next" --resume "$last_sid" "${FLAGS[@]}")
    echo "$sid extend-$next" >> "$LOGS/sessions.txt"
  fi
  merge_done
done
echo "gate-extend answers: $interventions" > "$LOGS/interventions.txt"
git checkout -q main 2>/dev/null; git add -A -f && git -c user.name=experiment -c user.email=experiment@example.com commit -q -m "result" || true
echo "[$(date +%T)] harness: done in $(( ($(date +%s) - START) / 60 )) min wall; summary file: $([ -f RUN-SUMMARY.md ] && echo yes || echo NO)"
