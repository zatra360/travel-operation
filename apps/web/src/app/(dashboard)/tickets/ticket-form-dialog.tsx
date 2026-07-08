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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Ticket, TICKET_STATUSES } from '@/lib/crm';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket?: Ticket | null;
  onSaved: () => void;
}

interface FormState {
  ticketNumber: string;
  bookingId: string;
  passengerName: string;
  status: string;
  issuedAt: string;
}

const empty: FormState = {
  ticketNumber: '',
  bookingId: '',
  passengerName: '',
  status: 'ISSUED',
  issuedAt: '',
};

export function TicketFormDialog({ open, onOpenChange, ticket, onSaved }: Props) {
  const { activeTenant } = useAuthStore();
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isEdit = !!ticket;

  useEffect(() => {
    if (open) {
      setError('');
      setForm(
        ticket
          ? {
              ticketNumber: ticket.ticketNumber ?? '',
              bookingId: ticket.bookingId ?? '',
              passengerName: ticket.passengerName ?? '',
              status: ticket.status ?? 'ISSUED',
              issuedAt: ticket.issuedAt?.split('T')[0] ?? '',
            }
          : empty,
      );
    }
  }, [open, ticket]);

  const set = (key: keyof FormState, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant) return;
    if (!form.ticketNumber.trim()) {
      setError('Ticket number is required');
      return;
    }
    if (!form.bookingId.trim()) {
      setError('Booking ID is required');
      return;
    }
    setSaving(true);
    setError('');

    const payload = {
      ticketNumber: form.ticketNumber.trim(),
      bookingId: form.bookingId.trim(),
      passengerName: form.passengerName.trim() || undefined,
      status: form.status,
      issuedAt: form.issuedAt || undefined,
    };

    try {
      if (isEdit && ticket) {
        await api.put(`/api/v1/tenant/tickets/${ticket.id}`, payload, { tenantId: activeTenant.id });
        toast.success('Ticket updated');
      } else {
        await api.post('/api/v1/tenant/tickets', payload, { tenantId: activeTenant.id });
        toast.success('Ticket created');
      }
      onOpenChange(false);
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Failed to save ticket');
      toast.error(err.message || 'Failed to save ticket');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Ticket' : 'New Ticket'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update ticket details.' : 'Issue a new ticket for a booking.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}

          <div className="space-y-2">
            <Label htmlFor="ticketNumber">
              Ticket number <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ticketNumber"
              value={form.ticketNumber}
              onChange={(e) => set('ticketNumber', e.target.value)}
              placeholder="TKT-2026-0001"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bookingId">
              Booking ID <span className="text-destructive">*</span>
            </Label>
            <Input
              id="bookingId"
              value={form.bookingId}
              onChange={(e) => set('bookingId', e.target.value)}
              placeholder="Booking ID"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="passengerName">Passenger name</Label>
            <Input
              id="passengerName"
              value={form.passengerName}
              onChange={(e) => set('passengerName', e.target.value)}
              placeholder="John Doe"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TICKET_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="issuedAt">Issued date</Label>
              <Input id="issuedAt" type="date" value={form.issuedAt} onChange={(e) => set('issuedAt', e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Issue ticket'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
