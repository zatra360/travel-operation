'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Lead } from '@/lib/crm';
import LeadForm from '../../lead-form';

export default function EditLeadPage() {
  const params = useParams();
  const id = params.id as string;
  const { activeTenant } = useAuthStore();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!activeTenant) return;
    api.get<Lead>(`/api/v1/tenant/leads/${id}`, { tenantId: activeTenant.id })
      .then(setLead)
      .catch((err) => setError(err.message || 'Failed to load lead'))
      .finally(() => setLoading(false));
  }, [activeTenant, id]);

  if (loading) return <div className="space-y-6"><Skeleton className="h-8 w-48" /><div className="grid gap-6 lg:grid-cols-2"><Skeleton className="h-96" /><Skeleton className="h-96" /></div></div>;
  if (error) return <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>;
  if (!lead) return <p className="text-muted-foreground">Lead not found.</p>;

  return <LeadForm mode="edit" lead={lead} />;
}
