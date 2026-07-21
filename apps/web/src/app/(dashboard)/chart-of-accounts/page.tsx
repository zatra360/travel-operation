'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, BookOpen } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { humanizeStatus } from '@/lib/status';
import { GLAccountInfo } from '@/lib/accounting';

const TYPES = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'COGS', 'EXPENSE', 'OTHER_INCOME', 'OTHER_EXPENSE'];
const BALANCES = ['DEBIT', 'CREDIT'];
const CONTROLS = ['ACCOUNTS_RECEIVABLE', 'ACCOUNTS_PAYABLE', 'INVENTORY', 'CASH', 'BANK', 'TAX_PAYABLE', 'TAX_RECEIVABLE', 'PAYROLL_PAYABLE', 'PETTY_CASH', 'RETAINED_EARNINGS'];

export default function ChartOfAccountsPage() {
  const { activeTenant } = useAuthStore();
  const [accounts, setAccounts] = useState<GLAccountInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<GLAccountInfo | null>(null);
  const [seeding, setSeeding] = useState(false);

  const load = useCallback(() => {
    if (!activeTenant) return;
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (typeFilter) params.set('accountType', typeFilter);
    api.get<GLAccountInfo[]>(`/api/v1/tenant/accounting/accounts?${params.toString()}`, { tenantId: activeTenant.id })
      .then(setAccounts)
      .catch((err) => toast.error(err.message || 'Failed to load chart of accounts'))
      .finally(() => setLoading(false));
  }, [activeTenant, search, typeFilter]);

  useEffect(() => { load(); }, [load]);

  const seed = async () => {
    setSeeding(true);
    try {
      await api.post('/api/v1/tenant/accounting/accounts/seed-defaults', {}, { tenantId: activeTenant!.id });
      toast.success('Chart of accounts seeded');
      load();
    } catch (err: any) { toast.error(err.message); } finally { setSeeding(false); }
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-72" /></div>;

  const typeVariant: Record<string, string> = { ASSET: 'default', LIABILITY: 'warning', EQUITY: 'default', REVENUE: 'success', COGS: 'destructive', EXPENSE: 'destructive', OTHER_INCOME: 'success', OTHER_EXPENSE: 'destructive' };

  return (
    <div className="space-y-5">
      <PageHeader title="Chart of Accounts" subtitle="General ledger account structure for double-entry posting" actions={
        <div className="flex gap-2">
          {accounts.length === 0 && <Button size="sm" variant="outline" onClick={seed} disabled={seeding}>{seeding ? 'Seeding…' : 'Seed defaults'}</Button>}
          <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="mr-2 h-4 w-4" />Add Account</Button>
        </div>
      } />

      <div className="flex flex-wrap gap-2">
        <Input className="w-64" placeholder="Search code or name…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select value={typeFilter || '__all__'} onValueChange={(v) => setTypeFilter(v === '__all__' ? '' : v)}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All types</SelectItem>
            {TYPES.map((t) => <SelectItem key={t} value={t}>{humanizeStatus(t)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4" />Accounts ({accounts.length})</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          {accounts.length === 0 ? <p className="py-4 text-sm text-muted-foreground">No accounts exist. Seed defaults or add manually.</p> : (
            accounts.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-xs tabular-nums font-semibold">{a.accountCode}</span>
                  <span className="truncate font-medium">{a.accountName}</span>
                  <Badge variant={(typeVariant[a.accountType] as any) || 'secondary'} className="text-[10px]">{humanizeStatus(a.accountType)}</Badge>
                  {a.controlAccountType && <Badge variant="warning" className="text-[10px]">{humanizeStatus(a.controlAccountType)}</Badge>}
                  {!a.isActive && <Badge variant="secondary" className="text-[10px]">Inactive</Badge>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-muted-foreground">{a.normalBalance} normal · {a.allowManualPosting ? 'Manual' : 'Control'}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing({ ...a, accountCode: a.accountCode }); setFormOpen(true); }}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <AccountFormDialog open={formOpen} onOpenChange={setFormOpen} account={editing} onSaved={load} typeFilter={typeFilter} />
    </div>
  );
}

function AccountFormDialog({ open, onOpenChange, account, onSaved, typeFilter }: { open: boolean; onOpenChange: (o: boolean) => void; account: GLAccountInfo | null; onSaved: () => void; typeFilter: string; }) {
  const { activeTenant } = useAuthStore();
  const isEdit = !!account;
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('EXPENSE');
  const [balance, setBalance] = useState('DEBIT');
  const [control, setControl] = useState('');
  const [manual, setManual] = useState(true);
  const [desc, setDesc] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setCode(account?.accountCode ?? '');
      setName(account?.accountName ?? '');
      setType(account?.accountType ?? (typeFilter && TYPES.includes(typeFilter) ? typeFilter : 'EXPENSE'));
      setBalance(account?.normalBalance ?? 'DEBIT');
      setControl(account?.controlAccountType ?? '');
      setManual(account?.allowManualPosting ?? true);
      setDesc(account?.description ?? '');
    }
  }, [open, account, typeFilter]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant) return;
    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/api/v1/tenant/accounting/accounts/${account!.id}`, {
          accountName: name, description: desc || undefined, isActive: account!.isActive,
          controlAccountType: control || undefined, allowManualPosting: manual,
        }, { tenantId: activeTenant.id });
        toast.success('Account updated');
      } else {
        await api.post('/api/v1/tenant/accounting/accounts', {
          accountCode: code, accountName: name, accountType: type, normalBalance: balance,
          controlAccountType: control || undefined, allowManualPosting: control ? manual : true,
          description: desc || undefined,
        }, { tenantId: activeTenant.id });
        toast.success('Account created');
      }
      onOpenChange(false);
      onSaved();
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Account' : 'New GL Account'}</DialogTitle>
          <DialogDescription>{isEdit ? 'Non-financial attributes only.' : 'Add a general ledger account into the chart.'}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Code{!isEdit && <span className="text-destructive">*</span>}</Label><Input disabled={isEdit} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required /></div>
          <div className="space-y-2"><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name{!isEdit && <span className="text-destructive">*</span>}</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
          {!isEdit && <><div className="space-y-2"><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</Label><Select value={type} onValueChange={setType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{humanizeStatus(t)}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Normal balance</Label><Select value={balance} onValueChange={setBalance}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{BALANCES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent></Select></div></>}
          <div className="space-y-2"><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Control type</Label><Select value={control || '__none__'} onValueChange={(v) => setControl(v === '__none__' ? '' : v)}><SelectTrigger><SelectValue placeholder="None" /></SelectTrigger><SelectContent><SelectItem value="__none__">None</SelectItem>{CONTROLS.map((c) => <SelectItem key={c} value={c}>{humanizeStatus(c)}</SelectItem>)}</SelectContent></Select></div>
          <div className="flex items-center gap-3 rounded-lg border p-3 pt-8">
            <Switch checked={manual} onCheckedChange={setManual} />
            <div><span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Allow manual posting</span><p className="text-[10px] text-muted-foreground">Control accounts should normally block manual journal entries</p></div>
          </div>
          <div className="col-span-2 space-y-2"><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</Label><Input value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
          <DialogFooter className="col-span-2"><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create account'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
