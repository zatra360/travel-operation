'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from './api';

interface ComboboxOption {
  value: string;
  label: string;
  hint?: string;
}

const cache = new Map<string, ComboboxOption[]>();

function useRefData(endpoint: string, search?: string) {
  const [options, setOptions] = useState<ComboboxOption[]>([]);
  const [loading, setLoading] = useState(false);

  const cacheKey = `${endpoint}-${search || ''}`;

  const load = useCallback(() => {
    if (cache.has(cacheKey)) { setOptions(cache.get(cacheKey)!); return; }
    setLoading(true);
    const params = new URLSearchParams({ limit: '200' });
    if (search) params.set('search', search);
    api.get<any>(`/api/v1/master-data/reference/${endpoint}?${params.toString()}`)
      .then((res) => {
        const list = (res.data || []).map((item: any) => ({
          value: item.id,
          label: item.name || item.iataCode,
          hint: item.iataCode || item.iso2 || item.code || undefined,
        }));
        cache.set(cacheKey, list);
        setOptions(list);
      })
      .catch(() => setOptions([]))
      .finally(() => setLoading(false));
  }, [cacheKey, endpoint, search]);

  useEffect(() => { load(); }, [load]);

  return { options, loading };
}

export function useCountries(search?: string) { return useRefData('countries', search); }
export function useAirlines(search?: string) { return useRefData('airlines', search); }
export function useAirports(search?: string) { return useRefData('airports', search); }
export function useNationalities(search?: string) { return useRefData('nationalities', search); }
export function useCurrencies(search?: string) { return useRefData('currencies', search); }
export function useTimezones(search?: string) { return useRefData('timezones', search); }
