'use client';

import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { ServiceTypeInfo, serviceIcon } from '@/lib/service-ops';

interface Props {
  value: string[];
  onChange: (codes: string[]) => void;
  multiple?: boolean;
  className?: string;
}

/**
 * Reusable card-grid service selector: search, icons, selected state,
 * keyboard navigation, tenant-enabled filtering, optional multi-select.
 */
export function ServiceSelector({ value, onChange, multiple = true, className }: Props) {
  const { activeTenant } = useAuthStore();
  const [types, setTypes] = useState<ServiceTypeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!activeTenant) return;
    api
      .get<ServiceTypeInfo[]>('/api/v1/tenant/service-types', { tenantId: activeTenant.id })
      .then(setTypes)
      .catch(() => setTypes([]))
      .finally(() => setLoading(false));
  }, [activeTenant]);

  const filtered = useMemo(() => {
    if (!search.trim()) return types;
    const q = search.trim().toLowerCase();
    return types.filter(
      (t) => t.displayName.toLowerCase().includes(q) || t.systemCode.toLowerCase().includes(q) || t.category.toLowerCase().includes(q),
    );
  }, [types, search]);

  const toggle = (code: string) => {
    if (multiple) {
      onChange(value.includes(code) ? value.filter((c) => c !== code) : [...value, code]);
    } else {
      onChange(value.includes(code) ? [] : [code]);
    }
  };

  if (loading) {
    return (
      <div className={cn('grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4', className)}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search services…"
          className="pl-9"
          aria-label="Search services"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No services match your search.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" role="listbox" aria-multiselectable={multiple}>
          {filtered.map((type) => {
            const Icon = serviceIcon(type.icon);
            const selected = value.includes(type.systemCode);
            return (
              <button
                key={type.systemCode}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => toggle(type.systemCode)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggle(type.systemCode);
                  }
                }}
                className={cn(
                  'relative flex min-h-[6rem] flex-col items-center justify-center gap-2 rounded-lg border p-3 text-center transition-colors',
                  'hover:border-primary/60 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  selected ? 'border-primary bg-primary/5' : 'border-input',
                )}
              >
                {selected && (
                  <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3 w-3" />
                  </span>
                )}
                <Icon className={cn('h-6 w-6', selected ? 'text-primary' : 'text-muted-foreground')} />
                <span className="text-xs font-medium leading-tight">{type.displayName}</span>
                <Badge variant="outline" className="text-[9px] px-1 py-0">{type.category}</Badge>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
