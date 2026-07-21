# ZATRA360 — MULTI-SERVICE TRAVEL BUSINESS WORKFLOW IMPLEMENTATION PROMPT

> Stored reference prompt. Target repo: this monorepo (github.com/zatra360/travel-operation).
> Approach mandated: read-only audit FIRST, then phased implementation with small logical commits.

Act as a principal SaaS architect, senior NestJS engineer, senior Next.js engineer, PostgreSQL and Prisma architect, travel-industry domain expert, enterprise UX designer, security specialist and QA lead.

Audit, design and implement a production-grade **Service Operations and Workflow Engine** for ZATRA360.

Initial travel service categories (system codes are immutable):

`AIR_TICKET, VISA, HOTEL, TOUR, INSURANCE, TRANSFER, UMRAH, HAJJ, MEDICAL_TOURISM, STUDENT_VISA, MANPOWER, CRUISE`

Not twelve disconnected applications — ONE reusable operational framework where every service has its own: intake form, workflow, stages, statuses, documents, checklists, tasks, SLA rules, assignment rules, suppliers, quotations, bookings/applications, payments, approvals, communications, automation, reporting, analytics, AI recommendations, audit trail, activity timeline. Modular, tenant-aware, branch-aware, API-first, RBAC-controlled, auditable, responsive, scalable.

---

## 1. START WITH A READ-ONLY REPOSITORY AUDIT

Inspect the entire repo (root workspace, apps/web, apps/api, packages/database|types|validators|permissions, Prisma schema/seeds/migrations, lead/client/quotation/booking/ticket/document/activity/audit/notification/finance/refund/reissue/cancellation modules, frontend navigation, form components, API/DTO conventions, tenant+branch context, tests/build commands).

Before editing, produce: (1) current architecture summary, (2) reusable functionality, (3) data-model limitations, (4) workflow gaps, (5) frontend gaps, (6) API gaps, (7) RBAC gaps, (8) audit/activity gaps, (9) migration risks, (10) implementation plan, (11) exact files to create/modify. Do not duplicate existing capabilities. Preserve repository patterns.

## 2. CORE ARCHITECTURAL PRINCIPLE

Hierarchy: Customer/Organization → Lead → **Operational Case** → **One or More Service Items** → Service-Specific Workflow → Quotation → Approval → Booking/Application/Reservation → Payment & Invoice → Service Delivery → After-Sales → Reconciliation → Closure.

One case may contain multiple connected services (e.g. Student Journey Case: University Application + Student Visa + Insurance + Air Ticket + Hotel + Transfer). Each service item keeps its own service type, workflow, assignee, team, branch, stage, status, priority, SLA, documents, checklist, supplier, revenue/cost/profit, payment status, dates, timeline, audit. Never duplicate the customer/lead/parent-case per service.

## 3. SERVICE TYPE MASTER

Replace free-text service strings ("Air ticket", "air-ticket", "AIR", "Flight"…) with a configurable **ServiceType** master:
`id, tenantId?, systemCode, displayName, slug, description, icon, category, displayOrder, isSystem, isEnabled, isPublic, supportsLead/Quotation/Booking/Application/Ticketing/Supplier/Invoice/Payment/AfterSales, defaultCurrencyCode, defaultWorkflowTemplateId, defaultSlaPolicyId, configuration JSON, timestamps, deletedAt`.

Tenant admins can: enable/disable, rename, re-icon, reorder, set default teams/branches/workflows, SLA rules, required documents, custom fields, quotation templates, numbering formats, approval requirements, commission rules, automation rules. System codes stay stable. Provide a safe migration + compatibility strategy for existing string data.

## 4. OPERATIONAL CASE AND SERVICE ITEM

**ServiceCase**: `id, tenantId, branchId, caseNumber, leadId, clientId, title, caseType, status, priority, assignedToId, ownerId, teamId, source, expectedRevenue, currencyCode, openedAt, dueAt, completedAt, closedAt, closureReason, metadata, createdById, updatedById, timestamps, deletedAt`.

**ServiceCaseItem**: `id, tenantId, branchId, serviceCaseId, serviceTypeId, referenceNumber, workflowInstanceId, currentStageId, status, priority, assignedToId, ownerId, teamId, supplierId, startDate, targetCompletionDate, completedAt, serviceAmount, supplierCost, taxAmount, discountAmount, grossProfit, currencyCode, slaDueAt, slaStatus, metadata, createdById, updatedById, timestamps, deletedAt`.

