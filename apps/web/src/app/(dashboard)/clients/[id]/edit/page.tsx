'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Client } from '@/lib/crm';
import ClientForm from '../../client-form';

export default function EditClientPage() {
  const params = useParams();
  const id = params.id as string;
  const { activeTenant } = useAuthStore();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!activeTenant) return;
    api.get<Client>(`/api/v1/tenant/clients/${id}`, { tenantId: activeTenant.id })
      .then(setClient)
      .catch((err) => setError(err.message || 'Failed to load client'))
      .finally(() => setLoading(false));
  }, [activeTenant, id]);

  if (loading) return <div className="space-y-6"><Skeleton className="h-8 w-48" /><div className="grid gap-6 lg:grid-cols-2"><Skeleton className="h-96" /><Skeleton className="h-96" /></div></div>;
  if (error) return <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>;
  if (!client) return <p className="text-muted-foreground">Client not found.</p>;

  return <ClientForm mode="edit" client={client} />;
}
