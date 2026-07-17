'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Printer, Plane } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate, formatDateTime } from '@/lib/utils';
import { humanizeStatus } from '@/lib/status';

export default function PrintTicketPage() {
  const { id } = useParams<{ id: string }>();
  const { activeTenant } = useAuthStore();
  const [ticket, setTicket] = useState<any>(null);
  const [booking, setBooking] = useState<any>(null);
  const [passengers, setPassengers] = useState<any[]>([]);

  useEffect(() => {
    if (!activeTenant) return;
    api.get<any>(`/api/v1/tenant/tickets/${id}`, { tenantId: activeTenant.id })
      .then((t) => {
        setTicket(t);
        if (t.bookingId) {
          api.get<any>(`/api/v1/tenant/bookings/${t.bookingId}`, { tenantId: activeTenant.id }).then((b) => { setBooking(b); setPassengers(b.passengers || []); }).catch(() => {});
        }
      }).catch(() => {});
  }, [activeTenant, id]);

  useEffect(() => { if (ticket) setTimeout(() => window.print(), 500); }, [ticket]);

  if (!ticket) return <div className="p-8"><Skeleton className="h-96" /></div>;

  return (
    <div className="print-area max-w-3xl mx-auto p-8 bg-white text-black">
      <div className="no-print mb-4"><Button size="sm" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Print</Button></div>
      <div className="flex justify-between items-start mb-6">
        <div><h1 className="text-2xl font-bold">{activeTenant?.name || 'Company'}</h1><p className="text-sm text-gray-600 mt-1">E-Ticket / Itinerary Receipt</p></div>
        <div className="text-right"><h2 className="text-xl font-bold">{ticket.ticketNumber}</h2><p className="text-sm text-gray-600">{humanizeStatus(ticket.status)}</p><p className="text-sm text-gray-600">Issued: {formatDate(ticket.issuedAt || ticket.createdAt)}</p></div>
      </div>
      <div className="border-2 border-gray-300 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2 mb-3"><Plane className="h-5 w-5" /><span className="font-bold text-lg">Flight Details</span></div>
        <table className="w-full text-sm">
          <tbody>
            <tr><td className="py-1 text-gray-500 w-32">Passenger</td><td className="font-medium">{ticket.passengerName}</td></tr>
            {booking && <><tr><td className="py-1 text-gray-500">Booking Ref</td><td className="font-medium">{booking.bookingRef}</td></tr><tr><td className="py-1 text-gray-500">PNR</td><td className="font-medium">{booking.pnrLocator || '—'}</td></tr></>}
          </tbody>
        </table>
      </div>
      {booking?.segments?.length > 0 && (
        <div className="mb-6"><h3 className="font-semibold text-sm uppercase tracking-wider text-gray-500 mb-2">Segments</h3>
          {booking.segments.map((seg: any, i: number) => (
            <div key={i} className="border rounded p-3 mb-2">
              <p className="font-medium">{seg.flightNumber || 'Flight'} · {humanizeStatus(seg.segmentType)}</p>
              <p className="text-sm text-gray-600">{seg.originAirportId || 'Origin'} → {seg.destAirportId || 'Destination'}</p>
              {seg.departureAt && <p className="text-sm">Dep: {formatDateTime(seg.departureAt)}</p>}
              {seg.arrivalAt && <p className="text-sm">Arr: {formatDateTime(seg.arrivalAt)}</p>}
            </div>
          ))}
        </div>
      )}
      <div className="text-sm text-gray-500 mt-8 border-t pt-4"><p>This is an electronic ticket. Present this with a valid ID at check-in.</p></div>
      <style>{`@media print { .no-print { display: none !important; } body { font-size: 12px; } }`}</style>
    </div>
  );
}
