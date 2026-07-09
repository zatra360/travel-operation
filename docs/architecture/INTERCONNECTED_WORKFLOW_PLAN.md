# Interconnected Workflow Plan for Travel Operation

**Status:** Phase 1 Complete — Architecture Plan  
**Version:** 1.0.0  
**Created:** 2026-07-09

---

## 1. SAAS VS TENANT VS BRANCH

### Mental Model

```
Travel Operation SaaS Platform (the product itself)
│
├── Tenant / Company: ABC Travels
│   ├── Branch: Dhaka Office (physical location)
│   │   ├── Department: Sales
│   │   ├── Department: Ticketing
│   │   ├── Department: Visa
│   │   └── Department: Finance
│   │
│   ├── Branch: Chattogram Office (physical location)
│   │   ├── Department: Sales
│   │   └── Department: Ticketing
│   │
│   └── Branch: Sylhet Office (physical location)
│       ├── Department: Sales
│       └── Department: Visa
│
├── Tenant / Company: XYZ Visa Agency
│   └── Branch: Main Office
│       ├── Department: Visa Processing
│       ├── Department: Documentation
│       └── Department: Client Support
│
└── Tenant / Company: Tripnow Limited
    └── Branch: Head Office
        ├── Department: Sales
        ├── Department: Ticketing
        ├── Department: Visa
        ├── Department: Tour Packages
        ├── Department: Finance
        ├── Department: HR
        └── Department: Admin
```

### Hierarchy Rule

```
SaaS Platform
  → Tenant / Company
    → Branch (physical office/location)
      → Department (functional unit)
        → Team (smaller group, future)
          → Employee / User (staff member)
```

### Correct Terminology

| Database Field | Business Meaning | Used In |
|---|---|---|
| `tenantId` | Company using the software | All business tables |
| `branchId` | Physical office/location | Branch-aware records |
| `userId` | Staff member (login identity) | Assigned to, created by, actor |
| `clientId` | Customer/traveler/passenger | CRM, Operations, Finance |

### What is a Branch vs Department?

**Branch = Physical office location:**
- Head Office
- Dhaka Office
- Chattogram Office
- Sylhet Office
- Banani Branch
- Malé Office
- Dubai Office

**Department = Functional business unit:**
- Sales
- Ticketing
- Visa
- Hajj & Umrah
- Tour Packages
- Corporate Travel
- Finance
- HR
- Admin
- Customer Support
- Operations

**Rule:** Ticketing Team, Visa Team, Finance Team, Sales Team are NOT branches. They are departments or teams.

---

## 2. PLATFORM VS TENANT SEPARATION

### Platform Admin (SaaS Owner)
- Manages: tenants/companies, packages, subscriptions, platform users, platform permissions, global master data, SaaS-wide dashboard, system health, tenant activation/suspension, platform audit, billing/package control

### Tenant Admin (Company Owner)
- Manages: branches, staff/users, roles, leads, clients, quotations, bookings, tickets, invoices, payments, documents, HRM, tenant settings, tenant-level master data

### Route Rules

| Prefix | Scope | Auth |
|---|---|---|
| `/api/v1/public/*` | Public/unauthenticated | None |
| `/api/v1/platform/*` | Platform/SaaS owner only | Auth + platform permission |
| `/api/v1/tenant/*` | One company's business actions | Auth + tenant context + RBAC |

---

## 3. FULL ENTITY RELATIONSHIP MAP

### Core Flow

