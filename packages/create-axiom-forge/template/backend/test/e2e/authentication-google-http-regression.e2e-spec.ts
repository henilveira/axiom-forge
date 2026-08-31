import cookieParser from 'cookie-parser';
import { INestApplication, LoggerService } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import type { SessionResult } from '../../src/modules/authentication/application/dto/authentication-result.dto';
import type {
  GoogleAuthorizationResult,
  GoogleCallbackInput,
  GoogleCallbackResult,
} from '../../src/modules/authentication/application/dto/google.dto';
import type { AuthenticationConfig } from '../../src/modules/authentication/application/ports/authentication-config.port';
import {
  AUTHENTICATION_RUNTIME,
  type AuthenticationRuntime,
} from '../../src/modules/authentication/application/ports/authentication-runtime.port';
import type { FingerprintPort } from '../../src/modules/authentication/application/ports/fingerprint.port';
import type { DomainRandomPort } from '../../src/modules/authentication/domain/ports/domain-random.port';
import type { AuthenticationContext } from '../../src/modules/authentication/domain/types/authentication.types';
import { AuthenticationController } from '../../src/modules/authentication/interfaces/http/authentication.controller';

const AUTHORIZATION_URL =
  'https://accounts.google.com/o/oauth2/v2/auth?client_id=local-client-id&redirect_uri=http%3A%2F%2Fapp.example.test%2Fauth%2Fgoogle%2Fcallback&response_type=code&scope=openid+email+profile&state=oauth-state-01&nonce=oauth-nonce-01&code_challenge=oauth-challenge-01&code_challenge_method=S256';
const OAUTH_STATE = 'oauth-state-01';
const LINK_ATTEMPT_ID = 'link-attempt-01';

const config: AuthenticationConfig = {
  fingerprintSecret: 'google-http-regression-secret-with-32-bytes',
  allowedOrigins: new Set(['http://app.example.test']),
  cookieDomain: 'app.example.test',
  secureCookies: false,
  redirectPath: '/login',
  termsVersion: 'v1',
  emailVerificationTtlMs: 600_000,
  emailProvider: 'in-memory',
  resendApiKey: '',
  resendEmailsReadApiKey: '',
  emailFrom: 'Example App <no-reply@app.example.test>',
  authPublicBaseUrl: 'http://app.example.test',
  emailDiagnosticsEnabled: false,
  emailDiagnosticsSecret: '',
  rabbitMqUrls: [],
  googleEnabled: true,
  googleIssuer: 'https://accounts.google.com',
  googleClientId: 'local-client-id',
  googleClientSecret: 'local-client-secret',
  googleOAuthTransactionSecret: 'google-oauth-transaction-test-secret-32-bytes',
  googleAuthorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  googleTokenEndpoint: 'https://oauth2.googleapis.com/token',
  googleJwksUri: 'https://www.googleapis.com/oauth2/v3/certs',
  googleRedirectUri: 'http://app.example.test/auth/google/callback',
};

const sessionResult: SessionResult = {
  outcome: 'SUCCESS',
  accessToken: 'access-token-01',
  refreshToken: 'refresh-token-01',
  authMethod: 'GOOGLE',
  session: {
    id: '00000000-0000-4000-8000-000000000001',
    familyId: '00000000-0000-4000-8000-000000000002',
    userId: '00000000-0000-4000-8000-000000000003',
    authMethod: 'GOOGLE',
    accessTokenHash: 'a'.repeat(64),
    refreshTokenHash: 'b'.repeat(64),
    refreshExpiresAt: new Date('2026-08-28T12:00:00.000Z'),
    status: 'ACTIVE',
    createdAt: new Date('2026-08-28T11:00:00.000Z'),
    lastRefreshedAt: null,
    revokedAt: null,
  },
};

