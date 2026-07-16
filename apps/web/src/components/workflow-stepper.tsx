'use client';

import { Check, Circle, AlertTriangle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkflowStage } from '@/lib/service-ops';

interface Props {
  stages: WorkflowStage[];
  className?: string;
}

function stageVisual(stage: WorkflowStage) {
  const overdue = stage.state === 'CURRENT' && stage.slaDueAt && new Date(stage.slaDueAt) < new Date();
  if (stage.state === 'COMPLETED') {
    return { dot: 'bg-emerald-500 border-emerald-500 text-white', label: 'text-foreground', icon: <Check className="h-3 w-3" /> };
  }
  if (stage.state === 'CURRENT' && overdue) {
    return { dot: 'bg-destructive border-destructive text-white animate-pulse', label: 'text-destructive font-semibold', icon: <AlertTriangle className="h-3 w-3" /> };
  }
  if (stage.state === 'CURRENT') {
    return { dot: 'bg-primary border-primary text-white', label: 'text-primary font-semibold', icon: <Clock className="h-3 w-3" /> };
  }
  return { dot: 'bg-background border-muted-foreground/30 text-muted-foreground', label: 'text-muted-foreground', icon: <Circle className="h-2 w-2" /> };
}

/**
 * Vertical workflow stepper distinguishing completed, current (incl.
 * overdue), and upcoming stages, grouped for scanability.
 */
export function WorkflowStepper({ stages, className }: Props) {
  return (
    <ol className={cn('space-y-0', className)}>
      {stages.map((stage, index) => {
        const visual = stageVisual(stage);
        const isLast = index === stages.length - 1;
        return (
          <li key={stage.code} className="relative flex gap-3 pb-4 last:pb-0">
            {!isLast && (
              <span
                className={cn(
                  'absolute left-[11px] top-6 h-full w-px',
                  stage.state === 'COMPLETED' ? 'bg-emerald-500/50' : 'bg-border',
                )}
              />
            )}
            <span
              className={cn(
                'relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[10px]',
                visual.dot,
              )}
            >
              {visual.icon}
            </span>
            <div className="flex min-w-0 flex-1 items-start justify-between gap-2 pt-0.5">
              <div className="min-w-0">
                <p className={cn('text-sm leading-tight', visual.label)}>{stage.name}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{stage.group.replace(/_/g, ' ')}</p>
              </div>
              <div className="shrink-0 text-right text-[10px] text-muted-foreground">
                {stage.state === 'CURRENT' && stage.slaDueAt && (
                  <p className={cn(new Date(stage.slaDueAt) < new Date() && 'text-destructive font-medium')}>
                    Due {new Date(stage.slaDueAt).toLocaleString()}
                  </p>
                )}
                {stage.completedAt && <p>Done {new Date(stage.completedAt).toLocaleDateString()}</p>}
                {stage.slaStatus === 'BREACHED' && <p className="text-destructive">SLA breached</p>}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
