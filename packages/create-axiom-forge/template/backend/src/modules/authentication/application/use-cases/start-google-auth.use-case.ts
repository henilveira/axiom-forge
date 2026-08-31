import type { GoogleAuthorizationResult } from '../dto/google.dto';
import type { AuthenticationContext } from '../../domain/types/authentication.types';
import type { GoogleOidcPort } from '../ports/google-oidc.port';
import type { RateLimitPort } from '../ports/rate-limit.port';
import { AuthenticationRateLimitPolicy } from '../policies/rate-limit.policy';
import { GOOGLE_START_RATE_LIMIT_KEY_PREFIX } from '../policies/rate-limit.constants';

export class StartGoogleAuthUseCase {
  public constructor(
    private readonly google: GoogleOidcPort,
    private readonly rateLimit: RateLimitPort,
  ) {}

  public async execute(
    context: AuthenticationContext,
  ): Promise<GoogleAuthorizationResult> {
    const rateLimit = new AuthenticationRateLimitPolicy(this.rateLimit);
    await rateLimit.check(
      `${GOOGLE_START_RATE_LIMIT_KEY_PREFIX}${context.browserBinding ?? 'unknown'}`,
    );
    const request = await this.google.startAuthorization(context);
    return {
      outcome: 'REDIRECT',
      authorizationUrl: request.authorizationUrl,
      state: request.state,
    };
  }
}
