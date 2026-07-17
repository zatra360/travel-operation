---
title: Travel Operation Platform - Master Product and Technical Specification
project: zatra360/travel-operation
document_type: Product Requirements Document + Domain Model + Repository Gap Analysis
status: Working master specification
version: 1.0
prepared_date: 2026-07-17
---

# Travel Operation Platform - Master Product and Technical Specification

## Document Purpose

This document defines a complete, production-oriented travel operation platform for:

- Travel agencies
- Tour operators
- Online travel agencies
- Visa-processing agencies
- Airline ticketing businesses
- Hotel and package sellers
- Inbound, outbound, and domestic tour operators
- Destination management companies
- Hajj and Umrah operators
- Corporate travel desks
- B2B travel wholesalers and sub-agents
- Multi-branch travel companies
- Home-based or independent travel consultants

It combines business requirements, travel-domain workflows, system architecture, data design, controls, implementation phases, and a gap analysis against the current repository:

`https://github.com/zatra360/travel-operation`

This is not only a CRM or accounting application. The target product is a **Travel Business Operating System** that manages the complete flow from first inquiry to post-travel settlement.

---

# 1. Executive Summary

The target platform should manage the complete commercial and operational lifecycle:

```text
Marketing / Referral
        ↓
Lead / Inquiry
        ↓
Requirement Discovery
        ↓
Research + Supplier Sourcing
        ↓
Itinerary / Package Design
        ↓
Costing + Pricing + Approval
        ↓
Quotation
        ↓
Client Acceptance
        ↓
Booking / Reservation / PNR / Visa Case
        ↓
Payment + Supplier Confirmation
        ↓
Ticket / Voucher / Travel Documents
        ↓
Departure and Ground Operations
        ↓
In-Travel Support
        ↓
Completion / Feedback
        ↓
Supplier Settlement + Profit Recognition
        ↓
Refund / Reissue / Cancellation, when required
        ↓
Retention / Loyalty / Repeat Sale
```

The product should support both:

1. **Retail transactions** - individual passengers, families, students, tourists, medical travelers, and pilgrims.
2. **B2B and corporate transactions** - companies, institutions, other agencies, sub-agents, resellers, and group organizers.

The platform must combine five operating layers:

| Layer | Purpose |
|---|---|
| Customer and sales | Leads, clients, communication, follow-ups, quotations, approvals |
| Travel product and operations | Packages, itineraries, reservations, PNRs, visas, tickets, vouchers, tours, ground handling |
| Commercial and finance | Costing, pricing, commissions, receivables, payables, cash, banks, ledgers, profitability |
| Organization and governance | Branches, departments, users, roles, audit, quality, risk, approvals |
| Intelligence and automation | Alerts, workflows, reports, forecasting, AI assistance, integrations |

The current repository provides a strong SaaS foundation and implements many generic transaction modules. It is materially ahead of the roadmap written in its README. However, it still lacks several domain-defining capabilities required for a complete travel operation system: supplier contracting, tour-package construction, itinerary operations, service-specific bookings, visa case management, ground operations, vendor payables, proper accounting, GDS/NDC connectivity, B2B portals, and sustainability/quality controls.

A fair qualitative assessment is:

- **SaaS and application foundation:** strong
- **CRM and generic workflow foundation:** strong
- **Generic quotation/booking/finance:** medium
- **Deep travel-domain operations:** early
- **Full business operating system readiness:** incomplete

---

# 2. Research Basis

This specification synthesizes the full supplied source library, including:

1. *Global Tourism: Achieving Sustainable Goals* - sustainable planning, community benefit, quality standards, cultural and environmental responsibility.
2. *Travel & Tourism Development Index 2024* - ICT readiness, infrastructure, workforce resilience, sustainability, socioeconomic impact, risk, and digital transformation.
3. *Tourism: The International Business* - tourist behavior, transport, destinations, tourism organization, planning, management, promotion, and distribution systems.
4. *Travel Agencies - A Study* - agency functions, advice, documentation, reservations, itinerary preparation, and traveler support.
5. *Travel Agency and Tour Operations BTTM(N)-201* - travel-agent functions, liaison with suppliers, costing, documentation, marketing, ticketing, and settlement.
6. *Career Paths: Travel Agent* - communication, tasks, travel types, airfare, lodging, cost, billing, packages, commissions, and agency types.
7. *Travel Agency and Tour Operation lecture notes* - intermediaries, FIT/GIT, package travel, PNR/CRS terminology, reservation records, ticketing, and travel formalities.
8. *Tour Operations and Travel Agency Management* - package design, CRM, operational efficiency, technology, finance, budgeting, risk, and compliance.
9. *Travel Agency & Tour Operation Book* - organizational roles, agency personnel, tour operations, customer-facing and field roles.
10. *Travel Agency and Tour Operation Management for Tourism Management* - air reservation concepts, fares, PNRs, package formulation, and tour costing.
11. *Start Your Own Travel Business and More* - startup planning, market research, daily operations, customer service, technology, risk, marketing, and financial discipline.
12. *Travel Agency and Tour Operations Management* - agency setup, income, diversification, travel documentation, itinerary planning, package costing, pricing, and trade relationships.
13. *Travel Agency and Tour Operations Business XII* - operational foundations, tour construction, itinerary, costing, sales, and practical service delivery.
14. *Management of Travel Agency and Tour Management* - distribution linkages, supplier relationships, operational roles, package design, income, and business diversification.
15. *Sustainable Tourism for Development Guidebook* - governance, investment, employment, inclusion, environmental stewardship, and destination planning.
16. *Tourism for Development in Least Developed Countries* - tourism value chains, trade, local jobs, entrepreneurship, women and youth participation, and development coordination.
17. *Pacific Possible - Tourism* - source-market analysis, scenario planning, segment strategy, capacity, infrastructure, and economic impact.
18. *Travel and Tourism - Top Export Market Rankings* - market indicators, source-market behavior, visitor spending, stay, activities, and market selection.

## 2.1 Principles Derived from the Sources

The product should embody these principles:

1. A travel agency is an **intermediary, adviser, seller, coordinator, document handler, and problem solver**.
2. A tour operator is a **product builder and risk-bearing principal**, not merely a booking clerk.
3. A package is an assembled experience containing multiple services, obligations, costs, margins, and operational dependencies.
4. The system must distinguish **FIT, GIT, group allotment, private tour, series departure, custom package, and special-interest tour**.
5. Travel products are intangible and time-sensitive; therefore clarity, trust, confirmation, deadlines, and service recovery are critical.
6. The agency must maintain strong relationships with airlines, hotels, transporters, guides, insurers, visa partners, attractions, cruise operators, and destination managers.
7. Revenue alone is not enough; the platform should measure cost, margin, supplier liability, client receivable, service quality, risk, and local/sustainable impact.
8. Digital readiness, mobile access, payments, automation, and customer insight are now core operational capabilities.
9. Quality assurance and responsible tourism should be operational features, not marketing slogans.
10. Every transaction should be traceable from inquiry through settlement.

