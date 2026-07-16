import {
  Plane, FileCheck, Building2, Map, Shield, Car, Sun, Star, Heart,
  GraduationCap, Briefcase, Anchor, CircleHelp, type LucideIcon,
} from 'lucide-react';

export interface ServiceTypeInfo {
  id: string;
  systemCode: string;
  slug: string;
  category: string;
  displayName: string;
  icon?: string | null;
  displayOrder: number;
  isEnabled: boolean;
  supportsTicketing: boolean;
  supportsApplication: boolean;
}

export interface ServiceCaseItem {
  id: string;
  referenceNumber: string;
  status: string;
  priority: string;
  currentStageCode?: string | null;
  slaDueAt?: string | null;
  slaStatus?: string | null;
  serviceAmount: string | number;
  supplierCost: string | number;
  grossProfit: string | number;
  currencyCode: string;
  quotationId?: string | null;
  bookingId?: string | null;
  workflowInstanceId?: string | null;
  assignedToId?: string | null;
  metadata?: Record<string, unknown> | null;
  serviceType: { systemCode: string; displayName: string; icon?: string | null; category?: string };
  documents?: CaseDocument[];
}

export interface ServiceCase {
  id: string;
  caseNumber: string;
  title: string;
  status: string;
  priority: string;
  clientId?: string | null;
  leadId?: string | null;
  assignedToId?: string | null;
  expectedRevenue: string | number;
  currencyCode: string;
  openedAt: string;
  dueAt?: string | null;
  closedAt?: string | null;
  closureReason?: string | null;
  branchId?: string | null;
  createdAt: string;
  items: ServiceCaseItem[];
  team?: { id: string; name: string; code: string } | null;
}

export interface WorkflowStage {
  code: string;
  name: string;
  group: string;
  displayOrder: number;
  isTerminal: boolean;
  state: 'COMPLETED' | 'CURRENT' | 'UPCOMING';
  enteredAt?: string | null;
  completedAt?: string | null;
  slaDueAt?: string | null;
  slaStatus?: string | null;
}

export interface WorkflowChecklistItem {
  id: string;
  stageCode: string;
  code: string;
  title: string;
  isRequired: boolean;
  isCompleted: boolean;
  completedAt?: string | null;
  evidence?: string | null;
}

export interface WorkflowApproval {
  id: string;
  stageCode: string;
  approvalType: string;
  status: string;
  requestedAt: string;
  decidedAt?: string | null;
  note?: string | null;
}

export interface WorkflowTimeline {
  instanceId: string;
  status: string;
  currentStageCode: string;
  templateCode: string;
  templateVersion: number;
  stages: WorkflowStage[];
  checklist: WorkflowChecklistItem[];
  approvals: WorkflowApproval[];
}

export interface TransitionInfo {
  instanceId: string;
  status: string;
  currentStage: { code: string; name: string; group: string; isTerminal: boolean } | null;
  canTransition: boolean;
  blockers: Array<{ type: string; detail: string }>;
  availableStages: Array<{ code: string; name: string; group: string; isTerminal: boolean }>;
}

export interface CaseDocument {
  id: string;
  documentType: string;
  title?: string | null;
  status: string;
  isRequired: boolean;
  version: number;
  accessClassification: string;
  rejectionReason?: string | null;
  correctionInstructions?: string | null;
  expiryDate?: string | null;
  requestedAt: string;
}

export const CASE_STATUSES = ['OPEN', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CLOSED', 'CANCELLED'] as const;
export const CASE_ITEM_STATUSES = ['ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'] as const;

export const DOCUMENT_STATUS_TRANSITIONS: Record<string, string[]> = {
  REQUESTED: ['RECEIVED', 'ARCHIVED'],
  RECEIVED: ['UNDER_REVIEW', 'ARCHIVED'],
  UNDER_REVIEW: ['VERIFIED', 'CORRECTION_REQUIRED', 'REJECTED'],
  CORRECTION_REQUIRED: ['RESUBMITTED', 'ARCHIVED'],
  RESUBMITTED: ['UNDER_REVIEW'],
  VERIFIED: ['SUBMITTED', 'EXPIRED', 'ARCHIVED'],
  SUBMITTED: ['EXPIRED', 'ARCHIVED'],
  EXPIRED: ['ARCHIVED'],
  REJECTED: ['ARCHIVED'],
  ARCHIVED: [],
};

const ICONS: Record<string, LucideIcon> = {
  plane: Plane,
  'file-check': FileCheck,
  building: Building2,
  map: Map,
  shield: Shield,
  car: Car,
  sun: Sun,
  star: Star,
  heart: Heart,
  'graduation-cap': GraduationCap,
  briefcase: Briefcase,
  anchor: Anchor,
};

export function serviceIcon(icon?: string | null): LucideIcon {
  return (icon && ICONS[icon]) || CircleHelp;
}

export const caseStatusVariant: Record<string, string> = {
  OPEN: 'secondary',
  IN_PROGRESS: 'default',
  ON_HOLD: 'warning',
  COMPLETED: 'success',
  CLOSED: 'secondary',
  CANCELLED: 'destructive',
};

export const docStatusVariant: Record<string, string> = {
  REQUESTED: 'secondary',
  RECEIVED: 'default',
  UNDER_REVIEW: 'warning',
  CORRECTION_REQUIRED: 'destructive',
  RESUBMITTED: 'default',
  VERIFIED: 'success',
  SUBMITTED: 'success',
  EXPIRED: 'destructive',
  REJECTED: 'destructive',
  ARCHIVED: 'secondary',
};
