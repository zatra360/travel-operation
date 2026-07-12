import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Tone = 'default' | 'success' | 'warning' | 'destructive' | 'info';

const toneAccent: Record<Tone, string> = {
  default: 'border-l-primary',
  success: 'border-l-success',
  warning: 'border-l-warning',
  destructive: 'border-l-destructive',
  info: 'border-l-info',
};

const toneIcon: Record<Tone, string> = {
  default: 'bg-primary/10 text-primary',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
  info: 'bg-info/15 text-info',
};

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon: LucideIcon;
  href?: string;
  tone?: Tone;
  className?: string;
}

/**
 * Reusable KPI/stat card with token-based accents (no per-card ad-hoc colours).
 * Optionally links to the underlying module so a metric is one click from its
 * source data — every dashboard card should answer a real operational question.
 */
export function StatCard({ label, value, hint, icon: Icon, href, tone = 'default', className }: StatCardProps) {
  const inner = (
    <Card
      className={cn(
        'h-full border-l-4 transition-shadow',
        toneAccent[tone],
        href && 'hover:shadow-md',
        className,
      )}
    >
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums">{value}</p>
          {hint && <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>}
        </div>
        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', toneIcon[tone])}>
          <Icon className="h-4 w-4" />
        </span>
      </CardContent>
    </Card>
  );

  return href ? (
    <Link href={href} className="block focus-visible:outline-none">
      {inner}
    </Link>
  ) : (
    inner
  );
}
