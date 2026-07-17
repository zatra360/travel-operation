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
import { DocumentUploadDialog } from '../documents/document-upload-dialog';

function applyTheme(hex?: string) {
  if (!hex) return;
  try { document.documentElement.style.setProperty('--tenant-primary', hex); } catch {}
}

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
  const [logoUrl, setLogoUrl] = useState('');
  const [themeColor, setThemeColor] = useState('#6366f1');
  const [logoUploading, setLogoUploading] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  const onLogoUploaded = async () => {
    setUploadOpen(false);
    toast.success('Logo uploaded — reloading settings to apply');
    loadAll();
  };

  // Currencies
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [currencyForm, setCurrencyForm] = useState({ code: '', name: '', symbol: '', exchangeRate: '1', decimalPlaces: '2' });

  // Only show modules that make sense for a tenant to toggle.
  // Everything else stays silently enabled.
  const [modules, setModules] = useState<Record<string, boolean>>({});
  const moduleToggles = [
    { key: 'lead', label: 'Leads', cat: 'CRM' },
    { key: 'client', label: 'Clients', cat: 'CRM' },
    { key: 'quotation', label: 'Quotations', cat: 'Sales' },
    { key: 'booking', label: 'Bookings', cat: 'Sales' },
    { key: 'ticket', label: 'Tickets', cat: 'Sales' },
    { key: 'invoice', label: 'Invoices', cat: 'Finance' },
    { key: 'payment', label: 'Payments', cat: 'Finance' },
    { key: 'expense', label: 'Expenses', cat: 'Finance' },
    { key: 'employee', label: 'Employees', cat: 'HRM' },
    { key: 'attendance', label: 'Attendance', cat: 'HRM' },
    { key: 'service_case', label: 'Service Cases', cat: 'Operations' },
    { key: 'settings', label: 'Settings Access', cat: 'System' },
  ];

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
        setLogoUrl(b.logoUrl || '');
        setThemeColor(b.themeColor || '#6366f1');
        applyTheme(b.themeColor);

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

  const saveSection = async (key: string, value: Record<string, unknown>, label: string) => {
    if (!activeTenant) return;
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (v === '' || v === undefined || v === null) continue;
      if (key === 'modules' && v === true) continue;
      cleaned[k] = v;
    }

    // Merge with existing modules so previously-disabled modules stay disabled
    if (key === 'modules') {
      try {
        const existing = await api.get<Record<string,boolean>>('/api/v1/tenant/settings/modules', { tenantId: activeTenant.id });
        if (existing) {
          for (const [k, v] of Object.entries(existing)) {
            if (!(k in cleaned) && v === false) cleaned[k] = false;
          }
        }
      } catch {}
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
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Company Logo</Label>
                  <div className="flex items-center gap-2">
                    {logoUrl && <img src={logoUrl} alt="Logo" className="h-10 w-10 rounded border object-contain" />}
                    <Button size="sm" variant="outline" onClick={() => setUploadOpen(true)} disabled={logoUploading}>
                      <Upload className="mr-2 h-4 w-4" />{logoUploading ? 'Uploading...' : 'Upload Logo'}
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="Or paste a direct image URL" className="text-xs" />
                    {logoUrl && <Button size="sm" variant="ghost" onClick={() => saveSection('branding', { logoUrl }, 'Branding')}>Save</Button>}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Theme color</Label>
                  <div className="flex items-center gap-2">
                    <Input type="color" value={themeColor} onChange={(e) => { setThemeColor(e.target.value); applyTheme(e.target.value); }} className="h-9 w-16 p-1" />
                    <span className="text-sm text-muted-foreground">{themeColor}</span>
                    <Button size="sm" variant="ghost" onClick={() => saveSection('branding', { themeColor, logoUrl }, 'Theme')}>Save</Button>
                  </div>
                </div>
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
            <p className="text-xs text-muted-foreground">Toggle the modules your team needs. Everything not listed here stays enabled automatically.</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {moduleToggles.map((m) => (
                <div key={m.key} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div><span className="text-sm font-medium">{m.label}</span><span className="ml-2 text-[10px] text-muted-foreground">{m.cat}</span></div>
                  <Switch checked={modules[m.key] !== false} onCheckedChange={(v) => { setModules((prev) => ({ ...prev, [m.key]: v })); }} />
                </div>
              ))}
            </div>
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
      <DocumentUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} onUploaded={onLogoUploaded} />
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
