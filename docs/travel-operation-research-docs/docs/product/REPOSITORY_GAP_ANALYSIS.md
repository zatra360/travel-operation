# Travel Operation Repository Gap Analysis

This document records the current repository strengths, documentation drift, missing travel-domain foundations, technical risks, and corrective recommendations.

# 19. Repository Match Analysis

Repository reviewed:

`zatra360/travel-operation`

## 19.1 Current Repository Strengths

The repository already contains a meaningful production foundation.

### Architecture

- Monorepo
- Next.js frontend
- NestJS API
- PostgreSQL/Prisma
- Shared packages
- Cloudflare R2-oriented storage
- Multi-tenant and branch-aware design
- OpenAPI/Swagger
- CI and tests

### Implemented Domain Modules

Based on the application module, database schema, UI navigation, and commit history:

- Authentication
- Tenant/company management
- Branches
- Departments
- Users
- Roles and permissions
- Audit logs
- Settings
- Dashboard
- Leads
- Clients
- Follow-ups
- Documents
- Quotations
- Bookings
- Tickets
- Invoices
- Receipts
- Payments
- Expenses
- Ledger entries
- Employees
- Leave
- Attendance
- Performance
- Notifications
- Master data
- Activity
- Refunds
- Reissues
- Cancellations
- Commissions
- Salary runs
- Security history and refresh tokens
- Health checks

### Workflow and Hardening

The commit history reports:

- End-to-end lead-to-refund tests
- Tenant-isolation tests
- Status-transition validation
- Payment idempotency
- Audit/activity timelines
- After-sales approval flows
- Deployment and release checks
- Skeleton states and UI consistency

## 19.2 README Mismatch

The README still marks travel operations, finance, HRM, and automation milestones as incomplete, while the actual API module, schema, UI navigation, and commits show that these areas have been implemented.

**Action:** update the README and maintain a generated capability matrix tied to tests or modules.

## 19.3 Match Matrix

Legend:

- **Strong** - substantial usable foundation
- **Partial** - generic or incomplete implementation
- **Missing** - no clear dedicated implementation found
- **Unknown** - needs runtime/code-level verification beyond the inspected files

| Capability | Repository Match | Assessment |
|---|---|---|
| Multi-tenant SaaS | Strong | Tenant, branch, memberships, guards, isolation tests |
| RBAC and audit | Strong | Permission catalog, role assignment, audit/action model |
| CRM | Strong | Rich lead and client fields, follow-up, timeline |
| Document storage | Partial/Strong | R2-oriented storage exists; full sensitive-document controls need verification |
| Quotation | Partial | Versioning and line items exist; deep package costing/options need expansion |
| Generic booking | Partial | Booking, passengers, segments, status logs exist |
| Air ticketing | Partial | Ticket and segment basics exist; PNR/GDS/fare/coupon depth missing |
| Hotel booking | Missing | No dedicated hotel reservation model found |
| Transfer/transport | Missing | No dedicated operational transport model found |
| Tour/activity booking | Missing | No dedicated activity/guide/attraction reservation model found |
| Visa case management | Missing/Partial | Visa fields exist in leads; no complete case/checklist workflow |
| Insurance/cruise/rail/bus | Missing | No dedicated service-specific records found |
| Itinerary builder | Missing | No day/activity itinerary domain found |
| Package builder | Missing | No package/departure/cost-sheet domain found |
| Supplier management | Missing | No full supplier, contract, rate, or performance module found |
| Inventory/allotment | Missing | No dedicated capacity/allotment system found |
| Ground operations | Missing | No manifest, rooming list, guide/driver, departure control |
| Refund/reissue/cancellation | Strong/Partial | Dedicated workflows exist; supplier and airline calculation depth should expand |
| Invoicing and payment | Partial/Strong | Good transactional base |
| Accounts receivable | Partial | Client balances exist; allocations, statements, aging depth needs verification |
| Accounts payable | Missing | Supplier bills/payments and vendor ledger absent |
| Double-entry accounting | Missing | LedgerEntry is not a complete journal/COA design |
| Multi-currency accounting | Partial | Currency fields exist; FX snapshots/gain-loss not complete |
| Booking profitability | Partial | Some estimated fields; direct supplier cost and final margin model incomplete |
| HRM | Strong/Partial | Foundation exists; roster, skills, training, field duty can expand |
| Corporate travel | Missing | Corporate lead fields exist but no policy/request/approval module |
| B2B agent portal | Missing | Some lead fields; no portal, wallet, credit, statement |
| Customer portal | Missing | No clear self-service portal found |
| Supplier portal | Missing | No clear supplier portal found |
| Marketing and loyalty | Missing/Partial | Source fields exist; no campaign spend/loyalty engine |
| Reporting/BI | Partial | Reports navigation exists; analytics depth requires verification |
| Automation | Partial | Notifications/activity exist; general rule engine and durable queue not evident |
| AI assistance | Early/Placeholder | AI-related lead fields exist; governed AI services not clear |
| Sustainability/quality | Missing | No dedicated measurable quality or responsible-tourism module |
| SaaS subscription billing | Missing/Partial | Tenant status exists; plans, usage, invoices, entitlements not found |
| Security hardening | Strong foundation | Refresh tokens, history, security events, rate limits, tests |
| Observability | Partial | Health checks exist; production metrics/tracing/error monitoring need verification |
| Mobile UX | Partial | Responsive Next.js base; field-operation/PWA behavior needs verification |

