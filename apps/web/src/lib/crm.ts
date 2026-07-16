export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const LEAD_STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'QUOTATION_SENT', 'NEGOTIATION', 'WON', 'LOST', 'DUPLICATE', 'SPAM'] as const;
export const LEAD_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export const LEAD_SOURCES = [
  'WEBSITE', 'REFERRAL', 'WALK_IN', 'PHONE', 'SOCIAL', 'PARTNER',
  'EMAIL', 'EVENT', 'ADVERTISEMENT', 'OTHER',
] as const;
export const SERVICE_TYPES = [
  'AIR_TICKET', 'VISA', 'HOTEL', 'TOUR', 'INSURANCE', 'TRANSFER',
  'UMRAH', 'HAJJ', 'MEDICAL_TOURISM', 'STUDENT_VISA', 'MANPOWER', 'CRUISE', 'OTHER',
] as const;

export const CLIENT_TYPES = ['PERSON', 'COMPANY'] as const;
export const CLIENT_STATUSES = ['ACTIVE', 'INACTIVE', 'BLOCKED'] as const;
export const CLIENT_GENDERS = ['MALE', 'FEMALE', 'OTHER'] as const;

export const FOLLOWUP_CHANNELS = ['PHONE', 'EMAIL', 'WHATSAPP', 'MEETING', 'SMS'] as const;
export const FOLLOWUP_STATUSES = ['PENDING', 'COMPLETED', 'CANCELLED', 'MISSED'] as const;

export interface Lead {
  id: string; fullName: string; firstName?: string | null; lastName?: string | null;
  email?: string | null; primaryMobile?: string | null; phone?: string | null;
  whatsappNumber?: string | null; status: string; priority: string;
  source?: string | null; serviceType?: string | null; notes?: string | null;
  assignedToId?: string | null; clientId?: string | null; branchId?: string | null;
  countryId?: string | null; travelCategory?: string | null; isDomestic?: boolean;
  departureCity?: string | null; departureAirportId?: string | null;
  destinationCity?: string | null; destinationAirportId?: string | null;
  numAdults?: number; numChildren?: number; numInfants?: number;
  preferredTravelDate?: string | null; tripType?: string | null;
  returnDate?: string | null; preferredAirlineIds?: string | null;
  sourcePlatform?: string | null; campaignName?: string | null; referralSource?: string | null;
  leadScore?: number | null; conversionProbability?: number | null;
  potentialRevenue?: number; approxBudget?: string | null; urgencyLevel?: string | null;
  slaDueAt?: string | null; slaStatus?: string | null;
  createdAt: string; updatedAt: string;
}

