# Vendored Skills

Skills copied into this repo as plain files (not symlinked), so future updates show up in diffs.

## playwright-best-practices

- Source: https://github.com/currents-dev/playwright-best-practices-skill
- Commit SHA: 283d5cbc5d11aac1abda058b16ad22c317d54dc0
- Vendored: 2026-09-26
- Path: `.claude/skills/playwright-best-practices/`
- Trimmed: 2026-09-29. 19 of 59 reference files removed - only what this project will not plausibly use (React/Angular/Vue/Next.js,
  Electron, browser extensions, GraphQL, canvas, component tests, i18n, service workers, websockets, multi-user, GitLab and other CI,
  coverage, performance budgets, security, file-operations). 40 kept. `SKILL.md` (the index loaded on every use) was rewritten:
  26 KB -> 8 KB, which is where the token saving comes from, not from deleting files (unread files cost nothing). Dead links
  into removed files were dropped from kept ones. To update from upstream, diff only the kept files.
- Use: named in `CLAUDE.md` for the main session, preloaded through `skills:` in the generator and healer agents.
