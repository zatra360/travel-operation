'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Menu, Moon, Sun, Search, Bell, Plus, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';
import { useEffect, useRef, useState } from 'react';

interface TopbarProps {
  onMenuToggle: () => void;
}

interface Branch {
  id: string;
  name: string;
  code: string;
}

const ALL_BRANCHES = '__all__';

const QUICK_CREATE = [
  { label: 'New Lead', href: '/leads?new=1' },
  { label: 'New Quotation', href: '/quotations?new=1' },
  { label: 'New Booking', href: '/bookings?new=1' },
  { label: 'New Client', href: '/clients?new=1' },
];

function formatCrumb(segment: string): string {
  // Hide opaque ids (cuid/uuid-like) from the breadcrumb.
  if (/^[a-z0-9]{20,}$/i.test(segment) || /^\d+$/.test(segment)) return 'Details';
  return segment
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

export function Topbar({ onMenuToggle }: TopbarProps) {
  const pathname = usePathname();
  const { activeTenant, activeBranch, setActiveBranch } = useAuthStore();
  const [isDark, setIsDark] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [quickOpen, setQuickOpen] = useState(false);
  const quickRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  useEffect(() => {
    if (!activeTenant || pathname.startsWith('/platform')) {
      setBranches([]);
      return;
    }
    let cancelled = false;
    api
      .get<Branch[]>('/api/v1/tenant/branches', { tenantId: activeTenant.id })
      .then((data) => {
        if (!cancelled) setBranches(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setBranches([]);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTenant, pathname]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (quickRef.current && !quickRef.current.contains(e.target as Node)) setQuickOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('travelo-theme', next ? 'dark' : 'light');
    } catch {
      /* ignore */
    }
  };

  const crumbs = pathname.split('/').filter(Boolean).map(formatCrumb);
  const title = crumbs[crumbs.length - 1] || 'Dashboard';
  const isPlatform = pathname.startsWith('/platform');

  const onBranchChange = (value: string) => {
    if (value === ALL_BRANCHES) {
      setActiveBranch(null);
      return;
    }
    const b = branches.find((x) => x.id === value);
    if (b) setActiveBranch({ id: b.id, name: b.name, code: b.code });
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background px-4 lg:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuToggle} aria-label="Toggle navigation">
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        <nav aria-label="Breadcrumb" className="min-w-0">
          <h1 className="truncate text-sm font-semibold">{title}</h1>
          {crumbs.length > 1 && (
            <p className="truncate text-xs text-muted-foreground">{crumbs.slice(0, -1).join(' / ')}</p>
          )}
        </nav>
      </div>

      {!isPlatform && branches.length > 0 && (
        <Select value={activeBranch?.id ?? ALL_BRANCHES} onValueChange={onBranchChange}>
          <SelectTrigger className="hidden h-9 w-44 sm:flex" aria-label="Active branch">
            <div className="flex items-center gap-2 truncate">
              <GitBranch className="h-4 w-4 shrink-0 opacity-70" />
              <SelectValue placeholder="All branches" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_BRANCHES}>All branches</SelectItem>
            {branches.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <div className="relative hidden md:flex">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search…" className="h-9 w-56 pl-8" aria-label="Search" />
      </div>

      {!isPlatform && (
        <div className="relative" ref={quickRef}>
          <Button size="sm" className="gap-1" onClick={() => setQuickOpen((v) => !v)} aria-haspopup="menu" aria-expanded={quickOpen}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Create</span>
          </Button>
          {quickOpen && (
            <div role="menu" className="absolute right-0 mt-2 w-44 rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
              {QUICK_CREATE.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  role="menuitem"
                  className="block rounded-sm px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                  onClick={() => setQuickOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      <Button asChild variant="ghost" size="icon" aria-label="Notifications">
        <Link href={isPlatform ? '/platform' : '/notifications'}>
          <Bell className="h-5 w-5" />
        </Link>
      </Button>

      <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
        {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </Button>
    </header>
  );
}
