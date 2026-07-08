'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Plus, Search, Pencil, Trash2, Eye, Building2, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface Tenant {
  id: string; name: string; slug: string; status: string; createdAt: string;
  _count: { branches: number; users: number };
  branches?: { id: string; name: string; code: string; status: string }[];
  users?: { user: { id: string; email: string; firstName: string; lastName: string }; role: string }[];
}

export default function TenantListPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Tenant | null>(null);
  const [deleting, setDeleting] = useState<Tenant | null>(null);
  const [viewing, setViewing] = useState<Tenant | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', ownerEmail: '', ownerPassword: '', ownerFirstName: '', ownerLastName: '' });
  const [editForm, setEditForm] = useState({ name: '', status: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api.get<Tenant[]>('/api/v1/platform/tenants').then(setTenants).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm({ name: '', slug: '', ownerEmail: '', ownerPassword: '', ownerFirstName: '', ownerLastName: '' }); setDialogOpen(true); };
  const openEdit = (t: Tenant) => { setEditing(t); setEditForm({ name: t.name, status: t.status }); setDialogOpen(true); };

  const viewDetail = async (t: Tenant) => {
    try {
      const detail = await api.get<Tenant>(`/api/v1/platform/tenants/${t.id}`);
      setViewing(detail);
    } catch { toast.error('Failed to load tenant details'); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.slug.trim()) { toast.error('Name and slug required'); return; }
    setSaving(true);
    try {
      const payload: any = { name: form.name.trim(), slug: form.slug.trim() };
      const email = form.ownerEmail.trim();
      if (email) { payload.ownerEmail = email; if (form.ownerPassword.trim()) { payload.ownerPassword = form.ownerPassword; payload.ownerFirstName = form.ownerFirstName.trim() || undefined; payload.ownerLastName = form.ownerLastName.trim() || undefined; } }
      await api.post('/api/v1/platform/tenants', payload);
      toast.success('Tenant created'); setDialogOpen(false); load();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editing || !editForm.name.trim()) return;
    setSaving(true);
    try { await api.put(`/api/v1/platform/tenants/${editing.id}`, editForm); toast.success('Tenant updated'); setDialogOpen(false); load(); }
    catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try { await api.delete(`/api/v1/platform/tenants/${deleting.id}`); toast.success('Tenant deleted'); setDeleting(null); load(); }
    catch (err: any) { toast.error(err.message); }
  };

  const filtered = tenants.filter((t) => !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.slug.toLowerCase().includes(search.toLowerCase()));
  const sv = (s: string) => { switch (s) { case 'ACTIVE': return 'success'; case 'TRIAL': return 'warning'; case 'SUSPENDED': return 'destructive'; default: return 'outline'; } };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Tenants</h2>
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-2" />New Tenant</Button>
      </div>

      <div className="relative max-w-sm"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search by name or slug..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" /></div>

      <Card>
        <CardHeader><CardTitle>All Tenants ({filtered.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? <div className="py-10 text-center"><p className="text-muted-foreground">No tenants found.</p><Button size="sm" variant="outline" className="mt-3" onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Create first tenant</Button></div> : (
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="border-b text-left"><th className="pb-3 font-medium">Name</th><th className="pb-3 font-medium">Slug</th><th className="pb-3 font-medium">Status</th><th className="pb-3 font-medium">Branches</th><th className="pb-3 font-medium">Users</th><th className="pb-3 font-medium">Created</th><th className="pb-3 font-medium text-right">Actions</th></tr></thead>
              <tbody>{filtered.map((t) => (<tr key={t.id} className="border-b last:border-0"><td className="py-3 font-medium">{t.name}</td><td className="py-3 text-muted-foreground">{t.slug}</td><td className="py-3"><Badge variant={sv(t.status)}>{t.status}</Badge></td><td className="py-3">{t._count.branches}</td><td className="py-3">{t._count.users}</td><td className="py-3 text-muted-foreground">{formatDate(t.createdAt)}</td><td className="py-3"><div className="flex items-center justify-end gap-1"><Button variant="ghost" size="icon" title="View" onClick={() => viewDetail(t)}><Eye className="h-4 w-4" /></Button><Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" title="Delete" onClick={() => setDeleting(t)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></td></tr>))}</tbody></table></div>)}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'Edit Tenant' : 'New Tenant'}</DialogTitle><DialogDescription>{editing ? 'Update tenant details and status.' : 'Create a new tenant organization.'}</DialogDescription></DialogHeader>
          {editing ? (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-2"><Label>Name</Label><Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Status</Label><Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ACTIVE">Active</SelectItem><SelectItem value="SUSPENDED">Suspended</SelectItem><SelectItem value="TRIAL">Trial</SelectItem></SelectContent></Select></div>
              <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</Button></DialogFooter>
            </form>
          ) : (
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2"><Label>Name <span className="text-destructive">*</span></Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="TripNow Limited" /></div>
              <div className="space-y-2"><Label>Slug <span className="text-destructive">*</span></Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} placeholder="tripnow-limited" /></div>
              <div className="space-y-2"><Label>Owner email</Label><Input type="email" value={form.ownerEmail} onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })} placeholder="owner@tripnow.com" /><p className="text-xs text-muted-foreground">Fill password + name to auto-create if user doesn't exist.</p></div>
              <div className="space-y-2"><Label>Owner password</Label><Input type="password" value={form.ownerPassword} onChange={(e) => setForm({ ...form, ownerPassword: e.target.value })} placeholder="Min 6 characters" /></div>
              <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>First name</Label><Input value={form.ownerFirstName} onChange={(e) => setForm({ ...form, ownerFirstName: e.target.value })} placeholder="John" /></div><div className="space-y-2"><Label>Last name</Label><Input value={form.ownerLastName} onChange={(e) => setForm({ ...form, ownerLastName: e.target.value })} placeholder="Doe" /></div></div>
              <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create Tenant'}</Button></DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!viewing} onOpenChange={() => setViewing(null)}>
        <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{viewing?.name}</DialogTitle><DialogDescription>slug: {viewing?.slug} · {viewing?.status}</DialogDescription></DialogHeader>
          {viewing && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-2"><Building2 className="h-4 w-4" />Branches ({viewing.branches?.length ?? 0})</h4>
                {viewing.branches?.length ? <div className="mt-2 space-y-1">{viewing.branches.map((b) => (<div key={b.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"><span>{b.name} <span className="text-muted-foreground">({b.code})</span></span><Badge variant={b.status === 'ACTIVE' ? 'success' : 'secondary'}>{b.status}</Badge></div>))}</div> : <p className="text-sm text-muted-foreground mt-1">No branches</p>}
              </div>
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-2"><Users className="h-4 w-4" />Users ({viewing.users?.length ?? 0})</h4>
                {viewing.users?.length ? <div className="mt-2 space-y-1">{viewing.users.map((m) => (<div key={m.user.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"><span>{m.user.firstName} {m.user.lastName} <span className="text-muted-foreground">({m.user.email})</span></span><Badge variant={m.role === 'OWNER' ? 'default' : 'secondary'}>{m.role}</Badge></div>))}</div> : <p className="text-sm text-muted-foreground mt-1">No users</p>}
              </div>
              <p className="text-xs text-muted-foreground">Created: {formatDate(viewing.createdAt)}</p>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setViewing(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} title="Delete tenant?" description={`This will soft-delete "${deleting?.name}" and all its data will be hidden.`} confirmLabel="Delete" onConfirm={handleDelete} />
    </div>
  );
}
