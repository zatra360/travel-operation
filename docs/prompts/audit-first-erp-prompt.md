# AUDIT-FIRST BUSINESS APPLICATION — PRINCIPAL ARCHITECT IMPLEMENTATION PROMPT

> Stored reference prompt. Reference audit sample: `C:\Dev\Projects\Travel Operation\Audit Sample` (see `docs/audit-sample-notes.md`).

Act as an expert **Principal Software Architect, PostgreSQL Database Engineer, Forensic Accountant, Internal Auditor, Compliance Engineer, Security Architect, and Backend Engineer**.

Design and implement a production-grade business management application covering:

1. **BUY** — Procurement, Purchase Orders, Goods Receipts, Vendor Bills, Payments, and Purchase Returns
2. **SELL** — Quotations, Sales Orders, Deliveries, Customer Invoices, Receipts, Credit Notes, and Sales Returns
3. **EXPENSE** — Operational Expenses, Petty Cash, Employee Reimbursements, Payroll, and Expense Payments
4. **INVENTORY** — Warehouses, Stock Movements, FIFO or Weighted Average Costing, Transfers, Adjustments, and Stock Valuation

Use an **Audit-First engineering philosophy**.

---

# 1. AUDIT-FIRST PRINCIPLE

The audit, accounting, compliance, security, and data-integrity layers must be designed and implemented **before** operational workflows.

The application must structurally refuse to process any financial or inventory transaction that cannot be:

* Authenticated
* Authorized
* Validated
* Balanced
* Sequenced
* Reconciled
* Traced to its source
* Reproduced
* Audited
* Proven immutable after posting

Operational convenience must never override financial integrity.

No posted financial transaction may be silently edited or deleted.

Corrections must happen through:

* Reversal entries
* Credit notes
* Debit notes
* Adjustment entries
* Return documents
* Controlled voiding workflows

Never correct posted financial information by overwriting its historical state.

---

# 2. REQUIRED TECHNOLOGY

Use:

* PostgreSQL as the primary database
* UUID primary keys for internal record identity
* Human-readable sequential numbers for posted business documents
* JSONB for audit snapshots and metadata
* NUMERIC types for monetary values
* TIMESTAMPTZ for timestamps
* Database transactions for all postings
* Database constraints and triggers for critical integrity rules
* Row-level security or equivalent tenant-isolation controls
* Application-level RBAC
* Idempotency keys for financial write operations

Backend transaction example may use either:

* Node.js with TypeScript, or
* Python with typed models

Prefer a modular monolith architecture initially, with domain boundaries that can later be extracted into services.

---

# 3. NON-NEGOTIABLE ACCOUNTING RULES

The following rules must be enforced structurally:

1. Every posted journal entry must balance.
2. Total debit must exactly equal total credit.
3. A journal item cannot contain both a debit and a credit.
4. A journal item must contain either a positive debit or a positive credit.
5. Posted journal entries cannot be updated or deleted.
6. Posted journal items cannot be updated or deleted.
7. A posted operational document must reference its accounting journal entry.
8. A journal entry created from a source document must reference that source document.
9. Duplicate posting of the same source document must be impossible.
10. Duplicate processing of the same external request must be prevented through idempotency.
11. Accounting periods may be closed and locked.
12. No posting may occur inside a closed accounting period.
13. Backdated entries must require explicit permission and justification.
14. Corrections must use reversal entries.
15. Financial amounts must never use floating-point data types.
16. All currency conversions must preserve the original amount, currency, rate, and functional-currency amount.
17. Posted inventory movements cannot be directly edited or deleted.
18. Negative stock behavior must be explicitly configurable and controlled.
19. Inventory valuation must reconcile with the inventory control account.
20. Every high-risk action must be recorded in the immutable audit ledger.

---

# 4. MULTI-TENANT AND ORGANIZATIONAL SCOPE

The architecture must support:

* Multiple tenants
* Multiple legal entities
* Multiple branches
* Multiple warehouses
* Multiple departments
* Multiple currencies
* Multiple fiscal years
* Multiple accounting periods
* Tenant-specific numbering
* Branch-specific permissions
* Legal-entity-specific books
* Consolidated reporting where authorized

Core financial and operational tables should include, where applicable:

```text
tenant_id
legal_entity_id
branch_id
department_id
created_by
created_at
updated_by
updated_at
```

Tenant data must never be accessible across tenant boundaries.

---

# PHASE 1 — TRUST, AUDIT, ACCOUNTING, AND COMPLIANCE FOUNDATION

Build Phase 1 completely before implementing operational modules.

---

# 5. IDENTITY, AUTHORIZATION, AND APPROVAL FOUNDATION

