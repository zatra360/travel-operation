'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Breadcrumb, PageHeader } from '@/components/ui/page-header';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy, Pencil, Rocket, Archive, Trash2, ChevronDown, ChevronRight, Plus, ArrowUp, ArrowDown, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { humanizeStatus } from '@/lib/status';
import { serviceIcon } from '@/lib/service-ops';

const STAGE_GROUPS = ['INTAKE', 'QUALIFICATION', 'QUOTATION', 'DOCUMENTATION', 'PROCESSING', 'APPROVAL', 'BOOKING', 'PAYMENT', 'DELIVERY', 'AFTER_SALES', 'CLOSURE'];

interface StageInfo {
  code: string;
  name: string;
  stageGroup: string;
  displayOrder: number;
  slaHours?: number | null;
  requiresApproval: boolean;
  requiresPayment: boolean;
  isInitial: boolean;
  isTerminal: boolean;
  isSideStage: boolean;
}

interface TemplateInfo {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  version: number;
  status: string;
  isSystem: boolean;
  serviceType: { systemCode: string; displayName: string; icon?: string | null };
  stageCount: number;
  instanceCount: number;
  stages: StageInfo[];
}

export default function WorkflowTemplatesPage() {
  const { activeTenant } = useAuthStore();
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<TemplateInfo | null>(null);
  const [publishing, setPublishing] = useState<TemplateInfo | null>(null);
  const [working, setWorking] = useState(false);

  const load = useCallback(() => {
    if (!activeTenant) return;
    api.get<TemplateInfo[]>('/api/v1/tenant/workflow-templates', { tenantId: activeTenant.id })
      .then(setTemplates)
      .catch((err) => toast.error(err.message || 'Failed to load templates'))
      .finally(() => setLoading(false));
  }, [activeTenant]);

  useEffect(() => { load(); }, [load]);

  const act = async (fn: () => Promise<unknown>, success: string) => {
    if (!activeTenant) return;
    setWorking(true);
    try {
      await fn();
      toast.success(success);
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setWorking(false);
    }
  };

  const clone = (t: TemplateInfo) =>
    act(() => api.post(`/api/v1/tenant/workflow-templates/${t.id}/clone`, {}, { tenantId: activeTenant!.id }), 'Draft created — customize and publish it');
  const archive = (t: TemplateInfo) =>
    act(() => api.post(`/api/v1/tenant/workflow-templates/${t.id}/archive`, {}, { tenantId: activeTenant!.id }), 'Template archived');
  const removeDraft = (t: TemplateInfo) =>
    act(() => api.post(`/api/v1/tenant/workflow-templates/${t.id}/delete`, {}, { tenantId: activeTenant!.id }), 'Draft deleted');

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-72" /></div>;

  const grouped = templates.reduce<Record<string, TemplateInfo[]>>((acc, t) => {
    (acc[t.serviceType.systemCode] ??= []).push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Service Cases', href: '/service-cases' }, { label: 'Workflow Templates' }]} />
      <PageHeader
        title="Workflow Templates"
        subtitle="System templates are immutable — clone one to customize it for your tenant. Published customizations outrank system templates for new cases; running cases keep the version they started with."
      />

      <div className="space-y-4">
        {Object.entries(grouped).map(([systemCode, list]) => {
          const Icon = serviceIcon(list[0].serviceType.icon);
          return (
            <Card key={systemCode}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {list[0].serviceType.displayName}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {list.map((t) => (
                  <div key={t.id} className="rounded-md border">
                    <div className="flex flex-wrap items-center justify-between gap-2 p-3">
                      <button
                        className="flex min-w-0 items-center gap-2 text-left"
                        onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                      >
                        {expanded === t.id ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                        <span className="truncate text-sm font-medium">{t.name}</span>
                        <Badge variant="outline" className="text-[10px]">v{t.version}</Badge>
                        <Badge variant={t.status === 'PUBLISHED' ? 'success' : t.status === 'DRAFT' ? 'warning' : 'secondary'} className="text-[10px]">{t.status}</Badge>
                        {t.isSystem && <Badge variant="secondary" className="text-[10px]">System</Badge>}
                        <span className="text-xs text-muted-foreground">{t.stageCount} stages · {t.instanceCount} case(s)</span>
                      </button>
                      <div className="flex shrink-0 gap-1">
                        <Button variant="ghost" size="icon" title="Clone to customize" disabled={working} onClick={() => clone(t)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        {!t.isSystem && t.status === 'DRAFT' && (
                          <>
                            <Button variant="ghost" size="icon" title="Edit stages" disabled={working} onClick={() => setEditing(t)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" title="Publish" disabled={working} onClick={() => setPublishing(t)}>
                              <Rocket className="h-4 w-4 text-primary" />
                            </Button>
                            <Button variant="ghost" size="icon" title="Delete draft" disabled={working} onClick={() => removeDraft(t)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                        {!t.isSystem && t.status === 'PUBLISHED' && (
                          <Button variant="ghost" size="icon" title="Archive" disabled={working} onClick={() => archive(t)}>
                            <Archive className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {expanded === t.id && (
                      <div className="border-t bg-muted/30 p-3">
                        <ol className="grid gap-1 text-xs sm:grid-cols-2 lg:grid-cols-3">
                          {t.stages.map((s) => (
                            <li key={s.code} className="flex items-center gap-1.5">
                              <span className="text-muted-foreground tabular-nums w-5">{s.displayOrder}.</span>
                              <span className={cn(s.isSideStage && 'italic text-muted-foreground')}>{s.name}</span>
                              {s.slaHours && <Badge variant="outline" className="text-[9px] px-1 py-0">{s.slaHours}h</Badge>}
                              {s.requiresPayment && <Badge variant="warning" className="text-[9px] px-1 py-0">PAY</Badge>}
                              {s.requiresApproval && <Badge variant="warning" className="text-[9px] px-1 py-0">APPROVAL</Badge>}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <StageEditorDialog template={editing} onOpenChange={(o) => !o && setEditing(null)} onSaved={load} />
      <ConfirmDialog
        open={!!publishing}
        onOpenChange={(o) => !o && setPublishing(null)}
        title={`Publish "${publishing?.name}"?`}
        description="The template is validated and becomes the default for new cases of this service. Published templates are immutable — clone again to make further changes."
        confirmLabel="Publish"
        destructive={false}
        onConfirm={async () => {
          if (!activeTenant || !publishing) return;
          await api.post(`/api/v1/tenant/workflow-templates/${publishing.id}/publish`, {}, { tenantId: activeTenant.id })
            .then(() => { toast.success('Template published'); load(); })
            .catch((err) => { toast.error(err.message); throw err; });
        }}
      />
    </div>
  );
}

interface StageDraft {
  code: string;
  name: string;
  stageGroup: string;
  slaHours: string;
  requiresApproval: boolean;
  requiresPayment: boolean;
  isTerminal: boolean;
}

function StageEditorDialog({ template, onOpenChange, onSaved }: {
  template: TemplateInfo | null; onOpenChange: (o: boolean) => void; onSaved: () => void;
}) {
  const { activeTenant } = useAuthStore();
  const [name, setName] = useState('');
  const [stages, setStages] = useState<StageDraft[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setStages(template.stages.map((s) => ({
        code: s.code,
        name: s.name,
        stageGroup: s.stageGroup,
        slaHours: s.slaHours ? String(s.slaHours) : '',
        requiresApproval: s.requiresApproval,
        requiresPayment: s.requiresPayment,
        isTerminal: s.isTerminal,
      })));
    }
  }, [template]);

  const move = (index: number, delta: number) => {
    const next = index + delta;
    if (next < 0 || next >= stages.length) return;
    const copy = [...stages];
    [copy[index], copy[next]] = [copy[next], copy[index]];
    setStages(copy);
  };

  const update = (index: number, patch: Partial<StageDraft>) => {
    setStages((s) => s.map((stage, i) => (i === index ? { ...stage, ...patch } : stage)));
  };

  const addStage = () => {
    setStages((s) => [
      ...s.slice(0, -1),
      { code: `NEW_STAGE_${s.length}`, name: 'New Stage', stageGroup: 'PROCESSING', slaHours: '', requiresApproval: false, requiresPayment: false, isTerminal: false },
      ...s.slice(-1),
    ]);
  };

  const submit = async () => {
    if (!activeTenant || !template) return;
    setSaving(true);
    try {
      await api.put(`/api/v1/tenant/workflow-templates/${template.id}`, {
        name,
        stages: stages.map((s, i) => ({
          code: s.code,
          name: s.name,
          stageGroup: s.stageGroup,
          slaHours: s.slaHours ? Number(s.slaHours) : undefined,
          requiresApproval: s.requiresApproval,
          requiresPayment: s.requiresPayment,
          isInitial: i === 0,
          isTerminal: s.isTerminal,
        })),
      }, { tenantId: activeTenant.id });
      toast.success('Draft updated');
      onOpenChange(false);
      onSaved();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!template} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit Draft Template</DialogTitle>
          <DialogDescription>
            Reorder, rename, or gate stages. The first stage is the entry point; mark the closing stage as terminal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Template name" />
          <div className="max-h-[50vh] space-y-1.5 overflow-y-auto pr-1">
            {stages.map((s, i) => (
              <div key={i} className="flex flex-wrap items-center gap-1.5 rounded-md border p-2">
                <span className="w-5 text-xs tabular-nums text-muted-foreground">{i + 1}.</span>
                <Input className="h-8 w-44 text-xs" value={s.name} onChange={(e) => update(i, { name: e.target.value })} />
                <Select value={s.stageGroup} onValueChange={(v) => update(i, { stageGroup: v })}>
                  <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STAGE_GROUPS.map((g) => <SelectItem key={g} value={g}>{humanizeStatus(g)}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input
                  className="h-8 w-20 text-xs" type="number" min={1} placeholder="SLA h"
                  value={s.slaHours} onChange={(e) => update(i, { slaHours: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => update(i, { requiresPayment: !s.requiresPayment })}
                  className={cn('rounded border px-1.5 py-0.5 text-[10px]', s.requiresPayment ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/30' : 'text-muted-foreground')}
                >PAY</button>
                <button
                  type="button"
                  onClick={() => update(i, { requiresApproval: !s.requiresApproval })}
                  className={cn('rounded border px-1.5 py-0.5 text-[10px]', s.requiresApproval ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/30' : 'text-muted-foreground')}
                >APPROVAL</button>
                <button
                  type="button"
                  onClick={() => update(i, { isTerminal: !s.isTerminal })}
                  className={cn('rounded border px-1.5 py-0.5 text-[10px]', s.isTerminal ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30' : 'text-muted-foreground')}
                >END</button>
                <span className="ml-auto flex gap-0.5">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp className="h-3 w-3" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => move(i, 1)} disabled={i === stages.length - 1}><ArrowDown className="h-3 w-3" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setStages((all) => all.filter((_, idx) => idx !== i))} disabled={stages.length <= 2}>
                    <X className="h-3 w-3 text-destructive" />
                  </Button>
                </span>
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={addStage}><Plus className="mr-2 h-4 w-4" />Add stage</Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Save draft'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
