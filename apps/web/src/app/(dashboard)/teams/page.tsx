'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Combobox } from '@/components/ui/select';
import { Users, Plus, Pencil, UserPlus, X, Crown } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

interface TeamMemberInfo {
  id: string;
  role: string;
  user: { id: string; firstName: string; lastName: string; email: string };
}

interface TeamInfo {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  isActive: boolean;
  leader: { id: string; firstName: string; lastName: string } | null;
  members: TeamMemberInfo[];
  activeCases: number;
  activeItems: number;
}

export default function TeamsPage() {
  const { activeTenant } = useAuthStore();
  const [teams, setTeams] = useState<TeamInfo[]>([]);
  const [users, setUsers] = useState<Array<{ value: string; label: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TeamInfo | null>(null);
  const [memberTeam, setMemberTeam] = useState<TeamInfo | null>(null);

  const load = useCallback(() => {
    if (!activeTenant) return;
    setLoading(true);
    Promise.all([
      api.get<TeamInfo[]>('/api/v1/tenant/teams', { tenantId: activeTenant.id }),
      api.get<any[]>('/api/v1/tenant/users', { tenantId: activeTenant.id }).catch(() => []),
    ])
      .then(([t, u]) => {
        setTeams(t);
        setUsers(u.map((x) => ({ value: x.id, label: `${x.firstName} ${x.lastName}` })));
      })
      .catch((err) => toast.error(err.message || 'Failed to load teams'))
      .finally(() => setLoading(false));
  }, [activeTenant]);

  useEffect(() => { load(); }, [load]);

  const removeMember = async (team: TeamInfo, userId: string) => {
    if (!activeTenant) return;
    try {
      await api.post(`/api/v1/tenant/teams/${team.id}/members/${userId}/remove`, {}, { tenantId: activeTenant.id });
      toast.success('Member removed');
      load();
    } catch (err: any) { toast.error(err.message); }
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div>;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Teams"
        subtitle="Operational teams for service-case assignment and workload reporting"
        actions={
          <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />New Team
          </Button>
        }
      />

      {teams.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No teams yet"
          description="Create a team to group employees for case assignment and workload dashboards."
          action={<Button size="sm" variant="outline" onClick={() => setFormOpen(true)}><Plus className="mr-2 h-4 w-4" />Create your first team</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {teams.map((team) => (
            <Card key={team.id} className={!team.isActive ? 'opacity-60' : undefined}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    {team.name}
                    <Badge variant="outline" className="text-[10px]">{team.code}</Badge>
                    {!team.isActive && <Badge variant="secondary" className="text-[10px]">Inactive</Badge>}
                  </CardTitle>
                  {team.description && <p className="mt-1 text-xs text-muted-foreground">{team.description}</p>}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" title="Add member" onClick={() => setMemberTeam(team)}>
                    <UserPlus className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" title="Edit" onClick={() => { setEditing(team); setFormOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  {team.activeCases} case(s) · {team.activeItems} service item(s)
                </p>
                {team.members.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No members yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {team.members.map((m) => {
                      const isLeader = team.leader?.id === m.user.id;
                      return (
                        <span key={m.id} className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs">
                          {isLeader && <Crown className="h-3 w-3 text-amber-500" />}
                          {m.user.firstName} {m.user.lastName}
                          {!isLeader && (
                            <button
                              onClick={() => removeMember(team, m.user.id)}
                              className="ml-0.5 text-muted-foreground hover:text-destructive"
                              title="Remove member"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </span>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TeamFormDialog open={formOpen} onOpenChange={setFormOpen} team={editing} users={users} onSaved={load} />
      <AddMemberDialog team={memberTeam} onOpenChange={(o) => !o && setMemberTeam(null)} users={users} onSaved={load} />
    </div>
  );
}

function TeamFormDialog({ open, onOpenChange, team, users, onSaved }: {
  open: boolean; onOpenChange: (o: boolean) => void; team: TeamInfo | null;
  users: Array<{ value: string; label: string }>; onSaved: () => void;
}) {
  const { activeTenant } = useAuthStore();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [leaderId, setLeaderId] = useState('');
  const [saving, setSaving] = useState(false);
  const isEdit = !!team;

  useEffect(() => {
    if (open) {
      setName(team?.name ?? '');
      setCode(team?.code ?? '');
      setDescription(team?.description ?? '');
      setLeaderId(team?.leader?.id ?? '');
    }
  }, [open, team]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant) return;
    setSaving(true);
    try {
      if (isEdit && team) {
        await api.put(`/api/v1/tenant/teams/${team.id}`, { name, description: description || undefined, leaderId: leaderId || undefined }, { tenantId: activeTenant.id });
        toast.success('Team updated');
      } else {
        await api.post('/api/v1/tenant/teams', { name, code, description: description || undefined, leaderId: leaderId || undefined }, { tenantId: activeTenant.id });
        toast.success('Team created');
      }
      onOpenChange(false);
      onSaved();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save team');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Team' : 'New Team'}</DialogTitle>
          <DialogDescription>{isEdit ? 'Update team details.' : 'Group employees for assignment and reporting.'}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="team-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input id="team-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Visa Processing Team" required />
          </div>
          {!isEdit && (
            <div className="space-y-2">
              <Label htmlFor="team-code" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Code <span className="text-destructive">*</span>
              </Label>
              <Input id="team-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="VISA_OPS" required />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="team-desc" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</Label>
            <Input id="team-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Team leader</Label>
            <Combobox options={users} value={leaderId} onChange={setLeaderId} placeholder="Select leader (optional)" searchPlaceholder="Search users…" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create team'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddMemberDialog({ team, onOpenChange, users, onSaved }: {
  team: TeamInfo | null; onOpenChange: (o: boolean) => void;
  users: Array<{ value: string; label: string }>; onSaved: () => void;
}) {
  const { activeTenant } = useAuthStore();
  const [userId, setUserId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { setUserId(''); }, [team]);

  const available = users.filter((u) => !team?.members.some((m) => m.user.id === u.value));

  const submit = async () => {
    if (!activeTenant || !team || !userId) return;
    setSaving(true);
    try {
      await api.post(`/api/v1/tenant/teams/${team.id}/members`, { userId }, { tenantId: activeTenant.id });
      toast.success('Member added');
      onOpenChange(false);
      onSaved();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add member');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!team} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add member to {team?.name}</DialogTitle>
          <DialogDescription>Only active tenant members can join a team.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">User</Label>
          <Combobox options={available} value={userId} onChange={setUserId} placeholder="Select user" searchPlaceholder="Search users…" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !userId}>{saving ? 'Adding…' : 'Add member'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
