'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Pencil, UserCheck, Clock } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDateTime } from '@/lib/utils';
import {
  Lead,
  FollowUp,
  Quotation,
  Paginated,
  TimelineEvent,
  leadStatusVariant,
  leadPriorityVariant,
  followUpStatusVariant,
} from '@/lib/crm';
import { LeadFormDialog } from '../lead-form-dialog';
import { Skeleton } from '@/components/ui/skeleton';

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
  const [lead, setLead] = useState<(Lead & { quotations?: any[] }) | null>(null);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editOpen, setEditOpen] = useState(false);

  const load = useCallback(() => {
    if (!activeTenant) return;
    setLoading(true);
    setError('');
    Promise.all([
      api.get<Lead>(`/api/v1/tenant/leads/${id}`, { tenantId: activeTenant.id }),
      api.get<Paginated<FollowUp>>(`/api/v1/tenant/follow-ups?leadId=${id}`, { tenantId: activeTenant.id }),
      api.get<Paginated<Quotation>>(`/api/v1/tenant/quotations?leadId=${id}`, { tenantId: activeTenant.id }),
    ])
      .then(([leadRes, fuRes, qRes]) => {
        setLead({ ...leadRes, quotations: qRes.data });
        setFollowUps(fuRes.data);
        return api.get<TimelineEvent[]>(`/api/v1/tenant/leads/${id}/timeline`, { tenantId: activeTenant.id });
      })
      .then((tl) => setTimeline(tl))
      .catch(() => {
        api.get<TimelineEvent[]>(`/api/v1/tenant/leads/${id}/timeline`, { tenantId: activeTenant.id })
          .then((tl) => setTimeline(tl))
          .catch(() => {});
      })
      .catch((err) => setError(err.message || 'Failed to load lead'))
      .finally(() => setLoading(false));
  }, [activeTenant, id]);

  useEffect(() => { load(); }, [load]);

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

  if (loading) return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-6 w-48" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  );
  if (error) return <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>;
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
              <Badge variant={leadPriorityVariant[lead.priority] || 'secondary'}>{lead.priority}</Badge>
              {lead.source && <Badge variant="outline">{lead.source}</Badge>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lead.status !== 'WON' && (
            <Button variant="outline" size="sm" onClick={handleConvert}>
              <UserCheck className="h-4 w-4 mr-2" />Convert to client
            </Button>
          )}
          <Button size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4 mr-2" />Edit
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="Email" value={lead.email} />
            <Field label="Phone" value={lead.primaryMobile || lead.phone} />
            <Field label="Source" value={lead.source} />
            <Field label="Service type" value={lead.serviceType} />
            <Field label="Trip type" value={lead.tripType} />
            <Field label="Travel date" value={lead.preferredTravelDate ? formatDateTime(lead.preferredTravelDate) : null} />
            <Field label="Passengers" value={lead.numAdults && lead.numAdults > 0 ? `${lead.numAdults}A ${lead.numChildren}C ${lead.numInfants}I` : null} />
            <Field label="Destination" value={lead.destinationCity} />
            <Field label="Priority" value={lead.priority} />
            <Field label="Lead score" value={lead.leadScore?.toString() ?? null} />
            <Field label="Potential revenue" value={lead.potentialRevenue ? `$${Number(lead.potentialRevenue).toFixed(2)}` : null} />
            <Field label="Created" value={formatDateTime(lead.createdAt)} />
            <div className="col-span-2 sm:col-span-3">
              <Field label="Notes" value={lead.notes} />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Follow-ups</CardTitle>
              <span className="text-xs text-muted-foreground">{followUps.length} total</span>
            </CardHeader>
            <CardContent>
              {followUps.length === 0 ? (
                <p className="text-sm text-muted-foreground">No follow-ups scheduled.</p>
              ) : (
                <ul className="space-y-3">
                  {followUps.slice(0, 5).map((fu) => (
                    <li key={fu.id} className="border-b pb-3 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{fu.subject}</p>
                        <Badge variant={followUpStatusVariant[fu.status] || 'secondary'}>{fu.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{fu.channel} · {formatDateTime(fu.scheduledAt)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {(lead as any).quotations?.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Quotations</CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href="/quotations">View all</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {(lead as any).quotations.slice(0, 5).map((q: any) => (
                  <li key={q.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium">{q.quoteNumber} {q.title && `— ${q.title}`}</p>
                      <p className="text-xs text-muted-foreground">${Number(q.grandTotal || 0).toFixed(2)} · {q.status}</p>
                    </div>
                    <Badge variant={q.status === 'ACCEPTED' ? 'success' : q.status === 'REJECTED' ? 'destructive' : 'secondary'}>{q.status}</Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4" /> Activity Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          {timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
          ) : (
            <ul className="space-y-3">
              {timeline.map((event) => (
                <li key={event.id} className="flex gap-3 border-b pb-3 last:border-0 last:pb-0">
                  <div className="mt-0.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{event.subject}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {event.userName} · {formatDateTime(event.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <LeadFormDialog open={editOpen} onOpenChange={setEditOpen} lead={lead} onSaved={load} />
    </div>
  );
}
