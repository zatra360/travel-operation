'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/page-header';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { TableToolbar } from '@/components/ui/table-toolbar';
import { Pagination } from '@/components/ui/pagination';
import { Database, Plus, Pencil, Trash2, Layers } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface MasterDataCategory {
  id: string;
  code: string;
  name: string;
  description: string | null;
  module: string | null;
  isSystem: boolean;
  isActive: boolean;
  sortOrder: number;
  _count?: { items: number };
}

interface MasterDataItem {
  id: string;
  categoryId: string;
  code: string;
  name: string;
  displayName: string | null;
  description: string | null;
  color: string | null;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
}

interface PaginatedItems {
  data: MasterDataItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface CatForm {
  name: string;
  code: string;
  description: string;
  module: string;
}

interface ItemForm {
  name: string;
  code: string;
  displayName: string;
  description: string;
  color: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
}

const MODULES = ['CRM', 'OPERATIONS', 'FINANCE', 'HRM', 'SYSTEM'] as const;
const ALL_MODULES = '__all__';
const PAGE_SIZE = 25;

const emptyCatForm: CatForm = { name: '', code: '', description: '', module: '' };
const emptyItemForm: ItemForm = { name: '', code: '', displayName: '', description: '', color: '', icon: '', sortOrder: 0, isActive: true };

export default function MasterDataPage() {
  const [categories, setCategories] = useState<MasterDataCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<MasterDataCategory | null>(null);
  const [items, setItems] = useState<MasterDataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);

  const [catDialog, setCatDialog] = useState(false);
  const [itemDialog, setItemDialog] = useState(false);
  const [editingCat, setEditingCat] = useState<MasterDataCategory | null>(null);
  const [editingItem, setEditingItem] = useState<MasterDataItem | null>(null);
  const [catForm, setCatForm] = useState<CatForm>(emptyCatForm);
  const [itemForm, setItemForm] = useState<ItemForm>(emptyItemForm);

  const [deletingCat, setDeletingCat] = useState<MasterDataCategory | null>(null);
  const [deletingItem, setDeletingItem] = useState<MasterDataItem | null>(null);

  const [itemsSearch, setItemsSearch] = useState('');
  const [itemsPage, setItemsPage] = useState(1);
  const [itemsMeta, setItemsMeta] = useState({ total: 0, totalPages: 1 });
  const [moduleFilter, setModuleFilter] = useState<string>(ALL_MODULES);

  const filteredCategories = useMemo(() => {
    if (moduleFilter === ALL_MODULES) return categories;
    return categories.filter((c) => c.module === moduleFilter);
  }, [categories, moduleFilter]);

