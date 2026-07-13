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

const ZENITH = {
  primary: '#6366f1',
  success: '#10b981',
  warning: '#f59e0b',
  destructive: '#ef4444',
  info: '#0ea5e9',
  muted: '#94a3b8',
  bg: '#f8fafc',
};

const trendData = [
  { name: 'Jan', revenue: 28500, expenses: 12000 },
  { name: 'Feb', revenue: 32400, expenses: 14800 },
  { name: 'Mar', revenue: 29800, expenses: 13500 },
  { name: 'Apr', revenue: 41000, expenses: 18200 },
  { name: 'May', revenue: 38500, expenses: 16500 },
  { name: 'Jun', revenue: 45000, expenses: 19500 },
];

const pipelineData = [
  { name: 'Leads', value: 45, color: ZENITH.info },
  { name: 'Quotations', value: 28, color: ZENITH.warning },
  { name: 'Bookings', value: 18, color: ZENITH.primary },
  { name: 'Invoices', value: 12, color: ZENITH.success },
];

const statusData = [
  { name: 'Active', value: 35, color: ZENITH.success },
  { name: 'Pending', value: 20, color: ZENITH.warning },
  { name: 'Completed', value: 25, color: ZENITH.primary },
  { name: 'Cancelled', value: 8, color: ZENITH.destructive },
];

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [noTenant, setNoTenant] = useState(false);
  const { activeTenant, activeBranch } = useAuthStore();

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
        <div key={i} className="rounded-xl border bg-card p-5 space-y-2">
          <Skeleton className="h-3 w-16" /><Skeleton className="h-8 w-12" />
        </div>
      ))}
    </div>
  );

  const cards: { label: string; value: number; hint?: string; icon: any; href: string; tone: any }[] = [
    { label: 'Leads', value: stats?.leads.total ?? 0, hint: stats?.leads.new ? `${stats.leads.new} new` : undefined, icon: Users, href: '/leads', tone: 'info' },
    { label: 'Clients', value: stats?.clients.total ?? 0, hint: stats?.clients.active ? `${stats.clients.active} active` : undefined, icon: TrendingUp, href: '/clients', tone: 'success' },
    { label: 'Quotations', value: stats?.quotations?.total ?? 0, hint: stats?.quotations?.pending ? `${stats.quotations.pending} pending` : undefined, icon: FileText, href: '/quotations', tone: 'warning' },
    { label: 'Bookings', value: stats?.bookings.total ?? 0, hint: stats?.bookings.ticketed ? `${stats.bookings.ticketed} ticketed` : undefined, icon: Plane, href: '/bookings', tone: 'default' },
    { label: 'Tickets', value: stats?.tickets?.total ?? 0, hint: stats?.tickets?.pending ? `${stats.tickets.pending} pending` : undefined, icon: Ticket, href: '/tickets', tone: 'info' },
    { label: 'Invoices', value: stats?.invoices.total ?? 0, hint: stats?.invoices.unpaid ? `${stats.invoices.unpaid} unpaid` : undefined, icon: Receipt, href: '/invoices', tone: 'destructive' },
    { label: 'Refunds', value: stats?.refunds?.total ?? 0, hint: stats?.refunds?.pending ? `${stats.refunds.pending} pending` : undefined, icon: RefreshCw, href: '/refunds', tone: 'warning' },
    { label: 'Employees', value: stats?.employees?.total ?? 0, hint: stats?.employees?.active ? `${stats.employees.active} active` : undefined, icon: UserCheck, href: '/employees', tone: 'success' },
  ];

  const alerts: { label: string; value: number; tone: 'warning' | 'destructive'; href: string }[] = [];
  if (stats?.bookings.held) alerts.push({ label: 'Bookings on hold', value: stats.bookings.held, tone: 'warning', href: '/bookings' });
  if (stats?.invoices.overdue) alerts.push({ label: 'Overdue invoices', value: stats.invoices.overdue, tone: 'destructive', href: '/invoices' });
  if (stats?.refunds?.pending) alerts.push({ label: 'Pending refunds', value: stats.refunds.pending, tone: 'warning', href: '/refunds' });

  const totalRevenue = trendData.reduce((s, m) => s + m.revenue, 0);

  return (
    <motion.div className="space-y-6" variants={container} initial="hidden" animate="show">
      <motion.div variants={item}>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-sm text-muted-foreground">{activeTenant?.name}{activeBranch ? ` · ${activeBranch.name}` : ''}</p>
      </motion.div>

      {alerts.length > 0 && (
        <motion.div variants={item} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {alerts.map((a) => (
            <Link key={a.label} href={a.href} className="focus-visible:outline-none">
              <Card className={a.tone === 'destructive' ? 'border-destructive/30 bg-destructive/5 hover:shadow-md transition-shadow rounded-xl' : 'border-warning/30 bg-warning/10 hover:shadow-md transition-shadow rounded-xl'}>
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
        {cards.map((card, i) => (
          <StatCard key={card.label} label={card.label} value={card.value} hint={card.hint} icon={card.icon} href={card.href} tone={card.tone} index={i} />
        ))}
      </motion.div>

      <motion.div variants={item} className="grid gap-6 lg:grid-cols-2">
        <MotionCard className="rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" />Revenue Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-3xl font-bold">{formatMoney(totalRevenue, 'USD')}</span>
              <span className="text-xs text-muted-foreground">last 6 months</span>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={ZENITH.primary} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={ZENITH.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} formatter={(v: any) => formatMoney(Number(v), 'USD')} />
                <Area type="monotone" dataKey="revenue" stroke={ZENITH.primary} strokeWidth={2.5} fill="url(#rev)" dot={false} activeDot={{ r: 5, fill: ZENITH.primary }} />
                <Area type="monotone" dataKey="expenses" stroke={ZENITH.muted} strokeWidth={2} strokeDasharray="5 5" fill="none" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </MotionCard>

        <MotionCard className="rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2"><Activity className="h-4 w-4 text-primary" />Sales Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={pipelineData} barSize={48}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {pipelineData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </MotionCard>
      </motion.div>

      <motion.div variants={item} className="grid gap-6 lg:grid-cols-3">
        <MotionCard className="lg:col-span-2 rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2"><Activity className="h-4 w-4 text-primary" />Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.recentActivity?.length ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {stats.recentActivity.slice(0, 20).map((event, i) => (
                  <motion.div key={event.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                    className="flex items-start gap-3 border-b border-border pb-2.5 last:border-0 last:pb-0">
                    <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary/60" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug">{event.subject}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{event.userName} · {formatDateTime(event.createdAt)}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground py-8 text-center">No recent activity</p>}
          </CardContent>
        </MotionCard>

        <MotionCard className="rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2"><TrendingDown className="h-4 w-4 text-primary" />Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.color} stroke="none" />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </MotionCard>
      </motion.div>
    </motion.div>
  );
}
