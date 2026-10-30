# ReputAI - Phase II QA Test Plan

**Prepared by:** Celine Parmar
**Date:** October 29, 2026
**Branch:** `celine-qa-tests`
**Status:** Local automated tests passed. Full Phase II testing is still in progress.

## Purpose

This plan checks the compliance rules and the review reply pipeline. The stakeholder asked us to focus on testing first, so I started with unit tests and then added integration tests.

These tests cover the current compliance and pipeline code. The team still needs to confirm and test the two new Phase II features.

## Setup and commands

Testing was done on Windows using Node.js 22.23.4, npm 10.9.9 and Vitest 5.0.5.

Run these commands from the project folder:

```bash
npm ci
npm test
npm run test:coverage
```

The local installation worked using `npm install` after fixing the lock file. A clean installation with `npm ci` still needs to be checked through CI.

The integration tests use fake AI responses with the real pipeline and compliance rules. They do not need an API key or database. Live AI, Google sync, login and database changes need separate testing.

## Automated tests

| ID     | Test                                                   | Expected result                         | Cases | Result |
| ------ | ------------------------------------------------------ | --------------------------------------- | ----- | ------ |
| UT01   | Patient health details, including capital letters      | Returns a health BLOCK                  | 15    | Passed |
| UT02   | Supported phrases admitting fault                      | Returns a liability WARN                | 3     | Passed |
| UT03   | Guarantees and strong promises                         | Returns a promise WARN                  | 3     | Passed |
| UT04   | Normal reply, health-insurance wording and empty text  | Returns no rule findings                | 3     | Passed |
| UT05   | Avoided topic with different capitalization and spaces | Returns an off-brand WARN               | 1     | Passed |
| UT06   | Blank avoided-topic entries                            | Does not flag the normal reply          | 1     | Passed |
| UT07   | Missing brand profile                                  | Checks the reply without an error       | 1     | Passed |
| UT08   | Health details, fault and a guarantee together         | Keeps the BLOCK and both warnings       | 1     | Passed |
| UT09   | Checking the same text again                           | Returns the same findings               | 1     | Passed |
| IT01   | Safe draft through the pipeline                        | Finishes without revisions              | 1     | Passed |
| IT02   | Unsafe draft followed by a safe revision               | Passes after one revision               | 1     | Passed |
| IT03   | Draft stays unsafe after two revisions                 | Stops revising and returns BLOCK flags  | 1     | Passed |
| IT04   | AI compliance check fails                              | The rule-based health BLOCK still works | 1     | Passed |
| IT05   | AI returns only a tone warning                         | Keeps the warning for human review      | 1     | Passed |
| OPEN01 | “Your root canal was our fault”                        | Should also trigger a liability warning | 1     | Todo   |

**Latest result: 34 passed and one todo across two passing test files.** The todo has not been run as a test and still needs follow-up.

The compliance file reached **100% measured coverage** for statements, branches, functions and lines. This only covers `compliance.ts`, not the whole application or every possible unsafe phrase.

The empty-text test only checks the compliance function. It does not mean an empty reply should be allowed to post.

## Manual tests still needed

Use sample accounts and a separate test organization. All checks below are **not run yet**.

| Test                 | What to do                                                                           | Expected result                                                                 |
| -------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Login and logout     | Try correct and incorrect passwords, then log out                                    | Only valid users can access protected pages                                     |
| Team roles           | Try drafting, submitting and approving with both roles                               | Agents and managers can only use their allowed actions                          |
| Organization privacy | Try opening another test organization’s records                                      | Access is blocked                                                               |
| Review sync          | Sync the sample reviews twice                                                        | Reviews appear in the right locations without duplicates                        |
| Editing drafts       | Add unsafe text, then remove it                                                      | Compliance flags update after each edit                                         |
| BLOCK drafts         | Try submitting and approving a blocked reply through the interface and server action | The reply cannot be submitted, approved or posted                               |
| Approval and posting | Approve a safe reply, then test a posting failure separately                         | Successful posts update correctly; failed posts show an error and stay unposted |
| Reports and filters  | Compare displayed results with known sample records                                  | Counts and filters match the records                                            |
| Live Google sync     | Connect an authorized test profile on staging and sync                               | Reviews reach the linked location and tokens stay private                       |

## Phase II feature tests

The team needs to confirm which features are included in the submission and match them to the Revised Proposal. These checks are **still pending**.

| Feature                      | What needs checking                                                                                                                 |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Scheduled sync               | Runs every 15 minutes without creating duplicate reviews                                                                            |
| SLA reminders                | The hourly check sends one email and an in-app alert when a review becomes overdue; repeated checks do not send duplicate reminders |
| Complaint groups             | Uses clear names and keeps complaints separated by location                                                                         |
| WARN approval                | Requires a reason, allows an optional note and records the audit details; BLOCK replies stay blocked                                |
| Dashboard and overdue badges | Figures match the test records and update when reviews are handled                                                                  |

## Evidence and open issues

The evidence folder contains:

- `01-compliance-coverage.png`: unit-test results and compliance coverage.
- `02-pipeline-before-fix.png`: the graph naming error found during integration testing.
- `03-pipeline-after-fix.png`: both test files passing after the fix.

npm currently reports **nine dependency alerts: eight high and one critical**. These still need review, including the Next.js finding.

The GitHub Actions workflow is prepared but has not been verified on GitHub. Staging, live Google sync and the 30-review sample dataset also need checking. The sample dataset is separate from the automated test cases.

## Before submission

Record the tested commit and CI link, add the remaining results and screenshots, and document any open issues. Our team also needs evidence for the two new features, feedback fixes, progress notes and a demo video or live-demo note.
