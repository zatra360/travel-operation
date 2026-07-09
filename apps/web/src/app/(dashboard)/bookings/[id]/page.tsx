'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Pencil, FileText, Ticket, Clock, UserPlus, Plane } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDateTime } from '@/lib/utils';
import {
  Booking,
  BookingPassenger,
  BookingSegment,
  BookingStatusLog,
  Ticket as TicketType,
  Paginated,
  TimelineEvent,
  bookingStatusVariant,
  ticketStatusVariant,
} from '@/lib/crm';
import { Skeleton } from '@/components/ui/skeleton';

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { activeTenant } = useAuthStore();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [passengers, setPassengers] = useState<BookingPassenger[]>([]);
  const [segments, setSegments] = useState<BookingSegment[]>([]);
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [statusLogs, setStatusLogs] = useState<BookingStatusLog[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!activeTenant) return;
    setLoading(true);
    setError('');
    Promise.all([
      api.get<any>(`/api/v1/tenant/bookings/${id}`, { tenantId: activeTenant.id }),
      api.get<TimelineEvent[]>(`/api/v1/tenant/bookings/${id}/timeline`, { tenantId: activeTenant.id }).catch(() => []),
      api.get<Paginated<TicketType>>(`/api/v1/tenant/tickets?bookingId=${id}`, { tenantId: activeTenant.id }).catch(() => ({ data: [] as TicketType[], total: 0, page: 1, limit: 50, totalPages: 0 })),
    ])
      .then(([bookingRes, tl, tRes]) => {
        setBooking(bookingRes);
        setPassengers(bookingRes.passengers || []);
        setSegments(bookingRes.segments || []);
        setStatusLogs(bookingRes.statusLogs || []);
        setTimeline(tl);
        setTickets(tRes.data || []);
      })
      .catch((err) => setError(err.message || 'Failed to load booking'))
      .finally(() => setLoading(false));
  }, [activeTenant, id]);

  useEffect(() => { load(); }, [load]);

  const handleCreateInvoice = async () => {
    if (!activeTenant || !booking) return;
    try {
      await api.post(`/api/v1/tenant/bookings/${booking.id}/create-invoice`, {}, { tenantId: activeTenant.id });
      toast.success('Invoice created');
      load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create invoice');
    }
  };

  const handleIssueTicket = async () => {
    if (!activeTenant || !booking) return;
    try {
      await api.post(`/api/v1/tenant/tickets`, {
        bookingId: booking.id,
        ticketNumber: '',
        passengerName: passengers[0] ? `${passengers[0].firstName} ${passengers[0].lastName}` : undefined,
        status: 'ISSUED',
      }, { tenantId: activeTenant.id });
      toast.success('Ticket issued');
      load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to issue ticket');
    }
  };

  if (loading) return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-6 w-48" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  );
  if (error) return <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>;
  if (!booking) return <p className="text-muted-foreground">Booking not found.</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/bookings')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold">{booking.bookingRef}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={bookingStatusVariant[booking.status] || 'secondary'}>{booking.status}</Badge>
              {booking.pnrLocator && <Badge variant="outline">PNR: {booking.pnrLocator}</Badge>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {booking.status !== 'TICKETED' && (
            <Button variant="outline" size="sm" onClick={handleIssueTicket}>
              <Ticket className="h-4 w-4 mr-2" />Issue Ticket
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleCreateInvoice}>
            <FileText className="h-4 w-4 mr-2" />Create Invoice
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Travel Info</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs text-muted-foreground">Booking Ref</p><p className="text-sm font-medium">{booking.bookingRef}</p></div>
              <div><p className="text-xs text-muted-foreground">PNR</p><p className="text-sm font-medium">{booking.pnrLocator || '--'}</p></div>
              <div><p className="text-xs text-muted-foreground">Travel Start</p><p className="text-sm font-medium">{booking.travelStart ? formatDateTime(booking.travelStart) : '--'}</p></div>
              <div><p className="text-xs text-muted-foreground">Travel End</p><p className="text-sm font-medium">{booking.travelEnd ? formatDateTime(booking.travelEnd) : '--'}</p></div>
              <div><p className="text-xs text-muted-foreground">Hold Expires</p><p className="text-sm font-medium">{booking.holdExpiresAt ? formatDateTime(booking.holdExpiresAt) : '--'}</p></div>
              <div><p className="text-xs text-muted-foreground">Created</p><p className="text-sm font-medium">{formatDateTime(booking.createdAt)}</p></div>
            </div>
            {booking.notes && <div className="pt-2"><p className="text-xs text-muted-foreground">Notes</p><p className="text-sm">{booking.notes}</p></div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Tickets</CardTitle></CardHeader>
          <CardContent>
            {tickets.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tickets issued yet.</p>
            ) : (
              <ul className="space-y-2">
                {tickets.map((t) => (
                  <li key={t.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{t.ticketNumber}</p>
                      <p className="text-xs text-muted-foreground">{t.passengerName || 'Unknown passenger'}</p>
                    </div>
                    <Badge variant={ticketStatusVariant[t.status] || 'secondary'}>{t.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><UserPlus className="h-4 w-4" />Passengers</CardTitle>
            <span className="text-xs text-muted-foreground">{passengers.length}</span>
          </CardHeader>
          <CardContent>
            {passengers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No passengers added.</p>
            ) : (
              <ul className="space-y-2">
                {passengers.map((p) => (
                  <li key={p.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <p className="text-sm font-medium">{p.title} {p.firstName} {p.lastName}</p>
                    <Badge variant="secondary">{p.passengerType}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Plane className="h-4 w-4" />Segments</CardTitle>
            <span className="text-xs text-muted-foreground">{segments.length}</span>
          </CardHeader>
          <CardContent>
            {segments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No segments added.</p>
            ) : (
              <ul className="space-y-2">
                {segments.map((s) => (
                  <li key={s.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{s.flightNumber || s.segmentType}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.departureAt ? formatDateTime(s.departureAt) : '--'} — {s.arrivalAt ? formatDateTime(s.arrivalAt) : '--'}
                      </p>
                    </div>
                    <Badge variant="secondary">{s.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Status History</CardTitle></CardHeader>
        <CardContent>
          {statusLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No status changes yet.</p>
          ) : (
            <ul className="space-y-2">
              {statusLogs.map((log) => (
                <li key={log.id} className="flex items-center gap-3 border-b pb-2 last:border-0">
                  <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm">
                      {log.fromStatus ? `${log.fromStatus} → ` : ''}{log.toStatus}
                      {log.note && <span className="text-muted-foreground"> — {log.note}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

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
    </div>
  );
}
