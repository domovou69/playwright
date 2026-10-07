// Objective metrics for the three wallpapers cases (original, bare, harness), same checks for each.
// Usage (from the repo root): node experiments/wallpapers-rerun/eval/metrics.mjs [case ...]   (default: original bare harness)
// Writes experiments/wallpapers-rerun/eval/metrics.json (merging with what is already there) and prints a summary.
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const BASE = process.env.EXP_BASE ?? join(homedir(), 'projects/experiments');
const OUT = join(ROOT, 'experiments/wallpapers-rerun/eval/metrics.json');
const CASES = {
  original: { dir: join(BASE, 'wp-original'), testPath: 'tests/wallpapers' },
  bare: { dir: join(BASE, 'wp-bare'), testPath: 'tests' },
  harness: { dir: join(BASE, 'wp-harness'), testPath: 'tests' },
};
const wanted = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(CASES);

// Rules that say something about quality for anyone, vs. conventions this project defines (a plain Claude cannot know them).
const UNIVERSAL = new Set([
  'playwright/no-wait-for-timeout',
  'playwright/no-force-option',
  'playwright/no-conditional-in-test',
  'playwright/missing-playwright-await',
  'playwright/expect-expect',
  '@typescript-eslint/no-floating-promises',
  'playwright/no-skipped-test',
  'playwright/no-focused-test',
  'playwright/no-element-handle',
  'playwright/no-eval',
  'playwright/no-page-pause',
  'playwright/no-useless-not',
  'playwright/prefer-web-first-assertions',
  'playwright/no-wait-for-selector',
  'playwright/no-networkidle',
]);

