'use client';

import * as React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TableToolbarProps {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  /** Filter controls (selects, chips, etc.). */
  filters?: React.ReactNode;
  /** Whether any filter/search is active, to show the reset control. */
  hasActiveFilters?: boolean;
  onReset?: () => void;
  /** Right-aligned actions (export, create, view toggle). */
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Standard list toolbar: search + filters + reset + actions. Replaces the
 * bespoke filter bars each page reinvents, mirroring the script/ filter-box UX
 * (search, filters, reset) with a consistent, responsive layout.
 */
export function TableToolbar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  filters,
  hasActiveFilters,
  onReset,
  actions,
  className,
}: TableToolbarProps) {
  return (
    <div className={cn('flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between', className)}>
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {onSearchChange && (
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search ?? ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-9 pl-8"
              aria-label="Search"
            />
          </div>
        )}
        {filters}
        {hasActiveFilters && onReset && (
          <Button variant="ghost" size="sm" onClick={onReset} className="gap-1 text-muted-foreground">
            <X className="h-3.5 w-3.5" />
            Reset
          </Button>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
