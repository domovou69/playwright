# Claude + skills + Playwright MCP: an AI-assisted E2E suite with a QA loop

A short, reader-facing summary. Evidence and numbers: `specs/retrospective.md`.

## The idea

Try to generate a plan, page objects, tests and the harness around them autonomously, with Claude + skills + the Playwright
MCP as the main tool, and refine the rules and skills wherever the output fell short. The starting point was a small manual
suite (4 tests, written 1.5 years ago). It ended at 34 tests and a working harness. Generation runs locally, with a human as the
reviewer and final validator.

## What is in it

- **Tools.** Playwright with its planner / generator / healer agents. Playwright MCP to look at the live site and check
  facts. Currents.dev for run history and flaky tests (a reporter, a dashboard, and an MCP the AI can query; a paid product with a 14-day trial and no free plan). Jira REST and
  GitHub Actions for ticket intake.
- **Skills and rules.** A vendored Playwright best-practices skill, trimmed from 59 to 40 reference files and an index cut from
  26 KB to 8 KB. It is called explicitly in `CLAUDE.md` and preloaded in the generator and healer. One conventions file plus
  ESLint holds the rules. A global root-cause debugging skill is optional.
- **Plan.** The planner drafts scenarios; a human plus a live check cuts the list. The important ones (P1) become `@smoke`.
- **Bug tests.** A test asserts the current broken behavior, stays green, and carries `@BUG:<TICKET>`. When the site is
  fixed the test fails and comes to review.
- **Ticket loop.** A script triages new bugs (labels, keyword hints, no LLM). Claude reproduces the bug on production. A script
  posts the outcome with evidence and sets one state label. The human gets checked context, not a bare ticket. Automation
  never changes a ticket status.
- **Self-check.** Each new test runs several times and gets a stable / flaky / failing verdict before review.

## What was unnecessary

- A custom dashboard: Currents already covers runs and flaky history.
- A script that checked tag formatting: ESLint with a typed tag list is enough.
- Keyword-only duplicate detection as a decision: it only proposes candidates now.
- A cookie-consent bypass through the vendor API: it looked like a regression and was reverted.
- The Explorbot experiment: free tiers hit limits, one scenario cost 732K tokens, and the output has no page objects.

## Where time was lost

- **CI-only failures** from the cookie banner and ad interstitials: about 160 minutes over five iterations. Run the first tests
  in CI on day one and put consent handling and ad blocking in a fixture.
- **Rules written after the code**, so a separate cleanup pass followed (tags, page-object split, no `force`, no conditionals).
  Write the rules and lint checks first.
- **A test hang mistaken for a timeout problem.** Reading a list of cards one by one hung when the list re-rendered; one
  atomic read fixed it.

## Effort

Generation itself takes about 4-5 minutes per group of tests. Total time depends on how many new locators a batch needs:
a group that reuses existing page objects needs no extra pass, a new page adds a separate page-object pass and up to 55
minutes. The Claude token cost was not measured, which is the main gap.

## Recommendation

The system is interesting and can be used on real projects, but it needs tailoring to each project: its own rules, its own
ticket flow, its own environment fixes. Start with the foundation (lint, rules, CI on day one), keep the human as the
validator, measure cost from the first day, and schedule a review after each stage. It is a working prototype, not an
autonomous product.
