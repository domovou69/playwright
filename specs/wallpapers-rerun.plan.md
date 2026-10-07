# Wallpapers rerun: is the harness needed?

Experiment plan. Same site, same section (wallpapers), same task text, two arms: plain Claude and Claude with the full harness
of this repo. Compared with each other and with the wallpapers suite that exists today. Precedent for a plan outside an area
plan: `specs/explorbot-experiment.plan.md`.

## Status

- [x] Plan agreed
- [x] Original frozen (local tag `wallpapers-original` at 75eaa57; push is optional)
- [x] Run directories built and isolation checked (canary: bare sees no skills, commands or CLAUDE.md; harness sees the project ones only)
- [x] Jira stand-in and driver scripts written
- [x] Evaluation scripts written (`experiments/wallpapers-rerun/eval.sh`: `eval/prepare-original.sh`, `metrics.mjs`, `blind-pack.mjs`, `run-judge.sh`)
- [ ] Run 1 (bare) done
- [ ] Run 2 (harness) done
- [ ] Objective metrics collected
- [ ] Blinded expert review done
- [ ] Results saved, report and `specs/summary.md` updated

## Question

Does the harness (`CLAUDE.md`, `.claude/` commands, agents and skills, ESLint rules, scripts) change the result enough to pay
for itself? Result means: cost and time, quality of what is produced (tests, page objects, plan), bugs found.

Why wallpapers: the most complex area (ads, premium gate, ad-unlock download, filters), the largest suite (34 tests), and it
has known bugs (ZED-3, ZED-4) that give a ground truth for bug recall. A small section (`/profiles`, one filter) would be
solved by both arms and show no difference.

## What the four runs would give (recommendation, 2026-10-07)

| What we get                                                                             | Value                                                          | Source                     |
| --------------------------------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------- |
| Effect of the harness on one site and one scope: cost, time, tokens                     | High, the main conclusion                                      | Two wallpapers runs        |
| Violations of the project rules by an objective check (project ESLint, `plan-coverage`) | High, needs no personal judgment                               | Same two runs              |
| Known bugs found (ZED-3, ZED-4) and false positives                                     | High, a ready ground truth                                     | Same two runs              |
| Page-object quality: size, duplicates, split into components                            | Medium                                                         | Only if the POM is rebuilt |
| Cost trend across areas (ringtones, notification sounds, wallpapers with harness)       | Medium: shows reuse, not harness                               | All four                   |
| Wallpapers with harness (run 2) vs the original wallpapers suite                        | Notable for the article: what the loop gained on the same site | Run 2 vs original          |

Caveats: one run per arm is an example, not statistics. Areas differ, so ringtones and notification sounds are a trend line,
not a control. The clean comparison is run 1 vs run 2 on the same scope.

## Decisions (owner, 2026-10-07)

1. **Scope is whatever the agent finds.** No slice: each run explores the section and decides what to test, then does the
   same job end to end: explore, Story, Subtasks, tests, page objects.
2. **The page objects are rebuilt from scratch** in both arms. Only the environment layer is kept (below).
3. **Two arms only**: plain Claude and full harness. No "skill only" arm.
4. **No Jira.** Story, Subtasks and Bugs are markdown files under `tickets/` inside the run directory. The harness arm gets a
   file-backed stand-in for the Jira scripts.
5. **Full auto-approval, no questions.** Every gate is granted in advance. The agent decides itself what is a bug and files it.
6. **The current wallpapers suite is kept for history** as the third case, so people can compare original, run 1 and run 2.
7. **Independent expert review of all three cases**, blinded, plus objective metrics. Added to tables, report and article.

## Defaults I chose (change before the runs if you disagree)

| Item                | Default                                                                                                                                                                                                                                                                                         |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Model, effort       | `claude-sonnet-5-5`, effort `medium` in both arms (the harness commands pin their own effort)                                                                                                                                                                                                   |
| Cost cap per arm    | `--max-budget-usd 60` per session and 5 active hours in total; a run that hits it is reported as unfinished                                                                                                                                                                                     |
| Parallel or serial  | Parallel in two terminals (separate directories and browsers; the site load is tiny)                                                                                                                                                                                                            |
| Permissions         | `--permission-mode acceptEdits` (file edits only inside the run directory) plus `--allowedTools "Bash,mcp__playwright-test"`: any shell command is allowed because a narrow list makes an unattended bare run fail on the first unlisted command. The directories have no remote and no secrets |
| Language of outputs | English (code, tickets, plan), as in the repo                                                                                                                                                                                                                                                   |

