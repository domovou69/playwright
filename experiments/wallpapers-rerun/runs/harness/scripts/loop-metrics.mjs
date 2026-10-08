#!/usr/bin/env node
// Per-group metrics of the agent loop, from git, the GitHub PR (through `gh`) and the Jira label changelog.
//
//   node scripts/loop-metrics.mjs [--raw <ref> --merge <ref>] [--pr <number>] [--ticket <KEY>] [--json]
//        [--agent-pattern <regex>]
//
// Each section runs only when its inputs are given and reports why when it cannot run:
//  - git (--raw, --merge): lines changed by the human between the agent's raw commit and the merge. Commits in
//    raw..merge are split into agent and human commits (message matches --agent-pattern); agent fix commits do not count.
//    Tests added and new POM members are heuristics over the added lines. A squash merge hides the commits: use the branch tip.
//  - PR (--pr): review comments by class prefix ([oracle], [locator], ...). Needs the `gh` CLI, authenticated.
//  - Jira (--ticket): time spent under each state label, from the label changelog, and who was waited for.
// Not implemented yet: POM members reused, recurrence of a finding class against earlier groups (needs metrics/groups.csv).

import { execFileSync } from 'node:child_process';
import { AGENT_MARKER, LOOP_STATE_LABELS, STATE_LABELS, hasJiraEnv, jira } from './jira-common.mjs';

const REVIEW_CLASSES = ['oracle', 'locator', 'convention', 'missing', 'dup-pom', 'flaky', 'other'];
const DEFAULT_AGENT_PATTERN = 'Co-Authored-By:\\s*Claude|\\[agent - Claude\\]';

try {
  process.loadEnvFile();
} catch {
  // No .env file: the Jira section then reports that it has no credentials.
}

function parseArgs(argv) {
  const opts = { raw: null, merge: null, pr: null, ticket: null, json: false, agentPattern: DEFAULT_AGENT_PATTERN };
  const values = { '--raw': 'raw', '--merge': 'merge', '--pr': 'pr', '--ticket': 'ticket', '--agent-pattern': 'agentPattern' };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--json') opts.json = true;
    else if (values[argv[i]]) opts[values[argv[i]]] = argv[++i];
    else throw new Error(`Unknown option: ${argv[i]}`);
  }
  if (!opts.raw && !opts.merge && !opts.pr && !opts.ticket) throw new Error('Nothing to measure: give --raw/--merge, --pr or --ticket');
  if (Boolean(opts.raw) !== Boolean(opts.merge)) throw new Error('--raw and --merge go together');
  return opts;
}

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

function sumNumstat(output) {
  let added = 0;
  let removed = 0;
  for (const line of output.split('\n').filter(Boolean)) {
    const [a, r] = line.split('\t');
    if (a !== '-') added += Number(a); // binary files show "-"
    if (r !== '-') removed += Number(r);
  }
  return { added, removed, changed: added + removed };
}

