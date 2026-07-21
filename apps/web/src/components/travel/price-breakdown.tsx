import { Money } from '@/components/travel/money';
import { cn } from '@/lib/utils';

export interface PriceLine {
  label: string;
  amount: number | string;
  /** Optional per-line note, e.g. "x2 adults". */
  note?: string;
  /** Negative styling for discounts. */
  muted?: boolean;
}

interface PriceBreakdownProps {
  lines: PriceLine[];
  currency?: string;
  /** Extra rows shown above the total (taxes, fees, discounts). */
  adjustments?: PriceLine[];
  total: number | string;
  totalLabel?: string;
  className?: string;
}

/**
 * Structured price breakdown for quotations, bookings and invoices:
 * line items → adjustments → total, with aligned tabular amounts.
 */
export function PriceBreakdown({
  lines,
  adjustments = [],
  total,
  totalLabel = 'Total',
  currency = 'USD',
  className,
}: PriceBreakdownProps) {
  return (
    <div className={cn('rounded-lg border bg-card', className)}>
      <table className="w-full text-sm">
        <tbody>
          {lines.map((line, i) => (
            <tr key={`l-${i}`} className="border-b last:border-0">
              <td className="px-4 py-2.5">
                <span className={cn(line.muted && 'text-muted-foreground')}>{line.label}</span>
                {line.note && <span className="ml-2 text-xs text-muted-foreground">{line.note}</span>}
              </td>
              <td className="px-4 py-2.5 text-right">
                <Money amount={line.amount} currency={currency} />
              </td>
            </tr>
          ))}
          {adjustments.map((adj, i) => (
            <tr key={`a-${i}`} className="border-b last:border-0 text-muted-foreground">
              <td className="px-4 py-2">{adj.label}</td>
              <td className="px-4 py-2 text-right">
                <Money amount={adj.amount} currency={currency} colorNegative />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t bg-muted/40">
            <td className="px-4 py-3 font-semibold">{totalLabel}</td>
            <td className="px-4 py-3 text-right text-base font-bold">
              <Money amount={total} currency={currency} />
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
