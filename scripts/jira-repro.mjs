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

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { AGENT_MARKER } from './jira-common.mjs';

const JIRA_BASE_URL = requireEnv('JIRA_BASE_URL');
const JIRA_EMAIL = requireEnv('JIRA_EMAIL');
const JIRA_API_TOKEN = requireEnv('JIRA_API_TOKEN');

// "not-reproduced" deliberately maps to needs-manual-repro, not its own "not-reproduced" label - a
// ticket in this state still needs a human to look at it, it never becomes "not a bug" by itself
// (see the Stage 3 validation gate in the plan).
const OUTCOME_LABELS = {
  reproduced: 'repro-confirmed',
  'not-reproduced': 'needs-manual-repro',
  inconclusive: 'repro-inconclusive',
};

const AUTH_HEADER = 'Basic ' + Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function parseArgs(argv) {
  const args = {};
  for (const arg of argv) {
    const match = /^--([^=]+)=(.*)$/s.exec(arg);
    if (!match) throw new Error(`Bad argument (expected --key=value): ${arg}`);
    args[match[1]] = match[2];
  }
  return args;
}

async function jira(path, options = {}) {
  const res = await fetch(`${JIRA_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: AUTH_HEADER,
      Accept: 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Jira API ${options.method || 'GET'} ${path} failed: ${res.status} ${body}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

function textParagraph(text) {
  return {
    type: 'doc',
    version: 1,
    content: text
      .split('\n')
      .map(line => ({ type: 'paragraph', content: line ? [{ type: 'text', text: line }] : [] })),
  };
}

async function addLabel(issueKey, label) {
  await jira(`/rest/api/3/issue/${issueKey}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ update: { labels: [{ add: label }] } }),
  });
}

async function postComment(issueKey, text) {
  await jira(`/rest/api/3/issue/${issueKey}/comment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body: textParagraph(`${AGENT_MARKER}\n${text}`) }),
  });
}

// Jira's attachment endpoint requires multipart/form-data and the "no-check" XSRF header, and
// explicitly forbids the Content-Type: application/json header the other calls use.
async function uploadAttachment(issueKey, filePath) {
  const fileBuffer = await readFile(filePath);
  const form = new FormData();
  form.append('file', new Blob([fileBuffer]), path.basename(filePath));

  const res = await fetch(`${JIRA_BASE_URL}/rest/api/3/issue/${issueKey}/attachments`, {
    method: 'POST',
    headers: {
      Authorization: AUTH_HEADER,
      Accept: 'application/json',
      'X-Atlassian-Token': 'no-check',
    },
    body: form,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Jira attachment upload failed for ${filePath}: ${res.status} ${body}`);
  }
  return res.json();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const issueKey = args.issue;
  const outcome = args.outcome;
  if (!issueKey) throw new Error('Missing --issue=<KEY>');
  if (!OUTCOME_LABELS[outcome]) {
    throw new Error(`--outcome must be one of: ${Object.keys(OUTCOME_LABELS).join(', ')} (got: ${outcome})`);
  }
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
  await postComment(
    issueKey,
    `Repro attempt outcome: ${outcome}.\n\nSteps run:\n${steps}\n\nNotes: ${notes}\n\n${evidenceLine}`
  );
  await addLabel(issueKey, OUTCOME_LABELS[outcome]);
  console.log(`${issueKey}: labeled ${OUTCOME_LABELS[outcome]}, comment posted.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