```
Lead
 ├── assignedTo → User/Employee
 ├── Branch
 ├── Client (after conversion)
 ├── FollowUps
 ├── Quotations
 └── → Activity Timeline / Audit Log

Client
 ├── Passports
 ├── Branch
 ├── Leads (source)
 ├── Quotations
 ├── Bookings
 ├── Invoices
 ├── Payments
 ├── Tickets
 ├── Refunds
 ├── Documents
 ├── Tasks
 └── → Activity Timeline / Audit Log

Quotation
 ├── Client
 ├── Lead (optional)
 ├── assignedTo → User
 ├── LineItems
 ├── Revisions
 ├── StatusLogs
 ├── → Booking (after acceptance)
 ├── → Invoice
 └── → Activity Timeline / Audit Log

Booking
 ├── Client
 ├── Lead (optional)
 ├── Quotation (optional)
 ├── assignedTo → User
 ├── Passengers
 ├── Segments
 ├── PNR / TTL
 ├── → Invoices
 ├── → Payments
 ├── → Tickets
 ├── → RefundRequest
 ├── → ReissueRequest
 ├── → CancellationRequest
 └── → Activity Timeline / Audit Log

Ticket
 ├── Booking
 ├── Passenger
 ├── Airline
 ├── → Invoice/Payment (optional)
 ├── → RefundRequest (optional)
 ├── → ReissueRequest (optional)
 ├── → StatusLogs
 └── → Activity Timeline / Audit Log

Invoice
 ├── Client
 ├── Booking (optional)
 ├── Quotation (optional)
 ├── InvoiceLines
 ├── → Payments
 ├── → Receipts
 ├── → LedgerEntries
 └── → Activity Timeline / Audit Log

Payment
 ├── Invoice
 ├── Booking (optional)
 ├── Client
 ├── receivedBy → User
 ├── → Receipt
 ├── → LedgerEntry
 └── → Activity Timeline / Audit Log

LedgerEntry
 ├── referenceType + referenceId (polymorphic)
 ├── direction (debit/credit)
 ├── → Source: Payment / Expense / Refund / Commission / Salary
 └── → Activity Timeline / Audit Log

Employee
 ├── User (optional link)
 ├── Department
 ├── Branch
 ├── Leaves
 ├── Attendance
 ├── PerformanceReviews
 ├── assigned Leads
 ├── handled Quotations
 ├── handled Bookings
 ├── issued Tickets
 ├── verified Payments
 ├── Commissions
 ├── Incentives
 ├── Salary → SalaryProfile → SalaryRun → SalarySlip
 └── → Activity Timeline / Audit Log
```

---

## 4. LEAD-TO-TICKET WORKFLOW

```
1. Create Lead (NEW)
2. Assign Lead to Employee
3. Schedule/Complete FollowUp
4. Lead → CONTACTED → QUALIFIED
5. Create Quotation from Lead (DRAFT)
6. Add Quotation LineItems
7. Quotation → SENT → VIEWED
8. Quotation → ACCEPTED
9. Lead → WON
10. Lead → Convert to Client
11. Quotation → Convert to Booking (BOOKING_CREATED)
12. Booking → HELD → CONFIRMED
13. Add Booking Passengers
14. Add Booking Segments
15. Create Invoice from Booking
16. Receive Payment
17. Create Receipt
18. Create LedgerEntry
19. Invoice → PAID
20. Issue Ticket (PENDING → ISSUED)
21. Booking → TICKETED
22. Notify Client
```

### After-Sales Sub-workflows

**Refund:**
```
RefundRequest → REQUESTED → UNDER_REVIEW → APPROVED → PROCESSED
→ Reversal LedgerEntry
→ Invoice updated
→ Ticket updated (REFUNDED)
```

**Reissue:**
```
ReissueRequest → REQUESTED → UNDER_REVIEW → APPROVED → PROCESSED
→ Old Ticket: REISSUED
→ New Ticket: ISSUED
→ Fare difference processed
```

**Cancellation:**
```
CancellationRequest → REQUESTED → UNDER_REVIEW → APPROVED → PROCESSED
→ Booking → CANCELLED
→ Tickets → VOIDED
→ Refund calculation
→ Reversal LedgerEntry
```

---

## 5. FINANCE WORKFLOW

```
Invoice
 ├── Created from Quotation or Booking
 ├── Contains InvoiceLines
 ├── Status: DRAFT → SENT → PARTIALLY_PAID → PAID
 ├── Tracks paidAmount, dueAmount
 └── Connects to Ledger

Payment
 ├── Linked to Invoice (primary) and optionally Booking
 ├── Status: PENDING → RECEIVED / FAILED
 ├── Creates Receipt on success
 ├── Creates LedgerEntry (debit: client, credit: company)
 └── Idempotency protected

Receipt
 ├── Generated from successful Payment
 ├── Links to Invoice
 └── auditLog on creation

Ledger
 ├── Append-only
 ├── Entry per: payment, expense, refund, commission, salary
 ├── referenceType + referenceId for source tracing
 └── Never modified after creation
```

---

## 6. HRM / SALARY / COMMISSION WORKFLOW

