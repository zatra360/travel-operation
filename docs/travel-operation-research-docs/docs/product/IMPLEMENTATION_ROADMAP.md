# Travel Operation Implementation Roadmap

The repository should be extended rather than restarted. Delivery should prioritize the missing foundations that make a travel system operationally complete: suppliers, contracts, rates, products, itinerary, costing, service orders, fulfillment, operations, settlement, and profitability.

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
