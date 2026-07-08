'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate } from '@/lib/utils';
import { Expense, Paginated, EXPENSE_STATUSES, expenseStatusVariant } from '@/lib/crm';
import { ExpenseFormDialog } from './expense-form-dialog';

export default function ExpensesPage() {
  const [items, setItems] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const { activeTenant } = useAuthStore();

  const load = useCallback(() => {
    if (!activeTenant) return;
    setLoading(true); setError('');
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    api.get<Paginated<Expense>>(`/api/v1/tenant/expenses?${params.toString()}`, { tenantId: activeTenant.id })
      .then((res) => setItems(res.data))
      .catch((err) => setError(err.message || 'Failed to load expenses'))
      .finally(() => setLoading(false));
  }, [activeTenant, search, status]);
  useEffect(() => { load(); }, [load]);
  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (e: Expense) => { setEditing(e); setFormOpen(true); };
  const handleDelete = async () => {
    if (!activeTenant || !deleting) return;
    try { await api.delete(`/api/v1/tenant/expenses/${deleting.id}`, { tenantId: activeTenant.id }); toast.success('Expense deleted'); load(); }
    catch (err: any) { toast.error(err.message || 'Failed'); }
  };
  return (
    <div className="space-y-6"><div className="flex items-center justify-between"><h2 className="text-2xl font-bold">Expenses</h2><Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-2" />New Expense</Button></div>
    <div className="flex flex-wrap items-center gap-2"><div className="relative flex-1 min-w-[200px]"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search expense # or vendor..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" /></div><div className="flex flex-wrap gap-1"><Button variant={status === '' ? 'default' : 'outline'} size="sm" onClick={() => setStatus('')}>All</Button>{EXPENSE_STATUSES.map((s) => (<Button key={s} variant={status === s ? 'default' : 'outline'} size="sm" onClick={() => setStatus(s)}>{s}</Button>))}</div></div>
    <Card><CardHeader><CardTitle>All Expenses</CardTitle></CardHeader><CardContent>{loading ? <p className="text-muted-foreground">Loading...</p> : error ? <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div> : items.length === 0 ? <div className="py-10 text-center"><p className="text-muted-foreground">No expenses found.</p><Button size="sm" variant="outline" className="mt-3" onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Record an expense</Button></div> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="pb-3 font-medium">Expense #</th><th className="pb-3 font-medium">Category</th><th className="pb-3 font-medium">Vendor</th><th className="pb-3 font-medium">Amount</th><th className="pb-3 font-medium">Status</th><th className="pb-3 font-medium">Date</th><th className="pb-3 font-medium text-right">Actions</th></tr></thead><tbody>{items.map((e) => (<tr key={e.id} className="border-b last:border-0"><td className="py-3 font-medium">{e.expenseNumber}</td><td className="py-3 text-muted-foreground">{e.category || '--'}</td><td className="py-3 text-muted-foreground">{e.vendorName || '--'}</td><td className="py-3 font-medium">{e.currencyCode} {e.amount.toLocaleString()}</td><td className="py-3"><Badge variant={expenseStatusVariant[e.status] || 'secondary'}>{e.status}</Badge></td><td className="py-3 text-muted-foreground">{e.expenseDate ? formatDate(e.expenseDate) : '--'}</td><td className="py-3"><div className="flex items-center justify-end gap-1"><Button variant="ghost" size="icon" onClick={() => openEdit(e)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => setDeleting(e)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></td></tr>))}</tbody></table></div>}</CardContent></Card>
    <ExpenseFormDialog open={formOpen} onOpenChange={setFormOpen} expense={editing} onSaved={load} />
    <ConfirmDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} title="Delete expense?" description={`Delete ${deleting?.expenseNumber}?`} confirmLabel="Delete" onConfirm={handleDelete} />
    </div>);
}
