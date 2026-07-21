'use client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Coins className="h-4 w-4" />Add Currency</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6 items-end">
            <div className="space-y-2">
              <Label htmlFor="cur-code" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Code <span className="text-destructive">*</span></Label>
              <Input id="cur-code" placeholder="USD" maxLength={3} value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cur-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name <span className="text-destructive">*</span></Label>
              <Input id="cur-name" placeholder="US Dollar" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cur-symbol" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Symbol</Label>
              <Input id="cur-symbol" placeholder="$" value={form.symbol} onChange={e => setForm({ ...form, symbol: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cur-rate" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Exchange Rate</Label>
              <Input id="cur-rate" placeholder="1.0000" type="number" step="0.0001" min={0} value={form.exchangeRate || ''} onChange={e => setForm({ ...form, exchangeRate: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cur-decimals" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Decimals</Label>
              <Input id="cur-decimals" type="number" min={0} max={6} value={form.decimalPlaces} onChange={e => setForm({ ...form, decimalPlaces: Number(e.target.value) })} />
            </div>
            <Button size="sm" onClick={add} className="w-fit"><Plus className="h-4 w-4 mr-1" />Add Currency</Button>
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
