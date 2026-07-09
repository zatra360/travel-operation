'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface User {
  id: string; email: string; firstName: string; lastName: string;
  phone: string | null; avatar: string | null; status: string;
  isPlatformSuperAdmin: boolean; lastLoginAt: string | null; createdAt: string;
}

export default function PlatformUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [deleting, setDeleting] = useState<User | null>(null);
  const [form, setForm] = useState({ email: '', firstName: '', lastName: '', password: '', phone: '' });
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', phone: '', status: '' });
  const [saving, setSaving] = useState(false);

  const load = () => { setLoading(true); api.get<User[]>('/api/v1/platform/users').then(setUsers).catch(console.error).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm({ email: '', firstName: '', lastName: '', password: '', phone: '' }); setDialogOpen(true); };
  const openEdit = (u: User) => { setEditing(u); setEditForm({ firstName: u.firstName, lastName: u.lastName, phone: u.phone || '', status: u.status }); setDialogOpen(true); };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); if (!form.email.trim() || !form.firstName.trim() || !form.lastName.trim() || !form.password.trim()) { toast.error('All fields required'); return; }
    setSaving(true);
    try { await api.post('/api/v1/platform/users', form); toast.success('User created'); setDialogOpen(false); load(); }
    catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editing) return;
    setSaving(true);
    try { await api.put(`/api/v1/platform/users/${editing.id}`, editForm); toast.success('User updated'); setDialogOpen(false); load(); }
    catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try { await api.delete(`/api/v1/platform/users/${deleting.id}`); toast.success('User deleted'); setDeleting(null); load(); }
    catch (err: any) { toast.error(err.message); }
  };

  const filtered = users.filter((u) => `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold">Platform Users</h2><p className="text-muted-foreground">{users.length} total users across all companies</p></div>
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-2" />New User</Button>
      </div>

      <div className="relative max-w-sm"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search users..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} /></div>

      <Card><CardHeader><CardTitle>All Platform Users ({filtered.length})</CardTitle></CardHeader><CardContent>
        {loading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? <div className="py-10 text-center"><p className="text-muted-foreground">No users found.</p><Button size="sm" variant="outline" className="mt-3" onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Create first user</Button></div> : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="border-b text-left"><th className="pb-3 font-medium">User</th><th className="pb-3 font-medium">Email</th><th className="pb-3 font-medium">Role</th><th className="pb-3 font-medium">Status</th><th className="pb-3 font-medium">Last Login</th><th className="pb-3 font-medium text-right">Actions</th></tr></thead>
            <tbody>{filtered.map((u) => (
              <tr key={u.id} className="border-b last:border-0">
                <td className="py-3 font-medium">{u.firstName} {u.lastName}</td>
                <td className="py-3 text-muted-foreground">{u.email}</td>
                <td className="py-3">{u.isPlatformSuperAdmin ? <Badge variant="default">Super Admin</Badge> : <Badge variant="outline">User</Badge>}</td>
                <td className="py-3"><Badge variant={u.status === 'ACTIVE' ? 'success' : 'secondary'}>{u.status}</Badge></td>
                <td className="py-3 text-muted-foreground">{u.lastLoginAt ? formatDate(u.lastLoginAt) : 'Never'}</td>
                <td className="py-3"><div className="flex items-center justify-end gap-1"><Button variant="ghost" size="icon" onClick={() => openEdit(u)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => setDeleting(u)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></td>
              </tr>
            ))}</tbody></table></div>)}
      </CardContent></Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'Edit User' : 'New Platform User'}</DialogTitle><DialogDescription>{editing ? 'Update user details.' : 'Create a new user in the platform.'}</DialogDescription></DialogHeader>
          {editing ? (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>First name</Label><Input value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} /></div><div className="space-y-2"><Label>Last name</Label><Input value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} /></div></div>
              <div className="space-y-2"><Label>Phone</Label><Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></div>
              <div className="space-y-2"><Label>Status</Label><select className="w-full rounded-md border px-3 py-2 text-sm" value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></div>
              <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button></DialogFooter>
            </form>
          ) : (
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2"><Label>Email <span className="text-destructive">*</span></Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="user@company.com" /></div>
              <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>First name <span className="text-destructive">*</span></Label><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div><div className="space-y-2"><Label>Last name <span className="text-destructive">*</span></Label><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div></div>
              <div className="space-y-2"><Label>Password <span className="text-destructive">*</span></Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 6 characters" /></div>
              <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 234 567 8900" /></div>
              <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create User'}</Button></DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} title="Delete user?" description={`This will soft-delete "${deleting?.firstName} ${deleting?.lastName}" (${deleting?.email}).`} confirmLabel="Delete" onConfirm={handleDelete} />
    </div>
  );
}
