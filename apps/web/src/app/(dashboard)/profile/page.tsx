'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { User, Mail, Phone, Calendar, KeyRound, Save } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/ui/page-header';

interface Profile { id: string; email: string; firstName: string; lastName: string; phone?: string | null; avatar?: string | null; lastLoginAt?: string | null; createdAt: string; updatedAt: string; }

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '' });
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });

  useEffect(() => {
    api.get<Profile>('/api/v1/auth/profile').then((p) => {
      setProfile(p);
      setForm({ firstName: p.firstName, lastName: p.lastName, phone: p.phone || '' });
    }).catch(() => toast.error('Failed to load profile')).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = {};
      if (form.firstName !== profile?.firstName) payload.firstName = form.firstName;
      if (form.lastName !== profile?.lastName) payload.lastName = form.lastName;
      if (form.phone !== (profile?.phone || '')) payload.phone = form.phone || null;
      await api.put('/api/v1/auth/profile', payload);
      toast.success('Profile updated');
    } catch (err: any) { toast.error(err.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handlePasswordChange = async () => {
    if (!passwords.current) { toast.error('Enter current password'); return; }
    if (!passwords.new || passwords.new.length < 6) { toast.error('New password must be at least 6 characters'); return; }
    if (passwords.new !== passwords.confirm) { toast.error('Passwords do not match'); return; }
    setSaving(true);
    try {
      await api.put('/api/v1/auth/profile', { currentPassword: passwords.current, newPassword: passwords.new });
      toast.success('Password changed');
      setPasswords({ current: '', new: '', confirm: '' });
    } catch (err: any) { toast.error(err.message || 'Failed'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="space-y-6"><PageHeader title="My Profile" /><Skeleton className="h-32 w-full" /></div>;

  const initials = `${profile?.firstName?.charAt(0) || ''}${profile?.lastName?.charAt(0) || ''}`;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">My Profile</h2>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold">{initials}</div>
            <div>
              <CardTitle>{profile?.firstName} {profile?.lastName}</CardTitle>
              <CardDescription>{profile?.email}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">First name</Label>
              <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Last name</Label>
              <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</Label>
              <Input value={profile?.email || ''} disabled className="opacity-60" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 234 567 8900" />
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />Joined {profile?.createdAt ? formatDate(profile.createdAt) : '--'}</span>
            <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />Last login {profile?.lastLoginAt ? formatDate(profile.lastLoginAt) : '--'}</span>
          </div>
          <Button onClick={handleSave} disabled={saving}><Save className="h-4 w-4 mr-2" />Save changes</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><KeyRound className="h-5 w-5" />Change Password</CardTitle>
          <CardDescription>Update your account password</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Current password</Label>
            <Input type="password" value={passwords.current} onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">New password</Label>
            <Input type="password" value={passwords.new} onChange={(e) => setPasswords({ ...passwords, new: e.target.value })} />
          </div>
          <div className="space-y-2 flex flex-col justify-end">
            <Button onClick={handlePasswordChange} disabled={saving} variant="outline">Change password</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
