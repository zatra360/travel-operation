'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { MessageSquare, Plus, Clock } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDateTime } from '@/lib/utils';

const STATUSES = { OPEN: 'warning', IN_PROGRESS: 'info', RESOLVED: 'success', CLOSED: 'secondary' } as any;
const PRIORITIES = { LOW: 'secondary', MEDIUM: 'info', HIGH: 'warning', URGENT: 'destructive' } as any;

export default function CasesPage() {
  const { activeTenant } = useAuthStore();
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [viewing, setViewing] = useState<any>(null);
  const [reply, setReply] = useState('');
  const [form, setForm] = useState({ subject: '', description: '', priority: 'MEDIUM', channelId: '', typeId: '', groupId: '' });
  const [channels, setChannels] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);

  const load = () => {
    if (!activeTenant) return;
    setLoading(true);
    api.get('/api/v1/tenant/cases', { tenantId: activeTenant.id }).then(setCases).finally(() => setLoading(false));
  };
  const loadRefs = () => {
    if (!activeTenant) return;
    Promise.all([
      api.get('/api/v1/tenant/cases/refs/channels', { tenantId: activeTenant.id }),
      api.get('/api/v1/tenant/cases/refs/types', { tenantId: activeTenant.id }),
      api.get('/api/v1/tenant/cases/refs/groups', { tenantId: activeTenant.id }),
    ]).then(([c, t, g]: any[]) => { setChannels(c); setTypes(t); setGroups(g); });
  };
  useEffect(() => { load(); loadRefs(); }, [activeTenant]);

  const create = async () => {
    if (!form.subject) return toast.error('Subject required');
    try { await api.post('/api/v1/tenant/cases', form, { tenantId: activeTenant!.id }); toast.success('Case created'); setDialog(false); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  const sendReply = async () => {
    if (!reply || !viewing) return;
    try { await api.post(`/api/v1/tenant/cases/${viewing.id}/reply`, { message: reply }, { tenantId: activeTenant!.id }); setReply(''); load(); const c = await api.get(`/api/v1/tenant/cases/${viewing.id}`, { tenantId: activeTenant!.id }); setViewing(c); }
    catch (e: any) { toast.error(e.message); }
  };

  const updateStatus = async (id: string, status: string) => {
    try { await api.put(`/api/v1/tenant/cases/${id}`, { status }, { tenantId: activeTenant!.id }); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  if (loading) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-6">
      <PageHeader title="Support Cases" subtitle="Track and resolve client issues" actions={<Button size="sm" onClick={() => { setDialog(true); loadRefs(); }}><Plus className="h-4 w-4 mr-2" />New Case</Button>} />
      <div className="grid gap-2">
        {cases.map((c: any) => (
          <Card key={c.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setViewing(c); }}>
            <CardContent className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3 min-w-0">
                <MessageSquare className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="font-medium truncate">{c.subject}</p>
                  <p className="text-xs text-muted-foreground">{c.caseNumber} · {c.client?.displayName || '—'} · {c.channel?.name || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={PRIORITIES[c.priority] || 'secondary'} className="text-xs">{c.priority}</Badge>
                <Badge variant={STATUSES[c.status] || 'secondary'} className="text-xs">{c.status}</Badge>
                <span className="text-xs text-muted-foreground">{formatDateTime(c.createdAt)}</span>
              </div>
            </CardContent>
          </Card>
        ))}
        {cases.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">No support cases.</p>}
      </div>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Support Case</DialogTitle></DialogHeader>
          <div className="space-y-3"><Input placeholder="Subject" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} /><Input placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.keys(PRIORITIES).map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent></Select>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialog(false)}>Cancel</Button><Button onClick={create}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewing} onOpenChange={() => setViewing(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {viewing && (
            <>
              <DialogHeader><DialogTitle>{viewing.subject}</DialogTitle></DialogHeader>
              <div className="flex items-center gap-2 text-sm mb-4"><Badge variant={STATUSES[viewing.status]}>{viewing.status}</Badge><Badge variant={PRIORITIES[viewing.priority]}>{viewing.priority}</Badge><span className="text-muted-foreground">{viewing.caseNumber}</span></div>
              <p className="text-sm text-muted-foreground mb-4">{viewing.description || 'No description'}</p>
              <div className="flex gap-2 mb-4">{['OPEN','IN_PROGRESS','RESOLVED','CLOSED'].map(s => <Button key={s} size="sm" variant={viewing.status === s ? 'default' : 'outline'} onClick={() => updateStatus(viewing.id, s)}>{s}</Button>)}</div>
              {viewing.replies?.length > 0 && (
                <div className="space-y-3 border-t pt-4">
                  {viewing.replies.map((r: any) => (
                    <div key={r.id} className={`rounded-lg p-3 text-sm ${r.isInternal ? 'bg-muted border' : 'bg-primary/5'}`}>
                      <p>{r.message}</p><p className="text-xs text-muted-foreground mt-1">{formatDateTime(r.createdAt)}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 mt-4"><Input placeholder="Type a reply..." value={reply} onChange={e => setReply(e.target.value)} /><Button size="sm" onClick={sendReply}>Send</Button></div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
