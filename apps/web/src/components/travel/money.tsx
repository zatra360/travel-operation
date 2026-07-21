import { cn } from '@/lib/utils';

function toNumber(amount: number | string | null | undefined): number {
  if (amount === null || amount === undefined) return 0;
  const n = typeof amount === 'string' ? Number(amount) : amount;
  return Number.isFinite(n) ? n : 0;
}

/** Safe currency formatting that never throws on an unknown currency code. */
export function formatMoney(amount: number | string | null | undefined, currency = 'USD'): string {
  const value = toNumber(amount);
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${(currency || '').toUpperCase()} ${value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`.trim();
  }
}

interface MoneyProps {
  amount: number | string | null | undefined;
  currency?: string;
  /** Render negative amounts in the destructive colour. */
  colorNegative?: boolean;
  /** Base-currency equivalent shown muted beneath, when it differs from `currency`. */
  baseAmount?: number | string | null;
  baseCurrency?: string;
  className?: string;
}

/**
 * Consistent, right-alignable monetary value with tabular figures so amounts
 * line up in tables. Multi-currency aware: when a differing base-currency
 * equivalent is provided it is shown as a muted secondary line.
 */
export function Money({ amount, currency = 'USD', colorNegative, baseAmount, baseCurrency, className }: MoneyProps) {
  const value = toNumber(amount);
  const negative = value < 0;
  const showBase =
    baseAmount !== undefined &&
    baseAmount !== null &&
    baseCurrency !== undefined &&
    baseCurrency !== currency;
  return (
    <span className={cn('inline-flex flex-col items-end', className)}>
      <span
        className={cn(
          'tabular-nums whitespace-nowrap',
          colorNegative && negative && 'text-destructive',
        )}
      >
        {formatMoney(value, currency)}
      </span>
      {showBase && (
        <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
          ≈ {formatMoney(baseAmount, baseCurrency)}
        </span>
      )}
    </span>
  );
}
