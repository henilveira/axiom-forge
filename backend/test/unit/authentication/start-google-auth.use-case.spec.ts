import type { AuthenticationContext } from '../../../src/modules/authentication/domain/types/authentication.types';
import type {
  GoogleAuthorizationRequest,
  GoogleClaims,
  GoogleOidcPort,
} from '../../../src/modules/authentication/application/ports/google-oidc.port';
import type { RateLimitPort } from '../../../src/modules/authentication/application/ports/rate-limit.port';
import { StartGoogleAuthUseCase } from '../../../src/modules/authentication/application/use-cases/start-google-auth.use-case';

const context: AuthenticationContext = {
  correlationId: 'correlation-1',
  browserBinding: 'browser-binding-1',
};

const authorizationRequest: GoogleAuthorizationRequest = {
  authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth?state=s',
  state: 'state-1',
  nonce: 'nonce-1',
  codeVerifier: 'verifier-1',
  expiresAt: new Date('2026-08-28T12:10:00.000Z'),
  browserBinding: context.browserBinding,
  correlationId: context.correlationId,
};

describe('StartGoogleAuthUseCase', () => {
  it('rate-limits by the server-derived browser binding before starting Google', async () => {
    const events: string[] = [];
    const rateLimit = new RecordingRateLimit(events);
    const google = new RecordingGoogle(events);
    const useCase = new StartGoogleAuthUseCase(google, rateLimit);

    await expect(useCase.execute(context)).resolves.toEqual({
      outcome: 'REDIRECT',
      authorizationUrl: authorizationRequest.authorizationUrl,
      state: authorizationRequest.state,
    });

    expect(events).toEqual([
      'rate-limit-check',
      'rate-limit-record',
      'google-start',
    ]);
    expect(rateLimit.checks).toEqual([
      {
        key: 'google-start:browser-binding-1',
        limit: 5,
        windowMs: 60_000,
      },
    ]);
    expect(rateLimit.records).toEqual([
      { key: 'google-start:browser-binding-1', windowMs: 60_000 },
    ]);
  });

  it('does not create an OAuth transaction when the start bucket is exhausted', async () => {
    const events: string[] = [];
    const rateLimit = new RecordingRateLimit(events);
    rateLimit.allowed = false;
    const google = new RecordingGoogle(events);
    const useCase = new StartGoogleAuthUseCase(google, rateLimit);

    await expect(useCase.execute(context)).rejects.toMatchObject({
      code: 'RATE_LIMITED',
      category: 'RATE_LIMITED',
    });
    expect(events).toEqual(['rate-limit-check']);
    expect(rateLimit.records).toEqual([]);
  });
});

class RecordingRateLimit implements RateLimitPort {
  public allowed = true;
  public readonly checks: Array<{
    readonly key: string;
    readonly limit: number;
    readonly windowMs: number;
  }> = [];
  public readonly records: Array<{
    readonly key: string;
    readonly windowMs: number;
  }> = [];

  public constructor(private readonly events: string[]) {}

  public check(key: string, limit: number, windowMs: number): boolean {
    this.events.push('rate-limit-check');
    this.checks.push({ key, limit, windowMs });
    return this.allowed;
  }

  public record(key: string, windowMs: number): void {
    this.events.push('rate-limit-record');
    this.records.push({ key, windowMs });
  }
}

class RecordingGoogle implements GoogleOidcPort {
  public constructor(private readonly events: string[]) {}

  public startAuthorization(): Promise<GoogleAuthorizationRequest> {
    this.events.push('google-start');
    return Promise.resolve(authorizationRequest);
  }

  public exchangeAndValidate(): Promise<GoogleClaims> {
    return Promise.reject(new Error('not used in this test'));
  }
}
