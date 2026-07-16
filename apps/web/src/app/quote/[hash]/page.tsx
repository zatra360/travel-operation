'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, XCircle, PenTool, Printer } from 'lucide-react';
import { formatDate, formatMoney } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3900';

export default function PublicQuotationPage() {
  const params = useParams();
  const hash = params.hash as string;
  const [quotation, setQuotation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [signing, setSigning] = useState(false);
  const [signForm, setSignForm] = useState({ fullName: '', email: '', consentGiven: true });
  const [comment, setComment] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/api/v1/public/quotations/${hash}`)
      .then(r => r.json())
      .then(data => { setQuotation(data.data || data); })
      .catch(() => setError('Quotation not found'))
      .finally(() => setLoading(false));
  }, [hash]);

  const handleAccept = async () => {
    const res = await fetch(`${API_URL}/api/v1/public/quotations/${hash}/accept`, { method: 'POST' });
    if (res.ok) { const d = await res.json(); setQuotation({ ...quotation, status: d.data?.status || 'ACCEPTED' }); }
  };

  const handleReject = async () => {
    const res = await fetch(`${API_URL}/api/v1/public/quotations/${hash}/reject`, { method: 'POST' });
    if (res.ok) { const d = await res.json(); setQuotation({ ...quotation, status: d.data?.status || 'REJECTED' }); }
  };

  const handleSign = async () => {
    const res = await fetch(`${API_URL}/api/v1/public/quotations/${hash}/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signForm),
    });
    if (res.ok) {
      const sig = await res.json();
      setQuotation({ ...quotation, sign: sig.data || sig, signature: sig.data || sig });
      setSigning(false);
    }
  };

  const handleComment = async () => {
    await fetch(`${API_URL}/api/v1/public/quotations/${hash}/comment`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment }),
    });
    setQuotation({ ...quotation, clientComment: comment });
    setComment('');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center p-8"><Skeleton className="h-96 w-full max-w-2xl" /></div>;
  if (error || !quotation) return <div className="min-h-screen flex items-center justify-center p-8"><p className="text-destructive text-lg">{error || 'Quotation not found'}</p></div>;

  const canSign = quotation.status === 'SENT' || quotation.status === 'VIEWED' || quotation.status === 'ACCEPTED';
  const canAccept = quotation.status === 'SENT' || quotation.status === 'VIEWED';
  const isTerminal = ['ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED', 'BOOKING_CREATED'].includes(quotation.status);

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center print:mb-4">
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">TO</span>
            </div>
            <span className="text-lg font-bold tracking-tight">Travel Operation</span>
          </div>
          <p className="text-xs text-muted-foreground">Official Quotation</p>
        </div>
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercased tracking-wide">Quotation</p>
                <h1 className="text-2xl font-bold">{quotation.title || `Quote #${quotation.quoteNumber}`}</h1>
                <p className="text-sm text-muted-foreground">{quotation.quoteNumber}</p>
              </div>
              <Badge variant={quotation.status === 'ACCEPTED' ? 'success' : quotation.status === 'REJECTED' ? 'destructive' : 'default'} className="text-sm px-3 py-1">{quotation.status}</Badge>
              <Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden"><Printer className="h-4 w-4 mr-1" />Print</Button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              {quotation.client && <div><p className="text-muted-foreground">Client</p><p className="font-medium">{quotation.client.displayName}</p></div>}
              {quotation.validUntil && <div><p className="text-muted-foreground">Valid Until</p><p className="font-medium">{formatDate(quotation.validUntil)}</p></div>}
              <div><p className="text-muted-foreground">Currency</p><p className="font-medium">{quotation.currencyCode}</p></div>
              <div><p className="text-muted-foreground">Total</p><p className="text-xl font-bold">{formatMoney(Number(quotation.grandTotal), quotation.currencyCode)}</p></div>
            </div>

            {quotation.notes && <div className="bg-muted/50 rounded-lg p-3 text-sm">{quotation.notes}</div>}
          </CardContent>
        </Card>

        {quotation.lineItems?.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <h2 className="font-semibold mb-3">Line Items</h2>
              <div className="space-y-2">
                {quotation.lineItems.map((item: any, i: number) => (
                  <div key={item.id || i} className="flex justify-between items-center border-b pb-2 last:border-0 text-sm">
                    <div>
                      <p className="font-medium">{item.title || item.serviceType || `Item ${i + 1}`}</p>
                      {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                      <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-medium">{formatMoney(Number(item.lineTotal || item.unitPrice * item.quantity), quotation.currencyCode)}</p>
                  </div>
                ))}
              </div>
              <Separator className="my-3" />
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span>{formatMoney(Number(quotation.subtotal), quotation.currencyCode)}</span></div>
                {Number(quotation.taxTotal) > 0 && <div className="flex justify-between"><span>Tax</span><span>{formatMoney(Number(quotation.taxTotal), quotation.currencyCode)}</span></div>}
                {Number(quotation.discountTotal) > 0 && <div className="flex justify-between"><span>Discount</span><span>-{formatMoney(Number(quotation.discountTotal), quotation.currencyCode)}</span></div>}
                <div className="flex justify-between font-bold text-lg pt-1 border-t"><span>Grand Total</span><span>{formatMoney(Number(quotation.grandTotal), quotation.currencyCode)}</span></div>
              </div>
            </CardContent>
          </Card>
        )}

        {quotation.terms && (
          <Card><CardContent className="pt-6"><h2 className="font-semibold mb-2">Terms & Conditions</h2><p className="text-sm whitespace-pre-wrap">{quotation.terms}</p></CardContent></Card>
        )}

        {quotation.signature && (
          <Card className="border-success/30 bg-success/5">
            <CardContent className="pt-6 flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-success" />
              <div>
                <p className="font-semibold text-success">Signed</p>
                <p className="text-sm">{quotation.signature.fullName} · {quotation.signature.email}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Client comment */}
        <Card>
          <CardContent className="pt-6 space-y-3">
            <h2 className="font-semibold">Comments</h2>
            {quotation.clientComment && <div className="bg-muted/50 rounded-lg p-3 text-sm">{quotation.clientComment}</div>}
            <div className="flex gap-2">
              <Input placeholder="Add a comment..." value={comment} onChange={e => setComment(e.target.value)} disabled={isTerminal} />
              <Button variant="outline" onClick={handleComment} disabled={!comment.trim() || isTerminal}>Send</Button>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        {!isTerminal && (
          <div className="flex gap-3 flex-wrap">
            {canAccept && <Button size="lg" onClick={handleAccept}><CheckCircle className="h-4 w-4 mr-2" />Accept</Button>}
            {canAccept && <Button size="lg" variant="destructive" onClick={handleReject}><XCircle className="h-4 w-4 mr-2" />Reject</Button>}
            {canSign && !quotation.signature && (
              signing ? (
                <Card className="flex-1 min-w-[300px]"><CardContent className="pt-4 space-y-3">
                  <h3 className="font-semibold">Sign Quotation</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Full Name</Label><Input value={signForm.fullName} onChange={e => setSignForm({ ...signForm, fullName: e.target.value })} /></div>
                    <div><Label>Email</Label><Input value={signForm.email} onChange={e => setSignForm({ ...signForm, email: e.target.value })} /></div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={signForm.consentGiven} onChange={e => setSignForm({ ...signForm, consentGiven: e.target.checked })} id="consent" />
                    <label htmlFor="consent">I agree to the terms and conditions</label>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSign}><PenTool className="h-4 w-4 mr-2" />Sign</Button>
                    <Button variant="outline" onClick={() => setSigning(false)}>Cancel</Button>
                  </div>
                </CardContent></Card>
              ) : (
                <Button size="lg" variant="outline" onClick={() => setSigning(true)}><PenTool className="h-4 w-4 mr-2" />Sign</Button>
              )
            )}
          </div>
        )}

        {isTerminal && (
          <div className="text-center py-6 text-muted-foreground">
            This quotation has been <strong>{quotation.status.toLowerCase()}</strong>.
          </div>
        )}
      </div>
    </div>
  );
}
