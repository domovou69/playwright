// Stage 3 of specs/agentic-qa-loop.plan.md: records a reproduction attempt's outcome on a Jira ticket.
//
// This script does NOT reconstruct repro steps or run them - that's an agent (interactively, using
// judgment over a possibly-vague ticket description) driving Playwright MCP against production. This
// script only finalizes the result once that's done: uploads evidence, posts a marked comment with the
// steps that were run, and applies the one outcome label that matches. Never touches status - same rule
// as Stage 2's jira-triage.mjs.
//
// Usage:
//   node scripts/jira-repro.mjs --issue=ZED-3 --outcome=reproduced \
//     --steps="1. Open /wallpapers\n2. ..." \
//     --notes="Confirmed: interstitial ad overlays the download button on mobile viewport (390x844)." \
//     --evidence=test-results/repro-zed-3.png,test-results/repro-zed-3-trace.zip
//
// A duplicate the agent confirmed by meaning (triage only suggests keyword matches) is recorded with
//   --outcome=duplicate-suspected --of=ZED-2 --reason="Same overlay on the download button, same viewport."
// It stays a suspicion: the ticket is never closed or linked as a duplicate here, a human decides.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { addLabel, jira, postComment } from './jira-common.mjs';

// "not-reproduced" deliberately maps to needs-manual-repro, not its own "not-reproduced" label - a
// ticket in this state still needs a human to look at it, it never becomes "not a bug" by itself
// (see the Stage 3 validation gate in the plan).
const OUTCOME_LABELS = {
  reproduced: 'repro-confirmed',
  'not-reproduced': 'needs-manual-repro',
  inconclusive: 'repro-inconclusive',
  'duplicate-suspected': 'duplicate-suspected',
};

function parseArgs(argv) {
  const args = {};
  for (const arg of argv) {
    const match = /^--([^=]+)=(.*)$/s.exec(arg);
    if (!match) throw new Error(`Bad argument (expected --key=value): ${arg}`);
    args[match[1]] = match[2];
  }
  return args;
}

// Jira's attachment endpoint requires multipart/form-data and the "no-check" XSRF header.
async function uploadAttachment(issueKey, filePath) {
  const fileBuffer = await readFile(filePath);
  const form = new FormData();
  form.append('file', new Blob([fileBuffer]), path.basename(filePath));
  return jira(`/rest/api/3/issue/${issueKey}/attachments`, {
    method: 'POST',
    headers: { 'X-Atlassian-Token': 'no-check' },
    body: form,
  });
}

// The agent names the original by meaning; the script only checks it exists and quotes its title.
async function duplicateLines(issueKey, of, reason) {
  if (!of || !reason) throw new Error('--outcome=duplicate-suspected needs --of=<KEY> and --reason=<why it is the same bug>');
  if (of === issueKey) throw new Error('--of must be a different ticket');
  const original = await jira(`/rest/api/3/issue/${encodeURIComponent(of)}?fields=summary`);
  return `Suspected duplicate of ${original.key} ("${original.fields.summary}").\nReason: ${reason}\n\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const issueKey = args.issue;
  const outcome = args.outcome;
  if (!issueKey) throw new Error('Missing --issue=<KEY>');
  if (!OUTCOME_LABELS[outcome]) {
    throw new Error(`--outcome must be one of: ${Object.keys(OUTCOME_LABELS).join(', ')} (got: ${outcome})`);
  }
  if (outcome !== 'duplicate-suspected' && (args.of || args.reason)) {
    throw new Error('--of and --reason are only for --outcome=duplicate-suspected');
  }
  const duplicate = outcome === 'duplicate-suspected' ? await duplicateLines(issueKey, args.of, args.reason) : '';
  const steps = args.steps || '(not provided)';
  const notes = args.notes || '(none)';
  const evidencePaths = (args.evidence || '')
    .split(',')
    .map(p => p.trim())
    .filter(Boolean);

  const uploaded = [];
  for (const filePath of evidencePaths) {
    const attachment = await uploadAttachment(issueKey, filePath);
    uploaded.push(attachment[0]?.filename ?? path.basename(filePath));
    console.log(`${issueKey}: uploaded evidence ${filePath}`);
  }

  const evidenceLine = uploaded.length ? `Evidence attached: ${uploaded.join(', ')}.` : 'No evidence attached.';
  await postComment(issueKey, `Repro attempt outcome: ${outcome}.\n\n${duplicate}Steps run:\n${steps}\n\nNotes: ${notes}\n\n${evidenceLine}`);
  await addLabel(issueKey, OUTCOME_LABELS[outcome]);
  console.log(`${issueKey}: labeled ${OUTCOME_LABELS[outcome]}, comment posted.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
