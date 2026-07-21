'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, UserCheck, UserX, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

const COLS = ['#10b981', '#ef4444', '#f59e0b', '#0ea5e9'];

export default function AttendanceReportPage() {
  const { activeTenant } = useAuthStore();
  const [data, setData] = useState<any>(null);
  useEffect(() => { if (activeTenant) api.get('/api/v1/tenant/reports/attendance', { tenantId: activeTenant.id }).then(setData); }, [activeTenant]);
  if (!data) return <Skeleton className="h-96" />;
  const chart = [
    { name: 'Present', value: data.present }, { name: 'Absent', value: data.absent },
    { name: 'Late', value: data.late }, { name: 'Half Day', value: data.halfDay },
  ];
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Attendance Report</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Records" value={data.total} icon={Users} tone="info" />
        <StatCard label="Present" value={data.present} icon={UserCheck} tone="success" />
        <StatCard label="Absent" value={data.absent} icon={UserX} tone="destructive" />
        <StatCard label="Rate" value={`${data.attendanceRate}%`} icon={Clock} tone="warning" />
      </div>
      <Card>
        <CardHeader><CardTitle>This Month</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chart}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="name" /><YAxis /><Tooltip />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>{chart.map((_: any, i: number) => <Cell key={i} fill={COLS[i]} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