---

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

# 9. Functional Requirements

# 9.1 SaaS Platform Administration

## Required

- Create, edit, suspend, reactivate, and archive tenants
- Tenant onboarding checklist
- Plans, subscriptions, trials, renewals, grace periods
- Feature entitlements by plan
- Usage metering:
  - Active users
  - Branches
  - Storage
  - API usage
  - Monthly bookings
  - AI usage
  - Messaging volume
- Platform invoice and tenant payment records
- Coupons, credits, manual adjustments
- Tenant health and integration diagnostics
- Secure support access
- Global announcements
- Platform-level audit
- Tenant data export and deletion workflow
- Backup/restore controls
- Region/data-residency metadata
- Tenant-specific domain and branding

## Data Entities

- Plan
- PlanFeature
- Subscription
- SubscriptionInvoice
- TenantUsage
- TenantEntitlement
- TenantDomain
- SupportAccessGrant
- PlatformAnnouncement

---

# 9.2 Branch, Department, and Team Management

- Multi-branch ownership
- Branch-specific contact, tax, bank, branding, and document templates
- Department hierarchy
- Team assignment
- Branch-level targets
- Branch-level stock/allotment and supplier relationships
- Inter-branch lead transfer
- Inter-branch booking ownership and revenue split
- Inter-branch receivable/payable
- Branch-specific approval thresholds
- Branch and consolidated reports
- Temporary branch access
- Branch closure with record preservation

---

# 9.3 User, Role, and Permission Management

## Permission Dimensions

A permission should be evaluated by:

```text
Module + Action + Tenant + Branch + Ownership + Team + Record State + Financial Limit
```

Examples:

- Sales executive can update own leads but not another team's leads.
- Ticketing officer can issue a ticket only after payment or approved credit.
- Finance officer can receive payment but cannot approve own refund.
- Branch manager can approve discounts up to a configured amount.
- Company owner can view all branches.
- Visa officer can view passport files but cannot export financial reports.
- Support user can access only a tenant-approved diagnostic session.

## Security Rules

- Least privilege
- Segregation of duties
- No self-approval for sensitive financial actions
- Temporary delegated access
- MFA for privileged roles
- Session/device management
- IP or location controls as optional enterprise features
- Sensitive-field masking
- Permission-aware navigation and search
- Export permission separate from read permission

---

# 9.4 CRM and Lead Management

## Lead Fields

- Person/company identity
- Contact channels
- Source and campaign
- Referral
- Service need
- Destination
- Travel dates and flexibility
- Passenger composition
- Budget range and currency
- Preferred airlines/hotels
- Visa history
- Communication preference
- Language
- Urgency
- Assigned user/team/branch
- Lead score
- Revenue and profit potential
- Corporate/B2B attributes
- Tags
- Consent
- SLA deadline
- Lost reason

## Features

- Kanban and list views
- Duplicate detection
- Bulk import
- Round-robin or weighted assignment
- Source attribution
- Call/WhatsApp/email log
- Notes and attachments
- Follow-up scheduler
- SLA alerts
- Escalation
- Lead aging
- Dormant lead reactivation
- Conversion report
- Lost-lead analysis
- Campaign ROI
- AI-assisted summary and next action

---

# 9.5 Client and Traveler Profile

A client may be:

- Individual
- Family
- Group organizer
- Company
- B2B agency
- Institution
- Government account

A traveler/passenger is a person who consumes a travel service and may differ from the payer or client.

## Required Profile Areas

- Identity
- Passport(s)
- National identity
- Contact
- Address
- Emergency contact
- Traveler preferences
- Loyalty IDs
- Frequent-flyer numbers
- Meal and accessibility needs
- Visa history
- Refusal history
- Travel history
- Documents
- Communication consent
- Credit limit
- Outstanding balance
- Risk flags
- Complaints
- Lifetime value
- Profit contribution
- Family/company relationships

## Important Design Rule

Do not store passport data only as unstructured documents. Store structured fields plus encrypted document assets.

---

# 9.6 Communication and Omnichannel History

- Email send and receive
- WhatsApp integration
- SMS
- Phone-call logs
- Internal notes
- Portal messages
- Templates
- Scheduled messages
- Conversation threads linked to lead, client, quote, booking, visa case, or support ticket
- Delivery/read status
- Consent and opt-out
- Attachment tracking
- Auto-classification
- AI summary
- Message-to-task conversion
- Complete audit

---

# 9.7 Destination and Travel Knowledge Base

## Entities

- Country
- Region
- City
- Destination
- Airport
- Port
- Station
- Attraction
- Activity
- Event
- Hotel area
- Route
- Visa information
- Climate/season
- Local emergency information
- Accessibility information
- Cultural guidance
- Safety guidance
- Supplier coverage
- Media assets

## Features

- Internal and public content
- Versioning
- Verification date
- Source attribution
- Expiry/review reminders
- Multilingual content
- Destination comparison
- Best travel periods
- Travel time estimates
- Route and distance
- Local holidays
- Operational notes
- Responsible-travel guidance

---

# 9.8 Supplier and Vendor Management

This is a major missing domain in the current repository.

## Supplier Types

- Airline
- Hotel
- Bedbank
- DMC
- Ground handler
- Transport company
- Driver
- Guide
- Attraction
- Restaurant
- Cruise company
- Rail/bus operator
- Visa partner
- Insurance company
- Forex provider
- Event venue
- Tour leader
- Freelancer
- Technology provider

## Supplier Profile

- Legal and trade name
- Contacts
- Service areas
- Bank and payment details
- Currency
- Tax information
- Credit terms
- Cancellation policy
- Service standards
- Insurance/licence/accreditation
- Contract documents
- Risk status
- Performance rating
- Complaint history
- Sustainability attributes
- Accessibility capabilities

## Contracting

- Contract period
- Rate validity
- Market/source restrictions
- Occupancy rules
- Child/infant rules
- Blackout dates
- Release period
- Cancellation rules
- No-show terms
- Free-of-charge policy
- Complimentary ratio
- Meal plan
- Tax inclusion
- Commission
- Payment schedule
- Credit limit
- Exchange-rate rule
- Confidentiality
- Service-level agreement
- Renewal alerts

## Performance

- Confirmation speed
- Error rate
- Complaint rate
- Service quality
- Price competitiveness
- Refund delay
- Payment disputes
- On-time performance
- Customer rating
- Sustainability/quality score

---

# 9.9 Rate, Inventory, and Allotment Management

## Rate Types

- Contracted net rate
- Commissionable rate
- Published rate
- Dynamic rate
- Promotional rate
- Group rate
- Corporate rate
- Seasonal rate
- Weekend rate
- Occupancy-based rate
- Per-person rate
- Per-vehicle rate
- Per-service rate

## Inventory

- Hotel rooms by type
- Tour seats
- Vehicle capacity
- Guide availability
- Attraction slots
- Cruise cabins
- Fixed departures
- Airline group blocks
- Visa appointment capacity