Design the following:

```text
users
roles
permissions
user_roles
role_permissions
branches
departments
approval_policies
approval_steps
approval_requests
approval_actions
delegated_authorities
```

Support permissions including:

```text
purchase_order.create
purchase_order.approve
vendor_bill.post
vendor_bill.reverse
payment.create
payment.approve
sales_order.create
invoice.post
invoice.reverse
receipt.post
expense.submit
expense.approve
expense.post
inventory.adjust
inventory.transfer
inventory.close_period
journal.create_manual
journal.approve
journal.post
journal.reverse
period.close
period.reopen
audit.view
audit.export
sequence.manage
ml.view_alerts
ml.review_alerts
```

Enforce segregation of duties.

Examples:

* The same user should not create, approve, and pay the same vendor bill unless an explicit exception policy permits it.
* A cashier should not approve their own petty-cash adjustment.
* A journal-entry creator should not approve a high-value manual journal entry.
* A payment creator should not be the final approver above a configurable threshold.

---

# 6. IMMUTABLE SYSTEM AUDIT LEDGER

Create a `system_audit_logs` table that behaves as a write-once ledger.

It must include:

```text
id
tenant_id
legal_entity_id
branch_id
event_sequence
user_id
impersonated_by_user_id
session_id
request_id
correlation_id
idempotency_key
ip_address
user_agent
device_id
action
action_category
table_schema
table_name
record_id
source_document_type
source_document_id
before_state JSONB
after_state JSONB
changed_fields JSONB
reason
approval_reference
created_at
previous_hash
record_hash
```

The audit ledger must:

* Reject UPDATE operations
* Reject DELETE operations
* Permit INSERT only through a controlled database function or trusted application role
* Record database and application-originated changes
* Preserve before-and-after state
* Store actor and request context
* Support correlation across a complete transaction
* Use hash chaining or equivalent tamper-evidence
* Detect missing, reordered, or altered audit events
* Be append-only

Do not allow application users to insert arbitrary audit records directly.

Create restricted database privileges so ordinary application roles cannot:

* Update audit logs
* Delete audit logs
* disable audit triggers
* bypass ledger controls
* change posted records directly

---

# 7. CHART OF ACCOUNTS

Create a hardened `chart_of_accounts` structure with:

```text
id
tenant_id
legal_entity_id
account_code
account_name
account_type
normal_balance
parent_account_id
control_account_type
currency_policy
allow_manual_posting
is_active
effective_from
effective_to
created_at
```

Supported account types should include:

* Asset
* Liability
* Equity
* Revenue
* Cost of Goods Sold
* Expense
* Other Income
* Other Expense

Support control-account classifications such as:

* Accounts Receivable
* Accounts Payable
* Inventory
* Cash
* Bank
* Tax Payable
* Tax Receivable
* Payroll Payable
* Petty Cash
* Retained Earnings

Prevent unauthorized manual postings to control accounts.

---

# 8. FISCAL YEARS AND ACCOUNTING PERIODS

Create:

```text
fiscal_years
accounting_periods
period_close_logs
period_reopen_requests
```

Accounting periods must support:

* Open
* Soft Closed
* Closed
* Permanently Locked

Posting into a closed period must be blocked by the database posting functions.

Reopening a period must require:

* Explicit permission
* Approval
* Reason
* Audit log
* Date and time
* Identity of requester and approver

---

# 9. HARDENED DOUBLE-ENTRY LEDGER

Create:

```text
journal_entries
journal_items
journal_entry_links
journal_reversals
```

## `journal_entries`

Include:

```text
id
tenant_id
legal_entity_id
branch_id
journal_number
journal_type
entry_date
accounting_period_id
currency_code
exchange_rate
functional_currency_code
source_type
source_id
source_number
description
status
reversal_of_journal_entry_id
reversed_by_journal_entry_id
posting_batch_id
idempotency_key
created_by
approved_by
posted_by
created_at
approved_at
posted_at
```

Statuses:

```text
DRAFT
PENDING_APPROVAL
APPROVED
POSTED
REVERSED
```

## `journal_items`

Include:

```text
id
journal_entry_id
line_number
account_id
customer_id
vendor_id
employee_id
item_id
warehouse_id
cost_center_id
project_id
description
debit
credit
transaction_currency
transaction_amount
exchange_rate
functional_debit
functional_credit
tax_code_id
created_at
```

Enforce:

```text
debit >= 0
credit >= 0
```

And:

```text
(debit > 0 AND credit = 0)
OR
(credit > 0 AND debit = 0)
```

Never use a simple row-level check constraint to claim that an entire journal entry balances.

Because debit-credit equality spans multiple rows, implement it through:

