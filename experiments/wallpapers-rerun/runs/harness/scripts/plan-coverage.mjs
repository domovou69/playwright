#!/usr/bin/env node
// Plan coverage: scenario IDs in a plan (specs/<area>.plan.md) against scenario IDs in test titles, by priority and tag.
//
//   node scripts/plan-coverage.mjs [--plan specs/wallpapers.plan.md] [--json]
//
// Plan headings look like `#### 2.1. WP-02 [P1][Covered - TC-01][@smoke] Title`: the ID, then bracket groups - `[P1]` is
// the priority, `[@tag]` groups are the tags the test is expected to carry. Test titles and tags come from
// `playwright test --list`, so data-driven variants and inherited describe tags are already expanded. Nothing runs.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ID = /[A-Z]{2,}-\d+/;
const HEADING = new RegExp(`^#{2,6}\\s+(?:[\\d.]+\\s+)?(${ID.source})\\s+((?:\\[[^\\]]*\\]\\s*)+)(.*)$`);

function parseArgs(argv) {
  const opts = { plan: 'specs/wallpapers.plan.md', json: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--plan') opts.plan = argv[++i];
    else if (argv[i] === '--json') opts.json = true;
    else throw new Error(`Unknown option: ${argv[i]}`);
  }
  return opts;
}

function expandIds(cell) {
  const range = cell.match(/^([A-Z]{2,}-)(\d+)\.\.(\d+)$/);
  if (!range) return cell.match(new RegExp(ID.source, 'g')) ?? [];
  const width = range[2].length;
  const ids = [];
  for (let n = Number(range[2]); n <= Number(range[3]); n++) ids.push(`${range[1]}${String(n).padStart(width, '0')}`);
  return ids;
}

function parsePlan(path) {
  const scenarios = new Map();
  const removed = new Set();
  let inRemoved = false;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (/^##\s/.test(line)) inRemoved = /^##\s+Removed/i.test(line);
    if (inRemoved && line.startsWith('|')) {
      for (const id of expandIds(line.split('|')[1]?.trim() ?? '')) removed.add(id);
    }
    const heading = line.match(HEADING);
    if (!heading) continue;
    const groups = [...heading[2].matchAll(/\[([^\]]*)\]/g)].map(m => m[1].trim());
    scenarios.set(heading[1], {
      id: heading[1],
      title: heading[3].trim(),
      priority: groups.find(g => /^P\d$/.test(g)) ?? 'P?',
      tags: groups.filter(g => g.startsWith('@')).map(g => g.slice(1)),
    });
  }
  return { scenarios, removed };
}

function listTests() {
  const raw = execFileSync('npx', ['playwright', 'test', '--list', '--reporter=json'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const tests = [];
  const walk = suite => {
    for (const spec of suite.specs ?? []) tests.push({ title: spec.title, tags: spec.tags ?? [], file: spec.file });
    for (const child of suite.suites ?? []) walk(child);
  };
  for (const suite of JSON.parse(raw).suites) walk(suite);
  return tests;
}

function analyze(planPath) {
  const { scenarios, removed } = parsePlan(planPath);
  const tests = listTests();
  const byId = new Map();
  const unplanned = [];
  for (const test of tests) {
    const id = test.title.match(new RegExp(`^(${ID.source})\\b`))?.[1];
    if (!id) unplanned.push({ title: test.title, reason: 'no scenario ID in the title' });
    else if (removed.has(id)) unplanned.push({ title: test.title, reason: `${id} is listed as removed in the plan` });
    else if (!scenarios.has(id)) unplanned.push({ title: test.title, reason: `${id} is not in the plan` });
    else byId.set(id, [...(byId.get(id) ?? []), test]);
  }

  const rows = [...scenarios.values()].map(scenario => {
    const found = byId.get(scenario.id) ?? [];
    const missingTags = scenario.tags.filter(tag => found.some(test => !test.tags.includes(tag)));
    return { ...scenario, tests: found.length, implemented: found.length > 0, missingTags };
  });

  const tally = keyOf => {
    const out = {};
    for (const row of rows) {
      for (const key of keyOf(row)) {
        const bucket = (out[key] ??= { planned: 0, implemented: 0, missing: [] });
        bucket.planned++;
        if (row.implemented) bucket.implemented++;
        else bucket.missing.push(row.id);
      }
    }
    return out;
  };

  return {
    plan: planPath,
    planned: rows.length,
    implemented: rows.filter(row => row.implemented).length,
    testsTotal: tests.length,
    testsMatched: tests.length - unplanned.length,
    byPriority: tally(row => [row.priority]),
    byTag: tally(row => row.tags.map(tag => (tag.startsWith('BUG:') ? 'BUG' : tag))),
    missing: rows.filter(row => !row.implemented).map(row => row.id),
    tagMismatches: rows.filter(row => row.implemented && row.missingTags.length).map(row => ({ id: row.id, missingTags: row.missingTags })),
    unplanned,
    removedInPlan: [...removed],
    scenarios: rows,
  };
}

function render(result) {
  const line = (name, bucket) =>
    `${name.padEnd(12)} planned ${String(bucket.planned).padStart(3)}  implemented ${String(bucket.implemented).padStart(3)}  missing ${bucket.missing.length}${bucket.missing.length ? ` (${bucket.missing.join(', ')})` : ''}`;
  const out = [`Plan ${result.plan}`, '', line('TOTAL', { planned: result.planned, implemented: result.implemented, missing: result.missing }), ''];
  out.push('By priority:');
  for (const [key, bucket] of Object.entries(result.byPriority).sort()) out.push(`  ${line(key, bucket)}`);
  out.push('', 'By expected tag:');
  for (const [key, bucket] of Object.entries(result.byTag).sort()) out.push(`  ${line(`@${key}`, bucket)}`);
  out.push('', `Tests: ${result.testsTotal} listed, ${result.testsMatched} matched to a plan scenario`);
  if (result.tagMismatches.length) {
    out.push('', 'Tag mismatches (plan expects a tag the test lacks):');
    for (const item of result.tagMismatches) out.push(`  ${item.id}: missing @${item.missingTags.join(', @')}`);
  }
  if (result.unplanned.length) {
    out.push('', 'Tests without a plan scenario:');
    for (const item of result.unplanned) out.push(`  "${item.title}": ${item.reason}`);
  }
  return out.join('\n');
}

try {
  const opts = parseArgs(process.argv.slice(2));
  const result = analyze(resolve(opts.plan));
  console.log(opts.json ? JSON.stringify(result, null, 2) : render(result));
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
