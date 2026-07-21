'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { BookOpen, Plus, Pencil, Trash2, Eye, FileText } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDateTime } from '@/lib/utils';
import { toast } from 'sonner';

const CATEGORIES = ['GENERAL', 'SALES', 'VISA', 'TICKETING', 'FINANCE', 'HR', 'PROCESS'];

export default function KnowledgePage() {
  const { activeTenant } = useAuthStore();
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [dialog, setDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [viewing, setViewing] = useState<any>(null);
  const [form, setForm] = useState({ title: '', content: '', category: 'GENERAL', isPublished: false });
  const [deleting, setDeleting] = useState<any>(null);

  const load = () => {
    if (!activeTenant) return;
    setLoading(true);
    const params = category ? `?category=${category}` : '';
    api.get<any[]>(`/api/v1/tenant/knowledge${params}`, { tenantId: activeTenant.id })
      .then(data => setArticles(data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [activeTenant, category]);

  const openCreate = () => { setEditing(null); setForm({ title: '', content: '', category: 'GENERAL', isPublished: false }); setDialog(true); };
  const openEdit = (a: any) => { setEditing(a); setForm({ title: a.title, content: a.content, category: a.category, isPublished: a.isPublished }); setDialog(true); };

  const openView = async (a: any) => {
    const res = await api.get<any>(`/api/v1/tenant/knowledge/${a.id}`, { tenantId: activeTenant!.id });
    setViewing(res); setViewDialog(true);
  };

  const save = async () => {
    if (!activeTenant) return;
    try {
      if (editing) { await api.put(`/api/v1/tenant/knowledge/${editing.id}`, form, { tenantId: activeTenant.id }); toast.success('Updated'); }
      else { await api.post('/api/v1/tenant/knowledge', form, { tenantId: activeTenant.id }); toast.success('Created'); }
      setDialog(false); load();
    } catch { toast.error('Failed'); }
  };

  const remove = async () => {
    if (!activeTenant || !deleting) return;
    await api.delete(`/api/v1/tenant/knowledge/${deleting.id}`, { tenantId: activeTenant.id });
    toast.success('Deleted'); setDeleting(null); load();
  };

  if (loading) return <Skeleton className="h-96" />;

  return (
    <div className="space-y-6">
      <PageHeader title="Knowledge Hub" subtitle={`${articles.length} articles`} actions={<Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" />New Article</Button>} />
      <div className="flex gap-2">
        <Button variant={!category ? 'secondary' : 'outline'} size="sm" onClick={() => setCategory('')}>All</Button>
        {CATEGORIES.map(c => <Button key={c} variant={category === c ? 'secondary' : 'outline'} size="sm" onClick={() => setCategory(c)}>{c}</Button>)}
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {articles.map(a => (
          <Card key={a.id} className="hover:shadow-sm transition-shadow cursor-pointer" onClick={() => openView(a)}>
            <CardContent className="pt-5 space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{a.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px]">{a.category}</Badge>
                    {a.isPublished ? <Badge variant="success" className="text-[10px]">published</Badge> : <Badge variant="secondary" className="text-[10px]">draft</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.content?.slice(0, 120)}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{a.author?.firstName} {a.author?.lastName}</span>
                <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{a.viewCount}</span>
              </div>
              <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(a)}><Pencil className="h-3 w-3" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleting(a)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {articles.length === 0 && <p className="col-span-full text-center text-muted-foreground py-12">No articles yet.</p>}
      </div>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Edit Article' : 'New Article'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</Label><select className="flex h-10 w-full rounded-md border px-3 py-2 text-sm" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Content</Label><Textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} rows={6} /></div>
            <div className="flex items-center gap-2"><input type="checkbox" checked={form.isPublished} onChange={e => setForm({ ...form, isPublished: e.target.checked })} id="pub" /><Label htmlFor="pub">Published</Label></div>
          </div>
          <DialogFooter><Button onClick={save}>{editing ? 'Update' : 'Create'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewDialog} onOpenChange={setViewDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5" />{viewing.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Badge variant="outline">{viewing.category}</Badge>
                  <span>{viewing.author?.firstName} {viewing.author?.lastName}</span>
                  <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{viewing.viewCount} views</span>
                  <span>{formatDateTime(viewing.updatedAt)}</span>
                </div>
                <div className="prose prose-sm max-w-none whitespace-pre-wrap leading-relaxed">{viewing.content}</div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleting} onOpenChange={o => !o && setDeleting(null)} title="Delete article?" description={`Delete "${deleting?.title}"?`} confirmLabel="Delete" onConfirm={remove} />
    </div>
  );
}
