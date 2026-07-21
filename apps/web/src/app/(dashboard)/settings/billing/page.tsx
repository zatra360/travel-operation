'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/ui/page-header';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { CreditCard, Users, Building2, FileText, ArrowUpCircle, XCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface BillingInfo {
  status: string;
  billingCycle: string;
  startedAt?: string;
  endsAt?: string;
  trialEndsAt?: string;
  cancelledAt?: string;
  package?: { id: string; name: string; code: string; priceMonthly: number; priceYearly: number; maxUsers: number; maxBranches: number; };
  tenant?: { status: string; trialEndsAt?: string; maxUsers?: number; maxBranches?: number; };
  usage?: { users: number; branches: number; documents: number; };
}

interface AvailablePackage {
  id: string; name: string; code: string; description: string;
  priceMonthly: number; priceYearly: number; maxUsers: number; maxBranches: number;
  features?: string[];
}

export default function BillingPage() {
  const { activeTenant } = useAuthStore();
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [packages, setPackages] = useState<AvailablePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState<string | null>(null);

  const load = () => {
    if (!activeTenant) return;
    setLoading(true);
    Promise.all([
      api.get<BillingInfo>('/api/v1/tenant/subscription', { tenantId: activeTenant.id }),
      api.get<AvailablePackage[]>('/api/v1/tenant/subscription/packages', { tenantId: activeTenant.id }),
    ]).then(([b, p]) => { setBilling(b); setPackages(p); }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [activeTenant]);

  const handleChange = async (pkgId: string) => {
    if (!activeTenant) return;
    setChanging(pkgId);
    try {
      await api.post('/api/v1/tenant/subscription/change', { packageId: pkgId }, { tenantId: activeTenant.id });
      toast.success('Plan changed successfully');
      load();
    } catch (e: any) { toast.error(e.message || 'Failed to change plan'); }
    finally { setChanging(null); }
  };

  const handleCancel = async () => {
    if (!activeTenant) return;
    if (!confirm('Are you sure you want to cancel your subscription? You can export your data before leaving.')) return;
    try {
      await api.post('/api/v1/tenant/subscription/cancel', {}, { tenantId: activeTenant.id });
      toast.success('Subscription cancelled');
      load();
    } catch (e: any) { toast.error(e.message || 'Failed to cancel'); }
  };

  if (loading) return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}</div>;

  const currentPlan = billing?.package?.name || 'Unknown';
  const isActive = billing?.status === 'ACTIVE';
  const isTrialing = billing?.tenant?.status === 'TRIAL';
  const trialEnds = billing?.tenant?.trialEndsAt || billing?.trialEndsAt;

  return (
    <div className="space-y-6">
      <PageHeader title="Billing & Plan" subtitle="Manage your subscription" />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Current Plan</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{currentPlan}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={isActive ? 'success' : billing?.status === 'CANCELLED' ? 'destructive' : 'secondary'}>{billing?.status}</Badge>
              <span className="text-xs text-muted-foreground">{billing?.billingCycle === 'MONTHLY' ? 'Monthly' : 'Yearly'}</span>
            </div>
            {isTrialing && trialEnds && (
              <p className="text-xs text-warning mt-2">Trial ends {new Date(trialEnds).toLocaleDateString()}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Usage</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2 text-sm"><Users className="h-4 w-4 text-muted-foreground" /> {billing?.usage?.users || 0} users</div>
            <div className="flex items-center gap-2 text-sm"><Building2 className="h-4 w-4 text-muted-foreground" /> {billing?.usage?.branches || 0} branches</div>
            <div className="flex items-center gap-2 text-sm"><FileText className="h-4 w-4 text-muted-foreground" /> {billing?.usage?.documents || 0} documents</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Quick Links</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Link href="/invoices" className="flex items-center gap-2 text-sm text-primary hover:underline"><FileText className="h-4 w-4" />View invoices</Link>
            <Link href="/settings" className="flex items-center gap-2 text-sm text-primary hover:underline"><Users className="h-4 w-4" />Company settings</Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Available Plans</CardTitle><CardDescription>Change your plan at any time. Upgrades take effect immediately.</CardDescription></CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {packages.map((pkg) => {
              const isCurrent = billing?.package?.id === pkg.id;
              return (
                <div key={pkg.id} className={`rounded-xl border p-5 ${isCurrent ? 'ring-2 ring-primary/30 border-primary' : ''}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{pkg.name}</h3>
                    {isCurrent && <CheckCircle className="h-5 w-5 text-primary" />}
                  </div>
                  <p className="text-2xl font-bold mb-1">${pkg.priceMonthly}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                  {pkg.priceYearly > 0 && <p className="text-xs text-muted-foreground mb-3">${pkg.priceYearly}/year</p>}
                  <ul className="space-y-1.5 mb-4 text-sm text-muted-foreground">
                    <li>Up to {pkg.maxUsers} users</li>
                    <li>Up to {pkg.maxBranches} branches</li>
                    {Array.isArray(pkg.features) && pkg.features.slice(0, 3).map((f: string) => <li key={f}>{f}</li>)}
                  </ul>
                  {isCurrent ? (
                    <Button variant="outline" className="w-full" disabled>Current plan</Button>
                  ) : (
                    <Button className="w-full" disabled={changing === pkg.id} onClick={() => handleChange(pkg.id)}>
                      {changing === pkg.id ? 'Changing...' : pkg.priceMonthly === 0 ? 'Downgrade' : 'Upgrade'}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {isActive && (
        <Card className="border-destructive/20">
          <CardHeader><CardTitle className="text-base text-destructive">Cancel Subscription</CardTitle><CardDescription>Your data will be retained for 30 days. You can export your data before cancelling.</CardDescription></CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={handleCancel}>Cancel my subscription</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
