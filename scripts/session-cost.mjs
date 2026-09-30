#!/usr/bin/env node
// Per-session metrics from Claude Code transcripts (~/.claude/projects/<project>/<session>.jsonl plus
// <session>/subagents/*.jsonl): models and effort, four token classes, API-equivalent dollars, active minutes,
// human messages (gates vs interventions) and MCP calls per server.
//
//   node scripts/session-cost.mjs <session-id-prefix | path.jsonl> [...] [--all] [--json | --csv]
//        [--from <iso>] [--until <iso>] [--project-dir <dir>] [--prices metrics/prices.json]
//
// --from / --until limit everything (tokens, active time, messages, MCP) to a time window, for a session that holds
// several tasks or to compare with a cost snapshot taken at a known moment.
//
// A streamed assistant message is written once per content block, all lines carrying the same usage, so usage is
// counted once per message id (the copy with the largest total, because a few retries leave zero-filled copies).
//
// Known gaps, checked against the `cost-state` Claude Code writes into the transcript (see specs/retrospective.md):
//  - output_tokens in subagent transcripts is a partial snapshot, so output and dollars are a lower bound when
//    subagents ran (main-session output matches exactly);
//  - Haiku side calls (titles, WebFetch summaries) are not in transcripts at all.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join, resolve } from 'node:path';

const ACTIVE_GAP_CAP_MS = 5 * 60 * 1000;
const ACTIVITY_TYPES = new Set(['user', 'assistant', 'system', 'queue-operation']);
// Typed by a human but housekeeping, not a correction of the agent.
const HOUSEKEEPING_COMMANDS = new Set(['/compact', '/model', '/effort', '/clear', '/cost', '/usage', '/context', '/resume', '/help', '/status']);
const CSV_COLUMNS = [
  'session_id',
  'started',
  'task',
  'ticket',
  'models',
  'effort_seen',
  'input_tokens',
  'cache_creation_tokens',
  'cache_read_tokens',
  'output_tokens',
  'api_usd',
  'active_min',
  'interventions',
  'gates',
  'budget_stops',
  'mcp_calls',
  'mcp_result_tokens_est',
  'mcp_decisive',
  'human_review_min',
];

function parseArgs(argv) {
  const opts = { sessions: [], all: false, json: false, csv: false, projectDir: null, prices: null, from: -Infinity, until: Infinity };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--all') opts.all = true;
    else if (arg === '--json') opts.json = true;
    else if (arg === '--csv') opts.csv = true;
    else if (arg === '--project-dir') opts.projectDir = argv[++i];
    else if (arg === '--prices') opts.prices = argv[++i];
    else if (arg === '--from') opts.from = Date.parse(argv[++i]);
    else if (arg === '--until') opts.until = Date.parse(argv[++i]);
    else if (arg.startsWith('--')) throw new Error(`Unknown option: ${arg}`);
    else opts.sessions.push(arg);
  }
  if (!opts.all && opts.sessions.length === 0) throw new Error('Usage: session-cost.mjs <session-id | path.jsonl> [...] [--all] [--json | --csv]');
  return opts;
}

function defaultProjectDir() {
  return join(homedir(), '.claude', 'projects', process.cwd().replace(/[^a-zA-Z0-9]/g, '-'));
}

function resolveSessionFiles(opts, projectDir) {
  const inDir = readdirSync(projectDir).filter(name => name.endsWith('.jsonl'));
  if (opts.all) return inDir.sort().map(name => join(projectDir, name));
  return opts.sessions.map(ref => {
    if (ref.endsWith('.jsonl') && existsSync(ref)) return resolve(ref);
    const matches = inDir.filter(name => name.startsWith(ref));
    if (matches.length !== 1) throw new Error(`Session "${ref}" matches ${matches.length} files in ${projectDir}`);
    return join(projectDir, matches[0]);
  });
}

function readJsonl(file) {
  const entries = [];
  let bad = 0;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line) continue;
    try {
      entries.push(JSON.parse(line));
    } catch {
      bad++;
    }
  }
  return { entries, bad };
}

function loadPrices(path) {
  const file = path ?? join(import.meta.dirname, '..', 'metrics', 'prices.json');
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, 'utf8'));
}

function totalTokens(usage) {
  return (usage.input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0) + (usage.output_tokens ?? 0);
}

function textOf(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('\n');
}

// What the human actually typed: drop the IDE context and system reminders the extension prepends.
function typedText(content) {
  return textOf(content)
    .replace(/<ide_[a-z_]+>[\s\S]*?<\/ide_[a-z_]+>/g, '')
    .replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '')
    .trim();
}

