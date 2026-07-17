'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Printer, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate } from '@/lib/utils';
import { humanizeStatus } from '@/lib/status';

export default function PrintInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const { activeTenant } = useAuthStore();
  const [inv, setInv] = useState<any>(null);
  const [lines, setLines] = useState<any[]>([]);
  const [client, setClient] = useState<any>(null);
  const [branding, setBranding] = useState<any>({});
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeTenant) return;
    Promise.all([
      api.get<any>(`/api/v1/tenant/invoices/${id}`, { tenantId: activeTenant.id }),
      api.get<any>('/api/v1/tenant/settings/branding', { tenantId: activeTenant.id }).catch(() => ({})),
    ]).then(([i, b]) => {
      setInv(i); setLines(i.lines || []); setBranding(b || {});
      if (i.clientId) {
        api.get<any>(`/api/v1/tenant/clients/${i.clientId}`, { tenantId: activeTenant.id })
          .then(setClient).catch(() => {});
      }
    }).catch(() => {});
  }, [activeTenant, id]);

  const generatePDF = async () => {
    if (!contentRef.current) return;
    const { default: html2canvas } = await import('html2canvas');
    const { default: jsPDF } = await import('jspdf');

    const canvas = await html2canvas(contentRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const imgHeight = (canvas.height * pageWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, imgHeight);
    pdf.save(`${inv?.invoiceNumber || 'invoice'}.pdf`);
  };

  if (!inv) return <div className="p-8"><Skeleton className="h-96" /></div>;

  const logo = activeTenant && (activeTenant as any).logo;
  const companyName = activeTenant?.name || 'Company';

  return (
    <div className="max-w-3xl mx-auto p-8">
      <div className="no-print mb-4 flex gap-2">
        <Button size="sm" onClick={generatePDF}><Download className="mr-2 h-4 w-4" />Download PDF</Button>
        <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Print</Button>
      </div>

      <div ref={contentRef} className="bg-white text-black p-8" style={{ width: '210mm', minHeight: '297mm' }}>
        {/* Header */}
        <div className="flex justify-between items-start mb-8 pb-6 border-b-2" style={{ borderColor: branding.themeColor || '#6366f1' }}>
          <div className="flex items-center gap-3">
            {logo && <img src={logo} alt="" className="h-12 w-auto object-contain" />}
            <div>
              <h1 className="text-xl font-bold">{companyName}</h1>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-bold" style={{ color: branding.themeColor || '#6366f1' }}>TAX INVOICE</h2>
            <p className="text-sm font-mono">{inv.invoiceNumber}</p>
          </div>
        </div>

        {/* Meta */}
        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <p><span className="text-gray-500">Date:</span> {formatDate(inv.issuedAt || inv.createdAt)}</p>
            <p><span className="text-gray-500">Status:</span> {humanizeStatus(inv.status)}</p>
            <p><span className="text-gray-500">Due:</span> {inv.dueAt ? formatDate(inv.dueAt) : '—'}</p>
          </div>
          <div className="text-right">
            <p><span className="text-gray-500">Currency:</span> {inv.currencyCode}</p>
          </div>
        </div>

        {/* Bill To */}
        {client && (
          <div className="mb-6 p-4 border rounded bg-gray-50">
            <h3 className="font-semibold text-xs uppercase tracking-wider text-gray-500 mb-2">Bill To</h3>
            <p className="font-medium">{client.displayName}</p>
            {client.email && <p className="text-sm text-gray-600">{client.email}</p>}
            {client.phone && <p className="text-sm text-gray-600">{client.phone}</p>}
            {client.companyName && <p className="text-sm text-gray-600">{client.companyName}</p>}
            {client.address && <p className="text-sm text-gray-600">{client.address}</p>}
          </div>
        )}

        {/* Line Items */}
        <table className="w-full border-collapse mb-6">
          <thead>
            <tr style={{ backgroundColor: branding.themeColor || '#6366f1' }}>
              <th className="text-left py-2 px-3 text-xs uppercase tracking-wider text-white">Description</th>
              <th className="text-center py-2 px-3 text-xs uppercase tracking-wider text-white">Qty</th>
              <th className="text-right py-2 px-3 text-xs uppercase tracking-wider text-white">Unit Price</th>
              <th className="text-right py-2 px-3 text-xs uppercase tracking-wider text-white">Total</th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr><td colSpan={4} className="py-4 text-center text-gray-500">No line items</td></tr>
            ) : lines.map((l: any, i: number) => (
              <tr key={i} className="border-b border-gray-200">
                <td className="py-2 px-3">{l.description || humanizeStatus(l.serviceType) || 'Service'}</td>
                <td className="text-center py-2 px-3">{l.quantity || 1}</td>
                <td className="text-right py-2 px-3 font-mono">{Number(l.unitPrice || 0).toFixed(2)}</td>
                <td className="text-right py-2 px-3 font-mono font-medium">{Number(l.lineTotal || 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-6">
          <div className="w-64 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="font-mono">{Number(inv.subtotal || 0).toFixed(2)}</span></div>
            {Number(inv.taxAmount || 0) > 0 && <div className="flex justify-between"><span className="text-gray-500">Tax</span><span className="font-mono">{Number(inv.taxAmount).toFixed(2)}</span></div>}
            {Number(inv.discountAmount || 0) > 0 && <div className="flex justify-between"><span className="text-gray-500">Discount</span><span className="font-mono text-red-600">-{Number(inv.discountAmount).toFixed(2)}</span></div>}
            <div className="flex justify-between border-t pt-1 font-bold text-base" style={{ color: branding.themeColor || '#6366f1' }}>
              <span>Total</span><span className="font-mono">{Number(inv.totalAmount || 0).toFixed(2)} {inv.currencyCode}</span>
            </div>
            <div className="flex justify-between"><span className="text-gray-500">Paid</span><span className="font-mono text-green-600">{Number(inv.paidAmount || 0).toFixed(2)}</span></div>
            <div className="flex justify-between font-semibold"><span className="text-gray-500">Balance Due</span><span className="font-mono text-red-600">{Number(inv.dueAmount || 0).toFixed(2)}</span></div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-xs text-gray-400 mt-8 pt-4 border-t">
          <p>This is a computer-generated invoice.</p>
          {inv.notes && <p className="mt-1">Notes: {inv.notes}</p>}
        </div>
      </div>
    </div>
  );
}
