'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Plus, Search, Pencil, Trash2, UserCheck, Eye } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate } from '@/lib/utils';
import { Lead, Paginated, LEAD_STATUSES, leadStatusVariant, leadPriorityVariant } from '@/lib/crm';
import { LeadFormDialog } from './lead-form-dialog';

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [deleting, setDeleting] = useState<Lead | null>(null);
  const { activeTenant } = useAuthStore();

  const load = useCallback(() => {
    if (!activeTenant) return;
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    api
      .get<Paginated<Lead>>(`/api/v1/tenant/leads?${params.toString()}`, {
        tenantId: activeTenant.id,
      })
      .then((res) => setLeads(res.data))
      .catch((err) => setError(err.message || 'Failed to load leads'))
      .finally(() => setLoading(false));
  }, [activeTenant, search, status]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (lead: Lead) => {
    setEditing(lead);
    setFormOpen(true);
  };

  const handleConvert = async (lead: Lead) => {
    if (!activeTenant) return;
    try {
      await api.post(`/api/v1/tenant/leads/${lead.id}/convert`, {}, { tenantId: activeTenant.id });
      toast.success(`${lead.fullName} converted to client`);
      load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to convert lead');
    }
  };

  const handleDelete = async () => {
    if (!activeTenant || !deleting) return;
    try {
      await api.delete(`/api/v1/tenant/leads/${deleting.id}`, { tenantId: activeTenant.id });
      toast.success('Lead deleted');
      load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete lead');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Leads</h2>
        <Button size="sm" onClick={openCreate}>
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
        <div className="flex flex-wrap gap-1">
          <Button
            variant={status === '' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatus('')}
          >
            All
          </Button>
          {LEAD_STATUSES.map((s) => (
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
          ) : error ? (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          ) : leads.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-muted-foreground">No leads found.</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Create your first lead
              </Button>
            </div>
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
                    <th className="pb-3 font-medium">Created</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id} className="border-b last:border-0">
                      <td className="py-3 font-medium">
                        <Link href={`/leads/${lead.id}`} className="hover:underline">
                          {lead.fullName}
                        </Link>
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {lead.email || lead.phone || '--'}
                      </td>
                      <td className="py-3">
                        <Badge variant={leadStatusVariant[lead.status] || 'secondary'}>
                          {lead.status}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <Badge variant={leadPriorityVariant[lead.priority] || 'secondary'}>
                          {lead.priority}
                        </Badge>
                      </td>
                      <td className="py-3 text-muted-foreground">{lead.serviceType || '--'}</td>
                      <td className="py-3 text-muted-foreground">{formatDate(lead.createdAt)}</td>
                      <td className="py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button asChild variant="ghost" size="icon" title="View">
                            <Link href={`/leads/${lead.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Edit"
                            onClick={() => openEdit(lead)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {lead.status !== 'WON' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Convert to client"
                              onClick={() => handleConvert(lead)}
                            >
                              <UserCheck className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Delete"
                            onClick={() => setDeleting(lead)}
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

      <LeadFormDialog open={formOpen} onOpenChange={setFormOpen} lead={editing} onSaved={load} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete lead?"
        description={`This will remove ${deleting?.fullName}. This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </div>
  );
}
