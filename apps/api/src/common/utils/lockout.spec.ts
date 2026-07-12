import { computeLockUntil, LOCKOUT_TIERS } from './lockout';

describe('computeLockUntil', () => {
  const now = 1_000_000_000_000;

  it('does not lock before the first tier threshold', () => {
    expect(computeLockUntil(0, now)).toBeNull();
    expect(computeLockUntil(4, now)).toBeNull();
  });

  it('locks for 1 minute after 5 failures', () => {
    const until = computeLockUntil(5, now);
    expect(until).not.toBeNull();
    expect(until!.getTime()).toBe(now + 60 * 1000);
  });

  it('locks for 15 minutes after 10 failures', () => {
    expect(computeLockUntil(10, now)!.getTime()).toBe(now + 15 * 60 * 1000);
  });

  it('locks for 1 hour after 15 failures', () => {
    expect(computeLockUntil(15, now)!.getTime()).toBe(now + 60 * 60 * 1000);
    expect(computeLockUntil(50, now)!.getTime()).toBe(now + 60 * 60 * 1000);
  });

  it('escalates monotonically across tiers', () => {
    const durations = LOCKOUT_TIERS.map((t) => t.lockMs);
    const sorted = [...durations].sort((a, b) => b - a);
    expect(durations).toEqual(sorted);
  });
});
