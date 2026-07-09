'use client';
import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate } from '@/lib/utils';

interface ActivityItem { id: string; userId: string; type: string; subject: string; content?: string | null; entity?: string | null; createdAt: string; }
interface Paginated<T> { data: T[]; total: number; }

export default function ActivityPage() {
  const [items, setItems] = useState<ActivityItem[]>([]); const [loading, setLoading] = useState(true);
  const { activeTenant } = useAuthStore();
  const load = useCallback(() => { if (!activeTenant) return; setLoading(true); api.get<Paginated<ActivityItem>>('/api/v1/tenant/activity', { tenantId: activeTenant.id }).then((r) => setItems(r.data)).finally(() => setLoading(false)); }, [activeTenant]);
  useEffect(() => { load(); }, [load]);
  return (<div className="space-y-6"><h2 className="text-2xl font-bold">Activity</h2>
    <Card><CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader><CardContent>{loading ? <p className="text-muted-foreground">Loading...</p> : items.length === 0 ? <p className="text-muted-foreground">No activity yet. Recent actions from your team will appear here.</p> : <div className="space-y-2">{items.map((a) => (<div key={a.id} className="flex items-start justify-between gap-4 rounded-md border p-3"><div className="min-w-0"><div className="flex items-center gap-2"><Badge variant="secondary" className="text-xs">{a.type}</Badge><p className="font-medium text-sm">{a.subject}</p></div>{a.content && <p className="text-xs text-muted-foreground mt-1">{a.content}</p>}<p className="text-xs text-muted-foreground mt-1">{formatDate(a.createdAt)}</p></div></div>))}</div>}</CardContent></Card></div>);
}
