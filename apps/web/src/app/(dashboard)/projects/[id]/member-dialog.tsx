'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { ProjectMember } from '@/lib/crm';

const MEMBER_ROLES = ['ADMIN', 'MANAGER', 'MEMBER', 'VIEWER'] as const;

interface TenantUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  membershipRole?: string;
}

export function MemberDialog({
  open, onOpenChange, projectId, editing, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  editing: ProjectMember | null;
  onSaved: () => void;
}) {
  const { activeTenant } = useAuthStore();
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState('MEMBER');
  const [hourlyRate, setHourlyRate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setUserId(editing.userId);
      setRole(editing.role);
      setHourlyRate(editing.hourlyRate != null ? String(editing.hourlyRate) : '');
    } else {
      setUserId('');
      setRole('MEMBER');
      setHourlyRate('');
    }
    if (!editing && activeTenant) {
      setLoadingUsers(true);
      api.get<TenantUser[]>('/api/v1/tenant/users', { tenantId: activeTenant.id })
        .then(setUsers)
        .catch(() => toast.error('Failed to load users'))
        .finally(() => setLoadingUsers(false));
    }
  }, [open, editing, activeTenant]);

  const handleSave = async () => {
    if (!activeTenant) return;
    if (!editing && !userId) { toast.error('Please select a user'); return; }
    setSaving(true);
    try {
      if (editing) {
        await api.put(
          `/api/v1/tenant/projects/members/${editing.id}`,
          { role, hourlyRate: hourlyRate ? Number(hourlyRate) : undefined },
          { tenantId: activeTenant.id },
        );
        toast.success('Member updated');
      } else {
        await api.post(
          `/api/v1/tenant/projects/${projectId}/members`,
          { userId, role, hourlyRate: hourlyRate ? Number(hourlyRate) : undefined },
          { tenantId: activeTenant.id },
        );
        toast.success('Member added');
      }
      onOpenChange(false);
      onSaved();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save member');
    } finally {
      setSaving(false);
    }
  };

  const existingUser = users.find((u) => u.id === userId);
  const availableUsers = users;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Member' : 'Add Member'}</DialogTitle>
          <DialogDescription>
            {editing ? 'Update the member role and hourly rate' : 'Add a user to this project'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {editing ? (
            <div className="rounded-md bg-muted/30 p-3 text-sm">
              <span className="font-medium">{editing.user.firstName} {editing.user.lastName}</span>
              <span className="text-muted-foreground ml-2">{editing.user.email}</span>
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">User</Label>
              {loadingUsers ? (
                <div className="text-sm text-muted-foreground">Loading users…</div>
              ) : (
                <Select value={userId} onValueChange={setUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.length === 0 && (
                      <SelectItem value="" disabled>No users available</SelectItem>
                    )}
                    {availableUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.firstName} {u.lastName} — {u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {existingUser && (
                <p className="text-xs text-muted-foreground">
                  Role in tenant: {existingUser.membershipRole ?? 'N/A'}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Project Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MEMBER_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hourly Rate</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              placeholder="e.g. 50.00"
            />
            <p className="text-xs text-muted-foreground">Optional. Used for cost calculations.</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Update' : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