Relational columns for searchable/reportable fields; JSON only for genuinely service-specific metadata.

## 5. CONFIGURABLE WORKFLOW ENGINE

Models: `WorkflowTemplate, WorkflowStageTemplate, WorkflowTransitionRule, WorkflowInstance, WorkflowStageInstance, WorkflowStatusHistory, WorkflowChecklistTemplate, WorkflowChecklistItem, WorkflowTask, WorkflowApproval, WorkflowSlaPolicy, WorkflowEscalationRule`.

Stage supports: code, name, description, order, responsible role/team, entry rules, exit requirements, required documents/checklist items/approvals, SLA duration, automation (entry / before deadline / on breach), notification rules, allowed next stages, reopen rules, completion rules.

**Transitions validated server-side** — frontend manipulation cannot skip mandatory stages/documents/payments/approvals. Every transition creates: status history, activity entry, audit record, SLA calculation, notification, analytics event. Support standard + tenant-customized templates; system templates versioned; existing cases keep their started version unless authorized migration.

## 6. SHARED BUSINESS LIFECYCLE

Common lifecycle (services use applicable subset): Enquiry → Lead Created → Qualified → Requirements Collected → Case Created → Quotation Prepared → Sent → Customer Approval → Deposit/Credit Approval → Application/Reservation/Booking → Processing → Final Payment → Delivery → After-Sales → Supplier Reconciliation → Feedback → Closure.

Standardized reporting stage groups: Intake, Qualification, Quotation, Documentation, Processing, Approval, Booking, Payment, Delivery, After-sales, Closure.

## 7–18. SERVICE-SPECIFIC DEFAULT WORKFLOWS (summaries)

**AIR TICKET (18 stages)**: Enquiry → Requirements → Flight Search → Options → Fare Rules Verified → Quotation Sent → Option Selected → Passenger Details → PNR Created → TTL Recorded → Payment/Credit Pending → Approved → Final Fare Verification → Ticket Issued → Invoice → Delivered → Travel Completed → Closed. Data: origin/destination/sectors, dates, trip type, pax, cabin, airline, baggage, transit, GDS/supplier, fare basis, base fare/taxes/service fee/markup/commission/selling price, PNR, airline locator, TTL, ticket number, fare conditions, refundability, change/no-show fees. Integrate existing quotation/booking/passenger/segment/ticket/payment/invoice/refund/reissue/cancellation models — do NOT duplicate. After-sales: void, refund, reissue, schedule change, name correction, waiver, ADM. **Blocking rules**: no issue without passenger-name verification; no issue after TTL expiry without revalidation; no issue without payment or authorized credit; issuance idempotent; duplicate ticket numbers prevented per tenant. Analytics: enquiry-to-quote, quote-to-PNR, PNR-to-ticket times, accuracy, void/refund/reissue rates, profit per ticket, supplier performance.

**VISA (21 stages)**: Enquiry → Destination/Type → Eligibility → Scope/Fees → Agreement → Case Opened → Checklist Generated → Docs Requested/Received/Verified → Correction → Application Prepared → QA Review → Appointment/Biometrics → Submitted → Embassy Processing → Additional Docs → Decision → Passport Collection → Delivered → Closed. Document lifecycle: Requested → Received → Under Review → Correction Required → Resubmitted → Verified → Submitted. **Never guarantee visa approval**; AI assessments labelled operational guidance. Analytics: conversion, doc completion time, correction frequency, turnaround, approval trends, country performance, profitability.

**HOTEL (18 stages)**: Enquiry → Requirements → Supplier Search → Options → Quotation → Selection → Guest Info → Recheck → Payment → Booking Requested → Supplier Confirmed → Voucher Generated/Delivered → Reconfirmation → Check-in → Check-out → Reconciliation → Closed. After-sales: date/name amendment, upgrade, cancellation, no-show, refund, dispute. Analytics: conversion, confirmation time, cancellation rate, margin/room-night.

**TOUR (24 stages)**: Enquiry → Requirements → Type → Draft Itinerary → Supplier Costing → Package Costing → Quotation → Revision → Final Itinerary → Deposit → Reservations (Hotel/Transport/Activities/Guide confirmed) → Final Payment → Travel Docs → Briefing → In Progress → Daily Ops → Completed → Reconciliation → Feedback → Closed. Reusable itinerary structures (day/destination/accommodation/transport/activities/meals/guide/inclusions/exclusions/notes). Costing: multi-supplier, multi-currency, taxes, markup, commission, contingency, discount, per-person/child/group pricing, single supplement.

