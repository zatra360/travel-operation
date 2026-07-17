# Travel Operation Product Architecture

This document defines the target operating model and software architecture. It should guide feature boundaries, navigation, API design, integration work, and future architecture decisions.

# 3. Product Vision

## 3.1 Vision Statement

Build a multi-tenant, multi-branch, mobile-first Travel Business Operating System that allows a travel company to sell, fulfill, control, measure, and improve all travel services from one platform.

## 3.2 Product Promise

The platform should answer these questions at any moment:

- Who is the customer?
- What does the customer need?
- Who owns the inquiry?
- What has been promised?
- Which suppliers are involved?
- What is confirmed and what is pending?
- What deadline or time limit is approaching?
- What has the client paid?
- What must the agency pay?
- What is the expected and realized profit?
- Which documents are missing?
- Which passenger or service is at risk?
- What happened previously?
- What should happen next?
- Who approved each exception?
- What was the customer outcome?
- What was the environmental, social, or community effect where relevant?

## 3.3 Product Boundaries

The platform may integrate with, but does not need to replace:

- Airline GDS/NDC systems
- Hotel channel managers and bedbanks
- Embassy or government visa systems
- Payment gateways and banks
- Accounting or tax filing systems
- Messaging providers
- Map and geocoding services
- Identity verification and OCR providers
- Travel insurance provider systems
- Government accreditation portals

The platform should become the **system of operational record**, even when fulfillment occurs through external systems.

---

# 4. Travel-Domain Definitions

| Term | Meaning in the platform |
|---|---|
| FIT | Flexible or independent traveler booking, usually custom-built |
| GIT | Group inclusive tour with shared itinerary and arranged capacity |
| Series departure | Repeated package with fixed dates and capacity |
| Package | Multiple travel services sold together |
| Itinerary | Ordered travel plan containing dates, places, services, and activities |
| PNR | Passenger Name Record or equivalent reservation locator |
| TTL | Ticketing or payment time limit |
| Voucher | Proof/instruction for a supplier to deliver a service |
| Ground handler | Destination-side operator delivering transfers, guides, tours, and local services |
| Net rate | Supplier price before agency markup |
| Published rate | Public-facing or supplier-listed price |
| Markup | Amount or percentage added to cost |
| Commission | Income paid by a supplier or allocated to an agent/staff member |
| Reissue | Replacement of a ticket or service after a change |
| Refund | Return of eligible value after deductions |
| Void | Reversal within an allowed issuance window |
| No-show | Passenger did not use the reserved service |
| Allotment | Capacity held by contract for future sale |
| Release period | Date by which unused allotment must be returned |
| Rooming list | Group accommodation assignment list |
| Manifest | Operational passenger list |
| DMC | Destination management company |
| MICE | Meetings, incentives, conferences, and exhibitions |
| SIT | Special-interest tour |
| FAM | Familiarization trip used for product research and supplier development |
| Pax | Passenger or participant count |
| Service order | One fulfillment unit inside a booking, such as flight, hotel, visa, transfer, or tour |

---

# 5. Users, Personas, and Roles

## 5.1 Platform-Level Roles

### Platform Super Admin

Controls the SaaS platform:

- Company/tenant creation
- Plans and subscriptions
- Feature entitlements
- Usage and limits
- Platform-level security
- Global master data
- System health
- Impersonation with strict audit
- Support and incident management
- Billing and payment status
- Global configuration
- Tenant suspension and restoration

### Platform Support

- View tenant diagnostics
- Assist onboarding
- Review errors and integration status
- Access only approved support scopes
- Never access sensitive passport/payment data without explicit permission and audit

### Platform Finance

- SaaS invoices
- Tenant subscription payments
- Credits and adjustments
- Revenue recognition
- Dunning and suspension rules

## 5.2 Tenant/Company Roles

Recommended standard roles:

