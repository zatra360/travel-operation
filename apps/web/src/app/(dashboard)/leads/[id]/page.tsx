'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Pencil, UserCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDateTime } from '@/lib/utils';
import {
  Lead,
  FollowUp,
  Paginated,
  leadStatusVariant,
  leadPriorityVariant,
  followUpStatusVariant,
} from '@/lib/crm';
import { LeadFormDialog } from '../lead-form-dialog';

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || '--'}</p>
    </div>
  );
}

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { activeTenant } = useAuthStore();
  const [lead, setLead] = useState<Lead | null>(null);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editOpen, setEditOpen] = useState(false);

  const load = useCallback(() => {
    if (!activeTenant) return;
    setLoading(true);
    setError('');
    Promise.all([
      api.get<Lead>(`/api/v1/tenant/leads/${id}`, { tenantId: activeTenant.id }),
      api.get<Paginated<FollowUp>>(`/api/v1/tenant/follow-ups?leadId=${id}`, {
        tenantId: activeTenant.id,
      }),
    ])
      .then(([leadRes, fuRes]) => {
        setLead(leadRes);
        setFollowUps(fuRes.data);
      })
      .catch((err) => setError(err.message || 'Failed to load lead'))
      .finally(() => setLoading(false));
  }, [activeTenant, id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleConvert = async () => {
    if (!activeTenant || !lead) return;
    try {
      await api.post(`/api/v1/tenant/leads/${lead.id}/convert`, {}, { tenantId: activeTenant.id });
      toast.success('Lead converted to client');
      load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to convert lead');
    }
  };

  if (loading) return <p className="text-muted-foreground">Loading lead...</p>;
  if (error)
    return <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>;
  if (!lead) return <p className="text-muted-foreground">Lead not found.</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/leads')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold">{lead.fullName}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={leadStatusVariant[lead.status] || 'secondary'}>{lead.status}</Badge>
              <Badge variant={leadPriorityVariant[lead.priority] || 'secondary'}>
                {lead.priority}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lead.status !== 'WON' && (
            <Button variant="outline" size="sm" onClick={handleConvert}>
              <UserCheck className="h-4 w-4 mr-2" />
              Convert to client
            </Button>
          )}
          <Button size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="Email" value={lead.email} />
            <Field label="Phone" value={lead.phone} />
            <Field label="Source" value={lead.source} />
            <Field label="Service type" value={lead.serviceType} />
            <Field label="Created" value={formatDateTime(lead.createdAt)} />
            <Field label="Updated" value={formatDateTime(lead.updatedAt)} />
            <div className="col-span-2 sm:col-span-3">
              <Field label="Notes" value={lead.notes} />
            </div>
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
            <Button asChild variant="outline" size="sm" className="mt-4 w-full">
              <Link href="/follow-ups">Manage follow-ups</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <LeadFormDialog open={editOpen} onOpenChange={setEditOpen} lead={lead} onSaved={load} />
    </div>
  );
}