const run = (cmd, args, cwd, extra = {}) => spawnSync(cmd, args, { cwd, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, ...extra });
const walk = (dir, out = []) => {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (['node_modules', '.git', 'test-results', 'playwright-report', '.eval-lint', 'tickets', '.playwright-mcp'].includes(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
};

function specsOf(suite, file = '', found = []) {
  for (const spec of suite.specs ?? []) found.push({ file: suite.file ?? file, title: spec.title, tests: spec.tests });
  for (const child of suite.suites ?? []) specsOf(child, suite.file ?? file, found);
  return found;
}

function stability(c) {
  const res = run('npx', ['playwright', 'test', c.testPath, '--repeat-each=3', '--retries=0', '--workers=3', '--reporter=json'], c.dir, {
    env: { ...process.env, CI: '' },
  });
  let report;
  try {
    report = JSON.parse(res.stdout);
  } catch {
    return { error: (res.stderr || res.stdout).slice(0, 500) };
  }
  const byTest = new Map();
  for (const spec of report.suites.flatMap(s => specsOf(s))) {
    for (const t of spec.tests) {
      const key = `${spec.file} :: ${spec.title} :: ${t.projectName}`;
      const passed = t.results.every(r => r.status === 'passed');
      const entry = byTest.get(key) ?? { runs: 0, passed: 0 };
      entry.runs += t.results.length;
      entry.passed += t.results.filter(r => r.status === 'passed').length;
      byTest.set(key, entry);
      void passed;
    }
  }
  const verdicts = [...byTest.values()].map(e => (e.passed === e.runs ? 'stable' : e.passed === 0 ? 'failing' : 'flaky'));
  return {
    tests: byTest.size,
    stable: verdicts.filter(v => v === 'stable').length,
    flaky: verdicts.filter(v => v === 'flaky').length,
    failing: verdicts.filter(v => v === 'failing').length,
    wallSeconds: Math.round((report.stats?.duration ?? 0) / 1000),
  };
}

function lint(c) {
  const lintDir = join(c.dir, '.eval-lint');
  rmSync(lintDir, { recursive: true, force: true });
  mkdirSync(lintDir);
  const git = (...args) => execFileSync('git', ['-C', ROOT, ...args], { encoding: 'utf8' });
  let config = git('show', 'wallpapers-original:eslint.config.js');
  writeFileSync(join(lintDir, 'tags.ts'), git('show', 'wallpapers-original:src/utils/tags.ts'));
  config = config
    .replace("from './src/utils/tags.ts'", "from './tags.ts'")
    .replace('tsconfigRootDir: import.meta.dirname', 'tsconfigRootDir: process.cwd()')
    .replace("ignores: ['tests/wallpapers/**'],", '');
  writeFileSync(join(lintDir, 'eslint.config.mjs'), config);
  const targets = ['tests', 'pages', 'fixtures'].filter(d => existsSync(join(c.dir, d)));
  const res = run('npx', ['eslint', '-c', '.eval-lint/eslint.config.mjs', '--format', 'json', ...targets], c.dir);
  let files;
  try {
    files = JSON.parse(res.stdout);
  } catch {
    return { error: (res.stderr || res.stdout).slice(0, 500) };
  }
  const byRule = {};
  for (const f of files) for (const m of f.messages) byRule[m.ruleId ?? 'parse-error'] = (byRule[m.ruleId ?? 'parse-error'] ?? 0) + 1;
  const sum = pred =>
    Object.entries(byRule)
      .filter(([rule]) => pred(rule))
      .reduce((n, [, v]) => n + v, 0);
  return { total: sum(() => true), universal: sum(r => UNIVERSAL.has(r)), projectConvention: sum(r => !UNIVERSAL.has(r)), byRule };
}

function pom(c) {
  const skip = new Set(['fixtures/test.ts', 'src/utils/helper.ts', 'src/config/timeouts.ts', 'src/utils/tags.ts', 'playwright.config.ts']);
  const files = walk(c.dir)
    .map(f => relative(c.dir, f))
    .filter(f => f.endsWith('.ts') && !f.endsWith('.spec.ts') && !f.startsWith('tests/') && !skip.has(f) && !f.endsWith('.d.ts'));
  const lines = files.map(f => readFileSync(join(c.dir, f), 'utf8').split('\n').length);
  const strings = {};
  const re = /\.(?:locator|getByRole|getByText|getByLabel|getByTestId|getByPlaceholder|getByAltText|getByTitle)\(\s*(['"`])((?:\\.|(?!\1).)*)\1/g;
  for (const f of files) for (const m of readFileSync(join(c.dir, f), 'utf8').matchAll(re)) strings[m[2]] = (strings[m[2]] ?? 0) + 1;
  const dupes = Object.values(strings).filter(n => n > 1);
  return {
    files: files.length,
    lines: lines.reduce((a, b) => a + b, 0),
    largestFile: Math.max(0, ...lines),
    locatorStrings: Object.keys(strings).length,
    duplicatedLocatorStrings: dupes.length,
    extraDuplicateOccurrences: dupes.reduce((a, n) => a + n - 1, 0),
  };
}

function counts(c) {
  const res = run('npx', ['playwright', 'test', c.testPath, '--list', '--reporter=json'], c.dir);
  let report;
  try {
    report = JSON.parse(res.stdout);
  } catch {
    return { error: (res.stderr || res.stdout).slice(0, 300) };
  }
  const specs = report.suites.flatMap(s => specsOf(s));
  return { tests: specs.reduce((n, s) => n + s.tests.length, 0), specFiles: new Set(specs.map(s => s.file)).size };
}

const tsc = c => {
  const res = run('npx', ['tsc', '--noEmit'], c.dir);
  return { errors: (res.stdout.match(/error TS\d+/g) ?? []).length };
};

const all = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};
for (const name of wanted) {
  const c = CASES[name];
  if (!c || !existsSync(c.dir)) {
    console.error(`skip ${name}: ${c?.dir} does not exist`);
    continue;
  }
  console.error(`== ${name}`);
  all[name] = { counts: counts(c), tsc: tsc(c), lint: lint(c), pom: pom(c), stability: stability(c), measuredAt: new Date().toISOString() };
  writeFileSync(OUT, JSON.stringify(all, null, 2));
  console.error(JSON.stringify({ ...all[name], lint: { ...all[name].lint, byRule: undefined } }));
}