| Role | Primary Scope |
|---|---|
| Company Owner | Full company oversight |
| Company Admin | Configuration, people, roles, branches |
| Branch Manager | Branch performance and approvals |
| Sales Manager | Leads, conversion, sales quality, targets |
| Sales Executive / Travel Consultant | Inquiry, follow-up, quotation, customer relationship |
| Tour Product Manager | Package and itinerary creation |
| Contracting Manager | Suppliers, contracts, rates, allotments |
| Reservation Officer | Hotel, tour, transfer, and service reservations |
| Ticketing Officer | PNR, fares, TTL, issuance, void, reissue |
| Visa Officer | Visa cases, checklist, appointment, submission |
| Operations Manager | Departure readiness and service delivery |
| Airport Representative | Arrival/departure assistance |
| Guide / Tour Leader / Escort | Assigned group operations |
| Transport Coordinator | Vehicles, drivers, transfer schedule |
| Finance Manager | Accounts, approvals, reconciliation |
| Cashier | Receipts, cash, wallet, bank deposits |
| Accounts Receivable Officer | Client collections |
| Accounts Payable Officer | Supplier bills and payments |
| HR Manager | Employees, leave, attendance, payroll |
| Marketing Manager | Campaigns, content, source attribution |
| Customer Support Officer | Complaints, incidents, service recovery |
| Quality and Compliance Officer | SOP, audits, certifications, risk |
| Corporate Account Manager | Business travel clients |
| B2B Agent Manager | Sub-agents, credit, statements, commissions |
| Auditor / Viewer | Read-only or export-limited access |

## 5.3 External Portal Roles

- Traveler/customer
- Corporate requester
- Corporate approver
- Corporate traveler
- B2B sub-agent
- Supplier
- Guide or driver
- Freelance consultant
- Group organizer
- Tour leader
- Affiliate/referral partner

---

# 6. Multi-Tenant and Organization Model

## 6.1 Hierarchy

```text
Platform
└── Tenant / Company
    ├── Legal Entity
    ├── Brand
    ├── Branch
    │   ├── Department
    │   ├── Team
    │   ├── Counter / Cash Point
    │   └── Warehouse / Document Location, if applicable
    ├── Users
    ├── Roles
    ├── Financial Accounts
    ├── Suppliers
    ├── Products
    └── Policies
```

## 6.2 Required Tenant Isolation

Every tenant-owned record must include `tenantId`.

Branch-sensitive records should include `branchId`.

Cross-tenant references must be impossible at:

- Database relation level
- Service validation level
- API authorization level
- Search and export level
- Background-job level
- File-storage key level
- Cache-key level
- Analytics-query level

## 6.3 Configurable Company Features

Each tenant should configure:

- Default currency
- Additional currencies
- Time zone
- Date format
- Number formats
- Languages
- Tax settings
- Invoice and document templates
- Approval thresholds
- Booking and quotation numbering
- Branch-level numbering
- Payment methods
- Customer credit rules
- Supplier credit rules
- Commission policies
- Refund approval rules
- Default terms and conditions
- Privacy and retention policy
- Service modules enabled
- Integrations enabled
- Notification preferences
- Working hours and holiday calendar
- SLA policies
- Sustainability and quality goals

---

# 7. Product Architecture

## 7.1 Capability Map

```text
PLATFORM ADMINISTRATION
  Companies | Plans | Billing | Usage | Global Master Data | Support | Security

TENANT ADMINISTRATION
  Branches | Departments | Users | Roles | Policies | Templates | Audit

SALES AND CRM
  Leads | Clients | Communications | Follow-ups | Tasks | Campaign Attribution

PRODUCT AND CONTRACTING
  Destinations | Attractions | Suppliers | Contracts | Rates | Allotments
  Packages | Itineraries | Departures | Cost Sheets | Pricing

TRAVEL SALES
  Quotations | Approvals | Booking Conversion | Deposits | Terms

FULFILLMENT
  Air | Hotel | Transfer | Tour | Visa | Insurance | Cruise | Rail | Bus | Misc.

OPERATIONS
  PNR | TTL | Documents | Vouchers | Manifests | Rooming | Guide/Driver Assignments
  Departure Control | Incident Management | In-Travel Support

AFTER-SALES
  Amendments | Reissues | Voids | Refunds | Cancellations | Complaints

FINANCE
  Invoices | Receipts | Payments | AR | AP | Vendor Bills | Cash/Bank
  Journal | Reconciliation | FX | Tax | Profitability | Commission | Payroll

PORTALS
  Customer | Corporate | B2B Agent | Supplier | Field Operations

INTELLIGENCE
  Dashboards | Reports | Forecasting | Alerts | AI | Automation | Data Quality

RESPONSIBLE OPERATIONS
  Quality | Safety | Accessibility | Sustainability | Local Impact | Feedback
```

