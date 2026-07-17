'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/ui/page-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Building2, Palette, Bell, Shield, Package, DollarSign, Link2,
  GitBranch, Users, BookOpenCheck, CalendarFold, Percent, Briefcase,
  Upload, CheckCircle2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { humanizeStatus } from '@/lib/status';

const TABS = [
  { key: 'profile', label: 'Profile', icon: Building2 },
  { key: 'currencies', label: 'Currencies', icon: DollarSign },
  { key: 'modules', label: 'Modules', icon: Package },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'security', label: 'Security', icon: Shield },
  { key: 'links', label: 'Quick Links', icon: Link2 },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function SettingsPage() {
  const { activeTenant } = useAuthStore();
  const [tab, setTab] = useState<TabKey>('profile');
  const [loading, setLoading] = useState(true);

  // Profile
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [themeColor, setThemeColor] = useState('#6366f1');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);

  // Currencies
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [currencyForm, setCurrencyForm] = useState({ code: '', name: '', symbol: '', exchangeRate: '1', decimalPlaces: '2' });

  // Modules
  const [modules, setModules] = useState<Record<string, boolean>>({});
  const [moduleCategories, setModuleCategories] = useState<Array<{ category: string; keys: string[] }>>([]);

  // Notifications
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [smsNotifs, setSmsNotifs] = useState(false);

  // Security
  const [passwordMinLength, setPasswordMinLength] = useState('8');
  const [sessionTimeout, setSessionTimeout] = useState('60');
  const [require2FA, setRequire2FA] = useState(false);

  const loadAll = useCallback(() => {
    if (!activeTenant) return;
    setLoading(true);

    Promise.all([
      api.get<Record<string, any>>('/api/v1/tenant/settings', { tenantId: activeTenant.id }),
      api.get<any[]>('/api/v1/tenant/currencies', { tenantId: activeTenant.id }).catch(() => []),
    ])
      .then(([settings, cur]) => {
        const c = settings?.company || {};
        setCompanyPhone(c.companyPhone || '');
        setCompanyEmail(c.companyEmail || '');
        setWebsite(c.website || '');
        setAddress(c.address || '');

        const b = settings?.branding || {};
        setThemeColor(b.themeColor || '#6366f1');
        setLogoUrl(b.logoUrl || '');

        const m = settings?.modules || {};
        setModules(m);

        const n = settings?.notifications || {};
        setEmailNotifs(n.emailNotifications !== false);
        setSmsNotifs(n.smsNotifications === true);

        const s = settings?.security || {};
        setPasswordMinLength(String(s.passwordMinLength || 8));
        setSessionTimeout(String(s.sessionTimeout || 60));
        setRequire2FA(s.require2FA === true);

        setCurrencies(Array.isArray(cur) ? cur : (cur as any)?.data || []);
      })
      .catch((err) => toast.error(err.message || 'Failed to load settings'))
      .finally(() => setLoading(false));
  }, [activeTenant]);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    if (!activeTenant) return;
    import('@/lib/module-config').then(({ ALL_MODULES }) => {
      const cats: Array<{ category: string; keys: string[] }> = [];
      for (const m of ALL_MODULES) {
        let cat = cats.find((c) => c.category === m.category);
        if (!cat) { cat = { category: m.category, keys: [] }; cats.push(cat); }
        cat.keys.push(m.key);
      }
      setModuleCategories(cats);
    });
  }, [activeTenant]);

  const saveSection = async (key: string, value: Record<string, unknown>, label: string) => {
    if (!activeTenant) return;
    // Strip empty strings so we never persist blank values.
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (v !== '' && v !== undefined && v !== null) cleaned[k] = v;
    }
    try {
      await api.put(`/api/v1/tenant/settings/${key}`, cleaned, { tenantId: activeTenant.id });
      toast.success(`${label} saved`);
    } catch (err: any) { toast.error(err.message); }
  };

  const addCurrency = async () => {
    if (!activeTenant || !currencyForm.code || !currencyForm.name) { toast.error('Code and name required'); return; }
    try {
      await api.post('/api/v1/tenant/currencies', {
        code: currencyForm.code.toUpperCase(),
        name: currencyForm.name,
        symbol: currencyForm.symbol,
        exchangeRate: Number(currencyForm.exchangeRate),
        decimalPlaces: Number(currencyForm.decimalPlaces),
      }, { tenantId: activeTenant.id });
      toast.success('Currency added');
      setCurrencyForm({ code: '', name: '', symbol: '', exchangeRate: '1', decimalPlaces: '2' });
      loadAll();
    } catch (err: any) { toast.error(err.message); }
  };

  const setDefaultCurrency = async (id: string) => {
    if (!activeTenant) return;
    try {
      await api.put(`/api/v1/tenant/currencies/${id}`, { isDefault: true }, { tenantId: activeTenant.id });
      toast.success('Default currency updated');
      loadAll();
    } catch (err: any) { toast.error(err.message); }
  };

  const removeCurrency = async (id: string, code: string) => {
    if (!activeTenant) return;
    try {
      await api.delete(`/api/v1/tenant/currencies/${id}`, { tenantId: activeTenant.id });
      toast.success(`${code} removed`);
      loadAll();
    } catch (err: any) { toast.error(err.message); }
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-72" /></div>;

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" subtitle={`Control center for ${activeTenant?.name || 'your company'}`} />

      <div className="flex gap-1 overflow-x-auto rounded-lg border p-1 w-fit max-w-full">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                tab === t.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
      </div>

      {tab === 'profile' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" />Company Info</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone</Label>
                  <Input value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} placeholder="+880 2 1234567" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</Label>
                  <Input type="email" value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} placeholder="info@company.com" />
                </div>
                <div className="space-y-1"><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Website</Label><Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" /></div>
                <div className="space-y-1"><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Address</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} /></div>
              </div>
              <Button size="sm" onClick={() => saveSection('company', { companyPhone, companyEmail, website, address }, 'Company info')}>
                <CheckCircle2 className="mr-2 h-4 w-4" />Save Company Info
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Palette className="h-4 w-4" />Branding</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Logo URL</Label>
                  <div className="flex items-center gap-2">
                    <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://example.com/logo.png" />
                    {logoUrl && <img src={logoUrl} alt="Logo preview" className="h-8 w-8 rounded object-contain border" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
                  </div>
                  <p className="text-[10px] text-muted-foreground">Paste a direct image URL. Shown in the top bar and sidebar.</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Theme color</Label>
                  <div className="flex items-center gap-2"><Input type="color" value={themeColor} onChange={(e) => setThemeColor(e.target.value)} className="h-9 w-16 p-1" /><span className="text-sm text-muted-foreground">{themeColor}</span></div>
                </div>
                <Button size="sm" onClick={() => saveSection('branding', { themeColor, logoUrl }, 'Branding')}>Save Branding</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {tab === 'currencies' && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-4 w-4" />Currencies ({currencies.length})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1"><Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Code<span className="text-destructive">*</span></Label><Input className="w-20" value={currencyForm.code} onChange={(e) => setCurrencyForm({ ...currencyForm, code: e.target.value.toUpperCase() })} placeholder="USD" /></div>
              <div className="space-y-1"><Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Name<span className="text-destructive">*</span></Label><Input className="w-36" value={currencyForm.name} onChange={(e) => setCurrencyForm({ ...currencyForm, name: e.target.value })} placeholder="US Dollar" /></div>
              <div className="space-y-1"><Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Symbol</Label><Input className="w-16" value={currencyForm.symbol} onChange={(e) => setCurrencyForm({ ...currencyForm, symbol: e.target.value })} placeholder="$" /></div>
              <div className="space-y-1"><Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Rate</Label><Input className="w-24" type="number" min="0.0001" step="0.0001" value={currencyForm.exchangeRate} onChange={(e) => setCurrencyForm({ ...currencyForm, exchangeRate: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Decimals</Label><Input className="w-20" type="number" min={0} max={6} value={currencyForm.decimalPlaces} onChange={(e) => setCurrencyForm({ ...currencyForm, decimalPlaces: e.target.value })} /></div>
              <Button size="sm" onClick={addCurrency}>Add</Button>
            </div>
            <div className="space-y-1">
              {currencies.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <div className="flex items-center gap-3"><span className="font-bold">{c.code}</span><span className="text-muted-foreground">{c.name}</span><span className="text-xs text-muted-foreground">{c.symbol} · 1 USD = {Number(c.exchangeRate).toFixed(4)} {c.code}</span>{c.isDefault && <Badge>Default</Badge>}</div>
                  <div className="flex items-center gap-1">
                    {!c.isDefault && <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setDefaultCurrency(c.id)}>Set Default</Button>}
                    <Button variant="ghost" size="sm" className="text-xs h-7 text-destructive" onClick={() => removeCurrency(c.id, c.code)}>Remove</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {tab === 'modules' && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4" />Module Settings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {moduleCategories.map((cat) => (
              <div key={cat.category}>
                <h3 className="text-sm font-semibold mb-2">{cat.category}</h3>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {cat.keys.map((key) => (
                    <div key={key} className="flex items-center justify-between rounded-md border px-3 py-2">
                      <Label className="text-sm">{humanizeStatus(key)}</Label>
                      <Switch checked={modules[key] !== false} onCheckedChange={(v) => { setModules((m) => ({ ...m, [key]: v })); }} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <Button size="sm" onClick={() => saveSection('modules', modules, 'Module settings')}><CheckCircle2 className="mr-2 h-4 w-4" />Save Modules</Button>
          </CardContent>
        </Card>
      )}

      {tab === 'notifications' && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4" />Notification Preferences</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-md border px-4 py-3">
              <div><p className="font-medium text-sm">Email notifications</p><p className="text-xs text-muted-foreground">Receive operational and workflow notifications by email</p></div>
              <Switch checked={emailNotifs} onCheckedChange={setEmailNotifs} />
            </div>
            <div className="flex items-center justify-between rounded-md border px-4 py-3">
              <div><p className="font-medium text-sm">SMS notifications</p><p className="text-xs text-muted-foreground">Receive urgent alerts by SMS</p></div>
              <Switch checked={smsNotifs} onCheckedChange={setSmsNotifs} />
            </div>
            <Button size="sm" onClick={() => saveSection('notifications', { emailNotifications: emailNotifs, smsNotifications: smsNotifs }, 'Notification preferences')}><CheckCircle2 className="mr-2 h-4 w-4" />Save Notifications</Button>
          </CardContent>
        </Card>
      )}

      {tab === 'security' && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4" />Security Policy</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1"><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Minimum password length</Label><Input type="number" min={4} max={64} value={passwordMinLength} onChange={(e) => setPasswordMinLength(e.target.value)} /></div>
              <div className="space-y-1"><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Session timeout (minutes)</Label><Input type="number" min={5} max={1440} value={sessionTimeout} onChange={(e) => setSessionTimeout(e.target.value)} /></div>
            </div>
            <div className="flex items-center justify-between rounded-md border px-4 py-3">
              <div><p className="font-medium text-sm">Require 2FA</p><p className="text-xs text-muted-foreground">All users must use two-factor authentication</p></div>
              <Switch checked={require2FA} onCheckedChange={setRequire2FA} />
            </div>
            <Button size="sm" onClick={() => saveSection('security', { passwordMinLength: Number(passwordMinLength), sessionTimeout: Number(sessionTimeout), require2FA }, 'Security policy')}><CheckCircle2 className="mr-2 h-4 w-4" />Save Security</Button>
          </CardContent>
        </Card>
      )}

      {tab === 'links' && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Link2 className="h-4 w-4" />Quick Links</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <QuickLink icon={GitBranch} label="Branches" href="/branches" />
              <QuickLink icon={Users} label="Roles & Permissions" href="/roles" />
              <QuickLink icon={Users} label="Teams" href="/employees" />
              <QuickLink icon={BookOpenCheck} label="Chart of Accounts" href="/chart-of-accounts" />
              <QuickLink icon={CalendarFold} label="Fiscal Years" href="/fiscal-years" />
              <QuickLink icon={Percent} label="Tax Rates" href="/tax-rates" />
              <QuickLink icon={Briefcase} label="Service Types" href="/service-types" desc="Configure the 12 travel service types" />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function QuickLink({ icon: Icon, label, href, desc }: { icon: any; label: string; href: string; desc?: string }) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent hover:border-primary/40"
    >
      <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
      <div>
        <p className="text-sm font-medium">{label}</p>
        {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
      </div>
    </a>
  );
}