* A deferred PostgreSQL constraint trigger, or
* A controlled posting stored procedure that locks and validates the complete entry immediately before posting

At the end of the posting transaction:

```text
SUM(functional_debit) = SUM(functional_credit)
```

The journal must not be marked `POSTED` unless the equality is exact.

Draft entries may temporarily remain incomplete, but an incomplete entry must never be posted.

---

# 10. JOURNAL IMMUTABILITY

Implement explicit database triggers that block:

* DELETE on posted journal entries
* UPDATE of financial fields on posted journal entries
* DELETE on journal items belonging to posted entries
* UPDATE of journal items belonging to posted entries

Permit only narrowly controlled changes to non-financial metadata, if legally appropriate, such as:

* External archival reference
* Non-substantive internal note
* Attachment link

Even permitted metadata changes must be audited.

A posted journal entry correction must create a new reversing journal entry.

The reversal must:

* Reference the original entry
* Swap all debits and credits
* Preserve the original accounting date
* Record the reversal date
* Record the reason
* Record requester and approver
* Prevent multiple active reversals of the same entry
* Maintain bidirectional links between original and reversal

---

# 11. GAPLESS DOCUMENT NUMBERING

Do not use ordinary PostgreSQL sequences as proof of gapless document numbering because sequences may skip numbers after rollbacks, cache loss, or failed transactions.

Create a transactional numbering mechanism such as:

```text
document_number_counters
document_number_reservations
document_number_history
```

The number counter should be partitioned by:

```text
tenant_id
legal_entity_id
branch_id
document_type
fiscal_year
numbering_series
```

Use:

```sql
SELECT ... FOR UPDATE
```

to lock the counter row.

Assign a final document number only when the document is successfully posted, inside the same database transaction.

Requirements:

* No number is permanently consumed if the transaction rolls back.
* Numbers must not be reused after successful posting.
* Voided documents must remain in the register.
* A voided number must never disappear.
* Drafts should use UUIDs or temporary draft references instead of final statutory numbers.
* Final numbers must be allocated at posting, not draft creation.
* Manual editing of issued numbers must be impossible.
* Duplicate numbers must be prevented by unique constraints.
* Number allocation must remain safe under concurrency.

Use a pattern such as:

```text
INV-DHK-2026-000001
BILL-DHK-2026-000001
JE-DHK-2026-000001
PAY-DHK-2026-000001
RCPT-DHK-2026-000001
```

Document the performance implications of strict gapless numbering and use separate counters where legally and operationally appropriate.

---

# 12. IDEMPOTENCY AND DUPLICATE-PROCESSING CONTROL

Create:

```text
idempotency_records
posting_batches
external_reference_registry
```

Each financial write request must accept an `idempotency_key`.

The system must:

* Return the existing result when the same completed request is submitted again
* Reject reuse of the same key with a different payload
* Lock concurrent duplicate requests
* Store a request payload hash
* Store processing status
* Store the final response or record reference
* Prevent duplicate journal entries
* Prevent duplicate payments
* Prevent duplicate inventory movements
* Prevent duplicate webhook processing

---

# 13. CURRENCY AND EXCHANGE-RATE CONTROLS

Create:

```text
currencies
exchange_rates
exchange_rate_sources
```

Every multi-currency transaction must retain:

* Transaction currency
* Transaction amount
* Functional currency
* Exchange rate
* Rate source
* Rate date
* Functional-currency amount
* Any realized or unrealized exchange difference

Exchange rates used in posted transactions must not be retroactively overwritten.

---

# PHASE 2 — MASTER AND OPERATIONAL DATA

Build operational modules only on top of the completed Phase 1 foundation.

---

# 14. MASTER DATA

Create:

```text
customers
vendors
employees
items
item_categories
units_of_measure
warehouses
warehouse_locations
payment_terms
tax_codes
bank_accounts
cash_accounts
cost_centers
projects
```

Master-data changes must be audited.

Sensitive master-data fields should support approval workflows where appropriate, especially:

* Vendor bank account changes
* Customer credit limits
* Item costing configurations
* Tax registration information
* Employee payroll account information
* Default ledger-account mappings

Vendor bank-account changes should trigger a high-risk compliance alert.

---

# 15. DOCUMENT LIFECYCLE

Use explicit document statuses:

```text
DRAFT
SUBMITTED
PENDING_APPROVAL
APPROVED
POSTING
POSTED
PARTIALLY_SETTLED
SETTLED
CANCELLED
REVERSED
VOIDED
```

Rules:

* Drafts may be edited according to RBAC.
* Submitted documents should have restricted editing.
* Approved documents may be posted.
* Posted documents become immutable.
* Cancellation before posting must be audited.
* Posted documents cannot be cancelled through direct status editing.
* Posted corrections require reversal or adjustment documents.
* Every status transition must be validated and logged.