export interface Client {
  id: string; displayName: string; type: string; status: string; isVip?: boolean;
  email?: string | null; phone?: string | null; whatsapp?: string | null;
  companyName?: string | null; profession?: string | null;
  dateOfBirth?: string | null; gender?: string | null;
  nationalityId?: string | null; nationalityLabel?: string | null;
  address?: string | null; city?: string | null; country?: string | null;
  preferredCommunication?: string | null; preferredPaymentMethod?: string | null;
  preferredAirlines?: string | null; preferredRoutes?: string | null;
  loyaltyStatus?: string | null; riskScore?: number | null;
  currencyCode?: string | null; outstandingBalance?: number;
  creditLimit?: number; refundAmountTotal?: number;
  overdueInvoices?: number; cancellationCount?: number;
  refundFrequency?: string | null;
  phoneVerified?: boolean; emailVerified?: boolean;
  leadSource?: string | null; lastActivityAt?: string | null; lastBookingAt?: string | null;
  language?: string | null; timezone?: string | null;
  b2bCreditStatus?: string | null;
  branchId?: string | null; notes?: string | null; metadata?: any;
  activityScore?: number | null;
  lifetimeValue?: number;
  totalBookings?: number;
  totalPayments?: number;
  totalSpent?: number;
  lastScoredAt?: string | null;
  createdAt: string; updatedAt: string;
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
  lead?: { id: string; fullName: string } | null;
  clientId?: string | null;
  client?: { id: string; displayName: string } | null;
  assignedToId?: string | null;
  assignedTo?: { id: string; firstName: string; lastName: string } | null;
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

export const QUOTATION_STATUSES = ['DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED', 'BOOKING_CREATED'] as const;
export const BOOKING_STATUSES = ['HELD', 'CONFIRMED', 'TICKETED', 'CANCELLED', 'REFUNDED', 'VOIDED'] as const;
export const TICKET_STATUSES = ['PENDING', 'ISSUED', 'VOIDED', 'REFUNDED', 'REISSUED'] as const;

export interface QuotationLineItem {
  id: string;
  tenantId: string;
  quotationId: string;
  serviceType?: string | null;
  title?: string | null;
  description?: string | null;
  quantity: number;
  unitPrice: number;
  taxAmount?: number;
  discountAmount?: number;
  lineTotal: number;
  airlineId?: string | null;
  originAirportId?: string | null;
  destAirportId?: string | null;
  routeId?: string | null;
  metadata?: any;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuotationStatusLog {
  id: string;
  tenantId: string;
  quotationId: string;
  fromStatus?: string | null;
  toStatus: string;
  note?: string | null;
  actorId?: string | null;
  createdAt: string;
}

export interface QuotationClientSummary {
  id: string;
  displayName: string;
  email?: string | null;
  phone?: string | null;
}

export interface QuotationLeadSummary {
  id: string;
  fullName: string;
  status: string;
}

export interface QuotationUserSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface QuotationBranchSummary {
  id: string;
  name: string;
}

export interface QuotationRevision {
  id: string;
  tenantId: string;
  quotationId: string;
  revisionNumber: number;
  summary?: string | null;
  snapshot: any;
  pdfAssetKey?: string | null;
  createdById?: string | null;
  createdAt: string;
}

export interface QuotationDetail extends Quotation {
  lineItems: QuotationLineItem[];
  revisions: QuotationRevision[];
  statusLogs: QuotationStatusLog[];
  client?: QuotationClientSummary | null;
  lead?: QuotationLeadSummary | null;
  assignedTo?: QuotationUserSummary | null;
  branch?: QuotationBranchSummary | null;
}

export interface Quotation {
  id: string;
  quoteNumber: string;
  status: string;
  title?: string | null;
  clientId?: string | null;
  client?: { displayName: string } | null;
  lead?: { fullName: string } | null;
  leadId?: string | null;
  assignedToId?: string | null;
  currencyCode: string;
  subtotal: number | string;
  taxTotal: number | string;
  discountTotal: number | string;
  grandTotal: number | string;
  validUntil?: string | null;
  notes?: string | null;
  terms?: string | null;
  branchId?: string | null;
  currentRevision?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: string;
  bookingRef: string;
  pnrLocator?: string | null;
  status: string;
  clientId?: string | null;
  client?: { displayName: string } | null;
  lead?: { fullName: string } | null;
  quotationId?: string | null;
  leadId?: string | null;
  assignedToId?: string | null;
  travelStart?: string | null;
  travelEnd?: string | null;
  holdExpiresAt?: string | null;
  notes?: string | null;
  branchId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Ticket {
  id: string; ticketNumber: string; bookingId: string;
  passengerName?: string | null; passengerId?: string | null;
  airlineId?: string | null;
  airline?: { name: string; iataCode: string } | null;
  booking?: { bookingRef: string; client?: { displayName: string } | null; lead?: { fullName: string } | null } | null;
  status: string;
  issuedAt?: string | null; voidedAt?: string | null;
  refundedAt?: string | null; reissuedAt?: string | null;
  notes?: string | null; branchId?: string | null;
  createdAt: string; updatedAt: string;
}

export const quotationStatusVariant: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  DRAFT: 'secondary', SENT: 'default', VIEWED: 'default', ACCEPTED: 'success', REJECTED: 'destructive', EXPIRED: 'warning', CANCELLED: 'destructive', BOOKING_CREATED: 'success',
};

export const bookingStatusVariant: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  HELD: 'secondary', CONFIRMED: 'success', TICKETED: 'default', CANCELLED: 'destructive', REFUNDED: 'warning', VOIDED: 'secondary',
};

export const ticketStatusVariant: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  PENDING: 'secondary', ISSUED: 'success', VOIDED: 'destructive', REFUNDED: 'warning', REISSUED: 'default',
};

