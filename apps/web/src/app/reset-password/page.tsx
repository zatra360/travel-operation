'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Plane, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { api } from '@/lib/api';
import { toast } from 'sonner';

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (!token) { setError('Missing reset token'); return; }

    setLoading(true);
    try {
      await api.post('/api/v1/auth/reset-password', { token, newPassword: password });
      setDone(true);
      toast.success('Password reset successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <CardContent>
        <div className="space-y-4 text-center">
          <div className="rounded-md bg-primary/10 p-4 text-sm text-primary">
            Your password has been reset. You can now sign in with your new password.
          </div>
          <Button className="w-full" onClick={() => router.push('/login')}>Go to login</Button>
        </div>
      </CardContent>
    );
  }

  if (!token) {
    return (
      <CardContent>
        <div className="space-y-4 text-center">
          <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
            Invalid or missing reset token. Please request a new password reset link.
          </div>
          <Link href="/forgot-password">
            <Button variant="outline" className="w-full">Request new link</Button>
          </Link>
        </div>
      </CardContent>
    );
  }

  return (
    <CardContent>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
        <div className="space-y-1.5">
          <Label>New password</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 8 characters" required minLength={8} />
        </div>
        <div className="space-y-1.5">
          <Label>Confirm password</Label>
          <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter your password" required />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Resetting...' : 'Reset password'}
        </Button>
        <div className="text-center">
          <Link href="/login" className="text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="inline h-3 w-3" /> Back to login
          </Link>
        </div>
      </form>
    </CardContent>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Plane className="h-5 w-5" />
            </div>
          </div>
          <CardTitle className="text-xl">Reset password</CardTitle>
          <CardDescription>Enter your new password</CardDescription>
        </CardHeader>
        <Suspense>
          <ResetPasswordForm />
        </Suspense>
      </Card>
    </div>
  );
}