```
Employee
 ├── Belongs to Department (under Branch)
 ├── Links to User (for login)
 ├── Handles: Leads, Quotations, Bookings, Tickets, Payments
 │
 ├── Commission (from bookings/tickets/quotations)
 │   ├── Booking → Commission (to employee)
 │   ├── Ticket → Commission (to employee)
 │   └── Calculated per tenant rules
 │
 ├── Incentive (from achieving targets)
 │   └── Branch/Team/Employee targets
 │
 ├── Salary
 │   ├── SalaryProfile (base pay, allowances, deductions setup)
 │   ├── SalaryRun (monthly batch)
 │   └── SalarySlip (individual payslip)
 │       ├── Base salary
 │       ├── Commission earned
 │       ├── Incentives
 │       ├── Deductions
 │       └── Net pay
 │
 └── Performance (calculated from actual operations)
     ├── Leads converted
     ├── Quotations created/accepted
     ├── Bookings handled
     ├── Tickets issued
     ├── Payments verified
     └── Revenue generated
```

---

## 7. STATUS TRANSITION RULES

### Lead
```
NEW → CONTACTED → QUALIFIED → PROPOSAL → WON / LOST
LOST → NEW (re-open)
```

### Quotation
```
DRAFT → SENT → VIEWED → ACCEPTED / REJECTED / EXPIRED / CANCELLED
ACCEPTED → BOOKING_CREATED
REJECTED → DRAFT (re-open)
EXPIRED → DRAFT (re-open)
```

### Booking
```
HELD → CONFIRMED / CANCELLED
CONFIRMED → TICKETED / CANCELLED
TICKETED → CANCELLED / REFUNDED
CANCELLED → (terminal)
REFUNDED → (terminal)
VOIDED → (terminal)
```

### Invoice
```
DRAFT → SENT → PARTIALLY_PAID / PAID / OVERDUE / CANCELLED
PARTIALLY_PAID → PAID / CANCELLED / OVERDUE
OVERDUE → PAID / CANCELLED
PAID → (terminal)
CANCELLED → (terminal)
```

### Payment
```
PENDING → RECEIVED / FAILED
RECEIVED → PARTIALLY_REFUNDED / REFUNDED
FAILED → (terminal)
```

### Ticket
```
PENDING → ISSUED / VOIDED
ISSUED → VOIDED / REFUNDED / REISSUED
VOIDED → (terminal)
REFUNDED → (terminal)
REISSUED → (terminal)
```

### Expense
```
PENDING → APPROVED / REJECTED
APPROVED → PAID / REJECTED
REJECTED → PENDING (re-open)
PAID → (terminal)
```

### Refund
```
REQUESTED → UNDER_REVIEW → APPROVED / REJECTED → PROCESSED
REJECTED → REQUESTED (re-submit)
```

---

## 8. API ROUTE PLAN

### Connected Workflow Endpoints

| Endpoint | Module | Description |
|---|---|---|
| `POST /tenant/leads/:id/convert-to-client` | Lead | Convert lead → client |
| `POST /tenant/leads/:id/create-quotation` | Lead | Create quotation from lead |
| `GET /tenant/leads/:id/timeline` | Lead | Lead activity timeline |
| `GET /tenant/clients/:id/summary` | Client | Client overview with counts |
| `GET /tenant/clients/:id/bookings` | Client | Client bookings |
| `GET /tenant/clients/:id/invoices` | Client | Client invoices |
| `GET /tenant/clients/:id/payments` | Client | Client payments |
| `GET /tenant/clients/:id/timeline` | Client | Client activity timeline |
| `POST /tenant/quotations/:id/send` | Quotation | Mark as sent |
| `POST /tenant/quotations/:id/accept` | Quotation | Accept quotation |
| `POST /tenant/quotations/:id/reject` | Quotation | Reject quotation |
| `POST /tenant/quotations/:id/convert-to-booking` | Quotation | Create booking |
| `POST /tenant/quotations/:id/convert-to-invoice` | Quotation | Create invoice |
| `GET /tenant/quotations/:id/timeline` | Quotation | Quotation timeline |
| `POST /tenant/quotations/:id/line-items` | Quotation | Add line item |
| `POST /tenant/bookings/:id/create-invoice` | Booking | Create invoice |
| `POST /tenant/bookings/:id/add-payment` | Booking | Record payment |
| `POST /tenant/bookings/:id/issue-ticket` | Booking | Issue ticket |
| `POST /tenant/bookings/:id/add-passenger` | Booking | Add passenger |
| `POST /tenant/bookings/:id/add-segment` | Booking | Add segment |
| `POST /tenant/bookings/:id/request-refund` | Booking | Request refund |
| `POST /tenant/bookings/:id/request-reissue` | Booking | Request reissue |
| `POST /tenant/bookings/:id/request-cancellation` | Booking | Request cancellation |
| `GET /tenant/bookings/:id/timeline` | Booking | Booking timeline |
| `POST /tenant/tickets/:id/void` | Ticket | Void ticket |
| `POST /tenant/tickets/:id/refund` | Ticket | Refund ticket |
| `POST /tenant/tickets/:id/reissue` | Ticket | Reissue ticket |
| `GET /tenant/tickets/:id/timeline` | Ticket | Ticket timeline |
| `POST /tenant/invoices/:id/pay` | Invoice | Record payment |
| `POST /tenant/invoices/:id/void` | Invoice | Void invoice |
| `GET /tenant/invoices/:id/ledger` | Invoice | Ledger entries |
| `POST /tenant/invoices/:id/add-line` | Invoice | Add invoice line |
| `GET /tenant/employees/:id/performance-summary` | Employee | Performance |
| `GET /tenant/employees/:id/commission` | Employee | Commission history |
| `GET /tenant/employees/:id/salary` | Employee | Salary history |
| `GET /tenant/employees/:id/leads` | Employee | Assigned leads |
| `GET /tenant/employees/:id/quotations` | Employee | Quotations handled |
| `GET /tenant/employees/:id/bookings` | Employee | Bookings handled |
| `GET /tenant/refunds/:id/approve` | Refund | Approve refund |
| `GET /tenant/refunds/:id/reject` | Refund | Reject refund |
| `GET /tenant/refunds/:id/process` | Refund | Process refund |

