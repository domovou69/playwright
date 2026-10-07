#!/usr/bin/env bash
# Builds ~/projects/experiments/wp-original: the frozen wallpapers suite (tag wallpapers-original) as a runnable project,
# sharing node_modules with this repo. Used only for the evaluation.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
BASE="${EXP_BASE:-$HOME/projects/experiments}"
dir="$BASE/wp-original"
rm -rf "$dir"; mkdir -p "$dir"
git -C "$ROOT" archive wallpapers-original | tar -x -C "$dir"
# Only the wallpapers part: no other areas, no harness, no metrics.
cd "$dir"
rm -rf pages/ringtones pages/notification-sounds tests/ringtones tests/notification-sounds pages/Audio*.ts \
  .github .husky metrics scripts explorbok-experiment explorbot-experiment downloads test-results playwright-report .playwright-mcp
python3 - <<'PY'
import re
s = open('pages/AppPageObjects.ts').read()
s = '\n'.join(l for l in s.split('\n') if not re.search(r'[Rr]ington|[Nn]otification', l))
open('pages/AppPageObjects.ts', 'w').write(s)
PY
ln -s "$ROOT/node_modules" "$dir/node_modules"
echo "built $dir"