## 19.4 Qualitative Match Score

This is an architectural judgment, not a measured test result:

| Area | Approximate Readiness |
|---|---:|
| Core SaaS foundation | 85-90% |
| CRM and generic sales | 75-85% |
| Generic booking and finance | 55-65% |
| Deep tour operation domain | 20-30% |
| Supplier, package, and itinerary | 5-20% |
| Portals and integrations | 5-15% |
| Quality and sustainability | 0-10% |
| Overall complete-platform readiness | roughly 45-55% |

The repository should not be restarted. It should be **extended and normalized**.

---

# 20. Repository Technical Risks and Recommendations

## 20.1 Free-Text Statuses

Many business models use `String` statuses.

### Risk

- Invalid states
- Inconsistent spelling
- Weak database integrity
- Difficult reporting
- Migration risk

### Recommendation

Use:

- Domain enums for fixed platform statuses
- Master-data-backed status definitions only when tenant customization is genuinely required
- Explicit transition maps
- Status log
- Terminal-state protection

## 20.2 Service-Specific Data Stored Generically

Generic quotation lines and booking segments are useful but insufficient for deep operations.

### Recommendation

Introduce a shared `ServiceOrder` with dedicated extension tables.

## 20.3 Missing Supplier Cost Foundation

Without supplier, contract, rate, and bill models, the system cannot reliably calculate or realize margin.

### Recommendation

Build supplier/contracting before expanding more sales UI.

## 20.4 Incomplete Accounting

A one-direction ledger entry is not a complete accounting system.

### Recommendation

Either:

1. Implement double-entry accounting, or
2. Define the platform as an operational sub-ledger and integrate with an external accounting system.

Do not present the current ledger as full accounting until this decision is made.

## 20.5 Rich Lead, Thin Fulfillment

The lead model is very detailed, while downstream travel services are comparatively generic.

### Recommendation

Shift near-term development from adding more lead fields to building fulfillment depth.

## 20.6 String IDs Without Relations

Several fields appear to store references as strings rather than database relations.

### Recommendation

Normalize important master-data and service references while retaining snapshots for historical display.

## 20.7 README and Documentation Drift

### Recommendation

- Generate module list from the API application module
- Link roadmap items to tests/issues
- Add architecture decision records
- Maintain `CAPABILITY_MATRIX.md`
- Maintain `DOMAIN_GLOSSARY.md`
- Maintain `STATUS_TRANSITIONS.md`

---
