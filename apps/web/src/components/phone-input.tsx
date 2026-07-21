'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useCountries } from '@/lib/use-ref-data';

const TOP_CODES = ['+1', '+44', '+971', '+966', '+880', '+91', '+92', '+60', '+65', '+90', '+20', '+81', '+61', '+49', '+33'];

export function PhoneInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const { options: countries } = useCountries();
  const allCodes = [...new Set([...TOP_CODES, ...countries.filter(c => c.hint).map(c => c.hint || '')])];

  const dialCode = value?.match(/^\+[\d]+/) ? value.match(/^\+[\d]+/)![0] : '';
  const number = dialCode ? value.replace(dialCode, '').trim() : (value || '');

  const handleDial = (code: string) => {
    if (code === 'none') { onChange(number); return; }
    const clean = number.trim();
    onChange(clean ? `${code} ${clean}` : code);
  };

  const handleNumber = (v: string) => {
    onChange(dialCode ? `${dialCode} ${v}` : v);
  };

  return (
    <div className="flex gap-1 mt-1">
      <Select value={dialCode || 'none'} onValueChange={handleDial}>
        <SelectTrigger className="w-[72px] shrink-0 h-9 px-2 text-xs"><SelectValue placeholder="Code" /></SelectTrigger>
        <SelectContent className="max-h-48">
          {allCodes.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
        </SelectContent>
      </Select>
      <Input value={number} onChange={e => handleNumber(e.target.value)} placeholder={placeholder || 'Phone number'} className="h-9 flex-1" />
    </div>
  );
}
