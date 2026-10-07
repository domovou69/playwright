#!/usr/bin/env bash
# Evaluation after both runs: build the original, objective metrics, blind pack, judge. Usage (repo root):
#   experiments/wallpapers-rerun/eval.sh
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE/../.."
"$HERE/eval/prepare-original.sh"
node "$HERE/eval/metrics.mjs"
node "$HERE/eval/blind-pack.mjs"
"$HERE/eval/run-judge.sh"
echo "done: see experiments/wallpapers-rerun/eval/ (metrics.json, judge-report.md, judge-scores.json; mapping stays sealed)"
