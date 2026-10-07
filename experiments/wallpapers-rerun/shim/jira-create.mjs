// File-backed stand-in for scripts/jira-create.mjs (wallpapers rerun). Same options; prints "<KEY> tickets/<KEY>.md".
import { readFileSync } from 'node:fs';
import { AGENT_MARKER, KEY_PREFIX, STATE_LABELS, get, load, parseArgs, save } from './jira-common.mjs';

const TYPES = ['Story', 'Subtask', 'Bug', 'Task'];

try {
  const args = parseArgs(process.argv.slice(2), ['--dry-run']);
  if (!TYPES.includes(args.type)) throw new Error(`--type must be one of ${TYPES.join(', ')}`);
  if (!args.summary?.trim()) throw new Error('--summary is required');
  if (args.type === 'Subtask' && !args.parent) throw new Error('--type=Subtask needs --parent=<Story key>');
  if (args.type !== 'Subtask' && args.parent) throw new Error('--parent is only for --type=Subtask');
  if (args.state && !STATE_LABELS.includes(args.state)) throw new Error(`--state must be one of: ${STATE_LABELS.join(', ')}`);
  const body = args['description-file'] ? readFileSync(args['description-file'], 'utf8') : (args.description ?? '');
  if (!body.trim()) throw new Error('--description-file (or --description) is required and must not be empty');
  const extra = (args.labels ?? '').split(',').filter(Boolean);
  if (extra.some(label => STATE_LABELS.includes(label))) throw new Error('Pass state labels through --state, not --labels');

  const db = load();
  if (args.parent) get(db, args.parent);
  const issue = {
    key: `${KEY_PREFIX}-${db.next}`,
    type: args.type,
    summary: args.summary.trim(),
    description: `${AGENT_MARKER}\n${body.trimEnd()}`,
    status: 'To Do',
    labels: [...(args.state ? [args.state] : []), ...extra],
    parent: args.parent ?? null,
    comments: [],
  };
  if (args['dry-run']) {
    console.log(`DRY RUN, nothing created. Payload:\n${JSON.stringify(issue, null, 2)}`);
  } else {
    db.next += 1;
    db.issues[issue.key] = issue;
    save(db);
    console.log(`${issue.key} tickets/${issue.key}.md`);
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
