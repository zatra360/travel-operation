'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Plus, Search, Pencil, Trash2, Eye } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate } from '@/lib/utils';
import { Client, Paginated, clientStatusVariant } from '@/lib/crm';
import { TableSkeleton } from '@/components/ui/skeleton';
import { ClientFormDialog } from './client-form-dialog';

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState<Client | null>(null);
  const { activeTenant } = useAuthStore();

  const load = useCallback(() => {
    if (!activeTenant) return;
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (type) params.set('type', type);
    api
      .get<Paginated<Client>>(`/api/v1/tenant/clients?${params.toString()}`, {
        tenantId: activeTenant.id,
      })
      .then((res) => setClients(res.data))
      .catch((err) => setError(err.message || 'Failed to load clients'))
      .finally(() => setLoading(false));
  }, [activeTenant, search, type]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditing(client);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!activeTenant || !deleting) return;
    try {
      await api.delete(`/api/v1/tenant/clients/${deleting.id}`, { tenantId: activeTenant.id });
      toast.success('Client deleted');
      load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete client');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Clients</h2>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Client
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, email, phone, or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex gap-1">
          <Button
            variant={type === '' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setType('')}
          >
            All
          </Button>
          <Button
            variant={type === 'PERSON' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setType('PERSON')}
          >
            Person
          </Button>
          <Button
            variant={type === 'COMPANY' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setType('COMPANY')}
          >
            Company
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Clients</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton />
          ) : error ? (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          ) : clients.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-muted-foreground">No clients found.</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Create your first client
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium">Name</th>
                    <th className="pb-3 font-medium">Type</th>
                    <th className="pb-3 font-medium">Contact</th>
                    <th className="pb-3 font-medium">Company</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Created</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => (
                    <tr key={client.id} className="border-b last:border-0">
                      <td className="py-3 font-medium">
                        <Link href={`/clients/${client.id}`} className="hover:underline">
                          {client.displayName}
                        </Link>
                      </td>
                      <td className="py-3 text-muted-foreground">{client.type}</td>
                      <td className="py-3 text-muted-foreground">
                        {client.email || client.phone || '--'}
                      </td>
                      <td className="py-3 text-muted-foreground">{client.companyName || '--'}</td>
                      <td className="py-3">
                        <Badge variant={clientStatusVariant[client.status] || 'secondary'}>
                          {client.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-muted-foreground">{formatDate(client.createdAt)}</td>
                      <td className="py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button asChild variant="ghost" size="icon" title="View">
                            <Link href={`/clients/${client.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Edit"
                            onClick={() => openEdit(client)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Delete"
                            onClick={() => setDeleting(client)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
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

      <ClientFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        client={editing}
        onSaved={load}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete client?"
        description={`This will remove ${deleting?.displayName}. This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </div>
  );
}