## Task text (identical for both arms)

Kept verbatim in `experiments/wallpapers-rerun/brief.md`:

> Build black-box end-to-end tests for the Wallpapers section of https://www.zedge.net/wallpapers as a guest. Explore the
> section yourself (list, search, filters, sorting, categories, detail page, download, premium and purchase gate, whatever
> else you find), decide what is worth testing and write a test plan. Split it into a Story with Subtasks (groups of
> scenarios), implement the tests with page objects in this Playwright project, run them headless until they are stable, and
> file every bug you find. Keep the Story, Subtasks and Bugs as markdown files in `tickets/`. Every step is approved in
> advance: do not ask questions and do not wait for approval; decide yourself whether something is a bug. Constraints: guest
> only, free content only, no login, no purchase, no load or security probing, production site, no destructive actions,
> headless browsers only. The content is live, so assert invariants, not exact titles or counts. Finish with
> `RUN-SUMMARY.md`: what is covered, what was skipped and why, bugs filed, how to run the tests.

The safety constraints are task safety, not harness: both arms get them.

## Freezing the original

- `git tag wallpapers-original <HEAD of main at the time>` and `git push origin wallpapers-original` (owner pushes).
- The original wallpapers suite is `tests/wallpapers/`, `pages/` (wallpapers part and shared components),
  `specs/wallpapers.plan.md`, the `@BUG` tickets ZED-3 and ZED-4. It stays on `main` as it is.

## Environment layer (kept in both arms)

It holds lessons that cost about 160 minutes in v1 and is not what the experiment measures. Both arms get exactly the same:

- `package.json`, `package-lock.json`, `tsconfig.json`;
- `playwright.config.ts` without the Currents reporter and its import, `src/config/timeouts.ts`;
- `fixtures/test.ts` reduced to the two automatic fixtures (cookie consent handler, ad-domain blocking), without the `app`
  fixture; `src/utils/helper.ts` with `dismissCookieBanner`;
- `.mcp.json` with the `playwright-test` server only (headless).

Said openly in the report: the environment layer is inherited knowledge for both arms.

## Run directories

Outside this repo, e.g. `~/projects/experiments/wp-bare` and `~/projects/experiments/wp-harness`. The main repo is never
touched, so nothing is deleted from it and nothing needs restoring.

Build (scripted in `experiments/wallpapers-rerun/setup.sh`): `git archive wallpapers-original` into each directory, delete
everything not listed, add the environment layer edits, `git init` with no remote, one baseline commit, `npm ci`.

| Path in the copy                                                                                                    | Bare arm           | Harness arm                                                       |
| ------------------------------------------------------------------------------------------------------------------- | ------------------ | ----------------------------------------------------------------- |
| `pages/`, `tests/` (all areas), `specs/`                                                                            | removed            | removed                                                           |
| `metrics/`, `explorbot-experiment/`, `.github/`, `.husky/`, `README.md`, `currents.config.ts`, `.env`, `downloads/` | removed            | removed                                                           |
| `CLAUDE.md`, `.claude/` (commands, agents, skills, loop rules)                                                      | removed            | kept; `CLAUDE.md` Areas table cut to wallpapers (one logged edit) |
| `eslint.config.js`, `scripts/`, `.prettierrc`, lint-staged config                                                   | removed            | kept; `scripts/jira-*.mjs` replaced by the file-backed stand-in   |
| `.git` history                                                                                                      | new, baseline only | new, baseline only                                                |

Ringtones and notification sounds code is also removed in both arms: otherwise the agent copies patterns from sibling areas.

## Isolation checklist

Project level (done by the build above): `CLAUDE.md`, `.claude/`, `specs/`, project ESLint rules, `scripts/`, history, README
(it describes the loop).

User level, which a copy of the project does not remove:

- global skills in `~/.claude/skills` (for example `systematic-debugging`): bare arm runs with `--disable-slash-commands`;
- user settings and enabled plugins: both arms run with `--setting-sources project,local`;
- auto-memory is keyed by the project path, so a new directory starts empty; `~/.claude/CLAUDE.md` does not exist;
- `--bare` is not used: it needs `ANTHROPIC_API_KEY` instead of the subscription login.

