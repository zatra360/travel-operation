'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate } from '@/lib/utils';

interface Branch {
  id: string;
  name: string;
  code: string;
  status: string;
  address?: string;
  phone?: string;
  email?: string;
  createdAt: string;
}

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeTenant } = useAuthStore();

  useEffect(() => {
    if (!activeTenant) return;
    api.get<Branch[]>('/api/v1/tenant/branches', { tenantId: activeTenant.id })
      .then(setBranches)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeTenant]);

  if (loading) return <p className="text-muted-foreground">Loading branches...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Branches</h2>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Branch
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Branches</CardTitle>
        </CardHeader>
        <CardContent>
          {branches.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-muted-foreground">No branches yet. Create your first office location.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium">Name</th>
                    <th className="pb-3 font-medium">Code</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Contact</th>
                    <th className="pb-3 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {branches.map((branch) => (
                    <tr key={branch.id} className="border-b last:border-0">
                      <td className="py-3 font-medium">{branch.name}</td>
                      <td className="py-3 text-muted-foreground">{branch.code}</td>
                      <td className="py-3">
                        <Badge variant={branch.status === 'ACTIVE' ? 'success' : 'secondary'}>
                          {branch.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-muted-foreground">{branch.email || branch.phone || '--'}</td>
                      <td className="py-3 text-muted-foreground">{formatDate(branch.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
