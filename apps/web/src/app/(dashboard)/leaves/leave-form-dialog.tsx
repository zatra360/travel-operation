import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { LEAVE_TYPES } from '@/lib/crm';

interface Props { open: boolean; onOpenChange: (o: boolean) => void; leave?: any | null; onSaved: () => void; }

export function LeaveFormDialog({ open, onOpenChange, leave, onSaved }: Props) {
  const { activeTenant } = useAuthStore();
  const [form, setForm] = useState({ employeeId: '', leaveType: 'SICK', startDate: '', endDate: '', reason: '' });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); if (!activeTenant || !form.employeeId.trim()) return; setSaving(true); try { await api.post('/api/v1/tenant/leaves', form, { tenantId: activeTenant.id }); toast.success('Leave request created'); onOpenChange(false); onSaved(); } catch (err: any) { toast.error(err.message); } finally { setSaving(false); } };
  return (<Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>New Leave Request</DialogTitle></DialogHeader><form onSubmit={handleSubmit} className="space-y-4"><div className="space-y-2"><Label>Employee ID <span className="text-destructive">*</span></Label><Input value={form.employeeId} onChange={(e) => set('employeeId', e.target.value)} required /></div><div className="space-y-2"><Label>Leave Type</Label><Select value={form.leaveType} onValueChange={(v) => set('leaveType', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{LEAVE_TYPES.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}</SelectContent></Select></div><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Start</Label><Input type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} /></div><div className="space-y-2"><Label>End</Label><Input type="date" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} /></div></div><div className="space-y-2"><Label>Reason</Label><Input value={form.reason} onChange={(e) => set('reason', e.target.value)} /></div><DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Submitting...' : 'Submit'}</Button></DialogFooter></form></DialogContent></Dialog>);
}
