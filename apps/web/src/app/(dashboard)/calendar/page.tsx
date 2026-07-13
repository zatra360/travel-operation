'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Plus, Trash2, Calendar as CalIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const EVENT_COLORS: Record<string, string> = {
  GENERAL: '#6366f1', MEETING: '#10b981', TRAVEL: '#f59e0b', DEADLINE: '#ef4444', HOLIDAY: '#8b5cf6',
};

export default function CalendarPage() {
  const { activeTenant } = useAuthStore();
  const [date, setDate] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({ title: '', type: 'GENERAL', startDate: '', allDay: false, color: '#6366f1' });
  const [holidayDialog, setHolidayDialog] = useState(false);
  const [holidayForm, setHolidayForm] = useState({ name: '', date: '' });

  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = date.toLocaleString('en', { month: 'long', year: 'numeric' });

  const from = new Date(year, month, 1).toISOString();
  const to = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

  useEffect(() => {
    if (!activeTenant) return;
    Promise.all([
      api.get(`/api/v1/tenant/calendar/events?from=${from}&to=${to}`, { tenantId: activeTenant.id }),
      api.get('/api/v1/tenant/calendar/holidays', { tenantId: activeTenant.id }),
    ]).then(([e, h]: any[]) => { setEvents(e); setHolidays(h); });
  }, [activeTenant, from, to]);

  const getEventsForDay = (day: number) => events.filter(e => {
    const d = new Date(e.startDate);
    return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
  });

  const isHoliday = (day: number) => holidays.some(h => {
    const d = new Date(h.date);
    return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
  });

  const createEvent = async () => {
    if (!form.title) return toast.error('Title required');
    try {
      await api.post('/api/v1/tenant/calendar/events', { ...form, startDate: form.startDate || new Date().toISOString() }, { tenantId: activeTenant!.id });
      toast.success('Event created');
      setDialog(false);
      const e = await api.get(`/api/v1/tenant/calendar/events?from=${from}&to=${to}`, { tenantId: activeTenant!.id });
      setEvents(e as any);
    } catch (e: any) { toast.error(e.message); }
  };

  const deleteEvent = async (id: string) => {
    try {
      await api.delete(`/api/v1/tenant/calendar/events/${id}`, { tenantId: activeTenant!.id });
      toast.success('Deleted');
      const e = await api.get(`/api/v1/tenant/calendar/events?from=${from}&to=${to}`, { tenantId: activeTenant!.id });
      setEvents(e as any);
    } catch (e: any) { toast.error(e.message); }
  };

  const addHoliday = async () => {
    if (!holidayForm.name || !holidayForm.date) return toast.error('Fill all fields');
    try {
      await api.post('/api/v1/tenant/calendar/holidays', holidayForm, { tenantId: activeTenant!.id });
      toast.success('Holiday added');
      setHolidayDialog(false);
      const h = await api.get('/api/v1/tenant/calendar/holidays', { tenantId: activeTenant!.id });
      setHolidays(h as any);
    } catch (e: any) { toast.error(e.message); }
  };

  const prevMonth = () => setDate(new Date(year, month - 1));
  const nextMonth = () => setDate(new Date(year, month + 1));

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(<div key={`e${i}`} className="h-24 border bg-muted/20" />);
  for (let d = 1; d <= daysInMonth; d++) {
    const dayEvents = getEventsForDay(d);
    const holiday = isHoliday(d);
    cells.push(
      <div key={d} className={`h-24 border p-1 text-sm ${holiday ? 'bg-warning/10' : ''} ${d === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear() ? 'ring-2 ring-primary/30' : ''}`}>
        <div className="flex items-center justify-between"><span className="font-medium">{d}</span>{holiday && <Badge variant="outline" className="text-[10px] px-1">H</Badge>}</div>
        <div className="space-y-0.5 mt-0.5">
          {dayEvents.slice(0, 2).map(e => (
            <div key={e.id} className="truncate rounded px-1 py-0.5 text-[10px] font-medium text-white flex items-center justify-between" style={{ backgroundColor: EVENT_COLORS[e.type] || e.color || '#6366f1' }}>
              <span className="truncate">{e.title}</span>
              <button onClick={() => deleteEvent(e.id)} className="opacity-60 hover:opacity-100 ml-0.5"><Trash2 className="h-2.5 w-2.5" /></button>
            </div>
          ))}
          {dayEvents.length > 2 && <span className="text-[10px] text-muted-foreground">+{dayEvents.length - 2} more</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2"><CalIcon className="h-6 w-6" />Calendar</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setHolidayDialog(true)}>Holidays</Button>
          <Button size="sm" onClick={() => { setForm({ title: '', type: 'GENERAL', startDate: '', allDay: false, color: '#6366f1' }); setDialog(true); }}><Plus className="h-4 w-4 mr-2" />Event</Button>
        </div>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <Button variant="ghost" size="sm" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
          <CardTitle className="text-lg">{monthLabel}</CardTitle>
          <Button variant="ghost" size="sm" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-px bg-border">
            {DAYS.map(d => <div key={d} className="bg-muted py-2 text-center text-xs font-medium text-muted-foreground">{d}</div>)}
            {cells}
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {Object.entries(EVENT_COLORS).map(([k, v]) => <div key={k} className="flex items-center gap-1 text-xs"><div className="h-3 w-3 rounded" style={{ backgroundColor: v }} />{k}</div>)}
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Event</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            <Input type="datetime-local" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
            <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
              {Object.keys(EVENT_COLORS).map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
            <Button onClick={createEvent}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={holidayDialog} onOpenChange={setHolidayDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Holidays</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input placeholder="Name" value={holidayForm.name} onChange={e => setHolidayForm({ ...holidayForm, name: e.target.value })} />
              <Input type="date" value={holidayForm.date} onChange={e => setHolidayForm({ ...holidayForm, date: e.target.value })} />
              <Button size="sm" onClick={addHoliday}>Add</Button>
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {holidays.map((h: any) => (
                <div key={h.id} className="flex items-center justify-between text-sm border rounded px-2 py-1">
                  <span>{h.name}</span>
                  <span className="text-xs text-muted-foreground">{new Date(h.date).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
