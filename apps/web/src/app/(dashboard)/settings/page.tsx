'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Palette, Bell, Shield, Save, UploadCloud, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

export default function SettingsPage() {
  const { activeTenant } = useAuthStore();
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [uploadedLogoDocId, setUploadedLogoDocId] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [sections, setSections] = useState({
    general: { timezone: 'UTC', defaultCurrency: 'USD', dateFormat: 'YYYY-MM-DD' },
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
          branding: { ...prev.branding, ...(data.branding || {}) },
          notifications: { ...prev.notifications, ...(data.notifications || {}) },
          security: { ...prev.security, ...(data.security || {}) },
        }));
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

  if (loading) return <div className="space-y-6"><h2 className="text-2xl font-bold">Settings</h2><p className="text-muted-foreground">Loading...</p></div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Settings</h2>

      <Card>
        <CardHeader className="flex flex-row items-start gap-4">
          <Building2 className="h-5 w-5 text-muted-foreground mt-1" />
          <div className="flex-1"><CardTitle className="text-base">General</CardTitle><CardDescription>Timezone, currency, and date format</CardDescription></div>
          <Button size="sm" variant="outline" onClick={() => saveSection('general')}><Save className="h-4 w-4 mr-1" />Save</Button>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Timezone</Label>
            <Select value={sections.general.timezone} onValueChange={(v) => updateSection('general', 'timezone', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{['UTC', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo'].map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Default currency</Label>
            <Select value={sections.general.defaultCurrency} onValueChange={(v) => updateSection('general', 'defaultCurrency', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'INR', 'AED', 'SAR', 'SGD'].map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Date format</Label>
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
            <Label>Theme color</Label>
            <div className="flex items-center gap-2">
              <input type="color" value={sections.branding.themeColor} onChange={(e) => updateSection('branding', 'themeColor', e.target.value)} className="h-9 w-9 rounded border cursor-pointer" />
              <Input value={sections.branding.themeColor} onChange={(e) => updateSection('branding', 'themeColor', e.target.value)} className="flex-1" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Logo</Label>
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
          <Bell className="h-5 w-5 text-muted-foreground mt-1" />
          <div className="flex-1"><CardTitle className="text-base">Notifications</CardTitle><CardDescription>Email and SMS preferences</CardDescription></div>
          <Button size="sm" variant="outline" onClick={() => saveSection('notifications')}><Save className="h-4 w-4 mr-1" />Save</Button>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Email notifications</Label>
            <Select value={sections.notifications.emailNotifications} onValueChange={(v) => updateSection('notifications', 'emailNotifications', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="true">Enabled</SelectItem><SelectItem value="false">Disabled</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>SMS notifications</Label>
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
            <Label>Password min length</Label>
            <Input type="number" min="6" max="32" value={sections.security.passwordMinLength} onChange={(e) => updateSection('security', 'passwordMinLength', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Session timeout (min)</Label>
            <Input type="number" min="5" max="1440" value={sections.security.sessionTimeout} onChange={(e) => updateSection('security', 'sessionTimeout', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Require 2FA</Label>
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
