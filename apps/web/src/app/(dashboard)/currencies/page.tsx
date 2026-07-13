'use client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Trash2, Coins } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

export default function CurrenciesPage() {
  const { activeTenant } = useAuthStore();
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ code: '', name: '', symbol: '', exchangeRate: 1, decimalPlaces: 2 });

  const load = () => {
    if (!activeTenant) return;
    api.get('/api/v1/tenant/currencies', { tenantId: activeTenant.id }).then((d: any) => setCurrencies(d)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [activeTenant]);

  const add = async () => {
    if (!form.code || !form.name) return toast.error('Code and name required');
    try {
      await api.post('/api/v1/tenant/currencies', form, { tenantId: activeTenant!.id });
      toast.success('Currency added');
      setForm({ code: '', name: '', symbol: '', exchangeRate: 1, decimalPlaces: 2 });
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const remove = async (id: string) => {
    try { await api.delete(`/api/v1/tenant/currencies/${id}`, { tenantId: activeTenant!.id }); toast.success('Removed'); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  if (loading) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-6">
      <PageHeader title="Currencies" subtitle="Manage currencies and exchange rates" />
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Coins className="h-4 w-4" />Add Currency</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Input placeholder="Code" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} className="w-20" />
            <Input placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-36" />
            <Input placeholder="Symbol" value={form.symbol} onChange={e => setForm({ ...form, symbol: e.target.value })} className="w-16" />
            <Input placeholder="Rate" type="number" step="0.0001" value={form.exchangeRate || ''} onChange={e => setForm({ ...form, exchangeRate: Number(e.target.value) })} className="w-24" />
            <Button size="sm" onClick={add}><Plus className="h-4 w-4 mr-1" />Add</Button>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-2">
        {currencies.map((c: any) => (
          <div key={c.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
            <div className="flex items-center gap-3">
              <span className="font-bold text-lg">{c.code}</span>
              <span className="text-muted-foreground">{c.name}</span>
              <span>{c.symbol}</span>
              <span className="text-sm text-muted-foreground">1 USD = {Number(c.exchangeRate).toFixed(4)} {c.code}</span>
              <span className="text-xs text-muted-foreground">({c.decimalPlaces} decimals)</span>
              {c.isDefault && <Badge>Default</Badge>}
            </div>
            <Button variant="ghost" size="icon" onClick={() => remove(c.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}