Create a reusable document-state-transition engine rather than allowing arbitrary status updates.

---

# 16. BUY MODULE

Create:

```text
purchase_requisitions
purchase_requisition_items
purchase_orders
purchase_order_items
goods_receipts
goods_receipt_items
vendor_bills
vendor_bill_items
vendor_payments
vendor_payment_allocations
purchase_returns
purchase_return_items
vendor_debit_notes
```

Typical accounting entries:

## Vendor Bill for Inventory

```text
Dr Inventory
Dr Recoverable Tax
Cr Accounts Payable
```

## Vendor Bill for Expense

```text
Dr Expense
Dr Recoverable Tax
Cr Accounts Payable
```

## Vendor Payment

```text
Dr Accounts Payable
Cr Bank or Cash
```

## Purchase Return

```text
Dr Accounts Payable or Vendor Receivable
Cr Inventory
Cr Recoverable Tax Adjustment
```

Validate:

* Vendor status
* Purchase order approval
* Goods received
* Quantity billed
* Price variance
* Duplicate vendor invoice number
* Tax
* Currency
* Payment terms
* Three-way matching
* Approval threshold
* Vendor bank-account verification
* Accounting period
* Ledger mapping

A vendor bill should not be posted if required accounting mappings are missing.

---

# 17. SELL MODULE

Create:

```text
sales_quotations
sales_quotation_items
sales_orders
sales_order_items
deliveries
delivery_items
customer_invoices
customer_invoice_items
customer_receipts
customer_receipt_allocations
sales_returns
sales_return_items
customer_credit_notes
```

Typical accounting entries:

## Customer Invoice

```text
Dr Accounts Receivable
Cr Revenue
Cr Tax Payable
```

## Cost of Goods Sold

```text
Dr Cost of Goods Sold
Cr Inventory
```

## Customer Receipt

```text
Dr Bank or Cash
Cr Accounts Receivable
```

## Customer Credit Note

```text
Dr Sales Returns or Revenue Adjustment
Dr Tax Payable Adjustment
Cr Accounts Receivable
```

Validate:

* Customer status
* Customer credit limit
* Sales-order approval
* Delivery quantity
* Invoice quantity
* Pricing authorization
* Tax
* Currency
* Duplicate external reference
* Inventory availability
* Accounting period
* Revenue-account mapping
* Inventory-account mapping
* Cost-of-goods-sold mapping

Where delivery and invoicing occur at different times, clearly define when ownership, revenue, inventory relief, and cost of goods sold are recognized.

---

# 18. EXPENSE MODULE

Create:

```text
expense_claims
expense_claim_items
expense_approvals
expense_reports
petty_cash_funds
petty_cash_transactions
petty_cash_reconciliations
payroll_runs
payroll_items
payroll_liabilities
expense_payments
employee_reimbursements
```

Typical entries:

## Cash Expense

```text
Dr Expense
Dr Recoverable Tax
Cr Cash or Bank
```

## Employee Reimbursement

```text
Dr Expense
Cr Employee Payable
```

Then:

```text
Dr Employee Payable
Cr Bank
```

## Payroll

```text
Dr Salary Expense
Dr Employer Contribution Expense
Cr Payroll Payable
Cr Tax Payable
Cr Other Payroll Liabilities
```

Then payment:

```text
Dr Payroll Payable
Cr Bank
```

Support:

* Approval thresholds
* Receipt attachment requirements
* Duplicate receipt detection
* Expense-category restrictions
* Budget validation
* Petty-cash limits
* Advance settlement
* Payroll approval
* Confidential payroll permissions
* Controlled salary revisions
* Reconciliation workflows

---

# 19. INVENTORY SUB-LEDGER

Create:

```text
inventory_movements
inventory_movement_lines
inventory_cost_layers
inventory_cost_allocations
inventory_balances
inventory_reservations
inventory_transfers
inventory_adjustments
inventory_counts
inventory_count_lines
inventory_revaluations
inventory_period_closures
```

Every stock movement must include:

```text
tenant_id
legal_entity_id
branch_id
warehouse_id
location_id
item_id
movement_type
quantity
unit_cost
total_cost
source_document_type
source_document_id
source_document_line_id
journal_entry_id
movement_date
posted_at
created_by
```

Movement types should include:

