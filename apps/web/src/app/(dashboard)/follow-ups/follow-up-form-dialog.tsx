'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Combobox } from '@/components/ui/select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { FOLLOWUP_CHANNELS } from '@/lib/crm';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  leadId?: string;
  clientId?: string;
}

export function FollowUpFormDialog({ open, onOpenChange, onSaved, leadId, clientId }: Props) {
  const { activeTenant } = useAuthStore();
  const [form, setForm] = useState({ subject: '', channel: 'PHONE', scheduledAt: '', description: '', leadId: '', clientId: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [leads, setLeads] = useState<{ value: string; label: string }[]>([]);
  const [clients, setClients] = useState<{ value: string; label: string }[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(false);

  const loadRefs = useCallback(() => {
    if (!activeTenant) return;
    setLoadingRefs(true);
    Promise.all([
      api.get<any>(`/api/v1/tenant/leads?limit=200`, { tenantId: activeTenant.id })
        .then(r => setLeads(Array.isArray(r.data) ? r.data.map((l: any) => ({ value: l.id, label: l.fullName })) : []))
        .catch(() => setLeads([])),
      api.get<any>('/api/v1/tenant/clients?limit=200', { tenantId: activeTenant.id })
        .then(r => setClients(Array.isArray(r.data) ? r.data.map((c: any) => ({ value: c.id, label: c.displayName })) : []))
        .catch(() => setClients([])),
    ]).finally(() => setLoadingRefs(false));
  }, [activeTenant]);

  useEffect(() => {
    if (open) {
      setError('');
      setForm(prev => ({ ...prev, subject: '', channel: 'PHONE', scheduledAt: '', description: '', leadId: leadId || '', clientId: clientId || '' }));
      loadRefs();
    }
  }, [open, leadId, clientId, loadRefs]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant) return;
    if (!form.subject.trim()) { setError('Subject is required'); return; }
    if (!form.scheduledAt) { setError('Scheduled date/time is required'); return; }
    if (!form.leadId && !form.clientId) { setError('Link to a Lead or Client is required'); return; }
    setSaving(true); setError('');
    try {
      await api.post('/api/v1/tenant/follow-ups', {
        subject: form.subject.trim(), channel: form.channel,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        description: form.description.trim() || undefined,
        leadId: form.leadId || undefined, clientId: form.clientId || undefined,
      }, { tenantId: activeTenant.id });
      toast.success('Follow-up scheduled');
      onOpenChange(false); onSaved();
    } catch (err: any) { setError(err.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New Follow-up</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lead *</Label>
              {loadingRefs ? <Skeleton className="h-9 w-full" /> : (
                <Combobox options={leads} value={form.leadId} onChange={v => set('leadId', v)} placeholder="Select lead..." searchPlaceholder="Search leads..." />
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Client</Label>
              {loadingRefs ? <Skeleton className="h-9 w-full" /> : (
                <Combobox options={clients} value={form.clientId} onChange={v => set('clientId', v)} placeholder="Select client..." searchPlaceholder="Search clients..." />
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subject *</Label>
            <Input value={form.subject} onChange={e => set('subject', e.target.value)} placeholder="Call to discuss quotation" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Channel</Label>
              <Select value={form.channel} onValueChange={v => set('channel', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FOLLOWUP_CHANNELS.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Scheduled at *</Label>
              <Input type="datetime-local" value={form.scheduledAt} onChange={e => set('scheduledAt', e.target.value)} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</Label>
            <Textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Notes about this follow-up..." />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Schedule'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
