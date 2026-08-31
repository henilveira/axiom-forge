import { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { APP_FILTER } from '@nestjs/core';
import request from 'supertest';
import type { App } from 'supertest/types';
import type { AuthenticationConfig } from '../../src/modules/authentication/application/ports/authentication-config.port';
import type { AuthenticationRuntime } from '../../src/modules/authentication/application/ports/authentication-runtime.port';
import { AUTHENTICATION_RUNTIME } from '../../src/modules/authentication/application/ports/authentication-runtime.port';
import { RequestMagicLinkUseCase } from '../../src/modules/authentication/application/use-cases/request-magic-link.use-case';
import { AuthenticationEmailDeliveryAdapter } from '../../src/modules/authentication/infrastructure/email/authentication-email-delivery.adapter';
import { createDevelopmentAuthenticationRuntime } from '../../src/modules/authentication/infrastructure/composition/development-authentication-runtime.factory';
import {
  HmacFingerprintAdapter,
  NodeSessionTokenAdapter,
  SystemClock,
  SystemRandom,
} from '../../src/modules/authentication/infrastructure/crypto/node-crypto.adapter';
import { InMemoryAuthenticationRepository } from '../../src/modules/authentication/infrastructure/persistence/memory/in-memory-authentication.repository';
import { AuthenticationController } from '../../src/modules/authentication/interfaces/http/authentication.controller';
import { AuthenticationExceptionFilter } from '../../src/modules/authentication/interfaces/http/authentication.exception.filter';
import { UserAggregate } from '../../src/modules/authentication/domain/aggregates/user.aggregate';
import { NormalizedEmail } from '../../src/modules/authentication/domain/value-objects/normalized-email.value-object';
import { CapturingEmailSender } from '../test-kit/authentication-email-fakes';
import type { RateLimitPort } from '../../src/modules/authentication/application/ports/rate-limit.port';

const ACTIVE_EMAIL = 'active@example.com';
const TEST_NOW = new Date('2026-08-28T12:00:00.000Z');
const TEST_CONFIG: AuthenticationConfig = {
  fingerprintSecret: 'magic-link-delivery-test-secret-with-32-bytes',
  allowedOrigins: new Set(['http://localhost:3000']),
  cookieDomain: 'localhost',
  secureCookies: false,
  redirectPath: '/',
  termsVersion: 'v1',
  emailVerificationTtlMs: 600_000,
  emailProvider: 'in-memory',
  resendApiKey: '',
  resendEmailsReadApiKey: '',
  emailFrom: 'henrique@example.com',
  authPublicBaseUrl: 'http://localhost:3000',
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
  googleRedirectUri: 'http://localhost:3000/auth/google/callback',
};

class AllowAllRateLimit implements RateLimitPort {
  public check(): boolean {
    return true;
  }

  public record(): void {
    return undefined;
  }
}

describe('AUTH-001 magic-link delivery over controlled HTTP', () => {
  it('delivers a rendered magic-link message to an active verified user (AC-12/13, BR-06)', async () => {
    const repository = new InMemoryAuthenticationRepository();
    seedActiveUser(repository);
    const sender = new CapturingEmailSender();
    const emailDelivery = new AuthenticationEmailDeliveryAdapter(sender, {
      from: TEST_CONFIG.emailFrom,
      publicBaseUrl: TEST_CONFIG.authPublicBaseUrl,
    });
    const runtime = createRequestRuntime(repository, emailDelivery);
    const app = await bootstrap(runtime);

    try {
      await request(app.getHttpServer())
        .post('/auth/magic-link/request')
        .send({ email: ACTIVE_EMAIL })
        .expect(201, { outcome: 'ACCEPTED' });
      await flushDelivery();

      expect(sender.messages).toHaveLength(1);
      expect(sender.messages[0]?.to).toBe(ACTIVE_EMAIL);
      expect(sender.messages[0]?.metadata).toEqual({ category: 'MAGIC_LOGIN' });
      expect(sender.messages[0]?.text).toContain(
        'http://localhost:3000/auth/magic-link/consume?token=',
      );
      expect(sender.messages[0]?.html).toContain(
        'http://localhost:3000/auth/magic-link/consume?token=',
      );
    } finally {
      await app.close();
    }
  });

  it('keeps the public response uniform without invoking delivery for unknown or pending users (AC-12/13, BR-08)', async () => {
    const repository = new InMemoryAuthenticationRepository();
    const pendingUser = UserAggregate.registerWithPassword(
      {
        id: '00000000-0000-4000-8000-000000000802',
        passwordHash: 'hash'.repeat(8),
        termsVersion: 'v1',
        acceptedAt: TEST_NOW,
        occurredAt: TEST_NOW,
      },
      NormalizedEmail.from('pending@example.com'),
    );
    repository.createUser(pendingUser.snapshot);
    const sender = new CapturingEmailSender();
    const emailDelivery = new AuthenticationEmailDeliveryAdapter(sender, {
      from: TEST_CONFIG.emailFrom,
      publicBaseUrl: TEST_CONFIG.authPublicBaseUrl,
    });
    const app = await bootstrap(
      createRequestRuntime(repository, emailDelivery),
    );

    try {
      await request(app.getHttpServer())
        .post('/auth/magic-link/request')
        .send({ email: 'unknown@example.com' })
        .expect(201, { outcome: 'ACCEPTED' });
      await request(app.getHttpServer())
        .post('/auth/magic-link/request')
        .send({ email: 'pending@example.com' })
        .expect(201, { outcome: 'ACCEPTED' });
      await flushDelivery();

      expect(sender.messages).toHaveLength(0);
    } finally {
      await app.close();
    }
  });
});

function createRequestRuntime(
  repository: InMemoryAuthenticationRepository,
  emailDelivery: AuthenticationEmailDeliveryAdapter,
): AuthenticationRuntime {
  const runtime = createDevelopmentAuthenticationRuntime(TEST_CONFIG);
  const clock = new SystemClock();
  const random = new SystemRandom();
  return {
    ...runtime,
    requestMagicLink: new RequestMagicLinkUseCase({
      repository,
      clock,
      random,
      tokenPort: new NodeSessionTokenAdapter(),
      fingerprint: new HmacFingerprintAdapter(TEST_CONFIG.fingerprintSecret),
      emailDelivery,
      rateLimit: new AllowAllRateLimit(),
    }),
  };
}

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

function seedActiveUser(repository: InMemoryAuthenticationRepository): void {
  const user = UserAggregate.registerWithPassword(
    {
      id: '00000000-0000-4000-8000-000000000801',
      passwordHash: 'hash'.repeat(8),
      termsVersion: 'v1',
      acceptedAt: TEST_NOW,
      occurredAt: TEST_NOW,
    },
    NormalizedEmail.from(ACTIVE_EMAIL),
  );
  user.verifyEmail(TEST_NOW);
  repository.createUser(user.snapshot);
}

async function flushDelivery(): Promise<void> {
  await new Promise<void>((resolve) => setImmediate(resolve));
}
