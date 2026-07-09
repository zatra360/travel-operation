'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Plus, Search, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate } from '@/lib/utils';

interface TenantUser {
  id: string; email: string; firstName: string; lastName: string;
  phone?: string | null; status: string; membershipRole: string;
  joinedAt: string; lastLoginAt?: string | null; createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addForm, setAddForm] = useState({ email: '', firstName: '', lastName: '', password: '', role: 'MEMBER' });
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<TenantUser | null>(null);
  const { activeTenant } = useAuthStore();

  const load = useCallback(() => {
    if (!activeTenant) return;
    setLoading(true);
    api.get<TenantUser[]>('/api/v1/tenant/users', { tenantId: activeTenant.id })
      .then(setUsers)
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false));
  }, [activeTenant]);

  useEffect(() => { load(); }, [load]);

  const filtered = users.filter((u) =>
    !search || u.firstName.toLowerCase().includes(search.toLowerCase()) ||
    u.lastName.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()));

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant) return;
    if (!addForm.email.trim() || !addForm.firstName.trim() || !addForm.lastName.trim() || !addForm.password.trim()) {
      toast.error('All fields are required');
      return;
    }
    setSaving(true);
    try {
      const user = await api.post<any>('/api/v1/platform/users', {
        email: addForm.email.trim(), firstName: addForm.firstName.trim(),
        lastName: addForm.lastName.trim(), password: addForm.password,
      });
      await api.post(`/api/v1/tenant/users/${user.id}`, { role: addForm.role }, { tenantId: activeTenant.id });
      toast.success('User added to tenant');
      setDialogOpen(false);
      setAddForm({ email: '', firstName: '', lastName: '', password: '', role: 'MEMBER' });
      load();
    } catch (err: any) { toast.error(err.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleRemove = async () => {
    if (!activeTenant || !removing) return;
    try {
      await api.delete(`/api/v1/tenant/users/${removing.id}`, { tenantId: activeTenant.id });
      toast.success(`${removing.firstName} ${removing.lastName} removed from tenant`);
      setRemoving(null);
      load();
    } catch (err: any) { toast.error(err.message || 'Failed'); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        subtitle="Manage staff members and their access"
        actions={<Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Add User</Button>}
      />

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
      </div>

      <Card>
        <CardHeader><CardTitle>Users ({filtered.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-muted-foreground">Loading...</p> : filtered.length === 0 ? (
            <div className="py-10 text-center"><p className="text-muted-foreground">No users found.</p><Button size="sm" variant="outline" className="mt-3" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Add your first user</Button></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left"><th className="pb-3 font-medium">User</th><th className="pb-3 font-medium">Email</th><th className="pb-3 font-medium">Role</th><th className="pb-3 font-medium">Status</th><th className="pb-3 font-medium">Joined</th><th className="pb-3 font-medium text-right">Actions</th></tr></thead>
                <tbody>{filtered.map((u) => (
                  <tr key={u.id} className="border-b last:border-0">
                    <td className="py-3 font-medium">{u.firstName} {u.lastName}</td>
                    <td className="py-3 text-muted-foreground">{u.email}</td>
                    <td className="py-3"><Badge variant={u.membershipRole === 'OWNER' ? 'default' : 'secondary'}>{u.membershipRole}</Badge></td>
                    <td className="py-3"><Badge variant={u.status === 'ACTIVE' ? 'success' : 'secondary'}>{u.status}</Badge></td>
                    <td className="py-3 text-muted-foreground">{formatDate(u.joinedAt)}</td>
                    <td className="py-3"><div className="flex items-center justify-end gap-1">
                      {u.membershipRole !== 'OWNER' && (
                        <Button variant="ghost" size="icon" onClick={() => setRemoving(u)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      )}
                    </div></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add User</DialogTitle><DialogDescription>Create a new user and add them to this company.</DialogDescription></DialogHeader>
          <form onSubmit={handleAddUser} className="space-y-4">
            <div className="space-y-2"><Label>Email <span className="text-destructive">*</span></Label><Input type="email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>First name <span className="text-destructive">*</span></Label><Input value={addForm.firstName} onChange={(e) => setAddForm({ ...addForm, firstName: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Last name <span className="text-destructive">*</span></Label><Input value={addForm.lastName} onChange={(e) => setAddForm({ ...addForm, lastName: e.target.value })} required /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Password <span className="text-destructive">*</span></Label><Input type="password" value={addForm.password} onChange={(e) => setAddForm({ ...addForm, password: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Role</Label><Select value={addForm.role} onValueChange={(v) => setAddForm({ ...addForm, role: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="MEMBER">Member</SelectItem><SelectItem value="ADMIN">Admin</SelectItem></SelectContent></Select></div>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Adding...' : 'Add user'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)} title="Remove user?" description={`Remove ${removing?.firstName} ${removing?.lastName} from this company? Their account will not be deleted.`} confirmLabel="Remove" onConfirm={handleRemove} />
    </div>
  );
}