// Names of tests and POM members at a ref, read from the files as committed. Comparing the two sets means an edit or a move
// of a member between files is not counted as new; a data-driven test counts once, not once per row.
const collect = (ref, dir, extract) => {
  const files = git('ls-tree', '-r', '--name-only', ref, '--', dir)
    .split('\n')
    .filter(name => name.endsWith('.ts'));
  return new Set(files.flatMap(file => extract(git('show', `${ref}:${file}`))));
};
const testTitles = source =>
  [...source.matchAll(/\btest(?:\.(?:only|skip|fixme|fail))?\(\s*(['"`])((?:(?!\1)[^\\]|\\.)*)\1/g)].map(match => match[2]);
const pomMembers = source =>
  [...source.matchAll(/^ {2}(?:(?:public|private|protected|readonly|static|async|get|set)\s+)*([A-Za-z_#]\w*)\s*[(:=<]/gm)].map(match => match[1]);

function gitSection(raw, merge, agentPattern) {
  const pattern = new RegExp(agentPattern, 'i');
  const shas = git('rev-list', '--no-merges', '--reverse', `${raw}..${merge}`).split('\n').filter(Boolean);
  const commits = shas.map(sha => {
    const message = git('log', '-1', '--format=%B', sha);
    return {
      sha: sha.slice(0, 7),
      subject: message.split('\n')[0],
      byAgent: pattern.test(message),
      ...sumNumstat(git('show', '--numstat', '--format=', sha)),
    };
  });
  const human = commits.filter(commit => !commit.byAgent);
  const base = `${raw}^`;
  const testsBefore = collect(base, 'tests', testTitles);
  const membersBefore = collect(base, 'pages', pomMembers);
  return {
    commits,
    agentCommits: commits.length - human.length,
    humanCommits: human.length,
    humanEdits: human.reduce((sum, commit) => sum + commit.changed, 0),
    wholeDiffRawToMerge: sumNumstat(git('diff', '--numstat', raw, merge)),
    testsAddedHeuristic: [...collect(merge, 'tests', testTitles)].filter(title => !testsBefore.has(title)).length,
    pomMembersNewHeuristic: [...collect(merge, 'pages', pomMembers)].filter(name => !membersBefore.has(name)).length,
  };
}

export function classifyComment(body) {
  const match = body.match(/^\s*\[([a-z-]+)\]/i);
  const name = match?.[1].toLowerCase();
  return REVIEW_CLASSES.includes(name) ? name : 'unclassified';
}

function ghJson(endpoint) {
  const out = execFileSync('gh', ['api', '--paginate', endpoint, '--jq', '.[] | {id, body, in_reply_to_id, path}'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  return out
    .split('\n')
    .filter(Boolean)
    .map(line => JSON.parse(line));
}

function prSection(number) {
  try {
    execFileSync('gh', ['--version'], { stdio: 'ignore' });
  } catch {
    return { available: false, reason: 'the gh CLI is not installed or not on PATH' };
  }
  try {
    // Line comments on the diff; a reply from the agent carries the marker and is not a finding.
    const findings = ghJson(`repos/:owner/:repo/pulls/${number}/comments`).filter(c => !c.in_reply_to_id && !c.body.includes(AGENT_MARKER));
    const byClass = {};
    for (const comment of findings) byClass[classifyComment(comment.body)] = (byClass[classifyComment(comment.body)] ?? 0) + 1;
    return { available: true, total: findings.length, byClass };
  } catch (error) {
    return { available: false, reason: `gh api failed: ${error.message.split('\n')[0]}` };
  }
}

async function changelogHistories(key) {
  const histories = [];
  for (let startAt = 0; ;) {
    const page = await jira(`/rest/api/3/issue/${key}/changelog?startAt=${startAt}&maxResults=100`);
    histories.push(...page.values);
    startAt += page.values.length;
    if (page.isLast || page.values.length === 0) return histories;
  }
}

async function jiraSection(key) {
  if (!hasJiraEnv()) return { available: false, reason: 'JIRA_BASE_URL / JIRA_EMAIL / JIRA_API_TOKEN are not set' };
  const known = new Set(STATE_LABELS);
  const issue = await jira(`/rest/api/3/issue/${key}?fields=created,labels`);
  const events = [];
  for (const history of await changelogHistories(key)) {
    for (const item of history.items.filter(i => i.field === 'labels')) {
      const before = new Set((item.fromString ?? '').split(' ').filter(Boolean));
      for (const label of (item.toString ?? '').split(' ').filter(Boolean)) {
        if (!before.has(label) && known.has(label)) events.push({ label, at: Date.parse(history.created) });
      }
    }
  }
  events.sort((a, b) => a.at - b.at);
  const now = Date.now();
  const phases = events.map((event, i) => {
    const until = events[i + 1]?.at ?? now;
    return {
      label: event.label,
      since: new Date(event.at).toISOString(),
      open: !events[i + 1],
      minutes: Math.round((until - event.at) / 60000),
      waitingOn: LOOP_STATE_LABELS[event.label] ?? 'n/a (bug triage label)',
    };
  });
  const waiting = {};
  for (const phase of phases) waiting[phase.waitingOn] = (waiting[phase.waitingOn] ?? 0) + phase.minutes;
  return {
    available: true,
    created: issue.fields.created,
    currentLabels: issue.fields.labels,
    stateLabelChanges: events.length,
    phases,
    minutesByWaitingOn: waiting,
  };
}

function render(result) {
  const out = [];
  if (result.git) {
    const g = result.git;
    out.push(`git ${result.range}: ${g.commits.length} commits (${g.agentCommits} agent, ${g.humanCommits} human)`);
    for (const c of g.commits) out.push(`  ${c.sha} ${c.byAgent ? 'agent' : 'HUMAN'} +${c.added}/-${c.removed}  ${c.subject}`);
    out.push(`  human_edits (lines changed by human commits): ${g.humanEdits}`);
    out.push(`  whole raw..merge diff for reference: +${g.wholeDiffRawToMerge.added}/-${g.wholeDiffRawToMerge.removed}`);
    out.push(`  tests added (heuristic): ${g.testsAddedHeuristic}, new POM members (heuristic): ${g.pomMembersNewHeuristic}`);
  }
  if (result.pr) {
    out.push(
      result.pr.available ? `PR review findings: ${result.pr.total} ${JSON.stringify(result.pr.byClass)}` : `PR: not measured - ${result.pr.reason}`
    );
  }
  if (result.jira) {
    if (!result.jira.available) out.push(`Jira: not measured - ${result.jira.reason}`);
    else {
      out.push(
        `Jira ${result.ticket}: ${result.jira.stateLabelChanges} state label changes, now: ${result.jira.currentLabels.join(', ') || '(no labels)'}`
      );
      for (const p of result.jira.phases)
        out.push(
          `  ${p.label.padEnd(22)} ${String(p.minutes).padStart(7)} min  waiting on ${p.waitingOn}${p.open ? '  (still open)' : ''}  since ${p.since}`
        );
      out.push(`  minutes by who is waited for: ${JSON.stringify(result.jira.minutesByWaitingOn)}`);
    }
  }
  return out.join('\n');
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const result = { range: opts.raw ? `${opts.raw}..${opts.merge}` : null, ticket: opts.ticket };
  if (opts.raw) result.git = gitSection(opts.raw, opts.merge, opts.agentPattern);
  if (opts.pr) result.pr = prSection(opts.pr);
  if (opts.ticket) result.jira = await jiraSection(opts.ticket);
  console.log(opts.json ? JSON.stringify(result, null, 2) : render(result));
}

if (import.meta.filename === process.argv[1]) {
  main().catch(error => {
    console.error(error.message);
    process.exit(1);
  });
}
