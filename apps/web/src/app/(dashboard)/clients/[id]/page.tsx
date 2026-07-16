'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Pencil, Clock, FileText, Plane, CreditCard, Globe, FileCheck, Mail, Phone, MessageCircle, MapPin, Banknote, User, File, Target, PhoneCall, Plus, Trash2, Download } from 'lucide-react';
import { Breadcrumb, PageHeader } from '@/components/ui/page-header';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDateTime, formatDate, formatMoney } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { humanizeStatus } from '@/lib/status';
import { Client, Booking, Invoice, Payment, Paginated, TimelineEvent, bookingStatusVariant, invoiceStatusVariant, formatFileSize } from '@/lib/crm';
import { ClientFormDialog } from '../client-form-dialog';
import { PassportFormDialog } from './passport-form-dialog';
import { VisaFormDialog } from './visa-form-dialog';
import { DocumentUploadDialog } from '../../documents/document-upload-dialog';
import { useNationalities } from '@/lib/use-ref-data';

const VISA_BADGE: Record<string, any> = { PENDING: 'warning', APPROVED: 'success', REJECTED: 'destructive', EXPIRED: 'destructive' };

function isExpiringSoon(date: string) { return new Date(date).getTime() - Date.now() < 90 * 24 * 60 * 60 * 1000; }

