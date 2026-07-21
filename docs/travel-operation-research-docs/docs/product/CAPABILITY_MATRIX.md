# Travel Operation Capability Matrix

This matrix compares the current repository foundation with the capabilities required for a complete Travel Business Operating System.

Readiness labels:

- **Strong** — substantial implementation foundation exists.
- **Partial** — generic or incomplete implementation exists.
- **Missing** — no clear dedicated implementation was identified.
- **Unknown** — runtime or deeper code verification is still required.

Readiness must be proven by connected workflows, permission checks, tenant-isolation tests, business rules, and operationally meaningful reporting—not by the presence of a page or table alone.

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

# 23. MVP Definition

A credible MVP for a real travel agency should include:

- Tenant, branch, user, roles
- Lead and client
- Traveler/passport
- Supplier
- Product
- Itinerary
- Costing
- Quotation
- Booking with service orders
- Air/hotel/visa/transfer basics
- Documents
- Payment and receipt
- Client receivable
- Supplier payable
- Ticket/voucher
- TTL/deadline alerts
- Refund/cancellation basics
- Dashboard
- Audit
- Reports:
  - Sales
  - Due collection
  - Supplier payable
  - Departure readiness
  - Booking profit

A platform without supplier cost, itinerary/package design, and service-specific fulfillment should be described as a CRM/ERP foundation, not a complete tour operation platform.

---
