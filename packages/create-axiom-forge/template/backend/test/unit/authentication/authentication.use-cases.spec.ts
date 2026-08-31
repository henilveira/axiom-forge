import type { AuthenticationContext } from '../../../src/modules/authentication/domain/types/authentication.types';
import type { DomainClockPort } from '../../../src/modules/authentication/domain/ports/domain-clock.port';
import type { DomainRandomPort } from '../../../src/modules/authentication/domain/ports/domain-random.port';
import {
  HmacFingerprintAdapter,
  NodeSessionTokenAdapter,
} from '../../../src/modules/authentication/infrastructure/crypto/node-crypto.adapter';
import { InMemoryAuthenticationRepository } from '../../../src/modules/authentication/infrastructure/persistence/memory/in-memory-authentication.repository';
import { AuthenticateWithPasswordUseCase } from '../../../src/modules/authentication/application/use-cases/authenticate-with-password.use-case';
import { ConsumeMagicLinkUseCase } from '../../../src/modules/authentication/application/use-cases/consume-magic-link.use-case';
import { InMemoryPasswordBlocklist } from '../../../src/modules/authentication/infrastructure/crypto/node-crypto.adapter';
import { RegisterWithPasswordUseCase } from '../../../src/modules/authentication/application/use-cases/register-with-password.use-case';
import { RequestMagicLinkUseCase } from '../../../src/modules/authentication/application/use-cases/request-magic-link.use-case';
import { RefreshSessionUseCase } from '../../../src/modules/authentication/application/use-cases/refresh-session.use-case';
import { VerifyEmailUseCase } from '../../../src/modules/authentication/application/use-cases/verify-email.use-case';
import type { PasswordHasherPort } from '../../../src/modules/authentication/application/ports/password-hasher.port';
import type { EmailDeliveryPort } from '../../../src/modules/authentication/application/ports/email-delivery.port';
import type { DeliveredEmail } from '../../../src/modules/authentication/infrastructure/email/in-memory-email-delivery.types';

class FixedClock implements DomainClockPort {
  public constructor(private current: Date) {}

  public now(): Date {
    return new Date(this.current.getTime());
  }

  public at(millisecondsFromNow: number): Date {
    return new Date(this.current.getTime() + millisecondsFromNow);
  }

  public refreshTtlMs(): number {
    return 2_592_000_000;
  }
}

class SequenceRandom implements DomainRandomPort {
  private nextId = 0;

  public bytes(size: number): Buffer {
    return Buffer.alloc(size, 7);
  }

  public id(): string {
    this.nextId += 1;
    return `00000000-0000-4000-8000-${String(this.nextId).padStart(12, '0')}`;
  }
}

class FakeHasher implements PasswordHasherPort {
  public readonly dummyHash = 'dummy-hash';
  public hash(password: string): string {
    return `fake:${password}`;
  }

  public verify(password: string, encodedHash: string): boolean {
    return encodedHash === `fake:${password}`;
  }
}

class CapturingDelivery implements EmailDeliveryPort {
  public readonly messages: DeliveredEmail[] = [];

  public sendVerification(input: {
    readonly email: string;
    readonly token: string;
    readonly expiresAt: Date;
  }): void {
    this.messages.push({ kind: 'VERIFICATION', ...input });
  }

  public sendMagicLink(input: {
    readonly email: string;
    readonly token: string;
    readonly expiresAt: Date;
  }): void {
    this.messages.push({ kind: 'MAGIC_LINK', ...input });
  }
}

function context(): AuthenticationContext {
  return { correlationId: 'correlation-1' };
}

function setup() {
  const repository = new InMemoryAuthenticationRepository();
  const clock = new FixedClock(new Date('2026-08-27T12:00:00.000Z'));
  const random = new SequenceRandom();
  const tokenPort = new NodeSessionTokenAdapter();
  const fingerprint = new HmacFingerprintAdapter('test-secret');
  const passwordHasher = new FakeHasher();
  const delivery = new CapturingDelivery();
  const register = new RegisterWithPasswordUseCase({
    repository,
    clock,
    random,
    tokenPort,
    fingerprint,
    passwordHasher,
    passwordBlocklist: new InMemoryPasswordBlocklist([]),
    emailDelivery: delivery,
    currentTermsVersion: 'v1',
    emailVerificationTtlMs: 86_400_000,
  });
  return {
    repository,
    clock,
    random,
    tokenPort,
    fingerprint,
    passwordHasher,
    delivery,
    register,
  };
}

