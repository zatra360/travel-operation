# Travel Operation Security and Non-Functional Requirements

These requirements apply to every tenant, branch, module, portal, integration, file, background job, report, and export.

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
