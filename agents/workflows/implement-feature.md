# Workflow: Implement a Feature

A choreographed sequence for adding a new user-facing capability.

## Chain

```text
Product Analyst
→ Software Architect
→ Code Writer
→ Code Reviewer
→ Security Reviewer
→ QA Engineer
→ UI/UX Reviewer
→ Release Verifier
```

If any agent returns `BLOCKED` or surfaces a Blocker / Critical, the
chain pauses and surfaces the issue to the operator.

## Step 1 — Product Analyst

Invoke `/agents product-analyst`.

Deliverables:

- User journeys (happy path + every alternative exit).
- Business rules and validations.
- Edge cases with stated behaviour.
- Acceptance criteria as individually testable bullets.
- "What happens when the optional module is disabled" answer.

The Analyst stops when every edge case has a stated behaviour and
the Architect can map the journeys onto modules.

## Step 2 — Software Architect

Invoke `/agents software-architect`.

Deliverables:

- Implementation plan (module boundary, data ownership, API
  contracts, state machine, RBAC, audit/activity, migration,
  testing strategy).
- Diagram or table of the proposed boundary.
- Mapping of `audit_logs` entries per state transition.
- RBAC matrix (role × permission × endpoint).
- Migration plan with rollback.

The Architect stops when a Code Writer could implement the plan
without further questions.

## Step 3 — Code Writer

Invoke `/agents code-writer`.

Execute the implementation order (inspect → reuse → write →
audit → test → verify). Implement across every affected layer in
one PR. The Writer never marks the task complete on "code compiles"
alone.

## Step 4 — Code Reviewer

Invoke `/agents code-reviewer`.

Apply the severity-ordered review checklist. Every finding has all
six fields (severity, file, code, impact, reproduction, fix). No
finding may skip a field. The Reviewer never edits code.

## Step 5 — Security Reviewer

Invoke `/agents security-reviewer`.

Cover the security checklist. Every non-negotiable check
(tenancy, RBAC, secrets, audit immutability, bulk auth) must be
explicitly verified. Produce a reproducible payload for each
finding.

## Step 6 — QA Engineer

Invoke `/agents qa-engineer`.

Exercise all roles, all edge cases, all isolation probes.
Generate fresh evidence: `pnpm test` output, screenshots,
response captures.

## Step 7 — UI/UX Reviewer

Invoke `/agents ui-ux-reviewer`.

Audit accessibility, mobile, keyboard, and visual rhythm across
the five required viewports. Confirm the long-tail states
(loading, empty, error, permission-denied, disabled-module).

## Step 8 — Release Verifier

Invoke `/agents release-verifier`.

Produce a single release status:
`READY` / `READY WITH KNOWN LOW-RISK ITEMS` / `NOT READY` /
`BLOCKED`.

Only `READY` or `READY WITH KNOWN LOW-RISK ITEMS` permits the
operator to merge and deploy.

## Anti-patterns to refuse

- Skip-the-Architect "small fix". Architectural invariants must
  be preserved by every change, even small ones — the Architect's
  review may be 5 minutes long.
- Skip-the-Security-Reviewer "no secrets involved". Authentication,
  authorization, tenancy — every change touches at least one.
- Bulk-merge "we'll test in prod". Never.
- Hand-wave "I'll fix it later". Tracked follow-up must include
  an owner, a date, and a verification step.
