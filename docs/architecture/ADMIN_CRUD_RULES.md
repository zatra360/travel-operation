# ADMIN_CRUD_RULES

Every admin module ships complete CRUD across all layers. No create-only pages,
no fake data, no silent failed fetches.

## Required pages per module

### List
Search · filters · pagination · sort · status badges · bulk actions (only where
safe) · empty state · loading state · error state · export (permission-gated) ·
responsive table→cards on mobile.

### Create
Full-page form for complex records; drawer/modal only for small quick-create.
Clear validation, required-field indicators, save-draft where useful, cancel/back
behavior, submit loading state.

### Edit
Full-page for major records. Show record status + activity timeline + audit-sensitive
changes. Prevent accidental data loss; confirm destructive actions.

### View / detail
Summary cards · tabs/sections · related records · documents · activity timeline ·
notes/comments · audit trail (where permitted) · quick actions.

### Delete
Prefer soft delete. Require confirmation + permission. Block if dependent records
exist; offer archive/deactivate instead where appropriate. Audit every delete/archive.

## Modules requiring complete CRUD

Tenants · Branches · Departments · Teams · Users · Roles · Permissions · Packages ·
Settings · Master Data · Leads · Clients · Quotations · Bookings · Invoices ·
Payments · Employees · Attendance · Documents.

## Layer completeness (deliver together)

For each module, backend + frontend + docs land in the same change:

- **Backend**: Prisma model → migration → DTOs → service/controller → validation →
  permissions → audit log → Swagger → tests.
- **Frontend**: list → create → edit → detail (where needed) → API client → types →
  loading/empty/error states → permission-aware actions → mobile responsive.
- **Docs**: module doc, API doc, DB note, permission list, test checklist.

## Hard rules

- Do not create backend without UI.
- Do not create UI against fake/nonexistent APIs.
- Do not add DB fields with no API usage.
- Do not add routes without permissions.
- Do not add mutations without audit logs.
- No incomplete CRUD, no hardcoded dropdowns where master data exists.

## Current coverage snapshot

| Module   | List | Create | Edit | View | Delete(soft) | Notes |
|----------|:----:|:------:|:----:|:----:|:------------:|-------|
| Branches | yes  | api    | api  | api  | api          | UI create/edit forms pending |
| Users    | yes  | api    | api  | -    | -            | platform-scoped list |
| Leads    | yes  | yes    | yes  | yes  | yes          | dialog forms + detail + convert |
| Clients  | yes  | yes    | yes  | yes  | yes          | dialog forms + detail |
| Follow-ups | yes | yes   | api  | yes  | yes(hard)    | list + create + complete; edit via API |
| Documents | yes  | yes    | -    | yes  | yes          | R2 presigned upload/download; audited |

"api" = backend endpoint exists; "yes" = UI present. Remaining CRUD backlog:
Branch create/edit UI forms, and inline follow-up/document attach from lead/client detail.
