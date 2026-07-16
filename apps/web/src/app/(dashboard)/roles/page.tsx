'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Switch } from '@/components/ui/switch';
import { Skeleton, TableSkeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2, Shield, Users, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate } from '@/lib/utils';

interface Permission {
  id: string; name: string; module: string; action: string; description?: string;
}
interface Role {
  id: string; name: string; description?: string | null; isSystem: boolean; createdAt: string;
  permissions?: { permission: Permission }[];
  _count?: { assignments: number };
}

export default function RolesPage() {
  const [items, setItems] = useState<Role[]>([]);
  const [allPermissions, setAllPermissions] = useState<Record<string, Permission[]>>({});
  const [loading, setLoading] = useState(true);
  const { activeTenant } = useAuthStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [deleting, setDeleting] = useState<Role | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    if (!activeTenant) return;
    setLoading(true);
    Promise.all([
      api.get<Role[]>('/api/v1/tenant/roles', { tenantId: activeTenant.id }),
      api.get<Record<string, Permission[]>>('/api/v1/tenant/roles/permissions', { tenantId: activeTenant.id }),
    ])
      .then(([roles, perms]) => {
        setItems(Array.isArray(roles) ? roles : []);
        setAllPermissions(perms || {});
      })
      .catch(() => toast.error('Failed to load roles'))
      .finally(() => setLoading(false));
  }, [activeTenant]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', description: '' });
    setSelectedPerms(new Set());
    setDialogOpen(true);
  };

  const openEdit = (r: Role) => {
    setEditing(r);
    setForm({ name: r.name, description: r.description ?? '' });
    const existing = new Set(r.permissions?.map((p) => p.permission.id) ?? []);
    setSelectedPerms(existing);
    setDialogOpen(true);
  };

  const togglePerm = (pid: string) => {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      next.has(pid) ? next.delete(pid) : next.add(pid);
      return next;
    });
  };

  const toggleModule = (perms: Permission[]) => {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      const allSelected = perms.every((p) => next.has(p.id));
      perms.forEach((p) => (allSelected ? next.delete(p.id) : next.add(p.id)));
      return next;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant || !form.name.trim()) { toast.error('Role name is required'); return; }
    setSaving(true);
    try {
      const body: any = { name: form.name.trim(), description: form.description.trim() || undefined, permissionIds: [...selectedPerms] };
      if (editing) {
        await api.put(`/api/v1/tenant/roles/${editing.id}`, body, { tenantId: activeTenant.id });
        toast.success('Role updated');
      } else {
        await api.post('/api/v1/tenant/roles', body, { tenantId: activeTenant.id });
        toast.success('Role created');
      }
      setDialogOpen(false);
      load();
    } catch (err: any) { toast.error(err.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!activeTenant || !deleting) return;
    try {
      await api.delete(`/api/v1/tenant/roles/${deleting.id}`, { tenantId: activeTenant.id });
      toast.success('Role deleted');
      setDeleting(null);
      load();
    } catch (err: any) { toast.error(err.message || 'Failed to delete'); }
  };

  const modules = Object.keys(allPermissions).sort();

  if (loading) return (<div className="space-y-6"><PageHeader title="Roles" subtitle="Define permissions and assign to staff members" /><TableSkeleton /></div>);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles"
        subtitle="Define permissions and assign to staff members"
        actions={<Button size="sm" onClick={openCreate}><Plus className="mr-2 h-4 w-4" />New Role</Button>}
      />

      <Card>
        <CardHeader><CardTitle>All Roles ({items.length})</CardTitle></CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No roles found. Create a role to get started.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left"><th className="pb-3 font-medium">Name</th><th className="pb-3 font-medium">Description</th><th className="pb-3 font-medium">Permissions</th><th className="pb-3 font-medium">Users</th><th className="pb-3 font-medium">Created</th><th className="pb-3 font-medium text-right">Actions</th></tr></thead>
                <tbody>
                  {items.map((r) => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-muted/10">
                      <td className="py-3 font-medium">{r.name}</td>
                      <td className="py-3 text-muted-foreground max-w-[200px] truncate">{r.description || '—'}</td>
                      <td className="py-3"><Badge variant="secondary" className="text-xs">{r.permissions?.length ?? 0} perms</Badge></td>
                      <td className="py-3"><span className="flex items-center gap-1 text-muted-foreground"><Users className="h-3.5 w-3.5" />{r._count?.assignments ?? 0}</span></td>
                      <td className="py-3 text-muted-foreground text-xs">{formatDate(r.createdAt)}</td>
                      <td className="py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(r)} title="Edit"><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleting(r)} title="Delete"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />{editing ? 'Edit Role' : 'New Role'}</DialogTitle>
            <DialogDescription>{editing ? 'Update role name, description, and permissions' : 'Create a role and assign permissions'}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Role Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Sales Manager" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Permissions</Label>
              <div className="rounded-md border">
                {modules.map((mod) => {
                  const perms = allPermissions[mod];
                  const selectedCount = perms.filter((p) => selectedPerms.has(p.id)).length;
                  const allOn = perms.length > 0 && perms.every((p) => selectedPerms.has(p.id));
                  return (
                    <div key={mod} className="border-b last:border-0">
                      <button
                        type="button"
                        onClick={() => toggleModule(perms)}
                        className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium hover:bg-muted/30 transition-colors"
                      >
                        <span>{mod.replace(/_/g, ' ')}</span>
                        <Badge variant={allOn ? 'default' : 'secondary'} className="text-[10px]">{selectedCount}/{perms.length}</Badge>
                      </button>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1 px-3 pb-2">
                        {perms.map((p) => (
                          <label key={p.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/20 rounded px-1.5 py-1">
                            <input
                              type="checkbox"
                              checked={selectedPerms.has(p.id)}
                              onChange={() => togglePerm(p.id)}
                              className="h-3.5 w-3.5 accent-primary"
                            />
                            <span className="truncate">{p.action}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedPerms.size} permission{selectedPerms.size !== 1 ? 's' : ''} selected. Click a module header to toggle all.
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving…' : editing ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} title="Delete role?" description={`Remove "${deleting?.name}"? Users assigned to this role will lose their permissions.`} confirmLabel="Delete" onConfirm={handleDelete} />
    </div>
  );
}
