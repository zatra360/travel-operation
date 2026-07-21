import { Injectable } from '@nestjs/common';

export interface SlaRule {
  stage: string;
  hours: number;
  escalatePriorityTo: string;
}

const DEFAULT_SLA_RULES: SlaRule[] = [
  { stage: 'NEW', hours: 24, escalatePriorityTo: 'HIGH' },
  { stage: 'CONTACTED', hours: 48, escalatePriorityTo: 'HIGH' },
  { stage: 'QUALIFIED', hours: 72, escalatePriorityTo: 'HIGH' },
  { stage: 'QUOTATION_SENT', hours: 72, escalatePriorityTo: 'URGENT' },
  { stage: 'NEGOTIATION', hours: 168, escalatePriorityTo: 'URGENT' },
];

@Injectable()
export class SlaService {
  private rules: SlaRule[] = DEFAULT_SLA_RULES;

  getRule(stage: string): SlaRule | undefined {
    return this.rules.find((r) => r.stage === stage);
  }

  calculateDueAt(stage: string, from: Date = new Date()): Date | null {
    const rule = this.getRule(stage);
    if (!rule) return null;
    return new Date(from.getTime() + rule.hours * 60 * 60 * 1000);
  }

  getSlaStatus(stage: string, dueAt: Date | null): { status: string; minutesRemaining: number; isBreached: boolean; isWarning: boolean } {
    if (!dueAt) return { status: 'NO_SLA', minutesRemaining: 0, isBreached: false, isWarning: false };

    const rule = this.getRule(stage);
    if (!rule) return { status: 'NO_SLA', minutesRemaining: 0, isBreached: false, isWarning: false };

    const now = Date.now();
    const due = dueAt.getTime();
    const minutesRemaining = Math.round((due - now) / 60000);
    const totalMinutes = rule.hours * 60;
    const percentRemaining = minutesRemaining / totalMinutes;

    if (now > due) return { status: 'BREACHED', minutesRemaining, isBreached: true, isWarning: false };
    if (percentRemaining <= 0.25) return { status: 'WARNING', minutesRemaining, isBreached: false, isWarning: true };
    return { status: 'ON_TRACK', minutesRemaining, isBreached: false, isWarning: false };
  }

  getEscalatedPriority(stage: string): string | null {
    const rule = this.getRule(stage);
    return rule?.escalatePriorityTo || null;
  }

  isTerminal(stage: string): boolean {
    return stage === 'WON' || stage === 'LOST' || stage === 'DUPLICATE' || stage === 'SPAM';
  }
}
