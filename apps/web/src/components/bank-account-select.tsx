'use client';
import { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

interface Props {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function BankAccountSelect({ value, onChange, placeholder = 'Select account…', disabled }: Props) {
  const { activeTenant } = useAuthStore();
  const [accounts, setAccounts] = useState<any[]>([]);

  useEffect(() => {
    if (!activeTenant) return;
    api.get<any[]>('/api/v1/tenant/banking/accounts', { tenantId: activeTenant.id })
      .then(setAccounts).catch(() => {});
  }, [activeTenant]);

  return (
    <Select value={value || ''} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        {accounts.map((a: any) => (
          <SelectItem key={a.id} value={a.id}>
            {a.bankName} — {a.accountName} ({a.accountNumber.slice(-4)})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
