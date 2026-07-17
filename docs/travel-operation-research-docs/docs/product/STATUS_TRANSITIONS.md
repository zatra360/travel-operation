# Travel Operation Status Transitions

This document establishes lifecycle standards for the major travel workflows.

## Workflow Governance Rules

1. Statuses must be controlled enums or governed master data, not unrestricted strings.
2. Every workflow must have an explicit transition map.
3. Invalid transitions must fail inside a database transaction.
4. Terminal states must prevent accidental reopening unless an authorized restoration transition exists.
5. Sensitive transitions must require permission and, where configured, approval limits.
6. Every transition must write a status log, activity timeline entry, and audit record.
7. Customer-facing status may differ from internal operational status.
8. Booking status must not hide service-level failures.
9. Financial status must not be inferred only from operational status.
10. Reversal workflows must preserve history rather than deleting the original transaction.

## Package Lifecycle

```text
IDEA → RESEARCH → COSTING → INTERNAL_REVIEW → CONTRACTED
→ READY_FOR_SALE → ON_SALE → STOP_SALE → OPERATING
→ COMPLETED → REVIEWED → ARCHIVED
```

---

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
