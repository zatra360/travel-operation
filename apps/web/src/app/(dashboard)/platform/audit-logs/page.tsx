'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollText, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';

export default function PlatformAuditPage() {
  const [data, setData] = useState<any[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [module, setModule] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', '50');
    if (module) params.set('module', module);
    api.get(`/api/v1/platform/audit-logs?${params}`).then((res: any) => {
      setData(res.data); setMeta(res);
    }).finally(() => setLoading(false));
  }, [page, module]);

  if (loading) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-6">
      <PageHeader title="Audit Logs" subtitle={`${meta.total} events across all tenants`} />
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><ScrollText className="h-4 w-4" />Global Activity</CardTitle>
          <div className="flex items-center gap-2">
            <Input placeholder="Filter by module" value={module} onChange={e => setModule(e.target.value)} className="w-40" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.map((log: any) => (
              <div key={log.id} className="flex items-center justify-between border-b pb-2 last:border-0 text-sm">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-xs">{log.module}</Badge>
                  <span className="font-medium">{log.action}</span>
                  <span className="text-muted-foreground">{log.entity} {log.entityId?.slice(0, 8) || ''}</span>
                </div>
                <span className="text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</span>
              </div>
            ))}
          </div>
          {meta.totalPages > 1 && (
            <div className="mt-4"><Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} limit={50} onPageChange={setPage} /></div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
