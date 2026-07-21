import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';

const DEV_FALLBACK_SECRET = 'dev-only-insecure-secret-do-not-use-in-production';
const logger = new Logger('JwtConfig');

/**
 * Resolves the JWT signing secret.
 *
 * In production a strong secret is mandatory: if `JWT_SECRET` is missing the
 * process fails fast instead of silently signing tokens with a well-known
 * fallback (which would allow anyone to forge valid tokens).
 *
 * In non-production environments a clearly-labelled insecure fallback is used
 * so local development works without extra setup, but a warning is emitted.
 */
export function resolveJwtSecret(config: ConfigService): string {
  const secret = config.get<string>('JWT_SECRET');
  const isProduction = (config.get<string>('NODE_ENV') ?? process.env.NODE_ENV) === 'production';

  if (secret && secret.trim().length > 0) {
    if (isProduction && secret.length < 32) {
      throw new Error(
        'JWT_SECRET must be at least 32 characters in production. Refusing to start with a weak secret.',
      );
    }
    return secret;
  }

  if (isProduction) {
    throw new Error(
      'JWT_SECRET is not set. A strong JWT_SECRET is required in production. Refusing to start.',
    );
  }

  logger.warn(
    'JWT_SECRET is not set — using an insecure development-only fallback. Set JWT_SECRET before deploying.',
  );
  return DEV_FALLBACK_SECRET;
}
