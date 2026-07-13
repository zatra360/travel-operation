'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Users, Plane, FileText, Receipt, TrendingUp, Activity,
  Ticket, RefreshCw, AlertTriangle, UserCheck, TrendingDown,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDateTime, formatMoney } from '@/lib/utils';
import { DashboardOverview } from '@/lib/crm';

const MotionCard = motion.create(Card);

const CHART_COLORS = {
  primary: 'oklch(0.35 0.06 255)',
  success: 'oklch(0.6 0.15 145)',
  warning: 'oklch(0.7 0.13 85)',
  destructive: 'oklch(0.55 0.22 25)',
  info: 'oklch(0.55 0.12 220)',
  muted: 'oklch(0.5 0.02 250)',
};

function generateMockTrend() {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  return months.map((m) => ({
    name: m,
    revenue: Math.floor(15000 + Math.random() * 35000),
    expenses: Math.floor(5000 + Math.random() * 15000),
  }));
}

function generateMockPipeline() {
  return [
    { name: 'Leads', value: 45, color: CHART_COLORS.info },
    { name: 'Quotations', value: 28, color: CHART_COLORS.warning },
    { name: 'Bookings', value: 18, color: CHART_COLORS.primary },
    { name: 'Invoices', value: 12, color: CHART_COLORS.success },
  ];
}

