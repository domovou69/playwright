// File-backed stand-in for scripts/jira-common.mjs, used only in the wallpapers rerun (harness arm).
// Same exports the loop scripts import; the "tracker" is tickets/tickets.json, every write also renders tickets/<KEY>.md.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

export const AGENT_MARKER = '[agent - Claude]';
export const KEY_PREFIX = 'WPR';
const DIR = 'tickets';
const STORE = `${DIR}/tickets.json`;

export function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

// No Jira in this run: scripts that branch on it (verify) skip the Jira part.
export const hasJiraEnv = () => false;

export const LOOP_STATE_LABELS = {
  'plan-draft': 'human',
  'plan-approved': 'human',
  'impl-in-progress': 'agent',
  'impl-ready-for-review': 'human',
  'review-addressed': 'human',
};

export const STATE_LABELS = [
  'needs-repro',
  'repro-confirmed',
  'repro-inconclusive',
  'needs-manual-repro',
  'duplicate-suspected',
  'auto-fix-proposed',
  'needs-human-review',
  ...Object.keys(LOOP_STATE_LABELS),
];

export function load() {
  if (!existsSync(STORE)) return { next: 1, issues: {} };
  return JSON.parse(readFileSync(STORE, 'utf8'));
}

export function save(db) {
  mkdirSync(DIR, { recursive: true });
  writeFileSync(STORE, JSON.stringify(db, null, 2));
  for (const issue of Object.values(db.issues)) writeFileSync(`${DIR}/${issue.key}.md`, render(issue, db));
}

function render(issue, db) {
  const subtasks = Object.values(db.issues).filter(other => other.parent === issue.key);
  return [
    `# ${issue.key} ${issue.summary}`,
    '',
    `Type: ${issue.type} | Status: ${issue.status} | Labels: ${issue.labels.join(', ') || '(none)'}${issue.parent ? ` | Parent: ${issue.parent}` : ''}`,
    ...(subtasks.length ? ['', 'Subtasks:', ...subtasks.map(sub => `- ${sub.key} ${sub.summary} (${sub.status})`)] : []),
    '',
    issue.description,
    ...issue.comments.flatMap(comment => ['', `## Comment ${comment.created}`, comment.text]),
    '',
  ].join('\n');
}

export function get(db, key) {
  const issue = db.issues[key];
  if (!issue) throw new Error(`No such ticket: ${key}`);
  return issue;
}

export const toStateLabels = labels => labels.filter(label => STATE_LABELS.includes(label));

export function setStateLabel(issueKey, label) {
  const db = load();
  const issue = get(db, issueKey);
  issue.labels = [...issue.labels.filter(other => !STATE_LABELS.includes(other)), label];
  save(db);
}

export function addLabel(issueKey, label) {
  const db = load();
  const issue = get(db, issueKey);
  if (!issue.labels.includes(label)) issue.labels.push(label);
  save(db);
}

export function removeLabel(issueKey, label) {
  const db = load();
  const issue = get(db, issueKey);
  issue.labels = issue.labels.filter(other => other !== label);
  save(db);
}

export function postComment(issueKey, text) {
  const db = load();
  get(db, issueKey).comments.push({ created: new Date().toISOString(), text: `${AGENT_MARKER}\n${text}` });
  save(db);
}

export function parseArgs(argv, flags = []) {
  const args = {};
  for (const arg of argv) {
    if (flags.includes(arg)) {
      args[arg.slice(2)] = true;
      continue;
    }
    const match = /^--([^=]+)=(.*)$/s.exec(arg);
    if (!match) throw new Error(`Bad argument (expected --key=value): ${arg}`);
    args[match[1]] = match[2];
  }
  return args;
}