---

# 8. End-to-End Business Workflows

# 8.1 Lead-to-Client

1. Capture inquiry from:
   - Website
   - Facebook/Meta lead form
   - WhatsApp
   - Phone
   - Walk-in
   - Referral
   - Corporate request
   - B2B agent
   - API/import
2. Detect possible duplicates.
3. Assign owner using rule, team, branch, service, language, or workload.
4. Start first-response SLA.
5. Record communication.
6. Qualify requirement.
7. Estimate budget and potential value.
8. Create follow-up tasks.
9. Convert qualified lead into:
   - Individual client
   - Family/group client
   - Corporate account
   - B2B agent
10. Preserve complete pre-conversion history.

## 8.2 Requirement-to-Quotation

1. Capture passenger and trip requirements.
2. Select service type or package.
3. Research route, destination, and availability.
4. Request supplier quotations where needed.
5. Build itinerary or select template.
6. Add service options.
7. Calculate:
   - Net supplier cost
   - Taxes
   - Service fees
   - Markup
   - Supplier commission
   - Staff/sub-agent commission
   - Currency conversion
   - Contingency
   - Expected profit
8. Submit internal approval if margin or discount crosses threshold.
9. Generate versioned quotation.
10. Send via email, WhatsApp, portal, or PDF.
11. Track viewed, negotiated, revised, accepted, rejected, or expired.
12. Convert accepted option into booking.

## 8.3 Quotation-to-Booking

1. Lock accepted quotation revision.
2. Create booking and service orders.
3. Create passenger records.
4. Collect deposit or apply credit.
5. Reserve suppliers.
6. Record confirmation numbers.
7. Store TTL and supplier deadlines.
8. Create outstanding document checklist.
9. Generate client and supplier tasks.
10. Maintain booking status independent of each service status.

## 8.4 Booking-to-Travel

1. Verify all passengers.
2. Confirm all services.
3. Collect required payment.
4. Complete visa or entry formalities.
5. Issue tickets and vouchers.
6. Build final itinerary.
7. Prepare emergency contacts.
8. Prepare manifest/rooming/transfer list.
9. Assign guide, driver, or representative.
10. Send departure pack.
11. Record pre-departure acknowledgement.
12. Monitor active trip.
13. Manage incident or service disruption.
14. Close services after delivery.

## 8.5 Completion-to-Settlement

1. Confirm service completion.
2. Collect customer feedback.
3. Record complaint or recovery.
4. Receive supplier invoices.
5. Compare invoice to contract and reservation.
6. Approve supplier payment.
7. Finalize client receivable.
8. Calculate final margin.
9. Release staff/sub-agent commission.
10. Close operational file.
11. Retain customer for repeat sale.
12. Feed performance data to supplier, product, employee, and destination analytics.

---

# 13. API and Integration Architecture

## 13.1 API Style

- REST API for core transactions
- OpenAPI documentation
- Versioned routes
- Consistent errors
- Cursor pagination for large datasets
- Search and filters
- Idempotency
- Webhooks
- Background jobs
- Integration adapters
- Rate limiting
- Tenant and branch context

## 13.2 Suggested Route Domains

```text
/api/v1/platform/*
/api/v1/tenant/admin/*
/api/v1/tenant/crm/*
/api/v1/tenant/products/*
/api/v1/tenant/suppliers/*
/api/v1/tenant/packages/*
/api/v1/tenant/quotations/*
/api/v1/tenant/bookings/*
/api/v1/tenant/services/*
/api/v1/tenant/operations/*
/api/v1/tenant/finance/*
/api/v1/tenant/hr/*
/api/v1/tenant/reports/*
/api/v1/portal/customer/*
/api/v1/portal/corporate/*
/api/v1/portal/agent/*
/api/v1/portal/supplier/*
/api/v1/integrations/*
/api/v1/webhooks/*
```

## 13.3 Integration Framework

Each connector should implement:

- Authentication
- Configuration
- Test connection
- Capability declaration
- Request mapping
- Response normalization
- Retry
- Idempotency
- Rate-limit handling
- Error classification
- Raw payload storage
- Webhook validation
- Health status
- Credential rotation
- Tenant isolation
- Audit

## 13.4 Integration Categories

- Airline GDS/NDC
- Hotel/bedbank
- Payment
- Messaging
- Email
- OCR/identity
- Insurance
- Visa partner
- Accounting
- Maps
- Currency rates
- Tax/e-invoice where applicable
- Analytics
- Error monitoring
- CRM import
- Public website

---

# 14. Technical Architecture

## 14.1 Recommended Baseline

The repository's current baseline is appropriate:

- Next.js frontend
- NestJS API
- PostgreSQL
- Prisma
- TypeScript
- Cloudflare R2
- Redis/background queue, to be added or fully used
- OpenAPI
- Containerized development
- CI/CD

## 14.2 Recommended Service Shape

Start as a modular monolith, not microservices.

```text
Web Application
      ↓
API Gateway / NestJS Application
      ├── Identity and Tenant
      ├── CRM
      ├── Product and Supplier
      ├── Sales
      ├── Booking and Operations
      ├── Finance
      ├── HRM
      ├── Reporting
      └── Integration Adapters
              ↓
PostgreSQL | Redis/Queue | R2 | External Providers
```

Extract services only when justified by scale or independent failure domains, for example:

- Messaging
- Document processing/OCR
- Integration workers
- Reporting warehouse
- AI workloads

## 14.3 Background Jobs

Use a durable queue for:

- TTL alerts
- Scheduled messages
- Supplier reconfirmation
- Passport/contract expiry
- Webhook processing
- Payment reconciliation
- OCR
- PDF generation
- Report export
- Data import
- Integration sync
- Notification delivery
- AI tasks

## 14.4 Event Model

Publish internal events such as:

- LeadCreated
- LeadConverted
- QuotationSent
- QuotationAccepted
- BookingCreated
- ServiceConfirmed
- TTLApproaching
- PaymentReceived
- TicketIssued
- VisaSubmitted
- BookingReady
- TripStarted
- TripCompleted
- RefundApproved
- SupplierBillApproved

Use an outbox pattern to avoid lost events.

---

# 15. Security, Privacy, and Compliance

## 15.1 Authentication

- Short-lived access token
- Rotating refresh token
- Token revocation
- MFA
- Device/session list
- Brute-force protection
- Login history
- Password policy
- SSO for enterprise as later feature

## 15.2 Authorization

- Tenant guard
- Branch guard
- Permission guard
- Ownership/team filters
- Field masking
- Approval limits
- Export/download permissions
- Support-access grant

## 15.3 Sensitive Data

Sensitive fields include:

- Passport
- National ID
- Visa documents
- Bank statements
- Medical documents
- Payment references
- Supplier banking
- Personal contact

Controls:

- Encryption
- Private storage
- Access logging
- Short-lived signed URLs
- No sensitive data in logs
- Redaction
- Retention
- Deletion workflow
- Backup protection
- Secrets management

## 15.4 Financial Controls

- Maker-checker approval
- No self-approval
- Idempotent payments
- Immutable journals
- Reconciliation
- Period close
- Audit
- Exception report
- Refund approval
- Commission release only after trigger

## 15.5 Compliance Design

Rules and templates should be configurable by country and tenant. Legal, tax, accreditation, privacy, visa, and accounting requirements must be reviewed by qualified local professionals before production use.

---

# 16. Non-Functional Requirements

## Performance

- Common list page p95 under 2 seconds under normal load
- Search response under 2 seconds for indexed fields
- Core transaction API p95 under 500 ms excluding external providers
- Large export processed asynchronously
- Mobile-first performance

## Availability

- Target 99.9% after production maturity
- Health checks for API, database, storage, queue, and integrations
- Graceful external-provider failure
- Retry and dead-letter queue
- Read-only degraded mode where practical

## Scalability

- Tenant-aware indexes
- Cursor pagination
- Partition/archive strategy for audit and messages
- Object storage for files
- Queue-based heavy work
- Read replicas/warehouse when needed

## Reliability

- Transactional status transitions
- Outbox events
- Idempotency
- Backup and restore tests
- Data import validation
- Reconciliation reports