### Dashboard Aggregation

| Endpoint | Description |
|---|---|
| `GET /tenant/dashboard/crm-overview` | Lead/client stats |
| `GET /tenant/dashboard/operations-overview` | Booking/ticketing stats |
| `GET /tenant/dashboard/finance-overview` | Invoice/payment stats |
| `GET /tenant/dashboard/hrm-overview` | Employee/attendance stats |
| `GET /tenant/dashboard/branch-performance` | Per-branch metrics |

---

## 9. UI DETAIL PAGE PLAN

Every detail page must show:
- Loading state
- Empty state
- Error state
- Responsive layout
- Permission-aware actions
- Connected related entities
- Activity timeline section
- No fake data, no dead buttons

### Lead Detail Page
```
├── Overview (status, priority, score, source)
├── Assigned Employee
├── Contact Info (phone, email, socials)
├── Travel Requirements
├── Follow-ups (list + add)
├── Quotations (linked)
├── Documents
├── Timeline (activity stream)
└── Actions: Edit | Convert to Client | Create Quotation | Delete
```

### Client Detail Page
```
├── Profile (name, type, nationality, contact)
├── Passports (list + add)
├── Financial Summary (outstanding, credit limit)
├── Leads (source history)
├── Quotations
├── Bookings
├── Invoices
├── Payments
├── Tickets
├── Documents
├── Tasks
├── Timeline
└── Actions: Edit | New Quotation | New Booking | Delete
```

### Quotation Detail Page
```
├── Overview (quote number, status, dates)
├── Client / Lead (linked)
├── Assigned Employee
├── Line Items (list + add/edit/remove)
├── Totals (subtotal, tax, discount, grand)
├── Revision History
├── Status Log
├── Timeline
└── Actions: Send | Accept | Reject | Convert to Booking | Convert to Invoice | Generate PDF
```

### Booking Detail Page
```
├── Overview (booking ref, PNR, status, TTL)
├── Client / Lead / Quotation (linked)
├── Assigned Employee
├── Travel Dates
├── Passengers
├── Segments
├── Invoices
├── Payments
├── Tickets
├── Refund/Reissue/Cancellation Requests
├── Documents
├── Timeline
└── Actions: Create Invoice | Add Payment | Issue Ticket | Request Refund/Reissue/Cancellation
```

### Ticket Detail Page
```
├── Overview (ticket number, status, dates)
├── Booking (linked)
├── Passenger
├── Airline
├── Invoice / Payment (if applicable)
├── Refund/Reissue/Void History
├── Timeline
└── Actions: Void | Refund | Reissue
```

### Invoice Detail Page
```
├── Overview (invoice number, status, amounts)
├── Client (linked)
├── Booking / Quotation (linked)
├── Invoice Lines
├── Payments
├── Receipts
├── Ledger Entries
├── Timeline
└── Actions: Record Payment | Void | Download PDF
```

