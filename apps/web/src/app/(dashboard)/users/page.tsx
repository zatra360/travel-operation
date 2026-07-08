'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeTenant } = useAuthStore();

  useEffect(() => {
    if (activeTenant) {
      api.get<User[]>('/api/v1/platform/users')
        .then(setUsers)
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [activeTenant]);

  if (loading) return <p className="text-muted-foreground">Loading users...</p>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Users</h2>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {users.map((user) => (
              <Card key={user.id}>
                <CardContent className="flex items-center gap-4 pt-6">
                  <Avatar>
                    <AvatarFallback>
                      {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={user.status === 'ACTIVE' ? 'success' : 'secondary'} className="text-xs">
                        {user.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(user.createdAt)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
