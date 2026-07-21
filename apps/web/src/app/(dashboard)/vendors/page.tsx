'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Pagination } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Plus, Pencil, Trash2, Phone, Mail, Globe, Percent } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from 'sonner';

const VENDOR_TYPES: Record<string, string> = {
  AIRLINE: 'Airline', HOTEL: 'Hotel', TRANSPORT: 'Transport',
  VISA_PROCESSOR: 'Visa Processor', TOUR_OPERATOR: 'Tour Operator',
  INSURANCE: 'Insurance', GDS: 'GDS', OTHER: 'Other',
};

export default function VendorsPage() {
  const { activeTenant } = useAuthStore();
  const router = useRouter();
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleting, setDeleting] = useState<any>(null);
  const [form, setForm] = useState({
    vendorType: 'AIRLINE', name: '', code: '', contactPerson: '',
    contactEmail: '', contactPhone: '', city: '', country: '',
    paymentTerms: '', commissionPct: 0, notes: '',
  });

  const load = () => {
    if (!activeTenant) return;
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (search) params.set('search', search);
    if (typeFilter) params.set('vendorType', typeFilter);
    api.get(`/api/v1/tenant/vendors?${params}`, { tenantId: activeTenant.id })
      .then((res: any) => { setVendors(res.data); setTotal(res.total); setTotalPages(res.totalPages); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [activeTenant, page, search, typeFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm({ vendorType: 'AIRLINE', name: '', code: '', contactPerson: '', contactEmail: '', contactPhone: '', city: '', country: '', paymentTerms: '', commissionPct: 0, notes: '' });
    setDialog(true);
  };

  const openEdit = (v: any) => {
    setEditing(v);
    setForm({ vendorType: v.vendorType, name: v.name, code: v.code, contactPerson: v.contactPerson || '', contactEmail: v.contactEmail || '', contactPhone: v.contactPhone || '', city: v.city || '', country: v.country || '', paymentTerms: v.paymentTerms || '', commissionPct: Number(v.commissionPct) || 0, notes: v.notes || '' });
    setDialog(true);
  };

  const save = async () => {
    if (!activeTenant) return;
    try {
      if (editing) {
        await api.put(`/api/v1/tenant/vendors/${editing.id}`, form, { tenantId: activeTenant.id });
        toast.success('Vendor updated');
      } else {
        await api.post('/api/v1/tenant/vendors', form, { tenantId: activeTenant.id });
        toast.success('Vendor created');
      }
      setDialog(false);
      load();
    } catch { toast.error('Failed to save vendor'); }
  };

  const remove = async () => {
    if (!activeTenant || !deleting) return;
    try {
      await api.delete(`/api/v1/tenant/vendors/${deleting.id}`, { tenantId: activeTenant.id });
      toast.success('Vendor deleted');
      setDeleting(null);
      load();
    } catch { toast.error('Failed to delete vendor'); }
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Vendors & Suppliers" subtitle={`${total} vendors`} actions={<Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" />Add Vendor</Button>} />

      <div className="flex items-center gap-4">
        <Input placeholder="Search vendors..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="max-w-xs" />
        <Select value={typeFilter} onValueChange={v => { setTypeFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            {Object.entries(VENDOR_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {vendors.map((v: any) => (
          <Card key={v.id} className="hover:shadow-sm transition-shadow cursor-pointer" onClick={() => router.push(`/vendors/${v.id}`)}>
            <CardContent className="pt-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{v.name}</p>
                  <Badge variant="outline" className="text-[10px] mt-0.5">{VENDOR_TYPES[v.vendorType] || v.vendorType}</Badge>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEdit(v); }}><Pencil className="h-3 w-3" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); setDeleting(v); }}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                {v.contactPerson && <p className="flex items-center gap-1"><Building2 className="h-3 w-3" />{v.contactPerson}</p>}
                {v.contactEmail && <p className="flex items-center gap-1"><Mail className="h-3 w-3" />{v.contactEmail}</p>}
                {v.contactPhone && <p className="flex items-center gap-1"><Phone className="h-3 w-3" />{v.contactPhone}</p>}
                {v.commissionPct > 0 && <p className="flex items-center gap-1"><Percent className="h-3 w-3" />{Number(v.commissionPct)}% commission</p>}
              </div>
              {v.city && <p className="text-xs text-muted-foreground">{v.city}{v.country ? `, ${v.country}` : ''}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
      {vendors.length === 0 && <p className="text-center text-muted-foreground py-12">No vendors yet. Add your first supplier.</p>}
      {totalPages > 1 && <Pagination page={page} totalPages={totalPages} total={total} limit={20} onPageChange={setPage} />}

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Edit Vendor' : 'New Vendor'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
            <div className="col-span-2"><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</Label>
              <Select value={form.vendorType} onValueChange={v => setForm({ ...form, vendorType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(VENDOR_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Code *</Label><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /></div>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact Person</Label><Input value={form.contactPerson} onChange={e => setForm({ ...form, contactPerson: e.target.value })} /></div>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact Email</Label><Input value={form.contactEmail} onChange={e => setForm({ ...form, contactEmail: e.target.value })} /></div>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone</Label><Input value={form.contactPhone} onChange={e => setForm({ ...form, contactPhone: e.target.value })} /></div>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">City</Label><Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Country</Label><Input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} /></div>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Payment Terms</Label><Input value={form.paymentTerms} onChange={e => setForm({ ...form, paymentTerms: e.target.value })} placeholder="Net 30" /></div>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Commission %</Label><Input type="number" value={form.commissionPct} onChange={e => setForm({ ...form, commissionPct: Number(e.target.value) })} /></div>
            <div className="col-span-2"><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={save}>{editing ? 'Update' : 'Create'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleting} onOpenChange={o => !o && setDeleting(null)} title="Delete vendor?" description={`Delete "${deleting?.name}"?`} confirmLabel="Delete" onConfirm={remove} />
    </div>
  );
}
