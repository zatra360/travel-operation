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

export default function PrintInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const { activeTenant } = useAuthStore();
  const [inv, setInv] = useState<any>(null);
  const [lines, setLines] = useState<any[]>([]);
  const [client, setClient] = useState<any>(null);

  useEffect(() => {
    if (!activeTenant) return;
    api.get<any>(`/api/v1/tenant/invoices/${id}`, { tenantId: activeTenant.id })
      .then((i) => {
        setInv(i); setLines(i.lines || []);
        if (i.clientId) {
          api.get<any>(`/api/v1/tenant/clients/${i.clientId}`, { tenantId: activeTenant.id })
            .then(setClient).catch(() => {});
        }
      }).catch(() => {});
  }, [activeTenant, id]);

  useEffect(() => { if (inv) setTimeout(() => window.print(), 500); }, [inv]);

  if (!inv) return <div className="p-8"><Skeleton className="h-96" /></div>;

  return (
    <div className="print-area max-w-3xl mx-auto p-8 bg-white text-black">
      <div className="no-print mb-4">
        <Button size="sm" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Print</Button>
      </div>

      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold">{activeTenant?.name || 'Company'}</h1>
          <p className="text-sm text-gray-600 mt-1">Tax Invoice</p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold">{inv.invoiceNumber}</h2>
          <p className="text-sm text-gray-600">Date: {formatDate(inv.issuedAt || inv.createdAt)}</p>
          <p className="text-sm text-gray-600">Status: {humanizeStatus(inv.status)}</p>
        </div>
      </div>

      {client && (
        <div className="mb-6 p-4 border rounded">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-gray-500 mb-2">Bill To</h3>
          <p className="font-medium">{client.displayName}</p>
          {client.email && <p className="text-sm text-gray-600">{client.email}</p>}
          {client.phone && <p className="text-sm text-gray-600">{client.phone}</p>}
          {client.companyName && <p className="text-sm text-gray-600">{client.companyName}</p>}
          {client.address && <p className="text-sm text-gray-600">{client.address}</p>}
        </div>
      )}

      <table className="w-full border-collapse mb-6">
        <thead>
          <tr className="border-b-2 border-gray-300">
            <th className="text-left py-2 text-sm uppercase tracking-wider text-gray-500">Description</th>
            <th className="text-right py-2 text-sm uppercase tracking-wider text-gray-500">Qty</th>
            <th className="text-right py-2 text-sm uppercase tracking-wider text-gray-500">Unit Price</th>
            <th className="text-right py-2 text-sm uppercase tracking-wider text-gray-500">Total</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l: any, i: number) => (
            <tr key={i} className="border-b border-gray-200">
              <td className="py-2">{l.description || humanizeStatus(l.serviceType)}</td>
              <td className="text-right py-2">{l.quantity}</td>
              <td className="text-right py-2">{Number(l.unitPrice).toFixed(2)}</td>
              <td className="text-right py-2 font-medium">{Number(l.lineTotal).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr><td colSpan={3} className="text-right py-2 text-sm">Subtotal</td><td className="text-right py-2">{Number(inv.subtotal).toFixed(2)}</td></tr>
          {Number(inv.taxAmount) > 0 && <tr><td colSpan={3} className="text-right py-2 text-sm">Tax</td><td className="text-right py-2">{Number(inv.taxAmount).toFixed(2)}</td></tr>}
          {Number(inv.discountAmount) > 0 && <tr><td colSpan={3} className="text-right py-2 text-sm">Discount</td><td className="text-right py-2">-{Number(inv.discountAmount).toFixed(2)}</td></tr>}
          <tr className="border-t-2 border-gray-300 font-bold"><td colSpan={3} className="text-right py-2">Total</td><td className="text-right py-2">{Number(inv.totalAmount).toFixed(2)} {inv.currencyCode}</td></tr>
          <tr><td colSpan={3} className="text-right py-2 text-sm">Paid</td><td className="text-right py-2 text-green-600">{Number(inv.paidAmount).toFixed(2)}</td></tr>
          <tr className="font-semibold"><td colSpan={3} className="text-right py-2">Balance Due</td><td className="text-right py-2 text-red-600">{Number(inv.dueAmount).toFixed(2)}</td></tr>
        </tfoot>
      </table>

      <div className="text-sm text-gray-500 mt-8 border-t pt-4">
        <p>This is a computer-generated document.</p>
        {inv.notes && <p className="mt-1">Notes: {inv.notes}</p>}
      </div>

      <style>{`@media print { .no-print { display: none !important; } body { font-size: 12px; } }`}</style>
    </div>
  );
}
