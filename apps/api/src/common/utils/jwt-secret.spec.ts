import { resolveJwtSecret } from './jwt-secret';

function makeConfig(values: Record<string, string | undefined>) {
  return {
    get: <T>(key: string): T | undefined => values[key] as unknown as T,
  } as unknown as import('@nestjs/config').ConfigService;
}

describe('resolveJwtSecret', () => {
  const strong = 'a'.repeat(48);

  it('returns the configured secret when strong', () => {
    expect(resolveJwtSecret(makeConfig({ JWT_SECRET: strong, NODE_ENV: 'production' }))).toBe(strong);
  });

  it('throws in production when the secret is missing', () => {
    expect(() => resolveJwtSecret(makeConfig({ NODE_ENV: 'production' }))).toThrow(/JWT_SECRET is not set/);
  });

  it('throws in production when the secret is too weak', () => {
    expect(() => resolveJwtSecret(makeConfig({ JWT_SECRET: 'short', NODE_ENV: 'production' }))).toThrow(
      /at least 32 characters/,
    );
  });

  it('falls back to a dev-only secret outside production', () => {
    const secret = resolveJwtSecret(makeConfig({ NODE_ENV: 'development' }));
    expect(typeof secret).toBe('string');
    expect(secret.length).toBeGreaterThan(0);
  });

  it('never returns the old hardcoded production placeholder', () => {
    const secret = resolveJwtSecret(makeConfig({ NODE_ENV: 'development' }));
    expect(secret).not.toBe('dev-secret-change-in-production');
  });
});
