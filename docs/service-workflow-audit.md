# ZATRA360 Service Operations & Workflow Engine — Phase 1 Repository Audit

> Deliverable for `docs/prompts/zatra360-service-workflow-prompt.md` §1.
> Read-only audit performed 2026-07-16. No code was modified.

---

## 1. Current Architecture Summary

**Monorepo** (pnpm workspaces): `apps/api` (NestJS 10 modular monolith, ~45 feature modules), `apps/web` (Next.js 15 app router, shadcn-style UI), `packages/database` (Prisma 6 + PostgreSQL, single `schema.prisma`, 24 migrations), `packages/permissions` (MODULE_ACTION registry), `packages/types` (PaginatedResult/ApiResult/TenantContext), `packages/validators` (regex validators), `packages/config`.

**Cross-cutting conventions**:
- Tenant isolation: `X-Tenant-Id`/`X-Branch-Id` headers → `TenantGuard` → `TenantContext { tenantId, branchId?, userId }` via `@TenantCtx()`; membership validated against `UserTenantMembership`/`UserBranchMembership`. `enforceBranchScope()` utility for queries.
- RBAC: `@RequirePermissions('MODULE_ACTION')` + `PermissionsGuard` resolving `UserRoleAssignment → RolePermission → Permission` (branch-scoped assignments supported). 38 modules × 5 actions seeded.
- Status transitions: central `common/utils/status-transitions.ts` map per document type (lead/quotation/booking/ticket/invoice/payment/expense/refund/reissue/cancellation) — validated in services, **hard-coded, not configurable**.
- Audit: `AuditLog` (operational, per-module `audit.logMutation`) + hash-chained append-only `SystemAuditLog` (accounting foundation, `fn_append_audit_log`).
- Activity: `Activity` model + `ActivityService.logEntityEvent` → per-entity `/timeline` endpoints.
- Documents: R2 presigned two-step upload (`/documents/upload-url` → PUT → `/documents`), polymorphic `entity`/`entityId`, sensitive-category download auditing.
- Notifications: `Notification` (IN_APP) + Resend email via `EmailService`; no template engine.
- Numbering: `NumberGeneratorService` = `PREFIX-YYMMDD-random6` (retry-on-collision, **not gapless**); accounting has a separate transactional gapless `DocumentNumberCounter` (`fn_allocate_document_number`).
- Accounting foundation (Phases 1–4, implemented): double-entry ledger with DB posting functions, GL bridge, reconciliation, risk alerts, idempotency (`IdempotencyRecord`).
- Web: plain `api.ts` fetch wrapper + `useState`/`useEffect` (react-query provider mounted but unused), zustand `auth-store`/`timer-store`, sonner toasts, `DataTable` with `mobileCard` support, permission-filtered collapsible sidebar (9 groups, ~55 routes).

## 2. Existing Functionality to Reuse (do NOT rebuild)

