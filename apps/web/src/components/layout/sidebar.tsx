'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Users, Building2, Shield, ClipboardList, Plane, Ticket,
  Receipt, BarChart3, Settings, FileText, GitBranch, ScrollText, LogOut,
  CalendarClock, UserCog, Undo2, RefreshCw, XCircle, CreditCard, DollarSign,
  Calculator, Bell, Activity, Package, Percent, Coins,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAuthStore, hasPermission } from '@/stores/auth-store';
import { brand } from '@/lib/brand';

const navGroups = [
  {
    label: 'Core',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Branches', href: '/branches', icon: GitBranch, perm: 'BRANCH_READ' },
      { label: 'Users', href: '/users', icon: Users, perm: 'USER_READ' },
      { label: 'Roles', href: '/roles', icon: Shield, perm: 'ROLE_READ' },
    ],
  },
  {
    label: 'CRM',
    items: [
      { label: 'Leads', href: '/leads', icon: ClipboardList, perm: 'LEAD_READ' },
      { label: 'Clients', href: '/clients', icon: Building2, perm: 'CLIENT_READ' },
      { label: 'Follow-ups', href: '/follow-ups', icon: CalendarClock, perm: 'FOLLOW_UP_READ' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Quotations', href: '/quotations', icon: FileText, perm: 'QUOTATION_READ' },
      { label: 'Bookings', href: '/bookings', icon: Plane, perm: 'BOOKING_READ' },
      { label: 'Tickets', href: '/tickets', icon: Ticket, perm: 'TICKET_READ' },
      { label: 'Documents', href: '/documents', icon: FileText, perm: 'DOCUMENT_READ' },
    ],
  },
  {
    label: 'After Sales',
    items: [
      { label: 'Refunds', href: '/refunds', icon: Undo2, perm: 'REFUND_READ' },
      { label: 'Reissues', href: '/reissues', icon: RefreshCw, perm: 'REISSUE_READ' },
      { label: 'Cancellations', href: '/cancellations', icon: XCircle, perm: 'CANCELLATION_READ' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { label: 'Invoices', href: '/invoices', icon: FileText, perm: 'INVOICE_READ' },
      { label: 'Receipts', href: '/receipts', icon: Receipt, perm: 'RECEIPT_READ' },
      { label: 'Payments', href: '/payments', icon: CreditCard, perm: 'PAYMENT_READ' },
      { label: 'Expenses', href: '/expenses', icon: DollarSign, perm: 'EXPENSE_READ' },
      { label: 'Ledger', href: '/ledger', icon: ScrollText, perm: 'LEDGER_READ' },
    ],
  },
  {
    label: 'HRM',
    items: [
      { label: 'Employees', href: '/employees', icon: Users, perm: 'EMPLOYEE_READ' },
      { label: 'Leaves', href: '/leaves', icon: CalendarClock, perm: 'LEAVE_READ' },
      { label: 'Attendance', href: '/attendance', icon: ClipboardList, perm: 'ATTENDANCE_READ' },
      { label: 'Commissions', href: '/commissions', icon: DollarSign, perm: 'COMMISSION_READ' },
      { label: 'Salary Runs', href: '/salary-runs', icon: Calculator, perm: 'SALARY_RUN_READ' },
      { label: 'Performance', href: '/performance', icon: BarChart3, perm: 'PERFORMANCE_READ' },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Service Catalog', href: '/service-catalog', icon: Package },
      { label: 'Tax Rates', href: '/tax-rates', icon: Percent },
      { label: 'Currencies', href: '/currencies', icon: Coins },
      { label: 'Settings', href: '/settings', icon: Settings, perm: 'SETTINGS_READ' },
      { label: 'Reports', href: '/reports', icon: BarChart3, perm: 'REPORT_READ' },
      { label: 'Audit Log', href: '/audit-log', icon: ScrollText, perm: 'AUDIT_LOG_READ' },
      { label: 'Notifications', href: '/notifications', icon: Bell },
      { label: 'Activity', href: '/activity', icon: Activity },
    ],
  },
];

const platformNavItems = [
  { label: 'Dashboard', href: '/platform', icon: LayoutDashboard },
  { label: 'Companies', href: '/platform/tenants', icon: Building2 },
  { label: 'Users', href: '/platform/users', icon: Users },
  { label: 'Permissions', href: '/platform/permissions', icon: Shield },
];

function NavItem({ href, icon: Icon, label }: { href: string; icon: any; label: string }) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== '/dashboard' && href !== '/platform' && pathname.startsWith(href + '/'));
  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, activeTenant, logout, permissions } = useAuthStore();
  const isPlatform = pathname.startsWith('/platform');
  const hasPerms = permissions.length > 0 || user?.isPlatformSuperAdmin;

  // Only filter nav items by permission once permissions have been loaded from the server.
  const visibleGroups = hasPerms
    ? navGroups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => !('perm' in item) || hasPermission((item as any).perm)),
        }))
        .filter((group) => group.items.length > 0)
    : navGroups;

  return (
    <aside className="h-screen w-64 border-r border-sidebar-border bg-sidebar flex flex-col">
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4 shrink-0">
        <Plane className="h-6 w-6 text-primary" />
        <span className="font-bold text-lg text-sidebar-foreground truncate">{brand.shortName}</span>
      </div>

      {activeTenant && !isPlatform && (
        <div className="px-4 py-2 border-b border-sidebar-border shrink-0">
          <p className="text-xs text-sidebar-foreground/60">Company</p>
          <p className="text-sm font-medium truncate text-sidebar-foreground">{activeTenant.name}</p>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto p-2 space-y-3">
        {user?.isPlatformSuperAdmin && activeTenant && !isPlatform && (
          <NavItem href="/platform" icon={Shield} label="Platform Admin" />
        )}
        {isPlatform
          ? platformNavItems.map((item) => <NavItem key={item.href} {...item} />)
          : visibleGroups.map((group) => (
              <div key={group.label} className="space-y-1">
                <p className="px-3 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">{group.label}</p>
                {group.items.map((item) => <NavItem key={item.href} {...item} />)}
              </div>
            ))}
      </nav>

      <Separator className="shrink-0 bg-sidebar-border" />

      <div className="p-4 shrink-0">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-medium">
            {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-sidebar-foreground">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-sidebar-foreground/60 truncate">{user?.email}</p>
          </div>
        </div>
        <Link href={isPlatform ? '/platform/profile' : '/profile'} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm w-full text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors">
          <UserCog className="h-4 w-4" />My Profile
        </Link>
        <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" onClick={logout}>
          <LogOut className="h-4 w-4 mr-2" />Sign Out
        </Button>
      </div>
    </aside>
  );
}
