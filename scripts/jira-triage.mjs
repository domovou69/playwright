// Stage 2 of specs/agentic-qa-loop.plan.md: read-only triage assist for Jira tickets.
//
// Never closes, resolves, or changes a ticket's status. Only ever posts a
// clearly-marked comment and adds a label — every decision (duplicate,
// won't-fix, unsupported version) is confirmed by a human, this only proposes.

const JIRA_BASE_URL = requireEnv('JIRA_BASE_URL');
const JIRA_EMAIL = requireEnv('JIRA_EMAIL');
const JIRA_API_TOKEN = requireEnv('JIRA_API_TOKEN');
const JIRA_PROJECT = requireEnv('JIRA_PROJECT');
// Accepts a comma-separated list, tolerant of extra/missing spaces around
// entries or commas (e.g. "ZED-1, ZED-2 ,ZED-3" and "ZED-1,ZED-2,ZED-3" both work).
const ISSUE_KEYS = (process.env.ISSUE_KEYS || '')
  .split(',')
  .map((key) => key.trim())
  .filter(Boolean);

const AGENT_MARKER = '[agent - Claude Sonnet 5]';

// Every label this pipeline can apply. Doubles as the JQL "already triaged"
// marker - a ticket carrying any of these has been through this script before.
const PIPELINE_LABELS = [
  'duplicate-suspected',
  'needs-repro',
  'repro-confirmed',
  'auto-fix-proposed',
  'needs-human-review',
];
const PIPELINE_LABELS_JQL = PIPELINE_LABELS.map((l) => `"${l}"`).join(', ');
const AUTH_HEADER = 'Basic ' + Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

async function jira(path, options = {}) {
  const res = await fetch(`${JIRA_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: AUTH_HEADER,
      Accept: 'application/json',
      'Content-Type': 'application/json',
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

// Jira Cloud stores description/comment bodies as Atlassian Document Format (ADF),
// a nested JSON tree, not plain text. Flatten it to check for real content and to
// build search keywords.
function adfToText(node) {
  if (!node || typeof node !== 'object') return '';
  let text = typeof node.text === 'string' ? node.text : '';
  if (Array.isArray(node.content)) {
    text += node.content.map(adfToText).join(' ');
  }
  return text;
}

function textParagraph(text) {
  return {
    type: 'doc',
    version: 1,
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
  };
}

async function findCandidates() {
  if (ISSUE_KEYS.length > 0) {
    // A typo'd key (or one that got mangled by bad list formatting) must not
    // prevent fetching the rest of the list.
    const results = await Promise.allSettled(
      ISSUE_KEYS.map((key) =>
        jira(`/rest/api/3/issue/${encodeURIComponent(key)}?fields=summary,description,status,labels,updated`)
      )
    );
    results.forEach((result, i) => {
      if (result.status === 'rejected') {
        console.error(`${ISSUE_KEYS[i]}: could not fetch - ${result.reason.message}`);
      }
    });
    return results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
  }
  // No event tells us what changed, so we decide for ourselves - but never by
  // re-scanning the whole backlog. Split into two bounded queries instead:
  //
  // 1. Brand-new bugs that have never been through this pipeline (no pipeline
  //    label yet). This bucket stays small in steady state no matter how many
  //    thousands of tickets exist in total - it's bounded by "how many bugs
  //    are currently untriaged", not by history.
  const freshJql = `project = "${JIRA_PROJECT}" AND issuetype = Bug AND status != Done AND labels not in (${PIPELINE_LABELS_JQL}) ORDER BY created ASC`;
  // 2. Already-triaged bugs edited recently enough that the edit might matter
  //    (e.g. reporter added missing repro steps after getting a "needs more
  //    info" style comment). Bounded by a rolling time window, not backlog
  //    size - a ticket untouched for a week has nothing new to react to.
  const reTriageJql = `project = "${JIRA_PROJECT}" AND issuetype = Bug AND status != Done AND labels in (${PIPELINE_LABELS_JQL}) AND updated >= -7d ORDER BY updated ASC`;

  const fields = 'summary,description,status,labels,updated';
  const [fresh, reTriage] = await Promise.all([
    jira(`/rest/api/3/search/jql?jql=${encodeURIComponent(freshJql)}&fields=${fields}&maxResults=50`),
    jira(`/rest/api/3/search/jql?jql=${encodeURIComponent(reTriageJql)}&fields=${fields}&maxResults=50`),
  ]);
  return [...fresh.issues, ...reTriage.issues];
}

async function alreadyHandledSinceLastUpdate(issue) {
  const hasAnyPipelineLabel = issue.fields.labels?.some((l) => PIPELINE_LABELS.includes(l));
  if (!hasAnyPipelineLabel) return false; // never triaged - skip the extra API call entirely

  const { comments } = await jira(`/rest/api/3/issue/${issue.key}/comment?orderBy=-created`);
  const agentComments = comments.filter(
    (c) => c.author?.emailAddress === JIRA_EMAIL && adfToText(c.body).includes(AGENT_MARKER)
  );
  if (agentComments.length === 0) return false;
  const lastAgentComment = agentComments[0]; // orderBy=-created -> most recent first
  return new Date(lastAgentComment.created) >= new Date(issue.fields.updated);
}

async function findPossibleDuplicates(issue) {
  const summaryText = issue.fields.summary?.trim();
  if (!summaryText) return [];
  // Best-effort only (see plan: Jira full-text search misses paraphrased duplicates).
  // Never treated as authoritative - only surfaced for a human to judge.
  const jql = `project = "${JIRA_PROJECT}" AND key != "${issue.key}" AND text ~ "${summaryText.replace(/"/g, '')}"`;
  const result = await jira(
    `/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&fields=summary&maxResults=5`
  );
  return result.issues;
}