| Prompt requirement | Existing asset | Notes |
|---|---|---|
| Lead intake (§2, §6) | `Lead` (100+ fields incl. `serviceType`, SLA: `slaDueAt/slaStatus/slaBreached`, auto-assign, temperature, follow-up automation) | Attach cases to leads via `leadId` |
| Quotation (§20) | `Quotation` + `QuotationLineItem(serviceType, buyRate, vendorId, airline/airport refs)` + `QuotationRevision` (JSON snapshots) + `QuotationSign` (e-sign) + public hash share + send/accept/reject/reopen + `convertToBooking`/`convertToInvoice` | Already multi-service via line items; revisions never overwritten ✓ |
| Booking/reservation (§7, §9) | `Booking(holdExpiresAt ← TTL!, pnrLocator)` + `BookingPassenger` + `BookingSegment` (FLIGHT **and** HOTEL fields: hotelName/confirmation/checkIn/checkOut/roomType/mealPlan) + `BookingStatusLog` + `TourItineraryDay` (day/hotel/meals/transfers/guide) | Segments cover air+hotel; itinerary covers tour §10 |
| Ticketing (§7) | `Ticket` with `@@unique([tenantId, ticketNumber])` ✓, issue/void/refund + `TicketLifecycleEvent` + booking status sync + commission creation | Duplicate ticket numbers already structurally prevented |
| After-sales (§7) | `RefundRequest`/`ReissueRequest`/`CancellationRequest` with request→review→approve→process flows, ledger + GL integration | |
| Suppliers (§21) | `Vendor(vendorType: AIRLINE/HOTEL/TRANSPORT/VISA_PROCESSOR/TOUR_OPERATOR/INSURANCE/GDS/OTHER, creditLimit, paymentTerms, commissionPct, gdsProvider)` | Needs: more types, performance score, reconciliation status, contacts |
| Documents (§19) | `Document` + R2 presigned + hash + sensitive auditing; client `ClientPassport`/`ClientVisa` | Needs: requirement templates + verification lifecycle |
| Checklists (§5) | `TaskChecklist` (task-level) | Pattern only; workflow checklists needed |
| Payments/invoices (§2) | Invoice/Payment/Receipt + GL posting bridge + idempotency | |
| Audit/activity (§30) | `AuditLog`, `SystemAuditLog` (hash chain), `Activity` | Wire workflow events into both |
| SLA (§22) | `SlaService` (lead stages, 48h rules), lead SLA UI badges | Generalize into `WorkflowSlaPolicy` |
| Risk/automation (§22) | `FinancialRiskAlert` + review workflow; follow-up auto-scheduling | Pattern for workflow escalations |
| Insurance records (§11) | `insurances` module + model exists | Link to case items |
| Master data (§3) | `service-type` lookup category already seeds **exactly the 12 system codes + OTHER** with icons | Basis for ServiceType backfill |
| Gapless numbering | Accounting `fn_allocate_document_number` | Reuse for case numbers (`CASE-FY-000001`) |

## 3. Data-Model Limitations

1. **`serviceType` is a free `String?` in 5 models** — `Lead`, `QuotationLineItem`, `ServiceItem`, `OrderItem`, `InvoiceLine` — with **three conflicting value sets**:
   - master-data seed + web `SERVICE_TYPES`: `AIR_TICKET, VISA, HOTEL, TOUR, INSURANCE, TRANSFER, UMRAH, HAJJ, MEDICAL_TOURISM, STUDENT_VISA, MANPOWER, CRUISE, OTHER` (13)
   - API quotation DTO `@IsIn`: `FLIGHT, HOTEL, VISA, INSURANCE, TRANSFER, TOUR, PACKAGE, OTHER` (8 — rejects `UMRAH`, `AIR_TICKET`…)
   - seeded data contains legacy `'FLIGHT'` (seed.ts InvoiceLine)
2. **No ServiceType master** — lookups are generic `MasterDataValue` rows without enable flags, capability flags, default workflow/SLA/team config.
3. **No case/workflow models** — `Lead.workflowStage` is a free string; no templates, stages, instances, transitions, history, approvals, escalations, SLA policies.
4. **Naming collision risk**: helpdesk `Case/CaseReply/CaseChannel/CaseType/CaseGroup` models exist (schema-only, **no backend module**, but `/cases` web route exists). New models must be `ServiceCase`/`ServiceCaseItem` and routes `/service-cases` to avoid collision.
5. **No `Team` model** — only `Lead.teamId String?` free text, unindexed, no FK.
6. **Documents lack lifecycle** — no requirement templates, no REQUESTED→VERIFIED state machine, no versioning, no expiry tracking, no per-document access log (only sensitive-category download audit).
7. `NumberGeneratorService` is random-suffix (fine for ops docs; statutory gapless exists only in accounting).
8. `Vendor` lacks: hospital/university/employer/recruitment/cruise/DMC/guide types, performance score, complaint link, reconciliation status, contact persons.

## 4. Workflow Gaps
No workflow engine of any kind. Transitions are hard-coded per document in `status-transitions.ts`; no per-tenant customization, no versioning, no stage-level requirements (documents/checklist/approval/payment), no blocking-rule engine, no stage SLA, no escalation rules, no reporting stage groups.

