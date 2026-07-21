'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/select';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Employee, EMPLOYEE_STATUSES } from '@/lib/crm';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  employee?: Employee | null;
  onSaved: () => void;
}

interface FormState {
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  position: string;
  status: string;
  userId: string;
  departmentId: string;
  joinedAt: string;
}

const empty: FormState = {
  employeeCode: '', firstName: '', lastName: '', email: '', phone: '',
  position: '', status: 'ACTIVE', userId: '', departmentId: '', joinedAt: '',
};

export function EmployeeFormDialog({ open, onOpenChange, employee, onSaved }: Props) {
  const { activeTenant } = useAuthStore();
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [users, setUsers] = useState<Array<{ value: string; label: string }>>([]);
  const isEdit = !!employee;

  useEffect(() => {
    if (!open || !activeTenant) return;
    api.get<any[]>('/api/v1/tenant/users', { tenantId: activeTenant.id })
      .then((res) => setUsers(res.map((u: any) => ({ value: u.id, label: `${u.firstName} ${u.lastName} (${u.email})` }))))
      .catch(() => setUsers([]));
    setError('');
    setForm(
      employee
        ? {
            employeeCode: employee.employeeCode,
            firstName: employee.firstName,
            lastName: employee.lastName,
            email: employee.email ?? '',
            phone: employee.phone ?? '',
            position: employee.position ?? '',
            status: employee.status,
            userId: (employee as any).userId ?? '',
            departmentId: (employee as any).departmentId ?? '',
            joinedAt: employee.joinedAt?.split('T')[0] ?? '',
          }
        : empty,
    );
  }, [open, employee, activeTenant]);

  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant) return;
    if (!form.employeeCode.trim() || !form.firstName.trim() || !form.lastName.trim()) {
      setError('Code, first name, and last name are required');
      return;
    }
    setSaving(true);
    setError('');
    const payload: Record<string, unknown> = {
      employeeCode: form.employeeCode.trim(),
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      position: form.position.trim() || undefined,
      status: form.status,
      userId: form.userId || undefined,
      departmentId: form.departmentId || undefined,
      joinedAt: form.joinedAt || undefined,
    };
    try {
      if (isEdit && employee) {
        await api.put(`/api/v1/tenant/employees/${employee.id}`, payload, { tenantId: activeTenant.id });
        toast.success('Employee updated');
      } else {
        await api.post('/api/v1/tenant/employees', payload, { tenantId: activeTenant.id });
        toast.success('Employee created');
      }
      onOpenChange(false);
      onSaved();
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Employee' : 'New Employee'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update employee details. Link a platform user account for login access.'
              : 'Register a new employee. Optionally link a platform user account.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Employee Code <span className="text-destructive">*</span>
              </Label>
              <Input value={form.employeeCode} onChange={(e) => set('employeeCode', e.target.value)} placeholder="EMP-001" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</Label>
              <Select value={form.status} onValueChange={(v) => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EMPLOYEE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                First Name <span className="text-destructive">*</span>
              </Label>
              <Input value={form.firstName} onChange={(e) => set('firstName', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Last Name <span className="text-destructive">*</span>
              </Label>
              <Input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</Label>
              <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone</Label>
              <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Position</Label>
              <Input value={form.position} onChange={(e) => set('position', e.target.value)} placeholder="Visa Officer" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Joined date</Label>
              <Input type="date" value={form.joinedAt} onChange={(e) => set('joinedAt', e.target.value)} />
            </div>
          </div>

          <div className="rounded-lg border p-3 space-y-3 bg-muted/30">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Platform User Account</p>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Link a platform user so the employee can log in. Passwords are managed via{' '}
                <strong>Settings → Users</strong> — this form only links the account.
              </Label>
              <Combobox
                options={users}
                value={form.userId}
                onChange={(v) => set('userId', v)}
                placeholder="Select platform user (optional)"
                searchPlaceholder="Search by name or email…"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create employee'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
