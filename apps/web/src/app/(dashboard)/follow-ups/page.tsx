'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Plus, CheckCircle2, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDateTime } from '@/lib/utils';
import { FollowUp, Paginated, FOLLOWUP_STATUSES, followUpStatusVariant } from '@/lib/crm';
import { FollowUpFormDialog } from './follow-up-form-dialog';

export default function FollowUpsPage() {
  const [items, setItems] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<FollowUp | null>(null);
  const { activeTenant } = useAuthStore();

  const load = useCallback(() => {
    if (!activeTenant) return;
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    api
      .get<Paginated<FollowUp>>(`/api/v1/tenant/follow-ups?${params.toString()}`, {
        tenantId: activeTenant.id,
      })
      .then((res) => setItems(res.data))
      .catch((err) => setError(err.message || 'Failed to load follow-ups'))
      .finally(() => setLoading(false));
  }, [activeTenant, status]);

  useEffect(() => {
    load();
  }, [load]);

  const handleComplete = async (fu: FollowUp) => {
    if (!activeTenant) return;
    try {
      await api.post(
        `/api/v1/tenant/follow-ups/${fu.id}/complete`,
        {},
        { tenantId: activeTenant.id },
      );
      toast.success('Follow-up completed');
      load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to complete follow-up');
    }
  };

  const handleDelete = async () => {
    if (!activeTenant || !deleting) return;
    try {
      await api.delete(`/api/v1/tenant/follow-ups/${deleting.id}`, { tenantId: activeTenant.id });
      toast.success('Follow-up deleted');
      load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete follow-up');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Follow-ups</h2>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Follow-up
        </Button>
      </div>

      <div className="flex flex-wrap gap-1">
        <Button
          variant={status === '' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatus('')}
        >
          All
        </Button>
        {FOLLOWUP_STATUSES.map((s) => (
          <Button
            key={s}
            variant={status === s ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatus(s)}
          >
            {s}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scheduled Follow-ups</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading follow-ups...</p>
          ) : error ? (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          ) : items.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-muted-foreground">No follow-ups found.</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={() => setFormOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Schedule a follow-up
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium">Subject</th>
                    <th className="pb-3 font-medium">Channel</th>
                    <th className="pb-3 font-medium">Scheduled</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((fu) => (
                    <tr key={fu.id} className="border-b last:border-0">
                      <td className="py-3 font-medium">{fu.subject}</td>
                      <td className="py-3 text-muted-foreground">{fu.channel}</td>
                      <td className="py-3 text-muted-foreground">
                        {formatDateTime(fu.scheduledAt)}
                      </td>
                      <td className="py-3">
                        <Badge variant={followUpStatusVariant[fu.status] || 'secondary'}>
                          {fu.status}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center justify-end gap-1">
                          {fu.status === 'PENDING' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Mark complete"
                              onClick={() => handleComplete(fu)}
                            >
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Delete"
                            onClick={() => setDeleting(fu)}
                          >
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

      <FollowUpFormDialog open={formOpen} onOpenChange={setFormOpen} onSaved={load} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete follow-up?"
        description={`This will remove "${deleting?.subject}". This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </div>
  );
}