## 5. Frontend Gaps
- Service selection = plain `<Select>` dropdowns (lead form, quotation line items) — no card-grid Service Selector (§27).
- No reusable stepper/workflow-timeline component (activity timeline is copy-pasted inline in 7 detail pages).
- No case list/detail pages, no workflow tab UI, no checklist UI, no document-verification UI.
- No drawer/bottom-sheet primitive (dialogs only).
- `module-config.ts` exists but is not wired to the sidebar (permission-only filtering).

## 6. API Gaps
- No `/tenant/service-types`, `/service-cases`, `/service-case-items`, `/workflow-*`, `/service-documents`, `/service-reports` resources.
- Quotation line DTO validation contradicts master data (must accept the 12 system codes).
- Idempotency keys only on accounting + payment paths; case/workflow critical actions need them.

## 7. RBAC Gaps
- No permission modules for the new domain. Following the existing `MODULE_ACTION` convention (5 fixed actions), add: `SERVICE_TYPE`, `SERVICE_CASE`, `SERVICE_ITEM`, `WORKFLOW`, `WORKFLOW_TASK`, `WORKFLOW_APPROVAL`, `SERVICE_DOCUMENT`, `SERVICE_REPORT` (mapping prompt verbs: approve/verify/publish → `MANAGE`; export → `MANAGE`; read_own/team/branch/tenant → enforced by scoping logic, not separate permission strings — branch scoping already exists via role assignments).
- No team constraint mechanism (needs `Team` model + membership before team-scoped reports).

## 8. Audit & Activity Gaps
- Foundations are strong; gaps are hooks: workflow transitions, document verification, approvals, case closure/reopen must call `audit.logMutation` (+ `SystemAuditLog` via `fn_append_audit_log` for high-risk: financial changes, medical document access, workflow migration).
- No document-access log per §19 (`DocumentAccessLog`) — needed for medical/passport classifications.

## 9. Migration Risks

| Risk | Mitigation |
|---|---|
| Legacy `'FLIGHT'`/`'PACKAGE'` strings in QuotationLineItem/InvoiceLine data | Backfill map `FLIGHT→AIR_TICKET`, `PACKAGE→TOUR`? No — `PACKAGE→OTHER` with original preserved in `metadata.legacyServiceType`; `FLIGHT→AIR_TICKET` is unambiguous |
| Tightened DTO validation breaking existing clients | Accept **union** of old+new codes during transition; normalize server-side |
| Helpdesk `Case` collision | New names: `ServiceCase*`, routes `/service-cases`; never touch `Case` |
| Dropping `serviceType` strings | **Do not drop.** Add nullable `serviceTypeId` FKs alongside; strings stay as denormalized legacy until a later deprecation phase |
| Existing leads/quotes keep working | ServiceType resolution optional everywhere in Phase 2; only new case flows require it |
| Workflow template edits corrupting open cases | Templates versioned (`WorkflowTemplate.version`, immutable once published); instances pin `templateVersionId` |
| Shadow-DB broken for `prisma migrate dev` (P3006, known) | Continue proven `prisma migrate diff --from-url` → hand-finished migration → `migrate deploy` flow |

## 10. Proposed Implementation Plan

**Phase 2 — Shared Foundation** (single migration `service_workflow_foundation`):
- Models: `ServiceType` (global rows `tenantId NULL` for the 12 system codes + per-tenant override rows), `TenantServiceType` config? → simpler: per-tenant `ServiceTypeConfig(tenantId, serviceTypeId/systemCode, isEnabled, displayName?, icon?, displayOrder?, defaultTeamId?, defaultWorkflowTemplateId?, configuration Json)`; `Team` + `TeamMember`; `ServiceCase`, `ServiceCaseItem`; workflow engine: `WorkflowTemplate` (versioned, `serviceTypeCode`, `isSystem`), `WorkflowStageTemplate` (code/name/order/group/slaHours/requiredDocumentTypes Json/requiredChecklist Json/requiresApproval/allowedNextStages Json), `WorkflowInstance` (pins templateId+version), `WorkflowStageInstance` (enteredAt/completedAt/slaDueAt/status), `WorkflowStatusHistory`, `WorkflowChecklistItem`, `WorkflowTask`, `WorkflowApproval`, `ServiceDocumentRequirement` + `CaseDocument` (status machine + version + classification) + `DocumentAccessLog`.
- API modules: `service-type` (list/enable/configure + seed 12 system templates), `service-case` (CRUD, items, assign, close/reopen, timeline, gapless `CASE-`/item reference numbers via accounting counter), `workflow` (templates CRUD/publish, instance start, available-transitions, transition with server-side gate: required docs verified + checklist complete + approvals granted + payment rule, SLA calc, history, activity+audit+notification), `service-document` (request/upload/verify/reject with access logging).
- Permissions: 8 new modules seeded; `packages/permissions` updated.
- Seeds: 12 `ServiceType` rows + 4 system workflow templates (Air Ticket 18 stages, Visa 21, Hotel 18, Tour 24 — from prompt §7–10) + document requirement templates for visa.
- Tests: e2e spec (tenant isolation, case+multi-item creation, workflow start, valid/invalid/blocked transitions, checklist/document/approval blocking, SLA calc, close/reopen, audit/activity rows).