function resultChars(content) {
  if (typeof content === 'string') return { chars: content.length, images: 0 };
  if (!Array.isArray(content)) return { chars: 0, images: 0 };
  let chars = 0;
  let images = 0;
  for (const block of content) {
    if (block.type === 'text') chars += block.text.length;
    else if (block.type === 'image') images++;
  }
  return { chars, images };
}

function emptyTokens() {
  return { messages: 0, input: 0, cacheCreation5m: 0, cacheCreation1h: 0, cacheRead: 0, output: 0, thinking: 0, webSearches: 0 };
}

function addUsage(bucket, usage) {
  const created = usage.cache_creation_input_tokens ?? 0;
  const created1h = usage.cache_creation?.ephemeral_1h_input_tokens ?? 0;
  bucket.messages++;
  bucket.input += usage.input_tokens ?? 0;
  bucket.cacheCreation1h += created1h;
  bucket.cacheCreation5m += created - created1h;
  bucket.cacheRead += usage.cache_read_input_tokens ?? 0;
  bucket.output += usage.output_tokens ?? 0;
  bucket.thinking += usage.output_tokens_details?.thinking_tokens ?? 0;
  bucket.webSearches += usage.server_tool_use?.web_search_requests ?? 0;
}

function dollars(bucket, model, prices) {
  const key = prices?.aliases?.[model] ?? model;
  const price = prices?.models?.[key];
  if (!price) return null;
  const perMillion =
    bucket.input * price.input +
    bucket.cacheCreation5m * price.cacheWrite5m +
    bucket.cacheCreation1h * price.cacheWrite1h +
    bucket.cacheRead * price.cacheRead +
    bucket.output * price.output;
  return perMillion / 1e6 + bucket.webSearches * (prices.perRequest?.webSearch ?? 0);
}

function activeMinutes(timestamps) {
  const sorted = [...timestamps].sort((a, b) => a - b);
  let ms = 0;
  for (let i = 1; i < sorted.length; i++) ms += Math.min(sorted[i] - sorted[i - 1], ACTIVE_GAP_CAP_MS);
  return { activeMin: ms / 60000, wallMin: sorted.length ? (sorted[sorted.length - 1] - sorted[0]) / 60000 : 0 };
}

