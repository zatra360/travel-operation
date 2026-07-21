# Workflow: Fix a Bug

A choreographed sequence for diagnosing and fixing a regression or
defect, including those surfaced by an audit.

## Chain

```text
QA reproduces
→ Relevant engineer diagnoses root cause
→ Code Writer implements focused fix
→ Code Reviewer reviews regression risk
→ QA retests
→ Release Verifier confirms
```

The "Relevant engineer" role depends on the bug:

- Backend bug → Software Architect + Backend Engineer (Code Writer)
- Frontend bug → UI/UX Reviewer + Frontend Engineer (Code Writer)
- Auth / tenancy bug → Security Reviewer + Code Writer
- Data integrity bug → Software Architect + Code Writer (with
  migration plan)

## Step 1 — Reproduce (QA Engineer)

The QA Engineer must capture:

- Exact reproduction steps.
- A minimal payload (URL, body, headers).
- The current response (status code, body shape, error message).
- The expected response.
- Environment (tenant, branch, role, viewport).

The bug is reproduced when these are recorded. If the bug is
intermittent, the QA Engineer captures the conditions under which
it occurs (timing, network state, role).

## Step 2 — Diagnose root cause

The diagnosing agent must answer:

- What is the proximate cause (the line that throws, the value
  that mismatches)?
- What is the root cause (why was the line written that way,
  what invariant did the original design assume)?
- What other paths share the same root cause?
- What is the smallest fix that addresses the root cause without
  scope creep?

The diagnosis is not a guess. It cites the file, the line, and
the design assumption.

## Step 3 — Implement focused fix (Code Writer)

The Code Writer applies the smallest fix that addresses the root
cause. They do not "improve" surrounding code in the same PR
unless the surrounding code shares the same root cause. They must:

- Add a regression test that fails without the fix and passes
  with it.
- Update the audit / activity log entry if the bug touched a
  state change.
- Update documentation if the public contract changed.

## Step 4 — Review regression risk (Code Reviewer)

The Code Reviewer confirms:

- The fix addresses the root cause, not just the symptom.
- No unrelated behaviour changes.
- Tests cover the regression.
- Audit / activity log entry is consistent with the fix.
- The PR description references the original bug report.

## Step 5 — Retest (QA Engineer)

The QA Engineer reruns the original reproduction and any other
paths sharing the same root cause. They record a green run with
the original payload plus a sample of the affected surface.

## Step 6 — Confirm (Release Verifier)

The Release Verifier gives a status for the fix specifically:

- `READY` — bug fixed, regression tested, audit consistent.
- `NOT READY` — Medium or High finding remains.
- `BLOCKED` — Blocker / Critical remains.

## Refuse

- Symptom-masking fixes that don't address root cause.
- "Drive-by" refactors in the same PR.
- Skip the regression test.
- Hand-wave "I'll test later". The QA Engineer must retest.
