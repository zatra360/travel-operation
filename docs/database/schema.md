# Database Schema

## Core Principles

### Tenant Isolation
Every tenant-owned table includes `tenantId` as a mandatory field. All queries must filter by `tenantId` to ensure data isolation between tenants.

### Unique Constraints
Composite unique constraints use the pattern `@@unique([tenantId, field])` to ensure uniqueness within a tenant scope, not globally.

Example:
```prisma
@@unique([tenantId, quoteNumber])
@@unique([tenantId, bookingRef])
@@unique([tenantId, invoiceNumber])
@@unique([tenantId, employeeCode])
```

### Soft Delete
Tables that support soft deletion include `deletedAt: DateTime?`. Queries should filter `deletedAt: null` to exclude soft-deleted records.

### Audit Trail
- `createdAt` and `updatedAt` timestamps on all tables
- `createdById` and `updatedById` references where applicable
- All mutations are recorded in the `AuditLog` table

## Model Reference

### Platform Layer
- **Tenant** - SaaS tenant organization
- **TenantSetting** - Key-value settings per tenant

### Organization Layer
- **Branch** - Multi-branch support per tenant
- **Department** - Organizational units within branches
- **DepartmentMember** - User-department assignments

### Identity & Access Layer
- **User** - Platform user (cross-tenant)
- **Role** - Tenant-scoped roles
- **Permission** - Global permission catalog
- **RolePermission** - Role-to-permission mappings
- **UserTenantMembership** - User-to-tenant assignments
- **UserBranchMembership** - User-to-branch assignments
- **UserRoleAssignment** - User-to-role assignments (optionally branch-scoped)

### Audit Layer
- **AuditLog** - Immutable audit trail for all mutations
- **Activity** - User activity stream

### Notification Layer
- **Notification** - In-app notifications for users

### Document Layer
- **Document** - File metadata for R2 storage

### Master Data
- **Country** - Country reference data
- **Nationality** - Nationality options
- **Currency** - Currency reference data
- **Airline** - Airline reference data
- **Airport** - Airport reference data
- **CabinClass** - Cabin class reference data
- **MasterLookup** - Flexible key-value lookup per tenant

### CRM Layer
- **Lead** - Sales leads with status tracking
- **Client** - Client records (individual or company)
- **FollowUp** - Scheduled follow-up activities

### Operations Layer
- **Quotation** - Price quotations for travel services
- **Booking** - Travel bookings with PNR
- **Ticket** - Issued tickets

### Finance Layer
- **Invoice** - Customer invoices
- **Receipt** - Payment receipts
- **Payment** - Payment records
- **Expense** - Business expenses
- **LedgerEntry** - General ledger entries

### HRM Layer
- **Employee** - Employee records linked to users
- **Leave** - Leave requests and approvals
- **Attendance** - Daily attendance tracking
- **PerformanceReview** - Performance evaluation records
