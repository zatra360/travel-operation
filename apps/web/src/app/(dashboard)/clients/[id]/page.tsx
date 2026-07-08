'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Pencil } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate, formatDateTime } from '@/lib/utils';
import { Client, FollowUp, Paginated, clientStatusVariant, followUpStatusVariant } from '@/lib/crm';
import { ClientFormDialog } from '../client-form-dialog';

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || '--'}</p>
    </div>
  );
}

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { activeTenant } = useAuthStore();
  const [client, setClient] = useState<Client | null>(null);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editOpen, setEditOpen] = useState(false);

  const load = useCallback(() => {
    if (!activeTenant) return;
    setLoading(true);
    setError('');
    Promise.all([
      api.get<Client>(`/api/v1/tenant/clients/${id}`, { tenantId: activeTenant.id }),
      api.get<Paginated<FollowUp>>(`/api/v1/tenant/follow-ups?clientId=${id}`, {
        tenantId: activeTenant.id,
      }),
    ])
      .then(([clientRes, fuRes]) => {
        setClient(clientRes);
        setFollowUps(fuRes.data);
      })
      .catch((err) => setError(err.message || 'Failed to load client'))
      .finally(() => setLoading(false));
  }, [activeTenant, id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <p className="text-muted-foreground">Loading client...</p>;
  if (error)
    return <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>;
  if (!client) return <p className="text-muted-foreground">Client not found.</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/clients')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold">{client.displayName}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">{client.type}</Badge>
              <Badge variant={clientStatusVariant[client.status] || 'secondary'}>
                {client.status}
              </Badge>
            </div>
          </div>
        </div>
        <Button size="sm" onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4 mr-2" />
          Edit
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="Email" value={client.email} />
            <Field label="Phone" value={client.phone} />
            <Field label="Company" value={client.companyName} />
            <Field label="Gender" value={client.gender} />
            <Field
              label="Date of birth"
              value={client.dateOfBirth ? formatDate(client.dateOfBirth) : null}
            />
            <Field label="Created" value={formatDateTime(client.createdAt)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Follow-ups</CardTitle>
          </CardHeader>
          <CardContent>
            {followUps.length === 0 ? (
              <p className="text-sm text-muted-foreground">No follow-ups scheduled.</p>
            ) : (
              <ul className="space-y-3">
                {followUps.map((fu) => (
                  <li key={fu.id} className="border-b pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{fu.subject}</p>
                      <Badge variant={followUpStatusVariant[fu.status] || 'secondary'}>
                        {fu.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {fu.channel} · {formatDateTime(fu.scheduledAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <ClientFormDialog open={editOpen} onOpenChange={setEditOpen} client={client} onSaved={load} />
    </div>
  );
}
