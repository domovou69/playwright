// Stage 5 of specs/agentic-qa-loop.plan.md: self-check before asking a human to review.
//
// Runs every new/changed spec file a fixed number of times (default 3, `--repeat-each`) and reports how many
// runs of each test passed. 3/3 is stable; anything between is flaky; 0/3 is failing. A flaky test that
// carries a @BUG:<KEY> tag gets its ticket labeled `flaky-unconfirmed` (when the JIRA_* env vars are set) so a
// human takes over instead of the agent retrying further. Never touches ticket status.
//
// Usage:
//   npm run verify                       # specs changed vs main, in the working tree, or untracked
//   npm run verify -- --repeat=5
//   npm run verify -- --files=tests/wallpapers/wallpapers-filters-narrow.spec.ts

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const REPORT_FILE = 'test-results/verify-report.json';
const FLAKY_LABEL = 'flaky-unconfirmed';

function parseArgs(argv) {
  const args = {};
  for (const arg of argv) {
    const match = /^--([^=]+)=(.*)$/s.exec(arg);
    if (!match) throw new Error(`Bad argument (expected --key=value): ${arg}`);
    args[match[1]] = match[2];
  }
  return args;
}

function git(...gitArgs) {
  const result = spawnSync('git', gitArgs, { encoding: 'utf8' });
  return result.status === 0 ? result.stdout.split('\n').filter(Boolean) : [];
}

function changedSpecs() {
  const files = new Set([
    ...git('diff', '--name-only', 'main...HEAD'),
    ...git('diff', '--name-only', 'HEAD'),
    ...git('ls-files', '--others', '--exclude-standard'),
  ]);
  return [...files].filter(file => /^tests\/.*\.spec\.ts$/.test(file) && existsSync(file));
}

function collectSpecs(suite, found = []) {
  for (const spec of suite.specs ?? []) {
    const results = spec.tests.map(test => test.results.at(-1)?.status);
    found.push({
      title: spec.title,
      file: spec.file,
      tags: spec.tags,
      passed: results.filter(s => s === 'passed').length,
      total: results.length,
    });
  }
  for (const child of suite.suites ?? []) collectSpecs(child, found);
  return found;
}

async function labelFlaky(issueKey) {
  const { JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN } = process.env;
  if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN) {
    console.log(`${issueKey}: JIRA_* env vars not set - not labeled ${FLAKY_LABEL}`);
    return;
  }
  const res = await fetch(`${JIRA_BASE_URL}/rest/api/3/issue/${issueKey}`, {
    method: 'PUT',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64'),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ update: { labels: [{ add: FLAKY_LABEL }] } }),
  });
  if (!res.ok) throw new Error(`Jira label failed: ${res.status} ${await res.text()}`);
  console.log(`${issueKey}: labeled ${FLAKY_LABEL}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repeat = args.repeat || '3';
  const specs = args.files ? args.files.split(',') : changedSpecs();
  if (!specs.length) {
    console.log('No new or changed spec files - nothing to verify.');
    return;
  }
  console.log(`Verifying ${specs.length} spec file(s) x${repeat}:\n  ${specs.join('\n  ')}\n`);

  spawnSync('npx', ['playwright', 'test', ...specs, `--repeat-each=${repeat}`, '--retries=0', '--reporter=list,json'], {
    stdio: 'inherit',
    env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_NAME: REPORT_FILE },
  });

  const report = JSON.parse(readFileSync(REPORT_FILE, 'utf8'));
  // --repeat-each reports every repeat as its own entry, so sum the repeats of one test.
  const byTest = new Map();
  for (const run of report.suites.flatMap(suite => collectSpecs(suite))) {
    const key = `${run.file}::${run.title}`;
    const sum = byTest.get(key) ?? { title: run.title, tags: run.tags, passed: 0, total: 0 };
    byTest.set(key, { ...sum, passed: sum.passed + run.passed, total: sum.total + run.total });
  }
  const results = [...byTest.values()];
  const flaky = results.filter(r => r.passed > 0 && r.passed < r.total);
  const failing = results.filter(r => r.passed === 0);

  console.log('\nVerdict per test (passed/runs):');
  for (const r of results) {
    const verdict = r.passed === r.total ? 'stable' : r.passed === 0 ? 'FAILING' : 'FLAKY';
    console.log(`  ${r.passed}/${r.total} ${verdict.padEnd(7)} ${r.title}`);
  }

  // The ticket comes from the test's own @BUG:<KEY> tag - a flaky test without one has no ticket to label.
  const tickets = new Set(flaky.flatMap(r => r.tags.map(tag => /^BUG:([A-Z]+-\d+)$/.exec(tag)?.[1]).filter(Boolean)));
  for (const issueKey of tickets) await labelFlaky(issueKey);
  if (flaky.length || failing.length) process.exit(1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
