#!/usr/bin/env bash
# Builds the two run directories of specs/wallpapers-rerun.plan.md from the tag wallpapers-original, outside this repo.
# Usage: experiments/wallpapers-rerun/setup.sh [bare|harness|both]   (default both). Existing run directories are replaced.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
TAG=wallpapers-original
BASE="${EXP_BASE:-$HOME/projects/experiments}"

build() {
  local arm=$1 dir="$BASE/wp-$1"
  echo "== building $arm in $dir"
  rm -rf "$dir"
  mkdir -p "$dir"
  git -C "$ROOT" archive "$TAG" | tar -x -C "$dir"
  cd "$dir"

  # Everything that is not the environment layer: page objects, tests, plans, metrics, CI, docs, secrets, wallpaper-specific strings.
  rm -rf pages tests metrics explorbot-experiment .github .husky README.md currents.config.ts .env downloads LICENSE \
    src/utils/locals.ts src/types test-results playwright-report .playwright-mcp

  python3 - "$arm" <<'PY'
import json, re, sys
arm = sys.argv[1]

# playwright.config.ts: no Currents reporter.
cfg = open('playwright.config.ts').read()
cfg = re.sub(r"import \{ currentsReporter \} from '@currents/playwright';\n", '', cfg)
cfg = re.sub(r"  reporter: .*\n", "  reporter: [['list'], ['html', { open: 'never' }]],\n", cfg)
open('playwright.config.ts', 'w').write(cfg)

# fixtures/test.ts: keep the cookie handler and ad blocking, drop the page-object fixture.
fx = open('fixtures/test.ts').read()
fx = fx.replace("import { AppPageObjects } from '../pages/AppPageObjects';\n", '')
fx = fx.replace("  app: AppPageObjects;\n", '')
fx = re.sub(r"\n  app: async \(\{ page \}, use\) => \{\n    await use\(new AppPageObjects\(page\)\);\n  \},\n", "\n", fx)
open('fixtures/test.ts', 'w').write(fx)

# package.json: no hooks that point at removed files; the bare arm keeps one script.
pkg = json.load(open('package.json'))
pkg.pop('lint-staged', None)
pkg.get('scripts', {}).pop('prepare', None)
if arm == 'bare':
    pkg['scripts'] = {'test': 'playwright test'}
json.dump(pkg, open('package.json', 'w'), indent=2)
open('package.json', 'a').write('\n')

json.dump({'mcpServers': {'playwright-test': {'command': 'npx', 'args': ['playwright', 'run-test-mcp-server', '--headless']}}},
          open('.mcp.json', 'w'), indent=2)
open('.mcp.json', 'a').write('\n')

if arm == 'harness':
    md = open('CLAUDE.md').read()
    md = '\n'.join(line for line in md.split('\n') if not re.match(r'\| (ringtones|notification sounds) ', line))
    open('CLAUDE.md', 'w').write(md)
PY

  if [ "$arm" = bare ]; then
    rm -rf CLAUDE.md .claude specs scripts eslint.config.js .prettierrc .prettierignore src/utils/tags.ts
  else
    # Harness: keep .claude, CLAUDE.md, eslint, scripts; specs only with the Story template and one plan as the format reference.
    rm -rf specs
    git -C "$ROOT" archive "$TAG" specs/templates specs/notification-sounds.plan.md | tar -x -C "$dir"
    cp "$HERE"/shim/*.mjs scripts/
    mkdir -p tickets
  fi

  printf '\n# experiment run\n.playwright-mcp/\ndownloads/\n' >> .gitignore
  [ "$arm" = harness ] && printf 'tickets/\n' >> .gitignore
  git init -q -b main
  git add -A
  git -c user.name=experiment -c user.email=experiment@example.com commit -q -m "baseline: environment layer ($arm)"
  npm ci --silent --no-audit --no-fund
  echo "   files: $(git ls-files | wc -l | tr -d ' ') tracked; top level: $(ls | tr '\n' ' ')"
}

case "${1:-both}" in
  bare) build bare ;;
  harness) build harness ;;
  both) build bare; build harness ;;
  *) echo "usage: $0 [bare|harness|both]" >&2; exit 2 ;;
esac
