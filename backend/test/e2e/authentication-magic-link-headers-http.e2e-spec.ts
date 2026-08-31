import { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { APP_FILTER } from '@nestjs/core';
import request from 'supertest';
import type { App } from 'supertest/types';
import type { AuthenticationConfig } from '../../src/modules/authentication/application/ports/authentication-config.port';
import type { AuthenticationRuntime } from '../../src/modules/authentication/application/ports/authentication-runtime.port';
import { AUTHENTICATION_RUNTIME } from '../../src/modules/authentication/application/ports/authentication-runtime.port';
import type { SessionResult } from '../../src/modules/authentication/application/dto/authentication-result.dto';
import type { SessionSnapshot } from '../../src/modules/authentication/domain/types/authentication.types';
import { AuthenticationError } from '../../src/modules/authentication/domain/errors/authentication.error';
import { ConsumeMagicLinkUseCase } from '../../src/modules/authentication/application/use-cases/consume-magic-link.use-case';
import { createDevelopmentAuthenticationRuntime } from '../../src/modules/authentication/infrastructure/composition/development-authentication-runtime.factory';
import { InMemoryAuthenticationRepository } from '../../src/modules/authentication/infrastructure/persistence/memory/in-memory-authentication.repository';
import {
  NodeSessionTokenAdapter,
  SystemClock,
  SystemRandom,
} from '../../src/modules/authentication/infrastructure/crypto/node-crypto.adapter';
import { AuthenticationController } from '../../src/modules/authentication/interfaces/http/authentication.controller';
import { AuthenticationExceptionFilter } from '../../src/modules/authentication/interfaces/http/authentication.exception.filter';

const TEST_CONFIG: AuthenticationConfig = {
  fingerprintSecret: 'email-regression-test-secret-with-32-bytes',
  allowedOrigins: new Set(['https://app.example.com']),
  cookieDomain: 'app.example.com',
  secureCookies: false,
  redirectPath: '/',
  termsVersion: 'v1',
  emailVerificationTtlMs: 600_000,
  emailProvider: 'in-memory',
  resendApiKey: 're_test_never_used',
  resendEmailsReadApiKey: 're_test_never_used',
  emailFrom: 'Example App <no-reply@app.example.com>',
  authPublicBaseUrl: 'https://app.example.com',
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
  googleRedirectUri: 'https://app.example.com/auth/google/callback',
};

class ControlledConsumeMagicLinkUseCase extends ConsumeMagicLinkUseCase {
  public constructor(private readonly shouldSucceed: boolean) {
    super(
      new InMemoryAuthenticationRepository(),
      new NodeSessionTokenAdapter(),
      new SystemRandom(),
      new SystemClock(),
    );
  }

  public override execute(): Promise<SessionResult> {
    if (!this.shouldSucceed) {
      return Promise.reject(
        new AuthenticationError('CHALLENGE_INVALID', 'CHALLENGE_INVALID'),
      );
    }
    return Promise.resolve({
      outcome: 'SUCCESS',
      session: successfulSession(),
      accessToken: 'access-token-for-header-test',
      refreshToken: 'refresh-token-for-header-test',
      authMethod: 'MAGIC_LINK',
    });
  }
}

describe('AUTH-001 magic-link security headers over controlled HTTP', () => {
  it('sets no-store and no-referrer on success and on invalid-token failure (AC-13/14/15)', async () => {
    const successRuntime: AuthenticationRuntime = {
      ...createDevelopmentAuthenticationRuntime(TEST_CONFIG),
      consumeMagicLink: new ControlledConsumeMagicLinkUseCase(true),
    };
    const successApp = await bootstrap(successRuntime);

    try {
      const success = await request(successApp.getHttpServer())
        .get('/auth/magic-link/consume')
        .query({ token: 'opaque-token' })
        .redirects(0)
        .expect(303);
      expect(success.headers['cache-control']).toBe('no-store');
      expect(success.headers['referrer-policy']).toBe('no-referrer');
    } finally {
      await successApp.close();
    }

    const failureRuntime: AuthenticationRuntime = {
      ...createDevelopmentAuthenticationRuntime(TEST_CONFIG),
      consumeMagicLink: new ControlledConsumeMagicLinkUseCase(false),
    };
    const failureApp = await bootstrap(failureRuntime);
    try {
      const failure = await request(failureApp.getHttpServer())
        .get('/auth/magic-link/consume')
        .query({ token: 'opaque-token' })
        .expect(401);
      expect(failure.body).toEqual({ code: 'AUTH_FAILED' });
      expect(failure.headers['cache-control']).toBe('no-store');
      expect(failure.headers['referrer-policy']).toBe('no-referrer');
    } finally {
      await failureApp.close();
    }
  });
});

async function bootstrap(
  runtime: AuthenticationRuntime,
): Promise<INestApplication<App>> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    controllers: [AuthenticationController],
    providers: [
      { provide: AUTHENTICATION_RUNTIME, useValue: runtime },
      { provide: APP_FILTER, useClass: AuthenticationExceptionFilter },
    ],
  }).compile();
  const app = moduleFixture.createNestApplication<INestApplication<App>>();
  await app.init();
  return app;
}

function successfulSession(): SessionSnapshot {
  const now = new Date('2026-08-28T12:00:00.000Z');
  return {
    id: '00000000-0000-4000-8000-000000000702',
    familyId: '00000000-0000-4000-8000-000000000703',
    userId: '00000000-0000-4000-8000-000000000701',
    authMethod: 'MAGIC_LINK',
    accessTokenHash: 'access-hash',
    refreshTokenHash: 'refresh-hash',
    refreshExpiresAt: new Date(now.getTime() + 600_000),
    status: 'ACTIVE',
    createdAt: now,
    lastRefreshedAt: null,
    revokedAt: null,
  };
}
