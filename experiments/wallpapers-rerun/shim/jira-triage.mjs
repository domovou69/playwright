// File-backed stand-in for scripts/jira-triage.mjs (wallpapers rerun): ISSUE_KEYS=<KEY,...>. Marks a Bug needs-repro and
// lists tickets whose summaries share words with it (keyword overlap only, the agent judges by meaning).
import { get, load, save, setStateLabel } from './jira-common.mjs';

const words = text => new Set(text.toLowerCase().match(/[a-z]{4,}/g) ?? []);

try {
  const keys = (process.env.ISSUE_KEYS ?? '')
    .split(',')
    .map(key => key.trim())
    .filter(Boolean);
  if (!keys.length) throw new Error('Set ISSUE_KEYS=<KEY[,KEY]>');
  const db = load();
  console.log(`Found ${keys.length} candidate ticket(s) to check.`);
  for (const key of keys) {
    const issue = get(db, key);
    const mine = words(`${issue.summary} ${issue.description}`);
    const related = Object.values(db.issues)
      .filter(other => other.key !== key && other.type === 'Bug')
      .map(other => ({ key: other.key, shared: [...words(`${other.summary} ${other.description}`)].filter(w => mine.has(w)).length }))
      .filter(other => other.shared >= 5)
      .sort((a, b) => b.shared - a.shared)
      .slice(0, 5)
      .map(other => other.key);
    setStateLabel(key, 'needs-repro');
    console.log(`${key}: needs-repro (possibly related: ${related.join(', ') || 'none'})`);
  }
  save(db);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
