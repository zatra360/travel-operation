'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Printer, Download, Plane } from 'lucide-react';
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
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeTenant) return;
    api.get<any>(`/api/v1/tenant/tickets/${id}`, { tenantId: activeTenant.id })
      .then((t) => { setTicket(t); if (t.bookingId) api.get<any>(`/api/v1/tenant/bookings/${t.bookingId}`, { tenantId: activeTenant.id }).then(setBooking).catch(() => {}); })
      .catch(() => {});
  }, [activeTenant, id]);

  const generatePDF = async () => {
    if (!contentRef.current) return;
    const { default: html2canvas } = await import('html2canvas');
    const { default: jsPDF } = await import('jspdf');
    const canvas = await html2canvas(contentRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pw = pdf.internal.pageSize.getWidth();
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pw, (canvas.height * pw) / canvas.width);
    pdf.save(`${ticket?.ticketNumber || 'ticket'}.pdf`);
  };

  if (!ticket) return <div className="p-8"><Skeleton className="h-96" /></div>;

  const logo = activeTenant && (activeTenant as any).logo;
  const companyName = activeTenant?.name || 'Company';

  return (
    <div className="max-w-3xl mx-auto p-8">
      <div className="no-print mb-4 flex gap-2">
        <Button size="sm" onClick={generatePDF}><Download className="mr-2 h-4 w-4" />Download PDF</Button>
        <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Print</Button>
      </div>
      <div ref={contentRef} className="bg-white text-black p-8" style={{ minWidth: '210mm' }}>
        <div className="flex justify-between items-start mb-6 pb-6 border-b-2 border-sky-600">
          <div className="flex items-center gap-3">
            {logo && <img src={logo} alt="" className="h-12 w-auto object-contain" />}
            <div><h1 className="text-xl font-bold">{companyName}</h1><p className="text-sm text-gray-600">E-Ticket / Itinerary Receipt</p></div>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-bold text-sky-600">E-TICKET</h2>
            <p className="text-sm font-mono">{ticket.ticketNumber}</p>
            <p className="text-sm text-gray-500">{humanizeStatus(ticket.status)} · Issued {formatDate(ticket.issuedAt || ticket.createdAt)}</p>
          </div>
        </div>
        <table className="w-full text-sm mb-4"><tbody>
          <tr className="border-b"><td className="py-2 text-gray-500 w-36">Passenger</td><td className="font-medium text-base">{ticket.passengerName}</td></tr>
          {booking && <><tr className="border-b"><td className="py-2 text-gray-500">Booking Ref</td><td className="font-medium">{booking.bookingRef}</td></tr>
          <tr className="border-b"><td className="py-2 text-gray-500">PNR</td><td className="font-medium">{booking.pnrLocator || '—'}</td></tr></>}
        </tbody></table>
        {booking?.segments?.length > 0 && booking.segments.map((seg: any, i: number) => (
          <div key={i} className="border rounded p-3 mb-2 flex items-center gap-4">
            <Plane className="h-5 w-5 text-sky-600" />
            <div className="flex-1"><p className="font-medium">{seg.flightNumber || 'Flight'} · {humanizeStatus(seg.segmentType)}</p><p className="text-sm text-gray-600">{seg.originAirportId || 'Origin'} → {seg.destAirportId || 'Destination'}</p></div>
            <div className="text-right text-sm">{seg.departureAt && <p>Dep: {formatDateTime(seg.departureAt)}</p>}{seg.arrivalAt && <p>Arr: {formatDateTime(seg.arrivalAt)}</p>}</div>
          </div>
        ))}
        <div className="text-xs text-gray-400 mt-8 pt-4 border-t"><p>This is an electronic ticket. Present with a valid ID at check-in.</p></div>
      </div>
    </div>
  );
}