## Controls

- Allotment
- Sold
- Held
- Released
- Waitlisted
- Overbooked
- Stop-sell
- Cut-off/release date
- Minimum/maximum stay
- Minimum group size
- Capacity alert
- Supplier reconfirmation

---

# 9.10 Travel Product Catalog

A unified product catalog should represent:

- Air service
- Hotel
- Transfer
- Activity
- Day tour
- Multi-day tour
- Visa
- Insurance
- Cruise
- Rail
- Bus
- Car rental
- Guide
- Event
- MICE service
- Package
- Miscellaneous service

Each product requires:

- Product code
- Supplier
- Destination
- Description
- Inclusions
- Exclusions
- Terms
- Validity
- Rates
- Tax
- Inventory behavior
- Cancellation rules
- Media
- Sales channel
- Visibility
- Language
- Accessibility
- Sustainability tags
- Quality level
- Internal notes

---

# 9.11 Itinerary Builder

This is another major domain gap in the current repository.

## Itinerary Types

- Template itinerary
- Custom itinerary
- Package itinerary
- Booking itinerary
- Group itinerary
- Final traveler itinerary
- Supplier operations itinerary

## Structure

```text
Itinerary
├── Day
│   ├── Date
│   ├── Destination
│   ├── Accommodation
│   ├── Meals
│   ├── Transfer
│   ├── Activity
│   ├── Guide
│   ├── Timing
│   ├── Notes
│   └── Emergency/operational instruction
└── Attachments / Maps / Media
```

## Features

- Drag-and-drop day construction
- Reusable templates
- Geographic validation
- Travel-time checks
- Conflict detection
- Opening-hour checks through integrations where available
- Supplier availability
- Day-by-day client presentation
- Internal operational view
- Cost linked to each itinerary component
- Versioning
- Translation
- Print/PDF and mobile view
- Change comparison
- Weather-aware advisory
- Accessibility and dietary notes
- Responsible-travel guidance

---

# 9.12 Tour Package Builder

## Package Types

- FIT
- GIT
- Fixed departure
- Series
- Private tour
- Group tour
- Escorted tour
- Unescorted tour
- Special-interest tour
- MICE
- Adventure
- Educational
- Religious
- Medical
- Luxury
- Budget
- Domestic
- Inbound
- Outbound

## Package Fields

- Product identity and theme
- Target segment
- Origin market
- Destinations
- Duration
- Minimum/maximum pax
- Valid dates
- Departure dates
- Itinerary
- Inclusions/exclusions
- Accommodation options
- Transport
- Meals
- Activities
- Guide/tour leader
- Visa
- Insurance
- Terms
- Capacity
- Cost sheet
- Pricing tiers
- Child/infant/single supplement
- FOC policy
- Cancellation policy
- Sales channel
- Marketing assets
- Quality and sustainability attributes

## Package Lifecycle

```text
IDEA → RESEARCH → COSTING → INTERNAL_REVIEW → CONTRACTED
→ READY_FOR_SALE → ON_SALE → STOP_SALE → OPERATING
→ COMPLETED → REVIEWED → ARCHIVED
```

---

# 9.13 Tour Costing and Pricing

The platform must support cost calculation beyond generic quotation line totals.

## Cost Categories

- Research and FAM cost
- Air/transport
- Accommodation
- Transfer
- Guide
- Driver
- Attraction/entrance
- Meals
- Visa
- Insurance
- Tour leader
- Communication
- Handling
- Porterage
- Tips
- Marketing allocation
- Staff allocation
- Banking/payment gateway
- Tax
- Contingency
- Currency risk
- Complimentary passenger allocation
- Fixed overhead allocation

## Cost Behavior

- Fixed cost
- Variable per person
- Variable per room
- Variable per vehicle
- Variable per group
- Tiered cost
- Seasonal cost
- Occupancy-dependent cost
- Currency-linked cost

## Pricing Methods

- Cost plus markup
- Margin target
- Market-based
- Segment-based
- Tiered by passenger count
- Single/double/triple occupancy
- Adult/child/infant
- Corporate contracted
- B2B net
- Retail gross
- Promotional
- Dynamic
- Last-minute
- Early bird

## Required Outputs

- Cost per passenger
- Selling price
- Gross profit
- Gross margin
- Break-even passenger count
- Sensitivity by passenger count
- Currency exposure
- Discount headroom
- Staff/sub-agent commission impact
- Expected vs final margin

---

# 9.14 Quotation Management

## Features

- Multiple options in one quotation
- Version and revision control
- Supplier-cost snapshot
- Currency and exchange-rate snapshot
- Inclusions and exclusions
- Passenger-based pricing
- Payment schedule
- Expiry
- Terms
- Approval workflow
- Discount approval
- Margin protection
- Internal and customer notes
- Public secure link
- PDF
- Email/WhatsApp send
- View tracking
- Acceptance and e-sign acknowledgement
- Rejection reason
- Online deposit
- Conversion into booking
- Quote comparison
- Revision history
- Audit

## Status

```text
DRAFT
→ PRICING
→ INTERNAL_REVIEW
→ APPROVED
→ SENT
→ VIEWED
→ NEGOTIATION
→ REVISED
→ ACCEPTED
→ CONVERTED

Terminal alternatives:
REJECTED | EXPIRED | CANCELLED | ARCHIVED
```

---

# 9.15 Booking and Service Order Architecture

A booking should be a commercial container. Each service inside it must have its own lifecycle.

```text
Booking
├── Travelers
├── Payer / Client
├── Service Orders
│   ├── Air
│   ├── Hotel
│   ├── Transfer
│   ├── Tour
│   ├── Visa
│   ├── Insurance
│   ├── Cruise
│   ├── Rail/Bus
│   └── Miscellaneous
├── Documents
├── Payments
├── Supplier Reservations
├── Tickets / Vouchers
├── Tasks
├── Incidents
└── Financial Snapshot
```

## Booking Features

- Booking reference
- Source quotation
- Client and passenger relationship
- Booking owner
- Operating branch
- Billing branch
- Sales channel
- Corporate/B2B account
- Deposit requirement
- Credit status
- Travel dates
- Confirmation status
- Readiness score
- Document checklist
- Risk alerts
- Trip timeline
- Service dependencies
- Overall status derived from service states
- Booking-level profit
- Closure checklist

---

# 9.16 Air Reservation, PNR, and Ticketing

## Core Capabilities

- PNR record
- Multiple passengers
- Multiple segments
- Airline, flight, airport, date/time
- Cabin and booking class
- Fare basis
- Baggage
- Seat and meal request
- SSR/OSI
- Ticketing time limit
- Fare expiry
- Queue and action reminders
- Split PNR
- Group PNR
- Codeshare
- Ticket numbers
- Ticket coupons
- EMD/ancillary records where supported
- Void
- Reissue
- Refund
- No-show
- Schedule change
- Airline waiver
- Exchange calculation
- Ticket report
- BSP or supplier settlement reference

