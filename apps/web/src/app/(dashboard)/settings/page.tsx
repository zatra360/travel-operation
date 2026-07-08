'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Building2, Palette, Bell, Shield, UserCog } from 'lucide-react';

const settingSections = [
  { title: 'General', description: 'Tenant name, logo, timezone, and default currency', icon: Building2 },
  { title: 'Branding', description: 'Theme colors, logo, and email templates', icon: Palette },
  { title: 'Notifications', description: 'Email, SMS, and in-app notification preferences', icon: Bell },
  { title: 'Security', description: 'Password policy, session timeout, and 2FA', icon: Shield },
  { title: 'Users & Roles', description: 'Manage team members and their permissions', icon: UserCog },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Settings</h2>

      <div className="grid gap-4 md:grid-cols-2">
        {settingSections.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.title} className="cursor-pointer hover:bg-accent/50 transition-colors">
              <CardHeader className="flex flex-row items-start gap-4">
                <div className="mt-1">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-base">{section.title}</CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Audit Log</CardTitle>
          <CardDescription>Track all changes made within your organization</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            View complete audit trail of all mutations, logins, and configuration changes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
