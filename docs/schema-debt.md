# Schema Debt Register

Generated from codebase analysis — 17 July 2026.

## 1. JSON Workarounds (should be normalized)

| Model | Field | Issue | Migration Effort |
|-------|-------|-------|-----------------|
| `User` | `metadata` JSON | Stores 2FA secret, notification prefs, onboarding state. Should be: `twoFactorSecret` (VARCHAR), `twoFactorEnabled` (BOOLEAN), `notificationPrefs` (separate table). | Medium |
| `TenantSetting` | `value` JSON | Key-value store. Acceptable for flexible config but no typing or validation. `DocumentNumberCounter` already models sequential numbering properly. | Low |
| `Package` | `features` JSON | Plan features stored as JSON array. Should be normalized to a `PackageFeature` join table for queryability. | Low |
| `Lead` | 100+ flat fields | Excessive denormalization. UTM tracking fields, social media handles, travel preferences in one model. Consider `LeadMetadata` or `LeadPreference` sub-tables. | High |

## 2. Missing Soft-Deletes

| Model | Issue |
|-------|-------|
| `Payment` | Hard-deleted via `prisma.payment.delete()`. No `deletedAt` column. Audit entry exists but record disappears. |
| `InvoiceLine` | Hard-deleted via `prisma.invoiceLine.delete()`. No audit trail beyond manual audit log. |
| `BookingSegment` | No `deletedAt`. Segments are hard-deleted. |

## 3. Polymorphic Relations (anti-pattern)

| Model | Issue |
|-------|-------|
| `Document` | Uses `entity` (string) + `entityId` (string) for polymorphic linking to any entity. No FK enforcement. Better: separate join tables (`LeadDocument`, `ClientDocument`, etc.). |
| `Activity` | Same pattern: `entity` + `entityId` instead of typed relations. |
| `LedgerEntry` | `referenceType` + `referenceId` instead of FK relations. |

## 4. Missing Constraints

| Table | Issue |
|-------|-------|
| `Booking` | `pnrLocator` should have a unique constraint per tenant to prevent duplicate PNRs at DB level (currently enforced in service only). |
| `Ticket` | `ticketNumber` unique per tenant — already has index but no constraint on `(tenantId, bookingId, passengerId)` to prevent duplicate tickets for same passenger. |
| `Invoice` | No constraint preventing `paidAmount > totalAmount`. |
| `Payment` | `idempotencyKey` unique per tenant — already enforced. Good. |

## 5. Unused / Dead Fields

| Model | Field | Notes |
|-------|-------|-------|
| `Lead` | `sourcePlatform`, `adSet`, `utmSource`, `utmMedium`, `utmCampaign`, `utmContent`, `landingPage`, `importBatchId`, `creationMethod`, `agentType`, `agencyName`, `subAgentReference`, `commissionCategory` | All in `LEAD_CREATE_FIELDS` but never exposed in frontend forms or used in any workflow. |
| `CurrencyConfig` | `decimalPlaces` | Seeded but never respected by any formatting logic. |
| `Tenant` | `maxUsers`, `maxBranches` | Stored but never enforced (no guard checks these limits). Updated on plan change — enforcement could be added in `UserService.addToTenant` and `BranchService.create`. |

## 6. Index Gaps

| Table | Missing Index | Reason |
|-------|--------------|--------|
| `Booking` | `(tenantId, holdExpiresAt)` | TTL expiry queries need this for a cron job. |
| `Invoice` | `(tenantId, dueAt)` | Overdue invoice queries scan full table. |
| `Invoice` | `(tenantId, status)` | Status-filtered queries are common. |
| `FollowUp` | `(tenantId, scheduledAt, status)` | Dashboard follow-up queries. |
| `Lead` | `(tenantId, slaDueAt, slaStatus)` | SLA breach queries. |
| `Notification` | `(tenantId, userId, isRead)` | Unread count queries. |

## 7. Naming / Type Issues

| Issue | Detail |
|-------|--------|
| `Lead.passportNationalityId` | Misleading name — stores a passport number string, not a nationality ID reference. Should be `passportNumber`. |
| `Quotation.taxTotal` vs `Invoice.taxAmount` | Inconsistent naming between modules. |
| `LedgerEntry.direction` | Uses String `DEBIT`/`CREDIT` instead of a proper enum. |
