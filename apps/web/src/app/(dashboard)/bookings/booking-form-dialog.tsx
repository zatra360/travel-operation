import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Booking, BOOKING_STATUSES } from '@/lib/crm';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking?: Booking | null;
  onSaved: () => void;
}

interface FormState {
  bookingRef: string;
  pnrLocator: string;
  status: string;
  travelStart: string;
  travelEnd: string;
  notes: string;
}

const empty: FormState = {
  bookingRef: '',
  pnrLocator: '',
  status: 'PENDING',
  travelStart: '',
  travelEnd: '',
  notes: '',
};

export function BookingFormDialog({ open, onOpenChange, booking, onSaved }: Props) {
  const { activeTenant } = useAuthStore();
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isEdit = !!booking;

  useEffect(() => {
    if (open) {
      setError('');
      setForm(
        booking
          ? {
              bookingRef: booking.bookingRef ?? '',
              pnrLocator: booking.pnrLocator ?? '',
              status: booking.status ?? 'PENDING',
              travelStart: booking.travelStart?.split('T')[0] ?? '',
              travelEnd: booking.travelEnd?.split('T')[0] ?? '',
              notes: booking.notes ?? '',
            }
          : empty,
      );
    }
  }, [open, booking]);

  const set = (key: keyof FormState, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant) return;
    if (!form.bookingRef.trim()) {
      setError('Booking reference is required');
      return;
    }
    setSaving(true);
    setError('');

    const payload = {
      bookingRef: form.bookingRef.trim(),
      pnrLocator: form.pnrLocator.trim() || undefined,
      status: form.status,
      travelStart: form.travelStart || undefined,
      travelEnd: form.travelEnd || undefined,
      notes: form.notes.trim() || undefined,
    };

    try {
      if (isEdit && booking) {
        await api.put(`/api/v1/tenant/bookings/${booking.id}`, payload, { tenantId: activeTenant.id });
        toast.success('Booking updated');
      } else {
        await api.post('/api/v1/tenant/bookings', payload, { tenantId: activeTenant.id });
        toast.success('Booking created');
      }
      onOpenChange(false);
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Failed to save booking');
      toast.error(err.message || 'Failed to save booking');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Booking' : 'New Booking'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update booking details.' : 'Create a new travel booking.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}

          <div className="space-y-2">
            <Label htmlFor="bookingRef">
              Booking reference <span className="text-destructive">*</span>
            </Label>
            <Input
              id="bookingRef"
              value={form.bookingRef}
              onChange={(e) => set('bookingRef', e.target.value)}
              placeholder="BK-2026-0001"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pnrLocator">PNR locator</Label>
            <Input
              id="pnrLocator"
              value={form.pnrLocator}
              onChange={(e) => set('pnrLocator', e.target.value)}
              placeholder="ABC123"
            />
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => set('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {BOOKING_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="travelStart">Travel start</Label>
              <Input id="travelStart" type="date" value={form.travelStart} onChange={(e) => set('travelStart', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="travelEnd">Travel end</Label>
              <Input id="travelEnd" type="date" value={form.travelEnd} onChange={(e) => set('travelEnd', e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Special requests, remarks..." />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Create booking'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
