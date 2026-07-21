'use client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { Package, Plus, Check, Crown } from 'lucide-react';
import { formatMoney } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';

export default function PlatformPackagesPage() {
  const [packages, setPackages] = useState<any[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', code: '', description: '', priceMonthly: 0, priceYearly: 0, maxUsers: 5, maxBranches: 1 });
  const [assignForm, setAssignForm] = useState({ tenantId: '', packageId: '', status: 'ACTIVE', billingCycle: 'MONTHLY' });

  useEffect(() => {
    Promise.all([
      api.get<any[]>('/api/v1/platform/packages'),
      api.get<any[]>('/api/v1/platform/subscriptions'),
      api.get<any>('/api/v1/platform/tenants?limit=200'),
    ]).then(([p, s, t]) => {
      setPackages(p);
      setSubs(s);
      setTenants(t.data || []);
    }).finally(() => setLoading(false));
  }, []);

  const createPackage = async () => {
    if (!form.name || !form.code) return toast.error('Name and code required');
    try {
      await api.post('/api/v1/platform/packages', form);
      toast.success('Package created');
      setForm({ name: '', code: '', description: '', priceMonthly: 0, priceYearly: 0, maxUsers: 5, maxBranches: 1 });
      const p = await api.get<any[]>('/api/v1/platform/packages');
      setPackages(p);
    } catch (e: any) { toast.error(e.message); }
  };

  const assignPackage = async () => {
    if (!assignForm.tenantId || !assignForm.packageId) return toast.error('Select tenant and package');
    try {
      await api.post('/api/v1/platform/subscriptions', assignForm);
      toast.success('Subscription updated');
      const s = await api.get<any[]>('/api/v1/platform/subscriptions');
      setSubs(s);
    } catch (e: any) { toast.error(e.message); }
  };

  const cancelSub = async (id: string) => {
    try {
      await api.post(`/api/v1/platform/subscriptions/${id}/cancel`, {});
      toast.success('Cancelled');
      const s = await api.get<any[]>('/api/v1/platform/subscriptions');
      setSubs(s);
    } catch (e: any) { toast.error(e.message); }
  };

  if (loading) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-6">
      <PageHeader title="Packages & Subscriptions" subtitle="Manage pricing plans and tenant subscriptions" />
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Package className="h-4 w-4" />Packages</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            <Input placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-32" />
            <Input placeholder="Code" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} className="w-24" />
            <Input placeholder="Monthly $" type="number" value={form.priceMonthly || ''} onChange={e => setForm({ ...form, priceMonthly: Number(e.target.value) })} className="w-24" />
            <Input placeholder="Yearly $" type="number" value={form.priceYearly || ''} onChange={e => setForm({ ...form, priceYearly: Number(e.target.value) })} className="w-24" />
            <Input placeholder="Max Users" type="number" value={form.maxUsers} onChange={e => setForm({ ...form, maxUsers: Number(e.target.value) })} className="w-20" />
            <Input placeholder="Max Branches" type="number" value={form.maxBranches} onChange={e => setForm({ ...form, maxBranches: Number(e.target.value) })} className="w-20" />
            <Button size="sm" onClick={createPackage}><Plus className="h-4 w-4 mr-1" />Create</Button>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {packages.map((p: any) => (
              <div key={p.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  {p.code === 'ENTERPRISE' ? <Crown className="h-4 w-4 text-warning" /> : <Package className="h-4 w-4 text-primary" />}
                  <span className="font-semibold">{p.name}</span>
                  <Badge variant={p.isActive ? 'default' : 'secondary'} className="text-xs ml-auto">{p.isActive ? 'Active' : 'Inactive'}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{p.description}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{p.priceMonthly > 0 ? formatMoney(p.priceMonthly, 'USD') : 'Free'}</span>
                  <span className="text-xs text-muted-foreground">/mo</span>
                </div>
                <p className="text-xs text-muted-foreground">{p.maxUsers} users · {p.maxBranches} branches · {p._count?.subscriptions || 0} active</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Assign Subscription</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Select value={assignForm.tenantId || '__'} onValueChange={v => setAssignForm({ ...assignForm, tenantId: v === '__' ? '' : v })}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Select tenant" /></SelectTrigger>
              <SelectContent>{tenants.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={assignForm.packageId || '__'} onValueChange={v => setAssignForm({ ...assignForm, packageId: v === '__' ? '' : v })}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Select package" /></SelectTrigger>
              <SelectContent>{packages.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={assignForm.billingCycle} onValueChange={v => setAssignForm({ ...assignForm, billingCycle: v })}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="MONTHLY">Monthly</SelectItem><SelectItem value="YEARLY">Yearly</SelectItem></SelectContent>
            </Select>
            <Button size="sm" onClick={assignPackage}><Check className="h-4 w-4 mr-1" />Assign</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Check className="h-4 w-4" />Active Subscriptions ({subs.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {subs.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{s.tenant?.name}</span>
                  <Badge variant="outline">{s.package?.name}</Badge>
                  <span className="text-xs text-muted-foreground">{s.billingCycle}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={s.status === 'ACTIVE' ? 'success' : s.status === 'CANCELLED' ? 'destructive' : 'secondary'} className="text-xs">{s.status}</Badge>
                  {s.status === 'ACTIVE' && <Button variant="ghost" size="sm" onClick={() => cancelSub(s.id)} className="text-xs text-destructive">Cancel</Button>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
