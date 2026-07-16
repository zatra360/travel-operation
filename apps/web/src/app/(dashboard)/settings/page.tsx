'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Building2, Palette, Bell, Shield, Save, UploadCloud, X, Phone, Globe, MapPin, Package, Settings } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { ALL_MODULES } from '@/lib/module-config';

export default function SettingsPage() {
  const { activeTenant } = useAuthStore();
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [uploadedLogoDocId, setUploadedLogoDocId] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [savingModule, setSavingModule] = useState(false);
  const [moduleToggles, setModuleToggles] = useState<Record<string, boolean>>({});

  const [sections, setSections] = useState({
    general: { timezone: 'UTC', defaultCurrency: 'USD', dateFormat: 'YYYY-MM-DD' },
    company: { companyPhone: '', companyEmail: '', website: '', address: '' },
    branding: { themeColor: '#000000' },
    notifications: { emailNotifications: 'true', smsNotifications: 'false' },
    security: { passwordMinLength: '8', sessionTimeout: '60', require2FA: 'false' },
  });

  const loadSettings = useCallback(() => {
    if (!activeTenant) return;
    setLoading(true);
    api.get<Record<string, any>>('/api/v1/tenant/settings', { tenantId: activeTenant.id })
      .then((data) => {
        setSettings(data);
        setSections((prev) => ({
          general: { ...prev.general, ...(data.general || {}) },
          company: { ...prev.company, ...(data.company || {}) },
          branding: { ...prev.branding, ...(data.branding || {}) },
          notifications: { ...prev.notifications, ...(data.notifications || {}) },
          security: { ...prev.security, ...(data.security || {}) },
        }));
        const mods = data?.modules || {};
        const toggles: Record<string, boolean> = {};
        ALL_MODULES.forEach(m => { toggles[m.key] = mods[m.key] !== false; });
        setModuleToggles(toggles);
        if (data.branding?.logoDocumentId) {
          setUploadedLogoDocId(data.branding.logoDocumentId);
          loadLogoPreview(data.branding.logoDocumentId);
        }
      })
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, [activeTenant]);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const loadLogoPreview = async (docId: string) => {
    if (!activeTenant) return;
    try {
      const { url } = await api.get<{ url: string }>(`/api/v1/tenant/documents/${docId}/download`, { tenantId: activeTenant.id });
      setLogoPreview(url);
    } catch { /* ignore */ }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeTenant) return;
    setLogoUploading(true);
    try {
      const { uploadUrl, storageKey } = await api.post<{ uploadUrl: string; storageKey: string }>(
        '/api/v1/tenant/documents/upload-url',
        { fileName: file.name, mimeType: file.type, category: 'OTHER', sizeBytes: file.size },
        { tenantId: activeTenant.id },
      );
      const putRes = await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type || 'application/octet-stream' } });
      if (!putRes.ok) throw new Error('Upload failed');

      const doc = await api.post<{ id: string }>('/api/v1/tenant/documents', {
        storageKey, fileName: file.name, mimeType: file.type, category: 'OTHER', sizeBytes: file.size,
      }, { tenantId: activeTenant.id });

      setUploadedLogoDocId(doc.id);
      updateSection('branding', 'logoDocumentId', doc.id);
      await loadLogoPreview(doc.id);
      toast.success('Logo uploaded — save branding to persist');
    } catch (err: any) { toast.error(err.message || 'Upload failed'); }
    finally { setLogoUploading(false); }
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setUploadedLogoDocId(null);
    updateSection('branding', 'logoDocumentId', '');
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const updateSection = (section: string, key: string, value: string) => {
    setSections((prev) => ({ ...prev, [section]: { ...(prev as any)[section], [key]: value } }));
  };

  const saveSection = async (section: string) => {
    if (!activeTenant) return;
    try {
      await api.put(`/api/v1/tenant/settings/${section}`, { value: (sections as any)[section] }, { tenantId: activeTenant.id });
      toast.success(`${section} settings saved`);
      loadSettings();
    } catch (err: any) { toast.error(err.message || 'Failed to save'); }
  };

  const saveModules = async () => {
    if (!activeTenant) return;
    setSavingModule(true);
    try {
      await api.put('/api/v1/tenant/settings/modules', { value: moduleToggles }, { tenantId: activeTenant.id });
      toast.success('Module settings saved');
    } catch (err: any) { toast.error(err.message || 'Failed to save'); }
    finally { setSavingModule(false); }
  };

  const categories = [...new Set(ALL_MODULES.map(m => m.category))];

  if (loading) return <div className="space-y-6"><PageHeader title="Settings" subtitle="Manage company settings, logo, and preferences" /><Skeleton className="h-48 w-full" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Manage company settings, logo, and preferences" />

      <Card>
        <CardHeader className="flex flex-row items-start gap-4">
          <Building2 className="h-5 w-5 text-muted-foreground mt-1" />
          <div className="flex-1"><CardTitle className="text-base">Company Info</CardTitle><CardDescription>Phone, email, website, and address</CardDescription></div>
          <Button size="sm" variant="outline" onClick={() => saveSection('company')}><Save className="h-4 w-4 mr-1" />Save</Button>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"><Phone className="h-3.5 w-3.5 inline mr-1" />Phone</Label>
            <Input value={sections.company.companyPhone} onChange={(e) => updateSection('company', 'companyPhone', e.target.value)} placeholder="+1 (555) 000-0000" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</Label>
            <Input value={sections.company.companyEmail} onChange={(e) => updateSection('company', 'companyEmail', e.target.value)} placeholder="info@company.com" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"><Globe className="h-3.5 w-3.5 inline mr-1" />Website</Label>
            <Input value={sections.company.website} onChange={(e) => updateSection('company', 'website', e.target.value)} placeholder="https://company.com" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"><MapPin className="h-3.5 w-3.5 inline mr-1" />Address</Label>
            <Input value={sections.company.address} onChange={(e) => updateSection('company', 'address', e.target.value)} placeholder="123 Main St, City, Country" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start gap-4">
          <Building2 className="h-5 w-5 text-muted-foreground mt-1" />
          <div className="flex-1"><CardTitle className="text-base">General</CardTitle><CardDescription>Timezone, currency, and date format</CardDescription></div>
          <Button size="sm" variant="outline" onClick={() => saveSection('general')}><Save className="h-4 w-4 mr-1" />Save</Button>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Timezone</Label>
            <Select value={sections.general.timezone} onValueChange={(v) => updateSection('general', 'timezone', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{['UTC', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo'].map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Default currency</Label>
            <Select value={sections.general.defaultCurrency} onValueChange={(v) => updateSection('general', 'defaultCurrency', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'AED', 'SAR', 'SGD', 'INR'].map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date format</Label>
            <Select value={sections.general.dateFormat} onValueChange={(v) => updateSection('general', 'dateFormat', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY'].map((f) => (<SelectItem key={f} value={f}>{f}</SelectItem>))}</SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start gap-4">
          <Palette className="h-5 w-5 text-muted-foreground mt-1" />
          <div className="flex-1"><CardTitle className="text-base">Branding</CardTitle><CardDescription>Theme color and logo</CardDescription></div>
          <Button size="sm" variant="outline" onClick={() => saveSection('branding')}><Save className="h-4 w-4 mr-1" />Save</Button>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Theme color</Label>
            <div className="flex items-center gap-2">
              <input type="color" value={sections.branding.themeColor} onChange={(e) => updateSection('branding', 'themeColor', e.target.value)} className="h-9 w-9 rounded border cursor-pointer" />
              <Input value={sections.branding.themeColor} onChange={(e) => updateSection('branding', 'themeColor', e.target.value)} className="flex-1" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Logo</Label>
            <div className="flex items-center gap-3">
              {logoPreview ? (
                <div className="relative">
                  <img src={logoPreview} alt="Logo" className="h-12 w-12 rounded-md object-cover border" />
                  <button onClick={handleRemoveLogo} className="absolute -top-1.5 -right-1.5 rounded-full bg-destructive text-destructive-foreground p-0.5 hover:bg-destructive/80"><X className="h-3 w-3" /></button>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-input px-4 py-3 text-xs text-muted-foreground hover:bg-accent/50">
                  <UploadCloud className="h-5 w-5 mb-1" />
                  {logoUploading ? 'Uploading...' : 'Choose file'}
                  <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={logoUploading} />
                </label>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start gap-4">
          <Package className="h-5 w-5 text-muted-foreground mt-1" />
          <div className="flex-1"><CardTitle className="text-base">Module Settings</CardTitle><CardDescription>Enable or disable features for this company</CardDescription></div>
          <Button size="sm" variant="outline" onClick={saveModules} disabled={savingModule}><Save className="h-4 w-4 mr-1" />{savingModule ? 'Saving...' : 'Save'}</Button>
        </CardHeader>
        <CardContent>
          {categories.map(cat => (
            <div key={cat} className="mb-4 last:mb-0">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{cat}</h4>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {ALL_MODULES.filter(m => m.category === cat).map(m => (
                  <div key={m.key} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm">{m.label}</span>
                    </div>
                    <Switch
                      checked={moduleToggles[m.key] ?? true}
                      onCheckedChange={(v) => setModuleToggles(prev => ({ ...prev, [m.key]: v }))}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start gap-4">
          <Bell className="h-5 w-5 text-muted-foreground mt-1" />
          <div className="flex-1"><CardTitle className="text-base">Notifications</CardTitle><CardDescription>Email and SMS preferences</CardDescription></div>
          <Button size="sm" variant="outline" onClick={() => saveSection('notifications')}><Save className="h-4 w-4 mr-1" />Save</Button>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email notifications</Label>
            <Select value={sections.notifications.emailNotifications} onValueChange={(v) => updateSection('notifications', 'emailNotifications', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="true">Enabled</SelectItem><SelectItem value="false">Disabled</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">SMS notifications</Label>
            <Select value={sections.notifications.smsNotifications} onValueChange={(v) => updateSection('notifications', 'smsNotifications', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="true">Enabled</SelectItem><SelectItem value="false">Disabled</SelectItem></SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start gap-4">
          <Shield className="h-5 w-5 text-muted-foreground mt-1" />
          <div className="flex-1"><CardTitle className="text-base">Security</CardTitle><CardDescription>Password policy and session settings</CardDescription></div>
          <Button size="sm" variant="outline" onClick={() => saveSection('security')}><Save className="h-4 w-4 mr-1" />Save</Button>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password min length</Label>
            <Input type="number" min="6" max="32" value={sections.security.passwordMinLength} onChange={(e) => updateSection('security', 'passwordMinLength', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Session timeout (min)</Label>
            <Input type="number" min="5" max="1440" value={sections.security.sessionTimeout} onChange={(e) => updateSection('security', 'sessionTimeout', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Require 2FA</Label>
            <Select value={sections.security.require2FA} onValueChange={(v) => updateSection('security', 'require2FA', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="true">Enabled</SelectItem><SelectItem value="false">Disabled</SelectItem></SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
