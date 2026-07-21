'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Plus, Trash2, Settings } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

const MODULES = ['LEAD', 'CLIENT', 'DEAL', 'INVOICE', 'PROJECT', 'TASK', 'EMPLOYEE'];
const TYPES = ['TEXT', 'NUMBER', 'DATE', 'SELECT', 'BOOLEAN'];

export default function CustomFieldsPage() {
  const { activeTenant } = useAuthStore();
  const [fields, setFields] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ module: 'LEAD', name: '', type: 'TEXT', options: '', required: false });

  const load = () => {
    if (!activeTenant) return;
    api.get('/api/v1/tenant/settings/custom-fields', { tenantId: activeTenant.id }).then((d: any) => setFields(d)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [activeTenant]);

  const add = async () => {
    if (!form.name) return toast.error('Name required');
    try {
      await api.post('/api/v1/tenant/settings/custom-fields', {
        module: form.module, name: form.name.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
        label: form.name, fieldType: form.type, options: form.options ? form.options.split(',').map(s => s.trim()) : [],
        isRequired: form.required,
      }, { tenantId: activeTenant!.id });
      toast.success('Field added');
      setForm({ module: 'LEAD', name: '', type: 'TEXT', options: '', required: false });
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const remove = async (id: string) => {
    try { await api.delete(`/api/v1/tenant/settings/custom-fields/${id}`, { tenantId: activeTenant!.id }); toast.success('Removed'); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  if (loading) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-6">
      <PageHeader title="Custom Fields" subtitle="Add custom fields to forms across the platform" />
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Settings className="h-4 w-4" />Add Field</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <select className="border rounded-md px-2 py-1.5 text-sm bg-background" value={form.module} onChange={e => setForm({ ...form, module: e.target.value })}>{MODULES.map(m => <option key={m} value={m}>{m}</option>)}</select>
            <select className="border rounded-md px-2 py-1.5 text-sm bg-background" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>{TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select>
            <Input placeholder="Field name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-40" />
            {form.type === 'SELECT' && <Input placeholder="Options (comma separated)" value={form.options} onChange={e => setForm({ ...form, options: e.target.value })} className="w-48" />}
            <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={form.required} onChange={e => setForm({ ...form, required: e.target.checked })} /> Required</label>
            <Button size="sm" onClick={add}><Plus className="h-4 w-4 mr-1" />Add</Button>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-2">
        {MODULES.filter(m => fields.some(f => f.module === m)).map(mod => (
          <div key={mod}>
            <h3 className="text-sm font-semibold text-muted-foreground mb-1">{mod}</h3>
            <div className="grid gap-1">
              {fields.filter(f => f.module === mod).map((f: any) => (
                <div key={f.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{f.label}</span>
                    <Badge variant="outline" className="text-xs">{f.fieldType}</Badge>
                    {f.isRequired && <Badge variant="destructive" className="text-xs">Required</Badge>}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => remove(f.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                </div>
              ))}
            </div>
          </div>
        ))}
        {fields.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">No custom fields defined.</p>}
      </div>
    </div>
  );
}
