'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Building2, Plus, Pencil, Trash2, Landmark, Wallet, ArrowDown, ArrowUp } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatMoney } from '@/lib/utils';
import { toast } from 'sonner';

export default function BankingPage() {
  const { activeTenant } = useAuthStore();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [registers, setRegisters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [type, setType] = useState<'account' | 'register'>('account');
  const [form, setForm] = useState<any>({});
  const [deleting, setDeleting] = useState<{ id: string; type: 'account' | 'register' } | null>(null);

  const load = () => {
    if (!activeTenant) return;
    setLoading(true);
    Promise.all([
      api.get('/api/v1/tenant/banking/accounts', { tenantId: activeTenant.id }),
      api.get('/api/v1/tenant/banking/registers', { tenantId: activeTenant.id }),
    ]).then(([a, r]: any[]) => { setAccounts(a); setRegisters(r); }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [activeTenant]);

  const openCreate = (t: 'account' | 'register') => {
    setType(t); setEditing(null);
    if (t === 'account') setForm({ bankName: '', accountName: '', accountNumber: '', routingNumber: '', swiftCode: '', currencyCode: 'USD', openingBalance: 0, notes: '' });
    else setForm({ name: '', currencyCode: 'USD', openingBalance: 0, notes: '' });
    setDialog(true);
  };

  const openEdit = (item: any, t: 'account' | 'register') => {
    setType(t); setEditing(item);
    if (t === 'account') setForm({ bankName: item.bankName, accountName: item.accountName, accountNumber: item.accountNumber, routingNumber: item.routingNumber || '', swiftCode: item.swiftCode || '', currencyCode: item.currencyCode, openingBalance: Number(item.openingBalance), currentBalance: Number(item.currentBalance), notes: item.notes || '' });
    else setForm({ name: item.name, currencyCode: item.currencyCode, openingBalance: Number(item.openingBalance), currentBalance: Number(item.currentBalance), notes: item.notes || '' });
    setDialog(true);
  };

  const save = async () => {
    if (!activeTenant) return;
    const endpoint = type === 'account' ? 'accounts' : 'registers';
    try {
      if (editing) await api.put(`/api/v1/tenant/banking/${endpoint}/${editing.id}`, form, { tenantId: activeTenant.id });
      else await api.post(`/api/v1/tenant/banking/${endpoint}`, form, { tenantId: activeTenant.id });
      toast.success(editing ? 'Updated' : 'Created');
      setDialog(false); load();
    } catch { toast.error('Failed'); }
  };

  const remove = async () => {
    if (!activeTenant || !deleting) return;
    const endpoint = deleting.type === 'account' ? 'accounts' : 'registers';
    await api.delete(`/api/v1/tenant/banking/${endpoint}/${deleting.id}`, { tenantId: activeTenant.id });
    toast.success('Deleted');
    setDeleting(null);
    load();
  };

  const [cashDialog, setCashDialog] = useState(false);
  const [cashRegId, setCashRegId] = useState('');
  const [cashMode, setCashMode] = useState<'deposit' | 'withdraw'>('deposit');
  const [cashAmount, setCashAmount] = useState('');
  const [cashNotes, setCashNotes] = useState('');

  const openCashMovement = (regId: string, mode: 'deposit' | 'withdraw') => {
    setCashRegId(regId); setCashMode(mode); setCashAmount(''); setCashNotes(''); setCashDialog(true);
  };

  const executeCashMovement = async () => {
    if (!activeTenant || !cashAmount || Number(cashAmount) <= 0) return;
    const endpoint = cashMode === 'deposit' ? 'deposit' : 'withdraw';
    try {
      await api.post(`/api/v1/tenant/banking/registers/${cashRegId}/${endpoint}`, { amount: Number(cashAmount), notes: cashNotes }, { tenantId: activeTenant.id });
      toast.success(`${cashMode === 'deposit' ? 'Deposited' : 'Withdrew'} $${Number(cashAmount).toFixed(2)}`);
      setCashDialog(false); load();
    } catch (err: any) { toast.error(err.message || 'Failed'); }
  };

  const totalBankBalance = accounts.filter(a => a.isActive !== false).reduce((s: number, a: any) => s + Number(a.currentBalance), 0);
  const totalCashBalance = registers.filter(r => r.isActive !== false).reduce((s: number, r: any) => s + Number(r.currentBalance), 0);

  if (loading) return <Skeleton className="h-96" />;

  return (
    <div className="space-y-6">
      <PageHeader title="Bank & Cash" subtitle={`${accounts.length} bank accounts · ${registers.length} cash registers`} />

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="py-4 flex items-center gap-3"><Landmark className="h-8 w-8 text-primary/60" /><div><p className="text-xs text-muted-foreground">Bank Balance</p><p className="text-xl font-bold">{formatMoney(totalBankBalance, 'USD')}</p></div></CardContent></Card>
        <Card><CardContent className="py-4 flex items-center gap-3"><Wallet className="h-8 w-8 text-warning/60" /><div><p className="text-xs text-muted-foreground">Cash Balance</p><p className="text-xl font-bold">{formatMoney(totalCashBalance, 'USD')}</p></div></CardContent></Card>
        <Card><CardContent className="py-4 flex items-center gap-3"><Building2 className="h-8 w-8 text-success/60" /><div><p className="text-xs text-muted-foreground">Total</p><p className="text-xl font-bold">{formatMoney(totalBankBalance + totalCashBalance, 'USD')}</p></div></CardContent></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="flex items-center gap-2"><Landmark className="h-4 w-4" />Bank Accounts</CardTitle><Button size="sm" onClick={() => openCreate('account')}><Plus className="h-3 w-3 mr-1" />Add</Button></CardHeader>
          <CardContent className="space-y-2">
            {accounts.map(a => (
              <div key={a.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                <div>
                  <p className="text-sm font-medium">{a.bankName}</p>
                  <p className="text-xs text-muted-foreground">{a.accountName} · {a.accountNumber}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right"><p className="text-sm font-medium">{formatMoney(Number(a.currentBalance), a.currencyCode)}</p><Badge variant={a.isActive ? 'success' : 'secondary'} className="text-[10px]">{a.isActive ? 'active' : 'inactive'}</Badge></div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(a, 'account')}><Pencil className="h-3 w-3" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleting({ id: a.id, type: 'account' })}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
            ))}
            {accounts.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No bank accounts.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="flex items-center gap-2"><Wallet className="h-4 w-4" />Cash Registers</CardTitle><Button size="sm" onClick={() => openCreate('register')}><Plus className="h-3 w-3 mr-1" />Add</Button></CardHeader>
          <CardContent className="space-y-2">
            {registers.map(r => (
              <div key={r.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                <div>
                  <p className="text-sm font-medium">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{r.currencyCode}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right"><p className="text-sm font-medium">{formatMoney(Number(r.currentBalance), r.currencyCode)}</p><Badge variant={r.isActive ? 'success' : 'secondary'} className="text-[10px]">{r.isActive ? 'active' : 'inactive'}</Badge></div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-success" onClick={() => openCashMovement(r.id, 'deposit')} title="Deposit"><ArrowDown className="h-3 w-3" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => openCashMovement(r.id, 'withdraw')} title="Withdraw"><ArrowUp className="h-3 w-3" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r, 'register')}><Pencil className="h-3 w-3" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleting({ id: r.id, type: 'register' })}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
            ))}
            {registers.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No cash registers.</p>}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit' : 'New'} {type === 'account' ? 'Bank Account' : 'Cash Register'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {type === 'account' ? (<>
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bank Name *</Label><Input value={form.bankName} onChange={e => setForm({ ...form, bankName: e.target.value })} /></div>
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Account Name *</Label><Input value={form.accountName} onChange={e => setForm({ ...form, accountName: e.target.value })} /></div>
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Account Number *</Label><Input value={form.accountNumber} onChange={e => setForm({ ...form, accountNumber: e.target.value })} /></div>
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Routing Number</Label><Input value={form.routingNumber} onChange={e => setForm({ ...form, routingNumber: e.target.value })} /></div>
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">SWIFT</Label><Input value={form.swiftCode} onChange={e => setForm({ ...form, swiftCode: e.target.value })} /></div>
            </>) : (<>
              <div className="col-span-2"><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            </>)}
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Currency</Label><Input value={form.currencyCode} onChange={e => setForm({ ...form, currencyCode: e.target.value })} /></div>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{editing ? 'Current Balance' : 'Opening Balance'}</Label><Input type="number" value={editing ? form.currentBalance : form.openingBalance} onChange={e => setForm({ ...form, [editing ? 'currentBalance' : 'openingBalance']: Number(e.target.value) })} /></div>
            <div className="col-span-2"><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={save}>{editing ? 'Update' : 'Create'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cashDialog} onOpenChange={setCashDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{cashMode === 'deposit' ? 'Deposit' : 'Withdraw'} Cash</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Amount</Label><Input type="number" value={cashAmount} onChange={e => setCashAmount(e.target.value)} placeholder="0.00" /></div>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</Label><Input value={cashNotes} onChange={e => setCashNotes(e.target.value)} placeholder="Reason…" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCashDialog(false)}>Cancel</Button>
            <Button variant={cashMode === 'deposit' ? 'default' : 'destructive'} onClick={executeCashMovement}>{cashMode === 'deposit' ? 'Deposit' : 'Withdraw'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleting} onOpenChange={o => !o && setDeleting(null)} title={`Delete ${deleting?.type}?`} description="This action cannot be undone." confirmLabel="Delete" onConfirm={remove} />
    </div>
  );
}
