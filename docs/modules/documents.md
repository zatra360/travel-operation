# Documents module

Private document management for tenant business files (passports, visas, tickets,
invoices, employee docs, etc.). Storage is Cloudflare R2 (S3-compatible) accessed
via short-lived presigned URLs — file bytes never pass through the API.

## Flow (presigned, direct-to-R2)

1. `POST /api/v1/tenant/documents/upload-url` → `{ uploadUrl, storageKey, expiresIn }`
2. Client `PUT`s the file bytes directly to `uploadUrl` (R2).
3. `POST /api/v1/tenant/documents` with `storageKey` + metadata → creates the record.
4. `GET /api/v1/tenant/documents/:id/download` → `{ url }` (short-lived GET, forces
   attachment). Sensitive-category downloads are audit-logged.

## Endpoints

| Method | Path | Permission | Notes |
|--------|------|------------|-------|
| POST | `/tenant/documents/upload-url` | `DOCUMENT_CREATE` | presigned PUT (15 min) |
| POST | `/tenant/documents` | `DOCUMENT_CREATE` | register uploaded file |
| GET  | `/tenant/documents` | `DOCUMENT_READ` | list + search + filters |
| GET  | `/tenant/documents/:id` | `DOCUMENT_READ` | metadata |
| GET  | `/tenant/documents/:id/download` | `DOCUMENT_READ` | presigned GET |
| DELETE | `/tenant/documents/:id` | `DOCUMENT_DELETE` | soft delete (metadata) |

## Categories

PASSPORT, NID, VISA, TICKET, INVOICE, RECEIPT, QUOTATION, EMPLOYEE,
SUPPLIER_AGREEMENT, AUDIT_EVIDENCE, OTHER.

Sensitive (extra audit on download): **PASSPORT, NID, VISA**.

## Security

- Private by default; no public object URLs. Access only via signed URLs.
- Every list/get scoped by `tenantId`; soft-deleted rows excluded.
- Upload size cap: 25 MB (DTO validation).
- Mutations audited (`DOCUMENT` module); sensitive downloads logged as `EXPORT`.
- Soft delete removes metadata visibility; physical R2 object deletion is a
  controlled follow-up (not triggered on soft delete).

## Storage config (env, `apps/api/.env`)

```
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_REGION=auto
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=travelo-documents
```

If unset, `StorageService` is disabled and upload/download endpoints return a clear
400 — the rest of the app keeps working. Local dev can point at MinIO.

## Key files

- `apps/api/src/common/storage/storage.service.ts` — S3/R2 presign wrapper
- `apps/api/src/modules/document/*` — DTOs, service, controller, module
- `apps/web/src/app/(dashboard)/documents/*` — list page + upload dialog
- `apps/web/src/lib/crm.ts` — `DocumentItem`, categories, `formatFileSize`

## Attaching documents to records

`entity` + `entityId` link a document to an owner (e.g. `Lead`, `Client`). The
upload dialog accepts optional `entity`/`entityId` props for inline attach on detail
pages (wiring lead/client detail upload is a follow-up).

## Test checklist

- Upload URL requires `DOCUMENT_CREATE`; list/download require `DOCUMENT_READ`.
- Cross-tenant `:id` access returns 404.
- Sensitive download writes an audit `EXPORT` row.
- Soft delete hides the document from list and download.
- Missing R2 config → upload-url returns 400, not 500.