## Integration Strategy

Support adapters for:

- GDS
- NDC
- Airline direct API
- Consolidator API
- Manual/offline PNR

The platform must retain its own normalized record and raw provider payload for audit and synchronization.

## TTL Automation

- Alert owner and ticketing team
- Escalate before expiry
- Auto-create task
- Optionally auto-cancel internal hold
- Record supplier cancellation
- Notify customer
- Preserve timeline

---

# 9.17 Hotel Reservation

## Required Fields

- Property
- Supplier/bedbank
- Check-in/out
- Room type
- Occupancy
- Guest names
- Meal plan
- Rate plan
- Confirmation number
- Cancellation deadline
- Special requests
- Taxes/fees
- Net cost
- Sell price
- Voucher status
- Reconfirmation
- Early/late check-in
- Extra bed
- Child policy
- City tax
- Pay-at-hotel vs prepaid
- Supplier reference

## Operations

- Rooming list
- Group allotment
- Release date
- Stop-sell
- Amendment
- No-show
- Reconfirmation
- Hotel discrepancy
- Overbooking incident
- Alternative hotel workflow

---

# 9.18 Transfer and Transport Management

- Transfer type
- Pickup/drop-off
- Date/time
- Flight linkage
- Vehicle type
- Capacity
- Supplier
- Driver
- Driver phone
- Vehicle number
- Meet-and-greet board
- Waiting time
- Route
- Distance
- Cost basis
- Parking/toll
- Guide
- Passenger manifest
- Live status
- Delay and no-show
- Driver app/portal
- Emergency escalation

---

# 9.19 Tour, Activity, Guide, and Attraction Booking

- Activity/product
- Date/time/slot
- Participant count
- Supplier
- Guide/interpreter
- Language
- Meeting point
- Entry ticket
- Equipment
- Waiver
- Age/health restriction
- Accessibility
- Weather dependency
- Cancellation
- Voucher
- Completion
- Feedback
- Safety incident

---

# 9.20 Visa Case Management

The current repository captures some visa-related lead fields but does not provide a complete case system.

## Visa Case

- Destination country
- Visa type
- Applicant(s)
- Sponsor
- Travel purpose
- Travel date
- Case owner
- Service package
- Eligibility assessment
- Risk flags
- Previous refusal
- Appointment
- Submission
- Biometrics
- Interview
- Additional document request
- Decision
- Passport collection
- Courier
- Refund terms

## Checklist Engine

Requirements should vary by:

- Country
- Visa type
- Applicant nationality
- Occupation
- Age
- Sponsor type
- Travel purpose
- Family relationship
- Prior history

Each requirement must support:

- Required/optional
- Template
- Instructions
- Uploaded asset
- Verification
- Expiry
- Translation
- Notarization/legalization
- Rejection reason
- Re-upload
- Reviewer
- Audit

## Visa Status

```text
INQUIRY
→ ELIGIBILITY_REVIEW
→ DOCUMENT_COLLECTION
→ DOCUMENT_VERIFICATION
→ APPOINTMENT_PENDING
→ APPOINTMENT_CONFIRMED
→ READY_TO_SUBMIT
→ SUBMITTED
→ BIOMETRICS / INTERVIEW
→ UNDER_PROCESS
→ ADDITIONAL_DOCUMENT_REQUIRED
→ APPROVED / REFUSED
→ PASSPORT_COLLECTION
→ COMPLETED
```

---

# 9.21 Travel Documentation and Document Vault

## Document Types

- Passport
- National ID
- Photograph
- Visa
- Ticket
- Hotel voucher
- Insurance
- Invitation
- Bank statement
- Employment certificate
- Trade licence
- Tax documents
- Student documents
- Medical documents
- Consent letter
- Birth/marriage certificate
- Supplier contract
- Invoice/receipt
- Waiver
- Manifest
- Rooming list

## Required Controls

- Encryption at rest
- Private object storage
- Signed URLs
- Malware scanning
- File type/size rules
- OCR with human verification
- MRZ parsing
- Expiry alerts
- Versioning
- Watermarking
- Sensitive download audit
- Retention and deletion policy
- Legal hold
- Redaction
- Role-based masking
- Customer-upload portal
- Document checklist linkage

---

# 9.22 Insurance and Ancillary Services

- Product and provider
- Coverage
- Traveler
- Travel period
- Premium
- Commission
- Policy number
- Exclusions
- Certificate
- Claim guidance
- Cancellation
- Refund
- Provider settlement

Other ancillary services:

- Seat
- Meal
- Extra baggage
- Airport lounge
- Meet-and-assist
- SIM/eSIM
- Forex
- Car rental
- Event ticket
- Equipment rental

---

# 9.23 Cruise, Rail, Bus, and Car Rental

Each should be implemented as a service-specific record under the shared booking model, with:

- Supplier
- Route
- Schedule
- Passenger
- Class/cabin/vehicle
- Confirmation
- Fare/rate
- Cancellation rule
- Ticket/voucher
- Cost and sell price
- Amendment/refund
- Supplier payable
- Customer communication

---

# 9.24 MICE and Group Operations

## MICE

- Event/client
- Venue
- Dates
- Attendees
- Registration
- Accommodation
- Transport
- Flights
- Catering
- Sessions
- Speakers
- Equipment
- Visa letters
- Branding
- Budget
- Supplier contracts
- On-site team
- Incident
- Post-event settlement

## Group Tour Operations

- Group master
- Group organizer
- Minimum/maximum size
- Departure
- Passenger registration
- Rooming list
- Flight manifest
- Coach manifest
- Guide/tour leader
- FOC passengers
- Group payment plan
- Individual balances
- Document readiness
- Visa readiness
- Emergency contacts
- Daily operations
- Final reconciliation

---

# 9.25 Vouchers and Travel Pack

Generate service vouchers containing:

- Agency branding
- Booking reference
- Traveler name
- Supplier
- Service details
- Confirmation number
- Date/time
- Address and contact
- Meeting instruction
- Inclusions/exclusions
- Emergency contact
- Supplier-only price visibility rules
- QR verification
- Terms

The final travel pack may include:

- Final itinerary
- Tickets
- Hotel vouchers
- Transfer vouchers
- Tour vouchers
- Visa
- Insurance
- Emergency contacts
- Destination guidance
- Cultural and responsible-travel guidance
- Payment statement
- Customer acknowledgement

---

# 9.26 Departure Control and Operations Board

A dedicated operational dashboard should display upcoming travel.

## Views

- Today
- Next 24 hours
- Next 7 days
- By branch
- By destination
- By service
- By group
- At-risk
- Missing document
- Payment due
- Unconfirmed service
- TTL due
- Visa pending
- Supplier reconfirmation due

## Readiness Score

Example components:

- Payment complete
- Passport valid
- Visa complete
- Ticket issued
- Hotel confirmed
- Transfer confirmed
- Insurance issued
- Vouchers sent
- Emergency contact available
- Customer acknowledged