async function addLabel(issueKey, label) {
  await jira(`/rest/api/3/issue/${issueKey}`, {
    method: 'PUT',
    body: JSON.stringify({ update: { labels: [{ add: label }] } }),
  });
}

async function postComment(issueKey, text) {
  await jira(`/rest/api/3/issue/${issueKey}/comment`, {
    method: 'POST',
    body: JSON.stringify({ body: textParagraph(`${AGENT_MARKER} ${text}`) }),
  });
}

async function triageOne(issue) {
  const descriptionText = adfToText(issue.fields.description).trim();
  if (!descriptionText) {
    console.log(`${issue.key}: skipping - no description content yet (created empty, not filled in)`);
    return;
  }

  if (await alreadyHandledSinceLastUpdate(issue)) {
    console.log(`${issue.key}: skipping - already triaged, no changes since`);
    return;
  }

  const duplicates = await findPossibleDuplicates(issue);
  if (duplicates.length > 0) {
    const list = duplicates.map((d) => `${d.key} ("${d.fields.summary}")`).join(', ');
    await addLabel(issue.key, 'duplicate-suspected');
    await postComment(
      issue.key,
      `Possible duplicate(s) found by title search: ${list}. This is a best-effort text match, ` +
        `not a confirmed duplicate - please verify before closing.`
    );
    console.log(`${issue.key}: labeled duplicate-suspected (candidates: ${list})`);
    return;
  }

  await addLabel(issue.key, 'needs-repro');
  await postComment(
    issue.key,
    `No obvious duplicates found (best-effort title search). Marked needs-repro - ` +
      `next step is attempting reproduction (see specs/agentic-qa-loop.plan.md, Stage 3).`
  );
  console.log(`${issue.key}: labeled needs-repro`);
}

async function main() {
  const candidates = await findCandidates();
  console.log(`Found ${candidates.length} candidate ticket(s) to check.`);
  for (const issue of candidates) {
    try {
      await triageOne(issue);
    } catch (err) {
      // One bad ticket must not abort the whole run.
      console.error(`${issue.key}: error during triage - ${err.message}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