describe('AUTH-001 Google HTTP response regressions', () => {
  let app: INestApplication<App>;
  let startGoogleExecute: jest.MockedFunction<
    (context: AuthenticationContext) => Promise<GoogleAuthorizationResult>
  >;
  let googleCallbackExecute: jest.MockedFunction<
    (input: GoogleCallbackInput) => Promise<GoogleCallbackResult>
  >;
  let callbackResult: GoogleCallbackResult;
  let fetchSpy: jest.SpyInstance;
  let logger: RecordingLogger;

  beforeEach(async () => {
    callbackResult = {
      outcome: 'LINK_REQUIRED',
      linkAttemptId: LINK_ATTEMPT_ID,
    };
    startGoogleExecute = jest.fn((): Promise<GoogleAuthorizationResult> =>
      Promise.resolve({
        outcome: 'REDIRECT',
        authorizationUrl: AUTHORIZATION_URL,
        state: OAUTH_STATE,
      }),
    );
    googleCallbackExecute = jest.fn((): Promise<GoogleCallbackResult> =>
      Promise.resolve(callbackResult),
    );
    fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('Google network must not be called'));
    logger = new RecordingLogger();

    const runtime = createRuntime(startGoogleExecute, googleCallbackExecute);
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AuthenticationController],
      providers: [{ provide: AUTHENTICATION_RUNTIME, useValue: runtime }],
    }).compile();
    app = moduleRef.createNestApplication<INestApplication<App>>();
    app.useLogger(logger);
    app.use(cookieParser());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    fetchSpy.mockRestore();
  });

  it('returns one 302 with the authorization Location and state/CSRF cookies', async () => {
    const response = await request(app.getHttpServer())
      .get('/auth/google/start')
      .expect(302);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe(AUTHORIZATION_URL);
    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`app_oauth_state=${OAUTH_STATE}`),
        expect.stringMatching(/^app_csrf=[^;]+;/),
      ]),
    );
    expect(response.headers['set-cookie']).toHaveLength(2);
    expect(response.headers['content-type']).toEqual(
      expect.stringContaining('application/json'),
    );
    expect(startGoogleExecute).toHaveBeenCalledTimes(1);
    expect(logger.errorMessages).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns one 303 for link-required and clears OAuth state before redirecting', async () => {
    const startResponse = await request(app.getHttpServer())
      .get('/auth/google/start')
      .expect(302);
    const oauthCookies = setCookiesFrom(startResponse);

    const response = await request(app.getHttpServer())
      .get('/auth/google/callback')
      .set('Cookie', oauthCookies)
      .query({ code: 'google-code-01', state: OAUTH_STATE })
      .expect(303);

    expect(response.status).toBe(303);
    expect(response.headers.location).toBe(config.redirectPath);
    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`app_google_link=${LINK_ATTEMPT_ID}`),
        expect.stringContaining('app_oauth_state=;'),
      ]),
    );
    expect(response.headers['set-cookie']).toHaveLength(2);
    expect(googleCallbackExecute).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'google-code-01', state: OAUTH_STATE }),
    );
    expect(logger.errorMessages).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns one 303 for success with session cookies and clears OAuth state/link cookies', async () => {
    callbackResult = sessionResult;
    const startResponse = await request(app.getHttpServer())
      .get('/auth/google/start')
      .expect(302);
    const oauthCookies = setCookiesFrom(startResponse);

    const response = await request(app.getHttpServer())
      .get('/auth/google/callback')
      .set('Cookie', [...oauthCookies, `app_google_link=${LINK_ATTEMPT_ID}`])
      .query({ code: 'google-code-02', state: OAUTH_STATE })
      .expect(303);

    expect(response.status).toBe(303);
    expect(response.headers.location).toBe(config.redirectPath);
    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringContaining('app_session=access-token-01'),
        expect.stringContaining('app_refresh=refresh-token-01'),
        expect.stringContaining('app_csrf='),
        expect.stringContaining('app_oauth_state=;'),
        expect.stringContaining('app_google_link=;'),
      ]),
    );
    expect(response.headers['set-cookie']).toHaveLength(5);
    expect(logger.errorMessages).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

function createRuntime(
  startGoogle: jest.MockedFunction<
    (context: AuthenticationContext) => Promise<GoogleAuthorizationResult>
  >,
  googleCallback: jest.MockedFunction<
    (input: GoogleCallbackInput) => Promise<GoogleCallbackResult>
  >,
): Pick<
  AuthenticationRuntime,
  | 'config'
  | 'random'
  | 'fingerprint'
  | 'csrf'
  | 'startGoogle'
  | 'googleCallback'
> {
  const random: DomainRandomPort = {
    bytes: (size: number): Uint8Array =>
      Uint8Array.from({ length: size }, (_value, index) => index + 1),
    id: (): string => 'correlation-id-01',
  };
  const fingerprint: FingerprintPort = {
    email: (email: string): string => `email:${email}`,
    subject: (subject: string): string => `subject:${subject}`,
    request: (value: string): string => `request:${value}`,
  };
  return {
    config,
    random,
    fingerprint,
    csrf: { validate: (): boolean => true },
    startGoogle: { execute: startGoogle },
    googleCallback: { execute: googleCallback },
  };
}

function setCookiesFrom(response: {
  headers: Record<string, string | string[]>;
}): string[] {
  const cookies = response.headers['set-cookie'];
  if (
    !Array.isArray(cookies) ||
    cookies.some((cookie) => typeof cookie !== 'string')
  ) {
    throw new Error('Expected Set-Cookie response headers');
  }
  return cookies;
}

class RecordingLogger implements LoggerService {
  public readonly errorMessages: string[] = [];

  public log(): void {}

  public error(...values: unknown[]): void {
    this.errorMessages.push(values.map((value) => String(value)).join(' '));
  }

  public warn(): void {}

  public debug(): void {}

  public verbose(): void {}

  public fatal(): void {}
}