```text
PURCHASE_RECEIPT
PURCHASE_RETURN
SALE_DELIVERY
SALE_RETURN
WAREHOUSE_TRANSFER_OUT
WAREHOUSE_TRANSFER_IN
POSITIVE_ADJUSTMENT
NEGATIVE_ADJUSTMENT
OPENING_BALANCE
ASSEMBLY_CONSUMPTION
ASSEMBLY_PRODUCTION
DAMAGE
EXPIRY
COUNT_VARIANCE
```

Each posted inventory movement must be traceable to:

* Source document
* Source document line
* User
* Warehouse
* Item
* Costing calculation
* Journal entry
* Audit event

---

# 20. INVENTORY COSTING

Support a tenant-level or item-category-level costing method:

```text
FIFO
WEIGHTED_AVERAGE
```

Do not allow costing-method changes after inventory activity without a formal migration and revaluation process.

## FIFO

Create immutable cost layers for incoming stock.

Outgoing movements must consume available layers in chronological order.

Store:

* Original layer quantity
* Remaining quantity
* Unit cost
* Source receipt
* Consumption allocations

## Weighted Average

Recalculate average cost after valid inbound transactions:

```text
New Average Cost =
(Current Quantity × Current Average Cost + Incoming Quantity × Incoming Cost)
÷
(Current Quantity + Incoming Quantity)
```

Define explicit behavior for:

* Returns
* Negative stock
* Backdated transactions
* Cost corrections
* Landed costs
* Currency changes
* Revaluations
* Inventory transfers
* Warehouse-level versus company-level costing

Never silently recalculate historical posted costs without an audited revaluation procedure.

---

# 21. INVENTORY AND GENERAL LEDGER RECONCILIATION

Create a reconciliation engine comparing:

```text
Inventory Sub-Ledger Value
versus
Inventory General Ledger Control Account
```

The system should identify:

* Unposted movements
* Journal entries without movements
* Movements without journal entries
* Cost mismatches
* Backdated-cost changes
* Negative-stock anomalies
* Duplicate movements
* Missing source documents
* Warehouse imbalance

Do not permit an inventory period to close while unexplained differences remain above the configured threshold.

---

# 22. SOURCE DOCUMENT TO JOURNAL LINKAGE

Every **posted accounting-impacting source document** must map to a journal entry.

Do not force draft or non-accounting documents to create journal entries prematurely.

Examples:

* Draft purchase order: no journal entry
* Approved purchase order: normally no journal entry unless commitment accounting is enabled
* Posted vendor bill: journal entry required
* Posted customer invoice: journal entry required
* Posted receipt: journal entry required
* Posted vendor payment: journal entry required
* Posted inventory delivery: inventory and cost journal entry required
* Posted expense: journal entry required

Create a generic `journal_entry_links` table to support:

* One source document to one journal entry
* One source document to multiple accounting entries when necessary
* One compound posting batch with multiple related journals
* Reversal links
* Tax journals
* Inventory journals
* Currency revaluation journals

Enforce uniqueness rules based on document type and posting purpose.

---

# 23. TAX AND COMPLIANCE ENGINE

Create:

```text
tax_codes
tax_rates
tax_jurisdictions
tax_transactions
tax_return_periods
withholding_tax_rules
withholding_tax_transactions
```

Tax information used in a posted document must be snapshotted.

Future tax-rate changes must not alter historical posted transactions.

Validate:

* Tax registration
* Tax jurisdiction
* Tax effective dates
* Recoverable versus non-recoverable tax
* Tax-inclusive versus tax-exclusive pricing
* Withholding tax
* Exemption reason
* Tax rounding
* Tax control accounts

---

# 24. ATTACHMENTS AND DOCUMENT EVIDENCE

Create:

```text
document_attachments
document_evidence
attachment_hashes
```

Store:

* File reference
* Original filename
* MIME type
* File size
* Content hash
* Uploaded by
* Uploaded at
* Source document
* Evidence type
* Virus-scan status
* Retention category

Use cryptographic hashes so uploaded evidence can be verified against later modification.

Do not store raw files directly inside high-volume transactional tables.

---

# 25. DATA-DRIVEN OPERATIONAL TRACKING

Add a separate operational analytics layer that captures meaningful actions without weakening financial integrity.

Track:

* Document created
* Document submitted
* Document approved
* Document rejected
* Document posted
* Document reversed
* Payment allocated
* Inventory moved
* Reconciliation completed
* Approval waiting time
* Processing time
* Error frequency
* Rework
* Manual journal usage
* Override usage
* Period-close duration
* Unusual workflow behavior

Use event heartbeats or session aggregation rather than writing one database row every second.

Do not use click count alone as a productivity measure.

Operational analytics data must remain separate from:

* General ledger truth
* Statutory document registers
* Immutable audit records
* Inventory valuation truth

---

# 26. MACHINE LEARNING AND RESPONSIBLE AI POLICY

