'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Quotation } from '@/lib/crm';
import QuotationForm from '../../quotation-form';

export default function EditQuotationPage() {
  const params = useParams();
  const id = params.id as string;
  const { activeTenant } = useAuthStore();
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeTenant) return;
    api.get<Quotation>(`/api/v1/tenant/quotations/${id}`, { tenantId: activeTenant.id })
      .then(setQuotation).catch(() => setQuotation(null)).finally(() => setLoading(false));
  }, [activeTenant, id]);

  if (loading) return <div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-96" /></div>;
  if (!quotation) return <p className="text-muted-foreground">Quotation not found.</p>;

  return <QuotationForm mode="edit" quotation={quotation} />;
}