**Phase 3 — Integration**: lead→case conversion (`ServiceCase.leadId`, service item from `lead.serviceType`); quotation line `serviceTypeId` + case item ↔ quotation link + accepted-quote → case item financials; booking/ticket linkage (`ServiceCaseItem.bookingId`); payments roll-up to case financial summary; supplier components (`ServiceCaseItemSupplier` for multi-supplier); notification hooks; **string migration**: add nullable `serviceTypeId` to Lead/QuotationLineItem/InvoiceLine/OrderItem/ServiceItem + backfill from string map + normalize quotation DTO validation to system codes (accept legacy input, store normalized).

**Phase 4 — Initial workflows live**: Air Ticket (TTL gate = `Booking.holdExpiresAt` + block ticket-issue stage without payment/credit approval — reuse ticket.service idempotently), Visa (document lifecycle gates), Hotel (cancellation deadline task automation), Tour (itinerary + multi-supplier costing). Frontend: Service Selector card grid, `/service-cases` list (all/my/team tabs), case detail (header + tabs: Overview/Workflow/Tasks/Documents/Quotation/Finance/Activity), reusable `WorkflowStepper` + `CaseTimeline` components, blocked-transition explanations.

**Phase 5–7** per prompt: remaining 8 service templates (pure seed data on the same engine), dashboards/reports (DB aggregation), automation scheduler (TTL/deadline/escalation scans following `RiskAlertService` pattern) — each phase its own commit set.

## 11. Exact Files Expected (Phase 2)

**Create — packages/database**: `prisma/migrations/<ts>_service_workflow_foundation/migration.sql`; schema additions (models above); `prisma/service-workflow-seed.ts` (12 types + 4 templates).
**Modify**: `prisma/schema.prisma`, `prisma/seed.ts` (permission modules), `packages/permissions/src/index.ts`.

**Create — apps/api/src/modules/service-ops/**: `service-ops.module.ts`, `service-type.controller/service.ts`, `service-case.controller/service.ts`, `workflow.controller/service.ts`, `workflow-engine.service.ts` (transition gate), `service-document.controller/service.ts`, `dto/*.ts` (service-type, case, item, transition, checklist, approval, document DTOs), `templates/` (air-ticket.ts, visa.ts, hotel.ts, tour.ts stage definitions).
**Modify**: `apps/api/src/app.module.ts`.
**Create — tests**: `apps/api/test/service-workflow.e2e-spec.ts`.

**Create — apps/web** (Phase 4): `src/components/service-selector.tsx`, `src/components/workflow-stepper.tsx`, `src/app/(dashboard)/service-cases/{page.tsx,new/page.tsx,[id]/page.tsx,case-form.tsx,...}`, `src/lib/service-ops.ts` (types).
**Modify**: `sidebar.tsx` (Operations group + `/service-cases`), `lib/crm.ts` (re-export types), lead detail (convert-to-case action), quotation line dialogs (normalized service codes).

---

**Recommendation**: approve this plan and begin Phase 2 (Shared Foundation). Each phase lands as small logical commits with typecheck + lint + e2e green before proceeding.
