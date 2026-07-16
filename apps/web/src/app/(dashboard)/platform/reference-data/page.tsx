'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/page-header';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Combobox } from '@/components/ui/select';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { TableToolbar } from '@/components/ui/table-toolbar';
import { Pagination } from '@/components/ui/pagination';
import { Globe, Plane, Building2, Coins, Armchair, Users, Plus, Pencil, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useCountries } from '@/lib/use-ref-data';
type TabType = 'countries' | 'airlines' | 'airports' | 'aircraft-types' | 'airline-alliances' | 'airport-terminals' | 'currencies' | 'cabin-classes' | 'nationalities';

const TABS: { key: TabType; label: string; icon: typeof Globe }[] = [
  { key: 'countries', label: 'Countries', icon: Globe },
  { key: 'airlines', label: 'Airlines', icon: Plane },
  { key: 'airports', label: 'Airports', icon: Building2 },
  { key: 'aircraft-types', label: 'Aircraft Types', icon: Plane },
  { key: 'airline-alliances', label: 'Alliances', icon: Globe },
  { key: 'currencies', label: 'Currencies', icon: Coins },
  { key: 'nationalities', label: 'Nationalities', icon: Users },
  { key: 'cabin-classes', label: 'Cabin Classes', icon: Armchair },
];

const PAGE_SIZE = 25;

