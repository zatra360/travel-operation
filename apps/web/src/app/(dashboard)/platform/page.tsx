'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, Shield, Activity } from 'lucide-react';

export default function PlatformDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Platform Dashboard</h2>
        <p className="text-muted-foreground">SaaS platform management overview</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Active Tenants', value: '--', icon: Building2, color: 'text-blue-600' },
          { label: 'Total Users', value: '--', icon: Users, color: 'text-emerald-600' },
          { label: 'Platform Admins', value: '--', icon: Shield, color: 'text-purple-600' },
          { label: 'Today\'s Activity', value: '--', icon: Activity, color: 'text-orange-600' },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{card.label}</CardTitle>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
