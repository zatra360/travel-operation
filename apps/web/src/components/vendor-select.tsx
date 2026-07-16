'use client';
import { useEffect, useState } from 'react';
import { Combobox } from '@/components/ui/select';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

interface VendorSelectProps {
  value?: string;
  onChange: (value: string) => void;
  vendorType?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function VendorSelect({ value, onChange, vendorType, placeholder = 'Select vendor…', disabled }: VendorSelectProps) {
  const { activeTenant } = useAuthStore();
  const [options, setOptions] = useState<{ value: string; label: string; hint?: string }[]>([]);

  useEffect(() => {
    if (!activeTenant) return;
    const params = new URLSearchParams({ limit: '200' });
    if (vendorType) params.set('vendorType', vendorType);
    api.get<{ data: any[] }>(`/api/v1/tenant/vendors?${params}`, { tenantId: activeTenant.id })
      .then((res) => {
        setOptions(res.data.map((v: any) => ({
          value: v.id,
          label: v.name,
          hint: `${v.vendorType}${v.city ? ` · ${v.city}` : ''}`,
        })));
      })
      .catch(() => {});
  }, [activeTenant, vendorType]);

  return <Combobox options={options} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled} emptyText="No vendors found" />;
}
