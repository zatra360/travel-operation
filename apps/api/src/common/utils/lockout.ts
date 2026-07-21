/**
 * Progressive account-lockout policy.
 *
 * Extracted from the auth service so the tier logic can be unit-tested in
 * isolation. After N consecutive failed logins the account is locked for an
 * increasing duration to slow brute-force attempts without permanently
 * locking out legitimate users.
 */
export const LOCKOUT_TIERS: { attempts: number; lockMs: number }[] = [
  { attempts: 15, lockMs: 60 * 60 * 1000 }, // 1 hour
  { attempts: 10, lockMs: 15 * 60 * 1000 }, // 15 minutes
  { attempts: 5, lockMs: 60 * 1000 }, //        1 minute
];

/**
 * Returns the lock-until date for a given consecutive failed-attempt count,
 * or `null` if the account should not (yet) be locked.
 */
export function computeLockUntil(attempts: number, now: number = Date.now()): Date | null {
  for (const tier of LOCKOUT_TIERS) {
    if (attempts >= tier.attempts) return new Date(now + tier.lockMs);
  }
  return null;
}
