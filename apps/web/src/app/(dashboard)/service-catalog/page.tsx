'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2, Package, Layers } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatMoney } from '@/lib/utils';

export default function ServiceCatalogPage() {
  const { activeTenant } = useAuthStore();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCat, setNewCat] = useState({ name: '', code: '' });
  const [newItem, setNewItem] = useState({ name: '', code: '', basePrice: 0, categoryId: '' });
  const [editingItem, setEditingItem] = useState<any>(null);

  const load = useCallback(() => {
    if (!activeTenant) return;
    setLoading(true);
    api.get('/api/v1/tenant/service-catalog/categories', { tenantId: activeTenant.id })
      .then((d: any) => setCategories(d))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, [activeTenant]);

  useEffect(() => { load(); }, [load]);

  const addCategory = async () => {
    if (!newCat.name || !newCat.code) return toast.error('Name and code required');
    try {
      await api.post('/api/v1/tenant/service-catalog/categories', newCat, { tenantId: activeTenant!.id });
      toast.success('Category added');
      setNewCat({ name: '', code: '' });
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const addItem = async () => {
    if (!newItem.name) return toast.error('Name required');
    try {
      await api.post('/api/v1/tenant/service-catalog/items', newItem, { tenantId: activeTenant!.id });
      toast.success('Item added');
      setNewItem({ name: '', code: '', basePrice: 0, categoryId: '' });
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const deleteItem = async (id: string) => {
    try {
      await api.delete(`/api/v1/tenant/service-catalog/items/${id}`, { tenantId: activeTenant!.id });
      toast.success('Item removed');
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Service Catalog" subtitle="Manage your travel service offerings and pricing" />

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Layers className="h-4 w-4" />Categories</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 items-end mb-4">
            <div className="space-y-2">
              <Label htmlFor="cat-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name <span className="text-destructive">*</span></Label>
              <Input id="cat-name" placeholder="Air Tickets" value={newCat.name} onChange={e => setNewCat({ ...newCat, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-code" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Code <span className="text-destructive">*</span></Label>
              <Input id="cat-code" placeholder="AIR" value={newCat.code} onChange={e => setNewCat({ ...newCat, code: e.target.value.toUpperCase() })} />
            </div>
            <Button size="sm" onClick={addCategory} className="w-fit"><Plus className="h-4 w-4 mr-1" />Add Category</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((c: any) => (
              <Badge key={c.id} variant="outline" className="text-sm px-3 py-1">{c.name} ({c.items?.length || 0})</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4" />Service Items</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 items-end mb-4">
            <div className="space-y-2">
              <Label htmlFor="item-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name <span className="text-destructive">*</span></Label>
              <Input id="item-name" placeholder="Economy Ticket" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-code" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Code</Label>
              <Input id="item-code" placeholder="ECO" value={newItem.code} onChange={e => setNewItem({ ...newItem, code: e.target.value.toUpperCase() })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-price" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Base Price</Label>
              <Input id="item-price" placeholder="0.00" type="number" min={0} value={newItem.basePrice || ''} onChange={e => setNewItem({ ...newItem, basePrice: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</Label>
              <Select value={newItem.categoryId || '__none__'} onValueChange={v => setNewItem({ ...newItem, categoryId: v === '__none__' ? '' : v })}>
                <SelectTrigger>
                  <SelectValue placeholder="No category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No category</SelectItem>
                  {categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" onClick={addItem} className="w-fit"><Plus className="h-4 w-4 mr-1" />Add Item</Button>
          </div>

          {categories.map((cat: any) => (
            <div key={cat.id} className="mb-4">
              <h4 className="font-medium text-sm text-muted-foreground mb-2">{cat.name}</h4>
              <div className="grid gap-1">
                {cat.items?.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                    <div>
                      <span className="font-medium">{item.name}</span>
                      <span className="text-muted-foreground ml-2">{item.code}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground">{item.serviceType}</span>
                      <span className="font-medium tabular-nums">{formatMoney(item.basePrice, item.currencyCode)}</span>
                      <Badge variant={item.isActive ? 'default' : 'secondary'} className="text-xs">{item.isActive ? 'Active' : 'Inactive'}</Badge>
                      <Button variant="ghost" size="icon" onClick={() => deleteItem(item.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                    </div>
                  </div>
                ))}
                {(!cat.items || cat.items.length === 0) && <p className="text-xs text-muted-foreground py-2">No items in this category.</p>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
