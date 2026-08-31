import { UserAggregate } from '../../../src/modules/authentication/domain/aggregates/user.aggregate';
import { NormalizedEmail } from '../../../src/modules/authentication/domain/value-objects/normalized-email.value-object';
import type { DomainClockPort } from '../../../src/modules/authentication/domain/ports/domain-clock.port';
import type { DomainRandomPort } from '../../../src/modules/authentication/domain/ports/domain-random.port';
import type { EmailDeliveryPort } from '../../../src/modules/authentication/application/ports/email-delivery.port';
import type { FingerprintPort } from '../../../src/modules/authentication/application/ports/fingerprint.port';
import type { PasswordHasherPort } from '../../../src/modules/authentication/application/ports/password-hasher.port';
import type { RateLimitPort } from '../../../src/modules/authentication/application/ports/rate-limit.port';
import type { AuthenticationLoggerPort } from '../../../src/modules/authentication/application/ports/logger.port';
import type { AuthenticationLogMetadata } from '../../../src/modules/authentication/application/ports/logger.port';
import { RegisterWithPasswordUseCase } from '../../../src/modules/authentication/application/use-cases/register-with-password.use-case';
import { RequestMagicLinkUseCase } from '../../../src/modules/authentication/application/use-cases/request-magic-link.use-case';
import { InMemoryPasswordBlocklist } from '../../../src/modules/authentication/infrastructure/crypto/node-crypto.adapter';
import { InMemoryAuthenticationRepository } from '../../../src/modules/authentication/infrastructure/persistence/memory/in-memory-authentication.repository';
import { authenticationContext } from '../../test-kit/authentication.builders';

const NOW = new Date('2026-08-28T12:00:00.000Z');
const EMAIL = 'person@example.com';
const PASSWORD = 'A sufficiently long password';

class FixedClock implements DomainClockPort {
  public now(): Date {
    return new Date(NOW.getTime());
  }

  public at(millisecondsFromNow: number): Date {
    return new Date(NOW.getTime() + millisecondsFromNow);
  }

  public refreshTtlMs(): number {
    return 30 * 24 * 60 * 60 * 1_000;
  }
}

class FixedRandom implements DomainRandomPort {
  private idCounter = 0;
  private byteCounter = 0;

  public bytes(size: number): Uint8Array {
    this.byteCounter += 1;
    return new Uint8Array(size).fill(this.byteCounter);
  }

  public id(): string {
    this.idCounter += 1;
    return `00000000-0000-4000-8000-${String(this.idCounter).padStart(12, '0')}`;
  }
}

class FixedPasswordHasher implements PasswordHasherPort {
  public readonly dummyHash = 'dummy-password-hash';

  public hash(password: string): string {
    return `hash:${password}`;
  }

  public verify(password: string, encodedHash: string): boolean {
    return encodedHash === `hash:${password}`;
  }
}

class FixedFingerprint implements FingerprintPort {
  public email(email: string): string {
    return `email:${email}`;
  }

  public subject(subject: string): string {
    return `subject:${subject}`;
  }