---

# 9.27 Incident, Crisis, and Duty Management

## Incident Types

- Flight cancellation/delay
- Missed connection
- Hotel overbooking
- Supplier no-show
- Lost passport
- Medical emergency
- Accident
- Security event
- Natural disaster
- Political disruption
- Customer complaint
- Payment fraud
- Data/privacy incident

## Features

- Severity
- Affected travelers
- Booking and services
- Location
- Incident owner
- Timeline
- Action checklist
- Escalation
- Emergency contacts
- Supplier communication
- Insurance reference
- Expense and compensation
- Root cause
- Corrective action
- Closure review
- Audit and reporting

---

# 9.28 Refund, Reissue, Void, and Cancellation

## Unified Principles

- Request
- Eligibility calculation
- Supplier rule snapshot
- Penalty
- Tax/refundable component
- Agency fee
- Approval
- Supplier submission
- Supplier receivable
- Customer payable
- Payment/refund execution
- Ledger reversal
- Commission reversal
- Status timeline
- Document evidence
- Customer communication

## Refund Status

```text
REQUESTED
→ ELIGIBILITY_REVIEW
→ QUOTED_TO_CUSTOMER
→ CUSTOMER_ACCEPTED
→ INTERNAL_APPROVAL
→ SUBMITTED_TO_SUPPLIER
→ SUPPLIER_APPROVED
→ FUNDS_RECEIVED
→ CUSTOMER_REFUNDED
→ CLOSED
```

Terminal alternatives:

```text
REJECTED | WITHDRAWN | PARTIALLY_REFUNDED | DISPUTED
```

## Reissue

- Old ticket
- New itinerary
- Fare difference
- Tax difference
- Airline penalty
- Agency fee
- Waiver
- New ticket
- Old/new coupon relation
- Ledger adjustment

---

# 9.29 Complaint and Service Recovery

- Complaint category
- Severity
- Booking/service/supplier
- Owner
- SLA
- Evidence
- Root cause
- Proposed resolution
- Refund/credit/compensation
- Approval
- Customer acceptance
- Supplier recovery
- Final satisfaction
- Preventive action
- Public-review risk
- Quality score impact

---

# 9.30 Finance and Accounting

The current repository has invoice, receipt, payment, expense, and ledger foundations, but a production finance system needs deeper controls.

## 9.30.1 Financial Dimensions

- Tenant
- Legal entity
- Branch
- Department
- Booking
- Service order
- Supplier
- Client
- Employee
- Currency
- Sales channel
- Product
- Destination
- Cost center
- Profit center

## 9.30.2 Accounts Receivable

- Invoice
- Debit note
- Credit note
- Receipt
- Allocation
- Unapplied payment
- Aging
- Credit limit
- Collection task
- Statement
- Write-off
- Bad debt
- Corporate/B2B credit

## 9.30.3 Accounts Payable

- Supplier invoice/bill
- Purchase order or service confirmation
- Three-way validation where applicable
- Due date
- Payment request
- Approval
- Partial payment
- Supplier credit note
- Aging
- Dispute
- Remittance advice

## 9.30.4 Chart of Accounts and Journal

Required entities:

- ChartOfAccount
- JournalEntry
- JournalLine
- AccountingPeriod
- FiscalYear
- OpeningBalance
- FinancialAccount
- Reconciliation
- TaxCode
- ExchangeRate

A generic single-direction ledger is not enough for complete accounting. The system should use balanced double-entry journals.

## 9.30.5 Cash, Bank, Wallet, and Gateway

Support:

- Cash counter
- Petty cash
- Bank account
- Credit/debit card
- Payment gateway
- Mobile wallet
- Bank transfer
- Cheque
- Corporate credit
- Agent wallet
- Supplier wallet

Bangladesh-oriented implementations may include configurable integrations for bKash, Nagad, Upay, and local banks without hardcoding the business to a single provider.

## 9.30.6 Multi-Currency

- Transaction currency
- Company base currency
- Supplier currency
- Customer currency
- Rate source
- Quotation-rate lock
- Booking-rate lock
- Payment-date rate
- Realized/unrealized FX gain/loss
- Currency revaluation
- Exchange margin

## 9.30.7 Booking Profitability

Calculate:

```text
Gross Sales
- Discount
- Tax collected on behalf of authority
- Direct Supplier Cost
- Gateway/Bank Cost
- Staff/Sub-agent Commission
- Service Recovery Cost
- Allocated Variable Cost
= Contribution Margin

Contribution Margin
- Allocated Overhead
= Booking Profit
```

Track:

- Expected profit
- Confirmed profit
- Realized profit
- Profit leakage
- Refund/reissue impact
- Supplier variance
- FX variance

---

# 9.31 Commission and Incentive Management

## Commission Sources

- Supplier commission
- Agency service fee
- Staff sales commission
- B2B/sub-agent commission
- Referral commission
- Tour leader commission
- Corporate rebate
- Override commission
- Incentive bonus

## Rules

- Percentage
- Flat
- Tiered
- Margin-based
- Product-based
- Destination-based
- Target-based
- Collected-payment-based
- Completed-travel-based
- Reversal after refund/cancellation
- Approval and payout status

---

# 9.32 HRM and Workforce

- Employee
- Department/team
- Position
- Skills
- Language
- Destination knowledge
- GDS certification
- Visa expertise
- Guide licence
- Attendance
- Leave
- Shift
- Duty roster
- Performance
- Sales targets
- Training
- Commission
- Payroll
- Field assignment
- Expense claim
- Document expiry
- Incident participation

The workforce module should connect operational quality to training needs.

---

# 9.33 Marketing, Campaigns, and Loyalty

## Marketing

- Campaign
- Channel
- Ad set
- Landing page
- Lead source
- Spend
- Creative
- Offer
- Audience
- Attribution
- Leads
- Quotes
- Bookings
- Revenue
- Gross profit
- Refund rate
- Customer quality

## Loyalty

- Membership tier
- Points
- Referral
- Voucher
- Coupon
- Repeat customer
- Anniversary/birthday
- Corporate benefit
- Agent incentive
- Expiry
- Fraud control

## Public Sales Layer

Optional public website/booking front end:

- Packages
- Destinations
- Visa services
- Travel articles
- Inquiry forms
- Secure quotation
- Customer portal
- SEO pages
- Reviews
- Offers

---

# 9.34 Corporate Travel Management

## Corporate Account

- Company profile
- Contacts
- Departments/cost centers
- Travelers
- Travel policy
- Preferred suppliers
- Approval workflow
- Credit limit
- Billing cycle
- Service fee agreement
- Reporting schedule
- Account manager
- SLA

## Corporate Request Flow

```text
REQUEST → POLICY_CHECK → APPROVAL → QUOTATION/OPTIONS
→ BOOKING → TRAVEL → INVOICE → STATEMENT
```

## Policy Controls

