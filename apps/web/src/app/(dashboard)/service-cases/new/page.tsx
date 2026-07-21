'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Combobox, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Breadcrumb, PageHeader } from '@/components/ui/page-header';
import { ServiceSelector } from '@/components/service-selector';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { serviceIcon, ServiceTypeInfo, IntakeField } from '@/lib/service-ops';

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

interface ItemDraft {
  serviceAmount: string;
  supplierCost: string;
  intake: Record<string, string>;
}

export default function NewServiceCasePage() {
  const router = useRouter();
  const { activeTenant, activeBranch } = useAuthStore();
  const [title, setTitle] = useState('');
  const [clientId, setClientId] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [currencyCode, setCurrencyCode] = useState('USD');
  const [selected, setSelected] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<Record<string, ItemDraft>>({});
  const [clients, setClients] = useState<Array<{ value: string; label: string }>>([]);
  const [types, setTypes] = useState<ServiceTypeInfo[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!activeTenant) return;
    api.get<any>('/api/v1/tenant/clients?limit=200', { tenantId: activeTenant.id })
      .then((res) => setClients((res.data ?? []).map((c: any) => ({ value: c.id, label: c.displayName }))))
      .catch(() => setClients([]));
    api.get<ServiceTypeInfo[]>('/api/v1/tenant/service-types', { tenantId: activeTenant.id })
      .then(setTypes)
      .catch(() => setTypes([]));
  }, [activeTenant]);

  const setDraft = (code: string, key: 'serviceAmount' | 'supplierCost', value: string) => {
    setDrafts((d) => ({
      ...d,
      [code]: { serviceAmount: d[code]?.serviceAmount ?? '', supplierCost: d[code]?.supplierCost ?? '', intake: d[code]?.intake ?? {}, [key]: value },
    }));
  };

  const setIntake = (code: string, fieldKey: string, value: string) => {
    setDrafts((d) => ({
      ...d,
      [code]: {
        serviceAmount: d[code]?.serviceAmount ?? '',
        supplierCost: d[code]?.supplierCost ?? '',
        intake: { ...(d[code]?.intake ?? {}), [fieldKey]: value },
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant) return;
    if (!title.trim()) { setError('Case title is required'); return; }
    if (selected.length === 0) { setError('Select at least one service'); return; }
    for (const code of selected) {
      const fields = types.find((t) => t.systemCode === code)?.intakeFields ?? [];
      const missing = fields.filter((f) => f.required && !(drafts[code]?.intake?.[f.key] ?? '').trim());
      if (missing.length > 0) {
        setError(`${types.find((t) => t.systemCode === code)?.displayName ?? code}: ${missing.map((f) => f.label).join(', ')} required`);
        return;
      }
    }
    setSaving(true);
    setError('');

    try {
      const created = await api.post<any>('/api/v1/tenant/service-cases', {
        title: title.trim(),
        clientId: clientId || undefined,
        priority,
        currencyCode,
        items: selected.map((code) => ({
          serviceTypeCode: code,
          serviceAmount: Number(drafts[code]?.serviceAmount || 0),
          supplierCost: Number(drafts[code]?.supplierCost || 0),
          currencyCode,
          metadata: Object.fromEntries(
            Object.entries(drafts[code]?.intake ?? {}).filter(([, v]) => v !== ''),
          ),
        })),
      }, { tenantId: activeTenant.id, branchId: activeBranch?.id });
      toast.success(`Case ${created.caseNumber} created`);
      router.push(`/service-cases/${created.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create case');
      toast.error(err.message || 'Failed to create case');
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Breadcrumb items={[{ label: 'Service Cases', href: '/service-cases' }, { label: 'New Case' }]} />
      <PageHeader title="New Service Case" subtitle="Bundle one or more travel services into a single operational case" />

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

        <Card>
          <CardHeader><CardTitle className="text-base">Case Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="case-title" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input id="case-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Dubai trip for the Rahman family" required />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Client</Label>
              <Combobox options={clients} value={clientId} onChange={setClientId} placeholder="Select client (optional)" searchPlaceholder="Search clients…" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="case-currency" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Currency</Label>
                <Input id="case-currency" value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())} maxLength={3} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Services <span className="text-destructive">*</span></CardTitle>
          </CardHeader>
          <CardContent>
            <ServiceSelector value={selected} onChange={setSelected} multiple />
          </CardContent>
        </Card>

        {selected.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Service Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {selected.map((code) => {
                const type = types.find((t) => t.systemCode === code);
                const Icon = serviceIcon(type?.icon);
                const fields = type?.intakeFields ?? [];
                return (
                  <div key={code} className="space-y-3 rounded-lg border p-4">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-semibold">{type?.displayName ?? code}</span>
                    </div>

                    {fields.length > 0 && (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {fields.map((field) => (
                          <IntakeFieldInput
                            key={field.key}
                            field={field}
                            value={drafts[code]?.intake?.[field.key] ?? ''}
                            onChange={(v) => setIntake(code, field.key, v)}
                          />
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 border-t pt-3 sm:max-w-md">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Selling price</Label>
                        <Input
                          type="number" min={0} step="0.01" placeholder="0.00"
                          value={drafts[code]?.serviceAmount ?? ''}
                          onChange={(e) => setDraft(code, 'serviceAmount', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Supplier cost</Label>
                        <Input
                          type="number" min={0} step="0.01" placeholder="0.00"
                          value={drafts[code]?.supplierCost ?? ''}
                          onChange={(e) => setDraft(code, 'supplierCost', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.push('/service-cases')} disabled={saving}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Creating…' : `Create case${selected.length > 1 ? ` (${selected.length} services)` : ''}`}</Button>
        </div>
      </form>
    </div>
  );
}

function IntakeFieldInput({ field, value, onChange }: { field: IntakeField; value: string; onChange: (v: string) => void }) {
  const label = (
    <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      {field.label} {field.required && <span className="text-destructive">*</span>}
    </Label>
  );

  if (field.type === 'select') {
    return (
      <div className="space-y-1">
        {label}
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((o) => (
              <SelectItem key={o} value={o}>{o.replace(/_/g, ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {label}
      <Input
        type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
        min={field.type === 'number' ? 0 : undefined}
        value={value}
        placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
