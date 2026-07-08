'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';

interface Permission {
  id: string;
  name: string;
  module: string;
  action: string;
  description: string | null;
}

export default function PlatformPermissionsPage() {
  const [permissions, setPermissions] = useState<Record<string, Permission[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Record<string, Permission[]>>('/api/v1/platform/permissions')
      .then(setPermissions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-muted-foreground p-6">Loading permissions...</p>;

  const totalCount = Object.values(permissions).flat().length;
  const modules = Object.keys(permissions).sort();
  const actionColors: Record<string, 'default' | 'success' | 'warning' | 'info' | 'destructive'> = {
    CREATE: 'success',
    READ: 'info',
    UPDATE: 'warning',
    DELETE: 'destructive',
    MANAGE: 'default',
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Permissions</h2>
        <p className="text-muted-foreground">
          {totalCount} total permissions across {modules.length} modules
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {modules.map((mod) => (
          <Card key={mod}>
            <CardHeader>
              <CardTitle className="text-sm">{mod.replace(/_/g, ' ')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {permissions[mod].map((p) => (
                  <div key={p.id} className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{p.description || p.name}</span>
                    <Badge variant={actionColors[p.action] || 'outline'} className="text-xs">
                      {p.action}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
