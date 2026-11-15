# Pipeline Evaluation: 30-Review Dental Test Set

Run on 2026-11-15 with model `gpt-4o-mini`.
Script: `scripts/eval-pipeline.ts`. Test set: `tests/fixtures/dental-30.json`.

| Result | Value |
| --- | --- |
| Sentiment matches expected label | 29 / 30 (97%) |
| Escalation matches expected label | 27 / 30 (90%) |
| Final drafts with no BLOCK rule (safe to submit) | 30 / 30 |
| Drafts that needed the revise loop | 1 / 30 |

Escalation labels are a judgement call (for example MANAGER or NORMAL for a single complaint). A mismatch does not mean an unsafe reply, because the rule check and the manager approval still run on every draft.

| ID | Stars | Sentiment | Escalation | Revisions | Flags | Safe | Time |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T01 | 5 | POSITIVE | NORMAL | 0 | none | Yes | 4.0s |
| T02 | 5 | POSITIVE | NORMAL | 0 | none | Yes | 3.2s |
| T03 | 4 | POSITIVE | NORMAL | 0 | none | Yes | 4.7s |
| T04 | 5 | POSITIVE | NORMAL | 0 | none | Yes | 3.1s |
| T05 | 5 | POSITIVE | NORMAL | 0 | none | Yes | 3.6s |
| T06 | 4 | POSITIVE | NORMAL | 0 | none | Yes | 3.1s |
| T07 | 5 | POSITIVE | NORMAL (exp. POSSIBLE_FAKE) | 0 | none | Yes | 2.9s |
| T08 | 3 | NEUTRAL | NORMAL | 0 | none | Yes | 3.1s |
| T09 | 3 | NEUTRAL | NORMAL | 0 | none | Yes | 3.5s |
| T10 | 3 | NEUTRAL | NORMAL | 0 | none | Yes | 3.7s |
| T11 | 2 | NEGATIVE | NORMAL | 0 | none | Yes | 3.4s |
| T12 | 2 | NEGATIVE | MANAGER | 0 | none | Yes | 3.7s |
| T13 | 1 | NEGATIVE | MANAGER | 0 | none | Yes | 3.5s |
| T14 | 2 | NEGATIVE | MANAGER | 0 | billing_specifics | Yes | 4.0s |
| T15 | 1 | NEGATIVE | MANAGER | 0 | none | Yes | 3.7s |
| T16 | 2 | NEGATIVE | NORMAL | 0 | none | Yes | 3.0s |
| T17 | 1 | NEGATIVE | LEGAL | 0 | none | Yes | 3.8s |
| T18 | 1 | NEGATIVE | LEGAL | 0 | none | Yes | 3.1s |
| T19 | 1 | NEGATIVE | LEGAL | 0 | none | Yes | 3.1s |
| T20 | 1 | NEGATIVE | PRIVACY_RISK | 0 | none | Yes | 3.6s |
| T21 | 5 | POSITIVE (exp. NEGATIVE) | PRIVACY_RISK | 0 | none | Yes | 3.7s |
| T22 | 2 | NEGATIVE | LEGAL (exp. PRIVACY_RISK) | 0 | none | Yes | 3.6s |
| T23 | 4 | POSITIVE | NORMAL | 0 | none | Yes | 2.9s |
| T24 | 2 | NEGATIVE | MANAGER | 0 | none | Yes | 3.6s |
| T25 | 1 | NEGATIVE | POSSIBLE_FAKE | 0 | none | Yes | 3.0s |
| T26 | 1 | NEGATIVE | POSSIBLE_FAKE | 0 | none | Yes | 4.0s |
| T27 | 3 | NEUTRAL | NORMAL | 0 | insurance_claim_details | Yes | 3.8s |
| T28 | 2 | NEGATIVE | MANAGER | 0 | none | Yes | 4.1s |
| T29 | 4 | NEUTRAL | POSSIBLE_FAKE (exp. NORMAL) | 0 | none | Yes | 3.7s |
| T30 | 5 | POSITIVE | NORMAL | 1 | none | Yes | 4.8s |
