'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Clock, UserCheck, Calendar, DollarSign, FileText, TrendingUp } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDateTime, formatDate } from '@/lib/utils';
import { Employee, Leave, Attendance, Paginated, TimelineEvent, employeeStatusVariant, leaveStatusVariant } from '@/lib/crm';

export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { activeTenant } = useAuthStore();
  const [emp, setEmp] = useState<Employee | null>(null);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [salaryRuns, setSalaryRuns] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!activeTenant) return;
    setLoading(true); setError('');
    Promise.all([
      api.get<Employee>(`/api/v1/tenant/employees/${id}`, { tenantId: activeTenant.id }),
      api.get<Paginated<Leave>>(`/api/v1/tenant/leaves?employeeId=${id}`, { tenantId: activeTenant.id }).catch(() => ({ data: [] as Leave[], total: 0, page: 1, limit: 10, totalPages: 0 })),
      api.get<Paginated<Attendance>>(`/api/v1/tenant/attendance?employeeId=${id}&limit=10`, { tenantId: activeTenant.id }).catch(() => ({ data: [] as Attendance[], total: 0, page: 1, limit: 10, totalPages: 0 })),
      api.get<Paginated<any>>(`/api/v1/tenant/commissions?employeeId=${id}&limit=10`, { tenantId: activeTenant.id }).catch(() => ({ data: [] as any[], total: 0, page: 1, limit: 10, totalPages: 0 })),
      api.get<Paginated<any>>(`/api/v1/tenant/salary-runs?limit=5`, { tenantId: activeTenant.id }).catch(() => ({ data: [] as any[], total: 0, page: 1, limit: 5, totalPages: 0 })),
      api.get<TimelineEvent[]>(`/api/v1/tenant/employees/${id}/timeline`, { tenantId: activeTenant.id }).catch(() => [] as TimelineEvent[]),
    ])
      .then(([e, l, a, c, s, tl]) => {
        setEmp(e); setLeaves(l.data || []); setAttendance(a.data || []);
        setCommissions(c.data || []); setSalaryRuns(s.data || []); setTimeline(tl);
      })
      .catch((err) => setError(err.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, [activeTenant, id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <p className="text-muted-foreground">Loading employee...</p>;
  if (error) return <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>;
  if (!emp) return <p className="text-muted-foreground">Not found.</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/employees')}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h2 className="text-2xl font-bold">{emp.firstName} {emp.lastName}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{emp.employeeCode}</Badge>
              <Badge variant={employeeStatusVariant[emp.status] || 'secondary'}>{emp.status}</Badge>
              {emp.position && <span className="text-sm text-muted-foreground">{emp.position}</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Field label="Name" value={`${emp.firstName} ${emp.lastName}`} />
            <Field label="Code" value={emp.employeeCode} />
            <Field label="Position" value={emp.position} />
            <Field label="Email" value={emp.email} />
            <Field label="Phone" value={emp.phone} />
            <Field label="Joined" value={emp.joinedAt ? formatDate(emp.joinedAt) : null} />
            <Field label="Department" value={emp.departmentId} />
            <Field label="Created" value={formatDateTime(emp.createdAt)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-4 w-4" />Commissions</CardTitle></CardHeader>
          <CardContent>
            {commissions.length === 0 ? <p className="text-sm text-muted-foreground">No commissions.</p> : (
              <ul className="space-y-2">{commissions.map((c: any) => (
                <li key={c.id} className="flex items-center justify-between border-b pb-2 last:border-0 text-sm">
                  <div><p className="font-medium">${Number(c.amount).toFixed(2)}</p><p className="text-xs text-muted-foreground">{c.sourceType} · {c.calculationBasis || '--'}</p></div>
                  <Badge>{c.status}</Badge>
                </li>
              ))}</ul>
            )}
          </CardContent>
        </Card>

        {leaves.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="h-4 w-4" />Leave</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2">{leaves.map((l) => (
                <li key={l.id} className="flex items-center justify-between border-b pb-2 last:border-0 text-sm">
                  <div><p className="font-medium">{l.leaveType}</p><p className="text-xs text-muted-foreground">{formatDate(l.startDate)} → {formatDate(l.endDate)}</p></div>
                  <Badge variant={leaveStatusVariant[l.status] || 'secondary'}>{l.status}</Badge>
                </li>
              ))}</ul>
            </CardContent>
          </Card>
        )}

        {attendance.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><UserCheck className="h-4 w-4" />Attendance</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2">{attendance.map((a) => (
                <li key={a.id} className="flex items-center justify-between border-b pb-2 last:border-0 text-sm">
                  <span className="font-medium">{formatDate(a.date)}</span>
                  <div className="flex items-center gap-2">
                    {a.clockIn && <span className="text-xs">{new Date(a.clockIn).toLocaleTimeString()}</span>}
                    {a.clockOut && <span className="text-xs">→ {new Date(a.clockOut).toLocaleTimeString()}</span>}
                    <Badge variant={a.status === 'PRESENT' ? 'success' : a.status === 'ABSENT' ? 'destructive' : 'secondary'}>{a.status}</Badge>
                  </div>
                </li>
              ))}</ul>
            </CardContent>
          </Card>
        )}

        {salaryRuns.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4" />Salary Runs</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2">{salaryRuns.map((s: any) => (
                <li key={s.id} className="flex items-center justify-between border-b pb-2 last:border-0 text-sm">
                  <div><p className="font-medium">{s.salaryRunNumber}</p><p className="text-xs text-muted-foreground">{s.period}</p></div>
                  <div className="text-right"><p className="font-medium">${Number(s.totalNet).toFixed(2)}</p><Badge>{s.status}</Badge></div>
                </li>
              ))}</ul>
            </CardContent>
          </Card>
        )}
      </div>

      <Separator />
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-4 w-4" />Activity Timeline</CardTitle></CardHeader>
        <CardContent>
          {timeline.length === 0 ? <p className="text-sm text-muted-foreground">No activity yet.</p> : (
            <ul className="space-y-3">{timeline.map((e) => (<li key={e.id} className="flex gap-3 border-b pb-3 last:border-0"><div className="mt-0.5 h-2 w-2 rounded-full bg-primary shrink-0" /><div className="flex-1 min-w-0"><p className="text-sm">{e.subject}</p><p className="text-xs text-muted-foreground mt-0.5">{e.userName} · {formatDateTime(e.createdAt)}</p></div></li>))}</ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return <div className="space-y-1"><p className="text-xs text-muted-foreground">{label}</p><p className="text-sm font-medium">{value || '--'}</p></div>;
}
