'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { TaskItem, TimeLogEntry } from '@/lib/crm';

interface TimeLogDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tasks: TaskItem[];
  onSave: (data: TimeLogFormData) => void;
  saving: boolean;
  editingLog?: TimeLogEntry | null;
}

export interface TimeLogFormData {
  taskId: string;
  description: string;
  hours: number;
  minutes: number;
  billable: boolean;
  hourlyRate: number;
}

export function TimeLogDialog({ open, onOpenChange, tasks, onSave, saving, editingLog }: TimeLogDialogProps) {
  const [taskId, setTaskId] = useState('');
  const [description, setDescription] = useState('');
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [billable, setBillable] = useState('true');
  const [hourlyRate, setHourlyRate] = useState(0);

  useEffect(() => {
    if (!open) return;
    if (editingLog) {
      setTaskId(editingLog.taskId ?? '');
      setDescription(editingLog.description ?? '');
      setHours(Math.floor(editingLog.duration / 60));
      setMinutes(editingLog.duration % 60);
      setBillable(String(editingLog.billable));
      setHourlyRate(editingLog.hourlyRate ?? 0);
    } else {
      setTaskId('');
      setDescription('');
      setHours(0);
      setMinutes(0);
      setBillable('true');
      setHourlyRate(0);
    }
  }, [open, editingLog]);

  const handleSave = () => {
    if (!taskId || (hours === 0 && minutes === 0)) return;
    onSave({ taskId, description, hours, minutes, billable: billable === 'true', hourlyRate });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{editingLog ? 'Edit Time Log' : 'Log Time'}</DialogTitle>
          <DialogDescription>{editingLog ? 'Update the time entry' : 'Record time spent on a task'}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Task *</Label>
            <Select value={taskId} onValueChange={setTaskId}>
              <SelectTrigger>
                <SelectValue placeholder="Select task" />
              </SelectTrigger>
              <SelectContent>
                {tasks.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Duration *</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Input
                  type="number"
                  min={0}
                  max={99}
                  value={hours || ''}
                  onChange={(e) => setHours(Math.max(0, parseInt(e.target.value) || 0))}
                  placeholder="Hours"
                />
              </div>
              <div>
                <Input
                  type="number"
                  min={0}
                  max={59}
                  value={minutes || ''}
                  onChange={(e) => setMinutes(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                  placeholder="Minutes"
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Billable</Label>
              <Select value={billable} onValueChange={setBillable}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Yes</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hourly Rate</Label>
              <Input type="number" min={0} value={hourlyRate || ''} onChange={(e) => setHourlyRate(parseInt(e.target.value) || 0)} placeholder="0" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="What did you work on?" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !taskId || (hours === 0 && minutes === 0)}>
            {saving ? 'Saving…' : editingLog ? 'Update' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
