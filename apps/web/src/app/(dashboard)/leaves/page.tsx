'use client';
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate } from '@/lib/utils';
import { Skeleton, TableSkeleton } from '@/components/ui/skeleton';
import { Leave, Paginated, LEAVE_STATUSES, leaveStatusVariant } from '@/lib/crm';
import { LeaveFormDialog } from './leave-form-dialog';

export default function LeavesPage() {
  const [items, setItems] = useState<Leave[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [status, setStatus] = useState(''); const [formOpen, setFormOpen] = useState(false); const [editing, setEditing] = useState<Leave | null>(null);
  const { activeTenant } = useAuthStore();
  const load = useCallback(() => { if (!activeTenant) return; setLoading(true); setError(''); const params = new URLSearchParams(); if (status) params.set('status', status); api.get<Paginated<Leave>>(`/api/v1/tenant/leaves?${params.toString()}`, { tenantId: activeTenant.id }).then((r) => setItems(r.data)).catch((e) => setError(e.message)).finally(() => setLoading(false)); }, [activeTenant, status]);
  useEffect(() => { load(); }, [load]);
  const openCreate = () => { setEditing(null); setFormOpen(true); };
  return (<div className="space-y-6"><PageHeader title="Leave Requests" subtitle="Track employee leave requests and approvals" actions={<Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-2" />New Request</Button>} />
    <div className="flex flex-wrap gap-1"><Button variant={status === '' ? 'default' : 'outline'} size="sm" onClick={() => setStatus('')}>All</Button>{LEAVE_STATUSES.map((s) => (<Button key={s} variant={status === s ? 'default' : 'outline'} size="sm" onClick={() => setStatus(s)}>{s}</Button>))}</div>
    <Card><CardHeader><CardTitle>All Requests</CardTitle></CardHeader><CardContent>{loading ? <TableSkeleton /> : error ? <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div> : items.length === 0 ? <div className="py-10 text-center"><p className="text-muted-foreground">No leave requests.</p><Button size="sm" variant="outline" className="mt-3" onClick={openCreate}><Plus className="h-4 w-4 mr-2" />New request</Button></div> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="pb-3 font-medium">Employee</th><th className="pb-3 font-medium">Type</th><th className="pb-3 font-medium">Dates</th><th className="pb-3 font-medium">Status</th><th className="pb-3 font-medium">Created</th></tr></thead><tbody>{items.map((l) => (<tr key={l.id} className="border-b last:border-0"><td className="py-3 font-medium">{l.employee?.firstName} {l.employee?.lastName}</td><td className="py-3">{l.leaveType}</td><td className="py-3 text-muted-foreground">{formatDate(l.startDate)} – {formatDate(l.endDate)}</td><td className="py-3"><Badge variant={leaveStatusVariant[l.status] || 'secondary'}>{l.status}</Badge></td><td className="py-3 text-muted-foreground">{l.reason || '--'}</td><td className="py-3 text-muted-foreground">{formatDate(l.createdAt)}</td></tr>))}</tbody></table></div>}</CardContent></Card>
    <LeaveFormDialog open={formOpen} onOpenChange={setFormOpen} leave={editing} onSaved={load} /></div>);
}
