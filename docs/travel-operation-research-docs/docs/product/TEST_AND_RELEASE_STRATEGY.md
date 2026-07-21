# Travel Operation Test and Release Strategy

A module is not complete until its business rules, tenant isolation, permissions, transitions, financial effects, audit trail, and end-to-end workflow are tested.

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
