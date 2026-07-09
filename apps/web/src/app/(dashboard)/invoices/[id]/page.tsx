'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Clock, CreditCard, FileText, XCircle } from 'lucide-react';
import { Breadcrumb, PageHeader } from '@/components/ui/page-header';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDateTime } from '@/lib/utils';
import { Invoice, Payment, Receipt, LedgerEntry, TimelineEvent, invoiceStatusVariant } from '@/lib/crm';

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { activeTenant } = useAuthStore();
  const [invoice, setInvoice] = useState<Invoice & { lines?: any[]; payments?: Payment[]; receipts?: Receipt[] } | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!activeTenant) return;
    setLoading(true); setError('');
    Promise.all([
      api.get<any>(`/api/v1/tenant/invoices/${id}`, { tenantId: activeTenant.id }),
      api.get<LedgerEntry[]>(`/api/v1/tenant/invoices/${id}/ledger`, { tenantId: activeTenant.id }).catch(() => []),
      api.get<TimelineEvent[]>(`/api/v1/tenant/invoices/${id}/timeline`, { tenantId: activeTenant.id }).catch(() => []),
    ])
      .then(([inv, l, tl]) => { setInvoice(inv); setLedger(l); setTimeline(tl); })
      .catch((err) => setError(err.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, [activeTenant, id]);

  useEffect(() => { load(); }, [load]);

  const handleVoid = async () => {
    try {
      await api.post(`/api/v1/tenant/invoices/${id}/void`, {}, { tenantId: activeTenant!.id });
      toast.success('Invoice voided'); load();
    } catch (err: any) { toast.error(err.message); }
  };

  if (loading) return <p className="text-muted-foreground">Loading invoice...</p>;
  if (error) return <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>;
  if (!invoice) return <p className="text-muted-foreground">Not found.</p>;

  const lines = invoice.lines || [];
  const payments = invoice.payments || [];
  const receipts = invoice.receipts || [];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Invoices', href: '/invoices' },
        { label: invoice.invoiceNumber },
      ]} />
      <PageHeader
        title={invoice.invoiceNumber}
        subtitle={`${invoice.status} · ${invoice.currencyCode}`}
        actions={
          invoice.status !== 'CANCELLED' && invoice.status !== 'PAID' ? (
            <Button size="sm" variant="outline" onClick={handleVoid}><XCircle className="h-4 w-4 mr-2" />Void</Button>
          ) : null
        }
      />

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total</p><p className="text-xl font-bold">${Number(invoice.totalAmount).toFixed(2)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Paid</p><p className="text-xl font-bold text-green-600">${Number(invoice.paidAmount).toFixed(2)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Due</p><p className="text-xl font-bold text-red-600">${Number(invoice.dueAmount).toFixed(2)}</p></CardContent></Card>
        <Card><CardContent className="pt-4">{invoice.dueAt ? <><p className="text-xs text-muted-foreground">Due date</p><p className="text-sm font-medium">{formatDateTime(invoice.dueAt)}</p></> : <p className="text-xs text-muted-foreground">No due date</p>}</CardContent></Card>
      </div>

      {lines.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Line Items</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="pb-2">Service</th><th className="pb-2">Description</th><th className="pb-2 text-right">Qty</th><th className="pb-2 text-right">Unit</th><th className="pb-2 text-right">Total</th></tr></thead><tbody>{lines.map((li: any) => (<tr key={li.id} className="border-b last:border-0"><td className="py-2">{li.serviceType || '--'}</td><td className="py-2 text-muted-foreground">{li.description || '--'}</td><td className="py-2 text-right">{li.quantity}</td><td className="py-2 text-right">${Number(li.unitPrice).toFixed(2)}</td><td className="py-2 text-right font-medium">${Number(li.lineTotal).toFixed(2)}</td></tr>))}</tbody></table></div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {payments.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="h-4 w-4" />Payments</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2">{payments.map((p: any) => (<li key={p.id} className="flex items-center justify-between border-b pb-2 last:border-0"><div><p className="text-sm font-medium">${Number(p.amount).toFixed(2)}</p><p className="text-xs text-muted-foreground">{p.paymentMethod} · {p.reference || '--'}</p></div><Badge>{p.status}</Badge></li>))}</ul>
            </CardContent>
          </Card>
        )}
        {receipts.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4" />Receipts</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2">{receipts.map((r: any) => (<li key={r.id} className="border-b pb-2 last:border-0 text-sm"><p className="font-medium">{r.receiptNumber}</p><p className="text-muted-foreground">${Number(r.amount).toFixed(2)} · {r.paymentMethod} · {formatDateTime(r.receivedAt)}</p></li>))}</ul>
            </CardContent>
          </Card>
        )}
      </div>

      {ledger.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Ledger Entries</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2">{ledger.map((l: any) => (<li key={l.id} className="flex items-center justify-between border-b pb-2 last:border-0 text-sm"><div><span className="font-medium">{l.direction}</span> · {l.description || l.referenceType}</div><span className="font-medium">${Number(l.amount).toFixed(2)}</span></li>))}</ul>
          </CardContent>
        </Card>
      )}

      {invoice.notes && <Card><CardHeader><CardTitle>Notes</CardTitle></CardHeader><CardContent><p className="text-sm">{invoice.notes}</p></CardContent></Card>}

      <Separator />
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-4 w-4" />Timeline</CardTitle></CardHeader>
        <CardContent>
          {timeline.length === 0 ? <p className="text-sm text-muted-foreground">No activity yet.</p> : (
            <ul className="space-y-3">{timeline.map((e) => (<li key={e.id} className="flex gap-3 border-b pb-3 last:border-0"><div className="mt-0.5 h-2 w-2 rounded-full bg-primary shrink-0" /><div className="flex-1 min-w-0"><p className="text-sm">{e.subject}</p><p className="text-xs text-muted-foreground mt-0.5">{e.userName} · {formatDateTime(e.createdAt)}</p></div></li>))}</ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
