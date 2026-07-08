'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Building2,
  UserCog,
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/stores/auth-store';

const tenantNavItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Branches', href: '/branches', icon: GitBranch },
  { label: 'Users', href: '/users', icon: Users },
  { label: 'Roles', href: '/roles', icon: Shield },
  { label: 'Leads', href: '/leads', icon: ClipboardList },
  { label: 'Clients', href: '/clients', icon: Building2 },
  { label: 'Follow-ups', href: '/follow-ups', icon: CalendarClock },
  { label: 'Quotations', href: '/quotations', icon: FileText },
  { label: 'Bookings', href: '/bookings', icon: Plane },
  { label: 'Tickets', href: '/tickets', icon: Ticket },
  { label: 'Invoices', href: '/invoices', icon: Receipt },
  { label: 'Reports', href: '/reports', icon: BarChart3 },
  { label: 'Audit Log', href: '/audit-log', icon: ScrollText },
  { label: 'Settings', href: '/settings', icon: Settings },
];

const platformNavItems = [
  { label: 'Dashboard', href: '/platform', icon: LayoutDashboard },
  { label: 'Tenants', href: '/platform/tenants', icon: Building2 },
  { label: 'Users', href: '/platform/users', icon: Users },
  { label: 'Permissions', href: '/platform/permissions', icon: Shield },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, activeTenant, logout } = useAuthStore();
  const isPlatform = pathname.startsWith('/platform');
  const navItems = isPlatform ? platformNavItems : tenantNavItems;

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-sidebar">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <Plane className="h-6 w-6 text-primary" />
        <span className="font-bold text-lg">Travel Ops</span>
      </div>

      {activeTenant && !isPlatform && (
        <div className="px-4 py-2 border-b">
          <p className="text-xs text-muted-foreground">Tenant</p>
          <p className="text-sm font-medium truncate">{activeTenant.name}</p>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Separator />

      <div className="p-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
            {user?.firstName?.charAt(0)}
            {user?.lastName?.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground"
          onClick={logout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
