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

interface Lead {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  status: string;
  priority: string;
  source?: string;
  serviceType?: string;
  createdAt: string;
}

interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST'];

const statusVariant: Record<
  string,
  'default' | 'secondary' | 'success' | 'warning' | 'info' | 'destructive'
> = {
  NEW: 'info',
  CONTACTED: 'default',
  QUALIFIED: 'warning',
  PROPOSAL: 'warning',
  WON: 'success',
  LOST: 'destructive',
};

const priorityVariant: Record<string, 'secondary' | 'warning' | 'destructive'> = {
  LOW: 'secondary',
  MEDIUM: 'secondary',
  HIGH: 'warning',
  URGENT: 'destructive',
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const { activeTenant } = useAuthStore();

  const load = useCallback(() => {
    if (!activeTenant) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    api
      .get<Paginated<Lead>>(`/api/v1/tenant/leads?${params.toString()}`, {
        tenantId: activeTenant.id,
      })
      .then((res) => setLeads(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeTenant, search, status]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Leads</h2>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Lead
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex gap-1">
          <Button
            variant={status === '' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatus('')}
          >
            All
          </Button>
          {STATUSES.map((s) => (
            <Button
              key={s}
              variant={status === s ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatus(s)}
            >
              {s}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Leads</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading leads...</p>
          ) : leads.length === 0 ? (
            <p className="text-muted-foreground">No leads found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium">Name</th>
                    <th className="pb-3 font-medium">Contact</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Priority</th>
                    <th className="pb-3 font-medium">Service</th>
                    <th className="pb-3 font-medium">Source</th>
                    <th className="pb-3 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id} className="border-b last:border-0">
                      <td className="py-3 font-medium">{lead.fullName}</td>
                      <td className="py-3 text-muted-foreground">
                        {lead.email || lead.phone || '--'}
                      </td>
                      <td className="py-3">
                        <Badge variant={statusVariant[lead.status] || 'secondary'}>
                          {lead.status}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <Badge variant={priorityVariant[lead.priority] || 'secondary'}>
                          {lead.priority}
                        </Badge>
                      </td>
                      <td className="py-3 text-muted-foreground">{lead.serviceType || '--'}</td>
                      <td className="py-3 text-muted-foreground">{lead.source || '--'}</td>
                      <td className="py-3 text-muted-foreground">{formatDate(lead.createdAt)}</td>
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
