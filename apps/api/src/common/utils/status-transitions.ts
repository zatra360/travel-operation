const transitions: Record<string, Record<string, string[]>> = {
  lead: {
    NEW: ['CONTACTED', 'LOST', 'DUPLICATE', 'SPAM'],
    CONTACTED: ['QUALIFIED', 'LOST'],
    QUALIFIED: ['QUOTATION_SENT', 'PROPOSAL', 'LOST'],
    QUOTATION_SENT: ['NEGOTIATION', 'WON', 'LOST'],
    NEGOTIATION: ['WON', 'LOST'],
    PROPOSAL: ['WON', 'LOST'],
    WON: [],
    LOST: ['NEW'],
    DUPLICATE: [],
    SPAM: [],
  },
  quotation: {
    DRAFT: ['SENT', 'CANCELLED'],
    SENT: ['VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED'],
    VIEWED: ['ACCEPTED', 'REJECTED', 'EXPIRED'],
    ACCEPTED: ['BOOKING_CREATED'],
    BOOKING_CREATED: [],
    REJECTED: ['DRAFT'],
    EXPIRED: ['DRAFT'],
    CANCELLED: [],
  },
  booking: {
    HELD: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['TICKETED', 'CANCELLED'],
    TICKETED: ['CANCELLED', 'REFUNDED', 'VOIDED'],
    CANCELLED: [],
    REFUNDED: [],
    VOIDED: [],
  },
  ticket: {
    PENDING: ['ISSUED', 'VOIDED'],
    ISSUED: ['VOIDED', 'REFUNDED', 'REISSUED'],
    VOIDED: [],
    REFUNDED: [],
    REISSUED: [],
  },
  invoice: {
    DRAFT: ['SENT', 'CANCELLED'],
    SENT: ['PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED'],
    PARTIALLY_PAID: ['PAID', 'OVERDUE', 'CANCELLED'],
    PAID: [],
    OVERDUE: ['PAID', 'CANCELLED'],
    CANCELLED: [],
  },
  payment: {
    PENDING: ['RECEIVED', 'FAILED'],
    RECEIVED: ['PARTIALLY_REFUNDED', 'REFUNDED'],
    FAILED: ['PENDING'],
    PARTIALLY_REFUNDED: ['REFUNDED'],
    REFUNDED: [],
  },
  expense: {
    PENDING: ['APPROVED', 'REJECTED'],
    APPROVED: ['PAID', 'REJECTED'],
    REJECTED: ['PENDING'],
    PAID: [],
  },
  refund: {
    REQUESTED: ['UNDER_REVIEW', 'REJECTED'],
    UNDER_REVIEW: ['APPROVED', 'REJECTED'],
    APPROVED: ['PROCESSED'],
    REJECTED: ['REQUESTED'],
    PROCESSED: [],
  },
  reissue: {
    REQUESTED: ['UNDER_REVIEW', 'REJECTED'],
    UNDER_REVIEW: ['APPROVED', 'REJECTED'],
    APPROVED: ['PROCESSED'],
    REJECTED: ['REQUESTED'],
    PROCESSED: [],
  },
  cancellation: {
    REQUESTED: ['UNDER_REVIEW', 'REJECTED'],
    UNDER_REVIEW: ['APPROVED', 'REJECTED'],
    APPROVED: ['PROCESSED'],
    REJECTED: ['REQUESTED'],
    PROCESSED: [],
  },
  leave: {
    PENDING: ['APPROVED', 'REJECTED'],
    APPROVED: [],
    REJECTED: ['PENDING'],
  },
  salary_run: {
    DRAFT: ['GENERATED'],
    GENERATED: ['APPROVED', 'CANCELLED'],
    APPROVED: ['PAID', 'CANCELLED'],
    PAID: [],
    CANCELLED: [],
  },
  commission: {
    PENDING: ['APPROVED', 'REJECTED'],
    APPROVED: ['PAID'],
    REJECTED: ['PENDING'],
    PAID: [],
  },
  incentive: {
    PENDING: ['APPROVED', 'REJECTED'],
    APPROVED: ['PAID'],
    REJECTED: ['PENDING'],
    PAID: [],
  },
  contract: {
    DRAFT: ['SENT', 'CANCELLED'],
    SENT: ['SIGNED', 'REJECTED', 'EXPIRED', 'CANCELLED'],
    SIGNED: ['TERMINATED', 'EXPIRED'],
    REJECTED: ['DRAFT'],
    EXPIRED: ['DRAFT'],
    CANCELLED: [],
    TERMINATED: [],
  },
};

export function validateStatusTransition(
  module: string,
  currentStatus: string,
  newStatus: string,
): { valid: boolean; allowed: string[] } {
  if (currentStatus === newStatus) return { valid: true, allowed: [] };
  const allowed = transitions[module]?.[currentStatus] ?? [];
  return { valid: allowed.includes(newStatus), allowed };
}

export function isTerminalStatus(module: string, status: string): boolean {
  const allowed = transitions[module]?.[status];
  return allowed === undefined ? false : allowed.length === 0;
}