export default function ClientDetailPage() {
  const params = useParams(); const id = params.id as string;
  const { activeTenant } = useAuthStore();
  const [client, setClient] = useState<Client | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [passports, setPassports] = useState<any[]>([]);
  const [visas, setVisas] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [passportFormOpen, setPassportFormOpen] = useState(false);
  const [editingPassport, setEditingPassport] = useState<any | null>(null);
  const [deletingPassport, setDeletingPassport] = useState<any | null>(null);
  const [visaFormOpen, setVisaFormOpen] = useState(false);
  const [editingVisa, setEditingVisa] = useState<any | null>(null);
  const [deletingVisa, setDeletingVisa] = useState<any | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deletingDocument, setDeletingDocument] = useState<any | null>(null);
  const { options: nationalities } = useNationalities();

  const nationalityName = useMemo(() => client?.nationalityId ? nationalities.find(o => o.value === client.nationalityId)?.label : null, [client?.nationalityId, nationalities]);

  const load = useCallback(() => {
    if (!activeTenant) return;
    setLoading(true); setError('');
    Promise.all([
      api.get<Client>(`/api/v1/tenant/clients/${id}`, { tenantId: activeTenant.id }),
      api.get<Paginated<Booking>>(`/api/v1/tenant/bookings?clientId=${id}&limit=20`, { tenantId: activeTenant.id }).catch(() => ({ data: [] } as any)),
      api.get<Paginated<Invoice>>(`/api/v1/tenant/invoices?clientId=${id}&limit=20`, { tenantId: activeTenant.id }).catch(() => ({ data: [] } as any)),
      api.get<Paginated<Payment>>(`/api/v1/tenant/payments?clientId=${id}&limit=20`, { tenantId: activeTenant.id }).catch(() => ({ data: [] } as any)),
      api.get<TimelineEvent[]>(`/api/v1/tenant/clients/${id}/timeline`, { tenantId: activeTenant.id }).catch(() => []),
      api.get<any[]>(`/api/v1/tenant/clients/${id}/passports`, { tenantId: activeTenant.id }).catch(() => []),
      api.get<any[]>(`/api/v1/tenant/clients/${id}/visas`, { tenantId: activeTenant.id }).catch(() => []),
      api.get<any[]>('/api/v1/tenant/documents?entity=Client&entityId=' + id, { tenantId: activeTenant.id }).catch(() => []),
      api.get<any[]>('/api/v1/tenant/leads?clientId=' + id, { tenantId: activeTenant.id }).catch(() => []),
      api.get<any[]>('/api/v1/tenant/follow-ups?clientId=' + id, { tenantId: activeTenant.id }).catch(() => []),
    ]).then(([c, b, i, p, tl, pp, v, docs, lds, fus]: any) => {
      setClient(c); setBookings(b.data || []); setInvoices(i.data || []);
      setPayments(p.data || []); setTimeline(tl);
      setPassports(Array.isArray(pp) ? pp : pp?.data || []);
      setVisas(Array.isArray(v) ? v : v?.data || []);
      setDocuments(docs.data || []);
      setLeads(lds.data || []);
      setFollowUps(fus.data || []);
    }).catch(err => setError(err.message)).finally(() => setLoading(false));
  }, [activeTenant, id]);

  useEffect(() => { load(); }, [load]);

  const handleDeletePassport = async () => {
    if (!activeTenant || !deletingPassport) return;
    try {
      await api.delete(`/api/v1/tenant/clients/${id}/passports/${deletingPassport.id}`, { tenantId: activeTenant.id });
      toast.success('Passport removed');
      load();
    } catch (err: any) { toast.error(err.message || 'Failed to remove passport'); }
  };

  const handleDeleteVisa = async () => {
    if (!activeTenant || !deletingVisa) return;
    try {
      await api.delete(`/api/v1/tenant/clients/${id}/visas/${deletingVisa.id}`, { tenantId: activeTenant.id });
      toast.success('Visa removed');
      load();
    } catch (err: any) { toast.error(err.message || 'Failed to remove visa'); }
  };

  const handleDownloadDocument = async (doc: any) => {
    if (!activeTenant) return;
    try {
      const { url } = await api.get<{ url: string; fileName: string }>(`/api/v1/tenant/documents/${doc.id}/download`, { tenantId: activeTenant.id });
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err: any) { toast.error(err.message || 'Failed to get download link'); }
  };

  const handleDeleteDocument = async () => {
    if (!activeTenant || !deletingDocument) return;
    try {
      await api.delete(`/api/v1/tenant/documents/${deletingDocument.id}`, { tenantId: activeTenant.id });
      toast.success('Document deleted');
      load();
    } catch (err: any) { toast.error(err.message || 'Failed to delete document'); }
  };

  if (loading) return <div className="space-y-6"><Skeleton className="h-8 w-48" /><div className="grid gap-6 lg:grid-cols-2"><Skeleton className="h-64" /><Skeleton className="h-64" /></div></div>;
  if (error) return <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>;
  if (!client) return <p className="text-muted-foreground">Client not found.</p>;

  const profileFields = [
    { key: 'email', label: 'Email', value: client.email },
    { key: 'phone', label: 'Phone', value: client.phone },
    { key: 'whatsapp', label: 'WhatsApp', value: client.whatsapp },
    { key: 'nationalityId', label: 'Nationality', value: client.nationalityId || client.nationalityLabel },
    { key: 'country', label: 'Country', value: client.country },
    { key: 'city', label: 'City', value: client.city },
    { key: 'address', label: 'Address', value: client.address },
    { key: 'dateOfBirth', label: 'Date of Birth', value: client.dateOfBirth },
    { key: 'gender', label: 'Gender', value: client.gender },
    { key: 'profession', label: 'Profession', value: client.profession },
    { key: 'companyName', label: 'Company', value: client.companyName },
    { key: 'language', label: 'Language', value: client.language },
    { key: 'preferredCommunication', label: 'Comm. Pref', value: client.preferredCommunication },
    { key: 'preferredPaymentMethod', label: 'Payment Method', value: client.preferredPaymentMethod },
    { key: 'preferredAirlines', label: 'Preferred Airlines', value: client.preferredAirlines },
    { key: 'preferredRoutes', label: 'Preferred Routes', value: client.preferredRoutes },
    { key: 'notes', label: 'Notes', value: (client as any).notes },
  ];
  const filled = profileFields.filter(f => f.value).length;
  const score = Math.round((filled / profileFields.length) * 100);
  const scoreColor = score >= 80 ? 'text-emerald-500' : score >= 50 ? 'text-amber-500' : 'text-red-500';
  const missing = profileFields.filter(f => !f.value).map(f => f.label);

  const hasTravelHistory = bookings.length > 0 || invoices.length > 0 || payments.length > 0;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Clients', href: '/clients' }, { label: client.displayName }]} />
      <PageHeader
        title={client.displayName}
        subtitle={<span className="flex items-center gap-2"><StatusBadge status={client.status} />{client.isVip && <Badge variant="warning" className="text-[10px]">VIP</Badge>}{client.activityScore != null && <Badge variant={client.activityScore >= 60 ? 'success' : client.activityScore >= 30 ? 'warning' : 'destructive'} className="text-[10px]">Score {client.activityScore}</Badge>}<span className="text-xs text-muted-foreground">{client.type?.toLowerCase()}</span><span className={cn('text-xs font-medium', scoreColor)}>· {score}% complete</span>{missing.length > 0 && <span className="text-[10px] text-muted-foreground">Missing: {missing.slice(0, 3).join(', ')}{missing.length > 3 ? ` +${missing.length - 3}` : ''}</span>}</span>}
        actions={<Button size="sm" onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4 mr-2" />Edit</Button>}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" />Profile</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <F icon={Mail} label="Email" value={client.email} />
            <F icon={Phone} label="Phone" value={client.phone} />
            <F icon={MessageCircle} label="WhatsApp" value={client.whatsapp} />
            <F icon={User} label="Gender" value={client.gender} />
            <F icon={MapPin} label="Country" value={client.country} />
            <F icon={MapPin} label="City" value={client.city} />
            <F icon={Globe} label="Nationality" value={nationalityName || client.nationalityLabel} />
            <F label="Date of Birth" value={client.dateOfBirth ? formatDate(client.dateOfBirth) : null} />
            <F label="Company" value={client.companyName} />
            <F label="Profession" value={client.profession} />
            <F label="Address" value={client.address} />
            <F label="Language" value={client.language} />
            <F icon={Phone} label="Preferred Comm." value={humanizeStatus(client.preferredCommunication)} />
            <F label="Loyalty" value={client.loyaltyStatus} />
            <F label="Payment Method" value={humanizeStatus(client.preferredPaymentMethod)} />
            <F label="Preferred Airlines" value={client.preferredAirlines} />
            <F label="Preferred Routes" value={client.preferredRoutes} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Banknote className="h-4 w-4 text-muted-foreground" />Financial Summary</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <F label="Currency" value={client.currencyCode} />
            <F label="Outstanding" value={`$${Number(client.outstandingBalance || 0).toFixed(2)}`} />
            <F label="Credit Limit" value={`$${Number(client.creditLimit || 0).toFixed(2)}`} />
            <F label="Refund Total" value={`$${Number(client.refundAmountTotal || 0).toFixed(2)}`} />
            <F label="Overdue" value={client.overdueInvoices?.toString()} />
            <F label="Cancellations" value={client.cancellationCount?.toString()} />
            <F label="Last Booking" value={client.lastBookingAt ? formatDate(client.lastBookingAt) : null} />
            <F label="Created" value={formatDate(client.createdAt)} />
            <F label="Payment Method" value={humanizeStatus(client.preferredPaymentMethod)} />
            <F label="Risk Score" value={client.riskScore?.toString()} />
            <F label="Activity Score" value={client.activityScore != null ? `${client.activityScore}/100` : 'Not scored'} />
            <F label="B2B Credit" value={client.b2bCreditStatus} />
            <F label="Lead Source" value={client.leadSource} />
            <F label="Last Activity" value={client.lastActivityAt ? formatDate(client.lastActivityAt) : null} />
            <F label="Phone Verified" value={client.phoneVerified ? '✓ Yes' : '✗ No'} />
            <F label="Email Verified" value={client.emailVerified ? '✓ Yes' : '✗ No'} />
          </CardContent>
        </Card>
      </div>

      <Separator />
      <h3 className="text-lg font-semibold">Travel Documents</h3>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><FileCheck className="h-4 w-4" />Passports ({passports.length})</CardTitle>
          <Button size="sm" variant="outline" onClick={() => { setEditingPassport(null); setPassportFormOpen(true); }}><Plus className="h-4 w-4 mr-1" />Add</Button>
        </CardHeader>
        <CardContent className="space-y-2">
              {passports.length === 0 ? <p className="text-sm text-muted-foreground">No passports on file.</p> : passports.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between border-b pb-2 last:border-0 text-sm">
                  <div><p className="font-medium">{p.fullName}{p.relation && <span className="ml-1.5 text-[10px] text-muted-foreground bg-muted px-1 py-0.5 rounded">{p.relation}</span>}</p><p className="text-xs text-muted-foreground">#{p.passportNumber} · {p.nationality || p.countryCode}</p></div>
                  <div className="flex items-center gap-2">
                    <div className="text-right"><p className="text-xs text-muted-foreground">Expires {formatDate(p.expiryDate)}{isExpiringSoon(p.expiryDate) && <span className="text-warning ml-1">⚠</span>}</p><Badge variant={p.isVerified ? 'default' : 'secondary'} className="text-xs mt-1">{p.isVerified ? 'Verified' : 'Pending'}</Badge></div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingPassport(p); setPassportFormOpen(true); }}><Pencil className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeletingPassport(p)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                  </div>
                </div>))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Globe className="h-4 w-4" />Visas ({visas.length})</CardTitle>
              <Button size="sm" variant="outline" onClick={() => { setEditingVisa(null); setVisaFormOpen(true); }}><Plus className="h-4 w-4 mr-1" />Add</Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {visas.length === 0 ? <p className="text-sm text-muted-foreground">No visas on file.</p> : visas.map((v: any) => (
                <div key={v.id} className="flex items-center justify-between border-b pb-2 last:border-0 text-sm">
                  <div><p className="font-medium">{v.visaType} {v.country ? `- ${v.country.name}` : ''}</p><p className="text-xs text-muted-foreground">{v.visaNumber ? `#${v.visaNumber}` : 'No number'} · {v.entryType || 'N/A'}</p></div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">{v.expiryDate && <p className="text-xs text-muted-foreground">Expires {formatDate(v.expiryDate)}</p>}<Badge variant={VISA_BADGE[v.status] || 'secondary'} className="text-xs mt-1">{v.status}</Badge></div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingVisa(v); setVisaFormOpen(true); }}><Pencil className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeletingVisa(v)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                  </div>
                </div>))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><File className="h-4 w-4" />Documents ({documents.length})</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setUploadOpen(true)}><Plus className="h-4 w-4 mr-1" />Upload</Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {documents.length === 0 ? <p className="text-sm text-muted-foreground">No documents uploaded.</p> : documents.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between border-b pb-2 last:border-0 text-sm">
                  <div><p className="font-medium">{d.fileName}</p><p className="text-xs text-muted-foreground">{d.category?.replace(/_/g, ' ')} · {formatFileSize(d.sizeBytes)}</p></div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Download" onClick={() => handleDownloadDocument(d)}><Download className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Delete" onClick={() => setDeletingDocument(d)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                  </div>
                </div>))}
            </CardContent>
          </Card>
      {hasTravelHistory && (
        <>
          <Separator />
          <h3 className="text-lg font-semibold">Travel History</h3>

          {bookings.length > 0 && (
            <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base flex items-center gap-2"><Plane className="h-4 w-4" />Bookings ({bookings.length})</CardTitle></CardHeader>
              <CardContent className="space-y-2">{bookings.map(b => (
                <div key={b.id} className="flex items-center justify-between border-b pb-2 last:border-0"><div><p className="text-sm font-medium">{b.bookingRef}</p><p className="text-xs text-muted-foreground">PNR: {b.pnrLocator || '--'} · {b.travelStart ? formatDateTime(b.travelStart) : '--'}</p></div><Badge variant={bookingStatusVariant[b.status] || 'secondary'}>{b.status}</Badge></div>
              ))}</CardContent></Card>)}

          {invoices.length > 0 && (
            <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" />Invoices ({invoices.length})</CardTitle></CardHeader>
              <CardContent className="space-y-2">{invoices.map(inv => (
                <div key={inv.id} className="flex items-center justify-between border-b pb-2 last:border-0"><div><p className="text-sm font-medium">{inv.invoiceNumber}</p><p className="text-xs text-muted-foreground">${Number(inv.totalAmount).toFixed(2)} · Due: ${Number(inv.dueAmount).toFixed(2)}</p></div><Badge variant={invoiceStatusVariant[inv.status] || 'secondary'}>{inv.status}</Badge></div>
              ))}</CardContent></Card>)}

          {payments.length > 0 && (
            <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4" />Payments ({payments.length})</CardTitle></CardHeader>
              <CardContent className="space-y-2">{payments.map(p => (
                <div key={p.id} className="flex items-center justify-between border-b pb-2 last:border-0"><div><p className="text-sm font-medium">${Number(p.amount).toFixed(2)} {p.currencyCode}</p><p className="text-xs text-muted-foreground">{p.paymentMethod} · {p.reference || '--'}</p></div><Badge variant="secondary">{p.status}</Badge></div>
              ))}</CardContent></Card>)}
        </>
      )}

      <Separator />
      <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" />Activity Timeline</CardTitle></CardHeader>
        <CardContent>{timeline.length === 0 ? <p className="text-sm text-muted-foreground">No activity yet.</p> : <ul className="space-y-3">{timeline.map(event => (
          <li key={event.id} className="flex gap-3 border-b pb-3 last:border-0"><div className="mt-0.5 h-2 w-2 rounded-full bg-primary shrink-0" /><div className="flex-1 min-w-0"><p className="text-sm">{event.subject}</p><p className="text-xs text-muted-foreground mt-0.5">{event.userName} · {formatDateTime(event.createdAt)}</p></div></li>
        ))}</ul>}</CardContent></Card>

      <ClientFormDialog open={editOpen} onOpenChange={setEditOpen} client={client} onSaved={load} />
      <PassportFormDialog open={passportFormOpen} onOpenChange={setPassportFormOpen} clientId={id} passport={editingPassport} onSaved={load} />
      <VisaFormDialog open={visaFormOpen} onOpenChange={setVisaFormOpen} clientId={id} visa={editingVisa} passports={passports} onSaved={load} />
      <DocumentUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} onUploaded={load} entity="Client" entityId={id} />
      <ConfirmDialog
        open={!!deletingPassport}
        onOpenChange={(o) => !o && setDeletingPassport(null)}
        title="Remove passport?"
        description={`This will remove the passport ${deletingPassport?.passportNumber ? `#${deletingPassport.passportNumber}` : ''} for ${deletingPassport?.fullName || 'this client'}.`}
        confirmLabel="Remove"
        onConfirm={handleDeletePassport}
      />
      <ConfirmDialog
        open={!!deletingVisa}
        onOpenChange={(o) => !o && setDeletingVisa(null)}
        title="Remove visa?"
        description={`This will remove the ${deletingVisa?.visaType || ''} visa${deletingVisa?.visaNumber ? ` #${deletingVisa.visaNumber}` : ''}.`}
        confirmLabel="Remove"
        onConfirm={handleDeleteVisa}
      />
      <ConfirmDialog
        open={!!deletingDocument}
        onOpenChange={(o) => !o && setDeletingDocument(null)}
        title="Delete document?"
        description={`This will remove "${deletingDocument?.fileName}". This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDeleteDocument}
      />
    </div>
  );
}

function F({ icon: Icon, label, value }: { icon?: any; label: string; value?: string | null }) {
  return <div className="space-y-1"><p className="text-xs text-muted-foreground flex items-center gap-1">{Icon && <Icon className="h-3 w-3" />}{label}</p><p className="text-sm font-medium">{value || '—'}</p></div>;
}
