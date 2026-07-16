'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Plus, Trash2, Calendar as CalIcon, Clock, MapPin, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const EVENT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  GENERAL: { bg: '#eef2ff', text: '#4f46e5', border: '#6366f1' },
  MEETING: { bg: '#ecfdf5', text: '#059669', border: '#10b981' },
  TRAVEL: { bg: '#fffbeb', text: '#d97706', border: '#f59e0b' },
  DEADLINE: { bg: '#fef2f2', text: '#dc2626', border: '#ef4444' },
  HOLIDAY: { bg: '#f5f3ff', text: '#7c3aed', border: '#8b5cf6' },
};
const DEFAULT_COLOR = { bg: '#eef2ff', text: '#4f46e5', border: '#6366f1' };

export default function CalendarPage() {
  const { activeTenant } = useAuthStore();
  const [date, setDate] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [view, setView] = useState<'month'>('month');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [eventDetail, setEventDetail] = useState<any>(null);
  const [dialog, setDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', type: 'GENERAL', startDate: '', endDate: '', description: '', color: '#6366f1' });
  const [holidayForm, setHolidayForm] = useState({ name: '', date: '' });
  const [holidayDialog, setHolidayDialog] = useState(false);

  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const isToday = (d: number) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  useEffect(() => {
    if (!activeTenant) return;
    const from = new Date(year, month, 1).toISOString();
    const to = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
    Promise.all([
      api.get(`/api/v1/tenant/calendar/events?from=${from}&to=${to}`, { tenantId: activeTenant.id }),
      api.get('/api/v1/tenant/calendar/holidays', { tenantId: activeTenant.id }),
    ]).then(([e, h]: any[]) => { setEvents(e); setHolidays(h); });
  }, [activeTenant, year, month]);

  const refresh = () => {
    if (!activeTenant) return;
    const from = new Date(year, month, 1).toISOString();
    const to = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
    api.get(`/api/v1/tenant/calendar/events?from=${from}&to=${to}`, { tenantId: activeTenant.id }).then((data: any) => setEvents(data));
    api.get('/api/v1/tenant/calendar/holidays', { tenantId: activeTenant.id }).then((data: any) => setHolidays(data));
  };

  const getEventsForDay = (day: number) => events.filter(e => {
    const d = new Date(e.startDate);
    return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
  });

  const getHolidayForDay = (day: number) => holidays.find(h => {
    const d = new Date(h.date);
    return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
  });

  const saveEvent = async () => {
    if (!form.title) return toast.error('Title required');
    try {
      const payload = { ...form, startDate: form.startDate || new Date().toISOString() };
      if (editId) await api.put(`/api/v1/tenant/calendar/events/${editId}`, payload, { tenantId: activeTenant!.id });
      else await api.post('/api/v1/tenant/calendar/events', payload, { tenantId: activeTenant!.id });
      toast.success(editId ? 'Updated' : 'Created');
      setDialog(false); setEditId(null);
      refresh();
    } catch (e: any) { toast.error(e.message); }
  };

  const deleteEvent = async (id: string) => {
    await api.delete(`/api/v1/tenant/calendar/events/${id}`, { tenantId: activeTenant!.id });
    toast.success('Deleted');
    setEventDetail(null);
    refresh();
  };

  const openCreate = (day?: number) => {
    const d = day ? new Date(year, month, day, 9) : new Date();
    setForm({ title: '', type: 'GENERAL', startDate: d.toISOString().slice(0, 16), endDate: '', description: '', color: '#6366f1' });
    setEditId(null);
    setDialog(true);
  };

  const openEdit = (e: any) => {
    setForm({
      title: e.title, type: e.type || 'GENERAL',
      startDate: e.startDate ? new Date(e.startDate).toISOString().slice(0, 16) : '',
      endDate: e.endDate ? new Date(e.endDate).toISOString().slice(0, 16) : '',
      description: e.description || '', color: e.color || '#6366f1',
    });
    setEditId(e.id);
    setDialog(true);
  };

  const addHoliday = async () => {
    if (!holidayForm.name || !holidayForm.date) return toast.error('Fill all fields');
    try {
      await api.post('/api/v1/tenant/calendar/holidays', holidayForm, { tenantId: activeTenant!.id });
      toast.success('Holiday added');
      setHolidayDialog(false);
      setHolidayForm({ name: '', date: '' });
      refresh();
    } catch (e: any) { toast.error(e.message); }
  };

  const prevMonth = () => setDate(new Date(year, month - 1));
  const nextMonth = () => setDate(new Date(year, month + 1));
  const goToday = () => setDate(new Date());

  const upcoming = events
    .filter(e => new Date(e.startDate) >= new Date())
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 8);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold tracking-tight">Calendar</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToday}>Today</Button>
          <Button size="sm" onClick={() => openCreate()}><Plus className="h-4 w-4 mr-1" />Event</Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
                <CardTitle className="text-lg min-w-[180px] text-center">{MONTHS[month]} {year}</CardTitle>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
              </div>
              <div className="hidden sm:flex items-center gap-1">
                {(['month'] as const).map(v => (
                  <Button key={v} size="sm" variant={view === v ? 'secondary' : 'ghost'} className="h-7 text-xs capitalize" onClick={() => setView(v)}>{v}</Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7">
                {DAYS.map(d => <div key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground border-b">{d}</div>)}
              </div>
              <div className="grid grid-cols-7">
                {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} className="h-28 border-b border-r bg-muted/10" />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const d = i + 1;
                  const dayEvents = getEventsForDay(d);
                  const holiday = getHolidayForDay(d);
                  const isCurrentDay = isToday(d);
                  return (
                    <div
                      key={d}
                      className={`h-28 border-b border-r p-1 text-sm cursor-pointer hover:bg-muted/30 transition-colors group ${isCurrentDay ? 'bg-primary/5 ring-1 ring-primary/20' : ''}`}
                      onClick={() => { setSelectedDay(d); openCreate(d); }}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={`font-semibold text-xs ${isCurrentDay ? 'bg-primary text-primary-foreground rounded-full h-6 w-6 flex items-center justify-center' : ''}`}>{d}</span>
                        {holiday && <span className="text-[9px] text-warning font-medium" title={holiday.name}>🎌</span>}
                      </div>
                      <div className="space-y-0.5">
                        {dayEvents.slice(0, 3).map(e => {
                          const c = EVENT_COLORS[e.type] || DEFAULT_COLOR;
                          return (
                            <div
                              key={e.id}
                              className="truncate rounded px-1.5 py-0.5 text-[10px] font-medium cursor-pointer hover:opacity-80"
                              style={{ backgroundColor: c.bg, color: c.text, borderLeft: `2px solid ${c.border}` }}
                              onClick={e => { e.stopPropagation(); setEventDetail(e); }}
                            >
                              {e.startDate && <span className="opacity-70 mr-1">{new Date(e.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                              {e.title}
                            </div>
                          );
                        })}
                        {dayEvents.length > 3 && <span className="text-[10px] text-muted-foreground px-1">+{dayEvents.length - 3}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-3 mt-3 text-xs">
                {Object.entries(EVENT_COLORS).map(([k, c]) => (
                  <div key={k} className="flex items-center gap-1.5">
                    <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: c.bg, borderLeft: `2px solid ${c.border}` }} />
                    <span className="text-muted-foreground">{k}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Upcoming Events</CardTitle></CardHeader>
            <CardContent>
              {upcoming.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No upcoming events</p>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {upcoming.map(e => {
                    const c = EVENT_COLORS[e.type] || DEFAULT_COLOR;
                    return (
                      <div key={e.id} className="rounded-lg border p-2.5 cursor-pointer hover:shadow-sm transition-shadow" onClick={() => setEventDetail(e)}>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: c.border }} />
                          <span className="font-medium text-sm truncate">{e.title}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(e.startDate).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>
                          {e.endDate && <span>{new Date(e.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Holidays</CardTitle>
              <Plus className="h-3.5 w-3.5 text-muted-foreground cursor-pointer" onClick={() => {
                setHolidayForm({ name: '', date: new Date().toISOString().slice(0, 10) });
                setHolidayDialog(true);
              }} />
            </CardHeader>
            <CardContent>
              {holidays.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No holidays</p>
              ) : (
                <div className="space-y-1 max-h-[240px] overflow-y-auto">
                  {holidays.map((h: any) => (
                    <div key={h.id} className="flex items-center justify-between text-sm px-2 py-1.5 rounded hover:bg-muted/50">
                      <span className="truncate text-xs">{h.name}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{new Date(h.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? 'Edit Event' : 'New Event'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Event name" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Start</Label><Input type="datetime-local" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} /></div>
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">End</Label><Input type="datetime-local" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} /></div>
            </div>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</Label>
              <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                {Object.keys(EVENT_COLORS).map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional" /></div>
          </div>
          <DialogFooter>
            {editId && <Button variant="destructive" size="sm" className="mr-auto" onClick={() => { deleteEvent(editId); setDialog(false); }}><Trash2 className="h-3 w-3 mr-1" />Delete</Button>}
            <Button variant="outline" onClick={() => { setDialog(false); setEditId(null); }}>Cancel</Button>
            <Button onClick={saveEvent}>{editId ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!eventDetail} onOpenChange={() => setEventDetail(null)}>
        <DialogContent className="max-w-sm">
          {eventDetail && (() => {
            const c = EVENT_COLORS[eventDetail.type] || DEFAULT_COLOR;
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: c.border }} />
                    {eventDetail.title}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{new Date(eventDetail.startDate).toLocaleString()}</span>
                    {eventDetail.endDate && <span>→ {new Date(eventDetail.endDate).toLocaleString()}</span>}
                  </div>
                  <Badge variant="outline">{eventDetail.type}</Badge>
                  {eventDetail.description && <p className="text-muted-foreground">{eventDetail.description}</p>}
                </div>
                <DialogFooter className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { openEdit(eventDetail); setEventDetail(null); }}>Edit</Button>
                  <Button variant="destructive" size="sm" onClick={() => deleteEvent(eventDetail.id)}><Trash2 className="h-3 w-3 mr-1" />Delete</Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={holidayDialog} onOpenChange={setHolidayDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Holiday</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</Label><Input value={holidayForm.name} onChange={e => setHolidayForm({ ...holidayForm, name: e.target.value })} placeholder="Eid ul-Fitr" /></div>
            <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</Label><Input type="date" value={holidayForm.date} onChange={e => setHolidayForm({ ...holidayForm, date: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHolidayDialog(false)}>Cancel</Button>
            <Button onClick={addHoliday}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