  public request(value: string): string {
    return `request:${value}`;
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

class ImmediateFailureEmailDelivery implements EmailDeliveryPort {
  public verificationCalls = 0;
  public magicLinkCalls = 0;

  public sendVerification(): void {
    this.verificationCalls += 1;
    throw new Error('provider detail must stay private');
  }

  public sendMagicLink(): void {
    this.magicLinkCalls += 1;
    throw new Error('provider detail must stay private');
  }
}

class RecordingLogger implements AuthenticationLoggerPort {
  public readonly infoRecords: AuthenticationLogMetadata[] = [];
  public readonly warnRecords: AuthenticationLogMetadata[] = [];

  public info(_event: string, metadata: AuthenticationLogMetadata): void {
    this.infoRecords.push(metadata);
  }

  public warn(_event: string, metadata: AuthenticationLogMetadata): void {
    this.warnRecords.push(metadata);
  }
}

class HangingEmailDelivery implements EmailDeliveryPort {
  public verificationCalls = 0;

  public sendVerification(): Promise<void> {
    this.verificationCalls += 1;
    return new Promise<void>(() => {
      // The unresolved provider response models a network hang.
    });
  }

  public sendMagicLink(): Promise<void> {
    return new Promise<void>(() => {
      // The unresolved provider response models a network hang.
    });
  }
}

describe('authentication e-mail delivery failure policy', () => {
  it('returns the public registration result before a provider failure and revokes the challenge', async () => {
    const repository = new InMemoryAuthenticationRepository();
    const delivery = new ImmediateFailureEmailDelivery();
    const revokeChallenge = jest.spyOn(repository, 'revokeChallenge');
    const register = createRegister(repository, delivery);

    await expect(
      register.execute({
        email: EMAIL,
        password: PASSWORD,
        termsVersion: 'v1',
        context: authenticationContext(),
      }),
    ).resolves.toEqual({ outcome: 'ACCEPTED' });

    await flushBackgroundDelivery();

    expect(delivery.verificationCalls).toBe(1);
    expect(revokeChallenge).toHaveBeenCalledWith(expect.any(String), 'ISSUED');
  });

  it('keeps magic-link responses uniform when an eligible account delivery fails and revokes its challenge', async () => {
    const repository = new InMemoryAuthenticationRepository();
    const delivery = new ImmediateFailureEmailDelivery();
    const revokeChallenge = jest.spyOn(repository, 'revokeChallenge');
    seedActiveUser(repository);
    const requestMagicLink = createMagicLinkRequest(repository, delivery);

    const unknown = await requestMagicLink.execute({
      email: 'unknown@example.com',
      fingerprint: 'browser-fingerprint',
      context: authenticationContext({ correlationId: 'unknown' }),
    });
    const eligible = await requestMagicLink.execute({
      email: EMAIL,
      fingerprint: 'browser-fingerprint',
      context: authenticationContext({ correlationId: 'eligible' }),
    });

    expect(eligible).toEqual(unknown);

    await flushBackgroundDelivery();

    expect(delivery.magicLinkCalls).toBe(1);
    expect(revokeChallenge).toHaveBeenCalledWith(expect.any(String), 'ISSUED');
  });

  it('does not wait for a hanging provider after the challenge transaction commits', async () => {
    const repository = new InMemoryAuthenticationRepository();
    const delivery = new HangingEmailDelivery();
    const register = createRegister(repository, delivery);
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error('public response waited for provider')),
        100,
      );
    });

    await expect(
      Promise.race([
        register.execute({
          email: EMAIL,
          password: PASSWORD,
          termsVersion: 'v1',
          context: authenticationContext(),
        }),
        timeout,
      ]),
    ).resolves.toEqual({ outcome: 'ACCEPTED' });
    expect(delivery.verificationCalls).toBe(1);
  });

  it('records redacted delivery and revocation failures without raw errors or PII', async () => {
    const repository = new InMemoryAuthenticationRepository();
    const delivery = new ImmediateFailureEmailDelivery();
    const logger = new RecordingLogger();
    jest.spyOn(repository, 'revokeChallenge').mockImplementation(() => {
      throw new Error(
        'database detail person@example.com token=raw-token must stay private',
      );
    });
    const register = createRegister(repository, delivery, logger);

    await expect(
      register.execute({
        email: EMAIL,
        password: PASSWORD,
        termsVersion: 'v1',
        context: authenticationContext({
          correlationId: 'email-delivery-test',
        }),
      }),
    ).resolves.toEqual({ outcome: 'ACCEPTED' });

    await flushBackgroundDelivery();

    expect(logger.warnRecords).toHaveLength(2);
    expect(logger.warnRecords[0]).toMatchObject({
      eventType: 'EMAIL_VERIFICATION',
      correlationId: 'email-delivery-test',
      outcome: 'EMAIL_DELIVERY_FAILED',
      errorCode: 'PROVIDER_UNAVAILABLE',
      durationMs: null,
    });
    expect(logger.warnRecords[1]).toMatchObject({
      eventType: 'EMAIL_VERIFICATION',
      correlationId: 'email-delivery-test',
      outcome: 'EMAIL_CHALLENGE_REVOCATION_FAILED',
      errorCode: 'REVOCATION_FAILED',
      durationMs: null,
    });
    expect(
      JSON.stringify([...logger.infoRecords, ...logger.warnRecords]),
    ).not.toContain('person@example.com');
    expect(
      JSON.stringify([...logger.infoRecords, ...logger.warnRecords]),
    ).not.toContain('raw-token');
  });
});

function createRegister(
  repository: InMemoryAuthenticationRepository,
  emailDelivery: EmailDeliveryPort,
  logger?: AuthenticationLoggerPort,
): RegisterWithPasswordUseCase {
  return new RegisterWithPasswordUseCase({
    repository,
    clock: new FixedClock(),
    random: new FixedRandom(),
    tokenPort: {
      issue: () => ({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        accessTokenHash: 'access-hash',
        refreshTokenHash: 'refresh-hash',
      }),
      hash: (value: string) => `hash:${value}`,
    },
    fingerprint: new FixedFingerprint(),
    passwordHasher: new FixedPasswordHasher(),
    passwordBlocklist: new InMemoryPasswordBlocklist([]),
    emailDelivery,
    currentTermsVersion: 'v1',
    emailVerificationTtlMs: 600_000,
    logger,
  });
}

function createMagicLinkRequest(
  repository: InMemoryAuthenticationRepository,
  emailDelivery: EmailDeliveryPort,
): RequestMagicLinkUseCase {
  return new RequestMagicLinkUseCase({
    repository,
    clock: new FixedClock(),
    random: new FixedRandom(),
    tokenPort: {
      issue: () => ({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        accessTokenHash: 'access-hash',
        refreshTokenHash: 'refresh-hash',
      }),
      hash: (value: string) => `hash:${value}`,
    },
    fingerprint: new FixedFingerprint(),
    emailDelivery,
    rateLimit: new AllowAllRateLimit(),
  });
}

function seedActiveUser(repository: InMemoryAuthenticationRepository): void {
  const pending = UserAggregate.registerWithPassword(
    {
      id: '00000000-0000-4000-8000-000000000100',
      passwordHash: 'hash'.repeat(8),
      termsVersion: 'v1',
      acceptedAt: NOW,
      occurredAt: NOW,
    },
    NormalizedEmail.from(EMAIL),
  );
  repository.createUser({
    ...pending.snapshot,
    status: 'ACTIVE',
    emailVerifiedAt: NOW,
  });
}

async function flushBackgroundDelivery(): Promise<void> {
  await new Promise<void>((resolve) => setImmediate(resolve));
}
