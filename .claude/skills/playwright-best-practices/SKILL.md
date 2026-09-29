---
name: playwright-best-practices
description: Use when writing, changing, reviewing or debugging Playwright E2E tests - locators, assertions and waiting, Page Object Model, fixtures, tags and annotations, flaky tests, console errors, downloads, accessibility, mobile/narrow viewports, network routing and API tests, authentication, third-party services (ads, payments, iframes), visual checks, forms, drag and drop, config, CI (GitHub Actions, Docker, sharding, reporting). Trimmed copy of the currents.dev skill (see .claude/skills/VENDORED.md).
license: MIT
metadata:
  author: currents.dev
  version: '1.2-trimmed'
---

# Playwright Best Practices

Guidance for E2E test development. The project rules in the repository's `CLAUDE.md` take precedence over anything here.
Open only the files that match what you are doing.

## Everyday tasks

| Activity                                          | Reference Files                                                                                                                                                                      |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Writing an E2E test**                           | [test-suite-structure.md](core/test-suite-structure.md), [locators.md](core/locators.md), [assertions-waiting.md](core/assertions-waiting.md)                                        |
| **Page objects, or POM vs fixtures**              | [page-object-model.md](core/page-object-model.md), [pom-vs-fixtures.md](architecture/pom-vs-fixtures.md)                                                                             |
| **Fixtures, hooks, per-test state, test data**    | [fixtures-hooks.md](core/fixtures-hooks.md), [test-data.md](core/test-data.md)                                                                                                       |
| **Replacing brittle selectors**                   | [locators.md](core/locators.md)                                                                                                                                                      |
| **Removing explicit waits, timeouts**             | [assertions-waiting.md](core/assertions-waiting.md), [debugging.md](debugging/debugging.md)                                                                                          |
| **Tags, `--grep`, PR vs main runs**               | [test-tags.md](core/test-tags.md), [ci-cd.md](infrastructure-ci-cd/ci-cd.md)                                                                                                         |
| **Annotations (skip, fixme, slow), steps**        | [annotations.md](core/annotations.md)                                                                                                                                                |
| **Flaky tests, race conditions, isolation**       | [flaky-tests.md](debugging/flaky-tests.md), [debugging.md](debugging/debugging.md), [assertions-waiting.md](core/assertions-waiting.md), [fixtures-hooks.md](core/fixtures-hooks.md) |
| **Failing test, trace viewer, element not found** | [debugging.md](debugging/debugging.md), [locators.md](core/locators.md)                                                                                                              |
| **Console/JS errors and warnings**                | [console-errors.md](debugging/console-errors.md)                                                                                                                                     |
| **Downloads**                                     | [file-upload-download.md](testing-patterns/file-upload-download.md)                                                                                                                  |
| **Mobile, narrow viewport, responsive UI**        | [mobile-testing.md](advanced/mobile-testing.md), [locators.md](core/locators.md)                                                                                                     |
| **`playwright.config.ts` (timeouts, retries)**    | [configuration.md](core/configuration.md)                                                                                                                                            |
| **GitHub Actions**                                | [github-actions.md](infrastructure-ci-cd/github-actions.md), [ci-cd.md](infrastructure-ci-cd/ci-cd.md)                                                                               |

## Less common (read on demand)

| Topic                                        | Reference Files                                                                                                                                                                                                          |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Route blocking, mocking, waiting on requests | [network-advanced.md](advanced/network-advanced.md), [when-to-mock.md](architecture/when-to-mock.md)                                                                                                                     |
| API tests (REST, seeding data)               | [api-testing.md](testing-patterns/api-testing.md)                                                                                                                                                                        |
| Login, storage state, MFA and reset flows    | [authentication.md](advanced/authentication.md), [authentication-flows.md](advanced/authentication-flows.md)                                                                                                             |
| Ads, payments, email/SMS, OAuth, iframes     | [third-party.md](advanced/third-party.md), [iframes.md](browser-apis/iframes.md), [multi-context.md](advanced/multi-context.md)                                                                                          |
| Accessibility                                | [accessibility.md](testing-patterns/accessibility.md)                                                                                                                                                                    |
| Screenshots / visual regression              | [visual-regression.md](testing-patterns/visual-regression.md)                                                                                                                                                            |
| Forms and validation                         | [forms-validation.md](testing-patterns/forms-validation.md), [error-testing.md](debugging/error-testing.md)                                                                                                              |
| Drag and drop                                | [drag-drop.md](testing-patterns/drag-drop.md)                                                                                                                                                                            |
| Date/time, permissions, geolocation          | [clock-mocking.md](advanced/clock-mocking.md), [browser-apis.md](browser-apis/browser-apis.md)                                                                                                                           |
| Test type selection, suite architecture      | [test-architecture.md](architecture/test-architecture.md)                                                                                                                                                                |
| Global setup/teardown, project dependencies  | [global-setup.md](core/global-setup.md), [projects-dependencies.md](core/projects-dependencies.md)                                                                                                                       |
| Speed, workers, sharding, reporting, Docker  | [performance.md](infrastructure-ci-cd/performance.md), [parallel-sharding.md](infrastructure-ci-cd/parallel-sharding.md), [reporting.md](infrastructure-ci-cd/reporting.md), [docker.md](infrastructure-ci-cd/docker.md) |

## Test Validation Loop

After writing or modifying tests:

1. **Run tests**: `npx playwright test --reporter=list` (in this repo: headless only, see `CLAUDE.md`)
2. **If tests fail**:
   - Review error output and trace (`npx playwright show-trace`)
   - Fix locators, waits, or assertions
   - Re-run tests
3. **Only proceed when all tests pass**
4. **Run multiple times** for critical tests: `npm run verify`