function generateMockStatus() {
  return [
    { name: 'Active', value: 35, color: CHART_COLORS.success },
    { name: 'Pending', value: 20, color: CHART_COLORS.warning },
    { name: 'Completed', value: 25, color: CHART_COLORS.primary },
    { name: 'Cancelled', value: 8, color: CHART_COLORS.destructive },
  ];
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [noTenant, setNoTenant] = useState(false);
  const { activeTenant, activeBranch } = useAuthStore();
  const [trend] = useState(() => generateMockTrend());
  const [pipeline] = useState(() => generateMockPipeline());
  const [statusDist] = useState(() => generateMockStatus());

  useEffect(() => {
    if (!activeTenant) { setNoTenant(true); setLoading(false); return; }
    setNoTenant(false); setLoading(true);
    api.get<DashboardOverview>('/api/v1/tenant/dashboard/stats', { tenantId: activeTenant.id, branchId: activeBranch?.id })
      .then(setStats).catch(console.error).finally(() => setLoading(false));
  }, [activeTenant, activeBranch]);

  if (noTenant) return <EmptyState title="No company assigned" description="Select a company from the switcher, or contact your administrator." />;

  if (loading) return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="space-y-2 rounded-lg border p-4">
          <Skeleton className="h-3 w-16" /><Skeleton className="h-7 w-12" />
        </div>
      ))}
    </div>
  );

  const cards = [
    { label: 'Leads', value: stats?.leads.total ?? 0, hint: stats?.leads.new ? `${stats.leads.new} new` : undefined, icon: Users, href: '/leads', tone: 'info' as const },
    { label: 'Clients', value: stats?.clients.total ?? 0, hint: stats?.clients.active ? `${stats.clients.active} active` : undefined, icon: TrendingUp, href: '/clients', tone: 'success' as const },
    { label: 'Quotations', value: stats?.quotations?.total ?? 0, hint: stats?.quotations?.pending ? `${stats.quotations.pending} pending` : undefined, icon: FileText, href: '/quotations', tone: 'warning' as const },
    { label: 'Bookings', value: stats?.bookings.total ?? 0, hint: stats?.bookings.ticketed ? `${stats.bookings.ticketed} ticketed` : undefined, icon: Plane, href: '/bookings', tone: 'default' as const },
    { label: 'Tickets', value: stats?.tickets?.total ?? 0, hint: stats?.tickets?.pending ? `${stats.tickets.pending} pending` : undefined, icon: Ticket, href: '/tickets', tone: 'info' as const },
    { label: 'Invoices', value: stats?.invoices.total ?? 0, hint: stats?.invoices.unpaid ? `${stats.invoices.unpaid} unpaid` : undefined, icon: Receipt, href: '/invoices', tone: 'destructive' as const },
    { label: 'Refunds', value: stats?.refunds?.total ?? 0, hint: stats?.refunds?.pending ? `${stats.refunds.pending} pending` : undefined, icon: RefreshCw, href: '/refunds', tone: 'warning' as const },
    { label: 'Employees', value: stats?.employees?.total ?? 0, hint: stats?.employees?.active ? `${stats.employees.active} active` : undefined, icon: UserCheck, href: '/employees', tone: 'success' as const },
  ];

  const alerts: { label: string; value: number; tone: 'warning' | 'destructive'; href: string }[] = [];
  if (stats?.bookings.held) alerts.push({ label: 'Bookings on hold', value: stats.bookings.held, tone: 'warning', href: '/bookings' });
  if (stats?.invoices.overdue) alerts.push({ label: 'Overdue invoices', value: stats.invoices.overdue, tone: 'destructive', href: '/invoices' });
  if (stats?.refunds?.pending) alerts.push({ label: 'Pending refunds', value: stats.refunds.pending, tone: 'warning', href: '/refunds' });

  const totalRevenue = trend.reduce((s, m) => s + m.revenue, 0);

  return (
    <motion.div className="space-y-6" variants={container} initial="hidden" animate="show">
      <motion.div variants={item}>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">{activeTenant?.name} — {activeBranch?.name || 'All Branches'}</p>
      </motion.div>

      {alerts.length > 0 && (
        <motion.div variants={item} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {alerts.map((a) => (
            <Link key={a.label} href={a.href} className="focus-visible:outline-none">
              <Card className={a.tone === 'destructive' ? 'border-destructive/30 bg-destructive/5 transition-shadow hover:shadow-md' : 'border-warning/30 bg-warning/10 transition-shadow hover:shadow-md'}>
                <CardContent className="flex items-center gap-3 py-3">
                  <AlertTriangle className={a.tone === 'destructive' ? 'h-5 w-5 text-destructive' : 'h-5 w-5 text-warning'} />
                  <div><p className="text-sm font-medium">{a.label}</p><p className="text-lg font-bold tabular-nums">{a.value}</p></div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </motion.div>
      )}

      <motion.div variants={item} className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {cards.map((card) => (
          <StatCard key={card.label} label={card.label} value={card.value} hint={card.hint} icon={card.icon} href={card.href} tone={card.tone} />
        ))}
      </motion.div>

      <motion.div variants={item} className="grid gap-6 lg:grid-cols-2">
        <MotionCard>
          <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-4 w-4" />Revenue Trend</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-1">{formatMoney(totalRevenue, 'USD')}</div>
            <p className="text-xs text-muted-foreground mb-4">Total revenue (last 6 months)</p>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0 0)" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: any) => formatMoney(Number(v), 'USD')} />
                <Area type="monotone" dataKey="revenue" stroke={CHART_COLORS.primary} fill="url(#revGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="expenses" stroke={CHART_COLORS.muted} fill="none" strokeWidth={2} strokeDasharray="4 4" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </MotionCard>

        <MotionCard>
          <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-4 w-4" />Pipeline Overview</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={pipeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0 0)" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {pipeline.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </MotionCard>
      </motion.div>

      <motion.div variants={item} className="grid gap-6 lg:grid-cols-3">
        <MotionCard className="lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-4 w-4" />Recent Activity</CardTitle></CardHeader>
          <CardContent>
            {stats?.recentActivity?.length ? (
              <div className="space-y-3 max-h-[320px] overflow-y-auto">
                {stats.recentActivity.slice(0, 20).map((event) => (
                  <div key={event.id} className="flex items-start gap-3 border-b pb-2 last:border-0">
                    <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">{event.subject}</p>
                      <p className="text-xs text-muted-foreground">{event.userName} · {formatDateTime(event.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">No recent activity</p>}
          </CardContent>
        </MotionCard>

        <MotionCard>
          <CardHeader><CardTitle className="flex items-center gap-2"><TrendingDown className="h-4 w-4" />Status Breakdown</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusDist} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value">
                  {statusDist.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </MotionCard>
      </motion.div>
    </motion.div>
  );
}
