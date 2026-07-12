'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { activeTenant, activeBranch, setPermissions, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !activeTenant) return;
    let cancelled = false;
    api
      .get<{ permissions: string[]; isPlatformSuperAdmin: boolean }>('/api/v1/auth/permissions', {
        tenantId: activeTenant.id,
        branchId: activeBranch?.id,
      })
      .then((res) => {
        if (!cancelled) setPermissions(res.permissions, res.isPlatformSuperAdmin);
      })
      .catch(() => {
        if (!cancelled) setPermissions([], false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTenant?.id, activeBranch?.id, isAuthenticated, setPermissions]);

  return (
    <div className="min-h-screen">
      <div
        className={cn(
          'fixed inset-0 z-30 bg-background/80 backdrop-blur-sm lg:hidden',
          sidebarOpen ? 'block' : 'hidden',
        )}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      <div
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 transition-transform lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <Sidebar />
      </div>

      <div className="lg:pl-64">
        <Topbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <main className="h-[calc(100vh-3.5rem)] overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
