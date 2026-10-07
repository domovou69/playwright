// Builds experiments/wallpapers-rerun/eval/blind/{X,Y,Z}/ from the three cases in a random order and seals the mapping in
// eval/sealed-mapping.json. Do not open the mapping before the judge has scored (that is the point of the blinding).
// Usage (repo root): node experiments/wallpapers-rerun/eval/blind-pack.mjs
import { execFileSync } from 'node:child_process';
import { randomInt } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, relative } from 'node:path';

const ROOT = process.cwd();
const EVAL = join(ROOT, 'experiments/wallpapers-rerun/eval');
const BASE = process.env.EXP_BASE ?? join(homedir(), 'projects/experiments');
const cases = { original: join(BASE, 'wp-original'), bare: join(BASE, 'wp-bare'), harness: join(BASE, 'wp-harness') };

const walk = (dir, out = []) => {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (['node_modules', '.git', 'test-results', 'playwright-report', '.eval-lint', '.playwright-mcp', 'downloads'].includes(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
};

// Files a case produced: for a run directory, everything changed since its baseline commit; for the original, wallpapers code and plan.
function producedFiles(name, dir) {
  if (name === 'original') {
    return walk(dir)
      .map(f => relative(dir, f))
      .filter(f => /^(tests|pages|fixtures)\//.test(f) || f === 'specs/wallpapers.plan.md');
  }
  const first = execFileSync('git', ['-C', dir, 'rev-list', '--max-parents=0', 'HEAD'], { encoding: 'utf8' }).trim();
  const changed = execFileSync('git', ['-C', dir, 'diff', '--name-only', '--diff-filter=AM', first, 'HEAD'], { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);
  return changed.filter(f => !/(^|\/)(package-lock\.json|node_modules)\b/.test(f) && !f.startsWith('.claude/') && !f.startsWith('test-results/'));
}

const letters = ['X', 'Y', 'Z'];
const names = Object.keys(cases);
for (let i = names.length - 1; i > 0; i--) {
  const j = randomInt(i + 1);
  [names[i], names[j]] = [names[j], names[i]];
}
const mapping = Object.fromEntries(names.map((n, i) => [letters[i], n]));

const out = join(EVAL, 'blind');
rmSync(out, { recursive: true, force: true });
for (const [letter, name] of Object.entries(mapping)) {
  const dir = cases[name];
  if (!existsSync(dir)) throw new Error(`missing ${dir}`);
  for (const f of producedFiles(name, dir)) {
    const target = join(out, letter, f);
    mkdirSync(dirname(target), { recursive: true });
    let text = readFileSync(join(dir, f), 'utf8');
    text = text.replaceAll('[agent - Claude]', '').replace(/\bWPR-(\d+)/g, 'TKT-$1');
    writeFileSync(target, text);
  }
}
writeFileSync(join(EVAL, 'sealed-mapping.json'), JSON.stringify({ sealedAt: new Date().toISOString(), mapping }, null, 2));
console.log(`blind folders: ${letters.map(l => `${l} (${walk(join(out, l)).length} files)`).join(', ')}; mapping sealed.`);
