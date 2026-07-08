'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface Tenant {
  id: string; name: string; slug: string; status: string; createdAt: string;
  _count: { branches: number; users: number };
}

export default function TenantListPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', ownerEmail: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    api.get<Tenant[]>('/api/v1/platform/tenants')
      .then(setTenants)
      .catch(console.error)
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.slug.trim()) { setError('Name and slug are required'); return; }
    setSaving(true); setError('');
    try {
      const payload: any = { name: form.name.trim(), slug: form.slug.trim() };
      if (form.ownerEmail.trim()) payload.ownerEmail = form.ownerEmail.trim();
      await api.post('/api/v1/platform/tenants', payload);
      toast.success('Tenant created');
      setDialogOpen(false);
      setForm({ name: '', slug: '', ownerEmail: '' });
      load();
    } catch (err: any) {
      setError(err.message || 'Failed to create tenant');
      toast.error(err.message || 'Failed to create tenant');
    } finally { setSaving(false); }
  };

  const statusVariant = (status: string) => {
    switch (status) { case 'ACTIVE': return 'success'; case 'TRIAL': return 'warning'; case 'SUSPENDED': return 'destructive'; default: return 'outline'; }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Tenants</h2>
        <Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />New Tenant</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>All Tenants</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-muted-foreground">Loading...</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left"><th className="pb-3 font-medium">Name</th><th className="pb-3 font-medium">Slug</th><th className="pb-3 font-medium">Status</th><th className="pb-3 font-medium">Branches</th><th className="pb-3 font-medium">Users</th><th className="pb-3 font-medium">Created</th></tr></thead>
                <tbody>{tenants.map((t) => (<tr key={t.id} className="border-b last:border-0"><td className="py-3 font-medium">{t.name}</td><td className="py-3 text-muted-foreground">{t.slug}</td><td className="py-3"><Badge variant={statusVariant(t.status)}>{t.status}</Badge></td><td className="py-3">{t._count.branches}</td><td className="py-3">{t._count.users}</td><td className="py-3 text-muted-foreground">{formatDate(t.createdAt)}</td></tr>))}</tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Tenant</DialogTitle><DialogDescription>Create a new tenant organization. Optionally assign an owner.</DialogDescription></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
            <div className="space-y-2">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Demo Travel Agency" />
            </div>
            <div className="space-y-2">
              <Label>Slug <span className="text-destructive">*</span></Label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} placeholder="demo-travel" />
            </div>
            <div className="space-y-2">
              <Label>Owner email</Label>
              <Input type="email" value={form.ownerEmail} onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })} placeholder="owner@demo.com" />
              <p className="text-xs text-muted-foreground">User must already exist. They will be assigned as tenant owner with full permissions.</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create Tenant'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