  const moduleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of categories) {
      const mod = c.module || 'Other';
      counts[mod] = (counts[mod] || 0) + 1;
    }
    return counts;
  }, [categories]);

  const loadCategories = useCallback(() => {
    setLoading(true);
    api.get<MasterDataCategory[]>('/api/v1/platform/master-data/categories')
      .then((data) => setCategories(data || []))
      .catch(() => toast.error('Failed to load categories'))
      .finally(() => setLoading(false));
  }, []);

  const loadItems = useCallback((categoryId: string, page?: number, search?: string) => {
    if (!categoryId) return;
    setItemsLoading(true);
    const p = page ?? 1;
    const params = new URLSearchParams({ categoryId, page: String(p), limit: String(PAGE_SIZE) });
    const s = search ?? itemsSearch;
    if (s) params.set('search', s);
    api.get<PaginatedItems>(`/api/v1/platform/master-data/items?${params.toString()}`)
      .then((res) => {
        setItems(res.data);
        setItemsMeta({ total: res.total, totalPages: res.totalPages });
      })
      .catch(() => toast.error('Failed to load items'))
      .finally(() => setItemsLoading(false));
  }, [itemsSearch]);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  const selectCategory = useCallback((cat: MasterDataCategory) => {
    setSelectedCategory(cat);
    setItemsSearch('');
    setItemsPage(1);
    loadItems(cat.id, 1, '');
  }, [loadItems]);

  const openCatCreate = () => { setEditingCat(null); setCatForm(emptyCatForm); setCatDialog(true); };
  const openCatEdit = (cat: MasterDataCategory) => { setEditingCat(cat); setCatForm({ name: cat.name, code: cat.code, description: cat.description || '', module: cat.module || '' }); setCatDialog(true); };

  const saveCategory = async () => {
    try {
      if (editingCat) {
        await api.put(`/api/v1/platform/master-data/categories/${editingCat.id}`, catForm);
        toast.success('Category updated');
      } else {
        await api.post('/api/v1/platform/master-data/categories', catForm);
        toast.success('Category created');
      }
      setCatDialog(false);
      loadCategories();
    } catch { toast.error('Failed to save category'); }
  };

  const deleteCategory = async () => {
    if (!deletingCat) return;
    try {
      await api.delete(`/api/v1/platform/master-data/categories/${deletingCat.id}`);
      toast.success('Category deleted');
      if (selectedCategory?.id === deletingCat.id) { setSelectedCategory(null); setItems([]); }
      setDeletingCat(null);
      loadCategories();
    } catch { toast.error('Failed to delete category'); }
  };

  const openItemCreate = () => { setEditingItem(null); setItemForm(emptyItemForm); setItemDialog(true); };
  const openItemEdit = (item: MasterDataItem) => { setEditingItem(item); setItemForm({ name: item.name, code: item.code, displayName: item.displayName || '', description: item.description || '', color: item.color || '', icon: item.icon || '', sortOrder: item.sortOrder ?? 0, isActive: item.isActive }); setItemDialog(true); };

  const saveItem = async () => {
    if (!selectedCategory) return;
    try {
      if (editingItem) {
        await api.put(`/api/v1/platform/master-data/items/${editingItem.id}`, { ...itemForm, categoryId: selectedCategory.id });
        toast.success('Item updated');
      } else {
        await api.post('/api/v1/platform/master-data/items', { ...itemForm, categoryId: selectedCategory.id });
        toast.success('Item created');
      }
      setItemDialog(false);
      loadItems(selectedCategory.id, itemsPage, itemsSearch);
      loadCategories();
    } catch { toast.error('Failed to save item'); }
  };

  const deleteItem = async () => {
    if (!selectedCategory || !deletingItem) return;
    try {
      await api.delete(`/api/v1/platform/master-data/items/${deletingItem.id}`);
      toast.success('Item deleted');
      setDeletingItem(null);
      loadItems(selectedCategory.id, itemsPage, itemsSearch);
    } catch { toast.error('Failed to delete item'); }
  };

  const handleItemsSearch = (value: string) => {
    setItemsSearch(value);
    if (selectedCategory) {
      setItemsPage(1);
      loadItems(selectedCategory.id, 1, value);
    }
  };

  const handleItemsPage = (page: number) => {
    setItemsPage(page);
    if (selectedCategory) loadItems(selectedCategory.id, page, itemsSearch);
  };

  const toggleItemActive = async (item: MasterDataItem) => {
    try {
      await api.put(`/api/v1/platform/master-data/items/${item.id}`, { isActive: !item.isActive });
      toast.success(`Item ${item.isActive ? 'deactivated' : 'activated'}`);
      if (selectedCategory) loadItems(selectedCategory.id, itemsPage, itemsSearch);
    } catch { toast.error('Failed to update item'); }
  };

  const itemColumns: DataTableColumn<MasterDataItem>[] = [
    {
      key: 'code',
      header: 'Code',
      cell: (item) => <span className="font-mono text-xs">{item.code}</span>,
    },
    {
      key: 'displayName',
      header: 'Display Name',
      cell: (item) => (
        <div className="flex items-center gap-2">
          {item.color && <span className="h-3 w-3 shrink-0 rounded-full border" style={{ background: item.color }} />}
          <span className="font-medium">{item.displayName || item.name}</span>
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      hideOnMobile: true,
      cell: (item) => <span className="text-muted-foreground text-xs">{item.description || '—'}</span>,
    },
    {
      key: 'isActive',
      header: 'Active',
      cell: (item) => (
        <Switch
          checked={item.isActive}
          onCheckedChange={() => toggleItemActive(item)}
          aria-label={`Toggle active for ${item.code}`}
        />
      ),
    },
    {
      key: 'sortOrder',
      header: 'Sort',
      hideOnMobile: true,
      cell: (item) => <span className="tabular-nums text-muted-foreground text-xs">{item.sortOrder}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (item) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openItemEdit(item)} title="Edit">
            <Pencil className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeletingItem(item)} title="Delete">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Master Data" subtitle={`${categories.length} categories · Configure lookup data for all tenants`} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base"><Layers className="h-4 w-4" />Categories</CardTitle>
            <Button size="sm" onClick={openCatCreate}><Plus className="h-3 w-3 mr-1" />Add</Button>
          </CardHeader>

          <div className="px-4 pb-2 flex flex-wrap gap-1">
            <button
              onClick={() => setModuleFilter(ALL_MODULES)}
              className={cn('rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors', moduleFilter === ALL_MODULES ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}
            >
              All ({categories.length})
            </button>
            {MODULES.map((mod) => {
              const count = moduleCounts[mod] || 0;
              if (count === 0) return null;
              return (
                <button
                  key={mod}
                  onClick={() => setModuleFilter(mod)}
                  className={cn('rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors', moduleFilter === mod ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}
                >
                  {mod} ({count})
                </button>
              );
            })}
          </div>

          <CardContent className="space-y-1 max-h-[600px] overflow-y-auto">
            {loading && <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>}
            {!loading && filteredCategories.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">No categories in this module.</div>}
            {filteredCategories.map((cat) => (
              <div
                key={cat.id}
                onClick={() => selectCategory(cat)}
                className={cn('flex items-center justify-between rounded-lg px-3 py-2 cursor-pointer transition-colors', selectedCategory?.id === cat.id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted')}
              >
                <div className="min-w-0">
                  <p className="text-sm truncate">{cat.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{cat.code} {cat.module ? `· ${cat.module}` : ''}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  {cat._count && <span className="text-[10px] text-muted-foreground tabular-nums">{cat._count.items}</span>}
                  {cat.isSystem && <Badge variant="secondary" className="text-[10px]">system</Badge>}
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); openCatEdit(cat); }}><Pencil className="h-3 w-3" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={e => { e.stopPropagation(); setDeletingCat(cat); }}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4" />
              {selectedCategory ? <>{selectedCategory.name} <span className="text-muted-foreground text-sm font-normal">· {itemsMeta.total} items</span></> : 'Select a category'}
            </CardTitle>
            {selectedCategory && <Button size="sm" onClick={openItemCreate}><Plus className="h-3 w-3 mr-1" />Add Item</Button>}
          </CardHeader>
          <CardContent className="space-y-3">
            {!selectedCategory && <p className="text-sm text-muted-foreground py-8 text-center">Select a category from the left to manage its items.</p>}

            {selectedCategory && (
              <>
                <TableToolbar
                  search={itemsSearch}
                  onSearchChange={handleItemsSearch}
                  searchPlaceholder="Search items..."
                  hasActiveFilters={itemsSearch !== ''}
                  onReset={() => handleItemsSearch('')}
                />
                <DataTable
                  columns={itemColumns}
                  data={items}
                  rowKey={(item) => item.id}
                  loading={itemsLoading}
                  emptyTitle="No items found"
                  emptyDescription={itemsSearch ? 'Try adjusting your search.' : 'Click Add Item to create the first item.'}
                  emptyAction={!itemsSearch ? <Button size="sm" variant="outline" onClick={openItemCreate}><Plus className="mr-2 h-4 w-4" />Add Item</Button> : undefined}
                />
                {!itemsLoading && items.length > 0 && (
                  <Pagination
                    page={itemsPage}
                    totalPages={itemsMeta.totalPages}
                    total={itemsMeta.total}
                    limit={PAGE_SIZE}
                    onPageChange={handleItemsPage}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={catDialog} onOpenChange={setCatDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingCat ? 'Edit Category' : 'New Category'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</Label><Input value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} placeholder="Lead Status" /></div>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Code</Label><Input value={catForm.code} onChange={e => setCatForm({ ...catForm, code: e.target.value })} placeholder="LEAD_STATUS" /></div>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Module</Label><Input value={catForm.module} onChange={e => setCatForm({ ...catForm, module: e.target.value })} placeholder="CRM" /></div>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</Label><Input value={catForm.description} onChange={e => setCatForm({ ...catForm, description: e.target.value })} placeholder="Status values for leads" /></div>
          </div>
          <DialogFooter><Button onClick={saveCategory}>{editingCat ? 'Update' : 'Create'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={itemDialog} onOpenChange={setItemDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingItem ? 'Edit Item' : 'New Item'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</Label><Input value={itemForm.name} onChange={e => setItemForm({ ...itemForm, name: e.target.value })} placeholder="New" /></div>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Code</Label><Input value={itemForm.code} onChange={e => setItemForm({ ...itemForm, code: e.target.value })} placeholder="NEW" /></div>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Display Name</Label><Input value={itemForm.displayName} onChange={e => setItemForm({ ...itemForm, displayName: e.target.value })} placeholder="New Lead" /></div>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Color</Label><div className="flex items-center gap-2"><Input value={itemForm.color} onChange={e => setItemForm({ ...itemForm, color: e.target.value })} placeholder="#3B82F6" className="flex-1" /><input type="color" value={itemForm.color || '#000000'} onChange={e => setItemForm({ ...itemForm, color: e.target.value })} className="h-9 w-9 rounded border cursor-pointer" /></div></div>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</Label><Input value={itemForm.description} onChange={e => setItemForm({ ...itemForm, description: e.target.value })} placeholder="A new lead in the pipeline" /></div>
            <div className="flex items-center justify-between"><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active</Label><Switch checked={itemForm.isActive} onCheckedChange={v => setItemForm({ ...itemForm, isActive: v })} /></div>
          </div>
          <DialogFooter><Button onClick={saveItem}>{editingItem ? 'Update' : 'Create'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deletingCat} onOpenChange={(o) => !o && setDeletingCat(null)} title="Delete category?" description={`This will delete "${deletingCat?.name}" and all its items. This action cannot be undone.`} confirmLabel="Delete" onConfirm={deleteCategory} />

      <ConfirmDialog open={!!deletingItem} onOpenChange={(o) => !o && setDeletingItem(null)} title="Delete item?" description={`This will delete "${deletingItem?.displayName || deletingItem?.name}". This action cannot be undone.`} confirmLabel="Delete" onConfirm={deleteItem} />
    </div>
  );
}
