'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

export default function ReportsPage() {
  return (<div className="space-y-6"><h2 className="text-2xl font-bold">Reports</h2>
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {['Sales Summary', 'Booking Report', 'Revenue Report', 'Expense Report', 'Employee Report', 'Client Report'].map((r) => (
        <Card key={r} className="cursor-pointer hover:bg-accent/50 transition-colors"><CardHeader><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4 text-muted-foreground" />{r}</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">Report module is coming soon.</p></CardContent></Card>
      ))}</div></div>);
}
