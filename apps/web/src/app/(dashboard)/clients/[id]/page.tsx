'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Pencil, Clock, FileText, Plane, CreditCard } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDateTime } from '@/lib/utils';
import {
  Client, Booking, Invoice, Payment, Paginated, TimelineEvent,
  clientStatusVariant, bookingStatusVariant, invoiceStatusVariant,
} from '@/lib/crm';
import { ClientFormDialog } from '../client-form-dialog';

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { activeTenant } = useAuthStore();
  const [client, setClient] = useState<Client | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editOpen, setEditOpen] = useState(false);

  const load = useCallback(() => {
    if (!activeTenant) return;
    setLoading(true); setError('');
    Promise.all([
      api.get<Client>(`/api/v1/tenant/clients/${id}`, { tenantId: activeTenant.id }),
      api.get<Paginated<Booking>>(`/api/v1/tenant/bookings?clientId=${id}&limit=10`, { tenantId: activeTenant.id }).catch(() => ({ data: [] as Booking[], total: 0, page: 1, limit: 10, totalPages: 0 })),
      api.get<Paginated<Invoice>>(`/api/v1/tenant/invoices?clientId=${id}&limit=10`, { tenantId: activeTenant.id }).catch(() => ({ data: [] as Invoice[], total: 0, page: 1, limit: 10, totalPages: 0 })),
      api.get<Paginated<Payment>>(`/api/v1/tenant/payments?clientId=${id}&limit=10`, { tenantId: activeTenant.id }).catch(() => ({ data: [] as Payment[], total: 0, page: 1, limit: 10, totalPages: 0 })),
      api.get<TimelineEvent[]>(`/api/v1/tenant/clients/${id}/timeline`, { tenantId: activeTenant.id }).catch(() => [] as TimelineEvent[]),
    ])
      .then(([c, b, i, p, tl]) => {
        setClient(c);
        setBookings(b.data || []);
        setInvoices(i.data || []);
        setPayments(p.data || []);
        setTimeline(tl);
      })
      .catch((err) => setError(err.message || 'Failed to load client'))
      .finally(() => setLoading(false));
  }, [activeTenant, id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <p className="text-muted-foreground">Loading client...</p>;
  if (error) return <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>;
  if (!client) return <p className="text-muted-foreground">Client not found.</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/clients')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold">{client.displayName}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">{client.type}</Badge>
              <Badge variant={clientStatusVariant[client.status] || 'secondary'}>{client.status}</Badge>
              {client.isVip && <Badge variant="default">VIP</Badge>}
            </div>
          </div>
        </div>
        <Button size="sm" onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4 mr-2" />Edit
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Field label="Email" value={client.email} />
            <Field label="Phone" value={client.phone} />
            <Field label="WhatsApp" value={client.whatsapp} />
            <Field label="Company" value={client.companyName} />
            <Field label="Nationality" value={client.nationalityLabel} />
            <Field label="City" value={client.city} />
            <Field label="Country" value={client.country} />
            <Field label="Currency" value={client.currencyCode} />
            <Field label="Created" value={formatDateTime(client.createdAt)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Financial</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Field label="Outstanding" value={`$${Number(client.outstandingBalance || 0).toFixed(2)}`} />
            <Field label="Credit limit" value={`$${Number(client.creditLimit || 0).toFixed(2)}`} />
            <Field label="Refund total" value={`$${Number(client.refundAmountTotal || 0).toFixed(2)}`} />
            <Field label="Overdue invoices" value={client.overdueInvoices?.toString() || '0'} />
            <Field label="Cancellations" value={client.cancellationCount?.toString() || '0'} />
            <Field label="Last booking" value={client.lastBookingAt ? formatDateTime(client.lastBookingAt) : '--'} />
          </CardContent>
        </Card>
      </div>

      {bookings.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Plane className="h-4 w-4" />Bookings</CardTitle>
            <span className="text-xs text-muted-foreground">{bookings.length}</span>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {bookings.map((b) => (
                <li key={b.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div><p className="text-sm font-medium">{b.bookingRef}</p><p className="text-xs text-muted-foreground">PNR: {b.pnrLocator || '--'} · {b.travelStart ? formatDateTime(b.travelStart) : '--'}</p></div>
                  <Badge variant={bookingStatusVariant[b.status] || 'secondary'}>{b.status}</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {invoices.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4" />Invoices</CardTitle>
            <span className="text-xs text-muted-foreground">{invoices.length}</span>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {invoices.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div><p className="text-sm font-medium">{inv.invoiceNumber}</p><p className="text-xs text-muted-foreground">${Number(inv.totalAmount).toFixed(2)} · Due: ${Number(inv.dueAmount).toFixed(2)}</p></div>
                  <Badge variant={invoiceStatusVariant[inv.status] || 'secondary'}>{inv.status}</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {payments.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><CreditCard className="h-4 w-4" />Payments</CardTitle>
            <span className="text-xs text-muted-foreground">{payments.length}</span>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div><p className="text-sm font-medium">${Number(p.amount).toFixed(2)} {p.currencyCode}</p><p className="text-xs text-muted-foreground">{p.paymentMethod} · {p.reference || '--'}</p></div>
                  <Badge variant="secondary">{p.status}</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Separator />

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-4 w-4" />Activity Timeline</CardTitle></CardHeader>
        <CardContent>
          {timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
          ) : (
            <ul className="space-y-3">
              {timeline.map((event) => (
                <li key={event.id} className="flex gap-3 border-b pb-3 last:border-0 last:pb-0">
                  <div className="mt-0.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{event.subject}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{event.userName} · {formatDateTime(event.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <ClientFormDialog open={editOpen} onOpenChange={setEditOpen} client={client} onSaved={load} />
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || '--'}</p>
    </div>
  );
}
