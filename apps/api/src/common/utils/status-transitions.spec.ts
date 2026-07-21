import { validateStatusTransition, isTerminalStatus } from './status-transitions';

describe('validateStatusTransition', () => {
  it('allows a valid lead transition', () => {
    expect(validateStatusTransition('lead', 'NEW', 'CONTACTED').valid).toBe(true);
  });

  it('rejects an invalid lead transition and returns allowed targets', () => {
    const result = validateStatusTransition('lead', 'NEW', 'WON');
    expect(result.valid).toBe(false);
    expect(result.allowed).toContain('CONTACTED');
  });

  it('rejects transitions out of a terminal state', () => {
    expect(validateStatusTransition('lead', 'WON', 'CONTACTED').valid).toBe(false);
  });

  it('allows a valid booking lifecycle step', () => {
    expect(validateStatusTransition('booking', 'HELD', 'CONFIRMED').valid).toBe(true);
    expect(validateStatusTransition('booking', 'CONFIRMED', 'TICKETED').valid).toBe(true);
  });

  it('blocks skipping booking lifecycle steps', () => {
    expect(validateStatusTransition('booking', 'HELD', 'TICKETED').valid).toBe(false);
  });

  it('flags terminal statuses correctly', () => {
    expect(isTerminalStatus('lead', 'WON')).toBe(true);
    expect(isTerminalStatus('lead', 'NEW')).toBe(false);
  });

  describe('expense', () => {
    it('allows pending to approved', () => {
      expect(validateStatusTransition('expense', 'PENDING', 'APPROVED').valid).toBe(true);
    });

    it('allows pending to rejected', () => {
      expect(validateStatusTransition('expense', 'PENDING', 'REJECTED').valid).toBe(true);
    });

    it('rejects approved to pending', () => {
      expect(validateStatusTransition('expense', 'APPROVED', 'PENDING').valid).toBe(false);
    });

    it('blocks paid (terminal) transitions', () => {
      expect(isTerminalStatus('expense', 'PAID')).toBe(true);
      expect(validateStatusTransition('expense', 'PAID', 'REJECTED').valid).toBe(false);
    });
  });

  describe('leave', () => {
    it('allows pending to approved', () => {
      expect(validateStatusTransition('leave', 'PENDING', 'APPROVED').valid).toBe(true);
    });

    it('allows pending to rejected', () => {
      expect(validateStatusTransition('leave', 'PENDING', 'REJECTED').valid).toBe(true);
    });

    it('rejects approved to pending', () => {
      expect(validateStatusTransition('leave', 'APPROVED', 'PENDING').valid).toBe(false);
    });

    it('blocks approved (terminal) transitions', () => {
      expect(isTerminalStatus('leave', 'APPROVED')).toBe(true);
      expect(validateStatusTransition('leave', 'APPROVED', 'REJECTED').valid).toBe(false);
    });
  });

  describe('invoice', () => {
    it('allows draft to sent', () => {
      expect(validateStatusTransition('invoice', 'DRAFT', 'SENT').valid).toBe(true);
    });

    it('allows partially_paid to paid', () => {
      expect(validateStatusTransition('invoice', 'PARTIALLY_PAID', 'PAID').valid).toBe(true);
    });

    it('blocks paid (terminal) transitions', () => {
      expect(isTerminalStatus('invoice', 'PAID')).toBe(true);
    });

    it('rejects draft to paid (skipping steps)', () => {
      expect(validateStatusTransition('invoice', 'DRAFT', 'PAID').valid).toBe(false);
    });
  });

  describe('refund', () => {
    it('allows requested to under_review', () => {
      expect(validateStatusTransition('refund', 'REQUESTED', 'UNDER_REVIEW').valid).toBe(true);
    });

    it('allows rejected back to requested', () => {
      expect(validateStatusTransition('refund', 'REJECTED', 'REQUESTED').valid).toBe(true);
    });

    it('blocks processed (terminal) transitions', () => {
      expect(isTerminalStatus('refund', 'PROCESSED')).toBe(true);
    });
  });
});
