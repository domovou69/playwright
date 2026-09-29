// Stage 2 of specs/agentic-qa-loop.plan.md: read-only triage assist for Jira tickets.
//
// Never closes, resolves, or changes a ticket's status. Only ever posts a
// clearly-marked comment and adds a label — every decision (duplicate,
// won't-fix, unsupported version) is confirmed by a human, this only proposes.

import { AGENT_MARKER, STATE_LABELS, adfToText, jira, postComment, requireEnv, setStateLabel } from './jira-common.mjs';

const JIRA_EMAIL = requireEnv('JIRA_EMAIL');
const JIRA_PROJECT = requireEnv('JIRA_PROJECT');
// Accepts a comma-separated list, tolerant of extra/missing spaces around
// entries or commas (e.g. "ZED-1, ZED-2 ,ZED-3" and "ZED-1,ZED-2,ZED-3" both work).
const ISSUE_KEYS = (process.env.ISSUE_KEYS || '')
  .split(',')
  .map(key => key.trim())
  .filter(Boolean);
// DRY_RUN=1: read from Jira, print what would be posted, write nothing.
const DRY_RUN = process.env.DRY_RUN === '1';

// Doubles as the JQL "already triaged" marker - a ticket carrying any state label has been through this script before.
const PIPELINE_LABELS = STATE_LABELS;
const PIPELINE_LABELS_JQL = PIPELINE_LABELS.map(l => `"${l}"`).join(', ');
async function findCandidates() {
  if (ISSUE_KEYS.length > 0) {
    // A typo'd key (or one that got mangled by bad list formatting) must not
    // prevent fetching the rest of the list.
    const results = await Promise.allSettled(
      ISSUE_KEYS.map(key => jira(`/rest/api/3/issue/${encodeURIComponent(key)}?fields=summary,description,status,labels,updated`))
    );
    results.forEach((result, i) => {
      if (result.status === 'rejected') {
        console.error(`${ISSUE_KEYS[i]}: could not fetch - ${result.reason.message}`);
      }
    });
    return results.filter(r => r.status === 'fulfilled').map(r => r.value);
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
  const hasAnyPipelineLabel = issue.fields.labels?.some(l => PIPELINE_LABELS.includes(l));
  if (!hasAnyPipelineLabel) return false; // never triaged - skip the extra API call entirely

  const { comments } = await jira(`/rest/api/3/issue/${issue.key}/comment?orderBy=-created`);
  const agentComments = comments.filter(c => c.author?.emailAddress === JIRA_EMAIL && adfToText(c.body).includes(AGENT_MARKER));
  if (agentComments.length === 0) return false;
  const lastAgentComment = agentComments[0]; // orderBy=-created -> most recent first
  return new Date(lastAgentComment.created) >= new Date(issue.fields.updated);
}

// Keyword overlap, not semantics: the script only proposes candidates, the agent session judges by meaning.
// A shared word scores 2 when it is in this ticket's title, 1 when it is only in the description.
const MIN_SCORE = 5;
const MAX_QUERY_KEYWORDS = 10;
const MAX_CANDIDATES = 5;
const MAX_SHOWN_TERMS = 6;
const STOP_WORDS = new Set(
  (
    'about above after again also always because been before being below between both cannot could does doing done down ' +
    'during each either else even ever every expected actual from have here into issue just like make many more most ' +
    'much must never only other over same should since some steps still such than that their them then there these they ' +
    'this those through under until upon very want were what when where whether which while will with without would your ' +
    'page site wallpaper zedge reproduce result results happens shows show click https http reproduced production chromium firefox webkit browser'
  ).split(' ')
);

// Light plural/suffix trim, enough to match "downloads" with "download"; Jira applies its own stemming on the query side.
const stem = word => (word.length > 5 ? word.replace(/(ing|ed|es|s)$/, '') : word.replace(/s$/, ''));

function keywords(text) {
  const words = text.toLowerCase().match(/(?<![\p{L}\p{N}])\p{L}[\p{L}\p{N}]{3,}/gu) ?? [];
  return [...new Set(words)].filter(word => !STOP_WORDS.has(word) && !STOP_WORDS.has(stem(word)));
}

function issueText(issue) {
  return `${issue.fields.summary ?? ''} ${adfToText(issue.fields.description)}`;
}

// Words present in more than half of the tickets are template boilerplate ("reproduced", "production", ...).
function boilerplate(wordLists) {
  if (wordLists.length < 4) return new Set();
  const counts = new Map();
  for (const words of wordLists) {
    for (const stemmed of new Set(words.map(stem))) counts.set(stemmed, (counts.get(stemmed) ?? 0) + 1);
  }
  return new Set([...counts].filter(([, count]) => count > wordLists.length / 2).map(([stemmed]) => stemmed));
}

async function findPossibleDuplicates(issue) {
  const title = keywords(issue.fields.summary ?? '');
  const mine = [...new Set([...title, ...keywords(issueText(issue))])];
  if (mine.length === 0) return [];
  // Jira's `text ~ "a b"` needs every term, so one OR per keyword casts the net; the scoring below narrows it.
  const terms = mine.slice(0, MAX_QUERY_KEYWORDS).map(word => `text ~ "${word}"`);
  const jql = `project = "${JIRA_PROJECT}" AND key != "${issue.key}" AND (${terms.join(' OR ')})`;
  const result = await jira(`/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&fields=summary,description&maxResults=30`);

  const others = result.issues.map(candidate => ({ key: candidate.key, summary: candidate.fields.summary, words: keywords(issueText(candidate)) }));
  const common = boilerplate([mine, ...others.map(other => other.words)]);
  const titleStems = new Set(title.map(stem));
  return others
    .map(other => {
      const theirStems = new Set(other.words.map(stem));
      const shared = mine.filter(word => theirStems.has(stem(word)) && !common.has(stem(word)));
      const score = shared.reduce((sum, word) => sum + (titleStems.has(stem(word)) ? 2 : 1), 0);
      return { key: other.key, summary: other.summary, shared, score };
    })
    .filter(candidate => candidate.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key))
    .slice(0, MAX_CANDIDATES);
}