export default function ReferenceDataPage() {
  const [tab, setTab] = useState<TabType>('countries');
  const [data, setData] = useState<any[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});

  const apiPath = `/api/v1/master-data/reference/${tab}`;
  const platformPath = `/api/v1/platform/reference-data/${tab}`;
  const { options: countryOpts } = useCountries();

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (search) params.set('search', search);
    api.get<any>(`${apiPath}?${params.toString()}`)
      .then((res) => { setData(res.data); setMeta({ page: res.page, totalPages: res.totalPages, total: res.total }); })
      .catch(() => toast.error(`Failed to load ${tab}`))
      .finally(() => setLoading(false));
  }, [tab, search, page, apiPath]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, tab]);

  const openCreate = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (item: any) => { setEditing(item); setDialogOpen(true); };

  const saveRecord = async () => {
    setSaving(true);
    try {
      if (editing) { await api.put(`${platformPath}/${editing.id}`, form); toast.success('Updated'); }
      else { await api.post(platformPath, form); toast.success('Created'); }
      setDialogOpen(false); load();
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try { await api.delete(`${platformPath}/${deleting.id}`); toast.success('Deactivated'); setDeleting(null); load(); }
    catch { toast.error('Failed to delete'); }
  };

  const toggleActive = async (item: any) => {
    try { await api.put(`${platformPath}/${item.id}`, { isActive: !item.isActive }); toast.success(item.isActive ? 'Deactivated' : 'Activated'); load(); }
    catch { toast.error('Failed to update'); }
  };

  const cols = (): DataTableColumn<any>[] => {
    const shared: DataTableColumn<any>[] = [
      { key: 'isActive', header: 'Active', cell: (r) => <Switch checked={r.isActive} onCheckedChange={() => toggleActive(r)} /> },
      { key: 'actions', header: '', align: 'right', cell: (r) => (<div className="flex gap-1"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}><Pencil className="h-3 w-3" /></Button><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleting(r)}><Trash2 className="h-3 w-3" /></Button></div>) },
    ];
    switch (tab) {
      case 'countries': return [
        { key: 'name', header: 'Country', cell: (c) => <span className="font-medium">{c.name}</span> },
        { key: 'iso2', header: 'ISO2', cell: (c) => <span className="font-mono text-xs font-semibold bg-muted px-1.5 py-0.5 rounded">{c.iso2}</span> },
        { key: 'continent', header: 'Continent', hideOnMobile: true, cell: (c) => <span className="text-muted-foreground text-xs">{c.continent || '—'}</span> },
        { key: 'currencyCode', header: 'Currency', hideOnMobile: true, cell: (c) => <span className="font-mono text-xs text-muted-foreground">{c.currencyCode || '—'}</span> },
        ...shared,
      ];
      case 'airlines': return [
        { key: 'name', header: 'Airline', cell: (a) => <span className="font-medium">{a.name}</span> },
        { key: 'iataCode', header: 'IATA', cell: (a) => <span className="font-mono text-xs font-semibold bg-muted px-1.5 py-0.5 rounded">{a.iataCode}</span> },
        { key: 'country', header: 'Country', hideOnMobile: true, cell: (a) => <span className="text-muted-foreground text-xs">{a.country?.name || '—'}</span> },
        ...shared,
      ];
      case 'airports': return [
        { key: 'name', header: 'Airport', cell: (a) => <span className="font-medium">{a.name}</span> },
        { key: 'iataCode', header: 'IATA', cell: (a) => <span className="font-mono text-xs font-semibold bg-muted px-1.5 py-0.5 rounded">{a.iataCode}</span> },
        { key: 'city', header: 'City', cell: (a) => <span className="text-muted-foreground text-xs">{a.city}</span> },
        { key: 'country', header: 'Country', hideOnMobile: true, cell: (a) => <span className="text-muted-foreground text-xs">{a.country?.name || '—'}</span> },
        ...shared,
      ];
      case 'currencies': return [
        { key: 'name', header: 'Currency', cell: (c) => <span className="font-medium">{c.name}</span> },
        { key: 'code', header: 'Code', cell: (c) => <span className="font-mono text-xs font-semibold bg-muted px-1.5 py-0.5 rounded">{c.code}</span> },
        { key: 'symbol', header: 'Symbol', cell: (c) => <span className="text-base">{c.symbol}</span> },
        { key: 'decimalPlaces', header: 'Dec.', hideOnMobile: true, cell: (c) => <span className="text-muted-foreground tabular-nums">{c.decimalPlaces}</span> },
        ...shared,
      ];
      case 'nationalities': return [
        { key: 'name', header: 'Nationality', cell: (n) => <span className="font-medium">{n.name}</span> },
        { key: 'country', header: 'Country', cell: (n) => <span className="text-muted-foreground text-xs">{n.country?.name || '—'}</span> },
        ...shared,
      ];
      case 'cabin-classes': return [
        { key: 'name', header: 'Class', cell: (c) => <span className="font-medium">{c.name}</span> },
        { key: 'code', header: 'Code', cell: (c) => <span className="font-mono text-xs font-semibold bg-muted px-1.5 py-0.5 rounded">{c.code}</span> },
        { key: 'sortOrder', header: 'Order', hideOnMobile: true, cell: (c) => <span className="text-muted-foreground tabular-nums">{c.sortOrder}</span> },
        ...shared,
      ];
      case 'aircraft-types': return [
        { key: 'name', header: 'Aircraft', cell: (a) => <span className="font-medium">{a.name}</span> },
        { key: 'iataCode', header: 'IATA', cell: (a) => <span className="font-mono text-xs font-semibold bg-muted px-1.5 py-0.5 rounded">{a.iataCode}</span> },
        { key: 'category', header: 'Category', hideOnMobile: true, cell: (a) => <span className="text-muted-foreground text-xs">{a.category || '—'}</span> },
        ...shared,
      ];
      case 'airline-alliances': return [
        { key: 'name', header: 'Alliance', cell: (a) => <span className="font-medium">{a.name}</span> },
        { key: 'code', header: 'Code', cell: (a) => <span className="font-mono text-xs">{a.code}</span> },
        ...shared,
      ];
      case 'airport-terminals': return [
        { key: 'name', header: 'Terminal', cell: (t) => <span className="font-medium">{t.name}</span> },
        { key: 'code', header: 'Code', cell: (t) => <span className="font-mono text-xs font-semibold bg-muted px-1.5 py-0.5 rounded">{t.code}</span> },
        { key: 'airport', header: 'Airport', hideOnMobile: true, cell: (t) => <span className="text-muted-foreground text-xs">{t.airport?.iataCode} - {t.airport?.name}</span> },
        ...shared,
      ];
      default: return [];
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Reference Data" subtitle={`${meta.total} records · Platform-wide travel reference data`} />

      <div className="flex items-center gap-1 border-b pb-0.5 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn('flex items-center gap-1.5 rounded-t-md px-3.5 py-2 text-sm font-medium transition-colors border-b-2 -mb-0.5 whitespace-nowrap',
              tab === t.key ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted')}>
            <t.icon className="h-3.5 w-3.5" />{t.label}
          </button>
        ))}
      </div>

      <TableToolbar search={search} onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder={`Search ${tab}...`} hasActiveFilters={search !== ''} onReset={() => setSearch('')}
        actions={<Button size="sm" onClick={openCreate}><Plus className="h-3 w-3 mr-1" />Add</Button>}
      />

      <DataTable columns={cols()} data={data} rowKey={(item) => item.id} loading={loading}
        emptyTitle={search ? 'No matches' : `No ${tab} yet`}
        emptyDescription={search ? 'Try a different search.' : 'Click Add to create one.'}
      />

      {!loading && data.length > 0 && (
        <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} limit={PAGE_SIZE} onPageChange={setPage} />
      )}

      <RefFormDialog open={dialogOpen} onOpenChange={setDialogOpen} tab={tab} editing={editing} saving={saving} onSave={saveRecord}
        form={form} setForm={setForm} countryOpts={countryOpts} />

      <ConfirmDialog open={!!deleting} onOpenChange={o => !o && setDeleting(null)}
        title={`Deactivate ${tab.slice(0, -1)}?`} description={`Deactivate "${deleting?.name || deleting?.iataCode}"?`}
        confirmLabel="Deactivate" onConfirm={handleDelete} />
    </div>
  );
}

