'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, GitBranch } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate } from '@/lib/utils';

interface Branch {
  id: string;
  name: string;
  code: string;
  status: string;
  address?: string;
  phone?: string;
  email?: string;
  createdAt: string;
}

const INITIAL_FORM = { name: '', code: '', address: '', phone: '', email: '' };

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeTenant } = useAuthStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [deleting, setDeleting] = useState<Branch | null>(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

  const load = () => {
    if (!activeTenant) return;
    setLoading(true);
    api.get<Branch[]>('/api/v1/tenant/branches', { tenantId: activeTenant.id })
      .then(setBranches)
      .catch(() => toast.error('Failed to load branches'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [activeTenant]);

  const openCreate = () => { setEditing(null); setForm(INITIAL_FORM); setDialogOpen(true); };
  const openEdit = (b: Branch) => { setEditing(b); setForm({ name: b.name, code: b.code, address: b.address ?? '', phone: b.phone ?? '', email: b.email ?? '' }); setDialogOpen(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant || !form.name.trim() || !form.code.trim()) { toast.error('Name and code are required'); return; }
    setSaving(true);
    try {
      const body: any = { name: form.name.trim(), code: form.code.trim().toUpperCase(), address: form.address.trim() || undefined, phone: form.phone.trim() || undefined, email: form.email.trim() || undefined };
      if (editing) {
        await api.put(`/api/v1/tenant/branches/${editing.id}`, body, { tenantId: activeTenant.id });
        toast.success('Branch updated');
      } else {
        await api.post('/api/v1/tenant/branches', body, { tenantId: activeTenant.id });
        toast.success('Branch created');
      }
      setDialogOpen(false);
      load();
    } catch (err: any) { toast.error(err.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!activeTenant || !deleting) return;
    try {
      await api.delete(`/api/v1/tenant/branches/${deleting.id}`, { tenantId: activeTenant.id });
      toast.success('Branch deleted');
      setDeleting(null);
      load();
    } catch (err: any) { toast.error(err.message || 'Failed to delete'); }
  };

  const columns: DataTableColumn<Branch>[] = [
    { key: 'name', header: 'Name', cell: (b) => <span className="font-medium flex items-center gap-2"><GitBranch className="h-4 w-4 text-muted-foreground" />{b.name}</span> },
    { key: 'code', header: 'Code', cell: (b) => <span className="text-muted-foreground">{b.code}</span> },
    { key: 'status', header: 'Status', cell: (b) => <StatusBadge status={b.status} /> },
    { key: 'contact', header: 'Contact', hideOnMobile: true, cell: (b) => <span className="text-muted-foreground text-sm">{b.phone || b.email || '—'}</span> },
    { key: 'created', header: 'Created', hideOnMobile: true, cell: (b) => <span className="text-muted-foreground text-sm">{formatDate(b.createdAt)}</span> },
    {
      key: 'actions', header: '', align: 'right',
      cell: (b) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEdit(b)}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => setDeleting(b)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Branches"
        subtitle="Manage office locations and branch operations"
        actions={<Button size="sm" onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Branch</Button>}
      />

      <DataTable
        columns={columns}
        data={branches}
        rowKey={(b) => b.id}
        loading={loading}
        emptyTitle="No branches yet"
        emptyDescription="Create your first office location to organize operations by branch."
        emptyAction={<Button size="sm" variant="outline" onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Branch</Button>}
        mobileCard={(b) => (
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{b.name}</span>
              <StatusBadge status={b.status} />
            </div>
            <p className="text-sm text-muted-foreground">{b.code} · {b.phone || b.email || '—'}</p>
          </div>
        )}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Branch' : 'New Branch'}</DialogTitle>
            <DialogDescription>{editing ? 'Update branch details' : 'Add a new office location or branch'}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Main Office" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Code *</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="HQ" maxLength={10} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Address</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="123 Main St" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 (555) 000-0000" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</Label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="branch@company.com" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving…' : editing ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} title="Delete branch?" description={`Remove "${deleting?.name}"? This action cannot be undone.`} confirmLabel="Delete" onConfirm={handleDelete} />
    </div>
  );
}
