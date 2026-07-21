import type { BadgeProps } from '@/components/ui/badge';

type Tone = NonNullable<BadgeProps['variant']>;

/**
 * Centralized status → visual tone mapping.
 *
 * Every module should resolve status colours through here (or `StatusBadge`)
 * so the platform never invents inconsistent status colours. Status colour is
 * derived from meaning, not per-module preference:
 *   success  → completed / confirmed / paid / issued / won
 *   warning  → pending / waiting / approaching deadline
 *   destructive → cancelled / failed / overdue / rejected / lost
 *   info     → in-progress / neutral active states
 */
const TONE_BY_STATUS: Record<string, Tone> = {
  // success
  WON: 'success',
  CONFIRMED: 'success',
  PAID: 'success',
  ISSUED: 'success',
  COMPLETED: 'success',
  APPROVED: 'success',
  PROCESSED: 'success',
  RECEIVED: 'success',
  ACTIVE: 'success',
  ACCEPTED: 'success',
  BOOKING_CREATED: 'success',
  // default/info (active non-success states)
  SENT: 'default',
  VIEWED: 'default',
  NEW: 'info',
  CONTACTED: 'info',
  QUALIFIED: 'info',
  PROPOSAL: 'info',
  IN_PROGRESS: 'info',
  HELD: 'info',
  NEGOTIATION: 'info',
  UNDER_REVIEW: 'info',
  GENERATED: 'info',
  EXPIRED: 'warning',
  // warning
  PENDING: 'warning',
  PARTIALLY_PAID: 'warning',
  REQUESTED: 'warning',
  ON_HOLD: 'warning',
  // secondary
  DRAFT: 'secondary',
  HOLD: 'secondary',
  // destructive
  LOST: 'destructive',
  CANCELLED: 'destructive',
  FAILED: 'destructive',
  OVERDUE: 'destructive',
  REJECTED: 'destructive',
  VOIDED: 'destructive',
  REFUNDED: 'destructive',
  BLOCKED: 'destructive',
  INACTIVE: 'secondary',
};

const PRIORITY_TONE: Record<string, Tone> = {
  LOW: 'secondary',
  MEDIUM: 'info',
  HIGH: 'warning',
  URGENT: 'destructive',
};

export function statusTone(status?: string | null): Tone {
  if (!status) return 'secondary';
  return TONE_BY_STATUS[status.toUpperCase()] ?? 'secondary';
}

export function priorityTone(priority?: string | null): Tone {
  if (!priority) return 'secondary';
  return PRIORITY_TONE[priority.toUpperCase()] ?? 'secondary';
}

/** Turns SCREAMING_SNAKE / kebab statuses into a readable label. */
export function humanizeStatus(status?: string | null): string {
  if (!status) return '—';
  return status
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
