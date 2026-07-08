# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Cloudflare DNS & CDN                │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────────┐  ┌──────────────────────┐  │
│  │   Cloudflare Pages   │  │   Node Hosting        │  │
│  │   (Next.js Frontend) │  │   (NestJS API)        │  │
│  │   Port 3901          │  │   Port 3900           │  │
│  └─────────┬───────────┘  └──────────┬────────────┘  │
│            │                          │               │
│            └──────────┬───────────────┘               │
│                       │                               │
│  ┌────────────────────┴──────────────────────┐        │
│  │              PostgreSQL (Neon)             │        │
│  └───────────────────────────────────────────┘        │
│                                                       │
│  ┌───────────────────────────────────────────┐        │
│  │           Cloudflare R2 Storage            │        │
│  └───────────────────────────────────────────┘        │
│                                                       │
│  ┌───────────────────────────────────────────┐        │
│  │              Redis Cache                   │        │
│  └───────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────┘
```

## Core Principles

### 1. SaaS-First Architecture
- Multi-tenant by default
- Tenant isolation via `tenantId` on every business table
- No data leakage between tenants
- Tenant-aware middleware validates access on every request

### 2. Route Separation
- `/api/v1/public/*` - No auth required (login, registration)
- `/api/v1/platform/*` - Platform super admin operations
- `/api/v1/tenant/*` - Tenant-scoped business operations

### 3. RBAC Model
- Platform-level roles: Super Admin, Support
- Tenant-level roles: Owner, Admin, Manager, Executive, Officer, Viewer
- Branch-level role assignments
- Permission-based access control with module+action granularity

### 4. Data Isolation
- Every query filters by `tenantId`
- Branch-level scoping where applicable
- Soft deletes preserve data integrity
- Audit log tracks all mutations
