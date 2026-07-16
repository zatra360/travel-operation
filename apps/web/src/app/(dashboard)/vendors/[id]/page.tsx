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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Mail, Phone, Globe, Percent, Pencil, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from 'sonner';

const VENDOR_TYPES: Record<string, string> = { AIRLINE: 'Airline', HOTEL: 'Hotel', TRANSPORT: 'Transport', VISA_PROCESSOR: 'Visa Processor', TOUR_OPERATOR: 'Tour Operator', INSURANCE: 'Insurance', GDS: 'GDS', OTHER: 'Other' };

export default function VendorDetailPage() {
  const params = useParams(); const router = useRouter();
  const { activeTenant } = useAuthStore();
  const [vendor, setVendor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    if (!activeTenant) return;
    api.get(`/api/v1/tenant/vendors/${params.id}`, { tenantId: activeTenant.id }).then(setVendor).finally(() => setLoading(false));
  }, [activeTenant]);

  const startEdit = () => {
    setForm({ name: vendor.name, code: vendor.code, vendorType: vendor.vendorType, contactPerson: vendor.contactPerson || '', contactEmail: vendor.contactEmail || '', contactPhone: vendor.contactPhone || '', address: vendor.address || '', city: vendor.city || '', country: vendor.country || '', website: vendor.website || '', paymentTerms: vendor.paymentTerms || '', commissionPct: Number(vendor.commissionPct) || 0, notes: vendor.notes || '' });
    setEditing(true);
  };

  const save = async () => {
    if (!activeTenant) return;
    await api.put(`/api/v1/tenant/vendors/${params.id}`, form, { tenantId: activeTenant.id });
    toast.success('Updated'); setEditing(false);
    api.get(`/api/v1/tenant/vendors/${params.id}`, { tenantId: activeTenant.id }).then(setVendor);
  };

  const remove = async () => {
    if (!activeTenant) return;
    await api.delete(`/api/v1/tenant/vendors/${params.id}`, { tenantId: activeTenant.id });
    toast.success('Deleted'); router.push('/vendors');
  };

  if (loading) return <Skeleton className="h-96" />;
  if (!vendor) return <p className="text-muted-foreground">Vendor not found.</p>;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Vendors', href: '/vendors' }, { label: vendor.name }]} />
      <PageHeader title={vendor.name} subtitle={VENDOR_TYPES[vendor.vendorType] || vendor.vendorType} actions={<><Button variant="outline" size="sm" onClick={startEdit}><Pencil className="h-3 w-3 mr-1" />Edit</Button><Button variant="destructive" size="sm" onClick={() => setDeleting(true)}><Trash2 className="h-3 w-3 mr-1" />Delete</Button></>} />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Details</CardTitle></CardHeader>
          <CardContent>
            {editing ? (
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Code</Label><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /></div>
                <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</Label><Select value={form.vendorType} onValueChange={v => setForm({ ...form, vendorType: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(VENDOR_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
                <div />
                <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact Person</Label><Input value={form.contactPerson} onChange={e => setForm({ ...form, contactPerson: e.target.value })} /></div>
                <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</Label><Input value={form.contactEmail} onChange={e => setForm({ ...form, contactEmail: e.target.value })} /></div>
                <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone</Label><Input value={form.contactPhone} onChange={e => setForm({ ...form, contactPhone: e.target.value })} /></div>
                <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">City</Label><Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
                <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Country</Label><Input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} /></div>
                <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Website</Label><Input value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} /></div>
                <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Payment Terms</Label><Input value={form.paymentTerms} onChange={e => setForm({ ...form, paymentTerms: e.target.value })} /></div>
                <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Commission %</Label><Input type="number" value={form.commissionPct} onChange={e => setForm({ ...form, commissionPct: Number(e.target.value) })} /></div>
                <div className="col-span-2"><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
                <div className="col-span-2 flex gap-2"><Button onClick={save}>Save</Button><Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button></div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-muted-foreground">Code</p><p className="font-medium">{vendor.code}</p></div>
                <div><p className="text-xs text-muted-foreground">Type</p><Badge variant="outline">{VENDOR_TYPES[vendor.vendorType]}</Badge></div>
                {vendor.contactPerson && <div><p className="text-xs text-muted-foreground">Contact</p><p>{vendor.contactPerson}</p></div>}
                {vendor.contactEmail && <div className="flex items-center gap-1"><Mail className="h-3 w-3 text-muted-foreground" /><a href={`mailto:${vendor.contactEmail}`} className="text-sm">{vendor.contactEmail}</a></div>}
                {vendor.contactPhone && <div className="flex items-center gap-1"><Phone className="h-3 w-3 text-muted-foreground" /><span className="text-sm">{vendor.contactPhone}</span></div>}
                {vendor.website && <div className="flex items-center gap-1"><Globe className="h-3 w-3 text-muted-foreground" /><a href={vendor.website} target="_blank" className="text-sm">{vendor.website}</a></div>}
                {vendor.city && <div><p className="text-xs text-muted-foreground">Location</p><p className="text-sm">{vendor.city}{vendor.country ? `, ${vendor.country}` : ''}</p></div>}
                {vendor.commissionPct > 0 && <div className="flex items-center gap-1"><Percent className="h-3 w-3 text-muted-foreground" /><span className="text-sm">{Number(vendor.commissionPct)}% commission</span></div>}
                {vendor.paymentTerms && <div><p className="text-xs text-muted-foreground">Payment Terms</p><p className="text-sm">{vendor.paymentTerms}</p></div>}
                {vendor.notes && <div className="col-span-2"><p className="text-xs text-muted-foreground">Notes</p><p className="text-sm">{vendor.notes}</p></div>}
              </div>
            )}
          </CardContent>
        </Card>
        <Card><CardHeader><CardTitle className="text-sm">Quick Info</CardTitle></CardHeader><CardContent className="text-sm space-y-2">
          {vendor.gdsProvider && <div><p className="text-muted-foreground">GDS</p><p>{vendor.gdsProvider}</p></div>}
          {vendor.creditLimit > 0 && <div><p className="text-muted-foreground">Credit Limit</p><p className="font-medium">{Number(vendor.creditLimit).toLocaleString()} {vendor.currencyCode}</p></div>}
        </CardContent></Card>
      </div>
      <ConfirmDialog open={deleting} onOpenChange={setDeleting} title="Delete vendor?" description={`Delete "${vendor.name}"? This cannot be undone.`} confirmLabel="Delete" onConfirm={remove} />
    </div>
  );
}
