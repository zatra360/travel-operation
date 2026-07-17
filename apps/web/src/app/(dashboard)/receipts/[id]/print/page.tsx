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

export default function PrintReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const { activeTenant } = useAuthStore();
  const [receipt, setReceipt] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [invoice, setInvoice] = useState<any>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeTenant) return;
    api.get<any>(`/api/v1/tenant/receipts/${id}`, { tenantId: activeTenant.id })
      .then((r) => {
        setReceipt(r);
        if (r.invoiceId) api.get<any>(`/api/v1/tenant/invoices/${r.invoiceId}`, { tenantId: activeTenant.id }).then(setInvoice).catch(() => {});
        if (r.clientId) api.get<any>(`/api/v1/tenant/clients/${r.clientId}`, { tenantId: activeTenant.id }).then(setClient).catch(() => {});
      }).catch(() => {});
  }, [activeTenant, id]);

  const generatePDF = async () => {
    if (!contentRef.current) return;
    const { default: html2canvas } = await import('html2canvas');
    const { default: jsPDF } = await import('jspdf');
    const canvas = await html2canvas(contentRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const imgHeight = (canvas.height * pageWidth) / canvas.width;
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pageWidth, imgHeight);
    pdf.save(`${receipt?.receiptNumber || 'receipt'}.pdf`);
  };

  if (!receipt) return <div className="p-8"><Skeleton className="h-96" /></div>;

  const logo = activeTenant && (activeTenant as any).logo;
  const companyName = activeTenant?.name || 'Company';

  return (
    <div className="max-w-3xl mx-auto p-8">
      <div className="no-print mb-4 flex gap-2">
        <Button size="sm" onClick={generatePDF}><Download className="mr-2 h-4 w-4" />Download PDF</Button>
        <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Print</Button>
      </div>
      <div ref={contentRef} className="bg-white text-black p-8" style={{ minWidth: '210mm', minHeight: '200mm' }}>
        <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-emerald-600">
          <div className="flex items-center gap-3">
            {logo && <img src={logo} alt="" className="h-12 w-auto object-contain" />}
            <div><h1 className="text-xl font-bold">{companyName}</h1><p className="text-sm text-gray-600">Payment Receipt</p></div>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-bold text-emerald-600">RECEIPT</h2>
            <p className="text-sm font-mono">{receipt.receiptNumber}</p>
            <p className="text-sm text-gray-500">{formatDate(receipt.receivedAt || receipt.createdAt)}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <p><span className="text-gray-500">Method:</span> {humanizeStatus(receipt.paymentMethod)}</p>
            {receipt.reference && <p><span className="text-gray-500">Reference:</span> {receipt.reference}</p>}
            {invoice && <p><span className="text-gray-500">Invoice:</span> {invoice.invoiceNumber}</p>}
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold tabular-nums text-emerald-700">{Number(receipt.amount).toFixed(2)} {receipt.currencyCode}</p>
          </div>
        </div>
        {client && (
          <div className="mb-6 p-4 border rounded bg-gray-50">
            <h3 className="font-semibold text-xs uppercase tracking-wider text-gray-500 mb-2">Received From</h3>
            <p className="font-medium">{client.displayName}</p>
            {client.email && <p className="text-sm text-gray-600">{client.email}</p>}
            {client.phone && <p className="text-sm text-gray-600">{client.phone}</p>}
          </div>
        )}
        <div className="text-xs text-gray-400 mt-8 pt-4 border-t"><p>This is a computer-generated receipt.</p></div>
      </div>
    </div>
  );
}
