'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Plane, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { brand } from '@/lib/brand';

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '', companyName: '', companySlug: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true); setError('');
    try {
      const res = await api.post<any>('/api/v1/auth/register', {
        firstName: form.firstName, lastName: form.lastName,
        email: form.email, password: form.password,
        companyName: form.companyName, companySlug: form.companySlug || undefined,
      });
      setAuth(
        { id: res.user.id, email: res.user.email, firstName: res.user.firstName, lastName: res.user.lastName, isPlatformSuperAdmin: false },
        res.accessToken,
        res.refreshToken,
        [{ id: res.tenant.id, name: res.tenant.name, slug: res.tenant.slug, role: 'OWNER' }],
      );
      toast.success('Welcome! Your 14-day trial is ready.');
      router.push('/dashboard');
    } catch (err: any) { setError(err.message || 'Registration failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Plane className="h-5 w-5" />
            </div>
          </div>
          <CardTitle className="text-xl">Create your account</CardTitle>
          <CardDescription>Start your 14-day free trial — no credit card required</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>First name</Label><Input value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} required /></div>
              <div className="space-y-1.5"><Label>Last name</Label><Input value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} required /></div>
            </div>
            <div className="space-y-1.5"><Label>Work email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@agency.com" required /></div>
            <div className="space-y-1.5"><Label>Password</Label><Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Min. 8 characters" required minLength={8} /></div>
            <div className="space-y-1.5"><Label>Confirm password</Label><Input type="password" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} placeholder="Re-enter your password" required minLength={8} /></div>
            <div className="space-y-1.5"><Label>Company name</Label><Input value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value })} placeholder="Your Travel Agency" required /></div>
            <div className="space-y-1.5"><Label>Company slug <span className="text-xs text-muted-foreground">(optional)</span></Label><Input value={form.companySlug} onChange={e => setForm({ ...form, companySlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} placeholder="your-agency" /></div>
            <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Creating...' : 'Start free trial'}</Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account? <Link href="/login" className="text-primary hover:underline font-medium">Sign in</Link>
          </div>
          <Link href="/login" className="flex items-center justify-center gap-1 mt-3 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> Back to login
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
