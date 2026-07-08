'use client';
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate } from '@/lib/utils';
import { Attendance, Paginated, ATTENDANCE_STATUSES, attendanceStatusVariant } from '@/lib/crm';
import { AttendanceFormDialog } from './attendance-form-dialog';

export default function AttendancePage() {
  const [items, setItems] = useState<Attendance[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [status, setStatus] = useState(''); const [formOpen, setFormOpen] = useState(false); const [editing, setEditing] = useState<Attendance | null>(null);
  const { activeTenant } = useAuthStore();
  const load = useCallback(() => { if (!activeTenant) return; setLoading(true); setError(''); const params = new URLSearchParams(); if (status) params.set('status', status); api.get<Paginated<Attendance>>(`/api/v1/tenant/attendance?${params.toString()}`, { tenantId: activeTenant.id }).then((r) => setItems(r.data)).catch((e) => setError(e.message)).finally(() => setLoading(false)); }, [activeTenant, status]);
  useEffect(() => { load(); }, [load]);
  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (a: Attendance) => { setEditing(a); setFormOpen(true); };
  return (<div className="space-y-6"><div className="flex items-center justify-between"><h2 className="text-2xl font-bold">Attendance</h2><Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Mark Attendance</Button></div>
    <div className="flex flex-wrap gap-1"><Button variant={status === '' ? 'default' : 'outline'} size="sm" onClick={() => setStatus('')}>All</Button>{ATTENDANCE_STATUSES.map((s) => (<Button key={s} variant={status === s ? 'default' : 'outline'} size="sm" onClick={() => setStatus(s)}>{s}</Button>))}</div>
    <Card><CardHeader><CardTitle>Attendance Records</CardTitle></CardHeader><CardContent>{loading ? <p className="text-muted-foreground">Loading...</p> : error ? <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div> : items.length === 0 ? <div className="py-10 text-center"><p className="text-muted-foreground">No records.</p><Button size="sm" variant="outline" className="mt-3" onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Mark attendance</Button></div> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="pb-3 font-medium">Employee</th><th className="pb-3 font-medium">Date</th><th className="pb-3 font-medium">Status</th><th className="pb-3 font-medium">Clock in/out</th></tr></thead><tbody>{items.map((a) => (<tr key={a.id} className="border-b last:border-0"><td className="py-3 font-medium">{a.employeeId}</td><td className="py-3 text-muted-foreground">{formatDate(a.date)}</td><td className="py-3"><Badge variant={attendanceStatusVariant[a.status] || 'secondary'}>{a.status}</Badge></td><td className="py-3 text-muted-foreground">{[a.clockIn && formatDate(a.clockIn), a.clockOut && formatDate(a.clockOut)].filter(Boolean).join(' – ') || '--'}</td></tr>))}</tbody></table></div>}</CardContent></Card>
    <AttendanceFormDialog open={formOpen} onOpenChange={setFormOpen} attendance={editing} onSaved={load} /></div>);
}
