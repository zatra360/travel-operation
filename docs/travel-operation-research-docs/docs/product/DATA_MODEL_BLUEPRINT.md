# Travel Operation Data Model Blueprint

This document defines the target entity families and integrity rules. It is a design guide, not a drop-in Prisma migration.

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