export const INVOICE_STATUSES = ['DRAFT', 'SENT', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'CANCELLED'] as const;
export const PAYMENT_STATUSES = ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'] as const;
export const EXPENSE_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'PAID'] as const;

export interface Invoice {
  id: string; invoiceNumber: string; status: string;
  clientId?: string | null;
  client?: { displayName: string } | null;
  bookingId?: string | null;
  currencyCode: string; subtotal: number | string; taxAmount: number | string;
  discountAmount: number | string; totalAmount: number | string; paidAmount: number | string; dueAmount: number | string;
  issuedAt?: string | null; dueAt?: string | null; notes?: string | null;
  branchId?: string | null; createdAt: string; updatedAt: string;
}

export interface Receipt {
  id: string; receiptNumber: string;
  invoiceId?: string | null; paymentMethod?: string | null;
  amount: number | string; currencyCode: string; reference?: string | null;
  notes?: string | null; receivedAt?: string | null;
  branchId?: string | null; createdAt: string; updatedAt: string;
}

export interface Payment {
  id: string; bookingId?: string | null; invoiceId?: string | null;
  amount: number | string; currencyCode: string; paymentMethod?: string | null;
  status: string; reference?: string | null; idempotencyKey?: string | null;
  notes?: string | null; receivedAt?: string | null; branchId?: string | null;
  createdAt: string; updatedAt: string;
}
export const PROJECT_STATUSES = ['PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED'] as const;

export const PROJECT_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

export const PROJECT_STATUS_TRANSITIONS: Record<string, string[]> = {
  PLANNING: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['ON_HOLD', 'COMPLETED', 'CANCELLED'],
  ON_HOLD: ['IN_PROGRESS', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: ['PLANNING'],
};
export const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'] as const;
export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

export interface Project {
  id: string;
  projectNumber: string;
  name: string;
  description?: string | null;
  status: string;
  priority: string;
  startDate?: string | null;
  endDate?: string | null;
  clientId?: string | null;
  assignedToId?: string | null;
  budget: number | string;
  actualCost: number | string;
  currencyCode: string;
  notes?: string | null;
  branchId?: string | null;
  createdAt: string;
  updatedAt: string;
  assignedTo?: { id: string; firstName: string; lastName: string; email: string } | null;
  client?: { id: string; displayName: string } | null;
  _count?: { tasks: number; members: number; timeLogs: number };
  members?: ProjectMember[];
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: string;
  hourlyRate?: number | null;
  createdAt: string;
  user: { id: string; firstName: string; lastName: string; email: string };
}

export interface TaskItem {
  id: string;
  projectId: string;
  parentTaskId?: string | null;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  kanbanOrder: number;
  isMilestone: boolean;
  estimatedHours?: number | null;
  actualHours?: number | null;
  startDate?: string | null;
  dueDate?: string | null;
  assignedToId?: string | null;
  branchId?: string | null;
  createdAt: string;
  updatedAt: string;
  assignedTo?: { id: string; firstName: string; lastName: string; email: string } | null;
  project?: { id: string; name: string; projectNumber: string } | null;
  checklists?: ChecklistItem[];
  subTasks?: TaskItem[];
  timeLogs?: TimeLogEntry[];
  dependencies?: { id: string; dependsOn: { id: string; title: string; status: string; startDate?: string | null; dueDate?: string | null; isMilestone: boolean } }[];
  _count?: { subTasks: number; timeLogs: number };
}

export interface ChecklistItem {
  id: string;
  taskId: string;
  title: string;
  isCompleted: boolean;
  completedById?: string | null;
  completedAt?: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface TimeLogEntry {
  id: string;
  projectId: string;
  taskId?: string | null;
  userId: string;
  description?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  duration: number;
  billable: boolean;
  hourlyRate?: number | null;
  createdAt: string;
  user?: { id: string; firstName: string; lastName: string } | null;
  task?: { id: string; title: string } | null;
}

export const projectStatusVariant: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  PLANNING: 'secondary',
  IN_PROGRESS: 'default',
  ON_HOLD: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'destructive',
};

export const projectPriorityVariant: Record<string, 'secondary' | 'warning' | 'destructive'> = {
  LOW: 'secondary',
  MEDIUM: 'secondary',
  HIGH: 'warning',
  URGENT: 'destructive',
};

export const taskStatusVariant: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  TODO: 'secondary',
  IN_PROGRESS: 'default',
  REVIEW: 'warning',
  DONE: 'success',
};

