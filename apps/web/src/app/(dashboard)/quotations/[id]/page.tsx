'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Send, CheckCircle, XCircle, Plane, CreditCard, Clock, History } from 'lucide-react';
import { Breadcrumb, PageHeader } from '@/components/ui/page-header';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDateTime } from '@/lib/utils';
import { Quotation, TimelineEvent, quotationStatusVariant } from '@/lib/crm';

export default function QuotationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { activeTenant } = useAuthStore();
  const [q, setQ] = useState<any>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!activeTenant) return;
    setLoading(true); setError('');
    Promise.all([
      api.get<any>(`/api/v1/tenant/quotations/${id}`, { tenantId: activeTenant.id }),
      api.get<TimelineEvent[]>(`/api/v1/tenant/quotations/${id}/timeline`, { tenantId: activeTenant.id }).catch(() => []),
    ])
      .then(([qRes, tl]) => { setQ(qRes); setTimeline(tl); })
      .catch((err) => setError(err.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, [activeTenant, id]);

  useEffect(() => { load(); }, [load]);

  const action = async (endpoint: string) => {
    try {
      await api.post(`/api/v1/tenant/quotations/${id}/${endpoint}`, {}, { tenantId: activeTenant!.id });
      toast.success(`${endpoint} successful`);
      load();
    } catch (err: any) { toast.error(err.message || `Failed to ${endpoint}`); }
  };

  if (loading) return <p className="text-muted-foreground">Loading quotation...</p>;
  if (error) return <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>;
  if (!q) return <p className="text-muted-foreground">Not found.</p>;

  const lineItems = q.lineItems || [];
  const statusLogs = q.statusLogs || [];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Quotations', href: '/quotations' },
        { label: q.quoteNumber },
      ]} />
      <PageHeader
        title={q.quoteNumber}
        subtitle={`${q.title || 'No title'} · ${q.status}`}
        actions={
          <>
            {q.status === 'DRAFT' && <Button size="sm" variant="outline" onClick={() => action('send')}><Send className="h-4 w-4 mr-2" />Send</Button>}
            {q.status === 'SENT' && <><Button size="sm" variant="outline" onClick={() => action('accept')}><CheckCircle className="h-4 w-4 mr-2" />Accept</Button><Button size="sm" variant="outline" onClick={() => action('reject')}><XCircle className="h-4 w-4 mr-2" />Reject</Button></>}
            {q.status === 'ACCEPTED' && <><Button size="sm" variant="outline" onClick={() => action('convert-to-booking')}><Plane className="h-4 w-4 mr-2" />Convert to Booking</Button><Button size="sm" variant="outline" onClick={() => action('convert-to-invoice')}><CreditCard className="h-4 w-4 mr-2" />Create Invoice</Button></>}
            {(q.status === 'DRAFT' || q.status === 'SENT') && <Button size="sm" variant="outline" onClick={() => action('cancel')}><XCircle className="h-4 w-4 mr-2" />Cancel</Button>}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Line Items</CardTitle></CardHeader>
          <CardContent>
            {lineItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No line items.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-left"><th className="pb-2 font-medium">Service</th><th className="pb-2 font-medium">Description</th><th className="pb-2 font-medium text-right">Qty</th><th className="pb-2 font-medium text-right">Unit Price</th><th className="pb-2 font-medium text-right">Total</th></tr></thead>
                  <tbody>
                    {lineItems.map((li: any) => (
                      <tr key={li.id} className="border-b last:border-0">
                        <td className="py-2">{li.serviceType || '--'}</td><td className="py-2 text-muted-foreground">{li.description || li.title || '--'}</td>
                        <td className="py-2 text-right">{li.quantity}</td><td className="py-2 text-right">${Number(li.unitPrice).toFixed(2)}</td>
                        <td className="py-2 text-right font-medium">${Number(li.lineTotal).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Separator className="my-4" />
            <div className="grid grid-cols-4 gap-4 text-right text-sm">
              <div><p className="text-xs text-muted-foreground">Subtotal</p><p className="font-medium">${Number(q.subtotal).toFixed(2)}</p></div>
              <div><p className="text-xs text-muted-foreground">Tax</p><p className="font-medium">${Number(q.taxTotal).toFixed(2)}</p></div>
              <div><p className="text-xs text-muted-foreground">Discount</p><p className="font-medium">${Number(q.discountTotal).toFixed(2)}</p></div>
              <div><p className="text-xs text-muted-foreground">Grand Total</p><p className="font-bold text-lg">${Number(q.grandTotal).toFixed(2)}</p></div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Info</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><span className="text-muted-foreground">Client: </span><span className="font-medium">{q.clientId || '--'}</span></div>
              <div><span className="text-muted-foreground">Lead: </span><span className="font-medium">{q.leadId || '--'}</span></div>
              <div><span className="text-muted-foreground">Valid until: </span>{q.validUntil ? formatDateTime(q.validUntil) : '--'}</div>
              <div><span className="text-muted-foreground">Revision: </span>{q.currentRevision || 1}</div>
              <div><span className="text-muted-foreground">Created: </span>{formatDateTime(q.createdAt)}</div>
            </CardContent>
          </Card>

          {statusLogs.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center gap-2"><History className="h-4 w-4" /><CardTitle>Status History</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {statusLogs.slice(0, 10).map((log: any) => (
                    <li key={log.id} className="flex gap-2 border-b pb-2 last:border-0 text-sm">
                      <div className="mt-0.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                      <div>
                        <p>{log.fromStatus ? `${log.fromStatus} → ` : ''}{log.toStatus}</p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Separator />

      {q.notes && (
        <Card>
          <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
          <CardContent><p className="text-sm">{q.notes}</p></CardContent>
        </Card>
      )}
      {q.terms && (
        <Card>
          <CardHeader><CardTitle>Terms</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{q.terms}</p></CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-4 w-4" />Timeline</CardTitle></CardHeader>
        <CardContent>
          {timeline.length === 0 ? <p className="text-sm text-muted-foreground">No activity yet.</p> : (
            <ul className="space-y-3">{timeline.map((e) => (
              <li key={e.id} className="flex gap-3 border-b pb-3 last:border-0"><div className="mt-0.5 h-2 w-2 rounded-full bg-primary shrink-0" /><div className="flex-1 min-w-0"><p className="text-sm">{e.subject}</p><p className="text-xs text-muted-foreground mt-0.5">{e.userName} · {formatDateTime(e.createdAt)}</p></div></li>
            ))}</ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
