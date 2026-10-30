# ReputAI - Phase II QA Progress Notes

**Contributor:** Celine Parmar
**Date:** October 29, 2026
**Branch:** `celine-qa-tests`
**Status:** Testing is in progress. CI has not been tested on GitHub yet.

## What changed

The stakeholder asked us to focus on testing first, especially the compliance rules. I added Vitest, coverage reporting, 29 unit tests and five integration tests.

The tests check unsafe health details, liability warnings, promises and topics the brand wants to avoid. They also check how the pipeline handles revisions and an AI error. The integration tests use fake AI responses while running the real pipeline and compliance rules.

During setup, I updated Node and fixed dependency issues so the tests could run.

## Bug found and fixed

The integration tests found a problem in `graph.ts`. The name `draft` was used for both a state field and a graph node, which stopped the pipeline from loading. I renamed the node to `generateDraft` and updated its connections. Both test files passed after this change.

Testing also showed that “Your root canal was our fault” did not trigger a liability warning. It still triggered the health BLOCK. This wording is recorded as a todo and still needs a fix.

## Test results

There are **34 passing tests and one todo** across two test files. The compliance file reached **100% measured coverage**, but this does not cover the whole application or every possible unsafe phrase.

The screenshots and test details are included in `TEST_PLAN.md`. npm also reported **nine dependency security alerts: eight high and one critical**, which still need review.

## GitHub Actions

I added a workflow in `.github/workflows/tests.yml` to install dependencies, run the tests and save the coverage report. It still needs its first successful run on GitHub.

## What is left

The remaining work includes checking CI, reviewing the security alerts, setting up staging with Lester and testing live Google sync. The full app also needs manual testing.

The team still needs to confirm the two new Phase II features, test them and finish the 30-review sample dataset. These notes cover the QA work completed so far.
