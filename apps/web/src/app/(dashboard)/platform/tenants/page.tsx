'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
  _count: { branches: number; users: number };
}

export default function TenantListPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Tenant[]>('/api/v1/platform/tenants')
      .then(setTenants)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-muted-foreground">Loading tenants...</p>;

  const statusVariant = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'TRIAL': return 'warning';
      case 'SUSPENDED': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Tenants</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Tenants</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 font-medium">Name</th>
                  <th className="pb-3 font-medium">Slug</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Branches</th>
                  <th className="pb-3 font-medium">Users</th>
                  <th className="pb-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => (
                  <tr key={tenant.id} className="border-b last:border-0">
                    <td className="py-3 font-medium">{tenant.name}</td>
                    <td className="py-3 text-muted-foreground">{tenant.slug}</td>
                    <td className="py-3">
                      <Badge variant={statusVariant(tenant.status)}>{tenant.status}</Badge>
                    </td>
                    <td className="py-3">{tenant._count.branches}</td>
                    <td className="py-3">{tenant._count.users}</td>
                    <td className="py-3 text-muted-foreground">{formatDate(tenant.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