- Cabin by employee grade
- Hotel budget
- Advance purchase
- Preferred airline
- Refundable fare rule
- Approver
- Cost center
- Purpose
- Out-of-policy reason
- Traveler safety tracking

---

# 9.35 B2B Agent and Sub-Agent Portal

- Agent onboarding
- Verification
- Contract
- Deposit/wallet
- Credit limit
- Net rate
- Markup control
- Booking
- Quotation
- Statement
- Invoice
- Payment
- Commission
- Refund/reissue
- Support
- White-label documents
- API credentials
- Branch/sub-user
- Exposure and overdue control

---

# 9.36 Customer Self-Service Portal

- Profile and travelers
- Inquiry
- Secure quotation
- Accept/reject
- Online payment
- Upload documents
- Booking status
- Visa status
- Tickets and vouchers
- Final itinerary
- Support request
- Refund/reissue request
- Notifications
- Feedback
- Consent and data request

Sensitive documents must not be exposed through permanent public URLs.

---

# 9.37 Supplier Portal

- Reservation request
- Confirm/reject
- Confirmation number
- Amendment
- Manifest/rooming list
- Invoice upload
- Payment status
- Contract/rate update
- Service completion
- Incident response
- Performance feedback

---

# 9.38 Reporting and Business Intelligence

## Executive Dashboard

- Sales
- Gross profit
- Cash position
- Receivables
- Payables
- Bookings
- Departures
- Conversion
- Refund exposure
- Supplier exposure
- Branch performance
- Staff performance
- Product performance
- At-risk travel

## Sales Reports

- Lead source
- Response time
- Conversion funnel
- Quote win rate
- Sales cycle
- Lost reason
- Salesperson
- Branch
- Customer segment
- Destination
- Product

## Operations Reports

- Unconfirmed services
- TTL
- Document readiness
- Visa pending
- Departures
- Incidents
- Supplier delay
- Reconfirmation
- No-show
- Service failure

## Finance Reports

- Profit and loss
- Balance sheet, when full accounting is enabled
- Cash flow
- AR aging
- AP aging
- Booking profitability
- Supplier variance
- FX gain/loss
- Tax
- Commission
- Refund liability
- Daily sales and collection
- Bank reconciliation

## Product and Market Reports

- Destination demand
- Source market
- Seasonality
- Average spend
- Length of stay
- Package break-even
- Capacity utilization
- Cancellation rate
- Customer satisfaction
- Repeat rate
- Market scenario forecasting

## Sustainability and Community Reports

- Local supplier spend
- Local employment contribution
- Women/youth-owned suppliers where voluntarily recorded
- Accessibility
- Carbon estimate
- Waste/resource indicators where relevant
- Community contribution
- Cultural/heritage activities
- Customer responsible-travel acknowledgement

---

# 9.39 Quality Assurance

## Quality Components

- SOP library
- Checklist
- Internal audit
- Supplier audit
- Customer feedback
- Complaint trend
- Corrective action
- Training need
- Certification evidence
- Service standard
- Mystery audit
- Product review
- Destination review
- Document quality
- Accessibility review

## Quality Gates

Examples:

- Package cannot be published without approved costing and terms.
- Booking cannot be marked ready without mandatory confirmations.
- Ticket cannot be issued without payment or approved credit.
- Supplier cannot be used after licence/contract expiry unless approved exception.
- Visa file cannot move to submission until required documents are verified.
- Refund cannot be paid without approved calculation and finance authorization.

---

# 9.40 Sustainable and Responsible Tourism

Sustainability should be measurable and integrated into decisions.

## Triple Bottom Line

### Economic

- Profitability
- Local supplier spending
- Local employment
- SME participation
- Fair payment
- Seasonality management

### Social and Cultural

- Community participation
- Cultural respect
- Local guide use
- Accessibility
- Gender and inclusion
- Child protection
- Anti-exploitation policy
- Resident/community feedback

### Environmental

- Transport intensity
- Low-carbon option
- Waste reduction
- Water/energy guidance
- Protected-area rules
- Carrying-capacity awareness
- Biodiversity-sensitive products
- Supplier environmental practice

## Product Features

- Sustainability tags
- Responsible supplier score
- Local-benefit indicator
- Accessibility profile
- Estimated carbon band
- Alternative lower-impact option
- Customer guidance
- Certification evidence
- Community contribution record

These metrics should support improvement and transparency without making unverified claims.

---

# 9.41 AI and Automation

## Safe AI Use Cases

- Lead deduplication
- Lead scoring
- Inquiry classification
- Communication summary
- Suggested follow-up
- Quotation draft
- Itinerary draft
- Destination recommendation
- Document classification
- OCR assistance
- Missing-document detection
- Margin anomaly detection
- Supplier comparison
- Refund calculation assistant
- Complaint categorization
- Forecasting
- Knowledge-base answer
- Translation draft
- Risk alert

## Rules

- AI output must be reviewable.
- AI must not autonomously approve financial, visa, legal, safety, or identity decisions.
- Source and confidence should be shown.
- Sensitive data must use approved providers and policies.
- Prompts and outputs should be tenant-isolated.
- Human edits should be retained.
- AI actions must be audited.

## Workflow Automation

A rule engine should support:

```text
WHEN event occurs
IF conditions match
THEN create task / send notification / update status / request approval / call webhook
```

Examples:

- TTL in 6 hours → alert ticketing officer and manager.
- Passport expires before travel → block readiness.
- Quotation viewed but no response in 24 hours → create follow-up.
- Payment received → confirm eligible services.
- Supplier confirmation overdue → escalate.
- Refund approved → create finance task.
- Travel completed → request feedback.
- Contract expires in 30 days → alert contracting manager.

---

# 10. Status and Workflow Standards

Avoid uncontrolled free-text statuses. Use controlled enums or tenant-configurable master data backed by transition maps.

## 10.1 Lead

```text
NEW → ASSIGNED → CONTACTED → QUALIFIED → QUOTED
→ NEGOTIATION → WON / LOST / DORMANT
```

## 10.2 Booking

```text
DRAFT → HELD → CONFIRMATION_PENDING → CONFIRMED
→ PAYMENT_PENDING → PARTIALLY_PAID → PAID
→ DOCUMENT_PENDING → READY_TO_TRAVEL
→ IN_TRAVEL → COMPLETED → CLOSED
```

Alternatives:

```text
CANCEL_REQUESTED → CANCELLED
REFUND_IN_PROGRESS → REFUNDED
ON_HOLD | DISPUTED
```

## 10.3 Service Order

```text
REQUESTED → SENT_TO_SUPPLIER → OPTIONED/HELD
→ CONFIRMED → DOCUMENTED/VOUCHERED
→ DELIVERED → CLOSED
```

Alternatives:

```text
WAITLISTED | REJECTED | CANCELLED | NO_SHOW | FAILED
```

## 10.4 Supplier Bill

```text
RECEIVED → VALIDATION → DISPUTED/APPROVED
→ SCHEDULED → PARTIALLY_PAID → PAID
```