function RefFormDialog({ open, onOpenChange, tab, editing, saving, onSave, form, setForm, countryOpts }: {
  open: boolean; onOpenChange: (o: boolean) => void; tab: TabType; editing: any; saving: boolean; onSave: () => void;
  form: Record<string, any>; setForm: (f: Record<string, any>) => void; countryOpts: { value: string; label: string }[];
}) {
  useEffect(() => {
    if (editing) { setForm({ ...editing }); } else {
      switch (tab) {
        case 'countries': setForm({ name: '', iso2: '', iso3: '', dialCode: '', currencyCode: '', continent: '' }); break;
        case 'airlines': setForm({ name: '', iataCode: '', icaoCode: '', countryId: '' }); break;
        case 'airports': setForm({ name: '', iataCode: '', city: '', countryId: '', timezone: '' }); break;
        case 'currencies': setForm({ name: '', code: '', symbol: '', decimalPlaces: 2 }); break;
        case 'cabin-classes': setForm({ name: '', code: '', sortOrder: 0 }); break;
        case 'nationalities': setForm({ name: '', countryId: '' }); break;
      }
    }
  }, [editing, tab, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? 'Edit' : 'Add'} {tab.slice(0, -1)}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {tab === 'countries' && (<>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</Label><Input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Bangladesh" className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">ISO2</Label><Input value={form.iso2 || ''} onChange={e => setForm({ ...form, iso2: e.target.value })} placeholder="BD" maxLength={2} className="mt-1" /></div>
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">ISO3</Label><Input value={form.iso3 || ''} onChange={e => setForm({ ...form, iso3: e.target.value })} placeholder="BGD" maxLength={3} className="mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dial Code</Label><Input value={form.dialCode || ''} onChange={e => setForm({ ...form, dialCode: e.target.value })} placeholder="+880" className="mt-1" /></div>
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Currency</Label><Input value={form.currencyCode || ''} onChange={e => setForm({ ...form, currencyCode: e.target.value })} placeholder="BDT" className="mt-1" /></div>
            </div>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Continent</Label><Input value={form.continent || ''} onChange={e => setForm({ ...form, continent: e.target.value })} placeholder="Asia" className="mt-1" /></div>
          </>)}
          {tab === 'airlines' && (<>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</Label><Input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Emirates" className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">IATA Code</Label><Input value={form.iataCode || ''} onChange={e => setForm({ ...form, iataCode: e.target.value })} placeholder="EK" maxLength={2} className="mt-1" /></div>
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">ICAO Code</Label><Input value={form.icaoCode || ''} onChange={e => setForm({ ...form, icaoCode: e.target.value })} placeholder="UAE" maxLength={3} className="mt-1" /></div>
            </div>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Country</Label><Combobox options={countryOpts} value={form.countryId || ''} onChange={v => setForm({ ...form, countryId: v })} placeholder="Select country" searchPlaceholder="Search..." className="mt-1" /></div>
          </>)}
          {tab === 'airports' && (<>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</Label><Input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Dubai International Airport" className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">IATA Code</Label><Input value={form.iataCode || ''} onChange={e => setForm({ ...form, iataCode: e.target.value })} placeholder="DXB" maxLength={3} className="mt-1" /></div>
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">City</Label><Input value={form.city || ''} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="Dubai" className="mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Country</Label><Combobox options={countryOpts} value={form.countryId || ''} onChange={v => setForm({ ...form, countryId: v })} placeholder="Select country" searchPlaceholder="Search..." className="mt-1" /></div>
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Timezone</Label><Input value={form.timezone || ''} onChange={e => setForm({ ...form, timezone: e.target.value })} placeholder="Asia/Dubai" className="mt-1" /></div>
            </div>
          </>)}
          {tab === 'currencies' && (<>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</Label><Input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="US Dollar" className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Code</Label><Input value={form.code || ''} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="USD" maxLength={3} className="mt-1" /></div>
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Symbol</Label><Input value={form.symbol || ''} onChange={e => setForm({ ...form, symbol: e.target.value })} placeholder="$" className="mt-1" /></div>
            </div>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Decimal Places</Label><Input type="number" value={form.decimalPlaces ?? ''} onChange={e => setForm({ ...form, decimalPlaces: Number(e.target.value) })} placeholder="2" className="mt-1" /></div>
          </>)}
          {tab === 'cabin-classes' && (<>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</Label><Input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Economy Class" className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Code</Label><Input value={form.code || ''} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="Y" maxLength={1} className="mt-1" /></div>
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sort Order</Label><Input type="number" value={form.sortOrder ?? ''} onChange={e => setForm({ ...form, sortOrder: Number(e.target.value) })} placeholder="4" className="mt-1" /></div>
            </div>
          </>)}
          {tab === 'nationalities' && (<>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</Label><Input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Bangladeshi" className="mt-1" /></div>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Country</Label><Combobox options={countryOpts} value={form.countryId || ''} onChange={v => setForm({ ...form, countryId: v })} placeholder="Select country" searchPlaceholder="Search..." className="mt-1" /></div>
          </>)}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSave} disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
