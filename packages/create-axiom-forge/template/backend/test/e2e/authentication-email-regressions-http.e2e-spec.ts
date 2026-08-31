import { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { APP_FILTER } from '@nestjs/core';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AuthenticationController } from '../../src/modules/authentication/interfaces/http/authentication.controller';
import { AuthenticationExceptionFilter } from '../../src/modules/authentication/interfaces/http/authentication.exception.filter';
import { AUTHENTICATION_RUNTIME } from '../../src/modules/authentication/application/ports/authentication-runtime.port';
import type { AuthenticationRuntime } from '../../src/modules/authentication/application/ports/authentication-runtime.port';
import type { AuthenticationConfig } from '../../src/modules/authentication/application/ports/authentication-config.port';
import type { DomainClockPort } from '../../src/modules/authentication/domain/ports/domain-clock.port';
import type { DomainRandomPort } from '../../src/modules/authentication/domain/ports/domain-random.port';
import type { PasswordHasherPort } from '../../src/modules/authentication/application/ports/password-hasher.port';
import type { RateLimitPort } from '../../src/modules/authentication/application/ports/rate-limit.port';
import type { EmailDeliveryPort } from '../../src/modules/authentication/application/ports/email-delivery.port';
import { RegisterWithPasswordUseCase } from '../../src/modules/authentication/application/use-cases/register-with-password.use-case';
import { RequestMagicLinkUseCase } from '../../src/modules/authentication/application/use-cases/request-magic-link.use-case';
import { createDevelopmentAuthenticationRuntime } from '../../src/modules/authentication/infrastructure/composition/development-authentication-runtime.factory';
import { InMemoryPasswordBlocklist } from '../../src/modules/authentication/infrastructure/crypto/node-crypto.adapter';
import {
  HmacFingerprintAdapter,
  NodeSessionTokenAdapter,
  SystemClock,
  SystemRandom,
} from '../../src/modules/authentication/infrastructure/crypto/node-crypto.adapter';
import { InMemoryAuthenticationRepository } from '../../src/modules/authentication/infrastructure/persistence/memory/in-memory-authentication.repository';
import { UserAggregate } from '../../src/modules/authentication/domain/aggregates/user.aggregate';
import { NormalizedEmail } from '../../src/modules/authentication/domain/value-objects/normalized-email.value-object';

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

const TEST_PASSWORD = 'A sufficiently long password';
const ACTIVE_EMAIL = 'active@example.com';

class FixedPasswordHasher implements PasswordHasherPort {
  public readonly dummyHash = 'dummy-password-hash';

  public hash(password: string): string {
    return `hash:${password}`;
  }

  public verify(password: string, encodedHash: string): boolean {
    return encodedHash === `hash:${password}`;
  }
}

class AllowAllRateLimit implements RateLimitPort {
  public check(): boolean {
    return true;
  }

  public record(): void {
    return undefined;
  }
}

class DeferredFailureEmailDelivery implements EmailDeliveryPort {
  public verificationInput:
    | {
        readonly email: string;
        readonly token: string;
        readonly expiresAt: Date;
      }
    | undefined;
  public magicLinkInput:
    | {
        readonly email: string;
        readonly token: string;
        readonly expiresAt: Date;
      }
    | undefined;
  public readonly verificationStarted: Promise<void>;
  public readonly magicLinkStarted: Promise<void>;

  private resolveVerificationStarted: (() => void) | undefined;
  private resolveMagicLinkStarted: (() => void) | undefined;
  private rejectVerification: ((reason: Error) => void) | undefined;
  private rejectMagicLink: ((reason: Error) => void) | undefined;

  public constructor() {
    this.verificationStarted = new Promise<void>((resolve) => {
      this.resolveVerificationStarted = resolve;
    });
    this.magicLinkStarted = new Promise<void>((resolve) => {
      this.resolveMagicLinkStarted = resolve;
    });
  }

  public sendVerification(input: {
    readonly email: string;
    readonly token: string;
    readonly expiresAt: Date;
  }): Promise<void> {
    this.verificationInput = input;
    this.resolveVerificationStarted?.();
    return new Promise<void>((_resolve, reject) => {
      this.rejectVerification = reject;
    });
  }

  public sendMagicLink(input: {
    readonly email: string;
    readonly token: string;
    readonly expiresAt: Date;
  }): Promise<void> {
    this.magicLinkInput = input;
    this.resolveMagicLinkStarted?.();
    return new Promise<void>((_resolve, reject) => {
      this.rejectMagicLink = reject;
    });
  }

  public failVerification(): void {
    this.rejectVerification?.(new Error('provider detail must stay private'));
  }

  public failMagicLink(): void {
    this.rejectMagicLink?.(new Error('provider detail must stay private'));
  }
}

