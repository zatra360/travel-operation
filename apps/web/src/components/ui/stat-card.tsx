import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

type Tone = 'default' | 'success' | 'warning' | 'destructive' | 'info';

const toneColors: Record<Tone, { bg: string; text: string; ring: string }> = {
  default: { bg: 'bg-primary/8', text: 'text-primary', ring: 'ring-primary/20' },
  success: { bg: 'bg-emerald-500/8', text: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-500/20' },
  warning: { bg: 'bg-amber-500/8', text: 'text-amber-600 dark:text-amber-400', ring: 'ring-amber-500/20' },
  destructive: { bg: 'bg-red-500/8', text: 'text-red-600 dark:text-red-400', ring: 'ring-red-500/20' },
  info: { bg: 'bg-sky-500/8', text: 'text-sky-600 dark:text-sky-400', ring: 'ring-sky-500/20' },
};

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon: LucideIcon;
  href?: string;
  tone?: Tone;
  className?: string;
  index?: number;
}

export function StatCard({ label, value, hint, icon: Icon, href, tone = 'default', className, index = 0 }: StatCardProps) {
  const c = toneColors[tone];
  const inner = (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className={cn(
        'group relative overflow-hidden rounded-xl border bg-card p-5 transition-all duration-200',
        'hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5',
        'ring-1 ring-transparent hover:ring-primary/20',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="text-[28px] font-semibold tracking-tight tabular-nums leading-none">{value}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-full', c.bg)}>
          <Icon className={cn('h-5 w-5', c.text)} />
        </div>
      </div>
      <div className={cn('absolute bottom-0 left-0 h-1 w-full rounded-b-xl bg-gradient-to-r', {
        'from-primary/40 to-primary/10': tone === 'default',
        'from-emerald-500/40 to-emerald-500/10': tone === 'success',
        'from-amber-500/40 to-amber-500/10': tone === 'warning',
        'from-red-500/40 to-red-500/10': tone === 'destructive',
        'from-sky-500/40 to-sky-500/10': tone === 'info',
      })} />
    </motion.div>
  );

  return href ? (
    <Link href={href} className="block focus-visible:outline-none">{inner}</Link>
  ) : inner;
}
