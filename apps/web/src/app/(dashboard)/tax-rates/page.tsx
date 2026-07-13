'use client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Trash2, Percent } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

export default function TaxRatesPage() {
  const { activeTenant } = useAuthStore();
  const [rates, setRates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', code: '', rate: 0, countryCode: '', isDefault: false });

  const load = () => {
    if (!activeTenant) return;
    api.get('/api/v1/tenant/tax-rates', { tenantId: activeTenant.id }).then((d: any) => setRates(d)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [activeTenant]);

  const add = async () => {
    if (!form.name || !form.code || form.rate <= 0) return toast.error('Fill all fields');
    try {
      await api.post('/api/v1/tenant/tax-rates', form, { tenantId: activeTenant!.id });
      toast.success('Tax rate added');
      setForm({ name: '', code: '', rate: 0, countryCode: '', isDefault: false });
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const remove = async (id: string) => {
    try { await api.delete(`/api/v1/tenant/tax-rates/${id}`, { tenantId: activeTenant!.id }); toast.success('Removed'); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  if (loading) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-6">
      <PageHeader title="Tax Rates" subtitle="Configure tax rates for your operations" />
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Percent className="h-4 w-4" />Add Rate</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Input placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-36" />
            <Input placeholder="Code" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} className="w-28" />
            <Input placeholder="Rate %" type="number" step="0.01" value={form.rate || ''} onChange={e => setForm({ ...form, rate: Number(e.target.value) })} className="w-20" />
            <Input placeholder="Country" value={form.countryCode} onChange={e => setForm({ ...form, countryCode: e.target.value.toUpperCase() })} className="w-20" />
            <Button size="sm" onClick={add}><Plus className="h-4 w-4 mr-1" />Add</Button>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-2">
        {rates.map((r: any) => (
          <div key={r.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
            <div className="flex items-center gap-3">
              <span className="font-medium">{r.name}</span>
              <span className="text-muted-foreground">{r.code}</span>
              <span className="font-bold text-lg tabular-nums">{Number(r.rate)}%</span>
              {r.countryCode && <Badge variant="outline">{r.countryCode}</Badge>}
              {r.isDefault && <Badge>Default</Badge>}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={r.isActive ? 'default' : 'secondary'} className="text-xs">{r.isActive ? 'Active' : 'Inactive'}</Badge>
              <Button variant="ghost" size="icon" onClick={() => remove(r.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