export const taskPriorityVariant: Record<string, 'secondary' | 'warning' | 'destructive'> = {
  LOW: 'secondary',
  MEDIUM: 'secondary',
  HIGH: 'warning',
  URGENT: 'destructive',
};

export interface Expense {
  id: string; expenseNumber: string; category?: string | null;
  vendorName?: string | null; amount: number | string; currencyCode: string;
  status: string; description?: string | null; expenseDate?: string | null;
  branchId?: string | null; createdAt: string; updatedAt: string;
}

export interface LedgerEntry {
  id: string; entryDate: string; referenceType?: string | null;
  referenceId?: string | null; direction: string; currencyCode: string;
  amount: number; description?: string | null; branchId?: string | null; createdAt: string;
}

export const invoiceStatusVariant: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  DRAFT: 'secondary', SENT: 'default', PAID: 'success', PARTIALLY_PAID: 'warning', OVERDUE: 'destructive', CANCELLED: 'secondary',
};

export const paymentStatusVariant: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  PENDING: 'secondary', COMPLETED: 'success', FAILED: 'destructive', REFUNDED: 'warning',
};

export const expenseStatusVariant: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  PENDING: 'secondary', APPROVED: 'default', REJECTED: 'destructive', PAID: 'success',
};

export const EMPLOYEE_STATUSES = ['ACTIVE', 'INACTIVE', 'TERMINATED', 'ON_LEAVE'] as const;
export const LEAVE_TYPES = ['SICK', 'ANNUAL', 'UNPAID', 'MATERNITY', 'PATERNITY', 'EMERGENCY', 'OTHER'] as const;
export const LEAVE_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] as const;
export const ATTENDANCE_STATUSES = ['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'HOLIDAY'] as const;
export const REVIEW_STATUSES = ['DRAFT', 'IN_PROGRESS', 'COMPLETED', 'ACKNOWLEDGED'] as const;

export interface Employee {
  id: string; employeeCode: string; userId?: string | null;
  departmentId?: string | null; firstName: string; lastName: string;
  email?: string | null; phone?: string | null; position?: string | null;
  status: string; joinedAt?: string | null; branchId?: string | null; createdAt: string; updatedAt: string;
}

export interface Leave {
  id: string; employeeId: string; leaveType: string; startDate: string; endDate: string;
  status: string; reason?: string | null; approvedById?: string | null; createdAt: string; updatedAt: string;
  employee?: { id: string; firstName: string; lastName: string; employeeCode: string };
}

export interface Attendance {
  id: string; employeeId: string; date: string; clockIn?: string | null;
  clockOut?: string | null; status: string; notes?: string | null; createdAt: string; updatedAt: string;
  employee?: { id: string; firstName: string; lastName: string; employeeCode: string };
}

export interface PerformanceReview {
  id: string; employeeId: string; reviewerId?: string | null; period: string;
  rating?: number | null; strengths?: string | null; improvements?: string | null;
  notes?: string | null; status: string; createdAt: string; updatedAt: string;
  employee?: { id: string; firstName: string; lastName: string; employeeCode: string };
}

export const employeeStatusVariant: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  ACTIVE: 'success', INACTIVE: 'secondary', TERMINATED: 'destructive', ON_LEAVE: 'warning',
};

