import type { AuthenticationContext } from '../../../src/modules/authentication/domain/types/authentication.types';
import type { DomainClockPort } from '../../../src/modules/authentication/domain/ports/domain-clock.port';
import type { DomainRandomPort } from '../../../src/modules/authentication/domain/ports/domain-random.port';
import type { GoogleOidcConfig } from '../../../src/modules/authentication/infrastructure/external/google/google.types';
import { GoogleOidcAdapter } from '../../../src/modules/authentication/infrastructure/external/google/google-oidc.adapter';
import { InMemoryGoogleTransactionStore } from '../../../src/modules/authentication/infrastructure/external/google/in-memory-google-transaction.store';

class FixedClock implements DomainClockPort {
  public now(): Date {
    return new Date('2026-08-27T12:00:00.000Z');
  }

  public at(millisecondsFromNow: number): Date {
    return new Date(this.now().getTime() + millisecondsFromNow);
  }

  public refreshTtlMs(): number {
    return 2_592_000_000;
  }
}

class FixedRandom implements DomainRandomPort {
  public bytes(size: number): Buffer {
    return Buffer.alloc(size, 1);
  }

  public id(): string {
    return 'id';
  }
}

const context: AuthenticationContext = {
  correlationId: 'correlation-1',
  browserBinding: 'browser-1',
};

const googleConfig: GoogleOidcConfig = {
  enabled: true,
  issuer: 'https://accounts.google.com',
  clientId: 'client-id',
  clientSecret: 'client-secret',
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  jwksUri: 'https://www.googleapis.com/oauth2/v3/certs',
  redirectUri: 'https://app.example.com/auth/google/callback',
};

const googleTransaction = {
  authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  state: 'state-1',
  nonce: 'nonce-1',
  codeVerifier: 'v'.repeat(43),
  expiresAt: new Date('2026-08-27T12:10:00.000Z'),
  browserBinding: 'browser-1',
  correlationId: context.correlationId,
};

describe('Google OIDC boundary', () => {
  it('creates an exact redirect with state, nonce and S256 PKCE without exposing the secret', async () => {
    const transactions = new InMemoryGoogleTransactionStore();
    const adapter = new GoogleOidcAdapter(
      {
        enabled: true,
        issuer: 'https://accounts.google.com',
        clientId: 'client-id',
        clientSecret: 'client-secret',
        authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenEndpoint: 'https://oauth2.googleapis.com/token',
        jwksUri: 'https://www.googleapis.com/oauth2/v3/certs',
        redirectUri: 'https://app.example.com/auth/google/callback',
      },
      new FixedRandom(),
      new FixedClock(),
      transactions,
    );
    const result = await adapter.startAuthorization(context);
    const url = new URL(result.authorizationUrl);
    expect(url.origin).toBe('https://accounts.google.com');
    expect(url.searchParams.get('redirect_uri')).toBe(
      'https://app.example.com/auth/google/callback',
    );
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('scope')).toBe('openid email profile');
    expect(result.authorizationUrl).not.toContain('client-secret');
    expect(
      transactions.consume(result.state, new FixedClock().now()),
    ).toMatchObject({
      codeVerifier: result.codeVerifier,
    });
    expect(
      transactions.consume(result.state, new FixedClock().now()),
    ).toBeNull();
  });

  it('rejects provider redirects through the fetch redirect policy', async () => {
    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new TypeError('redirect disallowed'));
    const adapter = new GoogleOidcAdapter(
      googleConfig,
      new FixedRandom(),
      new FixedClock(),
      new InMemoryGoogleTransactionStore(),
    );

    await expect(
      adapter.exchangeAndValidate('code-1', googleTransaction, context),
    ).rejects.toMatchObject({
      code: 'PROVIDER_UNAVAILABLE',
      category: 'PROVIDER_UNAVAILABLE',
    });
    expect(fetchSpy).toHaveBeenCalledWith(
      googleConfig.tokenEndpoint,
      expect.objectContaining({ redirect: 'error' }),
    );
    fetchSpy.mockRestore();
  });

  it('rejects discovery endpoints that differ from the configured Google endpoints', async () => {
    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id_token: 'header.payload.signature' }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            issuer: googleConfig.issuer,
            authorization_endpoint: googleConfig.authorizationEndpoint,
            token_endpoint: googleConfig.tokenEndpoint,
            jwks_uri: 'https://attacker.example/jwks',
          }),
          { status: 200 },
        ),
      );
    const adapter = new GoogleOidcAdapter(
      googleConfig,
      new FixedRandom(),
      new FixedClock(),
      new InMemoryGoogleTransactionStore(),
    );

    await expect(
      adapter.exchangeAndValidate('code-2', googleTransaction, context),
    ).rejects.toMatchObject({ code: 'OAUTH_INVALID' });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy.mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({ redirect: 'error' }),
    );
    fetchSpy.mockRestore();
  });
});
