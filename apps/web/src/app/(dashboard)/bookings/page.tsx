'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate } from '@/lib/utils';
import { Booking, Paginated, BOOKING_STATUSES, bookingStatusVariant } from '@/lib/crm';
import { TableSkeleton } from '@/components/ui/skeleton';
import { BookingFormDialog } from './booking-form-dialog';

export default function BookingsPage() {
  const [items, setItems] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Booking | null>(null);
  const [deleting, setDeleting] = useState<Booking | null>(null);
  const { activeTenant } = useAuthStore();

  const load = useCallback(() => {
    if (!activeTenant) return;
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    api
      .get<Paginated<Booking>>(`/api/v1/tenant/bookings?${params.toString()}`, {
        tenantId: activeTenant.id,
      })
      .then((res) => setItems(res.data))
      .catch((err) => setError(err.message || 'Failed to load bookings'))
      .finally(() => setLoading(false));
  }, [activeTenant, search, status]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (b: Booking) => { setEditing(b); setFormOpen(true); };

  const handleDelete = async () => {
    if (!activeTenant || !deleting) return;
    try {
      await api.delete(`/api/v1/tenant/bookings/${deleting.id}`, { tenantId: activeTenant.id });
      toast.success('Booking deleted');
      load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete booking');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Bookings</h2>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />New Booking
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search booking ref or PNR..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>
        <div className="flex flex-wrap gap-1">
          <Button variant={status === '' ? 'default' : 'outline'} size="sm" onClick={() => setStatus('')}>All</Button>
          {BOOKING_STATUSES.map((s) => (
            <Button key={s} variant={status === s ? 'default' : 'outline'} size="sm" onClick={() => setStatus(s)}>{s}</Button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>All Bookings</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton />
          ) : error ? (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          ) : items.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-muted-foreground">No bookings found.</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />Create your first booking
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium">Booking Ref</th>
                    <th className="pb-3 font-medium">PNR</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Travel Dates</th>
                    <th className="pb-3 font-medium">Created</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((b) => (
                    <tr key={b.id} className="border-b last:border-0">
                      <td className="py-3 font-medium"><Link href={`/bookings/${b.id}`} className="hover:underline text-primary">{b.bookingRef}</Link></td>
                      <td className="py-3 text-muted-foreground">{b.pnrLocator || '--'}</td>
                      <td className="py-3">
                        <Badge variant={bookingStatusVariant[b.status] || 'secondary'}>{b.status}</Badge>
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {b.travelStart && b.travelEnd
                          ? `${formatDate(b.travelStart)} – ${formatDate(b.travelEnd)}`
                          : b.travelStart
                            ? `From ${formatDate(b.travelStart)}`
                            : '--'}
                      </td>
                      <td className="py-3 text-muted-foreground">{formatDate(b.createdAt)}</td>
                      <td className="py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(b)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Delete" onClick={() => setDeleting(b)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <BookingFormDialog open={formOpen} onOpenChange={setFormOpen} booking={editing} onSaved={load} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete booking?"
        description={`This will remove ${deleting?.bookingRef}. This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </div>
  );
}
