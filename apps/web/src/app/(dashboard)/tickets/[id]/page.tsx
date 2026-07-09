'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Clock, Ticket, XCircle, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDateTime } from '@/lib/utils';
import { Ticket as TicketType, TimelineEvent, ticketStatusVariant } from '@/lib/crm';

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { activeTenant } = useAuthStore();
  const [ticket, setTicket] = useState<TicketType | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!activeTenant) return;
    setLoading(true); setError('');
    Promise.all([
      api.get<TicketType>(`/api/v1/tenant/tickets/${id}`, { tenantId: activeTenant.id }),
      api.get<TimelineEvent[]>(`/api/v1/tenant/tickets/${id}/timeline`, { tenantId: activeTenant.id }).catch(() => []),
    ])
      .then(([t, tl]) => { setTicket(t); setTimeline(tl); })
      .catch((err) => setError(err.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, [activeTenant, id]);

  useEffect(() => { load(); }, [load]);

  const action = async (endpoint: string) => {
    try {
      await api.post(`/api/v1/tenant/tickets/${id}/${endpoint}`, {}, { tenantId: activeTenant!.id });
      toast.success(`${endpoint} completed`); load();
    } catch (err: any) { toast.error(err.message); }
  };

  if (loading) return <p className="text-muted-foreground">Loading ticket...</p>;
  if (error) return <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>;
  if (!ticket) return <p className="text-muted-foreground">Not found.</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/tickets')}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h2 className="text-2xl font-bold">{ticket.ticketNumber}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={ticketStatusVariant[ticket.status] || 'secondary'}>{ticket.status}</Badge>
              {ticket.passengerName && <span className="text-sm text-muted-foreground">{ticket.passengerName}</span>}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {ticket.status === 'PENDING' && <Button size="sm" variant="outline" onClick={() => action('issue')}><Ticket className="h-4 w-4 mr-2" />Issue</Button>}
          {ticket.status === 'ISSUED' && <><Button size="sm" variant="outline" onClick={() => action('void')}><XCircle className="h-4 w-4 mr-2" />Void</Button><Button size="sm" variant="outline" onClick={() => action('refund')}><RefreshCw className="h-4 w-4 mr-2" />Refund</Button></>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Field label="Ticket Number" value={ticket.ticketNumber} />
            <Field label="Passenger" value={ticket.passengerName} />
            <Field label="Booking ID" value={ticket.bookingId} />
            <Field label="Airline" value={ticket.airlineId} />
            <Field label="Issued" value={ticket.issuedAt ? formatDateTime(ticket.issuedAt) : null} />
            <Field label="Voided" value={ticket.voidedAt ? formatDateTime(ticket.voidedAt) : null} />
            <Field label="Refunded" value={ticket.refundedAt ? formatDateTime(ticket.refundedAt) : null} />
            <Field label="Reissued" value={ticket.reissuedAt ? formatDateTime(ticket.reissuedAt) : null} />
            <Field label="Created" value={formatDateTime(ticket.createdAt)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Status Timeline</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              {ticket.issuedAt && <StatusStep label="Issued" date={ticket.issuedAt} variant="success" />}
              {ticket.voidedAt && <StatusStep label="Voided" date={ticket.voidedAt} variant="destructive" />}
              {ticket.refundedAt && <StatusStep label="Refunded" date={ticket.refundedAt} variant="warning" />}
              {ticket.reissuedAt && <StatusStep label="Reissued" date={ticket.reissuedAt} variant="default" />}
              {!ticket.issuedAt && <StatusStep label="Created (pending)" date={ticket.createdAt} variant="secondary" />}
            </ul>
          </CardContent>
        </Card>
      </div>

      {ticket.notes && <Card><CardHeader><CardTitle>Notes</CardTitle></CardHeader><CardContent><p className="text-sm">{ticket.notes}</p></CardContent></Card>}

      <Separator />
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-4 w-4" />Activity Timeline</CardTitle></CardHeader>
        <CardContent>
          {timeline.length === 0 ? <p className="text-sm text-muted-foreground">No activity yet.</p> : (
            <ul className="space-y-3">{timeline.map((e) => (<li key={e.id} className="flex gap-3 border-b pb-3 last:border-0"><div className="mt-0.5 h-2 w-2 rounded-full bg-primary shrink-0" /><div className="flex-1 min-w-0"><p className="text-sm">{e.subject}</p><p className="text-xs text-muted-foreground mt-0.5">{e.userName} · {formatDateTime(e.createdAt)}</p></div></li>))}</ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return <div className="space-y-1"><p className="text-xs text-muted-foreground">{label}</p><p className="text-sm font-medium">{value || '--'}</p></div>;
}

function StatusStep({ label, date, variant }: { label: string; date: string; variant: 'success' | 'destructive' | 'warning' | 'default' | 'secondary' }) {
  return <li className="flex gap-3"><div className="mt-1 h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: variant === 'success' ? '#16a34a' : variant === 'destructive' ? '#dc2626' : variant === 'warning' ? '#ca8a04' : '#6b7280' }} /><div><p className="font-medium">{label}</p><p className="text-xs text-muted-foreground">{formatDateTime(date)}</p></div></li>;
}
