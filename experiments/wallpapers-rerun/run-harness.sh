#!/usr/bin/env bash
# Run 2: full harness. /scout-feature, /create-story, then /implement-ticket for the Story and for every Subtask, each command in
# its own fresh session; gates are approved in advance. Resumable: steps that already happened (plan, Story, Subtasks) are skipped,
# so the script can be started again after a stop. Commits the result at the end.
set -uo pipefail
source "$(dirname "$0")/common.sh"
DIR="$BASE/wp-harness"; LOGS="$HERE/logs/harness"; mkdir -p "$LOGS"
cd "$DIR"; START=$(date +%s)
[ -f "$LOGS/started.txt" ] || date -u +%Y-%m-%dT%H:%M:%SZ > "$LOGS/started.txt"
FLAGS=("${COMMON_FLAGS[@]}")
interventions=$(grep -o '[0-9]*' "$LOGS/interventions.txt" 2>/dev/null | head -1); interventions=${interventions:-0}

NOTES='Run notes for this run (they replace nothing in the command, they only adapt it to an environment without Jira and GitHub):
- There is no remote and no Jira. Skip git push, gh pr create, gh pr diff and gh pr comment. Commit on the ticket branch as the command says; self-review the local diff (git diff main...HEAD) and write the self-review result into the Subtask comment instead of a PR comment.
- Every gate is approved in advance: gate: plan approved, gate: file bug, gate: extend. Do not stop to ask for approval or for an "ok" on the Story text; decide yourself whether something is a bug.
- Tickets are files in tickets/ (the Jira scripts are stand-ins with the same commands). The format reference plan is specs/notification-sounds.plan.md; the area wallpapers (prefix WP, tag @wallpapers) is already in the Areas table and no wallpapers plan exists yet.
- This is a headless session and it ends the moment you reply. Run tests and other long commands in the foreground and wait for them; never start a background command and end your turn to wait for it.'

step=$(ls "$LOGS"/[0-9][0-9]-*.json 2>/dev/null | wc -l | tr -d ' ')
note_interventions() { echo "interventions (gate: extend answers and continues): $interventions" > "$LOGS/interventions.txt"; }

stopped() { node -e 'try{process.exit(/^\s*BUDGET STOP/.test(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).result||"")?0:1)}catch{process.exit(1)}' "$1"; }

run() { # run <name> <prompt> <slice file>
  step=$((step + 1))
  echo "[$(date +%T)] harness: $1"
  local log="$LOGS/$(printf '%02d' $step)-$1"
  last_sid=$(printf '%s\n\n%s\n\nTask text for this step:\n%s\n' "$2" "$NOTES" "$(cat "$HERE/$3")" | claude_session "$log" "${FLAGS[@]}")
  echo "$last_sid $1" >> "$LOGS/sessions.txt"
  # A BUDGET STOP at 60 active minutes (loop rule) is answered with gate: extend, at most twice per step.
  local n=0
  while stopped "$log.json" && [ "$n" -lt 2 ]; do
    n=$((n + 1)); interventions=$((interventions + 1)); step=$((step + 1)); note_interventions
    echo "[$(date +%T)] harness: $1 hit BUDGET STOP, answering gate: extend ($n)"
    log="$LOGS/$(printf '%02d' $step)-extend-$1"
    last_sid=$(echo "gate: extend" | claude_session "$log" --resume "$last_sid" "${FLAGS[@]}")
    echo "$last_sid $1" >> "$LOGS/sessions.txt"
  done
}

