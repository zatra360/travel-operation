'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { LogIn, ShieldAlert } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';

export default function LoginHistoryPage() {
  const [data, setData] = useState<any[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', '50');
    if (search) params.set('search', search);
    api.get(`/api/v1/platform/login-history?${params}`).then((res: any) => {
      setData(res.data);
      setMeta(res);
    }).finally(() => setLoading(false));
  }, [page, search]);

  if (loading) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-6">
      <PageHeader title="Login History" subtitle={`${meta.total} login attempts across all users`} />
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><LogIn className="h-4 w-4" />Login Attempts</CardTitle>
          <Input placeholder="Search by email" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.map((entry: any) => (
              <div key={entry.id} className="flex items-center justify-between border-b pb-2 last:border-0 text-sm">
                <div className="flex items-center gap-3">
                  <Badge variant={entry.success ? 'success' : 'destructive'} className="text-xs">
                    {entry.success ? 'SUCCESS' : 'FAILED'}
                  </Badge>
                  <span className="font-medium">{entry.email}</span>
                  {entry.user && (
                    <span className="text-muted-foreground">{entry.user.firstName} {entry.user.lastName}</span>
                  )}
                  {entry.failReason && (
                    <span className="flex items-center gap-1 text-destructive">
                      <ShieldAlert className="h-3 w-3" />{entry.failReason}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  {entry.ip && <span className="text-xs text-muted-foreground">{entry.ip}</span>}
                  <span className="text-xs text-muted-foreground">{formatDateTime(entry.createdAt)}</span>
                </div>
              </div>
            ))}
            {data.length === 0 && <p className="text-center text-muted-foreground py-8">No login attempts recorded.</p>}
          </div>
          {meta.totalPages > 1 && (
            <div className="mt-4"><Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} limit={50} onPageChange={setPage} /></div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
