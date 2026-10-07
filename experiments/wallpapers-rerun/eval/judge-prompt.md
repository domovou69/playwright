You are an independent senior QA engineer reviewing three Playwright test suites for the Wallpapers section of
https://www.zedge.net/wallpapers (guest, black box, production). Each suite was produced by an AI agent from the same task. They
are anonymous: the folders `X`, `Y` and `Z`, each holding that case's tests, page objects, fixtures, plan and ticket/bug files. Do not
try to guess which tool produced which. Judge only what is in the folders.

Rules for you: guest only, no login, no purchase, no load, no security probing, production site, headless browser only. You may use
the Playwright MCP to look at the site and to check claims. You do not run the suites (that is measured separately).

## Steps

1. **Inventory.** Explore the Wallpapers section yourself first (list, search, filters, sorting, categories, detail page, download,
   premium and purchase gate, anything else). Write `inventory` in your report: the features a thorough black-box suite should
   cover, each with a short id (F1, F2, ...) and a priority (high, medium, low). Do this BEFORE reading the folders.
2. **Read** each case's plan, tickets, bug files, page objects and tests.
3. **Score** each case from 1 (poor) to 5 (excellent), with two or three evidence lines (file and line or quote) per criterion:
   1. `coverage`: share of the inventory the tests really exercise, breadth and depth; list the inventory ids covered and missed.
   2. `assertions`: invariants of live content vs brittle exact titles and counts; weak assertions that cannot fail.
   3. `locators`: roles, labels and test ids vs fragile class or position selectors.
   4. `page_objects`: split into components, duplication, size, reuse of shared parts, readability.
   5. `test_quality`: independence, no fixed sleeps, no conditionals in tests, tags, titles that say what is checked.
   6. `bug_reports`: correct, reproducible, useful steps and evidence, severity sense.
4. **Findings.** List concrete findings per case, each with a class: `oracle` (wrong or weak expected result), `locator`,
   `convention` (breaks a good practice), `missing` (an important scenario absent), `dup-pom` (duplicated page-object code),
   `flaky` (likely unstable), `other`.
5. **Bugs.** For every bug a case claims (in tickets, bug files or bug-asserting tests) decide: `known` (matches an entry of
   `known-bugs.md`), `new-confirmed` (you reproduced it yourself on the live site, say how), `duplicate` (same as another claim
   of that case), `not-reproduced`, or `false-positive` (expected behaviour or a test artefact). Also list which known bugs each case
   did not find.
6. **Would you merge it?** One sentence per case: merge as is, merge after small fixes, or rework, and why.

## Output

Write two files into the current directory:

- `judge-report.md`: the inventory, then per case the scores with evidence, findings, bug table, merge verdict, then a short
  neutral comparison of the three. Do not name tools or guess the process behind a case.
- `judge-scores.json`: `{ "inventory": [{"id","title","priority"}], "cases": { "X": { "scores": {"coverage":n,"assertions":n,"locators":n,"page_objects":n,"test_quality":n,"bug_reports":n}, "inventory_covered": ["F1"], "findings": [{"class","text"}], "bugs": [{"claim","verdict"}], "known_bugs_found": ["ZED-3"], "merge": "as-is|small-fixes|rework" }, "Y": {}, "Z": {} } }`.

Be strict and specific; a score of 5 means nothing to fix.
