import { AuthenticationError } from '../../src/modules/authentication/domain/errors/authentication.error';
import { DoubleSubmitCsrfAdapter } from '../../src/modules/authentication/infrastructure/csrf/double-submit-csrf.adapter';
import {
  parseGoogleLinkBody,
  parseMagicLinkBody,
  parsePasswordLoginBody,
  parseRegisterBody,
} from '../../src/modules/authentication/interfaces/http/authentication.dto';
import { AuthenticationCookiePolicy } from '../../src/modules/authentication/interfaces/http/authentication-cookie.policy';
import type { HttpResponseLike } from '../../src/modules/authentication/interfaces/http/http.types';
import {
  ACCESS_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
} from '../../src/modules/authentication/interfaces/http/authentication-cookie.constants';
import type { AuthenticationConfig } from '../../src/modules/authentication/application/ports/authentication-config.port';
import type { SessionResult } from '../../src/modules/authentication/application/dto/authentication-result.dto';
import { sanitizeLifecycleRecord } from '../../src/modules/authentication/infrastructure/messaging/observability/messaging.logger';
import {
  TEST_NOW,
  TEST_PASSWORD,
  TEST_TERMS_VERSION,
} from '../test-kit/authentication.constants';

class CapturingResponse implements HttpResponseLike {
  public readonly cookies: Array<{
    readonly name: string;
    readonly value: string;
    readonly options: Readonly<Record<string, unknown>>;
  }> = [];
  public readonly clearedCookies: Array<{
    readonly name: string;
    readonly options: Readonly<Record<string, unknown>>;
  }> = [];
  public readonly headers = new Map<string, string>();
  public redirectValue: {
    readonly status: number;
    readonly url: string;
  } | null = null;
  public statusValue = 200;
  public jsonValue: unknown = null;

  public cookie(
    name: string,
    value: string,
    options: Readonly<Record<string, unknown>>,
  ): void {
    this.cookies.push({ name, value, options });
  }

  public clearCookie(
    name: string,
    options: Readonly<Record<string, unknown>>,
  ): void {
    this.clearedCookies.push({ name, options });
  }

  public setHeader(name: string, value: string): void {
    this.headers.set(name, value);
  }

  public redirect(status: number, url: string): void {
    this.redirectValue = { status, url };
  }

  public status(status: number): HttpResponseLike {
    this.statusValue = status;
    return this;
  }

  public json(body: unknown): void {
    this.jsonValue = body;
  }
}

const config: AuthenticationConfig = {
  fingerprintSecret: 'auth001-test-secret-with-at-least-32-bytes',
  allowedOrigins: new Set(['https://app.example.test']),
  cookieDomain: 'app.example.test',
  secureCookies: true,
  redirectPath: '/auth/complete',
  termsVersion: TEST_TERMS_VERSION,
  emailVerificationTtlMs: 600_000,
  emailProvider: 'in-memory',
  resendApiKey: '',
  resendEmailsReadApiKey: '',
  emailFrom: 'Example App <no-reply@app.example.test>',
  authPublicBaseUrl: 'https://app.example.test',
  emailDiagnosticsEnabled: false,
  emailDiagnosticsSecret: '',
  rabbitMqUrls: [],
  googleEnabled: false,
  googleIssuer: 'https://accounts.google.com',
  googleClientId: '',
  googleClientSecret: '',
  googleOAuthTransactionSecret: 'google-oauth-transaction-test-secret-32-bytes',
  googleAuthorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  googleTokenEndpoint: 'https://oauth2.googleapis.com/token',
  googleJwksUri: 'https://www.googleapis.com/oauth2/v3/certs',
  googleRedirectUri: 'https://app.example.test/auth/google/callback',
};

const sessionResult: SessionResult = {
  outcome: 'SUCCESS',
  accessToken: 'access-token-only-in-test',
  refreshToken: 'refresh-token-only-in-test',
  authMethod: 'PASSWORD',
  session: {
    id: '00000000-0000-4000-8000-000000000201',
    familyId: '00000000-0000-4000-8000-000000000202',
    userId: '00000000-0000-4000-8000-000000000203',
    authMethod: 'PASSWORD',
    accessTokenHash: 'a'.repeat(64),
    refreshTokenHash: 'b'.repeat(64),
    refreshExpiresAt: new Date(TEST_NOW.getTime() + 60_000),
    status: 'ACTIVE',
    createdAt: TEST_NOW,
    lastRefreshedAt: null,
    revokedAt: null,
  },
};

