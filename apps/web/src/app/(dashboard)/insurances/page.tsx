'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Pagination } from '@/components/ui/pagination';
import { Shield, Plus, Pencil, Trash2, CalendarDays, DollarSign } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { VendorSelect } from '@/components/vendor-select';
import { formatDate, formatMoney } from '@/lib/utils';
import { toast } from 'sonner';

const TYPE_LABELS: Record<string, string> = {
  TRAVEL: 'Travel', MEDICAL: 'Medical', CANCELLATION: 'Cancellation',
  BAGGAGE: 'Baggage', COMPREHENSIVE: 'Comprehensive',
};

export default function InsurancePage() {
  const { activeTenant } = useAuthStore();
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ policyNumber: '', insuranceType: 'TRAVEL', providerId: '', clientId: '', bookingId: '', premium: 0, sumInsured: 0, coverage: '', startDate: '', endDate: '', notes: '' });
  const [deleting, setDeleting] = useState<any>(null);

  const load = () => {
    if (!activeTenant) return;
    setLoading(true);
    api.get(`/api/v1/tenant/insurances?page=${page}&limit=20`, { tenantId: activeTenant.id })
      .then((res: any) => { setData(res.data); setMeta(res); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [activeTenant, page]);

  const openCreate = () => { setEditing(null); setForm({ policyNumber: '', insuranceType: 'TRAVEL', providerId: '', clientId: '', bookingId: '', premium: 0, sumInsured: 0, coverage: '', startDate: '', endDate: '', notes: '' }); setDialog(true); };
  const openEdit = (item: any) => { setEditing(item); setForm({ policyNumber: item.policyNumber, insuranceType: item.insuranceType, providerId: item.providerId || '', clientId: item.clientId || '', bookingId: item.bookingId || '', premium: Number(item.premium) || 0, sumInsured: Number(item.sumInsured) || 0, coverage: item.coverage || '', startDate: item.startDate?.slice(0, 10) || '', endDate: item.endDate?.slice(0, 10) || '', notes: item.notes || '' }); setDialog(true); };

  const save = async () => {
    if (!activeTenant) return;
    try {
      if (editing) { await api.put(`/api/v1/tenant/insurances/${editing.id}`, form, { tenantId: activeTenant.id }); toast.success('Policy updated'); }
      else { await api.post('/api/v1/tenant/insurances', form, { tenantId: activeTenant.id }); toast.success('Policy created'); }
      setDialog(false); load();
    } catch { toast.error('Failed to save'); }
  };

  const remove = async () => {
    if (!activeTenant || !deleting) return;
    await api.delete(`/api/v1/tenant/insurances/${deleting.id}`, { tenantId: activeTenant.id });
    toast.success('Deleted'); setDeleting(null); load();
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Insurance" subtitle={`${meta.total} policies`} actions={<Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Add Policy</Button>} />
      <div className="grid gap-3">
        {data.map((item: any) => (
          <Card key={item.id} className="hover:shadow-sm transition-shadow cursor-pointer" onClick={() => router.push(`/insurances/${item.id}`)}>
            <CardContent className="flex items-center justify-between py-3">
              <div className="flex items-center gap-4">
                <Shield className="h-5 w-5 text-primary/60" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.policyNumber}</span>
                    <Badge variant="outline" className="text-[10px]">{TYPE_LABELS[item.insuranceType] || item.insuranceType}</Badge>
                    <Badge variant={item.status === 'ACTIVE' ? 'success' : 'secondary'} className="text-[10px]">{item.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {item.client?.displayName && `${item.client.displayName} · `}
                    {item.booking?.bookingRef && `Booking ${item.booking.bookingRef} · `}
                    {item.provider?.name && `${item.provider.name}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-medium">{formatMoney(Number(item.premium), item.currencyCode)}</p>
                  {item.endDate && <p className="text-xs text-muted-foreground flex items-center gap-1"><CalendarDays className="h-3 w-3" />{formatDate(item.endDate)}</p>}
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEdit(item); }}><Pencil className="h-3 w-3" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); setDeleting(item); }}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {data.length === 0 && <p className="text-center text-muted-foreground py-12">No insurance policies yet.</p>}
      </div>
      {meta.totalPages > 1 && <Pagination page={page} totalPages={meta.totalPages} total={meta.total} limit={20} onPageChange={setPage} />}

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Edit Policy' : 'New Insurance Policy'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Policy Number *</Label><Input value={form.policyNumber} onChange={e => setForm({ ...form, policyNumber: e.target.value })} /></div>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</Label>
              <select className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.insuranceType} onChange={e => setForm({ ...form, insuranceType: e.target.value })}>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Premium</Label><Input type="number" value={form.premium} onChange={e => setForm({ ...form, premium: Number(e.target.value) })} /></div>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sum Insured</Label><Input type="number" value={form.sumInsured} onChange={e => setForm({ ...form, sumInsured: Number(e.target.value) })} /></div>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Coverage</Label><Input value={form.coverage} onChange={e => setForm({ ...form, coverage: e.target.value })} /></div>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Client ID</Label><Input value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })} /></div>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Booking ID</Label><Input value={form.bookingId} onChange={e => setForm({ ...form, bookingId: e.target.value })} /></div>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Provider</Label><VendorSelect vendorType="INSURANCE" value={form.providerId} onChange={v => setForm({ ...form, providerId: v })} /></div>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Start Date</Label><Input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} /></div>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">End Date</Label><Input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} /></div>
            <div className="col-span-2"><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={save}>{editing ? 'Update' : 'Create'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleting} onOpenChange={o => !o && setDeleting(null)} title="Delete policy?" description={`Delete "${deleting?.policyNumber}"?`} confirmLabel="Delete" onConfirm={remove} />
    </div>
  );
}
