'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate } from '@/lib/utils';

interface Client {
  id: string;
  displayName: string;
  type: string;
  status: string;
  email?: string;
  phone?: string;
  companyName?: string;
  createdAt: string;
}

interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const statusVariant: Record<string, 'success' | 'secondary' | 'destructive'> = {
  ACTIVE: 'success',
  INACTIVE: 'secondary',
  BLOCKED: 'destructive',
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const { activeTenant } = useAuthStore();

  const load = useCallback(() => {
    if (!activeTenant) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (type) params.set('type', type);
    api
      .get<Paginated<Client>>(`/api/v1/tenant/clients?${params.toString()}`, {
        tenantId: activeTenant.id,
      })
      .then((res) => setClients(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeTenant, search, type]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Clients</h2>
        <Button size="sm">
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
            <p className="text-muted-foreground">Loading clients...</p>
          ) : clients.length === 0 ? (
            <p className="text-muted-foreground">No clients found.</p>
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
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => (
                    <tr key={client.id} className="border-b last:border-0">
                      <td className="py-3 font-medium">{client.displayName}</td>
                      <td className="py-3 text-muted-foreground">{client.type}</td>
                      <td className="py-3 text-muted-foreground">
                        {client.email || client.phone || '--'}
                      </td>
                      <td className="py-3 text-muted-foreground">{client.companyName || '--'}</td>
                      <td className="py-3">
                        <Badge variant={statusVariant[client.status] || 'secondary'}>
                          {client.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-muted-foreground">{formatDate(client.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