**INSURANCE (16)**: Enquiry → Details → Policy Compare → Coverage Explained → Quotation → Selected → Declarations → Verified → Payment → Policy Requested/Issued/Delivered → Amendment → Claim Assistance → Reconciliation → Closed. Not final claims decision-maker.

**TRANSFER (20)**: Request → Pickup/Drop-off → Route → Vehicle → Supplier Availability → Quotation → Confirmation → Payment → Supplier/Vehicle/Driver Assigned → Passenger Notified → Dispatched → Arrived → Picked Up → In Progress → Completed → Extra Charges → Reconciliation → Closed. Exceptions: flight delay, no-shows, breakdown, replacement, route change, waiting time.

**UMRAH (26)**: Enquiry → Package → Family/Group Booking → Pilgrim Profiles → Docs → Deposit → Visa → Flight Reserved/Issued → Makkah/Madinah Hotels → Ground Transport → Room Allocation → Group/Bus Assignment → Final Payment → Orientation → Docs Delivered → Departed → Saudi Ops → Return → Reconciliation → Closed. Supports individuals/families/groups, room sharing, group leaders, buses, batches, Ziyarah.

**HAJJ (31)**: adds pre-registration, eligibility, official registration, quota verification, agreement, government processing/payments, Mashair arrangement, training, airport reporting, Mina/Arafat/Muzdalifah ops. Jurisdiction-specific steps configurable, not hard-coded. Incident management: missing pilgrim, medical, transport, accommodation, document, emergency.

**MEDICAL TOURISM (24)**: Enquiry → **Patient Consent** → Medical Docs → Completeness → Hospital/Doctor Matching → Secure Case Share → Preliminary Opinion → Estimate → Proposal → Selection → Deposit → Appointment → Medical Visa → Travel Arranged → Coordination → Arrival → Admission → Treatment → Discharge → Follow-up → Return → Reconciliation → Secure Closure. Security: explicit consent before sharing, strict document access control, sensitive-data audit logging, encryption, configurable retention, secure deletion/anonymization, no medical diagnosis by platform.

**STUDENT VISA (32)**: Enquiry → Academic Profile → Assessment → Counselling → Preferences → Agreement → Checklist → Docs → Institution Shortlist → Approval → Applications → Conditional Offer → Conditions Fulfilled → Unconditional Offer → Selected → Tuition Deposit → Enrolment Doc → Visa Checklist → Financial Review → Application Prepared → QA → Submitted → Biometrics/Medical/Interview → Decision → Accommodation/Insurance/Ticket → Briefing → Arrived → Enrolment Confirmed → Commission Tracked → Closed. Institution terminology configurable (offer letter, LOA, CAS, COE...). Configurable country/institution/intake/programme masters.

**MANPOWER (32)**: Employer Lead → Verification → Demand Docs → Job Order → Regulatory Review → Vacancy Approved/Published → Candidate Registration → Docs → Screening → Interview → Trade Test → Employer Interview → Selected → Contract → Medical → Police Clearance → Training → Visa → Government Processing → Insurance/Welfare → Payment Review → Ticket → Briefing → Deployed → Handover → Probation Follow-up → Support → Reconciliation → Closed. Separate entities: Employer, Demand/JobOrder, Vacancy, Candidate, Application, Interview, TradeTest, Selection, Medical, Contract, Visa, Clearance, Deployment, Incident. Compliance: legitimacy verification, transparent fees, candidate consent, contract-version preservation, regulatory audit trail, **no discriminatory automated selection**, no hidden charges.

**CRUISE (26)**: Enquiry → Requirements → Sailings → Itinerary/Cabin Compare → Visa Review → Quotation → Selected → Passenger Info → **Cabin Held + Hold Expiry** → Deposit → Confirmed → Flights/Hotel/Transfer → Insurance → Visa → Final Payment Reminder/Received → Online Check-in → Documents → Baggage Tags → Verification → Embarkation → Completed → Reconciliation → Closed.

## 19. CHECKLIST AND DOCUMENT ENGINE