Machine learning may support:

* Duplicate invoice detection
* Duplicate expense detection
* Fraud-risk scoring
* Unusual journal-entry detection
* Suspicious vendor-bank changes
* Abnormal payment patterns
* Inventory shrinkage detection
* Stockout forecasting
* Demand forecasting
* Cash-flow forecasting
* Late-payment prediction
* Reconciliation anomaly detection
* Document classification
* Receipt extraction
* Suggested account coding
* Suggested tax coding
* Workflow bottleneck detection

Machine learning must not autonomously:

* Post financial entries
* Approve payments
* Delete or alter ledger records
* Change vendor bank accounts
* Close accounting periods
* Override segregation-of-duty controls
* Reject employees or vendors solely through an opaque score
* Apply disciplinary action
* Alter payroll without authorized human approval

AI recommendations must include:

```text
model_id
model_version
prediction
confidence
reason_codes
input_reference
generated_at
accepted_by
rejected_by
human_decision
decision_reason
```

Every accounting-impacting AI suggestion must require human review.

The deterministic accounting engine, not the ML model, must calculate journal entries.

---

# 27. FRAUD AND ANOMALY CONTROLS

Detect and alert on:

* Duplicate invoice numbers
* Similar invoice amounts
* Split purchases below approval limits
* Weekend or unusual-hour postings
* Rapid create-approve-pay patterns
* Self-approval
* Vendor bank changes followed by payment
* Excessive manual journals
* Round-number journal entries
* Backdated postings
* Payments without supporting documents
* Inventory adjustments without counts
* Repeated voids
* Missing document sequence numbers
* Journal reversals followed by altered reposting
* Reused attachments
* Duplicate receipt hashes
* Unusual petty-cash activity
* Payroll account changes
* Payments to inactive vendors

Alerts should not automatically imply guilt.

They should create an auditable review workflow.

---

# 28. DATABASE SECURITY

Implement:

* Least-privilege database roles
* Separate migration role
* Separate runtime role
* Separate read-only reporting role
* Restricted ledger-posting function
* Restricted audit-log insertion function
* Row-level tenant isolation
* Secure session context
* Statement timeouts
* Lock timeouts
* Encryption for highly sensitive fields
* Secret management outside the database
* Backup and restoration controls
* Point-in-time recovery
* Migration audit records

Application users must not have direct table-level rights to mutate posted ledger data.

Use controlled stored procedures or secured backend service functions for posting.

---

# 29. REQUIRED POSTGRESQL SCHEMA

Generate a production-ready PostgreSQL SQL script in this exact order:

## Section A — Extensions and Shared Types

* Required extensions
* ENUMs or lookup tables
* Shared utility functions
* Timestamp conventions
* Currency-domain definitions

## Section B — Tenant and Identity Foundation

* Tenants
* Legal entities
* Branches
* Users
* Roles
* Permissions
* RBAC mappings

## Section C — Audit and Compliance Foundation

* Immutable audit ledger
* Hash-chain functions
* Restricted insert function
* UPDATE/DELETE blocking triggers
* Access logging

## Section D — Accounting Foundation

* Fiscal years
* Accounting periods
* Chart of accounts
* Journal entries
* Journal items
* Deferred balance validation
* Posting function
* Reversal function
* Immutability triggers

## Section E — Numbering and Idempotency

* Document counters
* Gapless allocation function
* Idempotency records
* External reference uniqueness

## Section F — Master Data

* Customers
* Vendors
* Items
* Warehouses
* Taxes
* Currencies
* Payment methods
* Cost centers

## Section G — Buy

* Purchase documents
* Receipt documents
* Vendor bills
* Vendor payments
* Returns

## Section H — Sell

* Sales documents
* Deliveries
* Customer invoices
* Receipts
* Returns
* Credit notes

## Section I — Expenses and Payroll

* Expense claims
* Petty cash
* Reimbursements
* Payroll
* Payments

## Section J — Inventory

* Movements
* Cost layers
* Cost allocations
* Balances
* Transfers
* Counts
* Adjustments
* Revaluations

## Section K — Analytics and Machine Learning Governance

* Operational events
* Risk alerts
* ML models
* Predictions
* Human decisions
* Model monitoring

## Section L — Indexes and Security

* Foreign-key indexes
* Search indexes
* Partial indexes
* Unique constraints
* Row-level-security policies
* Database role grants and revocations

Ensure all foreign-key columns used frequently in joins are indexed.

---

# 30. TRANSACTION MANAGER

Provide clean, production-grade backend code for an ACID-compliant transaction manager.

Use either:

* TypeScript with Node.js and PostgreSQL, or
* Python with PostgreSQL

