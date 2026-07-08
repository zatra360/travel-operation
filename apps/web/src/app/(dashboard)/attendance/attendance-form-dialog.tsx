import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { ATTENDANCE_STATUSES } from '@/lib/crm';

interface Props { open: boolean; onOpenChange: (o: boolean) => void; attendance?: any | null; onSaved: () => void; }

export function AttendanceFormDialog({ open, onOpenChange, attendance, onSaved }: Props) {
  const { activeTenant } = useAuthStore();
  const [form, setForm] = useState({ employeeId: '', date: '', status: 'PRESENT', clockIn: '', clockOut: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const isEdit = !!attendance;
  useEffect(() => { if (open && attendance) { setForm({ employeeId: attendance.employeeId ?? '', date: attendance.date?.split('T')[0] ?? '', status: attendance.status ?? 'PRESENT', clockIn: attendance.clockIn?.split('T')[0] ?? '', clockOut: attendance.clockOut?.split('T')[0] ?? '', notes: attendance.notes ?? '' }); } else if (open) { setForm({ employeeId: '', date: '', status: 'PRESENT', clockIn: '', clockOut: '', notes: '' }); } }, [open, attendance]);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); if (!activeTenant || !form.employeeId.trim() || !form.date) return; setSaving(true); const p = { ...form }; if (isEdit && attendance) { await api.put(`/api/v1/tenant/attendance/${attendance.id}`, p, { tenantId: activeTenant.id }); toast.success('Updated'); } else { await api.post('/api/v1/tenant/attendance', p, { tenantId: activeTenant.id }); toast.success('Recorded'); } onOpenChange(false); onSaved(); };
  return (<Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>{isEdit ? 'Edit' : 'Mark Attendance'}</DialogTitle></DialogHeader><form onSubmit={handleSubmit} className="space-y-4"><div className="space-y-2"><Label>Employee ID <span className="text-destructive">*</span></Label><Input value={form.employeeId} onChange={(e) => set('employeeId', e.target.value)} required /></div><div className="space-y-2"><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} /></div><div className="space-y-2"><Label>Status</Label><Select value={form.status} onValueChange={(v) => set('status', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ATTENDANCE_STATUSES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent></Select></div><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Clock in</Label><Input type="datetime-local" value={form.clockIn} onChange={(e) => set('clockIn', e.target.value)} /></div><div className="space-y-2"><Label>Clock out</Label><Input type="datetime-local" value={form.clockOut} onChange={(e) => set('clockOut', e.target.value)} /></div></div><div className="space-y-2"><Label>Notes</Label><Input value={form.notes} onChange={(e) => set('notes', e.target.value)} /></div><DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving...' : isEdit ? 'Save' : 'Mark'}</Button></DialogFooter></form></DialogContent></Dialog>);
}
