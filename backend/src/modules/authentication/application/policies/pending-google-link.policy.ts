import type { RateLimitPort } from '../ports/rate-limit.port';
import { AuthenticationRateLimitPolicy } from './rate-limit.policy';
import {
  PENDING_GOOGLE_LINK_RATE_LIMIT,
  PENDING_GOOGLE_LINK_RATE_LIMIT_KEY_PREFIX,
  PENDING_GOOGLE_LINK_RATE_LIMIT_WINDOW_MS,
} from './pending-google-link.constants';

export class PendingGoogleLinkRateLimitPolicy {
  public constructor(private readonly rateLimit: RateLimitPort) {}

  public async check(userId: string): Promise<void> {
    const policy = new AuthenticationRateLimitPolicy(this.rateLimit);
    await policy.check(
      `${PENDING_GOOGLE_LINK_RATE_LIMIT_KEY_PREFIX}${userId}`,
      PENDING_GOOGLE_LINK_RATE_LIMIT,
      PENDING_GOOGLE_LINK_RATE_LIMIT_WINDOW_MS,
    );
  }
}
