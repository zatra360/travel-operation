import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';

const ALL_MODULES = [
  { key: 'lead', label: 'Leads', category: 'CRM' },
  { key: 'client', label: 'Clients', category: 'CRM' },
  { key: 'follow_up', label: 'Follow-ups', category: 'CRM' },
  { key: 'quotation', label: 'Quotations', category: 'Sales' },
  { key: 'booking', label: 'Bookings', category: 'Sales' },
  { key: 'ticket', label: 'Tickets', category: 'Sales' },
  { key: 'invoice', label: 'Invoices', category: 'Finance' },
  { key: 'receipt', label: 'Receipts', category: 'Finance' },
  { key: 'payment', label: 'Payments', category: 'Finance' },
  { key: 'expense', label: 'Expenses', category: 'Finance' },
  { key: 'ledger', label: 'Ledger', category: 'Finance' },
  { key: 'refund', label: 'Refunds', category: 'Finance' },
  { key: 'reissue', label: 'Reissues', category: 'Finance' },
  { key: 'cancellation', label: 'Cancellations', category: 'Finance' },
  { key: 'contract', label: 'Contracts', category: 'CRM' },
  { key: 'order', label: 'Orders', category: 'Sales' },
  { key: 'employee', label: 'Employees', category: 'HRM' },
  { key: 'leave', label: 'Leaves', category: 'HRM' },
  { key: 'attendance', label: 'Attendance', category: 'HRM' },
  { key: 'performance', label: 'Performance', category: 'HRM' },
  { key: 'commission', label: 'Commissions', category: 'HRM' },
  { key: 'salary_run', label: 'Salary Runs', category: 'HRM' },
  { key: 'project', label: 'Projects', category: 'Operations' },
  { key: 'task', label: 'Tasks', category: 'Operations' },
  { key: 'case', label: 'Support Cases', category: 'Support' },
  { key: 'calendar', label: 'Calendar', category: 'Tools' },
  { key: 'report', label: 'Reports', category: 'Tools' },
  { key: 'document', label: 'Documents', category: 'Tools' },
  { key: 'service_catalog', label: 'Service Catalog', category: 'Tools' },
  { key: 'tax_rate', label: 'Tax Rates', category: 'System' },
  { key: 'currency', label: 'Currencies', category: 'System' },
] as const;

export type ModuleKey = typeof ALL_MODULES[number]['key'];

const DEFAULT_ENABLED = new Set(ALL_MODULES.map(m => m.key));

let cached: Set<string> | null = null;

export function getModuleConfig(): Promise<Set<string>> {
  const { activeTenant, isAuthenticated } = useAuthStore.getState();
  if (!isAuthenticated || !activeTenant) return Promise.resolve(DEFAULT_ENABLED);
  return api.get<Record<string, any>>('/api/v1/tenant/settings', { tenantId: activeTenant.id })
    .then(data => {
      const mods = data?.modules;
      if (!mods || typeof mods !== 'object') return DEFAULT_ENABLED;
      const disabled = new Set(Object.entries(mods).filter(([, v]) => v === false).map(([k]) => k));
      const enabled = new Set(ALL_MODULES.map(m => m.key).filter(k => !disabled.has(k)));
      cached = enabled;
      return enabled;
    })
    .catch(() => DEFAULT_ENABLED);
}

export function useModuleConfig() {
  const { activeTenant, isAuthenticated } = useAuthStore();
  useEffect(() => {
    if (isAuthenticated && activeTenant) {
      getModuleConfig().then(() => {});
    }
  }, [activeTenant, isAuthenticated]);
}

export function isModuleEnabled(key: string): boolean {
  if (cached) return cached.has(key);
  const state = useAuthStore.getState();
  if (!state.isAuthenticated || !state.activeTenant) return true;
  return true;
}

export { ALL_MODULES, DEFAULT_ENABLED };
