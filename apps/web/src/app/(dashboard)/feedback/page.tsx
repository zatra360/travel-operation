'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { StatCard } from '@/components/ui/stat-card';
import { Star, MessageSquare, Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDateTime } from '@/lib/utils';
import { toast } from 'sonner';

export default function FeedbackPage() {
  const { activeTenant } = useAuthStore();
  const [data, setData] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<any>(null);

  const load = () => {
    if (!activeTenant) return;
    setLoading(true);
    Promise.all([
      api.get('/api/v1/tenant/feedback?limit=30', { tenantId: activeTenant.id }),
      api.get('/api/v1/tenant/feedback/stats', { tenantId: activeTenant.id }),
    ]).then(([res, statRes]: any[]) => {
      setData(res.data); setStats(statRes);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [activeTenant]);

  const remove = async () => {
    if (!activeTenant || !deleting) return;
    await api.delete(`/api/v1/tenant/feedback/${deleting.id}`, { tenantId: activeTenant.id });
    toast.success('Deleted'); setDeleting(null); load();
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star key={i} className={`h-3.5 w-3.5 ${i < rating ? 'fill-warning text-warning' : 'text-muted-foreground/30'}`} />
    ));
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><div className="grid grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div><Skeleton className="h-64" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Customer Feedback" subtitle={`${stats?.total || 0} reviews · NPS ${stats?.nps || 0}`} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Reviews" value={stats?.total || 0} icon={MessageSquare} tone="default" />
        <StatCard label="Avg Rating" value={`${stats?.avgRating || 0}/5`} icon={Star} tone="warning" />
        <StatCard label="NPS Score" value={stats?.nps || 0} icon={Star} tone={stats?.nps >= 50 ? 'success' : 'warning'} />
        <StatCard label="Promoters" value={stats?.promoters || 0} icon={Star} tone="success" />
      </div>

      {stats?.distribution?.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Rating Distribution</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-end gap-3 h-32">
              {stats.distribution.map((d: any) => (
                <div key={d.rating} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-sm font-medium">{d.count}</span>
                  <div className="w-full bg-primary/20 rounded-t" style={{ height: `${Math.max(4, (d.count / Math.max(...stats.distribution.map((x: any) => x.count))) * 100)}%` }} />
                  <span className="text-xs text-muted-foreground flex">{renderStars(d.rating)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {data.map((f: any) => (
          <Card key={f.id}>
            <CardContent className="flex items-start justify-between py-3">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <div className="flex">{renderStars(f.rating)}</div>
                  {f.category && <Badge variant="outline" className="text-[10px]">{f.category}</Badge>}
                  {f.npsScore != null && <Badge variant={f.npsScore >= 9 ? 'success' : f.npsScore >= 7 ? 'default' : 'destructive'} className="text-[10px]">NPS {f.npsScore}</Badge>}
                </div>
                {f.comment && <p className="text-sm">{f.comment}</p>}
                <p className="text-xs text-muted-foreground">
                  {f.client?.displayName && `${f.client.displayName} · `}
                  {f.booking?.bookingRef && `Booking ${f.booking.bookingRef} · `}
                  {formatDateTime(f.createdAt)}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => setDeleting(f)}><Trash2 className="h-3 w-3" /></Button>
            </CardContent>
          </Card>
        ))}
        {data.length === 0 && <p className="text-center text-muted-foreground py-12">No feedback yet.</p>}
      </div>

      <ConfirmDialog open={!!deleting} onOpenChange={o => !o && setDeleting(null)} title="Delete feedback?" description="This cannot be undone." confirmLabel="Delete" onConfirm={remove} />
    </div>
  );
}