The transaction manager must:

1. Authenticate the actor.
2. Resolve tenant, legal entity, branch, and permissions.
3. Validate the idempotency key.
4. Lock the operational document.
5. Confirm the document is in an allowed state.
6. Validate source data.
7. Validate fiscal period.
8. Validate approval requirements.
9. Validate segregation of duties.
10. Validate customer, vendor, item, warehouse, and account mappings.
11. Calculate taxes.
12. Calculate inventory cost.
13. Generate deterministic journal lines.
14. Verify debit-credit equality in functional currency.
15. Allocate the final document number transactionally.
16. Write or update the operational document.
17. Create inventory movements where applicable.
18. Create inventory cost layers or allocations.
19. Create the journal entry and journal items.
20. Link source document, inventory movement, and journal entry.
21. Change the document status to `POSTED`.
22. Insert the JSONB audit record.
23. Store the idempotency result.
24. Commit all changes atomically.

If any step fails, roll back everything.

There must never be a condition where:

* The operational document is posted but the journal is missing
* The journal exists but inventory movement is missing
* Inventory movement exists but the source document is not posted
* A final document number is consumed by a rolled-back transaction
* An audit record describes a transaction that did not commit
* A transaction commits without its corresponding audit evidence

---

# 31. TRANSACTION ISOLATION AND CONCURRENCY

Use appropriate PostgreSQL locking and isolation.

Consider:

* `SERIALIZABLE` for highly sensitive posting workflows, or
* `READ COMMITTED` with explicit row locks and careful constraints

Use:

```sql
SELECT ... FOR UPDATE
```

for:

* Source documents
* Number counters
* Inventory balances
* FIFO cost layers
* Payment allocations
* Idempotency rows
* Period-close records

Handle:

* Serialization failures
* Deadlocks
* Lock timeouts
* Safe retries
* Concurrent invoice posting
* Concurrent inventory consumption
* Concurrent payment allocation

Retries must not create duplicate financial records.

---

# 32. REVERSAL TRANSACTION MANAGER

Provide a dedicated reversal workflow that:

1. Loads the original posted source document.
2. Confirms it has not already been fully reversed.
3. Validates reversal permission.
4. Requires a reason.
5. Verifies accounting period rules.
6. Creates a reversal source document where appropriate.
7. Reverses inventory movements where applicable.
8. Creates an opposite journal entry.
9. Links original and reversal records.
10. Updates settlement and allocation records safely.
11. Creates an immutable audit event.
12. Commits atomically.

Do not mutate the original posted values.

---

# 33. API REQUIREMENTS

Design APIs such as:

```text
POST /purchase-orders
POST /purchase-orders/{id}/submit
POST /purchase-orders/{id}/approve

POST /vendor-bills
POST /vendor-bills/{id}/post
POST /vendor-bills/{id}/reverse

POST /customer-invoices
POST /customer-invoices/{id}/post
POST /customer-invoices/{id}/reverse

POST /vendor-payments/{id}/post
POST /customer-receipts/{id}/post

POST /expenses/{id}/submit
POST /expenses/{id}/approve
POST /expenses/{id}/post

POST /inventory-transfers/{id}/post
POST /inventory-adjustments/{id}/post

POST /journal-entries/{id}/approve
POST /journal-entries/{id}/post
POST /journal-entries/{id}/reverse

POST /accounting-periods/{id}/close
POST /accounting-periods/{id}/request-reopen
```

Every financial command endpoint must support:

```text
Idempotency-Key
Correlation-ID
Request-ID
```

Do not expose a generic unrestricted endpoint that allows arbitrary mutation of journal tables.

---

# 34. REPORTING AND RECONCILIATION

Provide data structures and queries for:

* Trial Balance
* General Ledger
* Journal Register
* Balance Sheet
* Income Statement
* Cash Flow Statement
* Accounts Receivable Aging
* Accounts Payable Aging
* Customer Statement
* Vendor Statement
* Inventory Valuation
* Stock Movement Register
* Purchase Register
* Sales Register
* Expense Register
* Tax Register
* Payment Register
* Receipt Register
* Document Sequence Register
* Reversal Register
* User Activity Register
* Audit Log Register
* Period-Close Checklist
* Inventory-to-GL Reconciliation
* AR-to-GL Reconciliation
* AP-to-GL Reconciliation
* Bank Reconciliation
* Petty-Cash Reconciliation
* Payroll Reconciliation

Reports must derive from posted records only unless explicitly marked as draft or forecast reports.

---

# 35. TESTING REQUIREMENTS

Provide automated tests for:

## Ledger Integrity

