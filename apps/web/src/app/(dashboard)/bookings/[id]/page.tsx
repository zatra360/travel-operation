'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { FileText, Ticket, Clock, UserPlus, Plane, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { Breadcrumb, PageHeader } from '@/components/ui/page-header';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDateTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
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
  const [itinerary, setItinerary] = useState<any[]>([]);
  const [showItineraryForm, setShowItineraryForm] = useState(false);
  const [itinForm, setItinForm] = useState({ dayNumber: 1, title: '', description: '', activities: '', hotelName: '', meals: '', transfers: '', guideName: '', notes: '' });

  const load = useCallback(() => {
    if (!activeTenant) return;
    setLoading(true);
    setError('');
    Promise.all([
      api.get<any>(`/api/v1/tenant/bookings/${id}`, { tenantId: activeTenant.id }),
      api.get<TimelineEvent[]>(`/api/v1/tenant/bookings/${id}/timeline`, { tenantId: activeTenant.id }).catch(() => []),
      api.get<Paginated<TicketType>>(`/api/v1/tenant/tickets?bookingId=${id}`, { tenantId: activeTenant.id }).catch(() => ({ data: [] as TicketType[], total: 0, page: 1, limit: 50, totalPages: 0 })),
      api.get<any[]>(`/api/v1/tenant/bookings/${id}/itinerary`, { tenantId: activeTenant.id }).catch(() => []),
    ])
      .then(([bookingRes, tl, tRes, it]) => {
        setBooking(bookingRes);
        setPassengers(bookingRes.passengers || []);
        setSegments(bookingRes.segments || []);
        setStatusLogs(bookingRes.statusLogs || []);
        setTimeline(tl);
        setTickets(tRes.data || []);
        setItinerary(it);
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

  const handleAddItineraryDay = async () => {
    if (!activeTenant || !booking) return;
    try {
      await api.post(`/api/v1/tenant/bookings/${booking.id}/itinerary`, itinForm, { tenantId: activeTenant.id });
      toast.success('Day added');
      setShowItineraryForm(false);
      setItinForm({ dayNumber: itinForm.dayNumber + 1, title: '', description: '', activities: '', hotelName: '', meals: '', transfers: '', guideName: '', notes: '' });
      load();
    } catch (err: any) { toast.error(err.message || 'Failed to add day'); }
  };

  const handleDeleteItineraryDay = async (dayId: string) => {
    if (!activeTenant || !booking) return;
    try {
      await api.delete(`/api/v1/tenant/bookings/${booking.id}/itinerary/${dayId}`, { tenantId: activeTenant.id });
      toast.success('Day removed'); load();
    } catch { toast.error('Failed to remove day'); }
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
      <Breadcrumb items={[
        { label: 'Bookings', href: '/bookings' },
        { label: booking.bookingRef },
      ]} />
      <PageHeader
        title={booking.bookingRef}
        subtitle={`PNR: ${booking.pnrLocator || '--'} · ${booking.status}`}
        actions={
          <>
            {booking.status !== 'TICKETED' && (
              <Button variant="outline" size="sm" onClick={handleIssueTicket}>
                <Ticket className="h-4 w-4 mr-2" />Issue Ticket
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleCreateInvoice}>
              <FileText className="h-4 w-4 mr-2" />Create Invoice
            </Button>
          </>
        }
      />

      {booking.status === 'HELD' && booking.holdExpiresAt && (
        (() => { const due = new Date(booking.holdExpiresAt!).getTime(), now = Date.now(), diff = due - now, h = Math.abs(Math.round(diff / 3600000)), m = Math.abs(Math.round((diff % 3600000) / 60000)), expired = diff < 0, critical = !expired && diff < 7200000; return (
          <div className={cn('rounded-lg border p-4', expired ? 'border-destructive/30 bg-destructive/5' : critical ? 'border-amber-500/30 bg-amber-50 dark:bg-amber-950/10' : 'border-primary/20 bg-primary/5')}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><AlertTriangle className={cn('h-5 w-5', expired ? 'text-destructive' : critical ? 'text-amber-500' : 'text-primary')} /><span className={cn('font-semibold text-sm', expired ? 'text-destructive' : critical ? 'text-amber-600' : 'text-primary')}>{expired ? `Hold Expired — ${h}h ${m}m ago` : critical ? `Hold Expiring — ${h}h ${m}m remaining` : `Hold Active — ${h}h ${m}m left`}</span></div>
              <Badge variant={expired ? 'destructive' : critical ? 'warning' : 'default'} className="text-[10px]">{expired ? 'EXPIRED' : critical ? 'WARNING' : 'ACTIVE'}</Badge>
            </div>
          </div>
        ); })()
      )}

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
        <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="flex items-center gap-2"><Clock className="h-4 w-4" />Tour Itinerary</CardTitle><Button size="sm" variant="ghost" onClick={() => setShowItineraryForm(!showItineraryForm)}><Plus className="h-4 w-4 mr-1" />Add Day</Button></CardHeader>
        <CardContent>
          {showItineraryForm && (
            <div className="mb-4 p-3 border rounded-lg space-y-2">
              <div className="grid grid-cols-4 gap-2">
                <div><Input placeholder="Day #" type="number" value={itinForm.dayNumber} onChange={e => setItinForm({ ...itinForm, dayNumber: Number(e.target.value) })} /></div>
                <div className="col-span-3"><Input placeholder="Title" value={itinForm.title} onChange={e => setItinForm({ ...itinForm, title: e.target.value })} /></div>
                <div className="col-span-4"><Input placeholder="Description" value={itinForm.description} onChange={e => setItinForm({ ...itinForm, description: e.target.value })} /></div>
                <div className="col-span-2"><Input placeholder="Activities" value={itinForm.activities} onChange={e => setItinForm({ ...itinForm, activities: e.target.value })} /></div>
                <div><Input placeholder="Hotel" value={itinForm.hotelName} onChange={e => setItinForm({ ...itinForm, hotelName: e.target.value })} /></div>
                <div><Input placeholder="Meals" value={itinForm.meals} onChange={e => setItinForm({ ...itinForm, meals: e.target.value })} /></div>
                <div className="col-span-2"><Input placeholder="Transfers" value={itinForm.transfers} onChange={e => setItinForm({ ...itinForm, transfers: e.target.value })} /></div>
                <div><Input placeholder="Guide" value={itinForm.guideName} onChange={e => setItinForm({ ...itinForm, guideName: e.target.value })} /></div>
                <div><Input placeholder="Notes" value={itinForm.notes} onChange={e => setItinForm({ ...itinForm, notes: e.target.value })} /></div>
              </div>
              <div className="flex gap-2"><Button size="sm" onClick={handleAddItineraryDay}>Save</Button><Button size="sm" variant="outline" onClick={() => setShowItineraryForm(false)}>Cancel</Button></div>
            </div>
          )}
          {itinerary.length === 0 && !showItineraryForm ? (
            <p className="text-sm text-muted-foreground">No itinerary days added.</p>
          ) : (
            <div className="space-y-3">
              {itinerary.map((day: any) => (
                <div key={day.id} className="border-l-4 border-primary/30 pl-4 py-1 group">
                  <div className="flex items-start justify-between">
                    <p className="text-sm font-semibold">Day {day.dayNumber}: {day.title}</p>
                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDeleteItineraryDay(day.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                  </div>
                  {day.description && <p className="text-xs text-muted-foreground mt-0.5">{day.description}</p>}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-1.5 text-xs">
                    {day.activities && <span><span className="text-muted-foreground">Activities:</span> {day.activities}</span>}
                    {day.hotelName && <span><span className="text-muted-foreground">Hotel:</span> {day.hotelName}{day.hotelConfirmation ? ` (${day.hotelConfirmation})` : ''}</span>}
                    {day.meals && <span><span className="text-muted-foreground">Meals:</span> {day.meals}</span>}
                    {day.transfers && <span><span className="text-muted-foreground">Transfers:</span> {day.transfers}</span>}
                    {day.guideName && <span><span className="text-muted-foreground">Guide:</span> {day.guideName}</span>}
                  </div>
                  {day.notes && <p className="text-xs text-muted-foreground mt-1 italic">{day.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