describe('AUTH-001 e-mail delivery HTTP regressions', () => {
  it('keeps registration uniform while a delayed Resend failure revokes the issued challenge (AC-01/02, BR-08)', async () => {
    const repository = new InMemoryAuthenticationRepository();
    const delivery = new DeferredFailureEmailDelivery();
    const revokeChallenge = jest.spyOn(repository, 'revokeChallenge');
    const runtime = createFailureRuntime(repository, delivery);
    const app = await bootstrap(runtime);

    try {
      const firstRequest = request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'new-registration@example.com',
          password: TEST_PASSWORD,
          termsVersion: 'v1',
        })
        .then((response) => response);
      await delivery.verificationStarted;
      const firstResponse = await responseBeforeProviderRelease(firstRequest);
      expect(firstResponse.status).toBe(201);
      expect(firstResponse.body).toEqual({ outcome: 'ACCEPTED' });

      delivery.failVerification();
      await waitForChallengeRevocation(
        () => revokeChallenge.mock.calls.length > 0,
      );

      const registration = delivery.verificationInput;
      expect(registration).toBeDefined();
      await expect(
        repository.withTransaction((transaction) =>
          transaction.consumeChallenge(
            new NodeSessionTokenAdapter().hash(registration?.token ?? ''),
            'EMAIL_VERIFICATION',
            new Date(),
          ),
        ),
      ).resolves.toBeNull();

      const duplicateResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'new-registration@example.com',
          password: TEST_PASSWORD,
          termsVersion: 'v1',
        })
        .expect(201);
      expect(duplicateResponse.body).toEqual(firstResponse.body);
    } finally {
      await app.close();
    }
  });

  it('keeps magic-link responses uniform and returns before a delayed Resend failure revokes the challenge (AC-12/14, BR-06/08)', async () => {
    const repository = new InMemoryAuthenticationRepository();
    seedActiveUser(repository);
    const delivery = new DeferredFailureEmailDelivery();
    const revokeChallenge = jest.spyOn(repository, 'revokeChallenge');
    const runtime = createFailureRuntime(repository, delivery);
    const app = await bootstrap(runtime);

    try {
      const unknownResponse = await request(app.getHttpServer())
        .post('/auth/magic-link/request')
        .send({ email: 'unknown@example.com' })
        .expect(201);
      expect(unknownResponse.body).toEqual({ outcome: 'ACCEPTED' });

      const knownRequest = request(app.getHttpServer())
        .post('/auth/magic-link/request')
        .send({ email: ACTIVE_EMAIL })
        .then((response) => response);
      await delivery.magicLinkStarted;
      const knownResponse = await responseBeforeProviderRelease(knownRequest);
      expect(knownResponse.status).toBe(201);
      expect(knownResponse.body).toEqual(unknownResponse.body);

      delivery.failMagicLink();
      await waitForChallengeRevocation(
        () => revokeChallenge.mock.calls.length > 0,
      );

      const magicLink = delivery.magicLinkInput;
      expect(magicLink).toBeDefined();
      await expect(
        repository.withTransaction((transaction) =>
          transaction.consumeChallenge(
            new NodeSessionTokenAdapter().hash(magicLink?.token ?? ''),
            'MAGIC_LOGIN',
            new Date(),
          ),
        ),
      ).resolves.toBeNull();
    } finally {
      await app.close();
    }
  });
});

function createFailureRuntime(
  repository: InMemoryAuthenticationRepository,
  emailDelivery: EmailDeliveryPort,
): AuthenticationRuntime {
  const runtime = createDevelopmentAuthenticationRuntime(TEST_CONFIG);
  const clock: DomainClockPort = new SystemClock();
  const random: DomainRandomPort = new SystemRandom();
  const tokenPort = new NodeSessionTokenAdapter();
  const fingerprint = new HmacFingerprintAdapter(TEST_CONFIG.fingerprintSecret);
  const dependencies = {
    repository,
    clock,
    random,
    tokenPort,
    fingerprint,
  };
  const passwordHasher = new FixedPasswordHasher();
  const rateLimit = new AllowAllRateLimit();
  return {
    ...runtime,
    register: new RegisterWithPasswordUseCase({
      ...dependencies,
      passwordHasher,
      passwordBlocklist: new InMemoryPasswordBlocklist([]),
      emailDelivery,
      currentTermsVersion: TEST_CONFIG.termsVersion,
      emailVerificationTtlMs: TEST_CONFIG.emailVerificationTtlMs,
    }),
    requestMagicLink: new RequestMagicLinkUseCase({
      ...dependencies,
      emailDelivery,
      rateLimit,
    }),
    config: TEST_CONFIG,
    random,
    fingerprint,
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

async function responseBeforeProviderRelease(
  pendingResponse: Promise<{ status: number; body: unknown }>,
): Promise<{ status: number; body: unknown }> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(
      () => reject(new Error('HTTP response waited for Resend provider')),
      250,
    );
  });
  try {
    return await Promise.race([pendingResponse, timeout]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}

async function waitForChallengeRevocation(
  isRevoked: () => boolean,
): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (isRevoked()) {
      return;
    }
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
  throw new Error('delivery failure did not revoke the issued challenge');
}

function seedActiveUser(repository: InMemoryAuthenticationRepository): void {
  const now = new Date('2026-08-28T12:00:00.000Z');
  const user = UserAggregate.registerWithPassword(
    {
      id: '00000000-0000-4000-8000-000000000701',
      passwordHash: 'hash'.repeat(8),
      termsVersion: 'v1',
      acceptedAt: now,
      occurredAt: now,
    },
    NormalizedEmail.from(ACTIVE_EMAIL),
  );
  repository.createUser({
    ...user.snapshot,
    status: 'ACTIVE',
    emailVerifiedAt: now,
  });
}
