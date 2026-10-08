# Wallpapers rerun: final comparison

Three cases on the same site (production, guest), measured the same way. `original` is the wallpapers suite that existed before the
experiment (v1 process, Sonnet 5, built over weeks with human edits). `bare` is plain Claude with no harness. `harness` is the full
loop (commands, agents, skill, lint rules). Both new runs: Sonnet 5.5, same task text, same environment layer, no Jira, all gates
approved in advance. One run per arm: examples, not statistics. Judge: one blinded session (Opus); the mapping X = bare,
Y = harness, Z = original was sealed until after scoring.

## Result table

|                                                                                                      | original (v1)              | bare                            | harness                                                 |
| ---------------------------------------------------------------------------------------------------- | -------------------------- | ------------------------------- | ------------------------------------------------------- |
| **Cost (API-equivalent)**                                                                            | not comparable (v1 setup)  | $5.6                            | $9.4                                                    |
| **Active minutes**                                                                                   | not comparable             | 170                             | 117                                                     |
| **Sessions**                                                                                         | n/a                        | 2                               | 10                                                      |
| **Interventions**                                                                                    | n/a                        | 3 (my manual stop, 2 continues) | 1 continue (+ 1 restart caused by my driver, see below) |
| **Playwright MCP calls**                                                                             | n/a                        | 1                               | 60                                                      |
| **Tests**                                                                                            | 33                         | 68                              | 39                                                      |
| **Stable in 3 of 3 runs**                                                                            | 33                         | 63 (2 flaky, 3 failing)         | 39                                                      |
| **`tsc` errors**                                                                                     | 0                          | 0                               | 0                                                       |
| **Lint, universal rules**                                                                            | 1                          | 9                               | 0                                                       |
| **Lint, project rules (reference only)**                                                             | 24                         | 72                              | 0                                                       |
| **Page-object files / lines**                                                                        | 17 / 1351                  | 6 / 401                         | 15 / 941                                                |
| **Duplicated locator strings (extra uses)**                                                          | 23 (80)                    | 7 (27)                          | 8 (37)                                                  |
| **Judge: coverage of 21 site features**                                                              | 17                         | 19                              | 18                                                      |
| **Judge scores (1-5): coverage / assertions / locators / page objects / test quality / bug reports** | 3 / 2 / 2 / 2 / 2 / 3 = 14 | 4 / 4 / 4 / 3 / 3 / 4 = 22      | 4 / 4 / 3 / 4 / 4 / 2 = 21                              |
| **Judge verdict**                                                                                    | rework                     | merge after small fixes         | merge after small fixes                                 |
| **Known bugs found (ZED-3, ZED-4)**                                                                  | 2 of 2                     | 0 of 2                          | 0 of 2                                                  |
| **New bugs, confirmed live by the judge**                                                            | 0                          | 3                               | 1                                                       |
| **False positives**                                                                                  | 0                          | 0                               | 0                                                       |

## What it says

- **Quality of the two new runs is close.** The judge's sums are 22 and 21 of 30, both "merge after small fixes". With one run per
  arm that difference is noise.
- **Both are clearly above the original** (14, "rework"). That mixes the effect of the improved pipeline with a newer model and is
  not a measure of the harness alone.
- **The harness bought reliability and structure, not breadth.** All 39 harness tests were stable in three runs and it has no lint
  violations, with real components and tags. The plain run wrote 68 tests, covered a bit more of the site and found the most new
  bugs (3), but 5 of its 68 tests are unstable or failing, it has no tags, fixed sleeps and run-time skips, and one 211-line
  page object that holds feed, filters and sorting.
- **Cost.** Plain Claude was cheaper ($5.6 against $9.4) and did not need ten sessions; the harness used fewer active minutes (117
  against 170, partly because the plain run waited long on full-suite runs while the machine was loaded).
- **Neither new run found the two known bugs.** Both saw the price-10 symptom and worked around it (the harness excluded price 10
  from its purchase test; the plain run skipped such items). The original had them because they were filed earlier by hand.
- **Bug quality:** the plain run filed three well-written confirmed defects (HTTP 500 on an unknown `sort`, "Newest first" not in
  date order, `%` in search crashes the page script). The harness filed one (`maxPrice=NaN`) and left other observed issues as plan
  notes, with no regression test for it.

## Answer to the question

On this task the harness did not produce a dramatically better result by independent scoring (21 against 22). What it adds is
mechanical: stable tests, zero lint violations, components and tags, at about 1.7 times the cost. Plain Claude is cheaper and
broader and finds more bugs here, with less reliable and less maintainable code. The value of the harness is therefore in
long-term maintenance and consistency across areas (which this single run does not measure), not in a better first draft.

## Caveats

- One run per arm; one judge from the same model family as the generator. The objective numbers (stability, lint, tsc) are not
  affected by that.
- The harness was built on this very site, which favours it; the environment layer (cookie consent handler, ad blocking) was given
  to both arms.
- Interventions: the plain run was stopped by me by hand at about T+01:25 and resumed; one of its continue sessions ended with an
  empty result. The harness lost its first attempt (cost $9, 66 active minutes, kept in `logs/harness-attempt0/`) because I passed
  the whole task text to the scout, and its second attempt lost one group to a driver defect (a headless session that ended on a
  background test run), fixed in the driver. These are experiment-operator errors, not harness behaviour, but they cost time and one
  extra continue.
- The machine was loaded (load average above 22) while both runs worked at the same time, which stretched the plain run's waiting
  and may have caused spurious test failures during its work. The final stability numbers were measured on an idle machine.
- Playwright MCP use differs: the plain run explored with its own Playwright scripts through Bash (1 MCP call); the harness used the
  MCP through its commands and planner agent (60 calls).
- Not measured: human time spent building the harness, which is the real cost the 1.7 times factor does not include.