Models: `DocumentRequirementTemplate, ServiceDocumentRequirement, CaseDocument, DocumentVerification, DocumentVersion, DocumentExpiry, DocumentAccessLog`. Fields: type, service type, country, visa type/programme, required/optional, traveller type, status, requested/received/verified/expiry dates, rejection reason, correction instructions, uploader, verifier, version, secure storage key, access classification. Statuses: `REQUESTED, RECEIVED, UNDER_REVIEW, CORRECTION_REQUIRED, RESUBMITTED, VERIFIED, SUBMITTED, EXPIRED, REJECTED, ARCHIVED`. Use existing R2 storage abstraction; never permanent public URLs.

## 20. QUOTATION ARCHITECTURE

Extend existing quotations. Multi-service quotations (one quote = ticket + hotel + insurance + transfer sections). Each line: service type, supplier, description, qty, net cost, tax, markup, commission, discount, selling price, currency, exchange rate, cancellation rules, terms, validity, metadata, sort order. Maintain revisions, snapshot history, approvals, sent/viewed/accepted/rejected timestamps, expiry, conversion into case items/bookings. Never overwrite an accepted revision without preserving its snapshot.

## 21. SUPPLIER MANAGEMENT

Extend suppliers for: airlines, GDS, consolidators, hotels, DMCs, tour operators, transport, insurers, visa facilitators, hospitals, universities, employers, recruitment partners, cruise lines, guides, attractions. Relationship: contract, currency, credit limit, payment terms, commission, markup rules, contacts, locations, performance score, complaints, reconciliation status, active/blocked. Multi-supplier per case (tours/Umrah/Hajj/medical).

## 22. TASKS, SLA AND AUTOMATION

Auto task creation, due dates, assignment, reassignment, escalation, reminders, dependencies, approval tasks, completion evidence, reopening. Example automations: TTL approaching, visa doc missing, hotel reconfirm before check-in, tour supplier unconfirmed, policy expiry, driver not accepted, unpaid instalment, hospital opinion delayed, application deadline, medical/visa delays, cruise final payment. Tenant-configurable; all automated actions auditable.

## 23. EVENT AND TIME ANALYTICS

Events: service_case_created, service_item_created, workflow_stage_entered/completed, workflow_transition_blocked, document_requested/received/verified, quotation_created/sent/accepted, supplier_requested/confirmed, payment_received, approval_requested/completed, booking_confirmed, application_submitted, service_delivered, after_sales_requested, case_completed/closed. Include tenant/branch/user/team/serviceType/case/item/workflow/stage/quotation/booking/client/lead/supplier ids, timestamp, active+waiting durations, result, source, correlation ID. Never click-count-only performance measures.

## 24. AI READINESS

Clean structures for: lead scoring, smart assignment, SLA breach prediction, missing-doc detection, supplier recommendation, conversion/workload/demand/cancellation/profitability prediction, duplicate detection, bottleneck detection. Requirements: human approval for consequential decisions, explainability, confidence, input factors, accept/reject feedback, model versioning, audit, bias monitoring; no auto employment rejection / visa guarantee / medical diagnosis / discriminatory selection. No fake AI placeholders.

## 25. RBAC

Following existing MODULE_ACTION architecture, add permissions for: service_types (read/manage), service_cases (create/read/update/assign/close/reopen/export), service_items (create/read/update/assign/complete/cancel), workflows (read/manage/publish/migrate), workflow_tasks (read/create/assign/complete/reopen), workflow_approvals (request/approve/reject), service_documents (read/upload/verify/reject/download/delete), service_financials (read/manage/approve), service_reports (read_own/team/branch/tenant/export). Branch/team constraints on sensitive permissions. Medical, candidate, financial and passport data need stronger control.

## 26. API REQUIREMENTS

REST under existing conventions: `/api/v1/tenant/service-types|service-cases|service-case-items|workflow-templates|workflow-instances|workflow-tasks|workflow-approvals|service-documents|service-reports`. Endpoints: list enabled types, create case, add items, start workflow, read available transitions, perform transition, complete checklist items, upload/verify documents, assign, request/approve/reject approvals, timelines, SLA status, financial summaries, close/reopen, dashboards. With: DTO validation, Swagger, tenant isolation, branch auth, permission guards, pagination/filtering/sorting/search, idempotency for critical actions, transactional integrity, consistent errors, audit + activity.

## 27. FRONTEND AND UX

