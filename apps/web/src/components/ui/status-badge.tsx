import { Badge, type BadgeProps } from '@/components/ui/badge';
import { statusTone, priorityTone, humanizeStatus } from '@/lib/status';
import { cn } from '@/lib/utils';

interface StatusBadgeProps extends Omit<BadgeProps, 'variant' | 'children'> {
  status?: string | null;
  /** Use the priority colour scale instead of the status scale. */
  kind?: 'status' | 'priority';
  /** Override the resolved tone. */
  variant?: BadgeProps['variant'];
  /** Show the raw value instead of a humanized label. */
  raw?: boolean;
}

/**
 * Consistent, token-driven status/priority pill used across every module.
 * Resolves colour from meaning via `lib/status`, never per-module hardcoding.
 */
export function StatusBadge({ status, kind = 'status', variant, raw, className, ...props }: StatusBadgeProps) {
  const tone = variant ?? (kind === 'priority' ? priorityTone(status) : statusTone(status));
  return (
    <Badge variant={tone} className={cn('font-medium', className)} {...props}>
      {raw ? (status ?? '—') : humanizeStatus(status)}
    </Badge>
  );
}
