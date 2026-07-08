'use client';

import { useState } from 'react';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { cn } from '@/lib/utils';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <div className={cn(
        'fixed inset-0 z-30 bg-background/80 backdrop-blur-sm lg:hidden',
        sidebarOpen ? 'block' : 'hidden',
      )} onClick={() => setSidebarOpen(false)} />

      <div className={cn(
        'fixed inset-y-0 left-0 z-40 w-64 -translate-x-full transition-transform lg:translate-x-0',
        sidebarOpen && 'translate-x-0',
      )}>
        <Sidebar />
      </div>

      <div className="lg:pl-64">
        <Topbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
