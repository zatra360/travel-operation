export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResult<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

export interface TenantContext {
  tenantId: string;
  branchId?: string;
  userId: string;
  isPlatformSuperAdmin?: boolean;
}
