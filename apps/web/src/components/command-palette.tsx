'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Plus, Search, Users, Plane, Calendar, Phone, FileText, CreditCard, Globe, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Command {
  id: string;
  label: string;
  shortcut?: string;
  icon: any;
  action: () => void;
  group: string;
}

const COMMANDS: Command[] = [
  { id: 'lead-new', label: 'New Lead', shortcut: 'Alt+L', icon: Plus, action: () => {}, group: 'Create' },
  { id: 'client-new', label: 'New Client', shortcut: 'Alt+C', icon: Plus, action: () => {}, group: 'Create' },
  { id: 'followup-new', label: 'New Follow-up', shortcut: 'Alt+F', icon: Phone, action: () => {}, group: 'Create' },
  { id: 'booking-new', label: 'New Booking', shortcut: 'Alt+B', icon: Plane, action: () => {}, group: 'Create' },
  { id: 'nav-leads', label: 'Go to Leads', shortcut: 'G L', icon: Search, action: () => {}, group: 'Navigate' },
  { id: 'nav-clients', label: 'Go to Clients', shortcut: 'G C', icon: Users, action: () => {}, group: 'Navigate' },
  { id: 'nav-bookings', label: 'Go to Bookings', shortcut: 'G B', icon: Plane, action: () => {}, group: 'Navigate' },
  { id: 'nav-quotations', label: 'Go to Quotations', shortcut: 'G Q', icon: FileText, action: () => {}, group: 'Navigate' },
  { id: 'nav-invoices', label: 'Go to Invoices', shortcut: 'G I', icon: CreditCard, action: () => {}, group: 'Navigate' },
  { id: 'nav-dashboard', label: 'Go to Dashboard', shortcut: 'G D', icon: Globe, action: () => {}, group: 'Navigate' },
  { id: 'nav-ref', label: 'Reference Data', shortcut: 'G R', icon: Settings, action: () => {}, group: 'Navigate' },
  { id: 'nav-calendar', label: 'Go to Calendar', shortcut: 'G A', icon: Calendar, action: () => {}, group: 'Navigate' },
];

export function useCommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const commands = COMMANDS.map((c) => {
    const actions: Record<string, () => void> = {
      'lead-new': () => router.push('/leads/new'),
      'client-new': () => router.push('/clients'),
      'followup-new': () => router.push('/follow-ups'),
      'booking-new': () => router.push('/bookings'),
      'nav-leads': () => router.push('/leads'),
      'nav-clients': () => router.push('/clients'),
      'nav-bookings': () => router.push('/bookings'),
      'nav-quotations': () => router.push('/quotations'),
      'nav-invoices': () => router.push('/invoices'),
      'nav-dashboard': () => router.push('/dashboard'),
      'nav-ref': () => router.push('/platform/reference-data'),
      'nav-calendar': () => router.push('/calendar'),
    };
    return { ...c, action: actions[c.id] || c.action };
  });

  const toggle = useCallback(() => setOpen((o) => !o), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); toggle(); }
      if (e.altKey && e.key === 'l') { e.preventDefault(); router.push('/leads/new'); }
      if (e.altKey && e.key === 'c') { e.preventDefault(); router.push('/clients'); }
      if (e.altKey && e.key === 'f') { e.preventDefault(); setOpen(true); }
      if (e.altKey && e.key === 'b') { e.preventDefault(); router.push('/bookings'); }
      if (e.key === 'Escape' && open) { setOpen(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggle, open, router]);

  return { open, setOpen, commands };
}

export function CommandPalette({ open, onOpenChange, commands }: { open: boolean; onOpenChange: (o: boolean) => void; commands: Command[] }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) { setQuery(''); setTimeout(() => inputRef.current?.focus(), 100); } }, [open]);

  const filtered = query ? commands.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()) || c.group.toLowerCase().includes(query.toLowerCase())) : commands;
  const groups = [...new Set(filtered.map((c) => c.group))];

  const select = (cmd: Command) => { cmd.action(); onOpenChange(false); };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0">
        <div className="flex items-center gap-2 border-b px-4">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Type a command or search..." className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
        </div>
        <div className="max-h-64 overflow-y-auto p-2">
          {groups.map((group) => (
            <div key={group}>
              <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{group}</p>
              {filtered.filter((c) => c.group === group).map((cmd) => (
                <button key={cmd.id} onClick={() => select(cmd)} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors">
                  <cmd.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="flex-1 text-left">{cmd.label}</span>
                  {cmd.shortcut && <span className="text-[10px] text-muted-foreground font-mono">{cmd.shortcut}</span>}
                </button>
              ))}
            </div>
          ))}
        </div>
        <div className="border-t px-4 py-2 text-[10px] text-muted-foreground flex items-center gap-4">
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span>Esc Close</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
