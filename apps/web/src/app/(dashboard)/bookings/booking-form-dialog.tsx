'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Booking, BOOKING_STATUSES } from '@/lib/crm';

interface Props { open: boolean; onOpenChange: (open: boolean) => void; booking?: Booking | null; onSaved: () => void; }

export function BookingFormDialog({ open, onOpenChange, booking, onSaved }: Props) {
  const { activeTenant } = useAuthStore();
  const [form, setForm] = useState({ bookingRef: '', pnrLocator: '', status: 'HELD', travelStart: '', travelEnd: '', notes: '', clientId: '', leadId: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isEdit = !!booking;

  useEffect(() => {
    if (open) {
      setError('');
      if (booking) setForm({ bookingRef: booking.bookingRef ?? '', pnrLocator: booking.pnrLocator ?? '', status: booking.status ?? 'HELD', travelStart: booking.travelStart?.split('T')[0] ?? '', travelEnd: booking.travelEnd?.split('T')[0] ?? '', notes: booking.notes ?? '', clientId: booking.clientId || '', leadId: booking.leadId || '' });
      else setForm({ bookingRef: '', pnrLocator: '', status: 'HELD', travelStart: '', travelEnd: '', notes: '', clientId: '', leadId: '' });
    }
  }, [open, booking]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant) return;
    if (!form.bookingRef.trim()) { setError('Booking reference is required'); return; }
    setSaving(true); setError('');
    try {
      const payload: any = { bookingRef: form.bookingRef.trim(), pnrLocator: form.pnrLocator.trim() || undefined, status: form.status, travelStart: form.travelStart || undefined, travelEnd: form.travelEnd || undefined, notes: form.notes.trim() || undefined, clientId: form.clientId || undefined, leadId: form.leadId || undefined };
      if (isEdit && booking) { await api.put(`/api/v1/tenant/bookings/${booking.id}`, payload, { tenantId: activeTenant.id }); toast.success('Updated'); }
      else { await api.post('/api/v1/tenant/bookings', payload, { tenantId: activeTenant.id }); toast.success('Created'); }
      onOpenChange(false); onSaved();
    } catch (err: any) { setError(err.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{isEdit ? 'Edit Booking' : 'New Booking'}</DialogTitle><DialogDescription>{isEdit ? 'Update booking details.' : 'Create a new travel booking.'}</DialogDescription></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
          <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Booking Reference <span className="text-destructive">*</span></Label><Input value={form.bookingRef} onChange={e => set('bookingRef', e.target.value)} placeholder="BK-2026-0001" required className="mt-1" /></div>
          <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">PNR Locator</Label><Input value={form.pnrLocator} onChange={e => set('pnrLocator', e.target.value)} placeholder="ABC123" className="mt-1" /></div>
          <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</Label><Select value={form.status} onValueChange={v => set('status', v)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{BOOKING_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Travel Start</Label><Input type="date" value={form.travelStart} onChange={e => set('travelStart', e.target.value)} className="mt-1" /></div>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Travel End</Label><Input type="date" value={form.travelEnd} onChange={e => set('travelEnd', e.target.value)} className="mt-1" /></div>
          </div>
          <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</Label><Textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Additional notes..." className="mt-1" rows={2} /></div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving...' : isEdit ? 'Save' : 'Create'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
