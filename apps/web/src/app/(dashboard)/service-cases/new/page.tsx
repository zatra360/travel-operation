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
import { serviceIcon, ServiceTypeInfo } from '@/lib/service-ops';

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

interface ItemDraft {
  serviceAmount: string;
  supplierCost: string;
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

  const setDraft = (code: string, key: keyof ItemDraft, value: string) => {
    setDrafts((d) => ({
      ...d,
      [code]: { serviceAmount: d[code]?.serviceAmount ?? '', supplierCost: d[code]?.supplierCost ?? '', [key]: value },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant) return;
    if (!title.trim()) { setError('Case title is required'); return; }
    if (selected.length === 0) { setError('Select at least one service'); return; }
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
            <CardHeader><CardTitle className="text-base">Estimated Amounts</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {selected.map((code) => {
                const type = types.find((t) => t.systemCode === code);
                const Icon = serviceIcon(type?.icon);
                return (
                  <div key={code} className="grid grid-cols-1 items-end gap-3 rounded-lg border p-3 sm:grid-cols-3">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{type?.displayName ?? code}</span>
                    </div>
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
