const transitions: Record<string, Record<string, string[]>> = {
  quotation: {
    DRAFT: ['SENT', 'DRAFT'],
    SENT: ['ACCEPTED', 'REJECTED', 'EXPIRED'],
    ACCEPTED: [],
    REJECTED: ['DRAFT'],
    EXPIRED: ['DRAFT'],
  },
  booking: {
    HELD: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['TICKETED', 'CANCELLED'],
    TICKETED: ['CANCELLED', 'REFUNDED'],
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
    DRAFT: ['SENT'],
    SENT: ['PAID', 'PARTIALLY_PAID', 'OVERDUE', 'CANCELLED'],
    PARTIALLY_PAID: ['PAID', 'CANCELLED', 'OVERDUE'],
    PAID: [],
    OVERDUE: ['PAID', 'CANCELLED'],
    CANCELLED: [],
  },
  expense: {
    PENDING: ['APPROVED', 'REJECTED'],
    APPROVED: ['PAID', 'REJECTED'],
    REJECTED: ['PENDING'],
    PAID: [],
  },
  lead: {
    NEW: ['CONTACTED', 'LOST'],
    CONTACTED: ['QUALIFIED', 'LOST'],
    QUALIFIED: ['PROPOSAL', 'LOST'],
    PROPOSAL: ['WON', 'LOST'],
    WON: [],
    LOST: ['NEW'],
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