## Accessibility

- WCAG-oriented interface
- Keyboard navigation
- Screen-reader labels
- Color-independent states
- Accessible forms and error messages
- Large touch targets
- Language support

## Internationalization

- English and Bangla first for Bangladesh deployment
- Translation-ready content
- Local number/date/currency formats
- Right-to-left readiness if expanding to Arabic markets
- Time-zone aware scheduling

---

# 17. UI/UX Information Architecture

## 17.1 Navigation

Recommended tenant navigation:

```text
Home
Sales
  Leads
  Clients
  Follow-ups
  Communications
Products
  Destinations
  Suppliers
  Contracts & Rates
  Packages
  Itineraries
  Departures
Operations
  Quotations
  Bookings
  Air / PNR
  Hotels
  Visa Cases
  Transfers
  Tours
  Documents
  Departure Control
  Incidents
After Sales
  Amendments
  Reissues
  Voids
  Cancellations
  Refunds
  Complaints
Finance
  Sales Invoices
  Receipts
  Payments
  Client Accounts
  Supplier Bills
  Supplier Payments
  Cash & Bank
  Reconciliation
  Journal
  Expenses
  Commission
  Reports
People
  Employees
  Attendance
  Leave
  Payroll
  Performance
Marketing
  Campaigns
  Offers
  Loyalty
  Content
Reports
Settings
```

## 17.2 UX Principles

- Mobile-first
- Clear status and next action
- One-click communication
- Timeline on every business record
- Sticky financial summary
- Permission-aware actions
- Global search
- Command palette
- Saved filters
- Bulk actions with safeguards
- Consistent empty/loading/error states
- Audit visibility
- No hidden destructive action
- Local language support
- Draft autosave
- Unsaved-change protection
- Offline-tolerant field operations where feasible

## 17.3 Record Page Standard

Every major record should have:

- Header: reference, name, status, owner, branch
- Summary cards
- Next action
- Alert strip
- Tabs:
  - Overview
  - Travelers
  - Services
  - Documents
  - Finance
  - Communication
  - Tasks
  - Timeline
  - Audit
- Right-side contextual actions
- Related-record navigation

---

# 18. Bangladesh-Oriented Configuration

The product should remain global but provide a strong Bangladesh configuration pack.

## Localization

- Bangla and English
- BDT
- Asia/Dhaka
- +880 phone normalization
- District/division master data
- Bangladeshi nationality and passport conventions
- Local address format
- Configurable local tax fields
- Local invoice/receipt templates

## Payments

Configurable support for:

- Cash
- Bank transfer
- Card
- Cheque
- bKash
- Nagad
- Upay
- Payment gateways
- Corporate credit
- Agent wallet

## Business Verticals

Optional templates:

- Air ticket agency
- Visa agency
- Tour operator
- Hajj and Umrah
- Student travel
- Medical travel
- Corporate travel
- B2B ticketing
- Inbound DMC
- Manpower-related travel support, only where legally permitted and properly licensed

## Industry Relationships

Store licences, memberships, and accreditation as configurable records. The platform should not assume that every company has the same approvals.

---

# 21. Recommended Target Module Structure

## API

```text
modules/
  platform/
    plans
    subscriptions
    usage
    support-access
  organization/
    tenant
    legal-entity
    branch
    department
    team
    user
    role
  crm/
    lead
    client
    traveler
    communication
    follow-up
    campaign
  knowledge/
    country
    destination
    attraction
    route
  supplier/
    supplier
    contract
    rate
    allotment
    performance
  product/
    product
    itinerary
    package
    departure
    cost-sheet
    pricing
  sales/
    quotation
    approval
  booking/
    booking
    service-order
    air
    hotel
    transfer
    tour
    visa
    insurance
    cruise
    rail-bus
  operations/
    pnr
    ticket
    voucher
    manifest
    rooming-list
    departure-control
    assignment
    incident
  after-sales/
    amendment
    reissue
    void
    cancellation
    refund
    complaint
  finance/
    ar
    ap
    cash-bank
    journal
    reconciliation
    fx
    tax
    profitability
    commission
  hr/
  reports/
  automation/
  integration/
  quality/
  sustainability/
```

---
