'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Breadcrumb, PageHeader } from '@/components/ui/page-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WorkflowStepper } from '@/components/workflow-stepper';
import { AlertTriangle, ArrowRight, Check, Lock, RotateCcw, FileText, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { cn, formatDate, formatDateTime } from '@/lib/utils';
import { humanizeStatus } from '@/lib/status';
import {
  ServiceCase, ServiceCaseItem, WorkflowTimeline, TransitionInfo, CaseDocument,
  caseStatusVariant, docStatusVariant, serviceIcon, DOCUMENT_STATUS_TRANSITIONS,
} from '@/lib/service-ops';

const TABS = ['Overview', 'Workflow', 'Documents', 'Finance', 'Activity'] as const;
type Tab = (typeof TABS)[number];

export default function ServiceCaseDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { activeTenant } = useAuthStore();
  const [serviceCase, setServiceCase] = useState<ServiceCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('Overview');
  const [closing, setClosing] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [closeReason, setCloseReason] = useState('');

  const load = useCallback(() => {
    if (!activeTenant) return;
    api.get<ServiceCase>(`/api/v1/tenant/service-cases/${id}`, { tenantId: activeTenant.id })
      .then(setServiceCase)
      .catch((err) => setError(err.message || 'Failed to load case'))
      .finally(() => setLoading(false));
  }, [activeTenant, id]);

  useEffect(() => { load(); }, [load]);

  const handleClose = async () => {
    if (!activeTenant) return;
    try {
      await api.post(`/api/v1/tenant/service-cases/${id}/close`, { reason: closeReason || undefined, force: !!closeReason }, { tenantId: activeTenant.id });
      toast.success('Case closed');
      load();
    } catch (err: any) { toast.error(err.message); throw err; }
  };

  const handleReopen = async () => {
    if (!activeTenant) return;
    try {
      await api.post(`/api/v1/tenant/service-cases/${id}/reopen`, { reason: closeReason || 'Reopened from case view' }, { tenantId: activeTenant.id });
      toast.success('Case reopened');
      load();
    } catch (err: any) { toast.error(err.message); throw err; }
  };

  if (loading) return <div className="space-y-6"><Skeleton className="h-8 w-64" /><Skeleton className="h-96" /></div>;
  if (error) return <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>;
  if (!serviceCase) return <p className="text-muted-foreground">Case not found.</p>;

  const isClosed = serviceCase.status === 'CLOSED' || serviceCase.status === 'CANCELLED';

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Service Cases', href: '/service-cases' }, { label: serviceCase.caseNumber }]} />
      <PageHeader
        title={serviceCase.caseNumber}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <Badge variant={(caseStatusVariant[serviceCase.status] as any) || 'secondary'}>{humanizeStatus(serviceCase.status)}</Badge>
            <Badge variant={serviceCase.priority === 'HIGH' || serviceCase.priority === 'URGENT' ? 'destructive' : 'outline'} className="text-[10px]">{serviceCase.priority}</Badge>
            <span className="text-sm text-muted-foreground">{serviceCase.title}</span>
          </span>
        }
        actions={
          isClosed ? (
            <Button size="sm" variant="outline" onClick={() => setReopening(true)}><RotateCcw className="mr-2 h-4 w-4" />Reopen</Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setClosing(true)}><Lock className="mr-2 h-4 w-4" />Close Case</Button>
          )
        }
      />

      <div className="flex gap-1 overflow-x-auto rounded-lg border p-1 w-fit max-w-full">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              tab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && <OverviewTab serviceCase={serviceCase} />}
      {tab === 'Workflow' && <WorkflowTab serviceCase={serviceCase} onChanged={load} />}
      {tab === 'Documents' && <DocumentsTab serviceCase={serviceCase} onChanged={load} />}
      {tab === 'Finance' && <FinanceTab caseId={serviceCase.id} />}
      {tab === 'Activity' && <ActivityTab caseId={serviceCase.id} />}

      <ConfirmDialog
        open={closing}
        onOpenChange={setClosing}
        title="Close this case?"
        description="Cases with active items can only be force-closed with a reason (recorded in the audit trail)."
        confirmLabel="Close case"
        destructive={false}
        onConfirm={handleClose}
      />
      <ConfirmDialog
        open={reopening}
        onOpenChange={setReopening}
        title="Reopen this case?"
        description="The case returns to In Progress."
        confirmLabel="Reopen"
        destructive={false}
        onConfirm={handleReopen}
      />
      {(closing || reopening) && (
        <div className="fixed inset-x-0 bottom-4 z-[60] mx-auto w-fit rounded-md border bg-background p-2 shadow-lg">
          <Input value={closeReason} onChange={(e) => setCloseReason(e.target.value)} placeholder="Reason (required for force actions)" className="w-72" />
        </div>
      )}
    </div>
  );
}