query() { node -e '
const db=JSON.parse(require("fs").readFileSync("tickets/tickets.json","utf8"));const all=Object.values(db.issues);
const subs=all.filter(i=>i.type==="Subtask");const mode=process.argv[1];
if(mode==="story")console.log((all.find(i=>i.type==="Story")||{}).key||"");
if(mode==="count")console.log(subs.length);
if(mode==="todo")console.log(subs.filter(i=>!i.labels.includes("impl-ready-for-review")).map(i=>i.key).join(" "));
if(mode==="started")console.log(subs.filter(i=>!i.labels.includes("impl-ready-for-review")&&i.labels.includes("impl-in-progress")).map(i=>i.key).join(" "));
if(mode==="ready")console.log(subs.filter(i=>i.labels.includes("impl-ready-for-review")).map(i=>i.key).join(" "));
' "$1" 2>/dev/null; }

commit_all() { git add -A && git -c user.name=experiment -c user.email=experiment@example.com commit -q -m "$1" || true; }
merge_done() { # the human step with no PR: squash-merge a finished group into main
  local merged=" $(git log main --format=%s 2>/dev/null | grep -o '^WPR-[0-9]*' | tr '\n' ' ')"
  for key in $(query ready); do
    [[ "$merged" == *" $key "* ]] && continue
    branch=$(git branch --format='%(refname:short)' --list "$key-*" | head -1)
    [ -z "$branch" ] && continue
    echo "[$(date +%T)] harness: squash-merging $branch into main"
    git checkout -q main && git merge --squash "$branch" > /dev/null 2>&1 && commit_all "$key merged (squash)"
  done
}

sid_of() { grep " implement-$1\$" "$LOGS/sessions.txt" | tail -1 | cut -d' ' -f1; }
# A headless session can end before the command is finished (for example after a background test run). Continue the same session
# up to 3 times while the Subtask has not reached impl-ready-for-review; each continue is an intervention.
finish() { # finish <key> [session lookup name]
  local key=$1 lookup=${2:-$1} n=0
  while [[ " $(query todo) " == *" $key "* ]] && [ "$n" -lt 3 ] && elapsed_ok; do
    local sid; sid=$(sid_of "$lookup"); [ -z "$sid" ] && break
    n=$((n + 1)); interventions=$((interventions + 1)); step=$((step + 1)); note_interventions
    echo "[$(date +%T)] harness: $key is not at impl-ready-for-review, continuing the same session ($n)"
    local log="$LOGS/$(printf '%02d' $step)-continue-$key" new
    new=$(echo "Continue from where you stopped and complete every remaining step of the command: verify, plan-coverage, the commit on the ticket branch, the self-review and the Subtask comment with the label impl-ready-for-review. Run long commands in the foreground." | claude_session "$log" --resume "$sid" "${FLAGS[@]}")
    [ -n "$new" ] && echo "$new implement-$key" >> "$LOGS/sessions.txt"
  done
}

if [ ! -f specs/wallpapers.plan.md ]; then
  run scout "/scout-feature wallpapers /wallpapers" brief-explore.md
  git checkout -q main 2>/dev/null; commit_all "add: wallpapers plan"
fi
if [ -z "$(query story)" ]; then
  run create-story "/create-story specs/wallpapers.plan.md" brief-story.md
  git checkout -q main 2>/dev/null; commit_all "add: tickets and plan updates"
fi
story=$(query story)
if [ -z "$story" ]; then echo "no Story was created, stopping"; exit 1; fi

if [ "$(query count)" = 0 ]; then
  run "implement-$story" "/implement-ticket $story" brief-implement.md
  for key in $(query started); do finish "$key" "$story"; done
  merge_done
fi
for key in $(query started); do finish "$key"; done   # a Subtask left half-done by a stop
merge_done

tried=" "
for round in 1 2 3 4 5 6 7 8 9 10 11 12; do
  elapsed_ok || { echo "wall-clock limit reached"; break; }
  git checkout -q main 2>/dev/null
  if [ -n "$(git status --porcelain)" ]; then echo "[$(date +%T)] harness: working tree is dirty, stopping the loop"; break; fi
  next=""
  for key in $(query todo); do [[ "$tried" == *" $key "* ]] || { next=$key; break; }; done
  [ -z "$next" ] && break
  tried="$tried$next "
  run "implement-$next" "/implement-ticket $next" brief-implement.md
  finish "$next"
  merge_done
done
note_interventions
rm -f RUN-SUMMARY.md
run summary "Write the run summary." brief-summary.md
git checkout -q main 2>/dev/null; git add -A && git add -f tickets && git -c user.name=experiment -c user.email=experiment@example.com commit -q -m "result" || true
echo "[$(date +%T)] harness: done in $(( ($(date +%s) - START) / 60 )) min wall in this launch; summary file: $([ -f RUN-SUMMARY.md ] && echo yes || echo NO)"
