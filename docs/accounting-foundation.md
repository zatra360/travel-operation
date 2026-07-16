# Accounting Foundation — Audit-First Phase 1 + 2 (Implemented)

Implements the Trust Foundation and operational GL integration from
`docs/prompts/audit-first-erp-prompt.md` inside the existing travel-operation monorepo
(NestJS + Prisma + PostgreSQL).

## What was built

### Database (migrations `20260716120000_accounting_foundation`, `..._fix_reversal_link`, `..._fix_reversal_ctx`)

**Tables** (Prisma models, PascalCase to match codebase convention):

| Table | Purpose |
|---|---|
| `FiscalYear`, `AccountingPeriod`, `PeriodCloseLog` | Fiscal calendar; period statuses OPEN / SOFT_CLOSED / CLOSED / LOCKED |
| `GLAccount` | Hierarchical chart of accounts; `controlAccountType` + `allowManualPosting` protect control accounts |
| `JournalEntry`, `JournalItem` | Double-entry ledger; DRAFT → PENDING_APPROVAL → APPROVED → POSTED → REVERSED |
| `JournalEntryLink` | Source-document ↔ journal linkage; unique `(tenant, sourceType, sourceId, purpose)` structurally prevents duplicate posting |
| `DocumentNumberCounter`, `DocumentNumberHistory` | Gapless transactional numbering + permanent number register |
| `IdempotencyRecord` | Duplicate-request control; unique `(tenant, endpoint, key)` + payload hash |
| `GLExchangeRate` | Snapshot exchange rates |
| `SystemAuditLog` | Append-only, per-tenant hash-chained audit ledger |

**Functions** (the only legal mutation paths for posted state):

| Function | Behavior |
|---|---|
| `fn_post_journal_entry(journalId, tenantId, posterId, allowSelfPost)` | Locks entry FOR UPDATE; validates status, SoD (manual journals need independent approval), open period resolved from entry date, ≥2 lines, pure-debit-XOR-credit lines, Σ functional debit = Σ credit > 0, tenant-owned active accounts, control-account manual-posting policy; claims the PRIMARY source link (duplicate posting → error); allocates gapless `JE-<FY>-000001` number; sets POSTED; appends audit event. All-or-nothing in caller's transaction. |
| `fn_reverse_journal_entry(journalId, tenantId, reverserId, reason, entryDate?)` | Requires reason; original must be POSTED and un-reversed (FOR UPDATE); creates mirrored entry (debits ↔ credits) posted through `fn_post_journal_entry`; links both directions; marks original REVERSED; audit event. Original values never mutate. |
| `fn_allocate_document_number(...)` | Counter row locked FOR UPDATE inside caller transaction — rollback releases the number (no gaps), commit makes it permanent; every issue recorded in `DocumentNumberHistory`. |
| `fn_append_audit_log(...)` | Per-tenant advisory lock → strict `eventSequence`; SHA-256 hash chain (`previousHash` + canonical payload → `recordHash`). |
| `fn_verify_audit_chain(tenantId)` | Recomputes the whole chain; reports gap / mismatch / tamper location. |

**Triggers (fail-closed guards, active regardless of connected role):**

- `SystemAuditLog`: INSERT only via `fn_append_audit_log` (GUC `app.audit_ctx`); UPDATE/DELETE always rejected.
- `JournalEntry`: cannot INSERT/UPDATE to POSTED outside `fn_post_journal_entry` (GUC `app.posting_ctx`); posted entries cannot be edited or deleted; only POSTED → REVERSED transition allowed, only inside the reversal function.
- `JournalItem`: INSERT/UPDATE/DELETE rejected once parent is POSTED/REVERSED; CHECK `chk_journal_item_amounts` enforces pure positive debit XOR credit per row.
- `DocumentNumberHistory`: DELETE never; UPDATE only ISSUED → VOIDED with mandatory reason.
- `AccountingPeriod`: DELETE never; LOCKED can never reopen.

### API (`apps/api/src/modules/accounting/`)

| Endpoint | Permission |
|---|---|
| `GET/POST /tenant/accounting/accounts`, `PUT /accounts/:id`, `POST /accounts/seed-defaults` | `GL_ACCOUNT_*` |
| `GET/POST /tenant/accounting/fiscal-years` | `ACCOUNTING_PERIOD_READ/CREATE` |
| `POST /tenant/accounting/periods/:id/close` (SOFT_CLOSE/CLOSE/LOCK), `/:id/reopen` (reason required) | `ACCOUNTING_PERIOD_MANAGE` |
| `GET/POST /tenant/accounting/journals`, `PUT /:id` (draft only), `POST /:id/approve` (approver ≠ creator), `POST /:id/post` (supports `Idempotency-Key` header), `POST /:id/reverse` | `JOURNAL_*` |
| `GET /tenant/accounting/reports/trial-balance` | `JOURNAL_READ` |
| `GET /tenant/accounting/audit-logs`, `GET /audit-logs/verify` | `AUDIT_LOG_READ` |

Services call the database functions via `$queryRaw`; DB error tokens (`JOURNAL_UNBALANCED`,
`PERIOD_CLOSED`, `SOD_VIOLATION`, `DUPLICATE_POSTING`, …) map to 400/404/409 responses.
`seed-defaults` creates a starter COA modeled on the Tripnow audit sample (cash/bank/AR/AP/
inventory/tax/payroll control accounts + revenue/COGS/expense heads).