function OverviewTab({ serviceCase }: { serviceCase: ServiceCase }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader><CardTitle className="text-base">Service Items ({serviceCase.items.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {serviceCase.items.map((item) => {
            const Icon = serviceIcon(item.serviceType.icon);
            const overdue = item.status === 'ACTIVE' && item.slaDueAt && new Date(item.slaDueAt) < new Date();
            return (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{item.serviceType.displayName} <span className="text-xs text-muted-foreground">· {item.referenceNumber}</span></p>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.currentStageCode ? humanizeStatus(item.currentStageCode) : humanizeStatus(item.status)}
                      {item.slaDueAt && <span className={cn('ml-2', overdue && 'font-medium text-destructive')}>{overdue ? 'SLA overdue' : `SLA ${formatDate(item.slaDueAt)}`}</span>}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <Badge variant={item.status === 'COMPLETED' ? 'success' : item.status === 'CANCELLED' ? 'destructive' : 'default'} className="text-[10px]">{item.status}</Badge>
                  <p className="mt-1 text-xs tabular-nums text-muted-foreground">{Number(item.serviceAmount).toFixed(2)} {item.currencyCode}</p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Field label="Expected revenue" value={`${Number(serviceCase.expectedRevenue).toFixed(2)} ${serviceCase.currencyCode}`} />
          <Field label="Opened" value={formatDate(serviceCase.openedAt)} />
          <Field label="Due" value={serviceCase.dueAt ? formatDate(serviceCase.dueAt) : '—'} />
          <Field label="Team" value={serviceCase.team?.name ?? '—'} />
          {serviceCase.closedAt && <Field label="Closed" value={formatDate(serviceCase.closedAt)} />}
          {serviceCase.closureReason && <Field label="Closure reason" value={serviceCase.closureReason} />}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function WorkflowTab({ serviceCase, onChanged }: { serviceCase: ServiceCase; onChanged: () => void }) {
  const activeItems = serviceCase.items.filter((i) => i.status !== 'CANCELLED');
  const [selectedId, setSelectedId] = useState(activeItems[0]?.id ?? '');
  const item = serviceCase.items.find((i) => i.id === selectedId);

  return (
    <div className="space-y-4">
      {serviceCase.items.length > 1 && (
        <div className="flex flex-wrap gap-1 rounded-lg border p-1 w-fit">
          {serviceCase.items.map((i) => (
            <button
              key={i.id}
              onClick={() => setSelectedId(i.id)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                selectedId === i.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent',
              )}
            >
              {i.serviceType.displayName}
            </button>
          ))}
        </div>
      )}
      {item ? <ItemWorkflow key={item.id} item={item} onChanged={onChanged} /> : <p className="text-sm text-muted-foreground">No service items.</p>}
    </div>
  );
}

function ItemWorkflow({ item, onChanged }: { item: ServiceCaseItem; onChanged: () => void }) {
  const { activeTenant } = useAuthStore();
  const [timeline, setTimeline] = useState<WorkflowTimeline | null>(null);
  const [transitions, setTransitions] = useState<TransitionInfo | null>(null);
  const [working, setWorking] = useState(false);

  const load = useCallback(() => {
    if (!activeTenant) return;
    Promise.all([
      api.get<WorkflowTimeline>(`/api/v1/tenant/service-case-items/${item.id}/workflow`, { tenantId: activeTenant.id }),
      api.get<TransitionInfo>(`/api/v1/tenant/service-case-items/${item.id}/transitions`, { tenantId: activeTenant.id }),
    ])
      .then(([tl, tr]) => { setTimeline(tl); setTransitions(tr); })
      .catch((err) => toast.error(err.message));
  }, [activeTenant, item.id]);

  useEffect(() => { load(); }, [load]);

  const act = async (fn: () => Promise<unknown>, success: string) => {
    setWorking(true);
    try {
      await fn();
      toast.success(success);
      load();
      onChanged();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setWorking(false);
    }
  };

  const transition = (toStageCode: string) =>
    act(() => api.post(`/api/v1/tenant/service-case-items/${item.id}/transition`, { toStageCode }, { tenantId: activeTenant!.id }), 'Stage updated');

  const completeChecklist = (checklistItemId: string) =>
    act(() => api.post(`/api/v1/tenant/service-case-items/${item.id}/checklist/${checklistItemId}/complete`, {}, { tenantId: activeTenant!.id }), 'Checklist item completed');

  const requestApproval = () =>
    act(() => api.post(`/api/v1/tenant/service-case-items/${item.id}/approvals/request`, {}, { tenantId: activeTenant!.id }), 'Approval requested');

  const decideApproval = (approvalId: string, decision: 'APPROVED' | 'REJECTED') => {
    const note = decision === 'REJECTED' ? window.prompt('Rejection note (required):') ?? undefined : undefined;
    if (decision === 'REJECTED' && !note) return;
    return act(
      () => api.post(`/api/v1/tenant/workflow-approvals/${approvalId}/decide`, { decision, note }, { tenantId: activeTenant!.id }),
      `Approval ${decision.toLowerCase()}`,
    );
  };

  if (!timeline || !transitions) return <Skeleton className="h-64" />;

  const currentChecklist = timeline.checklist.filter((c) => c.stageCode === timeline.currentStageCode);
  const currentApprovals = timeline.approvals.filter((a) => a.stageCode === timeline.currentStageCode);
  const needsApproval = transitions.blockers.some((b) => b.type === 'APPROVAL' || b.type === 'PAYMENT');
  const hasPendingApproval = currentApprovals.some((a) => a.status === 'PENDING');

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Workflow · {timeline.templateCode} <span className="text-xs font-normal text-muted-foreground">v{timeline.templateVersion}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <WorkflowStepper stages={timeline.stages} />
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Next Step</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {transitions.blockers.length > 0 && (
              <div className="space-y-1 rounded-md border border-amber-500/40 bg-amber-50 p-3 dark:bg-amber-950/20">
                <p className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" /> Transition blocked
                </p>
                {transitions.blockers.map((b, i) => (
                  <p key={i} className="ml-6 text-xs text-amber-700 dark:text-amber-300">• {b.detail}</p>
                ))}
              </div>
            )}
            {transitions.availableStages.length === 0 ? (
              <p className="text-sm text-muted-foreground">{timeline.status === 'COMPLETED' ? 'Workflow completed.' : 'No transitions available.'}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {transitions.availableStages.map((s) => (
                  <Button
                    key={s.code}
                    size="sm"
                    variant={transitions.canTransition ? 'default' : 'outline'}
                    disabled={working || (!transitions.canTransition && !s.isTerminal === false)}
                    onClick={() => transition(s.code)}
                  >
                    {s.name} <ArrowRight className="ml-2 h-3 w-3" />
                  </Button>
                ))}
              </div>
            )}
            {needsApproval && !hasPendingApproval && (
              <Button size="sm" variant="outline" disabled={working} onClick={requestApproval}>Request approval</Button>
            )}
          </CardContent>
        </Card>

        {currentChecklist.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Stage Checklist</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {currentChecklist.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-2 rounded-md border p-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className={cn('flex h-5 w-5 items-center justify-center rounded-full border', c.isCompleted ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-muted-foreground/30')}>
                      {c.isCompleted && <Check className="h-3 w-3" />}
                    </span>
                    <span className={cn(c.isCompleted && 'text-muted-foreground line-through')}>{c.title}</span>
                  </div>
                  {!c.isCompleted && (
                    <Button size="sm" variant="outline" disabled={working} onClick={() => completeChecklist(c.id)}>Complete</Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {currentApprovals.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Approvals</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {currentApprovals.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
                  <div>
                    <p className="font-medium">{a.approvalType === 'PAYMENT' ? 'Payment / credit approval' : 'Stage approval'}</p>
                    <p className="text-xs text-muted-foreground">Requested {formatDateTime(a.requestedAt)}{a.note ? ` · ${a.note}` : ''}</p>
                  </div>
                  {a.status === 'PENDING' ? (
                    <div className="flex gap-1">
                      <Button size="sm" disabled={working} onClick={() => decideApproval(a.id, 'APPROVED')}>Approve</Button>
                      <Button size="sm" variant="outline" disabled={working} onClick={() => decideApproval(a.id, 'REJECTED')}>Reject</Button>
                    </div>
                  ) : (
                    <Badge variant={a.status === 'APPROVED' ? 'success' : 'destructive'}>{a.status}</Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

const DOC_TYPES = ['PASSPORT', 'PHOTO', 'NID', 'BANK_STATEMENT', 'INVITATION_LETTER', 'EMPLOYMENT_LETTER', 'MARRIAGE_CERTIFICATE', 'BIRTH_CERTIFICATE', 'MEDICAL_REPORT', 'ACADEMIC_TRANSCRIPT', 'OTHER'];

function DocumentsTab({ serviceCase, onChanged }: { serviceCase: ServiceCase; onChanged: () => void }) {
  const { activeTenant } = useAuthStore();
  const [newDocType, setNewDocType] = useState('PASSPORT');
  const [itemId, setItemId] = useState(serviceCase.items[0]?.id ?? '');
  const [working, setWorking] = useState(false);

  const documents: Array<CaseDocument & { itemRef: string }> = serviceCase.items.flatMap((i) =>
    (i.documents ?? []).map((d) => ({ ...d, itemRef: i.referenceNumber })),
  );

  const requestDoc = async () => {
    if (!activeTenant || !itemId) return;
    setWorking(true);
    try {
      await api.post('/api/v1/tenant/service-documents', {
        serviceCaseItemId: itemId,
        documentType: newDocType,
        accessClassification: ['PASSPORT', 'NID', 'MEDICAL_REPORT'].includes(newDocType) ? 'SENSITIVE' : 'STANDARD',
      }, { tenantId: activeTenant.id });
      toast.success('Document requested');
      onChanged();
    } catch (err: any) { toast.error(err.message); } finally { setWorking(false); }
  };

  const moveDoc = async (doc: CaseDocument, status: string) => {
    if (!activeTenant) return;
    let extra: Record<string, string> = {};
    if (status === 'CORRECTION_REQUIRED') {
      const instructions = window.prompt('Correction instructions (required):');
      if (!instructions) return;
      extra = { correctionInstructions: instructions };
    }
    if (status === 'REJECTED') {
      const reason = window.prompt('Rejection reason (required):');
      if (!reason) return;
      extra = { rejectionReason: reason };
    }
    setWorking(true);
    try {
      await api.put(`/api/v1/tenant/service-documents/${doc.id}/status`, { status, ...extra }, { tenantId: activeTenant.id });
      toast.success(`Document ${humanizeStatus(status).toLowerCase()}`);
      onChanged();
    } catch (err: any) { toast.error(err.message); } finally { setWorking(false); }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Plus className="h-4 w-4" />Request Document</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Service item</span>
            <Select value={itemId} onValueChange={setItemId}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                {serviceCase.items.map((i) => (
                  <SelectItem key={i.id} value={i.id}>{i.serviceType.displayName} · {i.referenceNumber}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Document type</span>
            <Select value={newDocType} onValueChange={setNewDocType}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map((d) => <SelectItem key={d} value={d}>{humanizeStatus(d)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={requestDoc} disabled={working || !itemId}>Request</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" />Case Documents ({documents.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents requested yet.</p>
          ) : (
            documents.map((doc) => {
              const nextStatuses = DOCUMENT_STATUS_TRANSITIONS[doc.status] ?? [];
              return (
                <div key={doc.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {humanizeStatus(doc.documentType)}
                      {doc.version > 1 && <span className="ml-1 text-xs text-muted-foreground">v{doc.version}</span>}
                      {doc.accessClassification !== 'STANDARD' && <Badge variant="warning" className="ml-2 text-[9px]">{doc.accessClassification}</Badge>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {doc.itemRef} · requested {formatDate(doc.requestedAt)}
                      {doc.correctionInstructions && doc.status === 'CORRECTION_REQUIRED' && <span className="text-destructive"> · {doc.correctionInstructions}</span>}
                      {doc.rejectionReason && <span className="text-destructive"> · {doc.rejectionReason}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={(docStatusVariant[doc.status] as any) || 'secondary'} className="text-[10px]">{humanizeStatus(doc.status)}</Badge>
                    {nextStatuses.filter((s) => s !== 'ARCHIVED' && s !== 'EXPIRED').map((s) => (
                      <Button key={s} size="sm" variant="outline" disabled={working} onClick={() => moveDoc(doc, s)}>
                        {humanizeStatus(s)}
                      </Button>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FinanceTab({ caseId }: { caseId: string }) {
  const { activeTenant } = useAuthStore();
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    if (!activeTenant) return;
    api.get<any>(`/api/v1/tenant/service-cases/${caseId}/financials`, { tenantId: activeTenant.id })
      .then(setSummary)
      .catch((err) => toast.error(err.message));
  }, [activeTenant, caseId]);

  if (!summary) return <Skeleton className="h-64" />;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader><CardTitle className="text-base">Per-Service Financials</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {summary.items.map((i: any) => (
            <div key={i.referenceNumber} className="flex items-center justify-between rounded-md border p-3 text-sm">
              <div>
                <p className="font-medium">{i.serviceType.displayName}</p>
                <p className="text-xs text-muted-foreground">{i.referenceNumber}</p>
              </div>
              <div className="text-right tabular-nums">
                <p>Revenue {Number(i.serviceAmount).toFixed(2)} · Cost {Number(i.supplierCost).toFixed(2)}</p>
                <p className={cn('text-xs font-medium', Number(i.grossProfit) >= 0 ? 'text-emerald-600' : 'text-destructive')}>
                  Profit {Number(i.grossProfit).toFixed(2)} {i.currencyCode}
                </p>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between rounded-md bg-muted p-3 text-sm font-semibold">
            <span>Total</span>
            <span className="tabular-nums">
              Revenue {summary.totals.serviceAmount.toFixed(2)} · Cost {summary.totals.supplierCost.toFixed(2)} · Profit {summary.totals.grossProfit.toFixed(2)}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Settlement</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Field label="Invoices" value={String(summary.settlement.invoiceCount)} />
          <Field label="Invoiced" value={summary.settlement.invoiced.toFixed(2)} />
          <Field label="Paid" value={summary.settlement.paid.toFixed(2)} />
          <Field label="Due" value={summary.settlement.due.toFixed(2)} />
        </CardContent>
      </Card>
    </div>
  );
}

function ActivityTab({ caseId }: { caseId: string }) {
  const { activeTenant } = useAuthStore();
  const [events, setEvents] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!activeTenant) return;
    api.get<any[]>(`/api/v1/tenant/service-cases/${caseId}/timeline`, { tenantId: activeTenant.id })
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoaded(true));
  }, [activeTenant, caseId]);

  if (!loaded) return <Skeleton className="h-64" />;

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Activity Timeline</CardTitle></CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <ul className="space-y-3">
            {events.map((event) => (
              <li key={event.id} className="flex gap-3 border-b pb-3 last:border-0">
                <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{event.subject}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{humanizeStatus(event.type)} · {formatDateTime(event.createdAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