export const leaveStatusVariant: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  PENDING: 'warning', APPROVED: 'success', REJECTED: 'destructive', CANCELLED: 'secondary',
};

export const attendanceStatusVariant: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  PRESENT: 'success', ABSENT: 'destructive', LATE: 'warning', HALF_DAY: 'secondary', HOLIDAY: 'default',
};

export const reviewStatusVariant: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  DRAFT: 'secondary', IN_PROGRESS: 'warning', COMPLETED: 'success', ACKNOWLEDGED: 'default',
};

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

export interface TimelineEvent {
  id: string;
  type: string;
  subject: string;
  content?: string | null;
  entity?: string | null;
  entityId?: string | null;
  metadata?: any;
  userId: string;
  userName?: string;
  createdAt: string;
}

export interface BookingPassenger {
  id: string; bookingId: string; passengerType: string;
  title?: string | null; firstName: string; lastName: string;
  dateOfBirth?: string | null; seatPreference?: string | null; mealPreference?: string | null;
}

export interface BookingSegment {
  id: string; bookingId: string; segmentType: string;
  airlineId?: string | null; flightNumber?: string | null;
  originAirportId?: string | null; destAirportId?: string | null;
  departureAt?: string | null; arrivalAt?: string | null;
  cabinClassId?: string | null; bookingClass?: string | null;
  fareBasis?: string | null; status: string;
}

export interface BookingStatusLog {
  id: string; bookingId: string; fromStatus?: string | null; toStatus: string;
  note?: string | null; actorId?: string | null; createdAt: string;
}

export interface DashboardOverview {
  leads: { total: number; new: number; won: number; slaBreached: number };
  leadPipeline?: { stage: string; count: number }[];
  clients: { total: number; active: number };
  quotations: { total: number; pending: number };
  bookings: { total: number; held: number; confirmed: number; ticketed: number };
  invoices: { total: number; unpaid: number; overdue: number };
  tickets: { total: number; pending: number; issued: number };
  refunds: { total: number; pending: number };
  employees: { total: number; active: number };
  recentActivity: TimelineEvent[];
  revenue?: { monthly: { name: string; revenue: number; count: number }[]; totalRevenue: number; totalInvoices: number };
}

export interface RefundRequest {
  id: string; refundNumber: string; status: string;
  bookingId?: string | null; ticketId?: string | null; invoiceId?: string | null; clientId?: string | null;
  requestedAmount: number; approvedAmount?: number | null;
  reason?: string | null; notes?: string | null;
  requestedById?: string | null; approvedById?: string | null; processedById?: string | null;
  requestedAt: string; approvedAt?: string | null; processedAt?: string | null;
  branchId?: string | null; createdAt: string; updatedAt: string;
}

export interface Commission {
  id: string; employeeId: string; sourceType: string;
  sourceId?: string | null; amount: number; currencyCode: string;
  calculationBasis?: string | null; status: string;
  notes?: string | null; approvedById?: string | null; approvedAt?: string | null;
  branchId?: string | null; createdAt: string; updatedAt: string;
}

export interface SalaryRun {
  id: string; salaryRunNumber: string; period: string;
  periodStart: string; periodEnd: string; status: string; currencyCode: string;
  totalGross: number; totalDeductions: number; totalNet: number;
  notes?: string | null; approvedById?: string | null; approvedAt?: string | null;
  branchId?: string | null; createdAt: string; updatedAt: string;
}
