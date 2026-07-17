'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Printer } from 'lucide-react';
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

  useEffect(() => {
    if (!activeTenant) return;
    api.get<any>(`/api/v1/tenant/receipts/${id}`, { tenantId: activeTenant.id })
      .then((r) => {
        setReceipt(r);
        if (r.invoiceId) api.get<any>(`/api/v1/tenant/invoices/${r.invoiceId}`, { tenantId: activeTenant.id }).then(setInvoice).catch(() => {});
        if (r.clientId) api.get<any>(`/api/v1/tenant/clients/${r.clientId}`, { tenantId: activeTenant.id }).then(setClient).catch(() => {});
        else if (invoice?.clientId) api.get<any>(`/api/v1/tenant/clients/${invoice.clientId}`, { tenantId: activeTenant.id }).then(setClient).catch(() => {});
      }).catch(() => {});
  }, [activeTenant, id]);

  useEffect(() => { if (receipt) setTimeout(() => window.print(), 500); }, [receipt]);

  if (!receipt) return <div className="p-8"><Skeleton className="h-96" /></div>;

  return (
    <div className="print-area max-w-3xl mx-auto p-8 bg-white text-black">
      <div className="no-print mb-4"><Button size="sm" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Print</Button></div>
      <div className="flex justify-between items-start mb-8">
        <div><h1 className="text-2xl font-bold">{activeTenant?.name || 'Company'}</h1><p className="text-sm text-gray-600 mt-1">Payment Receipt</p></div>
        <div className="text-right"><h2 className="text-xl font-bold">{receipt.receiptNumber}</h2><p className="text-sm text-gray-600">Date: {formatDate(receipt.receivedAt || receipt.createdAt)}</p><p className="text-sm text-gray-600">Method: {humanizeStatus(receipt.paymentMethod)}</p></div>
      </div>
      {client && <div className="mb-6 p-4 border rounded"><h3 className="font-semibold text-sm uppercase tracking-wider text-gray-500 mb-2">Received From</h3><p className="font-medium">{client.displayName}</p>{client.email && <p className="text-sm text-gray-600">{client.email}</p>}{client.phone && <p className="text-sm text-gray-600">{client.phone}</p>}</div>}
      <table className="w-full border-collapse mb-6"><thead><tr className="border-b-2 border-gray-300"><th className="text-left py-2 text-sm uppercase tracking-wider text-gray-500">Description</th><th className="text-right py-2 text-sm uppercase tracking-wider text-gray-500">Amount</th></tr></thead><tbody><tr className="border-b border-gray-200"><td className="py-2">Payment Received{receipt.reference ? ` (Ref: ${receipt.reference})` : ''}{invoice ? ` for Invoice ${invoice.invoiceNumber}` : ''}</td><td className="text-right py-2 font-bold text-lg">{Number(receipt.amount).toFixed(2)} {receipt.currencyCode}</td></tr></tbody></table>
      <div className="text-sm text-gray-500 mt-8 border-t pt-4"><p>This is a computer-generated receipt.</p></div>
      <style>{`@media print { .no-print { display: none !important; } body { font-size: 12px; } }`}</style>
    </div>
  );
}