Reusable **Service Selector**: search, responsive card grid, icons, selected state, keyboard nav, touch targets, recent/frequent services, tenant-enabled filtering, permission-aware, optional multi-select. NOT a plain vertical text list. Pages: service dashboard, all/my/team cases, case details, item details, workflow timeline, checklist, documents, tasks, approvals, quotations, suppliers, payments, activity, audit. Case detail: header (case number, customer, service, status, priority, assignee, SLA, actions) + tabs (Overview, Workflow, Tasks, Documents, Quotation, Booking, Finance, Communication, Activity, Audit). Visible workflow stepper distinguishing completed/current/blocked/overdue/upcoming stages. Show WHY a transition is blocked (e.g. "Cannot submit visa application: 2 mandatory documents are not verified."). Never fail silently.

## 28. MOBILE-FIRST

All key workflows on mobile: create lead/case, select services, update stages, tasks, upload/verify docs, contact customers, quotation status, record payments, deadlines, checklists. Responsive cards, drawers, bottom sheets, progressive disclosure — not wide tables.

## 29. DATABASE AND MIGRATION SAFETY

Prisma migrations, non-destructive. Service-string migration: identify usages → create normalized records → add nullable relational fields → backfill known values → preserve unknown in metadata → update reads/writes → validate → only then deprecate strings. Safe for existing leads/quotations/lines/bookings/tickets/payments/invoices/documents/activities. Index: tenantId, branchId, serviceTypeId, serviceCaseId, currentStageId, status, assignedToId, teamId, slaDueAt, createdAt, completedAt. tenantId everywhere; branchId where applicable; soft deletion.

## 30. AUDIT AND ACTIVITY

Use existing foundations. Audit: case creation, assignment, transitions, document access/verification, approvals, financial changes, supplier changes, closure/reopen, template publication, workflow migration. Activity readable by operations; audit contains technical/compliance detail; sensitive metadata restricted.

## 31. REPORTING

Foundations for: lead volume, active/completed cases, conversion, response/processing/stage-waiting time, SLA compliance, employee/team/branch workload, revenue/cost/gross profit, outstanding payment, supplier liability, cancellation/refund/reissue, document correction, satisfaction, supplier performance. Filters: date, service, branch, team, employee, country, destination, supplier, stage, status, source, currency. DB aggregation, not in-memory loading.

## 32. TESTING

Tenant isolation, branch access, RBAC, case creation, multi-service cases, workflow start, valid/invalid transitions, mandatory document/checklist/approval/payment blocking, SLA calc, assignment, closure/reopen, audit/activity creation, migration backfill, quotation conversion, air-ticket TTL, visa document lifecycle, hotel cancellation deadline, tour multi-supplier costing, medical-document access, manpower candidate/employer separation, cruise hold expiry. Run typecheck, lint, API tests, build, prisma validate, migration verification. Never claim completion with failing builds/tests.

## 33. IMPLEMENTATION PHASES

1. **Audit & Architecture** — repo audit, proposed schema, workflow architecture, migration plan, UI IA
2. **Shared Foundation** — ServiceType master, ServiceCase, ServiceCaseItem, workflow templates/instances, transitions, tasks, checklists, approvals, SLA engine
3. **Integration** — leads, clients, quotations, documents, activities, audits, notifications, payments, invoices, suppliers
4. **Initial Workflows** — Air Ticket, Visa, Hotel, Tour (validate architecture first)
5. **Extended Workflows** — Insurance, Transfer, Umrah, Hajj, Medical Tourism, Student Visa, Manpower, Cruise
6. **Dashboards & Reporting** — service/SLA/workload dashboards, financials, supplier performance, bottlenecks
7. **Automation & Intelligence** — reminders, escalations, assignment rules, TTL/deadline alerts, analytics events, AI-ready feedback

## 34. ACCEPTANCE CRITERIA

All 12 service types as structured master data; tenant-configurable; multi-item cases; independent per-item workflows; server-side transition validation; documents/approvals block transitions; SLA calculated; existing CRM/quotation/booking/finance unaffected; strings migrated safely; tenant isolation; branch/team permissions; activity+audit records; responsive UIs; Air Ticket/Visa/Hotel/Tour fully functional; remaining services on same architecture; actionable dashboards; sensitive data protected; idempotent critical APIs; safe reproducible migrations; tests pass; production build passes; documentation updated.

## 35. REQUIRED OUTPUT PER PHASE

Report: inspected, implemented, files created/modified, DB changes, migration name, endpoints added, UI routes added, permissions added, tests added, commands executed, build/test results, known limitations, recommended next phase. Edit the repository incrementally with small logical commits.