describe('AUTH-001 HTTP input and cookie contracts', () => {
  it('rejects non-record and incomplete request bodies without coercion', () => {
    expect(() => parseRegisterBody([])).toThrow('object-required');
    expect(() => parsePasswordLoginBody({ email: 'a' })).toThrow(
      'string-required',
    );
    expect(() => parseMagicLinkBody({ email: 42 })).toThrow('string-required');
    expect(() => parseGoogleLinkBody({})).toThrow('proof-required');
  });

  it('accepts only explicit scalar fields for password and link requests', () => {
    expect(
      parseRegisterBody({
        email: 'person@example.test',
        password: TEST_PASSWORD,
        termsVersion: TEST_TERMS_VERSION,
        empresaId: 'must-not-cross-auth-boundary',
      }),
    ).toEqual({
      email: 'person@example.test',
      password: TEST_PASSWORD,
      termsVersion: TEST_TERMS_VERSION,
    });
    expect(parseGoogleLinkBody({ password: TEST_PASSWORD })).toEqual({
      password: TEST_PASSWORD,
    });
  });

  it('emits secure cookies, explicit paths, no-store and redacted browser policy', () => {
    const response = new CapturingResponse();
    const policy = new AuthenticationCookiePolicy(config);

    policy.setSession(response, sessionResult, 'csrf-token');

    expect(response.cookies).toHaveLength(3);
    expect(response.cookies.map((cookie) => cookie.name)).toEqual([
      ACCESS_COOKIE_NAME,
      REFRESH_COOKIE_NAME,
      CSRF_COOKIE_NAME,
    ]);
    expect(response.cookies[0]?.options).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      domain: 'app.example.test',
    });
    expect(response.cookies[2]?.options).toMatchObject({ httpOnly: false });
    expect(response.headers).toEqual(
      new Map([
        ['Cache-Control', 'no-store'],
        ['Referrer-Policy', 'no-referrer'],
      ]),
    );
    expect(JSON.stringify(response.cookies)).not.toContain('Authorization');
  });

  it('requires allowed origin and matching double-submit token for mutations', () => {
    const csrf = new DoubleSubmitCsrfAdapter(config.allowedOrigins);
    expect(
      csrf.validate({
        origin: 'https://app.example.test',
        token: 'csrf-token',
        cookieToken: 'csrf-token',
      }),
    ).toBe(true);
    expect(
      csrf.validate({
        origin: 'https://evil.example.test',
        token: 'csrf-token',
        cookieToken: 'csrf-token',
      }),
    ).toBe(false);
    expect(
      csrf.validate({
        origin: 'https://app.example.test',
        token: 'csrf-token',
        cookieToken: 'different-token',
      }),
    ).toBe(false);
  });

  it('keeps authentication errors generic at the public boundary', () => {
    const error = new AuthenticationError(
      'INVALID_CREDENTIAL',
      'INVALID_CREDENTIAL',
    );
    expect(error.code).toBe('INVALID_CREDENTIAL');
    expect(error.category).toBe('INVALID_CREDENTIAL');
    expect(error.message).not.toContain(TEST_PASSWORD);
  });

  it('retains required lifecycle fields while redacting sensitive metadata', () => {
    const record = sanitizeLifecycleRecord('processed', {
      eventId: '00000000-0000-4000-8000-000000000301',
      messageId: '00000000-0000-4000-8000-000000000302',
      correlationId: '00000000-0000-4000-8000-000000000303',
      tenantId: '00000000-0000-4000-8000-000000000304',
      attempt: 2,
      outcome: 'success',
      durationMs: 12,
      occurredAt: TEST_NOW.toISOString(),
      recordedAt: TEST_NOW.toISOString(),
      password: TEST_PASSWORD,
      authorization: 'Bearer secret',
    });

    expect(record).toMatchObject({
      event: 'processed',
      eventId: '00000000-0000-4000-8000-000000000301',
      messageId: '00000000-0000-4000-8000-000000000302',
      correlationId: '00000000-0000-4000-8000-000000000303',
      tenantId: '00000000-0000-4000-8000-000000000304',
      attempt: 2,
      outcome: 'success',
      durationMs: 12,
      occurredAt: TEST_NOW.toISOString(),
      recordedAt: TEST_NOW.toISOString(),
    });
    expect(record).not.toHaveProperty('password');
    expect(record).not.toHaveProperty('authorization');
  });
});
