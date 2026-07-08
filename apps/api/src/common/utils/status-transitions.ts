const transitions: Record<string, Record<string, string[]>> = {
  quotation: {
    DRAFT: ['SENT', 'DRAFT'],
    SENT: ['ACCEPTED', 'REJECTED', 'EXPIRED'],
    ACCEPTED: [],
    REJECTED: ['DRAFT'],
    EXPIRED: ['DRAFT'],
  },
  booking: {
    PENDING: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['COMPLETED', 'CANCELLED'],
    CANCELLED: [],
    COMPLETED: [],
  },
  ticket: {
    ISSUED: ['VOIDED', 'EXCHANGED'],
    VOIDED: [],
    EXCHANGED: [],
    REFUNDED: [],
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