describe('AUTH-001 application flows', () => {
  it('registers pending identity, verifies it once, then authenticates by password', async () => {
    const state = setup();
    await expect(
      state.register.execute({
        email: '  Person@Example.com ',
        password: 'a secure password',
        termsVersion: 'v1',
        context: context(),
      }),
    ).resolves.toEqual({ outcome: 'ACCEPTED' });
    expect(state.delivery.messages).toHaveLength(1);
    const user = await state.repository.withTransaction((repository) =>
      repository.findUserByEmail('person@example.com'),
    );
    expect(user?.status).toBe('EMAIL_VERIFICATION_PENDING');

    const verify = new VerifyEmailUseCase(
      state.repository,
      state.tokenPort,
      state.clock,
    );
    await expect(
      verify.execute({
        token: state.delivery.messages[0]?.token ?? '',
        context: context(),
      }),
    ).resolves.toEqual({ outcome: 'ACCEPTED' });
    await expect(
      verify.execute({
        token: state.delivery.messages[0]?.token ?? '',
        context: context(),
      }),
    ).resolves.toEqual({ outcome: 'REJECTED' });

    const login = new AuthenticateWithPasswordUseCase({
      repository: state.repository,
      clock: state.clock,
      random: state.random,
      tokenPort: state.tokenPort,
      fingerprint: state.fingerprint,
      passwordHasher: state.passwordHasher,
      rateLimit: new AllowAllRateLimit(),
    });
    const result = await login.execute({
      email: 'person@example.com',
      password: 'a secure password',
      fingerprint: 'request-fingerprint',
      context: context(),
    });
    expect(result.authMethod).toBe('PASSWORD');
    expect(result.accessToken).toBeTruthy();
    expect(result.session.status).toBe('ACTIVE');
    expect(
      state.repository
        .getOutbox()
        .some((item) => item.event.type === 'AuthenticationSucceeded'),
    ).toBe(true);
  });

  it('does not create a duplicate and keeps the public registration outcome uniform', async () => {
    const state = setup();
    const input = {
      email: 'person@example.com',
      password: 'a secure password',
      termsVersion: 'v1',
      context: context(),
    };
    await state.register.execute(input);
    await expect(state.register.execute(input)).resolves.toEqual({
      outcome: 'ACCEPTED',
    });
    expect(state.delivery.messages).toHaveLength(1);
  });
});

describe('AUTH-001 session and magic-link flows', () => {
  it('consumes a magic link once and atomically rejects reuse', async () => {
    const state = setup();
    await state.register.execute({
      email: 'person@example.com',
      password: 'a secure password',
      termsVersion: 'v1',
      context: context(),
    });
    const verify = new VerifyEmailUseCase(
      state.repository,
      state.tokenPort,
      state.clock,
    );
    await verify.execute({
      token: state.delivery.messages[0]?.token ?? '',
      context: context(),
    });
    const magic = new RequestMagicLinkUseCase({
      repository: state.repository,
      clock: state.clock,
      random: state.random,
      tokenPort: state.tokenPort,
      fingerprint: state.fingerprint,
      emailDelivery: state.delivery,
      rateLimit: new AllowAllRateLimit(),
    });
    await magic.execute({
      email: 'person@example.com',
      fingerprint: 'request',
      context: context(),
    });
    const magicToken = state.delivery.messages[1]?.token ?? '';
    const consume = new ConsumeMagicLinkUseCase(
      state.repository,
      state.tokenPort,
      state.random,
      state.clock,
    );
    await expect(
      consume.execute({ token: magicToken, context: context() }),
    ).resolves.toMatchObject({
      outcome: 'SUCCESS',
      authMethod: 'MAGIC_LINK',
    });
    await expect(
      consume.execute({ token: magicToken, context: context() }),
    ).rejects.toMatchObject({
      code: 'CHALLENGE_INVALID',
    });
  });
});

describe('AUTH-001 refresh and enumeration flows', () => {
  it('rotates refresh tokens and revokes the family on replay', async () => {
    const state = setup();
    await state.register.execute({
      email: 'person@example.com',
      password: 'a secure password',
      termsVersion: 'v1',
      context: context(),
    });
    const verify = new VerifyEmailUseCase(
      state.repository,
      state.tokenPort,
      state.clock,
    );
    await verify.execute({
      token: state.delivery.messages[0]?.token ?? '',
      context: context(),
    });
    const login = new AuthenticateWithPasswordUseCase({
      repository: state.repository,
      clock: state.clock,
      random: state.random,
      tokenPort: state.tokenPort,
      fingerprint: state.fingerprint,
      passwordHasher: state.passwordHasher,
      rateLimit: new AllowAllRateLimit(),
    });
    const initial = await login.execute({
      email: 'person@example.com',
      password: 'a secure password',
      fingerprint: 'request',
      context: context(),
    });
    const refresh = new RefreshSessionUseCase(
      state.repository,
      state.tokenPort,
      state.random,
      state.clock,
    );
    const rotated = await refresh.execute({
      refreshToken: initial.refreshToken,
      context: context(),
    });
    await expect(
      refresh.execute({
        refreshToken: initial.refreshToken,
        context: context(),
      }),
    ).rejects.toMatchObject({
      code: 'SESSION_REPLAY',
    });
    await expect(
      refresh.execute({
        refreshToken: rotated.refreshToken,
        context: context(),
      }),
    ).rejects.toMatchObject({
      code: 'SESSION_REPLAY',
    });
  });

  it('uses the same generic credential error for an unknown account', async () => {
    const state = setup();
    const login = new AuthenticateWithPasswordUseCase({
      repository: state.repository,
      clock: state.clock,
      random: state.random,
      tokenPort: state.tokenPort,
      fingerprint: state.fingerprint,
      passwordHasher: state.passwordHasher,
      rateLimit: new AllowAllRateLimit(),
    });
    await expect(
      login.execute({
        email: 'nobody@example.com',
        password: 'a secure password',
        fingerprint: 'request',
        context: context(),
      }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIAL' });
  });
});

class AllowAllRateLimit {
  public check(): boolean {
    return true;
  }

  public record(): void {
    return undefined;
  }
}
