'use client';
import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface NotifItem { id: string; title: string; body?: string | null; type: string; isRead: boolean; createdAt: string; }
interface Paginated<T> { data: T[]; total: number; }

export default function NotificationsPage() {
  const [items, setItems] = useState<NotifItem[]>([]); const [loading, setLoading] = useState(true); const [unread, setUnread] = useState(0);
  const { activeTenant } = useAuthStore();
  const load = useCallback(() => { if (!activeTenant) return; setLoading(true); api.get<Paginated<NotifItem>>('/api/v1/tenant/notifications', { tenantId: activeTenant.id }).then((r) => { setItems(r.data); setUnread(r.data.filter((n) => !n.isRead).length); }).finally(() => setLoading(false)); }, [activeTenant]);
  useEffect(() => { load(); }, [load]);
  const markRead = async (id: string) => { await api.post(`/api/v1/tenant/notifications/${id}/read`, {}, { tenantId: activeTenant!.id }); load(); };
  const markAll = async () => { await api.post('/api/v1/tenant/notifications/read-all', {}, { tenantId: activeTenant!.id }); load(); };

  return (<div className="space-y-6"><PageHeader title="Notifications" subtitle="View system alerts and notifications" actions={unread > 0 ? <Button size="sm" variant="outline" onClick={markAll}>Mark all read ({unread})</Button> : undefined} />
    <Card><CardHeader><CardTitle>Recent</CardTitle></CardHeader><CardContent>{loading ? <div className="space-y-2">{Array.from({length:3}).map((_,i)=><Skeleton key={i} className="h-16 w-full"/>)}</div> : items.length === 0 ? <p className="text-muted-foreground">No notifications. Important updates and alerts will appear here.</p> : <div className="space-y-2">{items.map((n) => (<div key={n.id} className={`flex items-start justify-between gap-4 rounded-md border p-3 ${n.isRead ? 'opacity-60' : ''}`}><div className="min-w-0"><p className="font-medium text-sm">{n.title}</p>{n.body && <p className="text-xs text-muted-foreground mt-1">{n.body}</p>}<p className="text-xs text-muted-foreground mt-1">{formatDate(n.createdAt)}</p></div><div className="flex items-center gap-2 shrink-0"><Badge variant={n.isRead ? 'secondary' : 'default'}>{n.type}</Badge>{!n.isRead && <Button variant="ghost" size="sm" onClick={() => markRead(n.id)}>Read</Button>}</div></div>))}</div>}</CardContent></Card></div>);
}
