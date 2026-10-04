// Shared by the Jira scripts (triage, repro, verify). Env vars are read on use, so a script that does not need
// Jira (verify without JIRA_* set) can still import this file.

// Prefixes every automated comment so it stays distinguishable from a manual one even though it posts under a
// personal account. Model-neutral on purpose - the model changes, the fact that an AI agent wrote the comment doesn't.
export const AGENT_MARKER = '[agent - Claude]';

export function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export function hasJiraEnv() {
  return ['JIRA_BASE_URL', 'JIRA_EMAIL', 'JIRA_API_TOKEN'].every(name => process.env[name]);
}

export async function jira(path, options = {}) {
  const auth = Buffer.from(`${requireEnv('JIRA_EMAIL')}:${requireEnv('JIRA_API_TOKEN')}`).toString('base64');
  const res = await fetch(`${requireEnv('JIRA_BASE_URL')}${path}`, {
    ...options,
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: 'application/json',
      // A FormData body (attachments) must not get a JSON content type - fetch sets the multipart boundary itself.
      ...(typeof options.body === 'string' && { 'Content-Type': 'application/json' }),
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

// Jira Cloud stores description/comment bodies as Atlassian Document Format (ADF), a nested JSON tree, not plain
// text. Flatten it to check for real content and to build search keywords.
export function adfToText(node) {
  if (!node || typeof node !== 'object') return '';
  let text = typeof node.text === 'string' ? node.text : '';
  if (Array.isArray(node.content)) {
    text += node.content.map(adfToText).join(' ');
  }
  return text;
}

// Keys of the configured project become links; without JIRA_PROJECT the text stays plain.
function inline(text) {
  const project = process.env.JIRA_PROJECT;
  const parts = project ? text.split(new RegExp(`(\\b${project}-\\d+\\b)`)) : [text];
  return parts
    .map((part, i) => ({ part, isKey: i % 2 === 1 }))
    .filter(({ part }) => part)
    .map(({ part, isKey }) => {
      if (!isKey) return { type: 'text', text: part };
      const href = `${requireEnv('JIRA_BASE_URL')}/browse/${part}`;
      return { type: 'text', text: part, marks: [{ type: 'link', attrs: { href } }] };
    });
}

// One line per paragraph (a blank line is an empty paragraph); "## " lines become headings; consecutive "- " lines become a
// real bullet list.
export function toAdf(text) {
  const paragraph = value => ({ type: 'paragraph', content: inline(value) });
  const content = [];
  for (const line of text.split('\n')) {
    if (line.startsWith('## ')) {
      content.push({ type: 'heading', attrs: { level: 3 }, content: inline(line.slice(3)) });
    } else if (line.startsWith('- ')) {
      const item = { type: 'listItem', content: [paragraph(line.slice(2))] };
      const last = content.at(-1);
      if (last?.type === 'bulletList') last.content.push(item);
      else content.push({ type: 'bulletList', content: [item] });
    } else {
      content.push(paragraph(line));
    }
  }
  return { type: 'doc', version: 1, content };
}

// Where a ticket is in the pipeline; exactly one at a time, so setting a new one removes the others.
// Any other label (added by a human, or a project label) is never touched.
// Story and Subtask labels of the agent loop (specs/agentic-qa-loop-v2.plan.md) and who the ticket waits for under each one.
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

async function updateLabels(issueKey, operations) {
  await jira(`/rest/api/3/issue/${issueKey}`, {
    method: 'PUT',
    body: JSON.stringify({ update: { labels: operations } }),
  });
}

export const addLabel = (issueKey, label) => updateLabels(issueKey, [{ add: label }]);
export const removeLabel = (issueKey, label) => updateLabels(issueKey, [{ remove: label }]);

export function stateLabelOperations(label) {
  return [{ add: label }, ...STATE_LABELS.filter(other => other !== label).map(other => ({ remove: other }))];
}

export const setStateLabel = (issueKey, label) => updateLabels(issueKey, stateLabelOperations(label));

// The person the loop hands work to: assignee and @mention. The scripts run on that person's own token, so by default it is
// the token's account; JIRA_REVIEWER_ACCOUNT_ID points it at someone else (needed once the loop has its own account, because
// Jira sends no notification for something a user does to themselves).
export async function reviewer() {
  const accountId = process.env.JIRA_REVIEWER_ACCOUNT_ID;
  const user = await jira(accountId ? `/rest/api/3/user?accountId=${encodeURIComponent(accountId)}` : '/rest/api/3/myself');
  return { id: user.accountId, name: user.displayName };
}

export async function assignIssue(issueKey, accountId) {
  await jira(`/rest/api/3/issue/${issueKey}/assignee`, { method: 'PUT', body: JSON.stringify({ accountId }) });
}

export async function transitionIssue(issueKey, statusName) {
  const { transitions } = await jira(`/rest/api/3/issue/${issueKey}/transitions`);
  const transition = transitions.find(t => t.to.name.toLowerCase() === statusName.toLowerCase());
  if (!transition) throw new Error(`${issueKey} has no transition to "${statusName}" (available: ${transitions.map(t => t.to.name).join(', ')})`);
  await jira(`/rest/api/3/issue/${issueKey}/transitions`, { method: 'POST', body: JSON.stringify({ transition: { id: transition.id } }) });
}

// `mention` (the reviewer from reviewer()) becomes its own paragraph right after the marker.
export async function postComment(issueKey, text, mention = null) {
  const body = toAdf(`${AGENT_MARKER}\n${text}`);
  if (mention) {
    body.content.splice(1, 0, { type: 'paragraph', content: [{ type: 'mention', attrs: { id: mention.id, text: `@${mention.name}` } }] });
  }
  await jira(`/rest/api/3/issue/${issueKey}/comment`, { method: 'POST', body: JSON.stringify({ body }) });
}
