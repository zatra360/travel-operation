'use client';

import { useEffect, useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { Pagination } from '@/components/ui/pagination';
import { StatusBadge } from '@/components/ui/status-badge';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDateTime } from '@/lib/utils';

const PAGE_SIZE = 30;

interface AuditItem {
  id: string;
  action: string;
  module: string;
  entity: string;
  entityId?: string | null;
  actorId: string;
  actor?: { id: string; firstName: string; lastName: string; email: string } | null;
  createdAt: string;
}

export default function AuditLogPage() {
  const [items, setItems] = useState<AuditItem[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const { activeTenant, activeBranch } = useAuthStore();

  const load = useCallback(() => {
    if (!activeTenant) return;
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(PAGE_SIZE));
    api
      .get<{ data: AuditItem[]; page: number; totalPages: number; total: number }>(
        `/api/v1/tenant/audit-logs?${params.toString()}`,
        { tenantId: activeTenant.id, branchId: activeBranch?.id },
      )
      .then((r) => {
        setItems(r.data || []);
        setMeta({ page: r.page ?? 1, totalPages: r.totalPages ?? 1, total: r.total ?? 0 });
      })
      .finally(() => setLoading(false));
  }, [activeTenant, activeBranch, page]);

  useEffect(() => {
    load();
  }, [load]);

  const actionTone = (action: string) =>
    action === 'DELETE' ? 'destructive' : action === 'CREATE' ? 'success' : 'info';

  const columns: DataTableColumn<AuditItem>[] = [
    { key: 'date', header: 'Date', cell: (a) => <span className="text-muted-foreground">{formatDateTime(a.createdAt)}</span> },
    { key: 'actor', header: 'Actor', cell: (a) => <span className="text-sm">{a.actor ? `${a.actor.firstName} ${a.actor.lastName}` : 'System'}</span> },
    { key: 'module', header: 'Module', cell: (a) => <Badge variant="secondary">{a.module}</Badge> },
    { key: 'action', header: 'Action', cell: (a) => <StatusBadge status={a.action} variant={actionTone(a.action)} /> },
    { key: 'entity', header: 'Entity', hideOnMobile: true, cell: (a) => <span>{a.entity}</span> },
    { key: 'entityId', header: 'Entity ID', hideOnMobile: true, cell: (a) => <span className="text-xs text-muted-foreground">{a.entityId || '—'}</span> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Audit Log" subtitle="View security and compliance audit trail" />

      <DataTable
        columns={columns}
        data={items}
        rowKey={(a) => a.id}
        loading={loading}
        emptyTitle="No audit entries yet"
        emptyDescription="Actions like creating, updating, and deleting records will appear here."
        mobileCard={(a) => (
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <Badge variant="secondary">{a.module}</Badge>
              <StatusBadge status={a.action} variant={actionTone(a.action)} />
            </div>
            <p className="text-sm">{a.actor ? `${a.actor.firstName} ${a.actor.lastName}` : 'System'} — {a.entity}</p>
            <p className="text-xs text-muted-foreground">{formatDateTime(a.createdAt)}</p>
          </div>
        )}
      />
      {!loading && items.length > 0 && (
        <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} limit={PAGE_SIZE} onPageChange={setPage} />
      )}
    </div>
  );
}