## 10.5 Payment

```text
INITIATED → PENDING → RECEIVED → ALLOCATED → RECONCILED
```

Alternatives:

```text
FAILED | REVERSED | CHARGEBACK | REFUNDED
```

---

# 11. Data Model Blueprint

## 11.1 Core Platform

- Tenant
- LegalEntity
- Branch
- Department
- Team
- User
- Membership
- Role
- Permission
- ApprovalPolicy
- AuditLog
- Activity
- Notification
- Document
- Setting
- NumberSequence

## 11.2 CRM

- Lead
- LeadSource
- Campaign
- Client
- Traveler
- ClientRelationship
- Passport
- LoyaltyProfile
- CommunicationThread
- Message
- FollowUp
- Task
- Consent

## 11.3 Product

- Destination
- Attraction
- Supplier
- SupplierContact
- SupplierContract
- SupplierRate
- CancellationRule
- InventoryAllotment
- Product
- ProductRate
- Itinerary
- ItineraryDay
- ItineraryItem
- TourPackage
- PackageDeparture
- PackageCostSheet
- PackageCostItem
- PricingRule

## 11.4 Sales and Fulfillment

- Quotation
- QuotationOption
- QuotationRevision
- QuotationLine
- Booking
- BookingTraveler
- ServiceOrder
- AirReservation
- PNR
- AirSegment
- HotelReservation
- TransferReservation
- TourReservation
- VisaCase
- InsuranceReservation
- CruiseReservation
- RailBusReservation
- Ticket
- TicketCoupon
- Voucher
- Manifest
- RoomingList
- OperationAssignment
- Incident

## 11.5 Finance

- Invoice
- InvoiceLine
- Receipt
- Payment
- Allocation
- CreditNote
- DebitNote
- SupplierBill
- SupplierBillLine
- SupplierPayment
- FinancialAccount
- ChartOfAccount
- JournalEntry
- JournalLine
- ExchangeRate
- TaxCode
- Reconciliation
- Commission
- Incentive
- Refund
- Expense
- ExpenseClaim

## 11.6 SaaS

- Plan
- PlanFeature
- Subscription
- TenantEntitlement
- UsageRecord
- PlatformInvoice
- SupportAccessGrant

---

# 12. Data Integrity Rules

1. Use database relations for all important identifiers; avoid storing airline, airport, nationality, supplier, and product references only as strings.
2. Use decimals with explicit precision for money.
3. Store currency on every financial amount.
4. Store exchange-rate snapshots.
5. Store cost and sell snapshots at quotation and booking conversion.
6. Store supplier terms used at time of sale.
7. Never change historical financial records silently.
8. Use reversal entries rather than destructive edits.
9. Soft delete only where legally and operationally appropriate.
10. Protect immutable audit records.
11. Use idempotency keys for external payment and booking actions.
12. Make status transitions transactional.
13. Version quotations, itineraries, terms, and cost sheets.
14. Use optimistic locking/version numbers for sensitive records.
15. Link all documents to their entity and security classification.
16. Retain provider raw payloads for synchronization and dispute evidence.
17. Separate client, payer, and traveler.
18. Separate booking-level status from service-level status.
19. Separate expected, confirmed, and actual cost.
20. Separate internal notes from customer-visible notes.

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

# 22. Implementation Roadmap

## Phase 0 - Stabilize and Document Existing Product

Duration: 2-4 weeks

- Update README
- Produce real module inventory
- Run full test/build/security review
- Verify every UI page against API
- Verify permission-aware navigation
- Document status transitions
- Document schema debt
- Create database backup/restore procedure
- Add error monitoring
- Add queue infrastructure
- Establish product analytics
- Mark incomplete screens honestly

### Exit Criteria

- Clean CI
- Current documentation
- No cross-tenant leak
- Stable release process
- Production configuration checklist
- Known gap register

## Phase 1 - Supplier, Product, Itinerary, and Costing Core

Duration: 6-10 weeks

- Supplier
- Supplier contacts
- Contracts
- Rates
- Cancellation terms
- Destination
- Attraction
- Product catalog
- Itinerary
- Package
- Cost sheet
- Pricing rules
- Quotation options
- Margin approval

### Why First

These capabilities define a tour operation platform and create the commercial foundation for booking profitability.

## Phase 2 - Service Order and Travel Fulfillment

Duration: 8-12 weeks

- Shared service order
- Air/PNR normalization
- Hotel
- Transfer
- Tour/activity
- Insurance
- Visa case
- Voucher
- Service confirmation
- Supplier tasks
- TTL and deadline automation

## Phase 3 - Operations and Group Travel

Duration: 6-10 weeks

- Departures
- Group master
- Manifests
- Rooming lists
- Guide/driver assignment
- Operations board
- Readiness
- Incident and crisis
- Final travel pack
- Customer acknowledgement

## Phase 4 - Finance Completion

Duration: 8-12 weeks

- Supplier bills
- Supplier payments
- AR allocation and aging
- AP aging
- Cash and bank
- Reconciliation
- FX
- Booking profit
- Commission lifecycle
- Double-entry journal or external accounting integration

## Phase 5 - Portals and Channels

Duration: 8-12 weeks

- Customer portal
- B2B agent portal
- Corporate travel portal
- Supplier portal
- Public quote/payment
- Messaging integration
- Payment gateway
- Website package publishing

## Phase 6 - Intelligence, Quality, and Responsible Operations

Duration: continuous

- BI dashboards
- Forecasting
- Workflow engine
- AI assistance
- Quality audits
- Supplier scorecards
- Sustainability indicators
- Accessibility
- Market scenario analytics

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

# 24. Acceptance Criteria

## Lead and Sales

- A lead can be captured, assigned, contacted, qualified, quoted, and converted without losing history.
- SLA breach is visible.
- Duplicate lead warning works.
- Campaign source survives conversion.

## Package and Costing

- A user can build a multi-day itinerary.
- Supplier rates populate a cost sheet.
- Price changes by passenger count and occupancy.
- Discount cannot reduce margin below threshold without approval.
- Published package retains cost/version history.

## Booking

- Accepted quote creates booking and service orders.
- Each service can be confirmed independently.
- Booking readiness reflects payment, documents, and confirmation.
- All changes appear in timeline and audit.

## Air/Ticket

- PNR, segments, TTL, passengers, tickets, and status are stored.
- TTL alert triggers.
- Reissue links old and new ticket.
- Refund calculation and journal impact are traceable.

## Visa

- Checklist is generated from visa type and applicant.
- Every required document has verification status.
- Submission and decision timeline are visible.
- Sensitive documents are protected and audited.

## Finance

- Client payment can be allocated.
- Supplier bill can be matched to booking/service.
- Booking margin updates from actual cost.
- Refund reverses appropriate financial entries.
- Cross-currency transaction preserves rate snapshots.
- Bank/cash reconciliation detects unmatched items.

## Security