function analyzeSession(mainFile, prices, window) {
  const sessionId = basename(mainFile, '.jsonl');
  const subDir = join(mainFile.slice(0, -'.jsonl'.length), 'subagents');
  const sources = [{ file: mainFile, agent: '(main)', isMain: true }];
  if (existsSync(subDir)) {
    for (const name of readdirSync(subDir)
      .filter(n => n.endsWith('.jsonl'))
      .sort()) {
      const metaFile = join(subDir, name.replace(/\.jsonl$/, '.meta.json'));
      const meta = existsSync(metaFile) ? JSON.parse(readFileSync(metaFile, 'utf8')) : {};
      sources.push({ file: join(subDir, name), agent: meta.agentType ?? name, description: meta.description, isMain: false });
    }
  }

  const messages = new Map();
  const toolUses = new Map();
  const toolResults = new Map();
  const humans = [];
  const timestamps = [];
  let badLines = 0;

  for (const source of sources) {
    const { entries, bad } = readJsonl(source.file);
    badLines += bad;
    for (const entry of entries) {
      const ts = Date.parse(entry.timestamp);
      if (Number.isFinite(ts) && (ts < window.from || ts > window.until)) continue;
      if (ACTIVITY_TYPES.has(entry.type) && Number.isFinite(ts)) timestamps.push(ts);

      if (entry.type === 'assistant' && entry.message?.usage && entry.message.model !== '<synthetic>') {
        const id = entry.message.id;
        const previous = messages.get(id);
        if (!previous || totalTokens(entry.message.usage) > totalTokens(previous.usage)) {
          messages.set(id, {
            usage: entry.message.usage,
            model: entry.message.model,
            effort: entry.effort ?? null,
            perTurnEffort: entry.perTurnEffort ?? null,
            agent: source.agent,
            description: source.description,
          });
        }
        for (const block of entry.message.content ?? []) {
          if (block.type === 'tool_use' && !toolUses.has(block.id)) toolUses.set(block.id, block.name);
        }
      } else if (entry.type === 'user' && Array.isArray(entry.message?.content)) {
        for (const block of entry.message.content) {
          if (block.type === 'tool_result') toolResults.set(block.tool_use_id, { ...resultChars(block.content), isError: block.is_error === true });
        }
      }

      if (source.isMain) {
        const isHumanEntry = entry.type === 'user' && !entry.isMeta && entry.origin?.kind === 'human';
        const queued = entry.type === 'attachment' && entry.attachment?.type === 'queued_command' && entry.attachment.origin?.kind === 'human';
        if (isHumanEntry || queued) humans.push({ ts, text: typedText(isHumanEntry ? entry.message.content : entry.attachment.prompt) });
      }
    }
  }

  const byModel = {};
  const byAgent = {};
  const effortPairs = {};
  for (const message of messages.values()) {
    addUsage((byModel[message.model] ??= emptyTokens()), message.usage);
    const agentKey = message.agent === '(main)' ? message.agent : `${message.agent}: ${message.description ?? ''}`;
    const agent = (byAgent[agentKey] ??= { models: {}, ...emptyTokens() });
    addUsage(agent, message.usage);
    addUsage((agent.models[message.model] ??= emptyTokens()), message.usage);
    const pair = `${message.effort ?? '-'}/${message.perTurnEffort ?? '-'}`;
    effortPairs[pair] = (effortPairs[pair] ?? 0) + 1;
  }

  const totals = emptyTokens();
  let apiUsd = 0;
  const unpriced = [];
  for (const [model, bucket] of Object.entries(byModel)) {
    for (const key of Object.keys(totals)) totals[key] += bucket[key];
    bucket.usd = dollars(bucket, model, prices);
    if (bucket.usd === null) unpriced.push(model);
    else apiUsd += bucket.usd;
  }
  for (const agent of Object.values(byAgent)) {
    const costs = Object.entries(agent.models).map(([model, bucket]) => dollars(bucket, model, prices));
    agent.usd = costs.includes(null) ? null : costs.reduce((sum, cost) => sum + cost, 0);
  }

  const warnings = [];
  const subagentMessages = Object.entries(byAgent).reduce((sum, [name, a]) => sum + (name === '(main)' ? 0 : a.messages), 0);
  if (subagentMessages > 0) {
    warnings.push(`${subagentMessages} subagent messages: their output_tokens are partial in the transcript, so output and API $ are a lower bound`);
  }
  warnings.push('Haiku side calls (titles, WebFetch summaries) are not in transcripts and are not counted');

  humans.sort((a, b) => a.ts - b.ts);
  const followUps = humans.slice(1);
  const command = text => text.match(/<command-name>(\/[^<]+)<\/command-name>/)?.[1] ?? null;
  const housekeeping = followUps.filter(m => HOUSEKEEPING_COMMANDS.has(command(m.text)));
  const counted = followUps.filter(m => !HOUSEKEEPING_COMMANDS.has(command(m.text)));
  const gates = counted.filter(m => /^gate:/i.test(m.text)).length;

  const mcp = {};
  for (const [id, name] of toolUses) {
    if (!name.startsWith('mcp__')) continue;
    const [, server, ...rest] = name.split('__');
    const result = toolResults.get(id);
    const entry = (mcp[server] ??= { calls: 0, errors: 0, resultChars: 0, resultTokensEst: 0, images: 0, withoutResult: 0, tools: {} });
    entry.calls++;
    entry.tools[rest.join('__')] = (entry.tools[rest.join('__')] ?? 0) + 1;
    if (!result) entry.withoutResult++;
    else {
      entry.errors += result.isError ? 1 : 0;
      entry.resultChars += result.chars;
      entry.images += result.images;
    }
  }
  // No tokenizer offline: chars / 4 is the usual rough rule and undercounts on the newer tokenizer (about +30%).
  for (const entry of Object.values(mcp)) entry.resultTokensEst = Math.ceil(entry.resultChars / 4);

  const { activeMin, wallMin } = activeMinutes(timestamps);
  const started = timestamps.length ? new Date(Math.min(...timestamps)).toISOString() : null;
  return {
    sessionId,
    started,
    models: byModel,
    effortPairs,
    tokens: totals,
    apiUsd: unpriced.length ? null : apiUsd,
    unpricedModels: unpriced,
    activeMin,
    wallMin,
    human: {
      startMessage: humans.length > 0,
      followUps: counted.length,
      gates,
      interventions: counted.length - gates,
      housekeepingCommands: housekeeping.length,
    },
    mcp,
    agents: byAgent,
    subagentFiles: sources.length - 1,
    warnings,
    badLines,
  };
}

const fmt = n => n.toLocaleString('en-US');
const usd = n => (n === null ? 'n/a' : `$${n.toFixed(2)}`);
const minutes = n => `${n.toFixed(1)} min`;

