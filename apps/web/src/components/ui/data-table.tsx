'use client';

import * as React from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { TableSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';

export interface DataTableColumn<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
  headerClassName?: string;
  sortable?: boolean;
  /** Hide this column below the `sm` breakpoint. */
  hideOnMobile?: boolean;
}

export interface SortState {
  key: string;
  dir: 'asc' | 'desc';
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  onRowClick?: (row: T) => void;
  sort?: SortState;
  onSortChange?: (sort: SortState) => void;
  /** Optional stacked-card renderer used on very small screens. */
  mobileCard?: (row: T) => React.ReactNode;
  className?: string;
}

const alignClass = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
} as const;

export function DataTable<T>({
  columns,
  data,
  rowKey,
  loading,
  emptyTitle = 'Nothing here yet',
  emptyDescription,
  emptyAction,
  onRowClick,
  sort,
  onSortChange,
  mobileCard,
  className,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <TableSkeleton rows={6} cols={Math.min(columns.length, 6)} />
      </div>
    );
  }

  if (!data.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  }

  const toggleSort = (key: string) => {
    if (!onSortChange) return;
    const dir: SortState['dir'] = sort?.key === key && sort.dir === 'asc' ? 'desc' : 'asc';
    onSortChange({ key, dir });
  };

  return (
    <div className={cn('rounded-lg border bg-card', className)}>
      {/* Stacked cards on mobile when a renderer is provided */}
      {mobileCard && (
        <div className="divide-y sm:hidden">
          {data.map((row) =>
            onRowClick ? (
              <button
                key={rowKey(row)}
                type="button"
                onClick={() => onRowClick(row)}
                className="block w-full p-4 text-left hover:bg-muted/50"
              >
                {mobileCard(row)}
              </button>
            ) : (
              <div key={rowKey(row)} className="p-4">
                {mobileCard(row)}
              </div>
            ),
          )}
        </div>
      )}

      <div className={cn('overflow-x-auto', mobileCard && 'hidden sm:block')}>
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-muted/50">
            <tr className="border-b">
              {columns.map((col) => {
                const isSorted = sort?.key === col.key;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    className={cn(
                      'px-4 py-3 font-medium text-muted-foreground whitespace-nowrap',
                      alignClass[col.align ?? 'left'],
                      col.hideOnMobile && 'hidden md:table-cell',
                      col.headerClassName,
                    )}
                  >
                    {col.sortable && onSortChange ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key)}
                        className="inline-flex items-center gap-1 hover:text-foreground"
                        aria-label={`Sort by ${typeof col.header === 'string' ? col.header : col.key}`}
                      >
                        {col.header}
                        {isSorted ? (
                          sort!.dir === 'asc' ? (
                            <ArrowUp className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowDown className="h-3.5 w-3.5" />
                          )
                        ) : (
                          <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'border-b last:border-0',
                  onRowClick && 'cursor-pointer hover:bg-muted/50',
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-4 py-3 align-middle',
                      alignClass[col.align ?? 'left'],
                      col.hideOnMobile && 'hidden md:table-cell',
                      col.className,
                    )}
                  >
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
