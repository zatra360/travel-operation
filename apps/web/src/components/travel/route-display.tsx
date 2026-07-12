import { Plane, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RouteDisplayProps {
  origin?: string | null;
  destination?: string | null;
  /** Optional secondary labels (e.g. city names) under the codes. */
  originLabel?: string | null;
  destinationLabel?: string | null;
  className?: string;
}

/**
 * Compact origin → destination route display for flight/segment contexts.
 * Uses IATA-style codes prominently with optional city subtitles.
 */
export function RouteDisplay({
  origin,
  destination,
  originLabel,
  destinationLabel,
  className,
}: RouteDisplayProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="text-right">
        <div className="font-semibold leading-tight">{origin ?? '—'}</div>
        {originLabel && <div className="text-xs text-muted-foreground leading-tight">{originLabel}</div>}
      </div>
      <div className="relative flex items-center text-muted-foreground">
        <span className="h-px w-4 bg-border" />
        <Plane className="h-3.5 w-3.5 rotate-45" aria-hidden="true" />
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </div>
      <div className="text-left">
        <div className="font-semibold leading-tight">{destination ?? '—'}</div>
        {destinationLabel && (
          <div className="text-xs text-muted-foreground leading-tight">{destinationLabel}</div>
        )}
      </div>
    </div>
  );
}