function table(rows) {
  const widths = rows[0].map((_, col) => Math.max(...rows.map(row => String(row[col]).length)));
  return rows
    .map(row => row.map((cell, col) => (col === 0 ? String(cell).padEnd(widths[col]) : String(cell).padStart(widths[col]))).join('  '))
    .join('\n');
}

function render(s) {
  const out = [];
  out.push(`Session ${s.sessionId}  started ${s.started}  (${s.subagentFiles} subagent files)`);
  out.push('');
  const header = ['model', 'msgs', 'input', 'cache-create (5m+1h)', 'cache-read', 'output (thinking)', 'API $'];
  const rows = [header];
  const row = (name, b, cost) => [
    name,
    fmt(b.messages),
    fmt(b.input),
    `${fmt(b.cacheCreation5m + b.cacheCreation1h)} (${fmt(b.cacheCreation5m)}+${fmt(b.cacheCreation1h)})`,
    fmt(b.cacheRead),
    `${fmt(b.output)} (${fmt(b.thinking)})`,
    usd(cost),
  ];
  for (const [model, b] of Object.entries(s.models)) rows.push(row(model, b, b.usd));
  rows.push(row('TOTAL', s.tokens, s.apiUsd));
  out.push(table(rows));
  if (s.unpricedModels.length) out.push(`! no price for: ${s.unpricedModels.join(', ')}`);
  out.push('');
  out.push(
    `effort seen (session/perTurn, messages): ${Object.entries(s.effortPairs)
      .map(([k, v]) => `${k} x${v}`)
      .join(', ')}`
  );
  out.push(`active ${minutes(s.activeMin)} of ${minutes(s.wallMin)} wall (gaps capped at 5 min)`);
  out.push(
    `human: ${s.human.followUps} follow-up messages after the start message = ${s.human.gates} gates + ${s.human.interventions} interventions` +
      ` (${s.human.housekeepingCommands} housekeeping slash commands not counted)`
  );
  const mcpRows = [['mcp server', 'calls', 'errors', 'result tokens (est)', 'images']];
  for (const [server, m] of Object.entries(s.mcp)) mcpRows.push([server, fmt(m.calls), fmt(m.errors), fmt(m.resultTokensEst), fmt(m.images)]);
  out.push('');
  out.push(mcpRows.length > 1 ? table(mcpRows) : 'mcp: no calls');
  const agentRows = [['agent', 'model', 'msgs', 'API $']];
  for (const [name, a] of Object.entries(s.agents))
    if (name !== '(main)') agentRows.push([name.slice(0, 60), Object.keys(a.models).join('+'), fmt(a.messages), usd(a.usd)]);
  if (agentRows.length > 1) {
    out.push('');
    out.push(table(agentRows));
  }
  out.push('');
  for (const warning of s.warnings) out.push(`! ${warning}`);
  if (s.badLines) out.push(`! ${s.badLines} unparsable lines skipped`);
  return out.join('\n');
}

function csvRow(s) {
  const mcpCalls = Object.values(s.mcp).reduce((sum, m) => sum + m.calls, 0);
  const mcpTokens = Object.values(s.mcp).reduce((sum, m) => sum + m.resultTokensEst, 0);
  const values = {
    session_id: s.sessionId,
    started: s.started,
    models: Object.keys(s.models).join('+'),
    effort_seen: Object.keys(s.effortPairs).join('+'),
    input_tokens: s.tokens.input,
    cache_creation_tokens: s.tokens.cacheCreation5m + s.tokens.cacheCreation1h,
    cache_read_tokens: s.tokens.cacheRead,
    output_tokens: s.tokens.output,
    api_usd: s.apiUsd === null ? '' : s.apiUsd.toFixed(2),
    active_min: s.activeMin.toFixed(1),
    interventions: s.human.interventions,
    gates: s.human.gates,
    mcp_calls: mcpCalls,
    mcp_result_tokens_est: mcpTokens,
  };
  return CSV_COLUMNS.map(column => values[column] ?? '').join(',');
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const projectDir = opts.projectDir ?? defaultProjectDir();
  const prices = loadPrices(opts.prices);
  if (!prices) console.error('! metrics/prices.json not found: dollars are n/a');
  const results = resolveSessionFiles(opts, projectDir).map(file => analyzeSession(file, prices, { from: opts.from, until: opts.until }));
  if (opts.json) console.log(JSON.stringify(results, null, 2));
  else if (opts.csv) console.log(results.map(csvRow).join('\n'));
  else console.log(results.map(render).join('\n\n----------------------------------------\n\n'));
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
