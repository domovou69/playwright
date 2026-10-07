// File-backed stand-in for scripts/jira-ticket.mjs (wallpapers rerun). Same commands. `gate` is always open: every gate of
// the run is approved in advance. Status rules for Story and Bug are kept as in the original.
import { readFileSync } from 'node:fs';
import { STATE_LABELS, get, load, parseArgs, postComment, save, setStateLabel, toStateLabels } from './jira-common.mjs';

const SUBTASK_STATUSES = ['In Progress', 'Blocked', 'Done'];

function view(db, issue, withComments) {
  const subtasks = Object.values(db.issues).filter(other => other.parent === issue.key);
  return {
    key: issue.key,
    type: issue.type,
    summary: issue.summary,
    description: issue.description.replace(/\s+/g, ' ').trim(),
    status: issue.status,
    labels: issue.labels,
    stateLabels: toStateLabels(issue.labels),
    parent: issue.parent,
    subtasks: subtasks.map(sub => ({ key: sub.key, summary: sub.summary, status: sub.status })),
    ...(withComments && { comments: issue.comments.map(c => ({ created: c.created, text: c.text.replace(/\s+/g, ' ').trim() })) }),
  };
}

try {
  const [command, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest, ['--dry-run', '--comments', '--mention']);
  if (!args.issue) throw new Error('--issue=<KEY> is required');
  const db = load();
  const issue = get(db, args.issue);

  if (command === 'show') {
    console.log(JSON.stringify(view(db, issue, args.comments), null, 2));
  } else if (command === 'gate') {
    console.log(
      `GATE OPEN for ${issue.key}: status "${issue.status}", state ${toStateLabels(issue.labels).join(', ') || '(none)'} (approved in advance)`
    );
  } else if (command === 'label') {
    if (!STATE_LABELS.includes(args.set)) throw new Error(`--set must be one of: ${STATE_LABELS.join(', ')}`);
    if (args['dry-run']) console.log(`DRY RUN: would set state label "${args.set}" on ${issue.key}`);
    else {
      setStateLabel(issue.key, args.set);
      console.log(`${issue.key}: state label is now ${args.set}`);
    }
  } else if (command === 'comment') {
    if (!args.file) throw new Error('--file=<path> is required');
    const text = readFileSync(args.file, 'utf8').trimEnd();
    if (args['dry-run']) console.log(`DRY RUN: would comment on ${issue.key}:\n${text}`);
    else {
      postComment(issue.key, text);
      console.log(`${issue.key}: comment posted`);
    }
  } else if (command === 'assign') {
    console.log(`${issue.key}: assigned to the owner (no-op in this run)`);
  } else if (command === 'transition') {
    if (!args.to) throw new Error('--to=<status> is required');
    if (issue.type === 'Subtask') {
      if (!SUBTASK_STATUSES.some(status => status.toLowerCase() === args.to.toLowerCase()))
        throw new Error(`A Subtask moves only to: ${SUBTASK_STATUSES.join(', ')}`);
    } else if (issue.type === 'Story') {
      const open = Object.values(db.issues)
        .filter(sub => sub.parent === issue.key && sub.status !== 'Done')
        .map(sub => sub.key);
      if (args.to.toLowerCase() !== 'done') throw new Error('A Story status other than Done is the human gate: the automation does not set it');
      if (open.length) throw new Error(`${issue.key} cannot be Done: Subtasks not Done: ${open.join(', ')}`);
    } else {
      throw new Error(`${issue.key} is a ${issue.type}: the automation does not change its status`);
    }
    if (args['dry-run']) console.log(`DRY RUN: would move ${issue.key} from "${issue.status}" to "${args.to}"`);
    else {
      const was = issue.status;
      issue.status = args.to;
      save(db);
      console.log(`${issue.key}: status is now ${args.to} (was "${was}")`);
    }
  } else {
    throw new Error('Usage: jira-ticket.mjs show|gate|label|comment|assign|transition --issue=<KEY> ...');
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
