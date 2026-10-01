// Stage 7 of specs/agentic-qa-loop-v2.plan.md: creates a Story, Subtask, Bug or Task (a fix-test ticket) in the configured Jira project.
//
// The description always starts with the agent marker on its own line, so a ticket the automation created is distinguishable
// from a manual one. A ticket is created in the project's first status and never moved: statuses are the human's.
//
// Usage:
//   node scripts/jira-create.mjs --type=Story --summary="Ringtones: guest list and search" \
//     --description-file=/tmp/story.txt --state=plan-approved
//   node scripts/jira-create.mjs --type=Subtask --parent=ZED-12 --summary="Ringtones: search" --description-file=/tmp/group.txt
//   node scripts/jira-create.mjs --type=Bug --summary="..." --description-file=/tmp/bug.txt      (only after `gate: file bug`)
//
// Add --dry-run to print the payload and check the inputs without creating anything.

import { readFile } from 'node:fs/promises';
import { AGENT_MARKER, STATE_LABELS, jira, requireEnv, toAdf } from './jira-common.mjs';

const TYPES = { Story: 'Story', Subtask: 'Subtask', Bug: 'Bug', Task: 'Task' };

function parseArgs(argv) {
  const args = {};
  for (const arg of argv) {
    if (arg === '--dry-run') {
      args.dryRun = true;
      continue;
    }
    const match = /^--([^=]+)=(.*)$/s.exec(arg);
    if (!match) throw new Error(`Bad argument (expected --key=value): ${arg}`);
    args[match[1]] = match[2];
  }
  return args;
}

async function buildPayload(args) {
  const type = TYPES[args.type];
  if (!type) throw new Error(`--type must be one of ${Object.keys(TYPES).join(', ')}`);
  if (!args.summary?.trim()) throw new Error('--summary is required');
  if (type === 'Subtask' && !args.parent) throw new Error('--type=Subtask needs --parent=<Story key>');
  if (type !== 'Subtask' && args.parent) throw new Error('--parent is only for --type=Subtask');
  if (args.state && !STATE_LABELS.includes(args.state)) throw new Error(`--state must be one of: ${STATE_LABELS.join(', ')}`);
  const body = args['description-file'] ? await readFile(args['description-file'], 'utf8') : (args.description ?? '');
  if (!body.trim()) throw new Error('--description-file (or --description) is required and must not be empty');

  const extraLabels = (args.labels ?? '').split(',').filter(Boolean);
  const stateLabels = extraLabels.filter(label => STATE_LABELS.includes(label));
  if (stateLabels.length) throw new Error(`Pass state labels through --state, not --labels (got ${stateLabels.join(', ')})`);

  return {
    fields: {
      project: { key: requireEnv('JIRA_PROJECT') },
      issuetype: { name: type },
      summary: args.summary.trim(),
      description: toAdf(`${AGENT_MARKER}\n${body.trimEnd()}`),
      labels: [...(args.state ? [args.state] : []), ...extraLabels],
      ...(args.parent && { parent: { key: args.parent } }),
    },
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const payload = await buildPayload(args);
  if (args.dryRun) {
    console.log('DRY RUN, nothing created. Payload:');
    console.log(JSON.stringify(payload, null, 2));
    return;
  }
  const created = await jira('/rest/api/3/issue', { method: 'POST', body: JSON.stringify(payload) });
  console.log(`${created.key} ${requireEnv('JIRA_BASE_URL')}/browse/${created.key}`);
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
