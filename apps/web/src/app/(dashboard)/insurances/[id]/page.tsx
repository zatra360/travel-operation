'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader, Breadcrumb } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Shield, CalendarDays, DollarSign, Building2, Plane, Pencil, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate, formatMoney } from '@/lib/utils';
import { toast } from 'sonner';

const TYPE_LABELS: Record<string, string> = { TRAVEL: 'Travel', MEDICAL: 'Medical', CANCELLATION: 'Cancellation', BAGGAGE: 'Baggage', COMPREHENSIVE: 'Comprehensive' };

export default function InsuranceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { activeTenant } = useAuthStore();
  const [policy, setPolicy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState<any>({});

  const load = () => {
    if (!activeTenant) return;
    api.get(`/api/v1/tenant/insurances/${params.id}`, { tenantId: activeTenant.id })
      .then(setPolicy).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [activeTenant]);

  const startEdit = () => { setForm({ insuranceType: policy.insuranceType, coverage: policy.coverage || '', premium: Number(policy.premium), sumInsured: Number(policy.sumInsured), startDate: policy.startDate?.slice(0, 10) || '', endDate: policy.endDate?.slice(0, 10) || '', notes: policy.notes || '', status: policy.status }); setEditing(true); };

  const save = async () => {
    if (!activeTenant) return;
    await api.put(`/api/v1/tenant/insurances/${params.id}`, form, { tenantId: activeTenant.id });
    toast.success('Updated'); setEditing(false); load();
  };

  const remove = async () => {
    if (!activeTenant) return;
    await api.delete(`/api/v1/tenant/insurances/${params.id}`, { tenantId: activeTenant.id });
    toast.success('Deleted'); router.push('/insurances');
  };

  if (loading) return <Skeleton className="h-96" />;
  if (!policy) return <p className="text-muted-foreground">Policy not found.</p>;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Insurance', href: '/insurances' }, { label: `Policy ${policy.policyNumber}` }]} />
      <PageHeader
        title={`Policy ${policy.policyNumber}`}
        subtitle={TYPE_LABELS[policy.insuranceType] || policy.insuranceType}
        actions={<><Button variant="outline" size="sm" onClick={startEdit}><Pencil className="h-3 w-3 mr-1" />Edit</Button><Button variant="destructive" size="sm" onClick={() => setDeleting(true)}><Trash2 className="h-3 w-3 mr-1" />Delete</Button></>}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Policy Details</CardTitle></CardHeader>
          <CardContent>
            {editing ? (
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</Label><select className="flex h-10 w-full rounded-md border px-3 py-2 text-sm" value={form.insuranceType} onChange={e => setForm({ ...form, insuranceType: e.target.value })}>{Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</Label><select className="flex h-10 w-full rounded-md border px-3 py-2 text-sm" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option value="ACTIVE">Active</option><option value="EXPIRED">Expired</option><option value="CANCELLED">Cancelled</option><option value="CLAIMED">Claimed</option></select></div>
                <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Premium</Label><Input type="number" value={form.premium} onChange={e => setForm({ ...form, premium: Number(e.target.value) })} /></div>
                <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sum Insured</Label><Input type="number" value={form.sumInsured} onChange={e => setForm({ ...form, sumInsured: Number(e.target.value) })} /></div>
                <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Coverage</Label><Input value={form.coverage} onChange={e => setForm({ ...form, coverage: e.target.value })} /></div>
                <div />
                <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Start Date</Label><Input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} /></div>
                <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">End Date</Label><Input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} /></div>
                <div className="col-span-2"><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
                <div className="col-span-2 flex gap-2"><Button onClick={save}>Save</Button><Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button></div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-muted-foreground">Type</p><p className="font-medium">{TYPE_LABELS[policy.insuranceType] || policy.insuranceType}</p></div>
                <div><p className="text-xs text-muted-foreground">Status</p><Badge variant={policy.status === 'ACTIVE' ? 'success' : 'secondary'}>{policy.status}</Badge></div>
                <div><p className="text-xs text-muted-foreground">Premium</p><p className="font-medium">{formatMoney(Number(policy.premium), policy.currencyCode)}</p></div>
                <div><p className="text-xs text-muted-foreground">Sum Insured</p><p className="font-medium">{formatMoney(Number(policy.sumInsured), policy.currencyCode)}</p></div>
                <div><p className="text-xs text-muted-foreground">Coverage</p><p>{policy.coverage || '—'}</p></div>
                <div><p className="text-xs text-muted-foreground">Period</p><p className="text-sm">{policy.startDate ? formatDate(policy.startDate) : '—'} — {policy.endDate ? formatDate(policy.endDate) : '—'}</p></div>
                {policy.notes && <div className="col-span-2"><p className="text-xs text-muted-foreground">Notes</p><p className="text-sm">{policy.notes}</p></div>}
              </div>
            )}
          </CardContent>
        </Card>
        <div className="space-y-4">
          {policy.client && (
            <Card><CardHeader><CardTitle className="text-sm flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />Client</CardTitle></CardHeader><CardContent><p className="font-medium">{policy.client.displayName}</p></CardContent></Card>
          )}
          {policy.booking && (
            <Card><CardHeader><CardTitle className="text-sm flex items-center gap-1"><Plane className="h-3.5 w-3.5" />Booking</CardTitle></CardHeader><CardContent><p className="font-medium">{policy.booking.bookingRef}</p></CardContent></Card>
          )}
          {policy.provider && (
            <Card><CardHeader><CardTitle className="text-sm flex items-center gap-1"><Shield className="h-3.5 w-3.5" />Provider</CardTitle></CardHeader><CardContent><p className="font-medium">{policy.provider.name}</p></CardContent></Card>
          )}
        </div>
      </div>

      <ConfirmDialog open={deleting} onOpenChange={setDeleting} title="Delete policy?" description={`Delete "${policy?.policyNumber}"?`} confirmLabel="Delete" onConfirm={remove} />
    </div>
  );
}
