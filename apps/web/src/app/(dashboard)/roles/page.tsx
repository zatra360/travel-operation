'use client';
import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate } from '@/lib/utils';
import { Skeleton, TableSkeleton } from '@/components/ui/skeleton';

interface Role { id: string; name: string; description?: string | null; isSystem: boolean; createdAt: string; }
interface Paginated<T> { data: T[]; total: number; }

export default function RolesPage() {
  const [items, setItems] = useState<Role[]>([]); const [loading, setLoading] = useState(true);
  const { activeTenant } = useAuthStore();
  const load = useCallback(() => { if (!activeTenant) return; setLoading(true); api.get<Paginated<Role>>('/api/v1/tenant/roles', { tenantId: activeTenant.id }).then((r) => setItems(r.data)).finally(() => setLoading(false)); }, [activeTenant]);
  useEffect(() => { load(); }, [load]);
  return (<div className="space-y-6"><PageHeader title="Roles" subtitle="Define permissions and assign to staff members" />
    <Card><CardHeader><CardTitle>All Roles</CardTitle></CardHeader><CardContent>{loading ? <TableSkeleton /> : items.length === 0 ? <p className="text-muted-foreground">No roles found. Create roles to manage permissions for your team.</p> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="pb-3 font-medium">Name</th><th className="pb-3 font-medium">Description</th><th className="pb-3 font-medium">System</th><th className="pb-3 font-medium">Created</th></tr></thead><tbody>{items.map((r) => (<tr key={r.id} className="border-b last:border-0"><td className="py-3 font-medium">{r.name}</td><td className="py-3 text-muted-foreground">{r.description || '--'}</td><td className="py-3"><Badge variant={r.isSystem ? 'secondary' : 'default'}>{r.isSystem ? 'System' : 'Custom'}</Badge></td><td className="py-3 text-muted-foreground">{formatDate(r.createdAt)}</td></tr>))}</tbody></table></div>}</CardContent></Card></div>);
}
