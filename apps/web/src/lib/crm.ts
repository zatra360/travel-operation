export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const LEAD_STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST'] as const;
export const LEAD_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export const LEAD_SOURCES = [
  'WEBSITE',
  'REFERRAL',
  'WALK_IN',
  'PHONE',
  'SOCIAL',
  'PARTNER',
  'OTHER',
] as const;
export const SERVICE_TYPES = [
  'FLIGHT',
  'HOTEL',
  'VISA',
  'UMRAH',
  'HAJJ',
  'PACKAGE',
  'INSURANCE',
  'OTHER',
] as const;

export const CLIENT_TYPES = ['PERSON', 'COMPANY'] as const;
export const CLIENT_STATUSES = ['ACTIVE', 'INACTIVE', 'BLOCKED'] as const;
export const CLIENT_GENDERS = ['MALE', 'FEMALE', 'OTHER'] as const;

export const FOLLOWUP_CHANNELS = ['PHONE', 'EMAIL', 'WHATSAPP', 'MEETING', 'SMS'] as const;
export const FOLLOWUP_STATUSES = ['PENDING', 'COMPLETED', 'CANCELLED', 'MISSED'] as const;

export interface Lead {
  id: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  status: string;
  priority: string;
  source?: string | null;
  serviceType?: string | null;
  notes?: string | null;
  assignedToId?: string | null;
  clientId?: string | null;
  branchId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  displayName: string;
  type: string;
  status: string;
  email?: string | null;
  phone?: string | null;
  companyName?: string | null;
  nationalityId?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  branchId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FollowUp {
  id: string;
  subject: string;
  scheduledAt: string;
  channel: string;
  status: string;
  description?: string | null;
  outcome?: string | null;
  leadId?: string | null;
  clientId?: string | null;
  assignedToId?: string | null;
  branchId?: string | null;
  completedAt?: string | null;
  createdAt: string;
}

export const leadStatusVariant: Record<
  string,
  'default' | 'secondary' | 'success' | 'warning' | 'info' | 'destructive'
> = {
  NEW: 'info',
  CONTACTED: 'default',
  QUALIFIED: 'warning',
  PROPOSAL: 'warning',
  WON: 'success',
  LOST: 'destructive',
};

export const leadPriorityVariant: Record<string, 'secondary' | 'warning' | 'destructive'> = {
  LOW: 'secondary',
  MEDIUM: 'secondary',
  HIGH: 'warning',
  URGENT: 'destructive',
};

export const clientStatusVariant: Record<string, 'success' | 'secondary' | 'destructive'> = {
  ACTIVE: 'success',
  INACTIVE: 'secondary',
  BLOCKED: 'destructive',
};

export const followUpStatusVariant: Record<
  string,
  'default' | 'secondary' | 'success' | 'destructive'
> = {
  PENDING: 'default',
  COMPLETED: 'success',
  CANCELLED: 'secondary',
  MISSED: 'destructive',
};

export const DOCUMENT_CATEGORIES = [
  'PASSPORT',
  'NID',
  'VISA',
  'TICKET',
  'INVOICE',
  'RECEIPT',
  'QUOTATION',
  'EMPLOYEE',
  'SUPPLIER_AGREEMENT',
  'AUDIT_EVIDENCE',
  'OTHER',
] as const;

export const SENSITIVE_DOCUMENT_CATEGORIES = new Set(['PASSPORT', 'NID', 'VISA']);

export interface DocumentItem {
  id: string;
  category: string;
  fileName: string;
  mimeType: string;
  sizeBytes?: number | null;
  entity?: string | null;
  entityId?: string | null;
  branchId?: string | null;
  createdAt: string;
  uploadedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

export function formatFileSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '--';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
