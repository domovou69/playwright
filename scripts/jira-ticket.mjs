// Stage 7 of specs/agentic-qa-loop-v2.plan.md: what the loop commands do with an existing ticket. It reads, sets the state
// label, comments (optionally @mentioning the reviewer), assigns the reviewer and moves a Subtask between statuses. A Story
// can only be moved to Done once every Subtask is Done; any other issue type (a Bug) is never moved.
//
// Usage:
//   node scripts/jira-ticket.mjs show --issue=ZED-12 [--comments]     (type, status, labels, description, subtasks)
//   node scripts/jira-ticket.mjs gate --issue=ZED-12 --status="In Progress" [--label=plan-approved,impl-in-progress]
//   node scripts/jira-ticket.mjs label --issue=ZED-12 --set=impl-ready-for-review
//   node scripts/jira-ticket.mjs comment --issue=ZED-12 --file=/tmp/comment.txt [--mention]
//   node scripts/jira-ticket.mjs assign --issue=ZED-12                (the reviewer: the token's account, or JIRA_REVIEWER_ACCOUNT_ID)
//   node scripts/jira-ticket.mjs transition --issue=ZED-12 --to="In Progress"|Blocked|Done
//
// `gate` exits 1 with the reason when the ticket is not in the expected status (and, if given, does not carry one of the
// expected state labels): this is how a command refuses to start on a ticket that has not passed its human gate.
// Add --dry-run to `label`, `comment`, `assign` and `transition` to print what would be sent.

import { readFile } from 'node:fs/promises';
import { AGENT_MARKER, STATE_LABELS, adfToText, assignIssue, jira, postComment, reviewer, setStateLabel, transitionIssue } from './jira-common.mjs';

const SUBTASK_STATUSES = ['In Progress', 'Blocked', 'Done'];

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const args = { command };
  for (const arg of rest) {
    if (arg === '--dry-run' || arg === '--comments' || arg === '--mention') {
      args[{ '--dry-run': 'dryRun', '--comments': 'comments', '--mention': 'mention' }[arg]] = true;
      continue;
    }
    const match = /^--([^=]+)=(.*)$/s.exec(arg);
    if (!match) throw new Error(`Bad argument (expected --key=value): ${arg}`);
    args[match[1]] = match[2];
  }
  if (!args.issue) throw new Error('--issue=<KEY> is required');
  return args;
}

async function loadTicket(key) {
  const issue = await jira(`/rest/api/3/issue/${encodeURIComponent(key)}?fields=summary,description,status,labels,issuetype,parent,subtasks`);
  const f = issue.fields;
  return {
    key: issue.key,
    type: f.issuetype.name,
    summary: f.summary,
    // Plain text with the headings and bullets of the template; the Story's `## Groups` is read from here.
    description: adfToText(f.description).replace(/\s+/g, ' ').trim(),
    status: f.status.name,
    labels: f.labels,
    stateLabels: f.labels.filter(label => STATE_LABELS.includes(label)),
    parent: f.parent?.key ?? null,
    subtasks: (f.subtasks ?? []).map(sub => ({ key: sub.key, summary: sub.fields.summary, status: sub.fields.status.name })),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.command === 'show') {
    const ticket = await loadTicket(args.issue);
    if (args.comments) {
      const page = await jira(`/rest/api/3/issue/${encodeURIComponent(args.issue)}/comment?maxResults=100`);
      ticket.comments = page.comments.map(c => ({ created: c.created, text: adfToText(c.body).replace(/\s+/g, ' ').trim() }));
    }
    console.log(JSON.stringify(ticket, null, 2));
  } else if (args.command === 'gate') {
    const ticket = await loadTicket(args.issue);
    const problems = [];
    if (args.status && ticket.status.toLowerCase() !== args.status.toLowerCase()) {
      problems.push(`status is "${ticket.status}", expected "${args.status}"`);
    }
    const wanted = (args.label ?? '').split(',').filter(Boolean);
    if (wanted.length && !wanted.some(label => ticket.labels.includes(label))) {
      problems.push(`state label is ${ticket.stateLabels.join(', ') || '(none)'}, expected one of: ${wanted.join(', ')}`);
    }
    if (problems.length) {
      console.error(`GATE CLOSED for ${ticket.key} (${ticket.summary}): ${problems.join('; ')}`);
      process.exit(1);
    }
    console.log(`GATE OPEN for ${ticket.key}: status "${ticket.status}", state ${ticket.stateLabels.join(', ') || '(none)'}`);
  } else if (args.command === 'label') {
    if (!STATE_LABELS.includes(args.set)) throw new Error(`--set must be one of: ${STATE_LABELS.join(', ')}`);
    if (args.dryRun) console.log(`DRY RUN: would set state label "${args.set}" on ${args.issue}`);
    else {
      await setStateLabel(args.issue, args.set);
      console.log(`${args.issue}: state label is now ${args.set}`);
    }
  } else if (args.command === 'comment') {
    if (!args.file) throw new Error('--file=<path> is required');
    const text = (await readFile(args.file, 'utf8')).trimEnd();
    const mention = args.mention ? await reviewer() : null;
    if (args.dryRun) console.log(`DRY RUN: would comment on ${args.issue}:\n${AGENT_MARKER}\n${mention ? `@${mention.name}\n` : ''}${text}`);
    else {
      await postComment(args.issue, text, mention);
      console.log(`${args.issue}: comment posted${mention ? `, mentioning ${mention.name}` : ''}`);
    }
  } else if (args.command === 'assign') {
    const person = await reviewer();
    if (args.dryRun) console.log(`DRY RUN: would assign ${args.issue} to ${person.name}`);
    else {
      await assignIssue(args.issue, person.id);
      console.log(`${args.issue}: assigned to ${person.name}`);
    }
  } else if (args.command === 'transition') {
    if (!args.to) throw new Error('--to=<status> is required');
    const ticket = await loadTicket(args.issue);
    if (ticket.type === 'Subtask') {
      if (!SUBTASK_STATUSES.some(status => status.toLowerCase() === args.to.toLowerCase()))
        throw new Error(`A Subtask moves only to: ${SUBTASK_STATUSES.join(', ')}`);
    } else if (ticket.type === 'Story') {
      const open = ticket.subtasks.filter(sub => sub.status !== 'Done').map(sub => sub.key);
      if (args.to.toLowerCase() !== 'done') throw new Error('A Story status other than Done is the human gate: the automation does not set it');
      if (open.length) throw new Error(`${ticket.key} cannot be Done: Subtasks not Done: ${open.join(', ')}`);
    } else {
      throw new Error(`${ticket.key} is a ${ticket.type}: the automation does not change its status`);
    }
    if (args.dryRun) console.log(`DRY RUN: would move ${args.issue} from "${ticket.status}" to "${args.to}"`);
    else {
      await transitionIssue(args.issue, args.to);
      console.log(`${args.issue}: status is now ${args.to} (was "${ticket.status}")`);
    }
  } else {
    throw new Error('Usage: jira-ticket.mjs show|gate|label|comment|assign|transition --issue=<KEY> ...');
  }
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
