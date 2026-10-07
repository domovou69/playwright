// File-backed stand-in for scripts/jira-repro.mjs (wallpapers rerun): records a reproduction outcome as a comment and a label.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { get, load, parseArgs, postComment, setStateLabel } from './jira-common.mjs';

const OUTCOME_LABELS = {
  reproduced: 'repro-confirmed',
  'not-reproduced': 'needs-manual-repro',
  inconclusive: 'repro-inconclusive',
  'duplicate-suspected': 'duplicate-suspected',
};

try {
  const args = parseArgs(process.argv.slice(2));
  if (!args.issue) throw new Error('--issue=<KEY> is required');
  const label = OUTCOME_LABELS[args.outcome];
  if (!label) throw new Error(`--outcome must be one of: ${Object.keys(OUTCOME_LABELS).join(', ')}`);
  get(load(), args.issue);
  const evidence = [];
  for (const file of (args.evidence ?? '').split(',').filter(Boolean)) {
    if (!existsSync(file)) throw new Error(`Evidence file not found: ${file}`);
    const dir = path.join('tickets', 'evidence', args.issue);
    mkdirSync(dir, { recursive: true });
    copyFileSync(file, path.join(dir, path.basename(file)));
    evidence.push(path.join(dir, path.basename(file)));
  }
  const steps = (args.steps ?? '').replaceAll('\\n', '\n');
  const lines = [`Repro outcome: ${args.outcome}`, ...(steps ? ['', 'Steps:', steps] : []), ...(args.notes ? ['', args.notes] : [])];
  if (args.of) lines.push('', `Suspected duplicate of ${args.of}. Reason: ${args.reason ?? '(none given)'}`);
  if (evidence.length) lines.push('', `Evidence: ${evidence.join(', ')}`);
  postComment(args.issue, lines.join('\n'));
  setStateLabel(args.issue, label);
  console.log(`${args.issue}: labeled ${label}, comment posted.`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