- Cross-tenant access fails.
- Branch restrictions work.
- Privileged action requires permission.
- Sensitive download is logged.
- User cannot approve own restricted transaction.
- Payment retry does not duplicate receipt.

---

# 25. Testing Strategy

## Unit Tests

- Costing
- Pricing
- Status transitions
- Permission evaluation
- Currency conversion
- Refund/reissue calculation
- Readiness score
- Commission rules

## Integration Tests

- Database relations
- Tenant isolation
- Storage
- Queue
- Payment idempotency
- Webhooks
- Supplier integration adapters

## End-to-End Tests

1. Lead → quote → booking → payment → ticket → completion
2. Package → departure → group → rooming → vouchers
3. Visa case → checklist → submission → decision
4. Supplier bill → approval → payment → booking profit
5. Reissue
6. Refund
7. Corporate approval
8. B2B credit booking
9. Customer document upload
10. Cross-tenant security attempt

## Quality Tests

- Accessibility
- Mobile usability
- Slow network
- Localization
- PDF/document output
- Browser compatibility
- Large dataset
- Export
- Backup restore
- Disaster recovery

---

# 26. Observability and Operations

## Metrics

- API latency/error
- Queue delay
- Integration failure
- Webhook failure
- Payment mismatch
- Storage failure
- Database health
- Tenant usage
- Notification delivery
- OCR/AI error
- Background-job retries

## Business Alerts

- TTL
- Overdue payment
- Supplier confirmation delay
- Contract expiry
- Passport expiry
- Visa deadline
- Departure not ready
- Negative margin
- Refund aging
- Credit-limit breach
- Cash variance
- Unreconciled payment

## Logging

- Correlation ID
- Tenant ID
- User ID
- Entity reference
- No sensitive content
- Structured log
- Retention policy

---

# 27. Data Migration and Import

Support imports for:

- Clients
- Leads
- Suppliers
- Contracts/rates
- Products
- Bookings
- Invoices
- Payments
- Opening balances
- Employees
- Documents

## Import Workflow

```text
UPLOAD → MAP → VALIDATE → PREVIEW → APPROVE
→ IMPORT → ERROR REPORT → RECONCILE
```

Requirements:

- Tenant isolation
- Duplicate detection
- Row-level errors
- Rollback or compensating cleanup
- Audit
- Import batch ID
- Dry run
- Template download

---

# 28. Documentation Required in the Repository

Create and maintain:

- `README.md`
- `docs/PRODUCT_VISION.md`
- `docs/CAPABILITY_MATRIX.md`
- `docs/DOMAIN_GLOSSARY.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/STATUS_TRANSITIONS.md`
- `docs/PERMISSIONS.md`
- `docs/INTEGRATIONS.md`
- `docs/SECURITY.md`
- `docs/DEPLOYMENT.md`
- `docs/OPERATIONS_RUNBOOK.md`
- `docs/RELEASE_CHECKLIST.md`
- `docs/TEST_STRATEGY.md`
- `docs/ROADMAP.md`
- Architecture Decision Records under `docs/adr/`

---

# 29. Immediate Recommended Backlog

## P0

1. Update README to reflect implemented modules.
2. Add capability matrix.
3. Validate current schema and all migrations.
4. Confirm current pages are permission-protected.
5. Add supplier domain.
6. Add supplier contract/rate domain.
7. Add service-order architecture.
8. Add itinerary and cost-sheet domain.
9. Decide accounting boundary.
10. Add durable queue and scheduled jobs.

## P1

1. Hotel service
2. Transfer service
3. Visa case/checklist
4. Tour/activity service
5. Package/departure
6. Supplier bill/AP
7. Booking profitability
8. Departure control
9. Customer portal
10. Messaging integration

## P2

1. GDS/NDC connector framework
2. B2B agent
3. Corporate travel
4. Supplier portal
5. Group operations
6. Quality and sustainability
7. Advanced BI
8. AI assistance

---

# 30. Final Product Positioning

The strongest positioning is:

> A complete, multi-branch Travel Business Operating System that connects customer acquisition, package design, booking fulfillment, visa and ticket operations, supplier control, finance, and post-travel service in one auditable platform.

Avoid positioning it only as:

- CRM
- ERP
- Ticketing software
- Visa software
- Tour package website
- Accounting tool

The differentiator is the connected operational chain.

---

# Appendix A - Source-to-Feature Mapping

| Source Theme | Platform Implication |
|---|---|
| Travel agent as adviser and intermediary | CRM, knowledge base, communication, supplier liaison |
| Tour operator as package builder | Package, itinerary, contracting, costing, capacity |
| Reservations and documentation | Service orders, PNR, visa, document vault |
| Package costing and pricing | Cost sheet, markup, margin, break-even |
| Travel distribution systems | GDS/NDC/bedbank/agent integration |
| Daily agency operations | Tasks, deadlines, settlement, customer communication |
| Market research and segmentation | Campaign, source market, product analytics |
| Financial planning and risk | AR/AP, cash, profit, forecast, incident |
| Technology and ICT readiness | Mobile-first, digital payments, integrations, automation |
| Workforce and training | HR, skills, quality, performance |
| Sustainable tourism | Local impact, environment, culture, quality, community |
| Destination planning | Destination knowledge, capacity, supplier ecosystem |
| Quality standards | Checklists, audits, supplier scorecards, service gates |
| LDC/local development | Local supplier spend, jobs, SMEs, inclusion |
| Market rankings and visitor behavior | Source-market analytics and scenario planning |

---

# Appendix B - Key Design Decisions Still Required

1. Full accounting vs operational sub-ledger plus accounting integration
2. Primary deployment region and data residency
3. First GDS/NDC/air consolidator integration
4. First hotel supplier integration
5. Payment providers
6. Messaging providers
7. OCR/identity provider
8. Customer portal authentication
9. B2B credit model
10. SaaS pricing and entitlements
11. Default travel vertical for first production launch
12. Legal/tax configuration by country
13. Data retention periods
14. AI provider and sensitive-data policy
15. Offline/PWA scope for field operations
16. Public website and booking-engine scope

---

# Appendix C - Definition of Done for “Complete Travel Operation Platform”

The platform may be described as complete only when a company can:

1. Capture a lead.
2. Understand the requirement.
3. Build an itinerary.
4. Source suppliers.
5. Calculate cost and price.
6. Send and revise quotation.
7. Receive acceptance and payment.
8. Create service-specific reservations.
9. Manage PNR, visa, hotel, transfers, and activities.
10. Issue tickets and vouchers.
11. Control departure readiness.
12. Support the traveler during the trip.
13. Manage refund, cancellation, or reissue.
14. Collect client dues.
15. pay suppliers.
16. calculate final profit.
17. audit every decision.
18. report performance.
19. protect sensitive data.
20. operate across branches, teams, and channels.
21. improve quality and responsible-tourism outcomes.

Until these are connected end to end, the product remains a strong foundation rather than the final operating system.