### Employee Detail Page
```
├── Profile (name, code, position, department)
├── Branch
├── User Account (linked)
├── Leads (assigned)
├── Quotations (handled)
├── Bookings (handled)
├── Tickets (issued)
├── Payments (verified)
├── Attendance
├── Leave
├── Commissions
├── Salary
├── Performance Reviews
├── Timeline
└── Actions: Edit | Add Leave | Review Performance
```

---

## 10. AUDIT / TIMELINE RULES

### Audit Log (compliance/security)
Every mutation must audit:
- Create, Update, Delete/archive, Status change, Assignment, Approval
- Payment verification, Ticket issue/void/refund, Reissue, Cancellation
- Salary processing, Commission approval
- Role/permission changes, Document download/sensitive access
- Master data changes

AuditLog fields:
- `tenantId`, `branchId`, `actorId`
- `action` (AuditAction enum)
- `module`, `entity`, `entityId`
- `oldValue` (where safe), `newValue` (where safe)
- `metadata` (Json), `ipAddress`, `userAgent`, `traceId`
- `createdAt`

Never skip audit for sensitive actions.

### Activity Timeline (business visibility)
Every major entity must show timeline events:
- Lead: created, assigned, follow-up scheduled/completed, converted to client
- Client: created, profile updated, passport added, booking made, payment made
- Quotation: created, sent, accepted, rejected, booking created, invoice created
- Booking: created, PNR added, payment received, ticket issued, refund requested
- Ticket: issued, voided, refunded, reissued
- Invoice: created, sent, paid, voided
- Refund: requested, approved, rejected, processed
- Employee: assigned, commission generated, salary processed, leave approved

Activity fields:
- `tenantId`, `branchId`, `userId`
- `type` (activity type string)
- `subject` (summary)
- `content` (details)
- `entity`, `entityId` (what it relates to)
- `metadata` (Json)
- `createdAt`

---

## 11. TENANT/BRANCH ISOLATION RULES

### Database Level
- Every tenant-owned table includes `tenantId`
- Branch-aware records include `branchId`
- Business numbers scoped: `@@unique([tenantId, quoteNumber])`
- Never global-unique business identifiers

### API Level
- All tenant routes require `X-Tenant-Id` header
- TenantGuard validates membership
- All service queries filter by `tenantId`
- Cross-entity validation: linked IDs must share the same `tenantId`

### Branch Level
- Branch always belongs to tenant: `@@unique([tenantId, code])`
- User branch access via `UserBranchMembership`
- Branch-aware queries validate both `tenantId` + `branchId`
- Never validate branch only by `branchId`

### Cross-Tenant Blocking
These operations are forbidden and must throw ForbiddenException:
- Accessing another tenant's leads, clients, quotations, bookings
- Linking entity from Tenant A to entity from Tenant B
- Payment to invoice of another tenant
- Ticket on booking of another tenant
- Employee accessing another tenant's branch

---

## 12. TESTING PLAN

### Full Flow Test (E2E)
1. Create lead
2. Assign lead to employee
3. Schedule follow-up → complete follow-up
4. Convert lead to client
5. Create quotation from lead/client
6. Add quotation line items
7. Send quotation → accept quotation
8. Convert quotation to booking
9. Add booking passengers and segments
10. Create invoice from booking
11. Receive payment
12. Create receipt
13. Create ledger entry
14. Issue ticket
15. Request refund → approve refund → process refund
16. Create reversal ledger entry
17. Verify employee performance updates
18. Verify activity timeline created
19. Verify audit logs created

### Security Tests
- Cross-tenant client blocked
- Cross-tenant quotation blocked
- Cross-tenant booking blocked
- Cross-tenant payment blocked
- Branch mismatch blocked
- Invalid status transition blocked
- Hidden master data code blocked
- Unauthorized user blocked
- Sensitive document download blocked

---

## 13. IMPLEMENTATION PHASES

### Phase 1: Architecture Plan ✋ CURRENT
- [ ] Create INTERCONNECTED_WORKFLOW_PLAN.md

### Phase 2: Schema Hardening
- [ ] Add Prisma `@relation` directives to all models
- [ ] Add `createdById`/`updatedById` to models lacking them
- [ ] Add missing relationship models: BookingPassenger, BookingSegment, InvoiceLine, TicketStatusLog, BookingStatusLog, RefundRequest, ReissueRequest, CancellationRequest
- [ ] Add HRM sub-models: SalaryProfile, SalaryRun, SalarySlip, Commission, Incentive
- [ ] Update status transitions map to include all modules
- [ ] Generate and apply migration

