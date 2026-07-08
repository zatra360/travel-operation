'use client';
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate } from '@/lib/utils';
import { PerformanceReview, Paginated, REVIEW_STATUSES, reviewStatusVariant } from '@/lib/crm';
import { PerformanceFormDialog } from './performance-form-dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export default function PerformancePage() {
  const [items, setItems] = useState<PerformanceReview[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false); const [editing, setEditing] = useState<PerformanceReview | null>(null);
  const [deleting, setDeleting] = useState<PerformanceReview | null>(null);
  const { activeTenant } = useAuthStore();
  const load = useCallback(() => { if (!activeTenant) return; setLoading(true); setError(''); api.get<Paginated<PerformanceReview>>('/api/v1/tenant/performance', { tenantId: activeTenant.id }).then((r) => setItems(r.data)).catch((e) => setError(e.message)).finally(() => setLoading(false)); }, [activeTenant]);
  useEffect(() => { load(); }, [load]);
  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (p: PerformanceReview) => { setEditing(p); setFormOpen(true); };
  const handleDelete = async () => { if (!activeTenant || !deleting) return; try { await api.delete(`/api/v1/tenant/performance/${deleting.id}`, { tenantId: activeTenant.id }); toast.success('Deleted'); load(); } catch (err: any) { toast.error(err.message); } };
  return (<div className="space-y-6"><div className="flex items-center justify-between"><h2 className="text-2xl font-bold">Performance Reviews</h2><Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-2" />New Review</Button></div>
    <Card><CardHeader><CardTitle>All Reviews</CardTitle></CardHeader><CardContent>{loading ? <p className="text-muted-foreground">Loading...</p> : error ? <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div> : items.length === 0 ? <div className="py-10 text-center"><p className="text-muted-foreground">No reviews.</p><Button size="sm" variant="outline" className="mt-3" onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Create review</Button></div> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="pb-3 font-medium">Employee</th><th className="pb-3 font-medium">Period</th><th className="pb-3 font-medium">Rating</th><th className="pb-3 font-medium">Status</th><th className="pb-3 font-medium">Created</th><th className="pb-3 font-medium text-right">Actions</th></tr></thead><tbody>{items.map((r) => (<tr key={r.id} className="border-b last:border-0"><td className="py-3 font-medium">{r.employeeId}</td><td className="py-3">{r.period}</td><td className="py-3">{r.rating ? `${r.rating}/5` : '--'}</td><td className="py-3"><Badge variant={reviewStatusVariant[r.status] || 'secondary'}>{r.status}</Badge></td><td className="py-3 text-muted-foreground">{formatDate(r.createdAt)}</td><td className="py-3"><div className="flex items-center justify-end gap-1"><Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => setDeleting(r)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></td></tr>))}</tbody></table></div>}</CardContent></Card>
    <PerformanceFormDialog open={formOpen} onOpenChange={setFormOpen} review={editing} onSaved={load} />
    <ConfirmDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} title="Delete review?" description={`Delete review for period ${deleting?.period}?`} confirmLabel="Delete" onConfirm={handleDelete} /></div>);
}
