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
});
