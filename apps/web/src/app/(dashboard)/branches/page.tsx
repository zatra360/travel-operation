'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
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

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeTenant } = useAuthStore();

  useEffect(() => {
    if (!activeTenant) return;
    setLoading(true);
    api
      .get<Branch[]>('/api/v1/tenant/branches', { tenantId: activeTenant.id })
      .then(setBranches)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeTenant]);

  const columns: DataTableColumn<Branch>[] = [
    { key: 'name', header: 'Name', cell: (b) => <span className="font-medium">{b.name}</span> },
    { key: 'code', header: 'Code', cell: (b) => <span className="text-muted-foreground">{b.code}</span> },
    { key: 'status', header: 'Status', cell: (b) => <StatusBadge status={b.status} /> },
    { key: 'contact', header: 'Contact', hideOnMobile: true, cell: (b) => <span className="text-muted-foreground">{b.email || b.phone || '—'}</span> },
    { key: 'created', header: 'Created', hideOnMobile: true, cell: (b) => <span className="text-muted-foreground">{formatDate(b.createdAt)}</span> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Branches"
        subtitle="Manage office locations and branch operations"
        actions={
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Branch
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={branches}
        rowKey={(b) => b.id}
        loading={loading}
        emptyTitle="No branches yet"
        emptyDescription="Create your first office location to organize operations by branch."
        mobileCard={(b) => (
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{b.name}</span>
              <StatusBadge status={b.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {b.code} · {b.email || b.phone || '—'}
            </p>
          </div>
        )}
      />
    </div>
  );
}
