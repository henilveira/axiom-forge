import { AuthenticationError } from '../../domain/errors/authentication.error';
import type { RateLimitPort } from '../ports/rate-limit.port';
import {
  AUTHENTICATION_RATE_LIMIT,
  AUTHENTICATION_RATE_LIMIT_WINDOW_MS,
} from './rate-limit.constants';

export class AuthenticationRateLimitPolicy {
  public constructor(private readonly rateLimit: RateLimitPort) {}

  public async check(
    key: string,
    limit = AUTHENTICATION_RATE_LIMIT,
    windowMs = AUTHENTICATION_RATE_LIMIT_WINDOW_MS,
  ): Promise<void> {
    const allowed = await this.rateLimit.check(key, limit, windowMs);
    if (!allowed) {
      throw new AuthenticationError('RATE_LIMITED', 'RATE_LIMITED');
    }
    await this.rateLimit.record(key, windowMs);
  }
}
