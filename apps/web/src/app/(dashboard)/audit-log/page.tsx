'use client';
import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate } from '@/lib/utils';
import { Skeleton, TableSkeleton } from '@/components/ui/skeleton';

interface AuditItem { id: string; action: string; module: string; entity: string; entityId?: string | null; actorId: string; createdAt: string; }
interface Paginated<T> { data: T[]; total: number; }

export default function AuditLogPage() {
  const [items, setItems] = useState<AuditItem[]>([]); const [loading, setLoading] = useState(true);
  const { activeTenant } = useAuthStore();
  const load = useCallback(() => { if (!activeTenant) return; setLoading(true); api.get<Paginated<AuditItem>>('/api/v1/tenant/audit-logs', { tenantId: activeTenant.id }).then((r) => setItems(r.data)).finally(() => setLoading(false)); }, [activeTenant]);
  useEffect(() => { load(); }, [load]);
  return (<div className="space-y-6"><PageHeader title="Audit Log" subtitle="View security and compliance audit trail" />
    <Card><CardHeader><CardTitle>Mutation History</CardTitle></CardHeader><CardContent>{loading ? <TableSkeleton /> : items.length === 0 ? <p className="text-muted-foreground">No audit entries yet. Actions like creating, updating, and deleting records will appear here.</p> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="pb-3 font-medium">Date</th><th className="pb-3 font-medium">Module</th><th className="pb-3 font-medium">Action</th><th className="pb-3 font-medium">Entity</th><th className="pb-3 font-medium">Entity ID</th></tr></thead><tbody>{items.map((a) => (<tr key={a.id} className="border-b last:border-0"><td className="py-3 text-muted-foreground">{formatDate(a.createdAt)}</td><td className="py-3"><Badge variant="secondary">{a.module}</Badge></td><td className="py-3"><Badge variant={a.action === 'DELETE' ? 'destructive' : a.action === 'CREATE' ? 'success' : 'default'}>{a.action}</Badge></td><td className="py-3">{a.entity}</td><td className="py-3 text-muted-foreground text-xs">{a.entityId || '--'}</td></tr>))}</tbody></table></div>}</CardContent></Card></div>);
}
