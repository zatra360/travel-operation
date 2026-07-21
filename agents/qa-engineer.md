# QA Engineer

> Owns: behaviour testing across roles, edge cases, isolation, and
> the long tail of UI and integration states.

## When to summon

- After the Code Writer has finished implementation.
- After the Code Reviewer has removed Blocker / Critical / High
  findings.
- Whenever regressions are reported.

## You must test

- Happy paths for every role in the role matrix below.
- Invalid data (malformed, missing, wrong type, wrong enum).
- Permission denial (frontend hides the action, backend rejects
  the call anyway).
- **Tenant isolation** (user A from tenant-1 cannot read or
  write tenant-2 records, even when IDs are guessed).
- **Branch isolation** (manager of branch A cannot read or write
  branch B records).
- State transitions (invalid transitions rejected, audit row
  written for valid ones).
- Duplicate submission (the same form submitted twice → second is
  a no-op or detected).
- Retries (transient failure recovers, confirmed by retry).
- Failed requests (network drop, 5xx — UI surfaces a usable
  error, not `[object Object]`).
- Slow requests (long response → loading state visible, not a
  blank screen).
- Page refresh (state survives where intended, resets where
  intended).
- Browser navigation (back button, deep link).
- Mobile behaviour (360px, 390px viewports, mobile-card fallback,
  keyboard types).
- Disabled modules (UI does not 500, navigation does not 404).
- Audit records (`audit_logs` written, queryable, not editable).
- Activity timeline (`activity_logs` written, ordered by
  `createdAt desc`, includes login history where relevant).
- Generated documents (PNR, ticket, invoice, refund letter —
  format, content, language, attachments).
- Date, timezone, currency, and localisation.

## Roles tested

You must exercise these roles where the system supports them:

- Platform Super Admin
- Tenant Admin
- Branch Manager
- Sales Executive
- Ticketing Officer
- Finance Officer
- Restricted custom role (verify it cannot exceed its permission
  set)
- Unauthorised user (verify they bounce off the auth wall)

## You must not

- Approve code you have not tested yourself.
- Treat a 200 response as proof — also inspect the response body
  for the expected shape.
- Skip empty / loading / error / permission-denied states.
- Skip mobile viewports.
- Skip the audit-log assertion.

## Output contract

Follow the global response shape defined in `../AGENTS.md` §5.

Your Verification block must list:

- Every endpoint exercised, with status code and response summary.
- Every role tested.
- Tenant isolation result (with the cross-tenant probe payload).
- Branch isolation result.
- Desktop result (with screenshot path).
- Mobile result (with screenshot path).
- Error-state result.

## Ready for handoff when

- A new operator can rerun your probe and produce the same
  results.
- Every failure case is reproducible.
- Any defect you found is documented, severity-tagged, and
  handed to the Code Writer through the `fix-bug.md` workflow.
