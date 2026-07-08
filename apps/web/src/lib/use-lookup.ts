'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from './api';
import { useAuthStore } from '@/stores/auth-store';

interface LookupItem {
  code: string; name: string; displayName: string;
  color?: string | null; icon?: string | null;
  isCustom: boolean; source: string; isActive: boolean;
}

const cache = new Map<string, LookupItem[]>();

export function useLookup(categoryCode: string, branchId?: string) {
  const { activeTenant } = useAuthStore();
  const [items, setItems] = useState<LookupItem[]>([]);
  const [loading, setLoading] = useState(true);

  const cacheKey = `${activeTenant?.id ?? 'no-tenant'}-${categoryCode}-${branchId || ''}`;

  const load = useCallback(() => {
    if (!activeTenant) { setLoading(false); return; }
    if (cache.has(cacheKey)) { setItems(cache.get(cacheKey)!); setLoading(false); return; }
    setLoading(true);
    api.get<LookupItem[]>(`/api/v1/tenant/master-data/lookup/${categoryCode}${branchId ? `?branchId=${branchId}` : ''}`, { tenantId: activeTenant.id })
      .then((data) => { cache.set(cacheKey, data); setItems(data); })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [activeTenant, categoryCode, branchId, cacheKey]);

  useEffect(() => { load(); }, [load]);

  const invalidate = () => { cache.delete(cacheKey); load(); };
  return { items, loading, invalidate };
}

export function useLookups(categoryCodes: string[], branchId?: string) {
  const { activeTenant } = useAuthStore();
  const [result, setResult] = useState<Record<string, LookupItem[]>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!activeTenant) { setLoading(false); return; }
    const uncached = categoryCodes.filter((c) => !cache.has(`${activeTenant.id}-${c}-${branchId || ''}`));
    if (uncached.length === 0) {
      const r: Record<string, LookupItem[]> = {};
      for (const c of categoryCodes) r[c] = cache.get(`${activeTenant.id}-${c}-${branchId || ''}`)!;
      setResult(r); setLoading(false); return;
    }
    setLoading(true);
    api.get<Record<string, LookupItem[]>>(`/api/v1/tenant/master-data/lookup?categories=${categoryCodes.join(',')}${branchId ? `&branchId=${branchId}` : ''}`, { tenantId: activeTenant.id })
      .then((data) => {
        for (const [k, v] of Object.entries(data)) cache.set(`${activeTenant.id}-${k}-${branchId || ''}`, v);
        setResult(data);
      })
      .catch(() => setResult({}))
      .finally(() => setLoading(false));
  }, [activeTenant, categoryCodes.join(','), branchId]);

  useEffect(() => { load(); }, [load]);
  return { result, loading };
}
