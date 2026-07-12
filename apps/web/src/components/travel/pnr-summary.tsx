import { Copy, Users, Plane } from 'lucide-react';
import { StatusBadge } from '@/components/ui/status-badge';
import { cn } from '@/lib/utils';

interface PNRSummaryProps {
  pnr?: string | null;
  status?: string | null;
  passengerCount?: number;
  segmentCount?: number;
  airline?: string | null;
  className?: string;
}

/**
 * Compact PNR summary strip for booking/ticket contexts: record locator,
 * status, passenger and segment counts.
 */
export function PNRSummary({
  pnr,
  status,
  passengerCount,
  segmentCount,
  airline,
  className,
}: PNRSummaryProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border bg-card p-3', className)}>
      <div className="flex items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">PNR</span>
        <span className="font-mono text-base font-semibold tracking-wider">{pnr ?? '—'}</span>
        {pnr && <Copy className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />}
      </div>
      {status && <StatusBadge status={status} />}
      {airline && (
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Plane className="h-3.5 w-3.5" aria-hidden="true" />
          {airline}
        </span>
      )}
      {typeof passengerCount === 'number' && (
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Users className="h-3.5 w-3.5" aria-hidden="true" />
          {passengerCount} pax
        </span>
      )}
      {typeof segmentCount === 'number' && (
        <span className="text-sm text-muted-foreground">
          {segmentCount} segment{segmentCount === 1 ? '' : 's'}
        </span>
      )}
    </div>
  );
}
