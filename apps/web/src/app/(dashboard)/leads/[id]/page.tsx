'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { StatusBadge } from '@/components/ui/status-badge';
import { Pencil, UserCheck, Clock, Phone, Mail, MapPin, Calendar, Plane, Users, ArrowRight, Plus, AlertTriangle } from 'lucide-react';
import { Breadcrumb, PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDateTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { humanizeStatus } from '@/lib/status';
import { Lead, FollowUp, Quotation, Paginated, TimelineEvent, followUpStatusVariant } from '@/lib/crm';
import { useCountries, useAirports } from '@/lib/use-ref-data';
import { FollowUpFormDialog } from '../../follow-ups/follow-up-form-dialog';

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
  const [fuFormOpen, setFuFormOpen] = useState(false);
  const { options: countries } = useCountries();
  const { options: airports } = useAirports();

  const countryName = useMemo(() => {
    if (!lead?.countryId || !countries.length) return null;
    return countries.find((o) => o.value === lead.countryId)?.label || null;
  }, [lead?.countryId, countries]);

  const airportName = (id?: string | null) => {
    if (!id || !airports.length) return null;
    return airports.find((o) => o.value === id)?.label || null;
  };

  const load = useCallback(() => {
    if (!activeTenant) return;
    setLoading(true); setError('');
    Promise.all([
      api.get<Lead>(`/api/v1/tenant/leads/${id}`, { tenantId: activeTenant.id }),
      api.get<Paginated<FollowUp>>(`/api/v1/tenant/follow-ups?leadId=${id}`, { tenantId: activeTenant.id }).catch(() => ({ data: [] as FollowUp[], total: 0, page: 1, limit: 10, totalPages: 0 })),
      api.get<Paginated<Quotation>>(`/api/v1/tenant/quotations?leadId=${id}`, { tenantId: activeTenant.id }).catch(() => ({ data: [] as Quotation[], total: 0, page: 1, limit: 10, totalPages: 0 })),
      api.get<TimelineEvent[]>(`/api/v1/tenant/leads/${id}/timeline`, { tenantId: activeTenant.id }).catch(() => [] as TimelineEvent[]),
    ])
      .then(([l, fu, q, tl]) => { setLead({ ...l, quotations: q.data }); setFollowUps(fu.data); setTimeline(tl); })
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
    } catch (err: any) { toast.error(err.message || 'Failed to convert lead'); }
  };

  if (loading) return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-6 w-72" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4"><Skeleton className="h-80 w-full" /></div>
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  );
  if (error) return <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>;
  if (!lead) return <p className="text-muted-foreground">Lead not found.</p>;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Leads', href: '/leads' }, { label: lead.fullName }]} />
      <PageHeader
        title={lead.fullName}
        subtitle={
          <span className="flex items-center gap-2">
            <StatusBadge status={lead.status} />
            <StatusBadge status={lead.priority} kind="priority" />
            {lead.source && <span className="text-xs text-muted-foreground">· {lead.source.replace(/_/g, ' ')}</span>}
          </span>
        }
        actions={
          <>
            {lead.status !== 'WON' && (
              <Button variant="outline" size="sm" onClick={handleConvert}>
                <UserCheck className="h-4 w-4 mr-2" />Convert to Client
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setFuFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />Add Follow-up
            </Button>
            <Button size="sm" asChild>
              <Link href={`/leads/${lead.id}/edit`}>
                <Pencil className="h-4 w-4 mr-2" />Edit
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Contact & Travel Details</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Field icon={Mail} label="Email" value={lead.email} />
              <Field icon={Phone} label="Phone" value={lead.primaryMobile || lead.phone} />
              <Field icon={Phone} label="WhatsApp" value={lead.whatsappNumber} />
              <Field icon={MapPin} label="Country" value={countryName || '—'} />
              <Field icon={MapPin} label="Departure" value={lead.departureCity} />
              <Field icon={MapPin} label="Destination" value={lead.destinationCity} />
              <Field icon={Calendar} label="Travel Date" value={lead.preferredTravelDate ? formatDateTime(lead.preferredTravelDate) : null} />
              <Field icon={Users} label="Passengers" value={lead.numAdults && lead.numAdults > 0 ? `${lead.numAdults}A ${lead.numChildren}C ${lead.numInfants}I` : '—'} />
              <Field icon={Plane} label="Service Type" value={humanizeStatus(lead.serviceType)} />
            </div>
          </CardContent>
        </Card>

        {(lead.departureCity || lead.destinationCity) && (
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="flex items-center gap-2"><Plane className="h-4 w-4" />Route</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground">From</p>
                  <p className="text-lg font-semibold">{lead.departureCity || '—'}</p>
                  {lead.departureAirportId && <p className="text-xs text-muted-foreground">{airportName(lead.departureAirportId)}</p>}
                </div>
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <Plane className="h-5 w-5 text-primary" />
                  <span className="text-[10px] text-muted-foreground font-medium">{lead.tripType?.replace('_', ' ') || 'ONE WAY'}</span>
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <p className="text-sm text-muted-foreground">To</p>
                  <p className="text-lg font-semibold">{lead.destinationCity || '—'}</p>
                  {lead.destinationAirportId && <p className="text-xs text-muted-foreground">{airportName(lead.destinationAirportId)}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Pipeline Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Source</span><span className="text-sm font-medium">{lead.source?.replace(/_/g, ' ') || '—'}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Trip Type</span><span className="text-sm font-medium">{lead.tripType || '—'}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Lead Score</span><span className="text-sm font-medium">{lead.leadScore?.toString() || '—'}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Potential Revenue</span><span className="text-sm font-medium">{lead.potentialRevenue ? `$${Number(lead.potentialRevenue).toFixed(2)}` : '—'}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Created</span><span className="text-sm font-medium">{formatDateTime(lead.createdAt)}</span></div>
            </CardContent>
          </Card>

          {lead.slaDueAt && (
            <SlaCard slaDueAt={lead.slaDueAt} />
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Follow-ups</CardTitle>
              <span className="text-xs text-muted-foreground">{followUps.length}</span>
            </CardHeader>
            <CardContent>
              {followUps.length === 0 ? (
                <p className="text-sm text-muted-foreground">No follow-ups scheduled.</p>
              ) : (
                <ul className="space-y-2">
                  {followUps.slice(0, 5).map((fu) => (
                    <li key={fu.id} className="border-b pb-2 last:border-0 last:pb-0">
                      <p className="text-sm font-medium">{fu.subject}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant={followUpStatusVariant[fu.status] || 'secondary'} className="text-[10px]">{fu.status}</Badge>
                        <span className="text-xs text-muted-foreground">{fu.channel} · {formatDateTime(fu.scheduledAt)}</span>
                      </div>
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
              <Button variant="outline" size="sm" asChild><Link href="/quotations">View all</Link></Button>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {(lead as any).quotations.slice(0, 5).map((q: any) => (
                  <li key={q.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div><p className="text-sm font-medium">{q.quoteNumber} {q.title ? `— ${q.title}` : ''}</p><p className="text-xs text-muted-foreground">${Number(q.grandTotal || 0).toFixed(2)}</p></div>
                    <Badge variant={q.status === 'ACCEPTED' ? 'success' : q.status === 'REJECTED' ? 'destructive' : 'secondary'}>{q.status}</Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {lead.notes && (
        <Card>
          <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{lead.notes}</p></CardContent>
        </Card>
      )}

      <Separator />

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-4 w-4" />Activity Timeline</CardTitle></CardHeader>
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
                    <p className="text-xs text-muted-foreground mt-0.5">{event.userName} · {formatDateTime(event.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <FollowUpFormDialog open={fuFormOpen} onOpenChange={setFuFormOpen} onSaved={load} leadId={lead.id} />
    </div>
  );
}

function SlaCard({ slaDueAt }: { slaDueAt: string }) {
  const due = new Date(slaDueAt).getTime();
  const now = Date.now();
  const diffMs = due - now;
  const absH = Math.abs(Math.round(diffMs / 3600000));
  const absM = Math.abs(Math.round((diffMs % 3600000) / 60000));
  const breached = diffMs < 0;
  const warning = !breached && diffMs < 7200000;
  const label = breached ? `Breached — ${absH}h ${absM}m ago` : warning ? `${absH}h ${absM}m remaining` : `${absH}h ${absM}m left`;

  return (
    <Card className={cn(breached ? 'border-destructive/30 bg-destructive/5' : warning ? 'border-amber-500/30 bg-amber-50 dark:bg-amber-950/10' : 'border-primary/20 bg-primary/5')}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertTriangle className={cn('h-4 w-4', breached ? 'text-destructive' : warning ? 'text-amber-500' : 'text-primary')} />
          SLA Timer
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <span className={cn('text-sm font-bold', breached ? 'text-destructive' : warning ? 'text-amber-600 dark:text-amber-400' : 'text-primary')}>{label}</span>
          <Badge variant={breached ? 'destructive' : warning ? 'warning' : 'default'}>{breached ? 'Breached' : warning ? 'Warning' : 'On Track'}</Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Due: {new Date(slaDueAt).toLocaleString()}</p>
      </CardContent>
    </Card>
  );
}

function Field({ icon: Icon, label, value }: { icon?: any; label: string; value?: string | null }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </p>
      <p className="text-sm font-medium">{value || '—'}</p>
    </div>
  );
}
