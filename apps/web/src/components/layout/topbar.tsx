'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, Moon, Sun, Search, Bell, Plus, GitBranch, Building2, ChevronDown, User, ClipboardList, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  { label: 'New Lead', href: '/leads/new' },
  { label: 'New Client', href: '/clients' },
  { label: 'New Follow-up', href: '/follow-ups' },
  { label: 'New Quotation', href: '/quotations/new' },
  { label: 'New Booking', href: '/bookings' },
];

function formatCrumb(segment: string): string {
  // Hide opaque cuid/uuid-like ids (25+ char alphanumeric), not document numbers.
  if (/^[a-z0-9]{25,}$/i.test(segment)) return '';
  return segment
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

export function Topbar({ onMenuToggle }: TopbarProps) {
  const pathname = usePathname();
  const { activeTenant, activeBranch, setActiveBranch, tenants, setActiveTenant } = useAuthStore();
  const [isDark, setIsDark] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [quickOpen, setQuickOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const router = useRouter();
  const searchRef = useRef<HTMLDivElement>(null);
  const quickRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  useEffect(() => {
    if (!activeTenant) return;
    const fetch = () => {
      api.get<{ unread: number }>('/api/v1/tenant/notifications/count', { tenantId: activeTenant.id }).then(r => setUnread(r.unread || 0)).catch(() => {});
      if (notifOpen) {
        api.get<any>('/api/v1/tenant/notifications?limit=10', { tenantId: activeTenant.id }).then(r => setNotifications(r.data || [])).catch(() => {});
      }
    };
    fetch();
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, [activeTenant, notifOpen]);

  useEffect(() => {
    if (!activeTenant || searchQuery.length < 2) { setSearchResults([]); setSearchOpen(false); return; }
    setSearchOpen(true); setSearching(true);
    const timer = setTimeout(() => {
      api.get<any>(`/api/v1/tenant/search?q=${encodeURIComponent(searchQuery)}`, { tenantId: activeTenant.id })
        .then((res) => {
          if (res.hits?.length) {
            setSearchResults(res.hits.map((h: any) => ({ ...h, id: h.id.split(':').pop() })));
          } else {
            Promise.all([
              api.get<any>(`/api/v1/tenant/leads?search=${encodeURIComponent(searchQuery)}&limit=5`, { tenantId: activeTenant.id }).catch(() => ({ data: [] })),
              api.get<any>(`/api/v1/tenant/clients?search=${encodeURIComponent(searchQuery)}&limit=5`, { tenantId: activeTenant.id }).catch(() => ({ data: [] })),
            ]).then(([leads, clients]: any[]) => {
              setSearchResults([
                ...((leads.data || []).map((l: any) => ({ ...l, _type: 'lead' }))),
                ...((clients.data || []).map((c: any) => ({ ...c, _type: 'client' }))),
              ].slice(0, 10));
            });
          }
          setSearching(false);
        })
        .catch(() => setSearching(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, activeTenant]);

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

  const crumbs = pathname.split('/').filter(Boolean).map(formatCrumb).filter(Boolean);
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
        {!isPlatform && tenants.length > 1 && (
          <Select value={activeTenant?.id ?? ''} onValueChange={(v) => { if (v) { const t = tenants.find(x => x.id === v); if (t) setActiveTenant(t); } }}>
            <SelectTrigger className="h-7 w-auto px-2 gap-1 text-xs border-0 bg-muted/30 hover:bg-muted/50" aria-label="Switch company">
              {(activeTenant as any)?.logo ? <img src={(activeTenant as any).logo} alt="" className="h-4 w-4 rounded object-contain" /> : <Building2 className="h-3 w-3 shrink-0 opacity-60" />}
              <SelectValue placeholder={activeTenant?.name ?? 'Select'} />
            </SelectTrigger>
            <SelectContent>
              {tenants.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name} <span className="text-muted-foreground ml-1 text-[10px]">({t.role})</span></SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {!isPlatform && tenants.length <= 1 && activeTenant && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            {(activeTenant as any)?.logo ? <img src={(activeTenant as any).logo} alt="" className="h-4 w-4 rounded object-contain" /> : <Building2 className="h-3 w-3 opacity-60" />}
            {activeTenant.name}
          </span>
        )}
      </div>

      {!isPlatform && branches.length > 1 && (
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

      <div className="relative hidden md:flex" ref={searchRef}>
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground z-10" />
        <Input
          placeholder="Search leads & clients…"
          className="h-9 w-56 pl-8"
          aria-label="Search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => { if (searchResults.length > 0) setSearchOpen(true); }}
          onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
        />
        {searchOpen && (
          <div className="absolute top-full mt-1 w-80 bg-popover border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
            {searching && <p className="p-3 text-sm text-muted-foreground">Searching…</p>}
            {!searching && searchResults.length === 0 && searchQuery.length >= 2 && (
              <p className="p-3 text-sm text-muted-foreground">No results</p>
            )}
            {searchResults.map((r: any) => (
              <button
                key={r.id}
                className="flex items-center gap-3 w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                onMouseDown={(e) => {
                  e.preventDefault();
                  router.push(r._type === 'lead' ? `/leads/${r.id}` : `/clients/${r.id}`);
                  setSearchOpen(false);
                  setSearchQuery('');
                }}
              >
                {r._type === 'lead' ? <ClipboardList className="h-4 w-4 text-muted-foreground shrink-0" /> : <User className="h-4 w-4 text-muted-foreground shrink-0" />}
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{r.fullName || r.displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">{r._type === 'lead' ? 'Lead' : 'Client'}{r.email ? ` · ${r.email}` : ''}{r.companyName ? ` · ${r.companyName}` : ''}</p>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0">{r.status}</Badge>
              </button>
            ))}
          </div>
        )}
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

      <div className="relative">
        <Button asChild variant="ghost" size="icon" aria-label="Notifications" className="relative" onClick={() => setNotifOpen(!notifOpen)}>
          <button type="button">
            <Bell className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </button>
        </Button>
        {notifOpen && (
          <div className="absolute right-0 top-full mt-1 w-80 bg-popover border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
            <div className="p-3 border-b flex items-center justify-between">
              <span className="font-semibold text-sm">Notifications</span>
              <Link href="/notifications" className="text-xs text-primary hover:underline" onClick={() => setNotifOpen(false)}>View all</Link>
            </div>
            {notifications.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground text-center">No notifications</p>
            ) : (
              notifications.map(n => (
                <div key={n.id} className={`px-3 py-2.5 border-b last:border-0 text-sm ${!n.isRead ? 'bg-primary/5' : ''}`}>
                  <p className="font-medium">{n.title}</p>
                  {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
        {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </Button>
    </header>
  );
}