* Balanced entry posts successfully
* Unbalanced entry is rejected
* Debit and credit on the same line are rejected
* Zero-value journal line is rejected
* Posted journal cannot be edited
* Posted journal cannot be deleted
* Reversal creates opposite entries

## Gapless Numbering

* Concurrent postings receive unique sequential numbers
* Failed transactions do not permanently consume numbers
* Voided numbers remain visible
* Numbers cannot be manually changed
* Duplicate numbers are rejected

## Idempotency

* Repeated identical request returns same result
* Reused key with different payload is rejected
* Concurrent duplicate requests create only one transaction

## Operational Posting

* Vendor bill posts correct journal
* Invoice posts revenue and receivable
* Delivery posts COGS and inventory relief
* Payment clears payable
* Receipt clears receivable
* Expense posts to correct account
* Inventory transfer preserves company-wide quantity and value
* Purchase return reverses appropriate cost

## Security

* Unauthorized user cannot post
* Cross-tenant access is blocked
* Self-approval is blocked where configured
* Closed-period posting is blocked
* Audit logs cannot be edited or deleted
* Runtime role cannot bypass posting functions

## Inventory

* FIFO consumes oldest available cost layer
* Weighted average recalculates correctly
* Concurrent stock consumption does not oversell
* Negative stock policy is enforced
* Inventory and ledger remain reconciled

## Audit Evidence

* Every committed posting has an audit event
* Rolled-back postings create no committed audit event
* Hash-chain validation detects tampering
* Before-and-after states are accurate
* Request and correlation references are preserved

---

# 36. REQUIRED OUTPUTS

Produce the work in the following order:

1. Architecture overview
2. Domain boundaries
3. Trust-boundary and threat analysis
4. Accounting assumptions
5. Entity-relationship design
6. Complete PostgreSQL schema
7. Constraints and indexes
8. Audit-log implementation
9. Hash-chain implementation
10. Gapless numbering implementation
11. Journal-balance validation implementation
12. Ledger immutability triggers
13. Source-document immutability triggers
14. Inventory-costing implementation
15. Posting stored procedures or service architecture
16. ACID transaction-manager backend code
17. Reversal transaction-manager code
18. RBAC and segregation-of-duties matrix
19. API specification
20. Responsible machine-learning policy
21. Fraud-control framework
22. Reconciliation framework
23. Automated test suite
24. Deployment and migration strategy
25. Backup and disaster-recovery strategy
26. Phased implementation roadmap

Do not provide only conceptual examples.

Generate executable, production-oriented SQL and backend code with:

* Error handling
* Transactions
* Concurrency control
* Type safety
* Security boundaries
* Clear comments
* Named constraints
* Reusable functions
* Migration-safe design

---

# 37. IMPLEMENTATION PHASES

## Phase 1 — Trust Foundation

Implement:

* Tenant isolation
* Identity
* RBAC
* Segregation of duties
* Immutable audit ledger
* Fiscal periods
* Chart of accounts
* Double-entry ledger
* Reversal system
* Gapless numbering
* Idempotency
* Currency controls

## Phase 2 — Core Operations

Implement:

* Master data
* Buy
* Sell
* Expense
* Inventory
* Tax
* Payments
* Receipts
* Attachments

## Phase 3 — Reconciliation and Reporting

Implement:

* Financial statements
* Sub-ledger reconciliation
* Bank reconciliation
* Inventory reconciliation
* Period close
* Audit registers
* Exception reporting

## Phase 4 — Intelligence

Implement:

* Fraud alerts
* Duplicate detection
* Forecasting
* Anomaly detection
* Workflow analytics
* Responsible AI governance
* Human review workflows

---

# 38. FINAL ACCEPTANCE CRITERIA

The application is acceptable only when:

* Every posted financial transaction is balanced.
* Every posted operational document is traceable to its accounting impact.
* Every inventory-value movement is traceable to a source and journal.
* Posted records cannot be directly deleted.
* Posted financial values cannot be directly edited.
* Corrections use controlled reversals.
* Document numbers are transactionally assigned and auditable.
* Duplicate posting is prevented.
* Closed periods are enforced.
* Tenant isolation is enforced.
* Segregation of duties is configurable.
* Every sensitive action is audited.
* Audit records are append-only and tamper-evident.
* Inventory costing is reproducible.
* Sub-ledgers reconcile with control accounts.
* Failed transactions leave no partial financial state.
* AI cannot independently create or approve accounting truth.
* Human decisions remain accountable and explainable.
* The complete financial history can be reproduced for an external auditor.

Build the application so that integrity is not dependent only on developers remembering business rules.

Critical controls must exist at the database, transaction, permission, and workflow levels.

The system must fail closed: when financial integrity cannot be proven, posting must be rejected.