Canary before each run: a one-line question in the run directory ("which skills, commands and project instructions do you
see?"). Bare: none. Harness: the project ones only. The canary session is not counted.

## Arm 1: plain Claude

1. One headless session in `wp-bare` with the task text and the fixed flags below.
2. If the session ends before `RUN-SUMMARY.md` exists, continue with the fixed text "Continue until RUN-SUMMARY.md is
   complete." At most 3 continues; each counts as an intervention.
3. Playwright MCP stays on. No other tools are added.

## Arm 2: full harness

The file-backed stand-in (`experiments/wallpapers-rerun/shim/`) keeps the CLI of `jira-ticket.mjs`, `jira-create.mjs`,
`jira-triage.mjs`, `jira-repro.mjs`: it writes `tickets/<KEY>.md` and a state file. Its `gate` is always open and `transition`
allows everything, which is the advance approval. The commands stay unchanged.

Driver `run-harness.sh` runs each command in a fresh session, as the loop is designed:

1. `/scout-feature wallpapers` with the task text; `/create-story` from its plan.
2. `/implement-ticket <SUBTASK>` for each Subtask until none is left.
3. Deviations from the normal loop, all logged in the report:
   - There is no remote and no Jira, so `git push` and `gh pr create` are skipped; the work is committed on a local branch and
     the agent's own self-review runs on the local diff (`git diff main...HEAD`).
   - There is no human review, so `/address-review` is not run.
   - `/group-retro` is not run: it turns review findings into rules, which would change the harness during the experiment, and
     it is not the source of the token numbers (those come from `session-cost.mjs`, see below).
   - A `BUDGET STOP:` at 60 active minutes is answered with `gate: extend` and counted as an intervention.
   - The human steps with no PR are done by the driver and are not counted as interventions: commit the plan after the scout,
     squash-merge each finished group into `main` (so the next group builds on it, as after a merged PR).
   - `specs/wallpapers.plan.md` is the format reference named in `/scout-feature`, but it is the answer key and is absent. The
     run notes name `specs/notification-sounds.plan.md` as the format reference. It mentions a few wallpapers facts: a small,
     accepted leak, stated in the report.
   - `tickets/` is git-ignored during the run (the shim rewrites it all the time, which would make the working tree dirty) and
     force-added at the end.

## Sessions and windows

Nobody opens windows by hand.

| Part                | Sessions                                                                                                                  | Who starts it                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| Preparation         | This chat                                                                                                                 | Already running               |
| Run 1, plain Claude | One headless session (plus at most 3 "continue" sessions)                                                                 | `run-bare.sh`, one command    |
| Run 2, harness      | A fresh headless session per command: scout, story, then one per Subtask; each uses its own subagents (generator, healer) | `run-harness.sh`, one command |
| Evaluation          | Objective script, then one headless judge session (Opus)                                                                  | `eval.sh`, one command        |
| Final table         | This chat                                                                                                                 | Back in this chat             |

Cost is summed over every transcript in a run's project folder, subagents included, so the number of sessions does not matter.
The runs are separate directories with separate transcripts and browsers, so two parallel runs do not conflict with each other
or with this repo. What they share is the production site (a tiny load) and the subscription rate limit; if the limit is hit,
the stop is logged and the run resumed, or the second run waits and starts after the first.
The scripts can be started from this chat in the background; that is the plan unless the owner prefers to start them.

## What each run must leave

In the run directory, committed at the end (`git add -A && git commit -m "result"`):

- `tests/`, `pages/`, `fixtures/`: the suite; `plan` files wherever the agent put them; `tickets/`: Story, Subtasks, Bugs;
  `RUN-SUMMARY.md`.
- Outside the repo, collected by the owner: the transcripts (kept by Claude Code in `~/.claude/projects/<encoded dir>/`).

## Measuring cost

Per arm: `node scripts/session-cost.mjs --all --project-dir ~/.claude/projects/<encoded run dir> --json > experiments/wallpapers-rerun/logs/<arm>-sessions.json`
(run from the main repo; the script is not copied into the bare arm). Recorded: API-equivalent dollars, active minutes, token
classes, MCP calls per server, human messages (interventions), budget stops. The original suite's cost is the v1 figure with its
known distortion; it is shown separately and not used for a cost comparison.

## Where results are saved

| What                                           | Where                                                                                                                                                                                                                                                                                                                 |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Original suite                                 | tag `wallpapers-original` and `main`                                                                                                                                                                                                                                                                                  |
| Run 1 and run 2 code, tickets, summary         | snapshot folders `experiments/wallpapers-rerun/runs/bare/` and `runs/harness/` on `main`; the original is `runs/original/` (copied from the tag). The three sit side by side, excluded from ESLint, Prettier, `tsc` and `playwright test`. Orphan branches `experiment/wp-bare`, `experiment/wp-harness` are optional |
| Task text, setup and driver scripts, shim      | `experiments/wallpapers-rerun/` on `main`                                                                                                                                                                                                                                                                             |
| Cost and time per run                          | `experiments/wallpapers-rerun/runs.csv` and `logs/*.json`                                                                                                                                                                                                                                                             |
| Objective metrics, blinded review, final table | `experiments/wallpapers-rerun/eval/`                                                                                                                                                                                                                                                                                  |

## Comparison

### 1. Objective metrics (script, same for all three cases)

Each suite is copied into a clean checkout of the environment layer and checked with the project's own tools, so rule
violations are counted the same way for everyone:

- project ESLint on the code, grouped by rule; `tsc --noEmit`;
- `playwright test --repeat-each=3 --retries=0` on production: stable, flaky, failing per test;
- counts: tests, scenarios, page-object files and lines, the largest file, duplicated locator strings.

### 2. Blinded expert review

- A fresh session on a different, stronger model (`claude-opus-5-5`) so the judge is not the generator family.
- Input: only code, plan, bug files and `RUN-SUMMARY.md` of three anonymous cases (X, Y, Z); the mapping to the arms is
  sealed in a file opened after scoring. Harness traces (commit trailers, `tickets/` conventions) are stripped as far as
  possible; blinding is best effort and stated as such.
- The judge scores 1 to 5 with evidence per criterion and lists findings in the existing review classes (`oracle`, `locator`,
  `convention`, `missing`, `dup-pom`, `flaky`, `other`), so they join `metrics/groups.csv` terms:
  1. coverage breadth and depth against the judge's own feature inventory of the live site, made before it reads any case (the
     original plan is just the original case's plan, so coverage is not circular);
  2. assertions: invariants of live content vs brittle exact data;
  3. locators: roles and labels vs fragile class selectors;
  4. page objects: components, no duplicates, sensible size;
  5. test independence and readability;
  6. bug reports: correct, reproducible, useful steps.
- Bugs: each claimed bug is classified known (ZED-3, ZED-4), new and confirmed live (the judge checks it headlessly, no login
  or purchase), duplicate, or false positive.

### 3. Final table

One row per case in `eval/final.md`: cost, active minutes, interventions, tests, stable share, rule violations, coverage
score, known bugs found of 2, new confirmed bugs, false positives, review scores. Then the conclusion in the report.

## Risks and confounds

- One run per arm: an example, not statistics.
- The environment layer helps both arms; the repo conventions in `fixtures/` still give the bare arm a hint.
- The original suite was built over weeks with human edits; it is a reference, not a rival on equal terms.
- Rate limits may stop an arm; resume text and the stop are logged.
- Order of building is the same for both arms; the site content drifts a little between parallel runs, not between arms.

## Steps

- [ ] Owner: confirm the defaults above and the plan.
- [ ] Owner: tag and push `wallpapers-original`.
- [ ] Write `experiments/wallpapers-rerun/` : `brief.md`, `setup.sh`, shim, `run-bare.sh`, `run-harness.sh`, eval script, judge prompt.
- [ ] Build both directories; run the canary in each; fix leaks.
- [ ] Owner: start both runs (two terminals); log any intervention.
- [ ] Collect transcripts, run `session-cost`, fill `runs.csv`; copy each run's result into `runs/<arm>/`.
- [ ] Run objective metrics; run the blinded review; open the sealed mapping.
- [ ] Write `eval/final.md`; update the report and `specs/summary.md`; push the two branches.

## Progress log

- 2026-10-07: plan written from the agreed decisions; defaults proposed.
- 2026-10-07 22:53 (local): both runs started in the background from `run-bare.sh` and `run-harness.sh`. Start times are in `logs/<arm>/started.txt`; canary sessions before that are not counted (`session-cost --from`).