### Phase 3: Foundation Services
- [ ] Create RelationshipValidationService (cross-entity validation)
- [ ] Create ActivityTimelineService (unified activity logging)
- [ ] Create NumberGeneratorService (server-side business number generation)

### Phase 4: Lead → Client → Quotation Flow
- [ ] Wire lead-to-client conversion with full audit/activity
- [ ] Wire lead-to-quotation creation
- [ ] Wire quotation status transitions with logs
- [ ] Wire quotation-to-booking conversion
- [ ] Wire quotation-to-invoice conversion

### Phase 5: Booking → Invoice → Payment → Receipt → Ledger Flow
- [ ] Wire booking-to-invoice creation
- [ ] Wire payment-to-receipt generation
- [ ] Wire payment-to-ledger entry
- [ ] Wire invoice status auto-update on payment
- [ ] Wire receipt creation on successful payment

### Phase 6: Booking → Ticket Flow
- [ ] Wire booking-to-ticket with passenger assignment
- [ ] Wire ticket status transitions
- [ ] Wire ticket issue → booking status update to TICKETED

### Phase 7: After-Sales Flow
- [ ] Wire RefundRequest (create, approve, reject, process)
- [ ] Wire ReissueRequest (create, approve, reject, process)
- [ ] Wire CancellationRequest (create, approve, reject, process)
- [ ] Wire refund → reversal ledger entry
- [ ] Wire refund → invoice/ticket status update

### Phase 8: Employee → Commission → Salary → Performance Flow
- [ ] Wire commission from bookings/tickets to employee
- [ ] Wire salary profile/run/slip generation
- [ ] Wire performance calculation from actual operations
- [ ] Wire employee detail page with connected data

### Phase 9: UI Detail Pages
- [ ] Update Lead detail with timeline, connected records
- [ ] Update Client detail with timeline, connected records
- [ ] Update Quotation detail with timeline, connected records
- [ ] Update Booking detail with timeline, connected records
- [ ] Update Ticket detail with timeline, connected records
- [ ] Update Invoice detail with timeline, connected records
- [ ] Create Employee detail with connected records
- [ ] Update Dashboard with real aggregated metrics

### Phase 10: Testing
- [ ] Full business flow E2E tests
- [ ] Security/tenant isolation tests
- [ ] Status transition guard tests
- [ ] RBAC/permission tests
- [ ] Master data validation tests

### Phase 11: Production Hardening
- [ ] CI with real lint, typecheck, tests
- [ ] Auth hardening (refresh tokens, login history)
- [ ] Rate limiting per tenant
- [ ] Health + observability endpoints
- [ ] Deployment docs

---

## 14. CURRENT STATE VS TARGET

### What Exists (Commit 58af3bf / 48c4287)
- 46 Prisma models (platform, org, RBAC, CRM, ops, finance, HRM, master data)
- 28 NestJS modules with full CRUD controllers
- JWT auth + Tenant context + RBAC guards
- Audit log interceptor
- Tenant-scoped business numbers
- Status transition utility (partially wired)
- Master data system with tenant override
- 55+ Next.js pages with shadcn UI
- Soft delete on most models
- Presigned document upload/download

### What's Missing (from audit)
- Prisma `@relation` directives on many models
- Cross-entity validation (e.g., booking's clientId matching quotation's clientId)
- Activity/activity timeline integration (only LeadService uses it)
- Server-side number generation (client-provided)
- Automated ledger entries from finance mutations
- Booking-specific sub-models (passengers, segments)
- Invoice-specific sub-models (invoice lines)
- After-sales models (refund, reissue, cancellation requests)
- HRM sub-models (salary profile, run, slip, commission, incentive)
- Real connected dashboards and detail pages
- Comprehensive tests

---

## 15. COMMIT PLAN

```
1. docs: define interconnected SaaS workflow architecture
2. feat: add Prisma relations and missing sub-models
3. feat: create relationship validation and timeline foundation
4. feat: connect lead → client → quotation workflow
5. feat: connect quotation → booking → invoice workflow
6. feat: connect booking → payment → receipt → ledger workflow
7. feat: connect booking → ticket workflow
8. feat: connect ticket → after-sales workflow
9. feat: connect employee → commission → salary → performance
10. feat: add server-side number generation
11. feat: update all detail pages with connected data and timelines
12. test: add full travel operation workflow coverage
13. chore: production hardening (CI, auth, rate limiting, docs)
```
