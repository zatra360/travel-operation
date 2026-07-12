'use client';

import { useEffect, useState } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TTLCountdownProps {
  /** The deadline (ticket time limit, payment due, etc.). */
  deadline: string | Date | null | undefined;
  className?: string;
  /** Warning threshold in minutes (amber below this). Default 240 (4h). */
  warnMinutes?: number;
}

function diffParts(ms: number) {
  const abs = Math.abs(ms);
  const days = Math.floor(abs / 86_400_000);
  const hours = Math.floor((abs % 86_400_000) / 3_600_000);
  const minutes = Math.floor((abs % 3_600_000) / 60_000);
  return { days, hours, minutes };
}

/**
 * Time-to-live countdown for ticketing deadlines / payment due dates.
 * Colour communicates urgency (never colour alone — an icon + label are shown):
 *   overdue → destructive, approaching → warning, comfortable → success.
 */
export function TTLCountdown({ deadline, className, warnMinutes = 240 }: TTLCountdownProps) {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!deadline) {
    return (
      <Badge variant="secondary" className={cn('gap-1', className)}>
        <Clock className="h-3 w-3" />
        No deadline
      </Badge>
    );
  }

  const target = new Date(deadline).getTime();
  const ms = target - now;
  const { days, hours, minutes } = diffParts(ms);
  const overdue = ms < 0;
  const approaching = !overdue && ms <= warnMinutes * 60_000;

  const label = days > 0 ? `${days}d ${hours}h` : hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  const variant = overdue ? 'destructive' : approaching ? 'warning' : 'success';

  return (
    <Badge variant={variant} className={cn('gap-1 tabular-nums', className)}>
      {overdue ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
      {overdue ? `Overdue ${label}` : `${label} left`}
    </Badge>
  );
}
