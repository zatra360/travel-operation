'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Building2,
  Shield,
  ClipboardList,
  Plane,
  Ticket,
  Receipt,
  BarChart3,
  Settings,
  FileText,
  GitBranch,
  ScrollText,
  LogOut,
  CalendarClock,
  UserCog,
  RotateCcw,
  DollarSign,
  Calculator,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/stores/auth-store';

const navGroups = [
  {
    label: 'Core',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Branches', href: '/branches', icon: GitBranch },
      { label: 'Users', href: '/users', icon: Users },
      { label: 'Roles', href: '/roles', icon: Shield },
    ],
  },
  {
    label: 'CRM',
    items: [
      { label: 'Leads', href: '/leads', icon: ClipboardList },
      { label: 'Clients', href: '/clients', icon: Building2 },
      { label: 'Follow-ups', href: '/follow-ups', icon: CalendarClock },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Quotations', href: '/quotations', icon: FileText },
      { label: 'Bookings', href: '/bookings', icon: Plane },
      { label: 'Tickets', href: '/tickets', icon: Ticket },
      { label: 'Documents', href: '/documents', icon: FileText },
    ],
  },
  {
    label: 'After Sales',
    items: [
      { label: 'Refunds', href: '/refunds', icon: RotateCcw },
      { label: 'Reissues', href: '/reissues', icon: RotateCcw },
      { label: 'Cancellations', href: '/cancellations', icon: RotateCcw },
    ],
  },
  {
    label: 'Finance',
    items: [
      { label: 'Invoices', href: '/invoices', icon: Receipt },
      { label: 'Receipts', href: '/receipts', icon: Receipt },
      { label: 'Payments', href: '/payments', icon: Receipt },
      { label: 'Expenses', href: '/expenses', icon: Receipt },
      { label: 'Ledger', href: '/ledger', icon: ScrollText },
    ],
  },
  {
    label: 'HRM',
    items: [
      { label: 'Employees', href: '/employees', icon: Users },
      { label: 'Leaves', href: '/leaves', icon: CalendarClock },
      { label: 'Attendance', href: '/attendance', icon: ClipboardList },
      { label: 'Commissions', href: '/commissions', icon: DollarSign },
      { label: 'Salary Runs', href: '/salary-runs', icon: Calculator },
      { label: 'Performance', href: '/performance', icon: BarChart3 },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Settings', href: '/settings', icon: Settings },
      { label: 'Reports', href: '/reports', icon: BarChart3 },
      { label: 'Audit Log', href: '/audit-log', icon: ScrollText },
      { label: 'Notifications', href: '/notifications', icon: ScrollText },
      { label: 'Activity', href: '/activity', icon: ScrollText },
    ],
  },
];

const platformNavItems = [
  { label: 'Dashboard', href: '/platform', icon: LayoutDashboard },
  { label: 'Tenants', href: '/platform/tenants', icon: Building2 },
  { label: 'Users', href: '/platform/users', icon: Users },
  { label: 'Permissions', href: '/platform/permissions', icon: Shield },
];

function NavItem({ href, icon: Icon, label }: { href: string; icon: any; label: string }) {
  const pathname = usePathname();
  const isActive = pathname === href;
  return (
    <Link href={href} className={cn('flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors', isActive ? 'bg-accent text-accent-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground')}>
      <Icon className="h-4 w-4" />{label}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, activeTenant, logout } = useAuthStore();
  const isPlatform = pathname.startsWith('/platform');

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-sidebar flex flex-col">
      <div className="flex h-14 items-center gap-2 border-b px-4 shrink-0">
        <Plane className="h-6 w-6 text-primary" />
        <span className="font-bold text-lg">Travel Ops</span>
      </div>

      {activeTenant && !isPlatform && (
        <div className="px-4 py-2 border-b shrink-0">
          <p className="text-xs text-muted-foreground">Tenant</p>
          <p className="text-sm font-medium truncate">{activeTenant.name}</p>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto p-2 space-y-3">
        {user?.isPlatformSuperAdmin && activeTenant && !isPlatform && (
          <NavItem href="/platform" icon={Shield} label="Platform Admin" />
        )}
        {isPlatform
          ? platformNavItems.map((item) => <NavItem key={item.href} {...item} />)
          : navGroups.map((group) => (
              <div key={group.label} className="space-y-1">
                <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{group.label}</p>
                {group.items.map((item) => <NavItem key={item.href} {...item} />)}
              </div>
            ))}
      </nav>

      <Separator className="shrink-0" />

      <div className="p-4 shrink-0">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
            {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <Link href={isPlatform ? '/platform/profile' : '/profile'} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm w-full text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors">
          <UserCog className="h-4 w-4" />My Profile
        </Link>
        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={logout}>
          <LogOut className="h-4 w-4 mr-2" />Sign Out
        </Button>
      </div>
    </aside>
  );
}