New permission modules `JOURNAL`, `GL_ACCOUNT`, `ACCOUNTING_PERIOD` added to
`packages/permissions` and the seed (Finance Officer granted journal + COA rights).

### Tests (`apps/api/test/accounting-foundation.e2e-spec.ts` — 24 passing)

Balanced posting, unbalanced rejection, both-sides/zero-value line rejection, <2-line rejection,
posted-entry edit/delete blocks, posted-item mutation blocks, direct status-POSTED block,
duplicate source posting block, closed/missing period blocks, SoD self-post block + approved-post
allow, control-account manual-posting block, reversal (reason required, mirrored values, double-
reversal block), audit chain verification, forged/edited/deleted audit row blocks, number register
immutability + void-reason rule, idempotency uniqueness, LOCKED-period permanence.

Run: `pnpm --filter @travelo/api exec jest --config ./test/jest-e2e.json test/accounting-foundation.e2e-spec.ts`

## Phase 2 — Operational GL Integration (Implemented)

### GL Posting Bridge (`gl-posting.service.ts`)

Deterministic journal builders wired into the existing business flows, executed **inside the same
database transaction** as the business mutation (no posted document without its journal):

| Business event | Hook | Journal |
|---|---|---|
| Invoice DRAFT → SENT (or created as SENT) | `invoice.service.ts` create/update | Dr Accounts Receivable (total) / Cr Revenue (net) / Cr Tax Payable (tax) — `SALES` |
| Payment PENDING → RECEIVED | `payment.service.ts` update (existing receive transaction) | Dr Cash (CASH method) or Bank / Cr Accounts Receivable — `RECEIPT` |
| Expense → PAID | `expense.service.ts` update | Dr Expense (category name match → fallback) / Cr Cash — `EXPENSE` |
| Refund APPROVED → PROCESSED | `refund.service.ts` process (existing transaction) | Dr Revenue (contra) / Cr Bank — `REFUND` |

**Activation semantics (fail-closed once active):**
- Tenant has **no** `GLAccount` rows → GL not activated; posting silently skipped (legacy tenants unaffected).
- Tenant **has** accounts → missing control mapping (`ACCOUNT_MAPPING_MISSING`) or closed/missing
  period aborts the whole business transaction. Activate GL per tenant via
  `POST /tenant/accounting/accounts/seed-defaults` + `POST /tenant/accounting/fiscal-years`.

**Duplicate protection:** the bridge checks `JournalEntryLink` (PRIMARY per source) and returns the
existing journal; the DB unique constraint remains the structural backstop.

### Financial Reports (`financial-reports.service.ts`)

| Endpoint | Report |
|---|---|
| `GET /tenant/accounting/reports/trial-balance` | Trial balance (per-account debit/credit/balance + equality check) |
| `GET /tenant/accounting/reports/income-statement` | P&L in the audit-sample structure: Revenue → Cost of Services → Gross Profit → Expenses → Operating Profit → Other Income/Expense → Net Profit |
| `GET /tenant/accounting/reports/balance-sheet` | Assets / Liabilities / Equity + current-period earnings, with `isBalanced` proof |
| `GET /tenant/accounting/reports/general-ledger/:accountId` | Account ledger with opening balance, running balance, closing balance |

All reports derive exclusively from POSTED/REVERSED journals.

### Tests (`apps/api/test/gl-posting.e2e-spec.ts` — 11 passing)

Invoice/payment/expense/refund journal correctness, cash-vs-bank routing, category-matched expense
accounts with fallback, bridge idempotency, no-COA skip, fail-closed missing mapping, income
statement + balance sheet arithmetic (assets = liabilities + equity), general-ledger running balance.

Run: `pnpm --filter @travelo/api exec jest --config ./test/jest-e2e.json test/gl-posting.e2e-spec.ts`

## Deliberate adaptations vs. the prompt

| Prompt | Implementation | Why |
|---|---|---|
| UUID PKs, snake_case tables | `cuid()` TEXT PKs, PascalCase tables | Matches every existing model in this codebase; Prisma migrations stay drift-free |
| `legal_entity_id` on every table | Tenant is the books boundary (Phase 1) | App has no legal-entity concept yet; add `LegalEntity` when consolidation is needed |
| Separate DB roles (runtime cannot touch ledger tables) | GUC-guarded triggers enforce the same invariants under the single dev role | Dev database uses one user; production hardening should still split migration/runtime/read-only roles and REVOKE direct DML |
| TIMESTAMPTZ | `TIMESTAMP(3)` (Prisma default) | Consistency with all existing tables; app treats timestamps as UTC |

## What Phase 3+ should add

- Inventory sub-ledger + FIFO/weighted-average costing (Sections 19–21 of the prompt) — deferred:
  this travel business sells services; add when physical stock (e.g. merchandise) is introduced.
- Vendor bills / AP settlement flows posting Dr Expense / Cr AP then Dr AP / Cr Bank.
- AR/AP ↔ GL reconciliation reports (sub-ledger vs. control account) and bank reconciliation.
- Cash flow statement; period-close checklist (block close while unposted SENT invoices exist).
- Approval workflow tables (`approval_policies/steps/requests`) beyond the single approver field.
- Production role separation + RLS policies.