// The only place that writes to Jira, so DRY_RUN covers every write.
async function applyTriage(issueKey, label, text) {
  if (DRY_RUN) {
    console.log(
      `[dry-run] ${issueKey}: would set state label "${label}" and post:\n${[AGENT_MARKER, text].map(line => `    ${line.replaceAll('\n', '\n    ')}`).join('\n')}`
    );
    return;
  }
  await setStateLabel(issueKey, label);
  await postComment(issueKey, text);
}

async function triageOne(issue) {
  const descriptionText = adfToText(issue.fields.description).trim();
  if (!descriptionText) {
    console.log(`${issue.key}: skipping - no description content yet (created empty, not filled in)`);
    return;
  }

  if (await alreadyHandledSinceLastUpdate(issue)) {
    if (!DRY_RUN) {
      console.log(`${issue.key}: skipping - already triaged, no changes since`);
      return;
    }
    console.log(`${issue.key}: already triaged, no changes since (a real run would skip it; dry run continues)`);
  }

  // Keyword overlap is only a hint, so it never sets `duplicate-suspected`: that label comes from jira-repro.mjs
  // once an agent has read both tickets and agrees.
  const related = await findPossibleDuplicates(issue);
  const relatedLines =
    related.length > 0
      ? [
          'Possibly related (keyword overlap, not confirmed - judge by meaning):',
          ...related.map(r => `- ${r.key} ("${r.summary}") - shared: ${r.shared.slice(0, MAX_SHOWN_TERMS).join(', ')}`),
        ]
      : ['Possibly related: no keyword overlap found'];
  await applyTriage(issue.key, 'needs-repro', ['Triage: needs-repro', ...relatedLines, 'Next step: reproduce against production'].join('\n'));
  console.log(`${issue.key}: needs-repro${related.length > 0 ? ` (possibly related: ${related.map(r => r.key).join(', ')})` : ''}`);
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

main().catch(err => {
  console.error(err);
  process.exit(1);
});
