'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDateTime, formatMoney } from '@/lib/utils';

const STATUS_ICON: Record<string, any> = { SUCCESS: CheckCircle, FAILED: XCircle, PENDING: Clock };

export default function TransactionLogsPage() {
  const { activeTenant } = useAuthStore();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [meta, setMeta] = useState({ page: 1, total: 0, totalPages: 1 });

  useEffect(() => {
    if (!activeTenant) return;
    setLoading(true);
    api.get(`/api/v1/tenant/transaction-logs?page=${page}&limit=30`, { tenantId: activeTenant.id })
      .then((res: any) => { setData(res.data); setMeta(res); })
      .finally(() => setLoading(false));
  }, [activeTenant, page]);

  if (loading) return <Skeleton className="h-96" />;

  return (
    <div className="space-y-6">
      <PageHeader title="Transaction Logs" subtitle={`${meta.total} gateway attempts`} />
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-4 w-4" />Gateway Transactions</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.map((log: any) => {
              const Icon = STATUS_ICON[log.status] || Clock;
              const isExpanded = expanded[log.id];
              return (
                <div key={log.id}>
                  <div
                    className="flex items-center justify-between border-b pb-2 last:border-0 text-sm cursor-pointer hover:bg-muted/30 rounded px-1 py-1"
                    onClick={() => setExpanded({ ...expanded, [log.id]: !isExpanded })}
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      <Icon className={`h-4 w-4 ${log.status === 'SUCCESS' ? 'text-success' : log.status === 'FAILED' ? 'text-destructive' : 'text-warning'}`} />
                      <span className="font-medium capitalize">{log.gateway}</span>
                      {log.gatewayRef && <span className="text-muted-foreground">{log.gatewayRef}</span>}
                      <Badge variant={log.status === 'SUCCESS' ? 'success' : log.status === 'FAILED' ? 'destructive' : 'warning'} className="text-[10px]">{log.status}</Badge>
                      {log.errorMessage && <span className="text-xs text-destructive truncate max-w-[200px]">{log.errorMessage}</span>}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-medium">{formatMoney(Number(log.amount), log.currencyCode)}</span>
                      <span className="text-xs text-muted-foreground">{formatDateTime(log.attemptedAt)}</span>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="bg-muted/30 rounded-lg p-3 mb-2 ml-6 text-xs font-mono space-y-2">
                      {log.requestPayload && <div><p className="text-muted-foreground mb-1">Request:</p><pre className="whitespace-pre-wrap break-all">{JSON.stringify(log.requestPayload, null, 2)}</pre></div>}
                      {log.responsePayload && <div><p className="text-muted-foreground mb-1">Response:</p><pre className="whitespace-pre-wrap break-all">{JSON.stringify(log.responsePayload, null, 2)}</pre></div>}
                      {log.completedAt && <p><span className="text-muted-foreground">Completed:</span> {formatDateTime(log.completedAt)}</p>}
                    </div>
                  )}
                </div>
              );
            })}
            {data.length === 0 && <p className="text-center text-muted-foreground py-8">No transaction logs yet.</p>}
          </div>
          {meta.totalPages > 1 && <div className="mt-4"><Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} limit={30} onPageChange={setPage} /></div>}
        </CardContent>
      </Card>
    </div>
  );
}
